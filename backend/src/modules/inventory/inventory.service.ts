import { pool } from '../../config/database';
import { withTransaction } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';

export const listTransactions = async (companyId: string, filters: any) => {
  const conditions = ['it.company_id=?'];
  const params: unknown[] = [companyId];

  if (filters.product_id) { conditions.push(`it.product_id=?`); params.push(filters.product_id); }
  if (filters.transaction_type) { conditions.push(`it.transaction_type=?`); params.push(filters.transaction_type); }
  if (filters.date_from) { conditions.push(`it.transaction_date>=?`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`it.transaction_date<=?`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM inventory_transactions it WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT it.*, p.name AS product_name, p.sku, sl.name AS location_name
     FROM inventory_transactions it
     LEFT JOIN products p ON p.id = it.product_id
     LEFT JOIN stock_locations sl ON sl.id = it.location_id
     WHERE ${where} ORDER BY it.transaction_date DESC, it.created_at DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { transactions: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const adjustStock = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const [prodRes] = await client.query(
      'SELECT * FROM products WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
      [data.product_id, companyId]
    );
    if (!(prodRes as any[]).length) throw new NotFoundError('Product');
    const product = (prodRes as any[])[0];

    // Validate for adjustment_out
    if (data.quantity < 0 || data.transaction_type === 'adjustment_out' || data.transaction_type === 'write_off') {
      const qty = Math.abs(data.quantity);
      if (parseFloat(product.current_stock) < qty) {
        throw new ConflictError(`Insufficient stock. Available: ${product.current_stock}`);
      }
    }

    const qty = (data.transaction_type === 'adjustment_out' || data.transaction_type === 'write_off')
      ? -Math.abs(data.quantity)
      : Math.abs(data.quantity);

    const newStock = parseFloat(product.current_stock) + qty;
    await client.query('UPDATE products SET current_stock=?, updated_at=NOW() WHERE id=?', [newStock, data.product_id]);

    await client.query(
      `INSERT INTO inventory_transactions (company_id, product_id, location_id, transaction_type, quantity, balance_after, reference_no, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [companyId, data.product_id, data.location_id || null, data.transaction_type, qty, newStock, data.reference_no || null, data.notes || null, userId]
    );
    const [txRows] = await client.query(
      'SELECT * FROM inventory_transactions WHERE company_id=? AND product_id=? ORDER BY created_at DESC LIMIT 1',
      [companyId, data.product_id]
    );

    // Update location stock if location provided
    if (data.location_id) {
      await client.query(
        `INSERT INTO product_stock_locations (company_id, product_id, location_id, quantity_on_hand)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand), updated_at=NOW()`,
        [companyId, data.product_id, data.location_id, qty]
      );
    }

    return { ...(txRows as any[])[0], product_name: product.name, sku: product.sku, new_stock: newStock };
  });
};

export const transferStock = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    if (data.from_location_id === data.to_location_id) throw new ConflictError('Source and destination locations must be different');

    const [prodRes] = await client.query(
      'SELECT * FROM products WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
      [data.product_id, companyId]
    );
    if (!(prodRes as any[]).length) throw new NotFoundError('Product');

    // Check source location stock
    const [srcRes] = await client.query(
      'SELECT quantity_on_hand FROM product_stock_locations WHERE product_id=? AND location_id=?',
      [data.product_id, data.from_location_id]
    );
    const srcQty = (srcRes as any[]).length ? parseFloat((srcRes as any[])[0].quantity_on_hand) : 0;
    if (srcQty < data.quantity) throw new ConflictError(`Insufficient stock at source location. Available: ${srcQty}`);

    // Deduct from source
    await client.query(
      `INSERT INTO product_stock_locations (company_id, product_id, location_id, quantity_on_hand)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand), updated_at=NOW()`,
      [companyId, data.product_id, data.from_location_id, -data.quantity]
    );

    // Add to destination
    await client.query(
      `INSERT INTO product_stock_locations (company_id, product_id, location_id, quantity_on_hand)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand), updated_at=NOW()`,
      [companyId, data.product_id, data.to_location_id, data.quantity]
    );

    // Record transfer out transaction
    await client.query(
      `INSERT INTO inventory_transactions (company_id, product_id, location_id, transaction_type, quantity, reference_no, notes, created_by)
       VALUES (?,?,?,'transfer_out',?,?,?,?)`,
      [companyId, data.product_id, data.from_location_id, -data.quantity, null, data.notes || null, userId]
    );

    // Record transfer in transaction
    await client.query(
      `INSERT INTO inventory_transactions (company_id, product_id, location_id, transaction_type, quantity, reference_no, notes, created_by)
       VALUES (?,?,?,'transfer_in',?,?,?,?)`,
      [companyId, data.product_id, data.to_location_id, data.quantity, null, data.notes || null, userId]
    );
    const [txRows] = await client.query(
      'SELECT * FROM inventory_transactions WHERE company_id=? AND product_id=? AND transaction_type=\'transfer_in\' ORDER BY created_at DESC LIMIT 1',
      [companyId, data.product_id]
    );

    return (txRows as any[])[0];
  });
};

// Stock Locations CRUD
export const listLocations = async (companyId: string) => {
  const [rows] = await pool.query(
    'SELECT * FROM stock_locations WHERE company_id=? AND deleted_at IS NULL ORDER BY is_default DESC, name ASC',
    [companyId]
  );
  return rows as any[];
};

export const createLocation = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    if (data.is_default) {
      await client.query('UPDATE stock_locations SET is_default=false WHERE company_id=?', [companyId]);
    }
    await client.query(
      `INSERT INTO stock_locations (company_id, name, code, description, is_default, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?)`,
      [companyId, data.name, data.code, data.description || null, data.is_default || false, userId, userId]
    );
    const [newRows] = await client.query(
      'SELECT * FROM stock_locations WHERE company_id=? AND name=? ORDER BY created_at DESC LIMIT 1',
      [companyId, data.name]
    );
    return (newRows as any[])[0];
  });
};

export const updateLocation = async (companyId: string, locationId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const [locRes] = await client.query('SELECT * FROM stock_locations WHERE id=? AND company_id=? AND deleted_at IS NULL', [locationId, companyId]);
    if (!(locRes as any[]).length) throw new NotFoundError('Stock location');
    if (data.is_default) {
      await client.query('UPDATE stock_locations SET is_default=false WHERE company_id=?', [companyId]);
    }
    const fields = Object.keys(data).filter(k => !['company_id', 'id'].includes(k));
    if (!fields.length) return (locRes as any[])[0];
    const setClause = fields.map(f => `${f}=?`).join(', ');
    await client.query(
      `UPDATE stock_locations SET ${setClause}, updated_by=?, updated_at=NOW() WHERE id=? AND company_id=?`,
      [...fields.map(f => data[f]), userId, locationId, companyId]
    );
    const [updatedRows] = await client.query('SELECT * FROM stock_locations WHERE id=?', [locationId]);
    return (updatedRows as any[])[0];
  });
};

export const deleteLocation = async (companyId: string, locationId: string) => {
  const [rows] = await pool.query('SELECT * FROM stock_locations WHERE id=? AND company_id=? AND deleted_at IS NULL', [locationId, companyId]);
  if (!(rows as any[]).length) throw new NotFoundError('Stock location');
  if ((rows as any[])[0].is_default) throw new ConflictError('Cannot delete the default stock location');
  await pool.query('UPDATE stock_locations SET deleted_at=NOW() WHERE id=? AND company_id=?', [locationId, companyId]);
};

export const getStockByLocation = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT sl.id AS location_id, sl.name AS location_name, sl.code AS location_code,
            p.id AS product_id, p.name AS product_name, p.sku,
            psl.quantity_on_hand
     FROM product_stock_locations psl
     JOIN stock_locations sl ON sl.id = psl.location_id
     JOIN products p ON p.id = psl.product_id
     WHERE psl.company_id=? AND sl.deleted_at IS NULL AND p.deleted_at IS NULL
     ORDER BY sl.name, p.name`,
    [companyId]
  );
  return rows as any[];
};

export const getLowStockReport = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT id, name, sku, current_stock, reorder_level, reorder_quantity, unit_of_measure
     FROM products WHERE company_id=? AND deleted_at IS NULL AND track_inventory=true
     AND current_stock <= reorder_level ORDER BY current_stock ASC`,
    [companyId]
  );
  return rows as any[];
};

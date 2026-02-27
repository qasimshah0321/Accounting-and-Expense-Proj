import { pool } from '../../config/database';
import { withTransaction } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';

export const listTransactions = async (companyId: string, filters: any) => {
  const conditions = ['it.company_id=$1'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.product_id) { conditions.push(`it.product_id=$${idx++}`); params.push(filters.product_id); }
  if (filters.transaction_type) { conditions.push(`it.transaction_type=$${idx++}`); params.push(filters.transaction_type); }
  if (filters.date_from) { conditions.push(`it.transaction_date>=$${idx++}`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`it.transaction_date<=$${idx++}`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM inventory_transactions it WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT it.*, p.name AS product_name, p.sku, sl.name AS location_name
     FROM inventory_transactions it
     LEFT JOIN products p ON p.id = it.product_id
     LEFT JOIN stock_locations sl ON sl.id = it.location_id
     WHERE ${where} ORDER BY it.transaction_date DESC, it.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { transactions: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const adjustStock = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const prodRes = await client.query(
      'SELECT * FROM products WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE',
      [data.product_id, companyId]
    );
    if (!prodRes.rows.length) throw new NotFoundError('Product');
    const product = prodRes.rows[0];

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
    await client.query('UPDATE products SET current_stock=$1, updated_at=NOW() WHERE id=$2', [newStock, data.product_id]);

    const { rows } = await client.query(
      `INSERT INTO inventory_transactions (company_id, product_id, location_id, transaction_type, quantity, balance_after, reference_no, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [companyId, data.product_id, data.location_id || null, data.transaction_type, qty, newStock, data.reference_no || null, data.notes || null, userId]
    );

    // Update location stock if location provided
    if (data.location_id) {
      await client.query(
        `INSERT INTO product_stock_locations (company_id, product_id, location_id, quantity_on_hand)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (product_id, location_id) DO UPDATE SET quantity_on_hand = product_stock_locations.quantity_on_hand + $4, updated_at=NOW()`,
        [companyId, data.product_id, data.location_id, qty]
      );
    }

    return { ...rows[0], product_name: product.name, sku: product.sku, new_stock: newStock };
  });
};

export const transferStock = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    if (data.from_location_id === data.to_location_id) throw new ConflictError('Source and destination locations must be different');

    const prodRes = await client.query(
      'SELECT * FROM products WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE',
      [data.product_id, companyId]
    );
    if (!prodRes.rows.length) throw new NotFoundError('Product');

    // Check source location stock
    const srcRes = await client.query(
      'SELECT quantity_on_hand FROM product_stock_locations WHERE product_id=$1 AND location_id=$2',
      [data.product_id, data.from_location_id]
    );
    const srcQty = srcRes.rows.length ? parseFloat(srcRes.rows[0].quantity_on_hand) : 0;
    if (srcQty < data.quantity) throw new ConflictError(`Insufficient stock at source location. Available: ${srcQty}`);

    // Deduct from source
    await client.query(
      `INSERT INTO product_stock_locations (company_id, product_id, location_id, quantity_on_hand)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (product_id, location_id) DO UPDATE SET quantity_on_hand = product_stock_locations.quantity_on_hand + $4, updated_at=NOW()`,
      [companyId, data.product_id, data.from_location_id, -data.quantity]
    );

    // Add to destination
    await client.query(
      `INSERT INTO product_stock_locations (company_id, product_id, location_id, quantity_on_hand)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (product_id, location_id) DO UPDATE SET quantity_on_hand = product_stock_locations.quantity_on_hand + $4, updated_at=NOW()`,
      [companyId, data.product_id, data.to_location_id, data.quantity]
    );

    // Record transfer out transaction
    await client.query(
      `INSERT INTO inventory_transactions (company_id, product_id, location_id, transaction_type, quantity, reference_no, notes, created_by)
       VALUES ($1,$2,$3,'transfer_out',$4,$5,$6,$7)`,
      [companyId, data.product_id, data.from_location_id, -data.quantity, null, data.notes || null, userId]
    );

    // Record transfer in transaction
    const { rows } = await client.query(
      `INSERT INTO inventory_transactions (company_id, product_id, location_id, transaction_type, quantity, reference_no, notes, created_by)
       VALUES ($1,$2,$3,'transfer_in',$4,$5,$6,$7) RETURNING *`,
      [companyId, data.product_id, data.to_location_id, data.quantity, null, data.notes || null, userId]
    );

    return rows[0];
  });
};

// Stock Locations CRUD
export const listLocations = async (companyId: string) => {
  const { rows } = await pool.query(
    'SELECT * FROM stock_locations WHERE company_id=$1 AND deleted_at IS NULL ORDER BY is_default DESC, name ASC',
    [companyId]
  );
  return rows;
};

export const createLocation = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    if (data.is_default) {
      await client.query('UPDATE stock_locations SET is_default=false WHERE company_id=$1', [companyId]);
    }
    const { rows } = await client.query(
      `INSERT INTO stock_locations (company_id, name, code, description, is_default, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [companyId, data.name, data.code, data.description || null, data.is_default || false, userId]
    );
    return rows[0];
  });
};

export const updateLocation = async (companyId: string, locationId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const locRes = await client.query('SELECT * FROM stock_locations WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [locationId, companyId]);
    if (!locRes.rows.length) throw new NotFoundError('Stock location');
    if (data.is_default) {
      await client.query('UPDATE stock_locations SET is_default=false WHERE company_id=$1', [companyId]);
    }
    const fields = Object.keys(data).filter(k => !['company_id', 'id'].includes(k));
    if (!fields.length) return locRes.rows[0];
    const setClause = fields.map((f, i) => `${f}=$${i + 3}`).join(', ');
    const { rows } = await client.query(
      `UPDATE stock_locations SET ${setClause}, updated_by=$${fields.length + 3}, updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *`,
      [locationId, companyId, ...fields.map(f => data[f]), userId]
    );
    return rows[0];
  });
};

export const deleteLocation = async (companyId: string, locationId: string) => {
  const { rows } = await pool.query('SELECT * FROM stock_locations WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [locationId, companyId]);
  if (!rows.length) throw new NotFoundError('Stock location');
  if (rows[0].is_default) throw new ConflictError('Cannot delete the default stock location');
  await pool.query('UPDATE stock_locations SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [locationId, companyId]);
};

export const getStockByLocation = async (companyId: string) => {
  const { rows } = await pool.query(
    `SELECT sl.id AS location_id, sl.name AS location_name, sl.code AS location_code,
            p.id AS product_id, p.name AS product_name, p.sku,
            psl.quantity_on_hand
     FROM product_stock_locations psl
     JOIN stock_locations sl ON sl.id = psl.location_id
     JOIN products p ON p.id = psl.product_id
     WHERE psl.company_id=$1 AND sl.deleted_at IS NULL AND p.deleted_at IS NULL
     ORDER BY sl.name, p.name`,
    [companyId]
  );
  return rows;
};

export const getLowStockReport = async (companyId: string) => {
  const { rows } = await pool.query(
    `SELECT id, name, sku, current_stock, reorder_level, reorder_quantity, unit_of_measure
     FROM products WHERE company_id=$1 AND deleted_at IS NULL AND track_inventory=true
     AND current_stock <= reorder_level ORDER BY current_stock ASC`,
    [companyId]
  );
  return rows;
};

import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { createAuditLog } from '../../services/auditService';

export const listProducts = async (
  companyId: string,
  filters: { page: number; limit: number; offset: number; search?: string; product_type?: string; category?: string; is_active?: string; is_for_sale?: string; is_for_purchase?: string }
) => {
  const conditions = ['company_id=$1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.search) {
    conditions.push(`(sku ILIKE $${idx} OR name ILIKE $${idx} OR barcode ILIKE $${idx})`);
    params.push(`%${filters.search}%`); idx++;
  }
  if (filters.product_type) { conditions.push(`product_type=$${idx++}`); params.push(filters.product_type); }
  if (filters.category) { conditions.push(`category=$${idx++}`); params.push(filters.category); }
  if (filters.is_active !== undefined) { conditions.push(`is_active=$${idx++}`); params.push(filters.is_active === 'true'); }
  if (filters.is_for_sale !== undefined) { conditions.push(`is_for_sale=$${idx++}`); params.push(filters.is_for_sale === 'true'); }
  if (filters.is_for_purchase !== undefined) { conditions.push(`is_for_purchase=$${idx++}`); params.push(filters.is_for_purchase === 'true'); }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM products WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT * FROM products WHERE ${where} ORDER BY name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { products: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getProductById = async (companyId: string, productId: string) => {
  const { rows } = await pool.query(
    'SELECT p.*, t.name as tax_name, t.rate as tax_rate_value FROM products p LEFT JOIN taxes t ON t.id = p.tax_id WHERE p.id=$1 AND p.company_id=$2 AND p.deleted_at IS NULL',
    [productId, companyId]
  );
  if (!rows.length) throw new NotFoundError('Product');
  return rows[0];
};

export const createProduct = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  const { rows } = await pool.query(
    `INSERT INTO products (
      company_id, sku, barcode, name, description, product_type, category, subcategory, brand, manufacturer,
      cost_price, selling_price, wholesale_price, currency, unit_of_measure, track_inventory,
      current_stock, reorder_level, reorder_quantity, stock_location, tax_id, is_taxable,
      weight, weight_unit, dimensions, is_active, is_for_sale, is_for_purchase, image_url, notes,
      created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$31)
    RETURNING *`,
    [
      companyId, data.sku, data.barcode || null, data.name, data.description || null,
      data.product_type, data.category || null, data.subcategory || null, data.brand || null, data.manufacturer || null,
      data.cost_price ?? 0, data.selling_price ?? 0, data.wholesale_price || null, data.currency || 'USD',
      data.unit_of_measure || 'pcs', data.track_inventory ?? true,
      data.current_stock ?? 0, data.reorder_level ?? 0, data.reorder_quantity ?? 0,
      data.stock_location || null, data.tax_id || null, data.is_taxable ?? true,
      data.weight || null, data.weight_unit || null, data.dimensions || null,
      data.is_active ?? true, data.is_for_sale ?? true, data.is_for_purchase ?? true,
      data.image_url || null, data.notes || null, userId,
    ]
  );
  return rows[0];
};

export const updateProduct = async (companyId: string, productId: string, userId: string, data: Record<string, unknown>) => {
  await getProductById(companyId, productId);
  const excluded = ['company_id', 'id', 'created_at', 'created_by'];
  const fields = Object.keys(data).filter(k => !excluded.includes(k));
  if (!fields.length) return getProductById(companyId, productId);
  const setClause = fields.map((f, i) => `${f}=$${i + 3}`).join(', ');
  const values = fields.map(f => (data[f] === '' ? null : data[f]));
  const { rows } = await pool.query(
    `UPDATE products SET ${setClause}, updated_by=$${fields.length + 3}, updated_at=NOW()
     WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL RETURNING *`,
    [productId, companyId, ...values, userId]
  );
  return rows[0];
};

export const deleteProduct = async (companyId: string, productId: string) => {
  await getProductById(companyId, productId);
  await pool.query('UPDATE products SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [productId, companyId]);
};

export const getStockLevels = async (companyId: string, productId: string) => {
  await getProductById(companyId, productId);
  const { rows } = await pool.query(
    `SELECT psl.*, sl.name AS location_name, sl.code AS location_code, sl.description AS location_type
     FROM product_stock_locations psl
     JOIN stock_locations sl ON sl.id = psl.location_id
     WHERE psl.company_id=$1 AND psl.product_id=$2`,
    [companyId, productId]
  );
  return rows;
};

export const getTransactionHistory = async (companyId: string, productId: string, pagination: { page: number; limit: number; offset: number }) => {
  await getProductById(companyId, productId);
  const countRes = await pool.query('SELECT COUNT(*) FROM inventory_transactions WHERE company_id=$1 AND product_id=$2', [companyId, productId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT * FROM inventory_transactions WHERE company_id=$1 AND product_id=$2 ORDER BY transaction_date DESC LIMIT $3 OFFSET $4`,
    [companyId, productId, pagination.limit, pagination.offset]
  );
  return { transactions: rows, pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const adjustStock = async (companyId: string, productId: string, userId: string, data: { quantity: number; reason: string; stock_location?: string; unit_cost?: number; notes?: string }) => {
  return withTransaction(async (client) => {
    const prodRes = await client.query('SELECT * FROM products WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [productId, companyId]);
    if (!prodRes.rows.length) throw new NotFoundError('Product');
    const product = prodRes.rows[0];

    const balanceBefore = parseFloat(product.current_stock);
    const balanceAfter = balanceBefore + data.quantity;

    const { rows } = await client.query(
      `INSERT INTO inventory_transactions (company_id, product_id, transaction_type, quantity, balance_after, reference_no, notes, created_by)
       VALUES ($1,$2,'adjustment',$3,$4,$5,$6,$7) RETURNING *`,
      [companyId, productId, data.quantity, balanceAfter, data.reason, data.notes || null, userId]
    );

    await client.query('UPDATE products SET current_stock=$1, updated_at=NOW() WHERE id=$2', [balanceAfter, productId]);
    await createAuditLog({ company_id: companyId, entity_type: 'product', entity_id: productId, action: 'update', user_id: userId, user_name: userId, description: `Stock adjusted by ${data.quantity}. Reason: ${data.reason}` }, client);

    return { ...rows[0], balance_before: balanceBefore, balance_after: balanceAfter };
  });
};

export const getLowStockProducts = async (companyId: string) => {
  const { rows } = await pool.query(
    `SELECT * FROM products WHERE company_id=$1 AND track_inventory=true AND current_stock<=reorder_level AND deleted_at IS NULL ORDER BY current_stock ASC`,
    [companyId]
  );
  return rows;
};

import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { createAuditLog } from '../../services/auditService';

export const listProducts = async (
  companyId: string,
  filters: { page: number; limit: number; offset: number; search?: string; product_type?: string; category?: string; is_active?: string; is_for_sale?: string; is_for_purchase?: string }
) => {
  const conditions = ['company_id=?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.search) {
    conditions.push(`(sku LIKE ? OR name LIKE ? OR barcode LIKE ?)`);
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  if (filters.product_type) { conditions.push(`product_type=?`); params.push(filters.product_type); }
  if (filters.category) { conditions.push(`category=?`); params.push(filters.category); }
  if (filters.is_active !== undefined) { conditions.push(`is_active=?`); params.push(filters.is_active === 'true'); }
  if (filters.is_for_sale !== undefined) { conditions.push(`is_for_sale=?`); params.push(filters.is_for_sale === 'true'); }
  if (filters.is_for_purchase !== undefined) { conditions.push(`is_for_purchase=?`); params.push(filters.is_for_purchase === 'true'); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM products WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT * FROM products WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { products: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getProductById = async (companyId: string, productId: string) => {
  const [rows] = await pool.query(
    'SELECT p.*, t.name as tax_name, t.rate as tax_rate_value FROM products p LEFT JOIN taxes t ON t.id = p.tax_id WHERE p.id=? AND p.company_id=? AND p.deleted_at IS NULL',
    [productId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Product');
  return (rows as any[])[0];
};

export const createProduct = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  await pool.query(
    `INSERT INTO products (
      company_id, sku, barcode, name, description, product_type, category, subcategory, brand, manufacturer,
      cost_price, selling_price, target_price, wholesale_price, currency, unit_of_measure, track_inventory,
      current_stock, reorder_level, reorder_quantity, stock_location, tax_id, is_taxable,
      weight, weight_unit, dimensions, is_active, is_for_sale, is_for_purchase, image_url, notes,
      created_by, updated_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      companyId, data.sku, data.barcode || null, data.name, data.description || null,
      data.product_type, data.category || null, data.subcategory || null, data.brand || null, data.manufacturer || null,
      data.cost_price ?? 0, data.selling_price ?? 0, data.target_price ?? 0, data.wholesale_price || null, data.currency || 'USD',
      data.unit_of_measure || 'pcs', data.track_inventory ?? true,
      data.current_stock ?? 0, data.reorder_level ?? 0, data.reorder_quantity ?? 0,
      data.stock_location || null, data.tax_id || null, data.is_taxable ?? true,
      data.weight || null, data.weight_unit || null, data.dimensions || null,
      data.is_active ?? true, data.is_for_sale ?? true, data.is_for_purchase ?? true,
      data.image_url || null, data.notes || null, userId, userId,
    ]
  );
  const [newRows] = await pool.query(
    'SELECT * FROM products WHERE company_id=? AND sku=? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
    [companyId, data.sku]
  );
  return (newRows as any[])[0];
};

export const updateProduct = async (companyId: string, productId: string, userId: string, data: Record<string, unknown>) => {
  await getProductById(companyId, productId);
  const excluded = ['company_id', 'id', 'created_at', 'created_by'];
  const fields = Object.keys(data).filter(k => !excluded.includes(k));
  if (!fields.length) return getProductById(companyId, productId);
  const setClause = fields.map(f => `${f}=?`).join(', ');
  const values = fields.map(f => (data[f] === '' ? null : data[f]));
  await pool.query(
    `UPDATE products SET ${setClause}, updated_by=?, updated_at=NOW()
     WHERE id=? AND company_id=? AND deleted_at IS NULL`,
    [...values, userId, productId, companyId]
  );
  return getProductById(companyId, productId);
};

export const deleteProduct = async (companyId: string, productId: string) => {
  await getProductById(companyId, productId);
  await pool.query('UPDATE products SET deleted_at=NOW() WHERE id=? AND company_id=?', [productId, companyId]);
};

export const getStockLevels = async (companyId: string, productId: string) => {
  await getProductById(companyId, productId);
  const [rows] = await pool.query(
    `SELECT psl.*, sl.name AS location_name, sl.code AS location_code, sl.description AS location_type
     FROM product_stock_locations psl
     JOIN stock_locations sl ON sl.id = psl.location_id
     WHERE psl.company_id=? AND psl.product_id=?`,
    [companyId, productId]
  );
  return rows as any[];
};

export const getTransactionHistory = async (companyId: string, productId: string, pagination: { page: number; limit: number; offset: number }) => {
  await getProductById(companyId, productId);
  const [countRows] = await pool.query('SELECT COUNT(*) as count FROM inventory_transactions WHERE company_id=? AND product_id=?', [companyId, productId]);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT * FROM inventory_transactions WHERE company_id=? AND product_id=? ORDER BY transaction_date DESC LIMIT ? OFFSET ?`,
    [companyId, productId, pagination.limit, pagination.offset]
  );
  return { transactions: rows as any[], pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const adjustStock = async (companyId: string, productId: string, userId: string, data: { quantity: number; reason: string; stock_location?: string; unit_cost?: number; notes?: string }) => {
  return withTransaction(async (client) => {
    const [prodRows] = await client.query('SELECT * FROM products WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [productId, companyId]);
    if (!(prodRows as any[]).length) throw new NotFoundError('Product');
    const product = (prodRows as any[])[0];

    const balanceBefore = parseFloat(product.current_stock);
    const balanceAfter = balanceBefore + data.quantity;

    await client.query(
      `INSERT INTO inventory_transactions (company_id, product_id, transaction_type, quantity, balance_after, reference_no, notes, created_by)
       VALUES (?,?,'adjustment',?,?,?,?,?)`,
      [companyId, productId, data.quantity, balanceAfter, data.reason, data.notes || null, userId]
    );

    const [txRows] = await client.query('SELECT * FROM inventory_transactions WHERE company_id=? AND product_id=? ORDER BY created_at DESC LIMIT 1', [companyId, productId]);

    await client.query('UPDATE products SET current_stock=?, updated_at=NOW() WHERE id=?', [balanceAfter, productId]);
    await createAuditLog({ company_id: companyId, entity_type: 'product', entity_id: productId, action: 'update', user_id: userId, user_name: userId, description: `Stock adjusted by ${data.quantity}. Reason: ${data.reason}` }, client);

    return { ...(txRows as any[])[0], balance_before: balanceBefore, balance_after: balanceAfter };
  });
};

export const getLowStockProducts = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT * FROM products WHERE company_id=? AND track_inventory=true AND current_stock<=reorder_level AND deleted_at IS NULL ORDER BY current_stock ASC`,
    [companyId]
  );
  return rows as any[];
};

// ── Default product catalogue (seeded from tableau_stock.xlsx) ──────────────
const DEFAULT_PRODUCTS: Array<{ name: string; sku: string; selling_price: number; current_stock: number; notes: string | null }> = [
  { name: "M&ms jaune", sku: 'M-MS-JAUNE', selling_price: 14.0, current_stock: 9.0, notes: 'Expiry: 08.03-19.04' },
  { name: "M&ms bleu", sku: 'M-MS-BLEU', selling_price: 14.0, current_stock: 0.0, notes: null },
  { name: "M&ms brun", sku: 'M-MS-BRUN', selling_price: 14.0, current_stock: 2.0, notes: 'Expiry: 08.03-12.07' },
  { name: 'Maltesees', sku: 'MALTESEES', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Rafael', sku: 'RAFAEL', selling_price: 16.0, current_stock: 8.0, notes: 'Expiry: 14.05' },
  { name: 'Rocher', sku: 'ROCHER', selling_price: 22.0, current_stock: 0.0, notes: null },
  { name: 'Chacha', sku: 'CHACHA', selling_price: 22.0, current_stock: 0.0, notes: null },
  { name: 'Bounty', sku: 'BOUNTY', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Mars', sku: 'MARS', selling_price: 20.0, current_stock: 32.0, notes: 'Expiry: 20.08' },
  { name: 'Mars big', sku: 'MARS-BIG', selling_price: 22.0, current_stock: 24.0, notes: 'Expiry: 20.08' },
  { name: 'Snicker', sku: 'SNICKER', selling_price: 20.0, current_stock: 32.0, notes: 'Expiry: 20.09' },
  { name: 'Snicker big', sku: 'SNICKER-BIG', selling_price: 22.0, current_stock: 24.0, notes: null },
  { name: 'Leo go', sku: 'LEO-GO', selling_price: 25.0, current_stock: 0.0, notes: null },
  { name: 'Milka noisette', sku: 'MILKA-NOISETTE', selling_price: 28.0, current_stock: 0.0, notes: null },
  { name: "Cote d'or", sku: 'COTE-D-OR', selling_price: 25.0, current_stock: 0.0, notes: null },
  { name: 'Oreo Golden', sku: 'OREO-GOLDEN', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Oreo original', sku: 'OREO-ORIGINAL', selling_price: 0.0, current_stock: 7.0, notes: 'Expiry: 31.03-31.04' },
  { name: 'Milka Oreo biscuit', sku: 'MILKA-OREO-BISCUIT', selling_price: 0.0, current_stock: 0.0, notes: null },
  { name: 'Milka sensation', sku: 'MILKA-SENSATION', selling_price: 19.0, current_stock: 0.0, notes: null },
  { name: 'Leo', sku: 'LEO', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Knopper', sku: 'KNOPPER', selling_price: 16.0, current_stock: 0.0, notes: null },
  { name: 'Teasor Choco', sku: 'TEASOR-CHOCO', selling_price: 16.0, current_stock: 0.0, notes: null },
  { name: 'Kit Kat', sku: 'KIT-KAT', selling_price: 16.0, current_stock: 0.0, notes: null },
  { name: 'Dragibus', sku: 'DRAGIBUS', selling_price: 13.0, current_stock: 0.0, notes: null },
  { name: 'Twix', sku: 'TWIX', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Twix extra', sku: 'TWIX-EXTRA', selling_price: 26.0, current_stock: 0.0, notes: null },
  { name: 'Nutella go', sku: 'NUTELLA-GO', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Nutella biscuit', sku: 'NUTELLA-BISCUIT', selling_price: 19.0, current_stock: 0.0, notes: null },
  { name: 'Kinder delice', sku: 'KINDER-DELICE', selling_price: 10.0, current_stock: 0.0, notes: null },
  { name: 'Kinder card', sku: 'KINDER-CARD', selling_price: 18.0, current_stock: 0.0, notes: null },
  { name: 'Aqua kiss', sku: 'AQUA-KISS', selling_price: 22.0, current_stock: 0.0, notes: null },
  { name: 'Mentos 3 fruits free', sku: 'MENTOS-3-FRUITS-FREE', selling_price: 16.0, current_stock: 0.0, notes: null },
  { name: 'Mentos tablet', sku: 'MENTOS-TABLET', selling_price: 6.0, current_stock: 0.0, notes: null },
  { name: 'Bubbliche', sku: 'BUBBLICHE', selling_price: 10.0, current_stock: 0.0, notes: null },
  { name: 'Hollywood mix', sku: 'HOLLYWOOD-MIX', selling_price: 13.0, current_stock: 0.0, notes: null },
  { name: 'Freedent', sku: 'FREEDENT', selling_price: 16.0, current_stock: 0.0, notes: null },
  { name: 'Stirmool', sku: 'STIRMOOL', selling_price: 16.0, current_stock: 0.0, notes: null },
  { name: 'Mentos bottle', sku: 'MENTOS-BOTTLE', selling_price: 13.0, current_stock: 0.0, notes: null },
  { name: 'Mentos roll', sku: 'MENTOS-ROLL', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Smarties', sku: 'SMARTIES', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Jam breaker', sku: 'JAM-BREAKER', selling_price: 14.0, current_stock: 0.0, notes: null },
  { name: 'Kinder b/w', sku: 'KINDER-B-W', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Kinder joy', sku: 'KINDER-JOY', selling_price: 31.0, current_stock: 0.0, notes: null },
  { name: 'Kinder surprise', sku: 'KINDER-SURPRISE', selling_price: 42.0, current_stock: 0.0, notes: null },
  { name: 'Haribo boite', sku: 'HARIBO-BOITE', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Lays', sku: 'LAYS', selling_price: 12.0, current_stock: 0.0, notes: null },
  { name: 'Pringles', sku: 'PRINGLES', selling_price: 10.0, current_stock: 0.0, notes: null },
  { name: 'Pringles big', sku: 'PRINGLES-BIG', selling_price: 35.0, current_stock: 0.0, notes: null },
  { name: 'War head', sku: 'WAR-HEAD', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Chupa chup', sku: 'CHUPA-CHUP', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Cable candy', sku: 'CABLE-CANDY', selling_price: 10.0, current_stock: 0.0, notes: null },
  { name: 'Brick candy', sku: 'BRICK-CANDY', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Toy', sku: 'TOY', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Pipe', sku: 'PIPE', selling_price: 18.0, current_stock: 0.0, notes: null },
  { name: 'Grinder', sku: 'GRINDER', selling_price: 18.0, current_stock: 0.0, notes: null },
  { name: 'Bic small', sku: 'BIC-SMALL', selling_price: 26.0, current_stock: 0.0, notes: null },
  { name: 'Bic big', sku: 'BIC-BIG', selling_price: 32.0, current_stock: 0.0, notes: null },
  { name: 'Sasty lighter', sku: 'SASTY-LIGHTER', selling_price: 6.0, current_stock: 0.0, notes: null },
  { name: 'Clipper', sku: 'CLIPPER', selling_price: 32.0, current_stock: 0.0, notes: null },
  { name: 'Sac small', sku: 'SAC-SMALL', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Sac big', sku: 'SAC-BIG', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Club', sku: 'CLUB', selling_price: 53.0, current_stock: 0.0, notes: null },
  { name: 'Top filter', sku: 'TOP-FILTER', selling_price: 18.0, current_stock: 0.0, notes: null },
  { name: 'Mascotte filter', sku: 'MASCOTTE-FILTER', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Rizla big', sku: 'RIZLA-BIG', selling_price: 17.0, current_stock: 0.0, notes: null },
  { name: 'Rizla carton', sku: 'RIZLA-CARTON', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Top carton', sku: 'TOP-CARTON', selling_price: 24.0, current_stock: 0.0, notes: null },
  { name: 'Books', sku: 'BOOKS', selling_price: 24.0, current_stock: 0.0, notes: null },
  { name: 'Rizla small', sku: 'RIZLA-SMALL', selling_price: 23.0, current_stock: 0.0, notes: null },
  { name: 'Raw carton', sku: 'RAW-CARTON', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Top roll', sku: 'TOP-ROLL', selling_price: 16.0, current_stock: 0.0, notes: null },
  { name: 'Rizla micro', sku: 'RIZLA-MICRO', selling_price: 24.0, current_stock: 0.0, notes: null },
  { name: 'Smoking normal mix', sku: 'SMOKING-NORMAL-MIX', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Smoking + tips', sku: 'SMOKING-TIPS', selling_price: 22.0, current_stock: 0.0, notes: null },
  { name: 'Smoking roll + tips', sku: 'SMOKING-ROLL-TIPS', selling_price: 26.0, current_stock: 0.0, notes: null },
  { name: 'Top roll tips', sku: 'TOP-ROLL-TIPS', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Mascotte slim', sku: 'MASCOTTE-SLIM', selling_price: 29.0, current_stock: 0.0, notes: null },
  { name: 'Mascotte combi big', sku: 'MASCOTTE-COMBI-BIG', selling_price: 29.0, current_stock: 0.0, notes: null },
  { name: 'Mascotte combi small', sku: 'MASCOTTE-COMBI-SMALL', selling_price: 26.0, current_stock: 0.0, notes: null },
  { name: 'Mascotte roll tips', sku: 'MASCOTTE-ROLL-TIPS', selling_price: 20.0, current_stock: 0.0, notes: null },
  { name: 'Panasonic', sku: 'PANASONIC', selling_price: 15.0, current_stock: 0.0, notes: null },
  { name: 'Duracell', sku: 'DURACELL', selling_price: 50.0, current_stock: 0.0, notes: null },
  { name: 'Durex 12', sku: 'DUREX-12', selling_price: 18.0, current_stock: 0.0, notes: null },
  { name: 'Durex 1p', sku: 'DUREX-1P', selling_price: 6.5, current_stock: 0.0, notes: null },
  { name: 'Nesquick', sku: 'NESQUICK', selling_price: 15.0, current_stock: 5.0, notes: 'Expiry: 20.09' },
  { name: 'Chocapik', sku: 'CHOCAPIK', selling_price: 15.0, current_stock: 1.0, notes: 'Expiry: 20.09' },
  { name: 'Crunch', sku: 'CRUNCH', selling_price: 0.0, current_stock: 1.0, notes: 'Expiry: 20.03' },
  { name: 'Pizza', sku: 'PIZZA', selling_price: 0.0, current_stock: 3.0, notes: 'Expiry: 29.04' },
  { name: 'Atomik balls', sku: 'ATOMIK-BALLS', selling_price: 0.0, current_stock: 6.0, notes: 'Expiry: 2027' },
  { name: 'Sour choc roky', sku: 'SOUR-CHOC-ROKY', selling_price: 0.0, current_stock: 4.0, notes: null },
  { name: 'Tic tac', sku: 'TIC-TAC', selling_price: 0.0, current_stock: 12.0, notes: null },
  { name: 'Frisk bleu', sku: 'FRISK-BLEU', selling_price: 0.0, current_stock: 3.0, notes: null },
  { name: 'Frisk green', sku: 'FRISK-GREEN', selling_price: 0.0, current_stock: 8.0, notes: null },
  { name: 'Stimorol', sku: 'STIMOROL', selling_price: 16.0, current_stock: 0.0, notes: null },
  { name: 'Freedent (2)', sku: 'FREEDENT-2', selling_price: 21.0, current_stock: 0.0, notes: 'Expiry: 09.03' },
  { name: 'Bubblicious jaune', sku: 'BUBBLICIOUS-JAUNE', selling_price: 0.0, current_stock: 12.0, notes: null },
  { name: 'Bubblicious rose', sku: 'BUBBLICIOUS-ROSE', selling_price: 0.0, current_stock: 9.0, notes: null },
  { name: 'Bubblicious cola', sku: 'BUBBLICIOUS-COLA', selling_price: 0.0, current_stock: 2.0, notes: null },
];

export const seedDefaultProducts = async (companyId: string, client: any): Promise<void> => {
  if (!DEFAULT_PRODUCTS.length) return;

  for (const p of DEFAULT_PRODUCTS) {
    await client.query(
      `INSERT IGNORE INTO products
        (company_id, name, sku, selling_price, cost_price, current_stock,
         product_type, track_inventory, is_active, is_for_sale, is_for_purchase,
         unit_of_measure, notes)
       VALUES (?, ?, ?, ?, 0, ?, 'inventory', TRUE, TRUE, TRUE, TRUE, 'pcs', NULLIF(?, ''))`,
      [companyId, p.name, p.sku, p.selling_price, p.current_stock, p.notes || '']
    );
  }
};

import { pool } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { PaginationParams, PaginationMeta } from '../../types';
import { buildPaginationMeta } from '../../utils/pagination';

export const listCustomers = async (
  companyId: string,
  filters: {
    page: number; limit: number; offset: number;
    search?: string; is_active?: string; customer_type?: string;
    sort_by?: string; sort_order?: string;
  }
) => {
  const conditions = ['company_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.search) {
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR customer_no ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }
  if (filters.is_active !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    params.push(filters.is_active === 'true');
  }
  if (filters.customer_type) {
    conditions.push(`customer_type = $${idx++}`);
    params.push(filters.customer_type);
  }

  const sortBy = ['name', 'customer_no', 'created_at', 'email'].includes(filters.sort_by || '')
    ? filters.sort_by : 'name';
  const sortOrder = filters.sort_order === 'desc' ? 'DESC' : 'ASC';
  const where = conditions.join(' AND ');

  const countRes = await pool.query(`SELECT COUNT(*) FROM customers WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT * FROM customers WHERE ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );

  return { customers: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getCustomerById = async (companyId: string, customerId: string) => {
  const { rows } = await pool.query(
    'SELECT * FROM customers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
    [customerId, companyId]
  );
  if (!rows.length) throw new NotFoundError('Customer');
  return rows[0];
};

export const createCustomer = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  // Generate customer number
  const countRes = await pool.query(
    'SELECT COUNT(*) FROM customers WHERE company_id = $1', [companyId]
  );
  const count = parseInt(countRes.rows[0].count, 10) + 1;
  const customerNo = `CUST-${String(count).padStart(4, '0')}`;

  const { rows } = await pool.query(
    `INSERT INTO customers (
      company_id, customer_no, name, contact_person, email, phone, mobile, fax, website,
      billing_address, billing_city, billing_state, billing_postal_code, billing_country,
      shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country,
      tax_id, credit_limit, payment_terms, currency, customer_type, customer_group,
      customer_segment, is_active, notes, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$29)
    RETURNING *`,
    [
      companyId, customerNo, data.name, data.contact_person || null, data.email || null,
      data.phone || null, data.mobile || null, data.fax || null, data.website || null,
      data.billing_address || null, data.billing_city || null, data.billing_state || null,
      data.billing_postal_code || null, data.billing_country || null,
      data.shipping_address || null, data.shipping_city || null, data.shipping_state || null,
      data.shipping_postal_code || null, data.shipping_country || null,
      data.tax_id || null, data.credit_limit ?? 0, data.payment_terms ?? 30,
      data.currency || 'USD', data.customer_type || null, data.customer_group || null,
      data.customer_segment || null, data.is_active ?? true, data.notes || null, userId,
    ]
  );
  return rows[0];
};

export const updateCustomer = async (
  companyId: string, customerId: string, userId: string, data: Record<string, unknown>
) => {
  await getCustomerById(companyId, customerId);
  const fields = Object.keys(data).filter(k => k !== 'company_id');
  if (!fields.length) return getCustomerById(companyId, customerId);

  const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const values = fields.map(f => (data[f] === '' ? null : data[f]));

  const { rows } = await pool.query(
    `UPDATE customers SET ${setClause}, updated_by = $${fields.length + 3}, updated_at = NOW()
     WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING *`,
    [customerId, companyId, ...values, userId]
  );
  return rows[0];
};

export const deleteCustomer = async (companyId: string, customerId: string) => {
  await getCustomerById(companyId, customerId);
  await pool.query(
    'UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND company_id = $2',
    [customerId, companyId]
  );
};

export const getCustomerInvoices = async (
  companyId: string, customerId: string, pagination: PaginationParams
): Promise<{ invoices: unknown[]; pagination: PaginationMeta }> => {
  await getCustomerById(companyId, customerId);
  const countRes = await pool.query(
    'SELECT COUNT(*) FROM invoices WHERE company_id=$1 AND customer_id=$2 AND deleted_at IS NULL',
    [companyId, customerId]
  );
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id, invoice_no, invoice_date, due_date, status, payment_status, grand_total, amount_paid, amount_due
     FROM invoices WHERE company_id=$1 AND customer_id=$2 AND deleted_at IS NULL
     ORDER BY invoice_date DESC LIMIT $3 OFFSET $4`,
    [companyId, customerId, pagination.limit, pagination.offset]
  );
  return { invoices: rows, pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getCustomerSalesOrders = async (
  companyId: string, customerId: string, pagination: PaginationParams
): Promise<{ sales_orders: unknown[]; pagination: PaginationMeta }> => {
  await getCustomerById(companyId, customerId);
  const countRes = await pool.query(
    'SELECT COUNT(*) FROM sales_orders WHERE company_id=$1 AND customer_id=$2 AND deleted_at IS NULL',
    [companyId, customerId]
  );
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id, sales_order_no, order_date, due_date, status, fulfillment_status, grand_total
     FROM sales_orders WHERE company_id=$1 AND customer_id=$2 AND deleted_at IS NULL
     ORDER BY order_date DESC LIMIT $3 OFFSET $4`,
    [companyId, customerId, pagination.limit, pagination.offset]
  );
  return { sales_orders: rows, pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getCustomerOutstandingBalance = async (companyId: string, customerId: string) => {
  await getCustomerById(companyId, customerId);
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(amount_due), 0) as outstanding_balance,
            COUNT(*) FILTER (WHERE payment_status != 'paid') as unpaid_invoices
     FROM invoices
     WHERE company_id=$1 AND customer_id=$2 AND deleted_at IS NULL AND payment_status != 'paid'`,
    [companyId, customerId]
  );
  return rows[0];
};

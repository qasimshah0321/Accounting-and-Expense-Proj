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
  const conditions = ['company_id = ?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.search) {
    conditions.push(`(name LIKE ? OR email LIKE ? OR customer_no LIKE ?)`);
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  if (filters.is_active !== undefined) {
    conditions.push(`is_active = ?`);
    params.push(filters.is_active === 'true');
  }
  if (filters.customer_type) {
    conditions.push(`customer_type = ?`);
    params.push(filters.customer_type);
  }

  const sortBy = ['name', 'customer_no', 'created_at', 'email'].includes(filters.sort_by || '')
    ? filters.sort_by : 'name';
  const sortOrder = filters.sort_order === 'desc' ? 'DESC' : 'ASC';
  const where = conditions.join(' AND ');

  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM customers WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);

  const [rows] = await pool.query(
    `SELECT *,
       COALESCE((SELECT SUM(amount_due) FROM invoices
                 WHERE customer_id = customers.id AND deleted_at IS NULL AND payment_status != 'paid'), 0) AS outstanding_balance
     FROM customers WHERE ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );

  return { customers: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getCustomerById = async (companyId: string, customerId: string) => {
  const [rows] = await pool.query(
    'SELECT * FROM customers WHERE id = ? AND company_id = ? AND deleted_at IS NULL',
    [customerId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Customer');
  return (rows as any[])[0];
};

export const createCustomer = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  // Use MAX(customer_no) to avoid conflicts with soft-deleted records
  const [maxRows] = await pool.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(customer_no, 6) AS UNSIGNED)), 0) + 1 AS next_num FROM customers WHERE company_id = ?",
    [companyId]
  );
  const nextNum = parseInt((maxRows as any[])[0].next_num, 10);
  const customerNo = `CUST-${String(nextNum).padStart(4, '0')}`;

  await pool.query(
    `INSERT INTO customers (
      company_id, customer_no, name, contact_person, email, phone, mobile, fax, website,
      billing_address, billing_city, billing_state, billing_postal_code, billing_country,
      shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country,
      tax_id, credit_limit, payment_terms, currency, customer_type, customer_group,
      customer_segment, is_active, notes, ntn, cnic, province, registration_type, created_by, updated_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      companyId, customerNo, data.name, data.contact_person || null, data.email || null,
      data.phone || null, data.mobile || null, data.fax || null, data.website || null,
      data.billing_address || null, data.billing_city || null, data.billing_state || null,
      data.billing_postal_code || null, data.billing_country || null,
      data.shipping_address || null, data.shipping_city || null, data.shipping_state || null,
      data.shipping_postal_code || null, data.shipping_country || null,
      data.tax_id || null, data.credit_limit ?? 0, data.payment_terms ?? 30,
      data.currency || 'USD', data.customer_type || null, data.customer_group || null,
      data.customer_segment || null, data.is_active ?? true, data.notes || null,
      data.ntn || null, data.cnic || null, data.province || null, data.registration_type || 'Unregistered',
      userId, userId,
    ]
  );

  const [newRows] = await pool.query(
    'SELECT * FROM customers WHERE company_id = ? AND customer_no = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
    [companyId, customerNo]
  );
  return (newRows as any[])[0];
};

export const updateCustomer = async (
  companyId: string, customerId: string, userId: string, data: Record<string, unknown>
) => {
  await getCustomerById(companyId, customerId);
  const fields = Object.keys(data).filter(k => k !== 'company_id');
  if (!fields.length) return getCustomerById(companyId, customerId);

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (data[f] === '' ? null : data[f]));

  await pool.query(
    `UPDATE customers SET ${setClause}, updated_by = ?, updated_at = NOW()
     WHERE id = ? AND company_id = ? AND deleted_at IS NULL`,
    [...values, userId, customerId, companyId]
  );
  return getCustomerById(companyId, customerId);
};

export const deleteCustomer = async (companyId: string, customerId: string) => {
  await getCustomerById(companyId, customerId);
  await pool.query(
    'UPDATE customers SET deleted_at = NOW() WHERE id = ? AND company_id = ?',
    [customerId, companyId]
  );
};

export const getCustomerInvoices = async (
  companyId: string, customerId: string, pagination: PaginationParams
): Promise<{ invoices: unknown[]; pagination: PaginationMeta }> => {
  await getCustomerById(companyId, customerId);
  const [countRows] = await pool.query(
    'SELECT COUNT(*) as count FROM invoices WHERE company_id=? AND customer_id=? AND deleted_at IS NULL',
    [companyId, customerId]
  );
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id, invoice_no, invoice_date, due_date, status, payment_status, grand_total, amount_paid, amount_due
     FROM invoices WHERE company_id=? AND customer_id=? AND deleted_at IS NULL
     ORDER BY invoice_date DESC LIMIT ? OFFSET ?`,
    [companyId, customerId, pagination.limit, pagination.offset]
  );
  return { invoices: rows as any[], pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getCustomerSalesOrders = async (
  companyId: string, customerId: string, pagination: PaginationParams
): Promise<{ sales_orders: unknown[]; pagination: PaginationMeta }> => {
  await getCustomerById(companyId, customerId);
  const [countRows] = await pool.query(
    'SELECT COUNT(*) as count FROM sales_orders WHERE company_id=? AND customer_id=? AND deleted_at IS NULL',
    [companyId, customerId]
  );
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id, sales_order_no, order_date, due_date, status, fulfillment_status, grand_total
     FROM sales_orders WHERE company_id=? AND customer_id=? AND deleted_at IS NULL
     ORDER BY order_date DESC LIMIT ? OFFSET ?`,
    [companyId, customerId, pagination.limit, pagination.offset]
  );
  return { sales_orders: rows as any[], pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getCustomerOutstandingBalance = async (companyId: string, customerId: string) => {
  await getCustomerById(companyId, customerId);
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(amount_due), 0) as outstanding_balance,
            SUM(CASE WHEN payment_status != 'paid' THEN 1 ELSE 0 END) as unpaid_invoices
     FROM invoices
     WHERE company_id=? AND customer_id=? AND deleted_at IS NULL AND payment_status != 'paid'`,
    [companyId, customerId]
  );
  return (rows as any[])[0];
};

export const getCustomerStatement = async (
  companyId: string,
  customerId: string,
  startDate: string,
  endDate: string
) => {
  const customer = await getCustomerById(companyId, customerId);

  // Opening balance: invoiced minus paid BEFORE start_date
  const [openRows] = await pool.query(
    `SELECT COALESCE(SUM(grand_total), 0) AS total_invoiced,
            COALESCE(SUM(amount_paid), 0) AS total_paid
     FROM invoices
     WHERE company_id=? AND customer_id=? AND deleted_at IS NULL AND invoice_date < ?`,
    [companyId, customerId, startDate]
  );
  const openInvoiced = parseFloat((openRows as any[])[0].total_invoiced) || 0;
  const openPaid = parseFloat((openRows as any[])[0].total_paid) || 0;
  const openingBalance = openInvoiced - openPaid;

  // Invoices in date range
  const [invoiceRows] = await pool.query(
    `SELECT id, invoice_no AS reference, invoice_date AS date, due_date,
            grand_total AS amount, amount_paid, amount_due, status, payment_status
     FROM invoices
     WHERE company_id=? AND customer_id=? AND deleted_at IS NULL
       AND invoice_date >= ? AND invoice_date <= ?
     ORDER BY invoice_date ASC, invoice_no ASC`,
    [companyId, customerId, startDate, endDate]
  );

  // Payments in date range
  const [paymentRows] = await pool.query(
    `SELECT id, payment_no AS reference, payment_date AS date,
            amount, payment_method, reference_no, notes
     FROM customer_payments
     WHERE company_id=? AND customer_id=? AND deleted_at IS NULL
       AND payment_date >= ? AND payment_date <= ?
     ORDER BY payment_date ASC, payment_no ASC`,
    [companyId, customerId, startDate, endDate]
  );

  // Merge and compute running balance
  const transactions: any[] = [
    ...(invoiceRows as any[]).map(r => ({
      id: r.id, reference: r.reference, date: r.date, due_date: r.due_date,
      type: 'Invoice', debit: parseFloat(r.amount) || 0, credit: 0,
      payment_status: r.payment_status, status: r.status,
    })),
    ...(paymentRows as any[]).map(r => ({
      id: r.id, reference: r.reference, date: r.date,
      type: 'Payment', debit: 0, credit: parseFloat(r.amount) || 0,
      payment_method: r.payment_method, notes: r.notes || r.reference_no || null,
    })),
  ].sort((a, b) => {
    const d = new Date(a.date).getTime() - new Date(b.date).getTime();
    return d !== 0 ? d : a.reference.localeCompare(b.reference);
  });

  let runningBalance = openingBalance;
  const transactionsWithBalance = transactions.map(t => {
    runningBalance += t.debit - t.credit;
    return { ...t, balance: Math.round(runningBalance * 100) / 100 };
  });
  const closingBalance = Math.round(runningBalance * 100) / 100;

  // Aging analysis (all current unpaid invoices regardless of period)
  const today = new Date();
  const [agingRows] = await pool.query(
    `SELECT due_date, amount_due FROM invoices
     WHERE company_id=? AND customer_id=? AND deleted_at IS NULL
       AND payment_status != 'paid' AND amount_due > 0`,
    [companyId, customerId]
  );
  const aging = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0 };
  for (const inv of agingRows as any[]) {
    const daysPast = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / 86400000);
    const amt = parseFloat(inv.amount_due) || 0;
    if (daysPast <= 0) aging.current += amt;
    else if (daysPast <= 30) aging.days_1_30 += amt;
    else if (daysPast <= 60) aging.days_31_60 += amt;
    else if (daysPast <= 90) aging.days_61_90 += amt;
    else aging.days_over_90 += amt;
  }
  // round aging
  Object.keys(aging).forEach(k => { (aging as any)[k] = Math.round((aging as any)[k] * 100) / 100; });

  return {
    customer,
    period: { start_date: startDate, end_date: endDate },
    opening_balance: Math.round(openingBalance * 100) / 100,
    closing_balance: closingBalance,
    transactions: transactionsWithBalance,
    aging,
  };
};

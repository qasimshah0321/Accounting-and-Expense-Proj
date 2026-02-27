import { pool } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { PaginationParams, PaginationMeta } from '../../types';
import { buildPaginationMeta } from '../../utils/pagination';

export const listVendors = async (
  companyId: string,
  filters: { page: number; limit: number; offset: number; search?: string; is_active?: string; vendor_type?: string; sort_by?: string; sort_order?: string }
) => {
  const conditions = ['company_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.search) {
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR vendor_no ILIKE $${idx})`);
    params.push(`%${filters.search}%`); idx++;
  }
  if (filters.is_active !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    params.push(filters.is_active === 'true');
  }
  if (filters.vendor_type) {
    conditions.push(`vendor_type = $${idx++}`);
    params.push(filters.vendor_type);
  }

  const sortBy = ['name', 'vendor_no', 'created_at'].includes(filters.sort_by || '') ? filters.sort_by : 'name';
  const sortOrder = filters.sort_order === 'desc' ? 'DESC' : 'ASC';
  const where = conditions.join(' AND ');

  const countRes = await pool.query(`SELECT COUNT(*) FROM vendors WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT * FROM vendors WHERE ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { vendors: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getVendorById = async (companyId: string, vendorId: string) => {
  const { rows } = await pool.query(
    'SELECT * FROM vendors WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL',
    [vendorId, companyId]
  );
  if (!rows.length) throw new NotFoundError('Vendor');
  return rows[0];
};

export const createVendor = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  const countRes = await pool.query('SELECT COUNT(*) FROM vendors WHERE company_id=$1', [companyId]);
  const count = parseInt(countRes.rows[0].count, 10) + 1;
  const vendorNo = `VEND-${String(count).padStart(4, '0')}`;

  const { rows } = await pool.query(
    `INSERT INTO vendors (
      company_id, vendor_no, name, contact_person, email, phone, mobile, fax, website,
      address, city, state, postal_code, country, tax_id, payment_terms, payment_method,
      bank_name, bank_account, currency, vendor_type, vendor_group, vendor_segment,
      is_active, notes, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$26)
    RETURNING *`,
    [
      companyId, vendorNo, data.name, data.contact_person || null, data.email || null,
      data.phone || null, data.mobile || null, data.fax || null, data.website || null,
      data.address || null, data.city || null, data.state || null, data.postal_code || null,
      data.country || null, data.tax_id || null, data.payment_terms ?? 30,
      data.payment_method || null, data.bank_name || null, data.bank_account || null,
      data.currency || 'USD', data.vendor_type || null, data.vendor_group || null,
      data.vendor_segment || null, data.is_active ?? true, data.notes || null, userId,
    ]
  );
  return rows[0];
};

export const updateVendor = async (companyId: string, vendorId: string, userId: string, data: Record<string, unknown>) => {
  await getVendorById(companyId, vendorId);
  const fields = Object.keys(data).filter(k => k !== 'company_id');
  if (!fields.length) return getVendorById(companyId, vendorId);
  const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const values = fields.map(f => (data[f] === '' ? null : data[f]));
  const { rows } = await pool.query(
    `UPDATE vendors SET ${setClause}, updated_by=$${fields.length + 3}, updated_at=NOW()
     WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL RETURNING *`,
    [vendorId, companyId, ...values, userId]
  );
  return rows[0];
};

export const deleteVendor = async (companyId: string, vendorId: string) => {
  await getVendorById(companyId, vendorId);
  await pool.query('UPDATE vendors SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [vendorId, companyId]);
};

export const getVendorBills = async (companyId: string, vendorId: string, pagination: PaginationParams): Promise<{ bills: unknown[]; pagination: PaginationMeta }> => {
  await getVendorById(companyId, vendorId);
  const countRes = await pool.query('SELECT COUNT(*) FROM bills WHERE company_id=$1 AND vendor_id=$2 AND deleted_at IS NULL', [companyId, vendorId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id, bill_no, bill_date, due_date, status, payment_status, grand_total, amount_paid, amount_due
     FROM bills WHERE company_id=$1 AND vendor_id=$2 AND deleted_at IS NULL ORDER BY bill_date DESC LIMIT $3 OFFSET $4`,
    [companyId, vendorId, pagination.limit, pagination.offset]
  );
  return { bills: rows, pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getVendorPayments = async (companyId: string, vendorId: string, pagination: PaginationParams): Promise<{ payments: unknown[]; pagination: PaginationMeta }> => {
  await getVendorById(companyId, vendorId);
  const countRes = await pool.query('SELECT COUNT(*) FROM vendor_payments WHERE company_id=$1 AND vendor_id=$2 AND deleted_at IS NULL', [companyId, vendorId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id, payment_no, payment_date, payment_method, amount, status
     FROM vendor_payments WHERE company_id=$1 AND vendor_id=$2 AND deleted_at IS NULL ORDER BY payment_date DESC LIMIT $3 OFFSET $4`,
    [companyId, vendorId, pagination.limit, pagination.offset]
  );
  return { payments: rows, pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getVendorOutstandingBalance = async (companyId: string, vendorId: string) => {
  await getVendorById(companyId, vendorId);
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(amount_due),0) as outstanding_balance, COUNT(*) FILTER (WHERE payment_status!='paid') as unpaid_bills
     FROM bills WHERE company_id=$1 AND vendor_id=$2 AND deleted_at IS NULL AND payment_status!='paid'`,
    [companyId, vendorId]
  );
  return rows[0];
};

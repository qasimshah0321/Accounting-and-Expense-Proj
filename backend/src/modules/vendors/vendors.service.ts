import { pool } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { PaginationParams, PaginationMeta } from '../../types';
import { buildPaginationMeta } from '../../utils/pagination';

export const listVendors = async (
  companyId: string,
  filters: { page: number; limit: number; offset: number; search?: string; is_active?: string; vendor_type?: string; sort_by?: string; sort_order?: string }
) => {
  const conditions = ['company_id = ?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.search) {
    conditions.push(`(name LIKE ? OR email LIKE ? OR vendor_no LIKE ?)`);
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  if (filters.is_active !== undefined) {
    conditions.push(`is_active = ?`);
    params.push(filters.is_active === 'true');
  }
  if (filters.vendor_type) {
    conditions.push(`vendor_type = ?`);
    params.push(filters.vendor_type);
  }

  const sortBy = ['name', 'vendor_no', 'created_at'].includes(filters.sort_by || '') ? filters.sort_by : 'name';
  const sortOrder = filters.sort_order === 'desc' ? 'DESC' : 'ASC';
  const where = conditions.join(' AND ');

  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM vendors WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT * FROM vendors WHERE ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { vendors: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getVendorById = async (companyId: string, vendorId: string) => {
  const [rows] = await pool.query(
    'SELECT * FROM vendors WHERE id=? AND company_id=? AND deleted_at IS NULL',
    [vendorId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Vendor');
  return (rows as any[])[0];
};

export const createVendor = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  const [countRows] = await pool.query('SELECT COUNT(*) as count FROM vendors WHERE company_id=?', [companyId]);
  const count = parseInt((countRows as any[])[0].count, 10) + 1;
  const vendorNo = `VEND-${String(count).padStart(4, '0')}`;

  await pool.query(
    `INSERT INTO vendors (
      company_id, vendor_no, name, contact_person, email, phone, mobile, fax, website,
      address, city, state, postal_code, country, tax_id, payment_terms, payment_method,
      bank_name, bank_account, currency, vendor_type, vendor_group, vendor_segment,
      is_active, notes, created_by, updated_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      companyId, vendorNo, data.name, data.contact_person || null, data.email || null,
      data.phone || null, data.mobile || null, data.fax || null, data.website || null,
      data.address || null, data.city || null, data.state || null, data.postal_code || null,
      data.country || null, data.tax_id || null, data.payment_terms ?? 30,
      data.payment_method || null, data.bank_name || null, data.bank_account || null,
      data.currency || 'USD', data.vendor_type || null, data.vendor_group || null,
      data.vendor_segment || null, data.is_active ?? true, data.notes || null, userId, userId,
    ]
  );

  const [newRows] = await pool.query(
    'SELECT * FROM vendors WHERE company_id=? AND vendor_no=? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
    [companyId, vendorNo]
  );
  return (newRows as any[])[0];
};

export const updateVendor = async (companyId: string, vendorId: string, userId: string, data: Record<string, unknown>) => {
  await getVendorById(companyId, vendorId);
  const fields = Object.keys(data).filter(k => k !== 'company_id');
  if (!fields.length) return getVendorById(companyId, vendorId);
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (data[f] === '' ? null : data[f]));
  await pool.query(
    `UPDATE vendors SET ${setClause}, updated_by=?, updated_at=NOW()
     WHERE id=? AND company_id=? AND deleted_at IS NULL`,
    [...values, userId, vendorId, companyId]
  );
  return getVendorById(companyId, vendorId);
};

export const deleteVendor = async (companyId: string, vendorId: string) => {
  await getVendorById(companyId, vendorId);
  await pool.query('UPDATE vendors SET deleted_at=NOW() WHERE id=? AND company_id=?', [vendorId, companyId]);
};

export const getVendorBills = async (companyId: string, vendorId: string, pagination: PaginationParams): Promise<{ bills: unknown[]; pagination: PaginationMeta }> => {
  await getVendorById(companyId, vendorId);
  const [countRows] = await pool.query('SELECT COUNT(*) as count FROM bills WHERE company_id=? AND vendor_id=? AND deleted_at IS NULL', [companyId, vendorId]);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id, bill_no, bill_date, due_date, status, payment_status, total_amount, amount_paid, amount_due
     FROM bills WHERE company_id=? AND vendor_id=? AND deleted_at IS NULL ORDER BY bill_date DESC LIMIT ? OFFSET ?`,
    [companyId, vendorId, pagination.limit, pagination.offset]
  );
  return { bills: rows as any[], pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getVendorPayments = async (companyId: string, vendorId: string, pagination: PaginationParams): Promise<{ payments: unknown[]; pagination: PaginationMeta }> => {
  await getVendorById(companyId, vendorId);
  const [countRows] = await pool.query('SELECT COUNT(*) as count FROM vendor_payments WHERE company_id=? AND vendor_id=? AND deleted_at IS NULL', [companyId, vendorId]);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id, payment_no, payment_date, payment_method, amount, status
     FROM vendor_payments WHERE company_id=? AND vendor_id=? AND deleted_at IS NULL ORDER BY payment_date DESC LIMIT ? OFFSET ?`,
    [companyId, vendorId, pagination.limit, pagination.offset]
  );
  return { payments: rows as any[], pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getVendorOutstandingBalance = async (companyId: string, vendorId: string) => {
  await getVendorById(companyId, vendorId);
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(amount_due),0) as outstanding_balance, SUM(CASE WHEN payment_status!='paid' THEN 1 ELSE 0 END) as unpaid_bills
     FROM bills WHERE company_id=? AND vendor_id=? AND deleted_at IS NULL AND payment_status!='paid'`,
    [companyId, vendorId]
  );
  return (rows as any[])[0];
};

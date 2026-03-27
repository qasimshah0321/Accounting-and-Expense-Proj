import { pool, withTransaction } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export const listTaxes = async (companyId: string, filters: { is_active?: string }) => {
  const conditions = ['company_id=?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  if (filters.is_active !== undefined) {
    conditions.push(`is_active=?`);
    params.push(filters.is_active === 'true');
  }
  const [rows] = await pool.query(
    `SELECT * FROM taxes WHERE ${conditions.join(' AND ')} ORDER BY name ASC`, params
  );
  return rows as any[];
};

export const getTaxById = async (companyId: string, taxId: string) => {
  const [rows] = await pool.query(
    'SELECT * FROM taxes WHERE id=? AND company_id=? AND deleted_at IS NULL',
    [taxId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Tax');
  return (rows as any[])[0];
};

export const createTax = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  return withTransaction(async (client) => {
    if (data.is_default) {
      await client.query(
        'UPDATE taxes SET is_default=false WHERE company_id=? AND deleted_at IS NULL', [companyId]
      );
    }
    await client.query(
      `INSERT INTO taxes (company_id, name, description, rate, tax_type, is_compound, is_default, is_active, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [companyId, data.name, data.description || null, data.rate, data.tax_type || null, data.is_compound ?? false, data.is_default ?? false, data.is_active ?? true, userId, userId]
    );
    const [newRows] = await client.query(
      'SELECT * FROM taxes WHERE company_id=? AND name=? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [companyId, data.name]
    );
    return (newRows as any[])[0];
  });
};

export const updateTax = async (companyId: string, taxId: string, userId: string, data: Record<string, unknown>) => {
  await getTaxById(companyId, taxId);
  return withTransaction(async (client) => {
    if (data.is_default) {
      await client.query('UPDATE taxes SET is_default=false WHERE company_id=? AND deleted_at IS NULL', [companyId]);
    }
    const fields = Object.keys(data).filter(k => !['company_id', 'id'].includes(k));
    if (!fields.length) return getTaxById(companyId, taxId);
    const setClause = fields.map(f => `${f}=?`).join(', ');
    const values = fields.map(f => data[f]);
    await client.query(
      `UPDATE taxes SET ${setClause}, updated_by=?, updated_at=NOW() WHERE id=? AND company_id=? AND deleted_at IS NULL`,
      [...values, userId, taxId, companyId]
    );
    return getTaxById(companyId, taxId);
  });
};

export const deleteTax = async (companyId: string, taxId: string) => {
  await getTaxById(companyId, taxId);
  await pool.query('UPDATE taxes SET deleted_at=NOW() WHERE id=? AND company_id=?', [taxId, companyId]);
};

export const toggleActive = async (companyId: string, taxId: string) => {
  const tax = await getTaxById(companyId, taxId);
  await pool.query(
    'UPDATE taxes SET is_active=?, updated_at=NOW() WHERE id=? AND company_id=?',
    [!tax.is_active, taxId, companyId]
  );
  return getTaxById(companyId, taxId);
};

export const setDefault = async (companyId: string, taxId: string) => {
  await getTaxById(companyId, taxId);
  return withTransaction(async (client) => {
    await client.query('UPDATE taxes SET is_default=false WHERE company_id=? AND deleted_at IS NULL', [companyId]);
    await client.query(
      'UPDATE taxes SET is_default=true, updated_at=NOW() WHERE id=? AND company_id=?',
      [taxId, companyId]
    );
    return getTaxById(companyId, taxId);
  });
};

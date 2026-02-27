import { pool, withTransaction } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export const listTaxes = async (companyId: string, filters: { is_active?: string }) => {
  const conditions = ['company_id=$1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  if (filters.is_active !== undefined) {
    conditions.push(`is_active=$2`);
    params.push(filters.is_active === 'true');
  }
  const { rows } = await pool.query(
    `SELECT * FROM taxes WHERE ${conditions.join(' AND ')} ORDER BY name ASC`, params
  );
  return rows;
};

export const getTaxById = async (companyId: string, taxId: string) => {
  const { rows } = await pool.query(
    'SELECT * FROM taxes WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL',
    [taxId, companyId]
  );
  if (!rows.length) throw new NotFoundError('Tax');
  return rows[0];
};

export const createTax = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  return withTransaction(async (client) => {
    if (data.is_default) {
      await client.query(
        'UPDATE taxes SET is_default=false WHERE company_id=$1 AND deleted_at IS NULL', [companyId]
      );
    }
    const { rows } = await client.query(
      `INSERT INTO taxes (company_id, name, description, rate, tax_type, is_compound, is_default, is_active, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [companyId, data.name, data.description || null, data.rate, data.tax_type || null, data.is_compound ?? false, data.is_default ?? false, data.is_active ?? true, userId]
    );
    return rows[0];
  });
};

export const updateTax = async (companyId: string, taxId: string, userId: string, data: Record<string, unknown>) => {
  await getTaxById(companyId, taxId);
  return withTransaction(async (client) => {
    if (data.is_default) {
      await client.query('UPDATE taxes SET is_default=false WHERE company_id=$1 AND deleted_at IS NULL', [companyId]);
    }
    const fields = Object.keys(data).filter(k => !['company_id', 'id'].includes(k));
    if (!fields.length) return getTaxById(companyId, taxId);
    const setClause = fields.map((f, i) => `${f}=$${i + 3}`).join(', ');
    const values = fields.map(f => data[f]);
    const { rows } = await client.query(
      `UPDATE taxes SET ${setClause}, updated_by=$${fields.length + 3}, updated_at=NOW() WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL RETURNING *`,
      [taxId, companyId, ...values, userId]
    );
    return rows[0];
  });
};

export const deleteTax = async (companyId: string, taxId: string) => {
  await getTaxById(companyId, taxId);
  await pool.query('UPDATE taxes SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [taxId, companyId]);
};

export const toggleActive = async (companyId: string, taxId: string) => {
  const tax = await getTaxById(companyId, taxId);
  const { rows } = await pool.query(
    'UPDATE taxes SET is_active=$1, updated_at=NOW() WHERE id=$2 AND company_id=$3 RETURNING *',
    [!tax.is_active, taxId, companyId]
  );
  return rows[0];
};

export const setDefault = async (companyId: string, taxId: string) => {
  await getTaxById(companyId, taxId);
  return withTransaction(async (client) => {
    await client.query('UPDATE taxes SET is_default=false WHERE company_id=$1 AND deleted_at IS NULL', [companyId]);
    const { rows } = await client.query(
      'UPDATE taxes SET is_default=true, updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *',
      [taxId, companyId]
    );
    return rows[0];
  });
};

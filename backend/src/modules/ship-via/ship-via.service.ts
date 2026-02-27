import { pool } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export const listShipVia = async (companyId: string, filters: { is_active?: string }) => {
  const conditions = ['company_id=$1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  if (filters.is_active !== undefined) { conditions.push('is_active=$2'); params.push(filters.is_active === 'true'); }
  const { rows } = await pool.query(`SELECT * FROM ship_via WHERE ${conditions.join(' AND ')} ORDER BY name ASC`, params);
  return rows;
};

export const getShipViaById = async (companyId: string, id: string) => {
  const { rows } = await pool.query('SELECT * FROM ship_via WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [id, companyId]);
  if (!rows.length) throw new NotFoundError('Ship Via');
  return rows[0];
};

export const createShipVia = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  const { rows } = await pool.query(
    `INSERT INTO ship_via (company_id, name, description, carrier, service_type, estimated_days, tracking_url_template, is_active, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
    [companyId, data.name, data.description || null, data.carrier || null, data.service_type || null, data.estimated_days || null, data.tracking_url_template || null, data.is_active ?? true, userId]
  );
  return rows[0];
};

export const updateShipVia = async (companyId: string, id: string, userId: string, data: Record<string, unknown>) => {
  await getShipViaById(companyId, id);
  const fields = Object.keys(data);
  if (!fields.length) return getShipViaById(companyId, id);
  const setClause = fields.map((f, i) => `${f}=$${i + 3}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE ship_via SET ${setClause}, updated_by=$${fields.length + 3}, updated_at=NOW() WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL RETURNING *`,
    [id, companyId, ...fields.map(f => data[f]), userId]
  );
  return rows[0];
};

export const deleteShipVia = async (companyId: string, id: string) => {
  await getShipViaById(companyId, id);
  await pool.query('UPDATE ship_via SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [id, companyId]);
};

export const toggleActive = async (companyId: string, id: string) => {
  const sv = await getShipViaById(companyId, id);
  const { rows } = await pool.query(
    'UPDATE ship_via SET is_active=$1, updated_at=NOW() WHERE id=$2 AND company_id=$3 RETURNING *',
    [!sv.is_active, id, companyId]
  );
  return rows[0];
};

import { pool } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export const listShipVia = async (companyId: string, filters: { is_active?: string }) => {
  const conditions = ['company_id=?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  if (filters.is_active !== undefined) { conditions.push('is_active=?'); params.push(filters.is_active === 'true'); }
  const [rows] = await pool.query(`SELECT * FROM ship_via WHERE ${conditions.join(' AND ')} ORDER BY name ASC`, params);
  return rows as any[];
};

export const getShipViaById = async (companyId: string, id: string) => {
  const [rows] = await pool.query('SELECT * FROM ship_via WHERE id=? AND company_id=? AND deleted_at IS NULL', [id, companyId]);
  if (!(rows as any[]).length) throw new NotFoundError('Ship Via');
  return (rows as any[])[0];
};

export const createShipVia = async (companyId: string, userId: string, data: Record<string, unknown>) => {
  await pool.query(
    `INSERT INTO ship_via (company_id, name, description, carrier, service_type, estimated_days, tracking_url_template, is_active, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [companyId, data.name, data.description || null, data.carrier || null, data.service_type || null, data.estimated_days || null, data.tracking_url_template || null, data.is_active ?? true, userId, userId]
  );
  const [newRows] = await pool.query(
    'SELECT * FROM ship_via WHERE company_id=? AND name=? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
    [companyId, data.name]
  );
  return (newRows as any[])[0];
};

export const updateShipVia = async (companyId: string, id: string, userId: string, data: Record<string, unknown>) => {
  await getShipViaById(companyId, id);
  const fields = Object.keys(data);
  if (!fields.length) return getShipViaById(companyId, id);
  const setClause = fields.map(f => `${f}=?`).join(', ');
  await pool.query(
    `UPDATE ship_via SET ${setClause}, updated_by=?, updated_at=NOW() WHERE id=? AND company_id=? AND deleted_at IS NULL`,
    [...fields.map(f => data[f]), userId, id, companyId]
  );
  return getShipViaById(companyId, id);
};

export const deleteShipVia = async (companyId: string, id: string) => {
  await getShipViaById(companyId, id);
  await pool.query('UPDATE ship_via SET deleted_at=NOW() WHERE id=? AND company_id=?', [id, companyId]);
};

export const toggleActive = async (companyId: string, id: string) => {
  const sv = await getShipViaById(companyId, id);
  await pool.query(
    'UPDATE ship_via SET is_active=?, updated_at=NOW() WHERE id=? AND company_id=?',
    [!sv.is_active, id, companyId]
  );
  return getShipViaById(companyId, id);
};

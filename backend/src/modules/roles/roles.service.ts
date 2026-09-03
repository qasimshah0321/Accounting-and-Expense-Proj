import { pool } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';

export const listRoles = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT id, role_code, role_name, description, is_active, created_at
     FROM roles WHERE company_id = ? ORDER BY role_name`,
    [companyId]
  );
  return rows as any[];
};

export const createRole = async (
  companyId: string,
  data: { role_code: string; role_name: string; description?: string }
) => {
  if (!data.role_code || !data.role_name) throw new ValidationError('role_code and role_name are required');

  // Prevent reserved codes
  const reserved = ['admin'];
  if (reserved.includes(data.role_code.toLowerCase())) {
    throw new ValidationError(`"${data.role_code}" is a reserved role code`);
  }

  const [existing] = await pool.query(
    'SELECT id FROM roles WHERE company_id = ? AND role_code = ?',
    [companyId, data.role_code]
  );
  if ((existing as any[]).length) throw new ValidationError('Role code already exists');

  await pool.query(
    `INSERT INTO roles (company_id, role_code, role_name, description) VALUES (?, ?, ?, ?)`,
    [companyId, data.role_code, data.role_name, data.description || null]
  );

  const [rows] = await pool.query(
    'SELECT id, role_code, role_name, description, is_active, created_at FROM roles WHERE company_id = ? AND role_code = ? ORDER BY created_at DESC LIMIT 1',
    [companyId, data.role_code]
  );
  return (rows as any[])[0];
};

export const updateRole = async (
  companyId: string,
  roleId: string,
  data: { role_name?: string; description?: string; is_active?: boolean }
) => {
  const [rows] = await pool.query(
    'SELECT id FROM roles WHERE id = ? AND company_id = ?',
    [roleId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Role');

  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.role_name !== undefined) { sets.push('role_name = ?'); params.push(data.role_name); }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
  if (data.is_active !== undefined) { sets.push('is_active = ?'); params.push(data.is_active); }

  if (!sets.length) return (rows as any[])[0];
  sets.push('updated_at = NOW()');
  params.push(roleId, companyId);

  await pool.query(`UPDATE roles SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`, params);

  const [updated] = await pool.query(
    'SELECT id, role_code, role_name, description, is_active, created_at FROM roles WHERE id = ?',
    [roleId]
  );
  return (updated as any[])[0];
};

export const deleteRole = async (companyId: string, roleId: string) => {
  const [rows] = await pool.query(
    'SELECT id, role_code FROM roles WHERE id = ? AND company_id = ?',
    [roleId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Role');

  // Check if any users use this role
  const roleCode = (rows as any[])[0].role_code;
  const [users] = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE company_id = ? AND role = ? AND deleted_at IS NULL',
    [companyId, roleCode]
  );
  const count = (users as any[])[0].count;
  if (count > 0) throw new ValidationError(`Cannot delete: ${count} user(s) have this role`);

  await pool.query('DELETE FROM roles WHERE id = ? AND company_id = ?', [roleId, companyId]);
};

// Seed default roles on company registration
export const seedDefaultRoles = async (companyId: string, client: any) => {
  const defaults = [
    { role_code: 'salesperson', role_name: 'Salesperson', description: 'Sales team member with access to sales modules' },
    { role_code: 'customer', role_name: 'Customer', description: 'Customer portal access' },
  ];
  for (const r of defaults) {
    await client.query(
      `INSERT IGNORE INTO roles (company_id, role_code, role_name, description) VALUES (?, ?, ?, ?)`,
      [companyId, r.role_code, r.role_name, r.description]
    );
  }
};

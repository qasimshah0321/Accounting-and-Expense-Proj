import { pool } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { ALL_MENUS } from '../role-permissions/role-permissions.service';

export const listDepartments = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT d.id, d.name, d.description, d.color, d.created_at,
            COUNT(u.id) AS member_count
     FROM departments d
     LEFT JOIN users u ON u.department_id = d.id AND u.deleted_at IS NULL AND u.is_active = true
     WHERE d.company_id = ?
     GROUP BY d.id
     ORDER BY d.name`,
    [companyId]
  );
  return rows as any[];
};

export const getDepartmentWithMembers = async (companyId: string, deptId: string) => {
  const [deptRows] = await pool.query(
    `SELECT id, name, description, color, created_at FROM departments WHERE id = ? AND company_id = ?`,
    [deptId, companyId]
  );
  if (!(deptRows as any[]).length) throw new NotFoundError('Department');

  const dept = (deptRows as any[])[0];

  const [members] = await pool.query(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.is_active
     FROM users u WHERE u.department_id = ? AND u.company_id = ? AND u.deleted_at IS NULL
     ORDER BY u.first_name, u.last_name`,
    [deptId, companyId]
  );

  const [perms] = await pool.query(
    `SELECT menu_name, can_access, display_name FROM department_menu_permissions WHERE department_id = ?`,
    [deptId]
  );

  const permMap: Record<string, any> = {};
  for (const p of perms as any[]) permMap[p.menu_name] = p;

  const permissions = ALL_MENUS.map((m) => ({
    menu_name: m.name,
    category: m.category,
    display_name: permMap[m.name]?.display_name || m.name,
    can_access: permMap[m.name] !== undefined ? Boolean(permMap[m.name].can_access) : false,
  }));

  return { ...dept, members, permissions };
};

export const createDepartment = async (
  companyId: string,
  data: { name: string; description?: string; color?: string }
) => {
  const [existing] = await pool.query(
    'SELECT id FROM departments WHERE company_id = ? AND name = ?',
    [companyId, data.name]
  );
  if ((existing as any[]).length) throw new ValidationError('Department name already exists');

  await pool.query(
    `INSERT INTO departments (company_id, name, description, color)
     VALUES (?, ?, ?, ?)`,
    [companyId, data.name, data.description || null, data.color || '#4f46e5']
  );

  const [rows] = await pool.query(
    'SELECT id, name, description, color, created_at FROM departments WHERE company_id = ? AND name = ? ORDER BY created_at DESC LIMIT 1',
    [companyId, data.name]
  );
  return (rows as any[])[0];
};

export const updateDepartment = async (
  companyId: string,
  deptId: string,
  data: { name?: string; description?: string; color?: string }
) => {
  const [rows] = await pool.query(
    'SELECT id FROM departments WHERE id = ? AND company_id = ?',
    [deptId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Department');

  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
  if (data.color !== undefined) { sets.push('color = ?'); params.push(data.color); }

  if (!sets.length) return (rows as any[])[0];
  sets.push('updated_at = NOW()');
  params.push(deptId, companyId);

  await pool.query(
    `UPDATE departments SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
    params
  );

  const [updated] = await pool.query(
    'SELECT id, name, description, color, created_at FROM departments WHERE id = ?',
    [deptId]
  );
  return (updated as any[])[0];
};

export const deleteDepartment = async (companyId: string, deptId: string) => {
  const [rows] = await pool.query(
    'SELECT id FROM departments WHERE id = ? AND company_id = ?',
    [deptId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Department');

  // Unassign all users from this department
  await pool.query(
    'UPDATE users SET department_id = NULL WHERE department_id = ? AND company_id = ?',
    [deptId, companyId]
  );

  // Delete department permissions
  await pool.query('DELETE FROM department_menu_permissions WHERE department_id = ?', [deptId]);

  await pool.query('DELETE FROM departments WHERE id = ? AND company_id = ?', [deptId, companyId]);
};

export const updateDepartmentPermissions = async (
  companyId: string,
  deptId: string,
  updates: Array<{ menu_name: string; can_access: boolean; display_name?: string }>
) => {
  const [rows] = await pool.query(
    'SELECT id FROM departments WHERE id = ? AND company_id = ?',
    [deptId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Department');

  for (const upd of updates) {
    await pool.query(
      `INSERT INTO department_menu_permissions (company_id, department_id, menu_name, can_access, display_name, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE can_access = VALUES(can_access), display_name = VALUES(display_name), updated_at = NOW()`,
      [companyId, deptId, upd.menu_name, upd.can_access, upd.display_name || upd.menu_name]
    );
  }
};

// Assign user to department (null = unassign). Enforces one-dept-per-user.
export const assignUserToDepartment = async (
  companyId: string,
  userId: string,
  deptId: string | null
) => {
  const [userRows] = await pool.query(
    'SELECT id FROM users WHERE id = ? AND company_id = ? AND deleted_at IS NULL',
    [userId, companyId]
  );
  if (!(userRows as any[]).length) throw new NotFoundError('User');

  if (deptId !== null) {
    const [deptRows] = await pool.query(
      'SELECT id FROM departments WHERE id = ? AND company_id = ?',
      [deptId, companyId]
    );
    if (!(deptRows as any[]).length) throw new NotFoundError('Department');
  }

  await pool.query(
    'UPDATE users SET department_id = ?, updated_at = NOW() WHERE id = ? AND company_id = ?',
    [deptId, userId, companyId]
  );
};

// Get all users not in any department (for the assignment pool)
export const getUnassignedUsers = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.is_active
     FROM users u
     WHERE u.company_id = ? AND u.deleted_at IS NULL AND u.department_id IS NULL AND u.role != 'admin'
     ORDER BY u.first_name, u.last_name`,
    [companyId]
  );
  return rows as any[];
};

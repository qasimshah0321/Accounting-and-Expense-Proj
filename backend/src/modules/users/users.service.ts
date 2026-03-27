import bcrypt from 'bcryptjs';
import { pool } from '../../config/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';

export const listUsers = async (companyId: string, page: number, limit: number, offset: number) => {
  const [countRows] = await pool.query(
    `SELECT COUNT(*) as count FROM users WHERE company_id = ? AND deleted_at IS NULL`,
    [companyId]
  );
  const total = parseInt((countRows as any[])[0].count, 10);

  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.is_active, u.last_login, u.created_at,
            c.name as linked_customer_name, ucm.customer_id as linked_customer_id
     FROM users u
     LEFT JOIN user_customer_map ucm ON ucm.user_id = u.id
     LEFT JOIN customers c ON c.id = ucm.customer_id AND c.deleted_at IS NULL
     WHERE u.company_id = ? AND u.deleted_at IS NULL
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [companyId, limit, offset]
  );

  return { users: rows as any[], pagination: buildPaginationMeta(page, limit, total) };
};

export const createUser = async (
  companyId: string,
  data: { email: string; password: string; username: string; first_name?: string; last_name?: string; role: string; customer_id?: string }
) => {
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [data.email]);
  if ((existing as any[]).length) throw new ValidationError('Email already in use');

  const allowedRoles = ['customer', 'salesperson'];
  if (!allowedRoles.includes(data.role)) throw new ValidationError('Role must be customer or salesperson');

  const passwordHash = await bcrypt.hash(data.password, 12);

  await pool.query(
    `INSERT INTO users (company_id, username, email, password_hash, first_name, last_name, role, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
    [companyId, data.username, data.email, passwordHash, data.first_name || null, data.last_name || null, data.role]
  );

  const [userRows] = await pool.query(
    'SELECT id, company_id, username, email, first_name, last_name, role, is_active FROM users WHERE company_id = ? AND email = ? ORDER BY created_at DESC LIMIT 1',
    [companyId, data.email]
  );
  const user = (userRows as any[])[0];

  if (data.customer_id) {
    await pool.query(
      `INSERT INTO user_customer_map (company_id, user_id, customer_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE customer_id = VALUES(customer_id)`,
      [companyId, user.id, data.customer_id]
    );
  }

  return user;
};

export const updateUser = async (
  companyId: string,
  userId: string,
  data: { role?: string; first_name?: string; last_name?: string; is_active?: boolean }
) => {
  const [rows] = await pool.query(
    'SELECT id, role FROM users WHERE id = ? AND company_id = ? AND deleted_at IS NULL',
    [userId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('User');
  if ((rows as any[])[0].role === 'admin' && data.role && data.role !== 'admin') {
    throw new ForbiddenError('Cannot change role of admin user');
  }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.first_name !== undefined) { sets.push(`first_name = ?`); params.push(data.first_name); }
  if (data.last_name !== undefined) { sets.push(`last_name = ?`); params.push(data.last_name); }
  if (data.role !== undefined) { sets.push(`role = ?`); params.push(data.role); }
  if (data.is_active !== undefined) { sets.push(`is_active = ?`); params.push(data.is_active); }

  if (!sets.length) return (rows as any[])[0];

  sets.push(`updated_at = NOW()`);
  params.push(companyId, userId);

  await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE company_id = ? AND id = ?`,
    params
  );

  const [updatedRows] = await pool.query(
    'SELECT id, username, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
    [userId]
  );
  return (updatedRows as any[])[0];
};

export const deleteUser = async (companyId: string, userId: string) => {
  const [rows] = await pool.query(
    'SELECT id, role FROM users WHERE id = ? AND company_id = ? AND deleted_at IS NULL',
    [userId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('User');
  if ((rows as any[])[0].role === 'admin') throw new ForbiddenError('Cannot delete admin users');

  await pool.query('UPDATE users SET deleted_at = NOW(), is_active = false WHERE id = ?', [userId]);
};

export const linkCustomer = async (companyId: string, userId: string, customerId: string) => {
  const [userRes] = await pool.query('SELECT id FROM users WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [userId, companyId]);
  if (!(userRes as any[]).length) throw new NotFoundError('User');

  const [custRes] = await pool.query('SELECT id FROM customers WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [customerId, companyId]);
  if (!(custRes as any[]).length) throw new NotFoundError('Customer');

  await pool.query(
    `INSERT INTO user_customer_map (company_id, user_id, customer_id) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE customer_id = VALUES(customer_id)`,
    [companyId, userId, customerId]
  );
};

export const unlinkCustomer = async (companyId: string, userId: string) => {
  const [userRes] = await pool.query('SELECT id FROM users WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [userId, companyId]);
  if (!(userRes as any[]).length) throw new NotFoundError('User');

  await pool.query('DELETE FROM user_customer_map WHERE user_id = ?', [userId]);
};

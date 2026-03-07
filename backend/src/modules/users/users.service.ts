import bcrypt from 'bcryptjs';
import { pool } from '../../config/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';

export const listUsers = async (companyId: string, page: number, limit: number, offset: number) => {
  const countRes = await pool.query(
    `SELECT COUNT(*) FROM users WHERE company_id = $1 AND deleted_at IS NULL`,
    [companyId]
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.is_active, u.last_login, u.created_at,
            c.name as linked_customer_name, ucm.customer_id as linked_customer_id
     FROM users u
     LEFT JOIN user_customer_map ucm ON ucm.user_id = u.id
     LEFT JOIN customers c ON c.id = ucm.customer_id AND c.deleted_at IS NULL
     WHERE u.company_id = $1 AND u.deleted_at IS NULL
     ORDER BY u.created_at DESC
     LIMIT $2 OFFSET $3`,
    [companyId, limit, offset]
  );

  return { users: rows, pagination: buildPaginationMeta(page, limit, total) };
};

export const createUser = async (
  companyId: string,
  data: { email: string; password: string; username: string; first_name?: string; last_name?: string; role: string; customer_id?: string }
) => {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
  if (existing.rows.length) throw new ValidationError('Email already in use');

  const allowedRoles = ['customer', 'salesperson'];
  if (!allowedRoles.includes(data.role)) throw new ValidationError('Role must be customer or salesperson');

  const passwordHash = await bcrypt.hash(data.password, 12);

  const { rows: [user] } = await pool.query(
    `INSERT INTO users (company_id, username, email, password_hash, first_name, last_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id, company_id, username, email, first_name, last_name, role, is_active`,
    [companyId, data.username, data.email, passwordHash, data.first_name || null, data.last_name || null, data.role]
  );

  if (data.customer_id) {
    await pool.query(
      `INSERT INTO user_customer_map (company_id, user_id, customer_id) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET customer_id = EXCLUDED.customer_id`,
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
  const { rows } = await pool.query(
    'SELECT id, role FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
    [userId, companyId]
  );
  if (!rows.length) throw new NotFoundError('User');
  if (rows[0].role === 'admin' && data.role && data.role !== 'admin') {
    throw new ForbiddenError('Cannot change role of admin user');
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.first_name !== undefined) { sets.push(`first_name = $${idx++}`); params.push(data.first_name); }
  if (data.last_name !== undefined) { sets.push(`last_name = $${idx++}`); params.push(data.last_name); }
  if (data.role !== undefined) { sets.push(`role = $${idx++}`); params.push(data.role); }
  if (data.is_active !== undefined) { sets.push(`is_active = $${idx++}`); params.push(data.is_active); }

  if (!sets.length) return rows[0];

  sets.push(`updated_at = NOW()`);
  params.push(companyId, userId);

  const { rows: [updated] } = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE company_id = $${idx++} AND id = $${idx} RETURNING id, username, email, first_name, last_name, role, is_active`,
    params
  );
  return updated;
};

export const deleteUser = async (companyId: string, userId: string) => {
  const { rows } = await pool.query(
    'SELECT id, role FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
    [userId, companyId]
  );
  if (!rows.length) throw new NotFoundError('User');
  if (rows[0].role === 'admin') throw new ForbiddenError('Cannot delete admin users');

  await pool.query('UPDATE users SET deleted_at = NOW(), is_active = false WHERE id = $1', [userId]);
};

export const linkCustomer = async (companyId: string, userId: string, customerId: string) => {
  const userRes = await pool.query('SELECT id FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL', [userId, companyId]);
  if (!userRes.rows.length) throw new NotFoundError('User');

  const custRes = await pool.query('SELECT id FROM customers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL', [customerId, companyId]);
  if (!custRes.rows.length) throw new NotFoundError('Customer');

  await pool.query(
    `INSERT INTO user_customer_map (company_id, user_id, customer_id) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET customer_id = EXCLUDED.customer_id`,
    [companyId, userId, customerId]
  );
};

export const unlinkCustomer = async (companyId: string, userId: string) => {
  const userRes = await pool.query('SELECT id FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL', [userId, companyId]);
  if (!userRes.rows.length) throw new NotFoundError('User');

  await pool.query('DELETE FROM user_customer_map WHERE user_id = $1', [userId]);
};

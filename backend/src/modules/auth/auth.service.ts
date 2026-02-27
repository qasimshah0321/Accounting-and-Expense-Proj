import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, withTransaction } from '../../config/database';
import { config } from '../../config/env';
import { ensureDocumentSequences } from '../../services/documentNumberService';
import { UnauthorizedError, NotFoundError, ValidationError } from '../../utils/errors';

const signToken = (payload: object): string =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as any);

const signRefreshToken = (payload: object): string =>
  jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn } as any);

export const login = async (email: string, password: string) => {
  const { rows } = await pool.query(
    `SELECT u.*, c.name as company_name FROM users u
     JOIN companies c ON c.id = u.company_id
     WHERE u.email = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
    [email]
  );
  if (!rows.length) throw new UnauthorizedError('Invalid email or password');

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  await pool.query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

  const payload = {
    id: user.id,
    company_id: user.company_id,
    username: user.username,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
  };

  return {
    token: signToken(payload),
    refresh_token: signRefreshToken({ id: user.id }),
    user: { ...payload, company_name: user.company_name },
  };
};

export const register = async (data: {
  company_name: string;
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}) => {
  return withTransaction(async (client) => {
    // Check email uniqueness
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length) throw new ValidationError('Email already in use');

    // Create company
    const companyRes = await client.query(
      `INSERT INTO companies (name, currency, is_active) VALUES ($1, 'USD', true) RETURNING id`,
      [data.company_name]
    );
    const companyId = companyRes.rows[0].id;

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create admin user
    const userRes = await client.query(
      `INSERT INTO users (company_id, username, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 'admin', true) RETURNING id, company_id, username, email, role, first_name, last_name`,
      [companyId, data.username, data.email, passwordHash, data.first_name || null, data.last_name || null]
    );
    const user = userRes.rows[0];

    // Setup document sequences (use same transaction client)
    await ensureDocumentSequences(companyId, client);

    const token = signToken(user);
    return { token, user: { ...user, company_name: data.company_name } };
  });
};

export const getMe = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.company_id, u.username, u.email, u.role, u.first_name, u.last_name, u.is_active, u.last_login, c.name as company_name
     FROM users u JOIN companies c ON c.id = u.company_id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );
  if (!rows.length) throw new NotFoundError('User');
  return rows[0];
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!rows.length) throw new NotFoundError('User');

  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) throw new ValidationError('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
};

export const refreshToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { id: string };
    const { rows } = await pool.query(
      `SELECT id, company_id, username, email, role, first_name, last_name FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
      [decoded.id]
    );
    if (!rows.length) throw new UnauthorizedError('User not found');
    return { token: signToken(rows[0]) };
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
};

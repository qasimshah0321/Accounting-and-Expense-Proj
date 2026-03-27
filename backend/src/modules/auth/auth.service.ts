import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool, withTransaction } from '../../config/database';
import { config } from '../../config/env';
import { ensureDocumentSequences } from '../../services/documentNumberService';
import { seedDefaultPermissions } from '../role-permissions/role-permissions.service';
import { seedDefaultProducts } from '../products/products.service';
import { seedChartOfAccounts } from '../accounting/accounting.service';
import { UnauthorizedError, NotFoundError, ValidationError } from '../../utils/errors';

const signToken = (payload: object): string =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as any);

const signRefreshToken = (payload: object): string =>
  jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn } as any);

export const login = async (email: string, password: string) => {
  const [rows] = await pool.query(
    `SELECT u.*, c.name as company_name,
            ucm.customer_id as linked_customer_id,
            cust.name as linked_customer_name
     FROM users u
     JOIN companies c ON c.id = u.company_id
     LEFT JOIN user_customer_map ucm ON ucm.user_id = u.id
     LEFT JOIN customers cust ON cust.id = ucm.customer_id AND cust.deleted_at IS NULL
     WHERE u.email = ? AND u.is_active = true AND u.deleted_at IS NULL`,
    [email]
  );
  if (!(rows as any[]).length) throw new UnauthorizedError('Invalid email or password');

  const user = (rows as any[])[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  await pool.query(`UPDATE users SET last_login = NOW() WHERE id = ?`, [user.id]);

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
    user: { ...payload, company_name: user.company_name, linked_customer_id: user.linked_customer_id || null, linked_customer_name: user.linked_customer_name || null },
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
  // Core user+company creation in a short transaction
  const { token, user, companyId } = await withTransaction(async (client) => {
    // Check email uniqueness
    const [existing] = await client.query('SELECT id FROM users WHERE email = ?', [data.email]);
    if ((existing as any[]).length) throw new ValidationError('Email already in use');

    // Create company with explicit UUID (LAST_INSERT_ID() returns 0 for UUID PKs)
    const companyId = uuidv4();
    await client.query(
      `INSERT INTO companies (id, name, currency, is_active) VALUES (?, ?, 'USD', true)`,
      [companyId, data.company_name]
    );

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create admin user with explicit UUID
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, company_id, username, email, password_hash, first_name, last_name, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', true)`,
      [userId, companyId, data.username, data.email, passwordHash, data.first_name || null, data.last_name || null]
    );

    const [userDataRows] = await client.query(
      'SELECT id, company_id, username, email, role, first_name, last_name FROM users WHERE id = ?',
      [userId]
    );
    const user = (userDataRows as any[])[0];

    // Setup document sequences inside transaction (atomic with company creation)
    await ensureDocumentSequences(companyId, client);

    const token = signToken(user);
    return { token, user, companyId };
  });

  // Run heavy seeds AFTER transaction commits (non-blocking for login, fail-safe)
  Promise.all([
    seedDefaultPermissions(companyId, pool as any).catch(() => {}),
    seedDefaultProducts(companyId, pool as any).catch(() => {}),
    seedChartOfAccounts(companyId).catch(() => {}),
  ]);

  return { token, user: { ...user, company_name: data.company_name } };
};

export const getMe = async (userId: string) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.company_id, u.username, u.email, u.role, u.first_name, u.last_name, u.is_active, u.last_login, c.name as company_name,
            ucm.customer_id as linked_customer_id,
            cust.name as linked_customer_name
     FROM users u
     JOIN companies c ON c.id = u.company_id
     LEFT JOIN user_customer_map ucm ON ucm.user_id = u.id
     LEFT JOIN customers cust ON cust.id = ucm.customer_id AND cust.deleted_at IS NULL
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [userId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('User');
  return (rows as any[])[0];
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!(rows as any[]).length) throw new NotFoundError('User');

  const valid = await bcrypt.compare(currentPassword, (rows as any[])[0].password_hash);
  if (!valid) throw new ValidationError('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [newHash, userId]);
};

export const refreshToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { id: string };
    const [rows] = await pool.query(
      `SELECT id, company_id, username, email, role, first_name, last_name FROM users WHERE id = ? AND is_active = true AND deleted_at IS NULL`,
      [decoded.id]
    );
    if (!(rows as any[]).length) throw new UnauthorizedError('User not found');
    return { token: signToken((rows as any[])[0]) };
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
};

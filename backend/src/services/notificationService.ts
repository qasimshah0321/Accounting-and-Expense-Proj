import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';

export interface NotificationData {
  type?: string;
  id?: string;
  so_no?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Insert an in-app notification row for a single user.
 */
async function insertOne(
  companyId: string,
  userId: string,
  type: string,
  title: string,
  body: string,
  data: NotificationData = {}
): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (id, company_id, recipient_user_id, type, title, body, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), companyId, userId, type, title, body, JSON.stringify(data)]
  );
}

/**
 * Create an in-app notification for every admin / staff / salesperson in the company.
 * Fire-and-forget — errors are logged but not thrown.
 */
export const createForAdmins = async (
  companyId: string,
  type: string,
  title: string,
  body: string,
  data: NotificationData = {}
): Promise<void> => {
  try {
    const [rows] = await pool.query(
      `SELECT id FROM users WHERE company_id = ? AND role IN ('admin','staff','salesperson') AND is_active = 1`,
      [companyId]
    );
    const users = rows as any[];
    await Promise.all(users.map(u => insertOne(companyId, u.id, type, title, body, data)));
  } catch (err: any) {
    console.error('createForAdmins notification error:', err.message);
  }
};

/**
 * Create an in-app notification for every user linked to a specific customer.
 * Fire-and-forget — errors are logged but not thrown.
 */
export const createForCustomer = async (
  companyId: string,
  customerId: string,
  type: string,
  title: string,
  body: string,
  data: NotificationData = {}
): Promise<void> => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id FROM users u
       JOIN user_customer_map ucm ON ucm.user_id = u.id AND ucm.company_id = ?
       WHERE ucm.customer_id = ? AND u.is_active = 1`,
      [companyId, customerId]
    );
    const users = rows as any[];
    await Promise.all(users.map(u => insertOne(companyId, u.id, type, title, body, data)));
  } catch (err: any) {
    console.error('createForCustomer notification error:', err.message);
  }
};

/**
 * Fetch recent notifications for a user (unread first, then by date desc).
 */
export const getForUser = async (
  userId: string,
  companyId: string,
  limit = 30
): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT id, type, title, body, data, is_read, created_at
     FROM notifications
     WHERE recipient_user_id = ? AND company_id = ?
     ORDER BY is_read ASC, created_at DESC
     LIMIT ?`,
    [userId, companyId, limit]
  );
  return rows as any[];
};

/**
 * Count unread notifications for a user.
 */
export const getUnreadCount = async (userId: string, companyId: string): Promise<number> => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE recipient_user_id = ? AND company_id = ? AND is_read = 0`,
    [userId, companyId]
  );
  return (rows as any[])[0]?.cnt ?? 0;
};

/**
 * Mark a single notification as read.
 */
export const markRead = async (notificationId: string, userId: string): Promise<void> => {
  await pool.query(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_user_id = ?`,
    [notificationId, userId]
  );
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllRead = async (userId: string, companyId: string): Promise<void> => {
  await pool.query(
    `UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ? AND company_id = ? AND is_read = 0`,
    [userId, companyId]
  );
};

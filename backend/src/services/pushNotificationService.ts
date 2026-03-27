import webpush from 'web-push';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import { config } from '../config/env';

// Configure VAPID keys if present
if (config.vapid.publicKey && config.vapid.privateKey) {
  webpush.setVapidDetails(
    config.vapid.email,
    config.vapid.publicKey,
    config.vapid.privateKey
  );
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Save or update a push subscription for a user.
 * Upserts by endpoint — if the same browser re-subscribes, we update the record.
 */
export const saveSubscription = async (
  userId: string,
  companyId: string,
  userRole: string,
  linkedCustomerId: string | null,
  subscription: PushSubscriptionData
): Promise<void> => {
  // Check if subscription with this endpoint already exists
  const [existing] = await pool.query(
    'SELECT id FROM push_subscriptions WHERE endpoint = ? AND user_id = ?',
    [subscription.endpoint, userId]
  );

  if ((existing as any[]).length > 0) {
    // Update existing subscription (keys may have rotated)
    await pool.query(
      'UPDATE push_subscriptions SET p256dh = ?, auth = ?, user_role = ?, linked_customer_id = ?, updated_at = NOW() WHERE id = ?',
      [subscription.keys.p256dh, subscription.keys.auth, userRole, linkedCustomerId, (existing as any[])[0].id]
    );
  } else {
    // Insert new subscription
    await pool.query(
      `INSERT INTO push_subscriptions (id, company_id, user_id, user_role, linked_customer_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), companyId, userId, userRole, linkedCustomerId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );
  }
};

/**
 * Remove a push subscription by endpoint.
 */
export const removeSubscription = async (endpoint: string, userId: string): Promise<void> => {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?', [endpoint, userId]);
};

/**
 * Send a push notification to a single subscription.
 * Returns false if the subscription is expired/invalid (410 or 404), so we can clean it up.
 */
const sendToSubscription = async (sub: any, payload: string): Promise<boolean> => {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      payload
    );
    return true;
  } catch (err: any) {
    // 410 Gone or 404 means the subscription is no longer valid
    if (err.statusCode === 410 || err.statusCode === 404) {
      await pool.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
      console.log(`Removed expired push subscription ${sub.id}`);
      return false;
    }
    console.error(`Push send failed for subscription ${sub.id}:`, err.message);
    return false;
  }
};

/**
 * Notify all admin/staff users of a company.
 * Fire-and-forget: errors are logged but never thrown.
 */
export const notifyAdmins = async (
  companyId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    if (!config.vapid.publicKey || !config.vapid.privateKey) return;

    const [rows] = await pool.query(
      `SELECT id, endpoint, p256dh, auth FROM push_subscriptions
       WHERE company_id = ? AND user_role IN ('admin', 'staff', 'salesperson')`,
      [companyId]
    );

    const payload = JSON.stringify({ title, body, data: data || {} });
    const subs = rows as any[];

    await Promise.allSettled(subs.map((sub) => sendToSubscription(sub, payload)));
  } catch (err: any) {
    console.error('notifyAdmins error:', err.message);
  }
};

/**
 * Notify all subscriptions linked to a specific customer.
 * Fire-and-forget: errors are logged but never thrown.
 */
export const notifyCustomer = async (
  companyId: string,
  customerId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    if (!config.vapid.publicKey || !config.vapid.privateKey) return;

    const [rows] = await pool.query(
      `SELECT id, endpoint, p256dh, auth FROM push_subscriptions
       WHERE company_id = ? AND linked_customer_id = ?`,
      [companyId, customerId]
    );

    const payload = JSON.stringify({ title, body, data: data || {} });
    const subs = rows as any[];

    await Promise.allSettled(subs.map((sub) => sendToSubscription(sub, payload)));
  } catch (err: any) {
    console.error('notifyCustomer error:', err.message);
  }
};

/**
 * Notify a specific user (by user_id) across all their subscriptions.
 */
export const notifyUser = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    if (!config.vapid.publicKey || !config.vapid.privateKey) return;

    const [rows] = await pool.query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    const payload = JSON.stringify({ title, body, data: data || {} });
    const subs = rows as any[];

    await Promise.allSettled(subs.map((sub) => sendToSubscription(sub, payload)));
  } catch (err: any) {
    console.error('notifyUser error:', err.message);
  }
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { config } from '../../config/env';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';
import * as pushService from '../../services/pushNotificationService';
import { pool } from '../../config/database';

/**
 * GET /api/v1/push/vapid-public-key
 * Returns the VAPID public key so the frontend can subscribe.
 * No auth required — the key is public.
 */
export const getVapidPublicKey = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, { vapid_public_key: config.vapid.publicKey }, 'VAPID public key');
  } catch (err) { next(err); }
};

/**
 * POST /api/v1/push/subscribe
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 */
export const subscribe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new ValidationError('Invalid push subscription object');
    }

    const companyId = getCompanyId(req);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // If the user is a customer, look up their linked_customer_id
    let linkedCustomerId: string | null = null;
    if (userRole === 'customer') {
      const [mapRes] = await pool.query(
        'SELECT customer_id FROM user_customer_map WHERE user_id = ? AND company_id = ?',
        [userId, companyId]
      );
      if ((mapRes as any[]).length > 0) {
        linkedCustomerId = (mapRes as any[])[0].customer_id;
      }
    }

    await pushService.saveSubscription(userId, companyId, userRole, linkedCustomerId, subscription);
    sendSuccess(res, null, 'Push subscription saved', 201);
  } catch (err) { next(err); }
};

/**
 * DELETE /api/v1/push/unsubscribe
 * Body: { endpoint: '...' }
 */
export const unsubscribe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) throw new ValidationError('Endpoint is required');

    await pushService.removeSubscription(endpoint, req.user!.id);
    sendSuccess(res, null, 'Push subscription removed');
  } catch (err) { next(err); }
};

/**
 * POST /api/v1/push/expo-subscribe
 * Body: { expo_push_token: 'ExponentPushToken[...]' }
 * Saves (or updates) an Expo push token for the authenticated user.
 */
export const expoSubscribe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { expo_push_token } = req.body;
    if (!expo_push_token) throw new ValidationError('expo_push_token is required');

    const companyId = getCompanyId(req);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let linkedCustomerId: string | null = null;
    if (userRole === 'customer') {
      const [mapRes] = await pool.query(
        'SELECT customer_id FROM user_customer_map WHERE user_id = ? AND company_id = ?',
        [userId, companyId]
      );
      if ((mapRes as any[]).length > 0) linkedCustomerId = (mapRes as any[])[0].customer_id;
    }

    // Upsert: if a row for this user+token already exists update it, otherwise insert
    const [existing] = await pool.query(
      'SELECT id FROM push_subscriptions WHERE user_id=? AND expo_push_token=?',
      [userId, expo_push_token]
    );
    if ((existing as any[]).length === 0) {
      await pool.query(
        `INSERT INTO push_subscriptions (id, company_id, user_id, user_role, linked_customer_id, expo_push_token, endpoint, p256dh, auth)
         VALUES (UUID(), ?, ?, ?, ?, ?, '', '', '')`,
        [companyId, userId, userRole, linkedCustomerId, expo_push_token]
      );
    } else {
      await pool.query(
        'UPDATE push_subscriptions SET expo_push_token=?, updated_at=NOW() WHERE user_id=? AND expo_push_token=?',
        [expo_push_token, userId, expo_push_token]
      );
    }

    sendSuccess(res, null, 'Expo push token saved', 201);
  } catch (err) { next(err); }
};

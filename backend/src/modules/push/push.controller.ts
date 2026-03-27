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

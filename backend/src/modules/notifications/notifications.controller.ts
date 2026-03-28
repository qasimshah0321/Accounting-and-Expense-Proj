import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess } from '../../utils/response';
import { getCompanyId } from '../../middleware/multiTenant';
import * as notifService from '../../services/notificationService';

/** GET /api/v1/notifications */
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId    = req.user!.id;
    const companyId = getCompanyId(req);
    const limit     = Math.min(parseInt(req.query.limit as string) || 30, 100);

    const [notifications, unreadCount] = await Promise.all([
      notifService.getForUser(userId, companyId, limit),
      notifService.getUnreadCount(userId, companyId),
    ]);

    sendSuccess(res, { notifications, unread_count: unreadCount });
  } catch (err) { next(err); }
};

/** PUT /api/v1/notifications/read-all */
export const readAll = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId    = req.user!.id;
    const companyId = getCompanyId(req);
    await notifService.markAllRead(userId, companyId);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
};

/** PUT /api/v1/notifications/:id/read */
export const readOne = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notifService.markRead(req.params.id, req.user!.id);
    sendSuccess(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
};

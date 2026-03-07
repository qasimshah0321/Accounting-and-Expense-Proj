import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './role-permissions.service';
import { sendSuccess } from '../../utils/response';
import { getCompanyId } from '../../middleware/multiTenant';

export const getMyMenus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getMyMenus(getCompanyId(req), req.user!.role);
    sendSuccess(res, result, 'Menus retrieved');
  } catch (err) { next(err); }
};

export const getAllPermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await service.getAllPermissions(getCompanyId(req));
    sendSuccess(res, rows, 'Permissions retrieved');
  } catch (err) { next(err); }
};

export const updatePermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates = req.body;
    if (!Array.isArray(updates)) {
      res.status(400).json({ error: { message: 'Body must be an array of permission updates' } });
      return;
    }
    await service.upsertPermissions(getCompanyId(req), updates);
    sendSuccess(res, null, 'Permissions updated');
  } catch (err) { next(err); }
};

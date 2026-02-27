import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './ship-via.service';
import { createShipViaSchema, updateShipViaSchema } from './ship-via.validation';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.listShipVia(getCompanyId(req), { is_active: req.query.is_active as string }), 'Carriers retrieved'); } catch (err) { next(err); }
};
export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getShipViaById(getCompanyId(req), req.params.id), 'Carrier retrieved'); } catch (err) { next(err); }
};
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createShipViaSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createShipVia(getCompanyId(req), req.user!.id, parsed.data), 'Carrier created', 201);
  } catch (err) { next(err); }
};
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateShipViaSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateShipVia(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'Carrier updated');
  } catch (err) { next(err); }
};
export const deleteShipVia = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.deleteShipVia(getCompanyId(req), req.params.id); sendSuccess(res, null, 'Carrier deleted'); } catch (err) { next(err); }
};
export const toggleActive = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.toggleActive(getCompanyId(req), req.params.id), 'Status toggled'); } catch (err) { next(err); }
};

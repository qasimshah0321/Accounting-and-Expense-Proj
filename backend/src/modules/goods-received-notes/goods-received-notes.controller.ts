import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './goods-received-notes.service';
import {
  createGRNSchema, updateGRNSchema, updateStatusSchema,
  receiveGoodsSchema, convertToBillSchema,
} from './goods-received-notes.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

export const peekNextNumber = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, { next_number: await service.peekNextGRNNumber(getCompanyId(req)) }, 'Next GRN number');
  } catch (err) { next(err); }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, vendor_id, purchase_order_id, search } = req.query as Record<string, string>;
    const result = await service.listGRNs(getCompanyId(req), { page, limit, offset, status, vendor_id, purchase_order_id, search });
    sendPaginated(res, result.grns, result.pagination, 'grns', 'GRNs retrieved');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getGRNById(getCompanyId(req), req.params.id), 'GRN retrieved');
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createGRNSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createGRN(getCompanyId(req), req.user!.id, parsed.data), 'GRN created', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateGRNSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateGRN(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'GRN updated');
  } catch (err) { next(err); }
};

export const deleteGRN = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteGRN(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'GRN deleted');
  } catch (err) { next(err); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(
      res,
      await service.updateStatus(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data.status, parsed.data.reason),
      'Status updated'
    );
  } catch (err) { next(err); }
};

export const receiveGoods = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = receiveGoodsSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(
      res,
      await service.receiveGoods(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data),
      'Goods received and inventory updated'
    );
  } catch (err) { next(err); }
};

export const convertToBill = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = convertToBillSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(
      res,
      await service.convertToBill(getCompanyId(req), req.params.id, req.user!.id, parsed.data),
      'Bill created from GRN successfully'
    );
  } catch (err) { next(err); }
};

export const getTracking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getTracking(getCompanyId(req), req.params.id), 'Tracking info retrieved');
  } catch (err) { next(err); }
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './estimates.service';
import { createEstimateSchema, updateEstimateSchema, updateStatusSchema, convertToSOSchema } from './estimates.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, customer_id, search, date_from, date_to } = req.query as Record<string, string>;
    const result = await service.listEstimates(getCompanyId(req), { page, limit, offset, status, customer_id, search, date_from, date_to });
    sendPaginated(res, result.estimates, result.pagination, 'estimates', 'Estimates retrieved successfully');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getEstimateById(getCompanyId(req), req.params.id), 'Estimate retrieved');
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createEstimateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const result = await service.createEstimate(getCompanyId(req), req.user!.id, getUserName(req), parsed.data);
    sendSuccess(res, result, 'Estimate created successfully', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateEstimateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const result = await service.updateEstimate(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data);
    sendSuccess(res, result, 'Estimate updated successfully');
  } catch (err) { next(err); }
};

export const deleteEstimate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteEstimate(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Estimate deleted successfully');
  } catch (err) { next(err); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const result = await service.updateStatus(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data.status, parsed.data.reason);
    sendSuccess(res, result, 'Estimate status updated');
  } catch (err) { next(err); }
};

export const convertToSalesOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = convertToSOSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const result = await service.convertToSalesOrder(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data);
    sendSuccess(res, result, 'Estimate converted to Sales Order successfully');
  } catch (err) { next(err); }
};

export const duplicate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.duplicateEstimate(getCompanyId(req), req.params.id, req.user!.id, getUserName(req));
    sendSuccess(res, result, 'Estimate duplicated successfully', 201);
  } catch (err) { next(err); }
};

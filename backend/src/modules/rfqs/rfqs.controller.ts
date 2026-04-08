import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './rfqs.service';
import { createRFQSchema, updateRFQSchema, updateStatusSchema, convertToPOSchema } from './rfqs.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

export const getNextNumber = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, { rfq_no: await service.peekNextRFQNumber(getCompanyId(req)) }, 'Next RFQ number'); } catch (err) { next(err); }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, vendor_id, search } = req.query as Record<string, string>;
    const result = await service.listRFQs(getCompanyId(req), { page, limit, offset, status, vendor_id, search });
    sendPaginated(res, result.rfqs, result.pagination, 'rfqs', 'RFQs retrieved successfully');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getRFQById(getCompanyId(req), req.params.id), 'RFQ retrieved'); } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createRFQSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const result = await service.createRFQ(getCompanyId(req), req.user!.id, getUserName(req), parsed.data);
    sendSuccess(res, result, 'RFQ created successfully', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateRFQSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const result = await service.updateRFQ(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data);
    sendSuccess(res, result, 'RFQ updated successfully');
  } catch (err) { next(err); }
};

export const deleteRFQ = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteRFQ(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'RFQ deleted successfully');
  } catch (err) { next(err); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const result = await service.updateStatus(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data.status);
    sendSuccess(res, result, 'RFQ status updated');
  } catch (err) { next(err); }
};

export const convertToPO = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = convertToPOSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const result = await service.convertToPO(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data);
    sendSuccess(res, result, 'RFQ converted to Purchase Order successfully');
  } catch (err) { next(err); }
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';
import { createRecurringSchema, updateRecurringSchema } from './recurring.validation';
import * as service from './recurring.service';

export const listRecurring = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.listRecurring(getCompanyId(req));
    sendSuccess(res, data, 'Recurring documents retrieved');
  } catch (err) { next(err); }
};

export const createRecurring = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createRecurringSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const data = await service.createRecurring(getCompanyId(req), req.user!.id, parsed.data);
    sendSuccess(res, data, 'Recurring document created', 201);
  } catch (err) { next(err); }
};

export const updateRecurring = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateRecurringSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const data = await service.updateRecurring(getCompanyId(req), req.params.id, parsed.data);
    sendSuccess(res, data, 'Recurring document updated');
  } catch (err) { next(err); }
};

export const deleteRecurring = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteRecurring(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Recurring document deleted');
  } catch (err) { next(err); }
};

export const generateDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.generateDocument(getCompanyId(req), req.user!.id, req.params.id);
    sendSuccess(res, result, 'Document generated successfully');
  } catch (err) { next(err); }
};

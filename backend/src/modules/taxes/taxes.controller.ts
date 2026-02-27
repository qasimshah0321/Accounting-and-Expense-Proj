import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './taxes.service';
import { createTaxSchema, updateTaxSchema } from './taxes.validation';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.listTaxes(getCompanyId(req), { is_active: req.query.is_active as string }), 'Taxes retrieved');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getTaxById(getCompanyId(req), req.params.id), 'Tax retrieved');
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createTaxSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createTax(getCompanyId(req), req.user!.id, parsed.data), 'Tax created', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateTaxSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateTax(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'Tax updated');
  } catch (err) { next(err); }
};

export const deleteTax = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteTax(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Tax deleted');
  } catch (err) { next(err); }
};

export const toggleActive = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.toggleActive(getCompanyId(req), req.params.id), 'Tax status toggled');
  } catch (err) { next(err); }
};

export const setDefault = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.setDefault(getCompanyId(req), req.params.id), 'Default tax set');
  } catch (err) { next(err); }
};

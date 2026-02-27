import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './inventory.service';
import { adjustStockSchema, transferStockSchema, createLocationSchema, updateLocationSchema } from './inventory.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';

export const listTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { product_id, transaction_type, date_from, date_to } = req.query as Record<string, string>;
    const result = await service.listTransactions(getCompanyId(req), { page, limit, offset, product_id, transaction_type, date_from, date_to });
    sendPaginated(res, result.transactions, result.pagination, 'inventory_transactions');
  } catch (err) { next(err); }
};

export const adjustStock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = adjustStockSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.adjustStock(getCompanyId(req), req.user!.id, parsed.data), 'Stock adjusted', 201);
  } catch (err) { next(err); }
};

export const transferStock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = transferStockSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.transferStock(getCompanyId(req), req.user!.id, parsed.data), 'Stock transferred', 201);
  } catch (err) { next(err); }
};

export const listLocations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.listLocations(getCompanyId(req)), 'Locations retrieved'); } catch (err) { next(err); }
};

export const createLocation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createLocationSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createLocation(getCompanyId(req), req.user!.id, parsed.data), 'Location created', 201);
  } catch (err) { next(err); }
};

export const updateLocation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateLocation(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'Location updated');
  } catch (err) { next(err); }
};

export const deleteLocation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteLocation(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Location deleted');
  } catch (err) { next(err); }
};

export const getStockByLocation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getStockByLocation(getCompanyId(req)), 'Stock by location retrieved'); } catch (err) { next(err); }
};

export const getLowStockReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getLowStockReport(getCompanyId(req)), 'Low stock report retrieved'); } catch (err) { next(err); }
};

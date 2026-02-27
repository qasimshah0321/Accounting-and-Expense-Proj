import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './products.service';
import { createProductSchema, updateProductSchema, adjustStockSchema } from './products.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, product_type, category, is_active, is_for_sale, is_for_purchase } = req.query as Record<string, string>;
    const result = await service.listProducts(getCompanyId(req), { page, limit, offset, search, product_type, category, is_active, is_for_sale, is_for_purchase });
    sendPaginated(res, result.products, result.pagination, 'products');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getProductById(getCompanyId(req), req.params.id), 'Product retrieved');
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createProduct(getCompanyId(req), req.user!.id, parsed.data), 'Product created', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateProduct(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'Product updated');
  } catch (err) { next(err); }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteProduct(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Product deleted');
  } catch (err) { next(err); }
};

export const getStockLevels = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getStockLevels(getCompanyId(req), req.params.id), 'Stock levels retrieved');
  } catch (err) { next(err); }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pagination = getPagination(req);
    const result = await service.getTransactionHistory(getCompanyId(req), req.params.id, pagination);
    sendPaginated(res, result.transactions, result.pagination, 'transactions');
  } catch (err) { next(err); }
};

export const adjustStock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = adjustStockSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.adjustStock(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'Stock adjusted');
  } catch (err) { next(err); }
};

export const getLowStock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getLowStockProducts(getCompanyId(req)), 'Low stock products retrieved');
  } catch (err) { next(err); }
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './purchase-orders.service';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema, updateStatusSchema } from './purchase-orders.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

export const getNextNumber = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, { purchase_order_no: await service.peekNextPurchaseOrderNumber(getCompanyId(req)) }, 'Next purchase order number'); } catch (err) { next(err); }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, vendor_id, search, date_from, date_to } = req.query as Record<string, string>;
    const result = await service.listPurchaseOrders(getCompanyId(req), { page, limit, offset, status, vendor_id, search, date_from, date_to });
    sendPaginated(res, result.purchase_orders, result.pagination, 'purchase_orders', 'Purchase Orders retrieved');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getPurchaseOrderById(getCompanyId(req), req.params.id), 'Purchase Order retrieved'); } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createPurchaseOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createPurchaseOrder(getCompanyId(req), req.user!.id, getUserName(req), parsed.data), 'Purchase Order created', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updatePurchaseOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updatePurchaseOrder(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Purchase Order updated');
  } catch (err) { next(err); }
};

export const deletePurchaseOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.deletePurchaseOrder(getCompanyId(req), req.params.id); sendSuccess(res, null, 'Purchase Order deleted'); } catch (err) { next(err); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateStatus(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data.status, parsed.data.reason), 'Status updated');
  } catch (err) { next(err); }
};

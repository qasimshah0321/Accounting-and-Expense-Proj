import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './sales-orders.service';
import { createSalesOrderSchema, updateSalesOrderSchema, updateStatusSchema, convertToDNSchema, convertToInvoiceSchema } from './sales-orders.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

export const getNextNumber = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, { sales_order_no: await service.peekNextSalesOrderNumber(getCompanyId(req)) }, 'Next sales order number'); } catch (err) { next(err); }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, fulfillment_status, customer_id, search, date_from, date_to } = req.query as Record<string, string>;
    const result = await service.listSalesOrders(getCompanyId(req), { page, limit, offset, status, fulfillment_status, customer_id, search, date_from, date_to });
    sendPaginated(res, result.sales_orders, result.pagination, 'sales_orders', 'Sales Orders retrieved');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getSalesOrderById(getCompanyId(req), req.params.id), 'Sales Order retrieved'); } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createSalesOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createSalesOrder(getCompanyId(req), req.user!.id, getUserName(req), parsed.data), 'Sales Order created', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateSalesOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateSalesOrder(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Sales Order updated');
  } catch (err) { next(err); }
};

export const deleteSalesOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.deleteSalesOrder(getCompanyId(req), req.params.id); sendSuccess(res, null, 'Sales Order deleted'); } catch (err) { next(err); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateStatus(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data.status, parsed.data.reason), 'Status updated');
  } catch (err) { next(err); }
};

export const convertToDeliveryNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = convertToDNSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.convertToDeliveryNote(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Delivery Note created successfully');
  } catch (err) { next(err); }
};

export const convertToInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = convertToInvoiceSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.convertToInvoice(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Invoice created successfully');
  } catch (err) { next(err); }
};

export const getFulfillmentStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getFulfillmentStatus(getCompanyId(req), req.params.id), 'Fulfillment status retrieved'); } catch (err) { next(err); }
};

export const getDeliveryNotes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getDeliveryNotes(getCompanyId(req), req.params.id, getPagination(req));
    sendPaginated(res, result.delivery_notes, result.pagination, 'delivery_notes');
  } catch (err) { next(err); }
};

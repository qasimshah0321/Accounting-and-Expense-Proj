import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './delivery-notes.service';
import { createDeliveryNoteSchema, updateDeliveryNoteSchema, updateStatusSchema, shipSchema, convertToInvoiceSchema } from './delivery-notes.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, customer_id, sales_order_id, search } = req.query as Record<string, string>;
    const result = await service.listDeliveryNotes(getCompanyId(req), { page, limit, offset, status, customer_id, sales_order_id, search });
    sendPaginated(res, result.delivery_notes, result.pagination, 'delivery_notes', 'Delivery Notes retrieved');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getDeliveryNoteById(getCompanyId(req), req.params.id), 'Delivery Note retrieved'); } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createDeliveryNoteSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createDeliveryNote(getCompanyId(req), req.user!.id, getUserName(req), parsed.data), 'Delivery Note created', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateDeliveryNoteSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateDeliveryNote(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Delivery Note updated');
  } catch (err) { next(err); }
};

export const deleteDeliveryNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.deleteDeliveryNote(getCompanyId(req), req.params.id); sendSuccess(res, null, 'Delivery Note deleted'); } catch (err) { next(err); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateStatus(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data.status, parsed.data.reason), 'Status updated');
  } catch (err) { next(err); }
};

export const ship = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = shipSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.shipDeliveryNote(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Delivery Note shipped and inventory deducted successfully');
  } catch (err) { next(err); }
};

export const markDelivered = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.markDelivered(getCompanyId(req), req.params.id, req.user!.id, getUserName(req)), 'Delivery Note marked as delivered'); } catch (err) { next(err); }
};

export const convertToInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = convertToInvoiceSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.convertToInvoice(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Invoice created from Delivery Note successfully');
  } catch (err) { next(err); }
};

export const getTracking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getTracking(getCompanyId(req), req.params.id), 'Tracking info retrieved'); } catch (err) { next(err); }
};

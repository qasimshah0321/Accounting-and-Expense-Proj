import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './invoices.service';
import { createInvoiceSchema, updateInvoiceSchema, updateStatusSchema, recordPaymentSchema } from './invoices.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, payment_status, customer_id, overdue, date_from, date_to, search } = req.query as Record<string, string>;
    const result = await service.listInvoices(getCompanyId(req), { page, limit, offset, status, payment_status, customer_id, overdue, date_from, date_to, search });
    sendPaginated(res, result.invoices, result.pagination, 'invoices', 'Invoices retrieved');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getInvoiceById(getCompanyId(req), req.params.id), 'Invoice retrieved'); } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createInvoice(getCompanyId(req), req.user!.id, getUserName(req), parsed.data), 'Invoice created', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateInvoiceSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateInvoice(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Invoice updated');
  } catch (err) { next(err); }
};

export const deleteInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.deleteInvoice(getCompanyId(req), req.params.id); sendSuccess(res, null, 'Invoice deleted'); } catch (err) { next(err); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateStatus(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data.status, parsed.data.reason), 'Status updated');
  } catch (err) { next(err); }
};

export const recordPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = recordPaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.recordPayment(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Payment recorded successfully');
  } catch (err) { next(err); }
};

export const getPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getInvoicePayments(getCompanyId(req), req.params.id, getPagination(req));
    sendPaginated(res, result.payments, result.pagination, 'payments');
  } catch (err) { next(err); }
};

export const getOverdue = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pagination = getPagination(req);
    const result = await service.getOverdueInvoices(getCompanyId(req), pagination);
    sendPaginated(res, result.invoices, result.pagination, 'invoices', 'Overdue invoices retrieved');
  } catch (err) { next(err); }
};

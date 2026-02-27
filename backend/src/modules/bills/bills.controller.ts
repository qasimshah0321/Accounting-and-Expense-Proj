import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './bills.service';
import { createBillSchema, updateBillSchema, updateStatusSchema, recordPaymentSchema } from './bills.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, payment_status, vendor_id, overdue, search } = req.query as Record<string, string>;
    const result = await service.listBills(getCompanyId(req), { page, limit, offset, status, payment_status, vendor_id, overdue, search });
    sendPaginated(res, result.bills, result.pagination, 'bills', 'Bills retrieved');
  } catch (err) { next(err); }
};
export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getBillById(getCompanyId(req), req.params.id), 'Bill retrieved'); } catch (err) { next(err); }
};
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createBillSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createBill(getCompanyId(req), req.user!.id, parsed.data), 'Bill created', 201);
  } catch (err) { next(err); }
};
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateBillSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateBill(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'Bill updated');
  } catch (err) { next(err); }
};
export const deleteBill = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.deleteBill(getCompanyId(req), req.params.id); sendSuccess(res, null, 'Bill deleted'); } catch (err) { next(err); }
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
    sendSuccess(res, await service.recordPayment(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Payment recorded');
  } catch (err) { next(err); }
};
export const getPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getBillPayments(getCompanyId(req), req.params.id, getPagination(req));
    sendPaginated(res, result.payments, result.pagination, 'payments');
  } catch (err) { next(err); }
};
export const getOverdue = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getOverdueBills(getCompanyId(req), getPagination(req));
    sendPaginated(res, result.bills, result.pagination, 'bills', 'Overdue bills retrieved');
  } catch (err) { next(err); }
};

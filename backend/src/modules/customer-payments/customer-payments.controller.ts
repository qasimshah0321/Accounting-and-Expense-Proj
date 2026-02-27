import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './customer-payments.service';
import { createCustomerPaymentSchema, allocatePaymentSchema } from './customer-payments.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { customer_id, date_from, date_to } = req.query as Record<string, string>;
    const result = await service.listCustomerPayments(getCompanyId(req), { page, limit, offset, customer_id, date_from, date_to });
    sendPaginated(res, result.payments, result.pagination, 'customer_payments');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getCustomerPaymentById(getCompanyId(req), req.params.id), 'Payment retrieved'); } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createCustomerPaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createCustomerPayment(getCompanyId(req), req.user!.id, parsed.data), 'Payment recorded', 201);
  } catch (err) { next(err); }
};

export const getUnallocated = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customer_id } = req.query as Record<string, string>;
    sendSuccess(res, await service.getUnallocatedPayments(getCompanyId(req), customer_id), 'Unallocated payments retrieved');
  } catch (err) { next(err); }
};

export const allocate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = allocatePaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.allocatePayment(getCompanyId(req), req.params.id, parsed.data.invoice_id, parsed.data.amount), 'Payment allocated');
  } catch (err) { next(err); }
};

export const deletePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteCustomerPayment(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Payment deleted');
  } catch (err) { next(err); }
};

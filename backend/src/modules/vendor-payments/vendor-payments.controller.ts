import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './vendor-payments.service';
import { createVendorPaymentSchema, allocateVendorPaymentSchema } from './vendor-payments.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { vendor_id, date_from, date_to } = req.query as Record<string, string>;
    const result = await service.listVendorPayments(getCompanyId(req), { page, limit, offset, vendor_id, date_from, date_to });
    sendPaginated(res, result.payments, result.pagination, 'vendor_payments');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getVendorPaymentById(getCompanyId(req), req.params.id), 'Payment retrieved'); } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createVendorPaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createVendorPayment(getCompanyId(req), req.user!.id, parsed.data), 'Payment recorded', 201);
  } catch (err) { next(err); }
};

export const getUnallocated = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vendor_id } = req.query as Record<string, string>;
    sendSuccess(res, await service.getUnallocatedVendorPayments(getCompanyId(req), vendor_id), 'Unallocated payments retrieved');
  } catch (err) { next(err); }
};

export const allocate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = allocateVendorPaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.allocateVendorPayment(getCompanyId(req), req.params.id, parsed.data.bill_id, parsed.data.amount), 'Payment allocated');
  } catch (err) { next(err); }
};

export const deletePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteVendorPayment(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Payment deleted');
  } catch (err) { next(err); }
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './vendors.service';
import { createVendorSchema, updateVendorSchema } from './vendors.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, is_active, vendor_type, sort_by, sort_order } = req.query as Record<string, string>;
    const result = await service.listVendors(getCompanyId(req), { page, limit, offset, search, is_active, vendor_type, sort_by, sort_order });
    sendPaginated(res, result.vendors, result.pagination, 'vendors', 'Vendors retrieved successfully');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vendor = await service.getVendorById(getCompanyId(req), req.params.id);
    sendSuccess(res, vendor, 'Vendor retrieved');
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createVendorSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const vendor = await service.createVendor(getCompanyId(req), req.user!.id, parsed.data);
    sendSuccess(res, vendor, 'Vendor created successfully', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateVendorSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const vendor = await service.updateVendor(getCompanyId(req), req.params.id, req.user!.id, parsed.data);
    sendSuccess(res, vendor, 'Vendor updated successfully');
  } catch (err) { next(err); }
};

export const deleteVendor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteVendor(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Vendor deleted successfully');
  } catch (err) { next(err); }
};

export const getBills = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getVendorBills(getCompanyId(req), req.params.id, getPagination(req));
    sendPaginated(res, result.bills, result.pagination, 'bills');
  } catch (err) { next(err); }
};

export const getPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getVendorPayments(getCompanyId(req), req.params.id, getPagination(req));
    sendPaginated(res, result.payments, result.pagination, 'payments');
  } catch (err) { next(err); }
};

export const getOutstandingBalance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const balance = await service.getVendorOutstandingBalance(getCompanyId(req), req.params.id);
    sendSuccess(res, balance, 'Outstanding balance retrieved');
  } catch (err) { next(err); }
};

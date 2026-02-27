import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './customers.service';
import { createCustomerSchema, updateCustomerSchema } from './customers.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = getCompanyId(req);
    const { page, limit, offset } = getPagination(req);
    const { search, is_active, customer_type, sort_by, sort_order } = req.query as Record<string, string>;
    const result = await service.listCustomers(companyId, { page, limit, offset, search, is_active, customer_type, sort_by, sort_order });
    sendPaginated(res, result.customers, result.pagination, 'customers', 'Customers retrieved successfully');
  } catch (err) { next(err); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await service.getCustomerById(getCompanyId(req), req.params.id);
    sendSuccess(res, customer, 'Customer retrieved');
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const customer = await service.createCustomer(getCompanyId(req), req.user!.id, parsed.data);
    sendSuccess(res, customer, 'Customer created successfully', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateCustomerSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const customer = await service.updateCustomer(getCompanyId(req), req.params.id, req.user!.id, parsed.data);
    sendSuccess(res, customer, 'Customer updated successfully');
  } catch (err) { next(err); }
};

export const deleteCustomer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteCustomer(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Customer deleted successfully');
  } catch (err) { next(err); }
};

export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pagination = getPagination(req);
    const result = await service.getCustomerInvoices(getCompanyId(req), req.params.id, pagination);
    sendPaginated(res, result.invoices, result.pagination, 'invoices');
  } catch (err) { next(err); }
};

export const getSalesOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pagination = getPagination(req);
    const result = await service.getCustomerSalesOrders(getCompanyId(req), req.params.id, pagination);
    sendPaginated(res, result.sales_orders, result.pagination, 'sales_orders');
  } catch (err) { next(err); }
};

export const getOutstandingBalance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const balance = await service.getCustomerOutstandingBalance(getCompanyId(req), req.params.id);
    sendSuccess(res, balance, 'Outstanding balance retrieved');
  } catch (err) { next(err); }
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './expenses.service';
import { createExpenseSchema, updateExpenseSchema, updateStatusSchema, markPaidSchema } from './expenses.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, vendor_id, expense_category, date_from, date_to } = req.query as Record<string, string>;
    const result = await service.listExpenses(getCompanyId(req), { page, limit, offset, status, vendor_id, expense_category, date_from, date_to });
    sendPaginated(res, result.expenses, result.pagination, 'expenses');
  } catch (err) { next(err); }
};
export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getExpenseById(getCompanyId(req), req.params.id), 'Expense retrieved'); } catch (err) { next(err); }
};
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createExpense(getCompanyId(req), req.user!.id, parsed.data), 'Expense created', 201);
  } catch (err) { next(err); }
};
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateExpense(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'Expense updated');
  } catch (err) { next(err); }
};
export const deleteExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.deleteExpense(getCompanyId(req), req.params.id); sendSuccess(res, null, 'Expense deleted'); } catch (err) { next(err); }
};
export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateStatus(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data.status, parsed.data.reason), 'Status updated');
  } catch (err) { next(err); }
};
export const approveExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.approveExpense(getCompanyId(req), req.params.id, req.user!.id, getUserName(req)), 'Expense approved'); } catch (err) { next(err); }
};
export const markPaid = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = markPaidSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.markPaid(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'Expense marked as paid');
  } catch (err) { next(err); }
};

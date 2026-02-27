import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './reports.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { getCompanyId } from '../../middleware/multiTenant';

const getDateRange = (req: AuthRequest) => {
  const { date_from, date_to } = req.query as Record<string, string>;
  if (!date_from || !date_to) throw new ValidationError('date_from and date_to are required');
  return { dateFrom: date_from, dateTo: date_to };
};

export const salesSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    sendSuccess(res, await service.getSalesSummary(getCompanyId(req), dateFrom, dateTo), 'Sales summary retrieved');
  } catch (err) { next(err); }
};

export const expenseSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    sendSuccess(res, await service.getExpenseSummary(getCompanyId(req), dateFrom, dateTo), 'Expense summary retrieved');
  } catch (err) { next(err); }
};

export const profitLoss = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    sendSuccess(res, await service.getProfitLoss(getCompanyId(req), dateFrom, dateTo), 'Profit & loss retrieved');
  } catch (err) { next(err); }
};

export const receivablesAgeing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getReceivablesAgeing(getCompanyId(req)), 'Receivables ageing retrieved'); } catch (err) { next(err); }
};

export const payablesAgeing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getPayablesAgeing(getCompanyId(req)), 'Payables ageing retrieved'); } catch (err) { next(err); }
};

export const dashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getDashboard(getCompanyId(req)), 'Dashboard data retrieved'); } catch (err) { next(err); }
};

export const inventoryValuation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getInventoryValuation(getCompanyId(req)), 'Inventory valuation retrieved'); } catch (err) { next(err); }
};

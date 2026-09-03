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

// Full Profit & Loss (Income Statement). Accepts both date_from/date_to (legacy) and
// startDate/endDate (the new preferred form) so existing frontend code does not break.
export const profitAndLoss = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    const startDate = q.startDate || q.date_from || q.start_date;
    const endDate   = q.endDate   || q.date_to   || q.end_date;
    if (!startDate || !endDate) {
      throw new ValidationError('startDate and endDate are required (YYYY-MM-DD)');
    }
    sendSuccess(
      res,
      await service.getProfitAndLoss(getCompanyId(req), startDate, endDate),
      'Profit & loss statement retrieved'
    );
  } catch (err) { next(err); }
};

export const receivablesAgeing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { as_of } = req.query as Record<string, string>;
    sendSuccess(res, await service.getReceivablesAgeing(getCompanyId(req), as_of), 'Receivables ageing retrieved');
  } catch (err) { next(err); }
};

export const payablesAgeing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { as_of } = req.query as Record<string, string>;
    sendSuccess(res, await service.getPayablesAgeing(getCompanyId(req), as_of), 'Payables ageing retrieved');
  } catch (err) { next(err); }
};

export const dashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getDashboard(getCompanyId(req)), 'Dashboard data retrieved'); } catch (err) { next(err); }
};

export const inventoryValuation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getInventoryValuation(getCompanyId(req)), 'Inventory valuation retrieved'); } catch (err) { next(err); }
};

export const taxSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    sendSuccess(res, await service.getTaxSummary(getCompanyId(req), dateFrom, dateTo), 'Tax summary retrieved');
  } catch (err) { next(err); }
};

export const balanceSheet = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { as_of } = req.query as Record<string, string>;
    sendSuccess(res, await service.getBalanceSheet(getCompanyId(req), as_of), 'Balance sheet retrieved');
  } catch (err) { next(err); }
};

export const cashFlow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    sendSuccess(res, await service.getCashFlow(getCompanyId(req), dateFrom, dateTo), 'Cash flow statement retrieved');
  } catch (err) { next(err); }
};

// ── Enhanced Financial Statement Reports ────────────────────────────────────

export const profitLossComparison = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    const startDate   = q.startDate || q.date_from || q.start_date;
    const endDate     = q.endDate   || q.date_to   || q.end_date;
    const compareMode = (q.compareMode || q.compare_mode || 'prior_period') as 'prior_period' | 'prior_year';
    if (!startDate || !endDate) throw new ValidationError('startDate and endDate are required');
    sendSuccess(res, await service.getProfitLossComparison(getCompanyId(req), startDate, endDate, compareMode), 'P&L comparison retrieved');
  } catch (err) { next(err); }
};

export const balanceSheetComparison = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date1, date2 } = req.query as Record<string, string>;
    if (!date1 || !date2) throw new ValidationError('date1 and date2 are required');
    sendSuccess(res, await service.getBalanceSheetComparison(getCompanyId(req), date1, date2), 'Balance sheet comparison retrieved');
  } catch (err) { next(err); }
};

export const equityChanges = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    sendSuccess(res, await service.getEquityChanges(getCompanyId(req), dateFrom, dateTo), 'Equity changes retrieved');
  } catch (err) { next(err); }
};

export const cashFlowForecast = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getCashFlowForecast(getCompanyId(req)), 'Cash flow forecast retrieved');
  } catch (err) { next(err); }
};

export const profitLossByDepartment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    const startDate = q.startDate || q.date_from || q.start_date;
    const endDate   = q.endDate   || q.date_to   || q.end_date;
    if (!startDate || !endDate) throw new ValidationError('startDate and endDate are required');
    sendSuccess(res, await service.getProfitLossByDepartment(getCompanyId(req), startDate, endDate), 'P&L by department retrieved');
  } catch (err) { next(err); }
};

export const budgetVsActual = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    const startDate      = q.startDate || q.date_from || q.start_date;
    const endDate        = q.endDate   || q.date_to   || q.end_date;
    const budgetPeriodId = q.budget_period_id || q.budgetPeriodId || undefined;
    if (!startDate || !endDate) throw new ValidationError('startDate and endDate are required');
    sendSuccess(res, await service.getBudgetVsActual(getCompanyId(req), startDate, endDate, budgetPeriodId), 'Budget vs actual retrieved');
  } catch (err) { next(err); }
};

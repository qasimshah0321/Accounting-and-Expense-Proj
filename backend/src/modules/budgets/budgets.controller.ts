import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './budgets.service';
import { sendSuccess } from '../../utils/response';
import { getCompanyId, getUserId } from '../../middleware/multiTenant';

export const listPeriods = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const periods = await service.listBudgetPeriods(getCompanyId(req));
    sendSuccess(res, periods, 'Budget periods retrieved');
  } catch (err) { next(err); }
};

export const getPeriod = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const period = await service.getBudgetPeriod(getCompanyId(req), req.params.id);
    sendSuccess(res, period, 'Budget period retrieved');
  } catch (err) { next(err); }
};

export const createPeriod = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const period = await service.createBudgetPeriod(getCompanyId(req), getUserId(req), req.body);
    sendSuccess(res, period, 'Budget period created', 201);
  } catch (err) { next(err); }
};

export const updatePeriod = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const period = await service.updateBudgetPeriod(getCompanyId(req), req.params.id, req.body);
    sendSuccess(res, period, 'Budget period updated');
  } catch (err) { next(err); }
};

export const deletePeriod = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteBudgetPeriod(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Budget period deleted');
  } catch (err) { next(err); }
};

export const getLines = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lines = await service.getBudgetLines(getCompanyId(req), req.params.id);
    sendSuccess(res, lines, 'Budget lines retrieved');
  } catch (err) { next(err); }
};

export const saveLines = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Accept either a raw array body or { lines: [...] }
    const lines = Array.isArray(req.body) ? req.body : req.body?.lines;
    const result = await service.saveBudgetLines(getCompanyId(req), req.params.id, lines);
    sendSuccess(res, result, 'Budget lines saved');
  } catch (err) { next(err); }
};

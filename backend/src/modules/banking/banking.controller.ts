import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as svc from './banking.service';
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  createTransactionSchema,
  updateTransactionSchema,
  startReconciliationSchema,
} from './banking.validation';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

// ─── Bank Accounts ───────────────────────────────────────────────────────────

export const listBankAccounts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await svc.listBankAccounts(getCompanyId(req)), 'Bank accounts retrieved');
  } catch (err) { next(err); }
};

export const getBankAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await svc.getBankAccount(getCompanyId(req), req.params.id), 'Bank account retrieved');
  } catch (err) { next(err); }
};

export const createBankAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createBankAccountSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await svc.createBankAccount(getCompanyId(req), req.user!.id, getUserName(req), parsed.data), 'Bank account created', 201);
  } catch (err) { next(err); }
};

export const updateBankAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateBankAccountSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await svc.updateBankAccount(getCompanyId(req), req.params.id, parsed.data), 'Bank account updated');
  } catch (err) { next(err); }
};

export const deleteBankAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await svc.deleteBankAccount(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Bank account deleted');
  } catch (err) { next(err); }
};

// ─── Bank Transactions ───────────────────────────────────────────────────────

export const listTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const data = await svc.listTransactions(getCompanyId(req), req.params.id, {
      page, limit, offset,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      search: req.query.search as string,
      transaction_type: req.query.transaction_type as string,
    });
    sendSuccess(res, data, 'Transactions retrieved');
  } catch (err) { next(err); }
};

export const createTransaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createTransactionSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await svc.createTransaction(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Transaction created', 201);
  } catch (err) { next(err); }
};

export const updateTransaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateTransactionSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await svc.updateTransaction(getCompanyId(req), req.params.id, req.params.txId, parsed.data), 'Transaction updated');
  } catch (err) { next(err); }
};

export const deleteTransaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await svc.deleteTransaction(getCompanyId(req), req.params.id, req.params.txId);
    sendSuccess(res, null, 'Transaction deleted');
  } catch (err) { next(err); }
};

// ─── Reconciliation ──────────────────────────────────────────────────────────

export const getReconciliation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await svc.getReconciliationSummary(getCompanyId(req), req.params.id), 'Reconciliation retrieved');
  } catch (err) { next(err); }
};

export const startReconciliation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = startReconciliationSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await svc.startReconciliation(getCompanyId(req), req.params.id, req.user!.id, parsed.data), 'Reconciliation started', 201);
  } catch (err) { next(err); }
};

export const markReconciled = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reconcile = req.body.reconcile !== false;
    sendSuccess(res, await svc.markTransactionReconciled(
      getCompanyId(req), req.params.id, req.params.recId, req.params.txId, reconcile
    ), 'Transaction reconciliation updated');
  } catch (err) { next(err); }
};

export const completeReconciliation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await svc.completeReconciliation(getCompanyId(req), req.params.id, req.params.recId, req.user!.id), 'Reconciliation completed');
  } catch (err) { next(err); }
};

// ─── Summary ─────────────────────────────────────────────────────────────────

export const getBankSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await svc.getBankSummary(getCompanyId(req)), 'Bank summary retrieved');
  } catch (err) { next(err); }
};

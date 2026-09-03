import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './accounting.service';
import { createAccountSchema, updateAccountSchema, createJournalEntrySchema } from './accounting.validation';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

// ─── Chart of Accounts ─────────────────────────────────────────────────────

export const listAccounts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { account_type, search, is_active } = req.query as Record<string, string>;
    const result = await service.listAccounts(getCompanyId(req), { account_type, search, is_active });
    sendSuccess(res, result, 'Accounts retrieved');
  } catch (err) { next(err); }
};

export const getAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getAccountById(getCompanyId(req), req.params.id), 'Account retrieved');
  } catch (err) { next(err); }
};

export const createAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createAccount(getCompanyId(req), req.user!.id, parsed.data), 'Account created', 201);
  } catch (err) { next(err); }
};

export const updateAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateAccountSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateAccount(getCompanyId(req), req.params.id, parsed.data), 'Account updated');
  } catch (err) { next(err); }
};

export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteAccount(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Account deleted');
  } catch (err) { next(err); }
};

// ─── Journal Entries ─────────────────────────────────────────────────────────

export const getNextJENumber = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, { entry_no: await service.peekNextJournalEntryNumber(getCompanyId(req)) }, 'Next journal entry number');
  } catch (err) { next(err); }
};

export const listJournalEntries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { status, date_from, date_to, reference_type, search } = req.query as Record<string, string>;
    const result = await service.listJournalEntries(getCompanyId(req), { page, limit, offset, status, date_from, date_to, reference_type, search });
    sendPaginated(res, result.journal_entries, result.pagination, 'journal_entries', 'Journal entries retrieved');
  } catch (err) { next(err); }
};

export const getJournalEntry = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getJournalEntryById(getCompanyId(req), req.params.id), 'Journal entry retrieved');
  } catch (err) { next(err); }
};

export const createJournalEntry = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createJournalEntrySchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.createJournalEntry(getCompanyId(req), req.user!.id, getUserName(req), parsed.data), 'Journal entry created', 201);
  } catch (err) { next(err); }
};

export const updateJournalEntry = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createJournalEntrySchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    sendSuccess(res, await service.updateJournalEntry(getCompanyId(req), req.params.id, req.user!.id, getUserName(req), parsed.data), 'Journal entry updated');
  } catch (err) { next(err); }
};

export const reverseJournalEntry = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.reverseJournalEntry(getCompanyId(req), req.params.id, req.user!.id, getUserName(req)), 'Journal entry reversed');
  } catch (err) { next(err); }
};

// ─── GL Reports ──────────────────────────────────────────────────────────────

export const getGeneralLedger = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { account_id, start_date, end_date } = req.query as Record<string, string>;
    if (!account_id) throw new ValidationError('account_id is required');
    if (!start_date || !end_date) throw new ValidationError('start_date and end_date are required');
    if (account_id === 'all') {
      sendSuccess(res, await service.getGeneralLedgerAll(getCompanyId(req), start_date, end_date), 'General ledger retrieved');
    } else {
      sendSuccess(res, await service.getGeneralLedger(getCompanyId(req), account_id, start_date, end_date), 'General ledger retrieved');
    }
  } catch (err) { next(err); }
};

export const getTrialBalance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { as_of_date } = req.query as Record<string, string>;
    sendSuccess(res, await service.getTrialBalance(getCompanyId(req), as_of_date), 'Trial balance retrieved');
  } catch (err) { next(err); }
};

// ─── Opening Balance ──────────────────────────────────────────────────────────

export const getOpeningBalance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getOpeningBalance(getCompanyId(req)), 'Opening balance retrieved');
  } catch (err) { next(err); }
};

export const postOpeningBalance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { opening_date, balances } = req.body;
    if (!opening_date) throw new ValidationError('opening_date is required');
    if (!Array.isArray(balances) || !balances.length) throw new ValidationError('balances array is required');
    sendSuccess(res, await service.postOpeningBalance(getCompanyId(req), req.user!.id, getUserName(req), { opening_date, balances }), 'Opening balance posted', 201);
  } catch (err) { next(err); }
};

// ─── Year-End Close ───────────────────────────────────────────────────────────

export const getYearEndCloses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getYearEndCloses(getCompanyId(req)), 'Year-end closes retrieved');
  } catch (err) { next(err); }
};

export const performYearEndClose = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fiscal_year_end_date } = req.body;
    if (!fiscal_year_end_date) throw new ValidationError('fiscal_year_end_date is required');
    sendSuccess(res, await service.yearEndClose(getCompanyId(req), req.user!.id, getUserName(req), { fiscal_year_end_date }), 'Year-end close posted', 201);
  } catch (err) { next(err); }
};

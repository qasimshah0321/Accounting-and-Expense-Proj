import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './approvals.service';
import { createRuleSchema, updateRuleSchema, rejectRequestSchema } from './approvals.validation';
import { sendSuccess } from '../../utils/response';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { getCompanyId, getUserName } from '../../middleware/multiTenant';

const getUserRole = (req: AuthRequest): string => {
  if (!req.user?.role) throw new ForbiddenError('User role not found');
  return req.user.role;
};

export const listRules = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rules = await service.getRules(getCompanyId(req));
    sendSuccess(res, rules, 'Approval rules retrieved');
  } catch (err) { next(err); }
};

export const createRule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createRuleSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const rule = await service.createRule(
      getCompanyId(req),
      req.user!.id,
      getUserName(req),
      parsed.data
    );
    sendSuccess(res, rule, 'Approval rule created', 201);
  } catch (err) { next(err); }
};

export const updateRule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateRuleSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const rule = await service.updateRule(
      getCompanyId(req),
      req.params.id,
      req.user!.id,
      getUserName(req),
      parsed.data
    );
    sendSuccess(res, rule, 'Approval rule updated');
  } catch (err) { next(err); }
};

export const deleteRule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteRule(
      getCompanyId(req),
      req.params.id,
      req.user!.id,
      getUserName(req)
    );
    sendSuccess(res, null, 'Approval rule deleted');
  } catch (err) { next(err); }
};

export const myPending = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await service.getMyPendingRequests(getCompanyId(req), getUserRole(req));
    sendSuccess(res, rows, 'Pending approval requests retrieved');
  } catch (err) { next(err); }
};

export const documentApprovals = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, id } = req.params;
    const rows = await service.getPendingRequestsForDocument(getCompanyId(req), type, id);
    sendSuccess(res, rows, 'Document approvals retrieved');
  } catch (err) { next(err); }
};

export const approve = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await service.actionRequest(
      getCompanyId(req),
      req.params.id,
      req.user!.id,
      getUserName(req),
      getUserRole(req),
      'approve'
    );
    sendSuccess(res, updated, 'Request approved');
  } catch (err) { next(err); }
};

export const reject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = rejectRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const updated = await service.actionRequest(
      getCompanyId(req),
      req.params.id,
      req.user!.id,
      getUserName(req),
      getUserRole(req),
      'reject',
      parsed.data.rejection_reason
    );
    sendSuccess(res, updated, 'Request rejected');
  } catch (err) { next(err); }
};

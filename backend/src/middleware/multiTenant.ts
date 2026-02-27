import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ForbiddenError } from '../utils/errors';

export const tenantIsolation = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.user?.company_id) {
    return next(new ForbiddenError('Company context not found'));
  }
  next();
};

export const getCompanyId = (req: AuthRequest): string => {
  if (!req.user?.company_id) throw new ForbiddenError('Company context not found');
  return req.user.company_id;
};

export const getUserId = (req: AuthRequest): string => {
  if (!req.user?.id) throw new ForbiddenError('User context not found');
  return req.user.id;
};

export const getUserName = (req: AuthRequest): string => {
  if (!req.user) throw new ForbiddenError('User context not found');
  return `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username;
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './users.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { getCompanyId } from '../../middleware/multiTenant';
import { getPagination } from '../../utils/pagination';
import { ValidationError } from '../../utils/errors';
import { createUserSchema, updateUserSchema } from './users.validation';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, offset } = getPagination(req);
    const result = await service.listUsers(getCompanyId(req), page, limit, offset);
    sendPaginated(res, result.users, result.pagination, 'users', 'Users retrieved successfully');
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const user = await service.createUser(getCompanyId(req), parsed.data);
    sendSuccess(res, user, 'User created successfully', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    const user = await service.updateUser(getCompanyId(req), req.params.id, parsed.data);
    sendSuccess(res, user, 'User updated successfully');
  } catch (err) { next(err); }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteUser(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'User deleted successfully');
  } catch (err) { next(err); }
};

export const linkCustomer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customer_id } = req.body;
    if (!customer_id) throw new ValidationError('customer_id is required');
    await service.linkCustomer(getCompanyId(req), req.params.id, customer_id);
    sendSuccess(res, null, 'Customer linked successfully');
  } catch (err) { next(err); }
};

export const unlinkCustomer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.unlinkCustomer(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Customer unlinked successfully');
  } catch (err) { next(err); }
};

export const getPermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getUserPermissions(getCompanyId(req), req.params.id);
    sendSuccess(res, result, 'User permissions retrieved');
  } catch (err) { next(err); }
};

export const updatePermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates = req.body;
    if (!Array.isArray(updates)) {
      res.status(400).json({ error: { message: 'Body must be an array of permission updates' } });
      return;
    }
    await service.updateUserPermissions(getCompanyId(req), req.params.id, updates);
    sendSuccess(res, null, 'User permissions updated');
  } catch (err) { next(err); }
};

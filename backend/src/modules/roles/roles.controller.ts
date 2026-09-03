import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './roles.service';
import { sendSuccess } from '../../utils/response';
import { getCompanyId } from '../../middleware/multiTenant';
import { ValidationError } from '../../utils/errors';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roles = await service.listRoles(getCompanyId(req));
    sendSuccess(res, roles, 'Roles retrieved');
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role_code, role_name, description } = req.body;
    if (!role_code || !role_name) throw new ValidationError('role_code and role_name are required');
    const role = await service.createRole(getCompanyId(req), { role_code, role_name, description });
    sendSuccess(res, role, 'Role created', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await service.updateRole(getCompanyId(req), req.params.id, req.body);
    sendSuccess(res, role, 'Role updated');
  } catch (err) { next(err); }
};

export const deleteRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteRole(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Role deleted');
  } catch (err) { next(err); }
};

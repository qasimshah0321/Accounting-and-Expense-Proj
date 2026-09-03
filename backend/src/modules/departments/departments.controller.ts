import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as service from './departments.service';
import { sendSuccess } from '../../utils/response';
import { getCompanyId } from '../../middleware/multiTenant';
import { ValidationError } from '../../utils/errors';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const depts = await service.listDepartments(getCompanyId(req));
    sendSuccess(res, depts, 'Departments retrieved');
  } catch (err) { next(err); }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dept = await service.getDepartmentWithMembers(getCompanyId(req), req.params.id);
    sendSuccess(res, dept, 'Department retrieved');
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, color } = req.body;
    if (!name) throw new ValidationError('name is required');
    const dept = await service.createDepartment(getCompanyId(req), { name, description, color });
    sendSuccess(res, dept, 'Department created', 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dept = await service.updateDepartment(getCompanyId(req), req.params.id, req.body);
    sendSuccess(res, dept, 'Department updated');
  } catch (err) { next(err); }
};

export const deleteDept = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteDepartment(getCompanyId(req), req.params.id);
    sendSuccess(res, null, 'Department deleted');
  } catch (err) { next(err); }
};

export const updatePermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates = req.body;
    if (!Array.isArray(updates)) throw new ValidationError('Body must be an array');
    await service.updateDepartmentPermissions(getCompanyId(req), req.params.id, updates);
    sendSuccess(res, null, 'Department permissions updated');
  } catch (err) { next(err); }
};

export const assignUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user_id, department_id } = req.body;
    if (!user_id) throw new ValidationError('user_id is required');
    await service.assignUserToDepartment(getCompanyId(req), user_id, department_id ?? null);
    sendSuccess(res, null, 'User assignment updated');
  } catch (err) { next(err); }
};

export const getUnassigned = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await service.getUnassignedUsers(getCompanyId(req));
    sendSuccess(res, users, 'Unassigned users retrieved');
  } catch (err) { next(err); }
};

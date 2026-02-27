import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import * as authService from './auth.service';
import { loginSchema, registerSchema, changePasswordSchema } from './auth.validation';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.errors);
    }
    const result = await authService.login(parsed.data.email, parsed.data.password);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.errors);
    }
    const result = await authService.register(parsed.data);
    sendSuccess(res, result, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

export const logout = (_req: Request, res: Response): void => {
  sendSuccess(res, null, 'Logged out successfully');
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) throw new ValidationError('Refresh token required');
    const result = await authService.refreshToken(refresh_token);
    sendSuccess(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, user, 'User retrieved');
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.errors);
    await authService.changePassword(req.user!.id, parsed.data.current_password, parsed.data.new_password);
    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

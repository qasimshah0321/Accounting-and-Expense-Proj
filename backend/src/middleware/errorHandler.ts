import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { config } from '../config/env';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // PostgreSQL unique violation
  if ((err as any).code === '23505') {
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Record already exists' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // PostgreSQL foreign key violation
  if ((err as any).code === '23503') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Referenced record does not exist' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    },
    timestamp: new Date().toISOString(),
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
    timestamp: new Date().toISOString(),
  });
};

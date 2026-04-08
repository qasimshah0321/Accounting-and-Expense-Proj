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

  // Unique constraint violation (PostgreSQL: 23505, MySQL: ER_DUP_ENTRY / sqlState 23000)
  const errCode = (err as any).code;
  const sqlState = (err as any).sqlState;
  if (errCode === '23505' || errCode === 'ER_DUP_ENTRY') {
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Record already exists' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Foreign key violation (PostgreSQL: 23503, MySQL: ER_NO_REFERENCED_ROW_2 / ER_ROW_IS_REFERENCED_2)
  if (errCode === '23503' || errCode === 'ER_NO_REFERENCED_ROW_2' || errCode === 'ER_ROW_IS_REFERENCED_2') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Referenced record does not exist' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // MySQL generic integrity constraint (sqlState 23000 covers duplicates and FK violations)
  if (sqlState === '23000') {
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Database constraint violation' },
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

import { Response } from 'express';
import { PaginationMeta } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): void => {
  res.status(statusCode).json({ success: true, data, message });
};

export const sendPaginated = <T>(
  res: Response,
  items: T[],
  pagination: PaginationMeta,
  key: string,
  message = 'Data retrieved successfully'
): void => {
  res.status(200).json({
    success: true,
    data: { [key]: items, pagination },
    message,
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown[]
): void => {
  res.status(statusCode).json({
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  });
};

import { Request } from 'express';
import { PaginationParams, PaginationMeta } from '../types';

export const getPagination = (req: Request): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  totalRecords: number
): PaginationMeta => ({
  page,
  limit,
  total_records: totalRecords,
  total_pages: Math.ceil(totalRecords / limit),
});

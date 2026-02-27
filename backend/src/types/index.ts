import { Request } from 'express';

export interface AuthUser {
  id: string;
  company_id: string;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
  timestamp?: string;
}

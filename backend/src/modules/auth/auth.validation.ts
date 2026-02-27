import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export const registerSchema = z.object({
  company_name: z.string().min(1, 'Company name required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password required'),
  new_password: z.string().min(6, 'New password must be at least 6 characters'),
});

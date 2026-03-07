import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(2),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.enum(['customer', 'salesperson']),
  customer_id: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.enum(['admin', 'customer', 'salesperson']).optional(),
  is_active: z.boolean().optional(),
});

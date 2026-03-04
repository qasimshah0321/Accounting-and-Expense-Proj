import { z } from 'zod';

export const createRecurringSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  document_type: z.enum(['invoice', 'bill', 'expense']),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annually']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  max_runs: z.number().int().positive().optional().nullable(),
  template_data: z.record(z.unknown()).default({}),
  description: z.string().optional().nullable(),
});

export const updateRecurringSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  document_type: z.enum(['invoice', 'bill', 'expense']).optional(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annually']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional().nullable(),
  max_runs: z.number().int().positive().optional().nullable(),
  template_data: z.record(z.unknown()).optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

import { z } from 'zod';

export const createExpenseSchema = z.object({
  vendor_id: z.string().uuid().optional().nullable(),
  payee_name: z.string().optional(),
  expense_category: z.string().min(1, 'Expense category required'),
  expense_account: z.string().optional(),
  reference_no: z.string().optional(),
  invoice_no: z.string().optional(),
  expense_date: z.string().min(1, 'Expense date required'),
  amount: z.number().positive('Amount must be > 0'),
  tax_id: z.string().uuid().optional().nullable(),
  tax_amount: z.number().min(0).default(0),
  payment_method: z.enum(['cash', 'check', 'card', 'bank_transfer']).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'approved', 'posted', 'cancelled']),
  reason: z.string().optional(),
});

export const markPaidSchema = z.object({
  paid_date: z.string().optional(),
  payment_method: z.enum(['cash', 'check', 'card', 'bank_transfer']).optional(),
});

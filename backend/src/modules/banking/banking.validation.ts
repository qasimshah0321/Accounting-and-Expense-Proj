import { z } from 'zod';

export const createBankAccountSchema = z.object({
  account_name: z.string().min(1).max(255),
  account_number: z.string().max(50).optional().nullable(),
  bank_name: z.string().min(1).max(255),
  account_type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'other']),
  currency: z.string().length(3).default('USD'),
  opening_balance: z.number().default(0),
  gl_account_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updateBankAccountSchema = z.object({
  account_name: z.string().min(1).max(255).optional(),
  account_number: z.string().max(50).optional().nullable(),
  bank_name: z.string().min(1).max(255).optional(),
  account_type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'other']).optional(),
  currency: z.string().length(3).optional(),
  gl_account_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const createTransactionSchema = z.object({
  transaction_date: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
  transaction_type: z.enum(['deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'adjustment']),
  reference_no: z.string().max(100).optional().nullable(),
  payee: z.string().max(255).optional().nullable(),
  category: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
  target_bank_account_id: z.string().uuid().optional().nullable(), // for transfers
});

export const updateTransactionSchema = z.object({
  transaction_date: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().optional(),
  transaction_type: z.enum(['deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'adjustment']).optional(),
  reference_no: z.string().max(100).optional().nullable(),
  payee: z.string().max(255).optional().nullable(),
  category: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const startReconciliationSchema = z.object({
  statement_date: z.string().min(1),
  statement_ending_balance: z.number(),
});

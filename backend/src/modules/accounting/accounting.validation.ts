import { z } from 'zod';

export const createAccountSchema = z.object({
  account_number: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  account_type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  sub_type: z.string().max(100).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  normal_balance: z.enum(['debit', 'credit']).optional(),
  is_active: z.boolean().optional(),
});

export const updateAccountSchema = z.object({
  account_number: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(255).optional(),
  account_type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
  sub_type: z.string().max(100).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  normal_balance: z.enum(['debit', 'credit']).optional(),
  is_active: z.boolean().optional(),
});

const journalEntryLineSchema = z.object({
  account_id: z.string().uuid(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().optional().nullable(),
});

export const createJournalEntrySchema = z.object({
  entry_no: z.string().optional(),
  entry_date: z.string().min(1),
  description: z.string().optional().nullable(),
  reference_type: z.string().optional().nullable(),
  reference_id: z.string().uuid().optional().nullable(),
  reference_no: z.string().optional().nullable(),
  lines: z.array(journalEntryLineSchema).min(2),
});

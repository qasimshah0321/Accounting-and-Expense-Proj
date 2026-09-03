import { z } from 'zod';

export const documentTypeEnum = z.enum(['purchase_order', 'bill', 'invoice', 'expense']);

export const createRuleSchema = z.object({
  document_type: documentTypeEnum,
  min_amount: z.number().min(0).default(0),
  max_amount: z.number().min(0).nullable().optional(),
  approver_role: z.string().min(1),
  step_order: z.number().int().min(1).default(1),
  is_active: z.boolean().optional(),
});

export const updateRuleSchema = z.object({
  document_type: documentTypeEnum.optional(),
  min_amount: z.number().min(0).optional(),
  max_amount: z.number().min(0).nullable().optional(),
  approver_role: z.string().min(1).optional(),
  step_order: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

export const rejectRequestSchema = z.object({
  rejection_reason: z.string().min(1),
});

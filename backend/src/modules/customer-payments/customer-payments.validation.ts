import { z } from 'zod';

export const createCustomerPaymentSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  invoice_id: z.string().uuid().optional().nullable(),
  payment_date: z.string().min(1, 'Payment date required'),
  amount: z.number().positive('Amount must be > 0'),
  payment_method: z.enum(['cash', 'check', 'card', 'bank_transfer']),
  reference_no: z.string().optional(),
  notes: z.string().optional(),
});

export const allocatePaymentSchema = z.object({
  invoice_id: z.string().uuid('Invalid invoice ID'),
  amount: z.number().positive('Amount must be > 0'),
});

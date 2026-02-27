import { z } from 'zod';

export const createVendorPaymentSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  bill_id: z.string().uuid().optional().nullable(),
  payment_date: z.string().min(1, 'Payment date required'),
  amount: z.number().positive('Amount must be > 0'),
  payment_method: z.enum(['cash', 'check', 'card', 'bank_transfer']),
  reference_no: z.string().optional(),
  notes: z.string().optional(),
});

export const allocateVendorPaymentSchema = z.object({
  bill_id: z.string().uuid('Invalid bill ID'),
  amount: z.number().positive('Amount must be > 0'),
});

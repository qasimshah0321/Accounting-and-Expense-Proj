import { z } from 'zod';

const lineItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional(),
  description: z.string().min(1),
  ordered_qty: z.number().positive(),
  unit_of_measure: z.string().default('pcs'),
  rate: z.number().min(0).default(0),
  tax_id: z.string().uuid().optional().nullable(),
  tax_rate: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
});

export const createRFQSchema = z.object({
  rfq_no: z.string().optional(),
  vendor_id: z.string().uuid(),
  reference_no: z.string().optional(),
  rfq_date: z.string().min(1),
  required_by_date: z.string().optional(),
  tax_id: z.string().uuid().optional().nullable(),
  tax_rate: z.number().min(0).default(0),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1),
});

export const updateRFQSchema = createRFQSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'quoted', 'accepted', 'rejected', 'cancelled']),
  reason: z.string().optional(),
});

export const convertToPOSchema = z.object({
  order_date: z.string().min(1),
  expected_delivery_date: z.string().optional(),
  due_date: z.string().optional(),
});

import { z } from 'zod';

const lineItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  ordered_qty: z.number().positive('Quantity must be > 0'),
  unit_of_measure: z.string().default('pcs'),
  rate: z.number().min(0),
  tax_id: z.string().uuid().optional().nullable(),
  tax_rate: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
});

export const createEstimateSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  reference_no: z.string().optional(),
  estimate_date: z.string().min(1, 'Estimate date required'),
  expiry_date: z.string().optional(),
  bill_to: z.string().optional(),
  ship_to: z.string().optional(),
  tax_id: z.string().uuid().optional().nullable(),
  tax_rate: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  terms_and_conditions: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item required'),
});

export const updateEstimateSchema = createEstimateSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const convertToSOSchema = z.object({
  order_date: z.string().min(1, 'Order date required'),
  due_date: z.string().optional(),
  po_number: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  mark_estimate_converted: z.boolean().default(true),
});

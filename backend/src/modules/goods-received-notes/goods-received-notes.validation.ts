import { z } from 'zod';

const lineItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional(),
  description: z.string().min(1),
  ordered_qty: z.number().min(0),
  received_qty: z.number().min(0),
  unit_of_measure: z.string().default('pcs'),
  unit_cost: z.number().min(0).default(0),
  purchase_order_line_item_id: z.string().uuid().optional().nullable(),
});

export const createGRNSchema = z.object({
  grn_no: z.string().optional(),
  vendor_id: z.string().uuid(),
  purchase_order_id: z.string().uuid().optional().nullable(),
  reference_no: z.string().optional(),
  receipt_date: z.string().min(1),
  expected_date: z.string().optional(),
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
  deliver_to: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1),
});

export const updateGRNSchema = createGRNSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'approved', 'partially_received', 'received', 'cancelled']),
  reason: z.string().optional(),
});

export const receiveGoodsSchema = z.object({
  receipt_date: z.string().optional(),
  add_to_inventory: z.boolean().default(true),
});

export const convertToBillSchema = z.object({
  bill_date: z.string().min(1),
  due_date: z.string().min(1),
  vendor_invoice_no: z.string().optional(),
  notes: z.string().optional(),
});

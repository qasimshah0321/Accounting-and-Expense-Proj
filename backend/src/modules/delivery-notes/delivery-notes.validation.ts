import { z } from 'zod';

const lineItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional(),
  description: z.string().min(1),
  ordered_qty: z.number().min(0),
  shipped_qty: z.number().min(0),
  unit_of_measure: z.string().default('pcs'),
  stock_location: z.string().optional(),
});

export const createDeliveryNoteSchema = z.object({
  customer_id: z.string().uuid(),
  sales_order_id: z.string().uuid().optional().nullable(),
  po_number: z.string().optional(),
  reference_no: z.string().optional(),
  delivery_date: z.string().min(1),
  due_date: z.string().optional(),
  shipment_date: z.string().optional(),
  ship_via_id: z.string().uuid().optional().nullable(),
  tracking_number: z.string().optional(),
  shipping_cost: z.number().min(0).default(0),
  ship_to: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1),
});

export const updateDeliveryNoteSchema = createDeliveryNoteSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'ready_to_ship', 'shipped', 'in_transit', 'delivered', 'cancelled']),
  reason: z.string().optional(),
});

export const shipSchema = z.object({
  shipment_date: z.string().optional(),
  deduct_inventory: z.boolean().default(true),
  stock_location: z.string().optional(),
});

export const convertToInvoiceSchema = z.object({
  invoice_date: z.string().min(1),
  due_date: z.string().min(1),
  payment_terms: z.number().default(30),
  copy_shipped_quantities: z.boolean().default(true),
});

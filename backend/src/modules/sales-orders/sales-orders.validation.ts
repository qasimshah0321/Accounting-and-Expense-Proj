import { z } from 'zod';

const lineItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional(),
  description: z.string().min(1),
  ordered_qty: z.number().positive(),
  unit_of_measure: z.string().default('pcs'),
  rate: z.number().min(0),
  tax_id: z.string().uuid().optional().nullable(),
  tax_rate: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
});

export const createSalesOrderSchema = z.object({
  sales_order_no: z.string().optional(),
  customer_id: z.string().uuid(),
  reference_no: z.string().optional(),
  po_number: z.string().optional(),
  source_type: z.enum(['manual', 'estimate', 'ecommerce']).default('manual'),
  estimate_id: z.string().uuid().optional().nullable(),
  order_date: z.string().min(1),
  due_date: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  bill_to: z.string().optional(),
  ship_to: z.string().optional(),
  tax_id: z.string().uuid().optional().nullable(),
  tax_rate: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  terms_and_conditions: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1),
});

export const updateSalesOrderSchema = createSalesOrderSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'confirmed', 'in_progress', 'partially_fulfilled', 'fulfilled', 'cancelled']),
  reason: z.string().optional(),
});

export const convertToDNSchema = z.object({
  delivery_date: z.string().min(1),
  shipment_date: z.string().optional(),
  ship_via_id: z.string().uuid().optional().nullable(),
  tracking_number: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(z.object({
    sales_order_line_item_id: z.string().uuid(),
    shipped_qty: z.number().positive(),
  })).min(1),
});

export const convertToInvoiceSchema = z.object({
  invoice_date: z.string().min(1),
  due_date: z.string().min(1),
  payment_terms: z.number().default(30),
  notes: z.string().optional(),
});

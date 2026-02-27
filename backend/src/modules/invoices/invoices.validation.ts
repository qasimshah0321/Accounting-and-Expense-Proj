import { z } from 'zod';

const lineItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_of_measure: z.string().default('pcs'),
  rate: z.number().min(0),
  discount_per_item: z.number().min(0).default(0),
  tax_id: z.string().uuid().optional().nullable(),
  tax_rate: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
});

export const createInvoiceSchema = z.object({
  invoice_no: z.string().optional(),
  customer_id: z.string().uuid(),
  sales_order_id: z.string().uuid().optional().nullable(),
  delivery_note_id: z.string().uuid().optional().nullable(),
  po_number: z.string().optional(),
  reference_no: z.string().optional(),
  invoice_date: z.string().min(1),
  due_date: z.string().min(1),
  bill_to: z.string().optional(),
  ship_to: z.string().optional(),
  tax_id: z.string().uuid().optional().nullable(),
  tax_rate: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  shipping_charges: z.number().min(0).default(0),
  terms_and_conditions: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled']),
  reason: z.string().optional(),
});

export const recordPaymentSchema = z.object({
  payment_date: z.string().min(1),
  amount: z.number().positive(),
  payment_method: z.string().min(1),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  transaction_reference: z.string().optional(),
  check_number: z.string().optional(),
  deposit_to_account: z.string().optional(),
  notes: z.string().optional(),
});

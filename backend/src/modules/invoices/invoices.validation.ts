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
  sales_order_line_item_id: z.string().uuid().optional().nullable(),
  dn_line_item_id: z.string().uuid().optional().nullable(),
  // FBR Digital Invoicing (per line) — optional; default from product where absent
  hs_code: z.string().optional().nullable(),
  uom: z.string().optional().nullable(),
  sale_type: z.string().optional().nullable(),
  rate_desc: z.string().optional().nullable(),
  sro_schedule_no: z.string().optional().nullable(),
  sro_item_serial_no: z.string().optional().nullable(),
  fixed_notified_value: z.number().min(0).optional(),
  sales_tax_withheld: z.number().min(0).optional(),
  extra_tax: z.number().min(0).optional(),
  further_tax: z.number().min(0).optional(),
  fed_payable: z.number().min(0).optional(),
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
  terms: z.string().optional(),
  bill_to: z.string().optional(),
  ship_to: z.string().optional(),
  // FBR Digital Invoicing (buyer/header) — optional; default from customer where absent
  buyer_ntn: z.string().optional().nullable(),
  buyer_cnic: z.string().optional().nullable(),
  buyer_business_name: z.string().optional().nullable(),
  buyer_province: z.string().optional().nullable(),
  buyer_registration_type: z.enum(['Registered', 'Unregistered']).optional(),
  fbr_scenario_id: z.string().optional().nullable(),
  fbr_invoice_type: z.string().optional().nullable(),
  // PRA Fiscal Invoicing (header) — optional
  pra_invoice_type: z.enum(['New', 'Debit', 'Credit']).optional(),
  pra_ref_usin: z.string().optional().nullable(),
  pra_payment_mode: z.number().int().min(1).max(6).optional(),
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
  status: z.enum(['draft', 'pending_approval', 'sent', 'approved', 'partially_paid', 'paid', 'overdue', 'cancelled']),
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

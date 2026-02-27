import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name required'),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().optional(),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_country: z.string().optional(),
  shipping_address: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_country: z.string().optional(),
  tax_id: z.string().optional(),
  credit_limit: z.number().min(0).default(0),
  payment_terms: z.number().int().min(0).default(30),
  currency: z.string().default('USD'),
  customer_type: z.enum(['retail', 'wholesale', 'distributor']).optional(),
  customer_group: z.string().optional(),
  customer_segment: z.string().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

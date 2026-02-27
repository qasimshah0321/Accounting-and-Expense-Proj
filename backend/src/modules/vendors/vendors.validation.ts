import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name required'),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  tax_id: z.string().optional(),
  payment_terms: z.number().int().min(0).default(30),
  payment_method: z.enum(['bank_transfer', 'check', 'cash', 'credit_card']).optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  currency: z.string().default('USD'),
  vendor_type: z.string().optional(),
  vendor_group: z.string().optional(),
  vendor_segment: z.string().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

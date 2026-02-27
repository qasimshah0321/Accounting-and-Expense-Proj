import { z } from 'zod';

export const createTaxSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  rate: z.number().min(0).max(100, 'Rate must be between 0 and 100'),
  tax_type: z.enum(['sales_tax', 'vat', 'gst', 'service_tax']).optional(),
  is_compound: z.boolean().default(false),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const updateTaxSchema = createTaxSchema.partial();

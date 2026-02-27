import { z } from 'zod';

export const createShipViaSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  carrier: z.string().optional(),
  service_type: z.string().optional(),
  estimated_days: z.number().int().min(0).optional(),
  tracking_url_template: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const updateShipViaSchema = createShipViaSchema.partial();

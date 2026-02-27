import { z } from 'zod';

export const adjustStockSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  location_id: z.string().uuid().optional().nullable(),
  quantity: z.number().refine(v => v !== 0, 'Quantity must not be zero'),
  transaction_type: z.enum(['adjustment_in', 'adjustment_out', 'opening_stock', 'write_off']),
  reference_no: z.string().optional(),
  notes: z.string().optional(),
});

export const transferStockSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  from_location_id: z.string().uuid('Invalid source location'),
  to_location_id: z.string().uuid('Invalid destination location'),
  quantity: z.number().positive('Quantity must be > 0'),
  notes: z.string().optional(),
});

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name required'),
  code: z.string().min(1, 'Location code required'),
  description: z.string().optional(),
  is_default: z.boolean().default(false),
});

export const updateLocationSchema = createLocationSchema.partial();

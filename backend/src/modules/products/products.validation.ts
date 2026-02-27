import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU required'),
  barcode: z.string().optional(),
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  product_type: z.enum(['inventory', 'service', 'non-inventory']),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  cost_price: z.number().min(0).default(0),
  selling_price: z.number().min(0).default(0),
  wholesale_price: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  unit_of_measure: z.string().default('pcs'),
  track_inventory: z.boolean().default(true),
  current_stock: z.number().default(0),
  reorder_level: z.number().default(0),
  reorder_quantity: z.number().default(0),
  stock_location: z.string().optional(),
  tax_id: z.string().uuid().optional().nullable(),
  is_taxable: z.boolean().default(true),
  weight: z.number().optional(),
  weight_unit: z.string().optional(),
  dimensions: z.string().optional(),
  is_active: z.boolean().default(true),
  is_for_sale: z.boolean().default(true),
  is_for_purchase: z.boolean().default(true),
  image_url: z.string().optional(),
  notes: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const adjustStockSchema = z.object({
  quantity: z.number().refine(v => v !== 0, 'Quantity cannot be 0'),
  reason: z.string().min(1, 'Reason required'),
  stock_location: z.string().optional(),
  unit_cost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

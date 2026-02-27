-- ============================================================
-- Migration 005: Fix taxes column constraints
-- ============================================================

-- tax_type was renamed from 'type' and kept NOT NULL — make it nullable with default
ALTER TABLE taxes ALTER COLUMN tax_type DROP NOT NULL;
ALTER TABLE taxes ALTER COLUMN tax_type SET DEFAULT NULL;

-- Drop old CHECK constraint (was for 'percentage','fixed')
ALTER TABLE taxes DROP CONSTRAINT IF EXISTS taxes_type_check;
ALTER TABLE taxes DROP CONSTRAINT IF EXISTS taxes_tax_type_check;

-- Add updated CHECK constraint matching validation schema values
ALTER TABLE taxes ADD CONSTRAINT taxes_tax_type_check
  CHECK (tax_type IS NULL OR tax_type IN ('sales_tax','vat','gst','service_tax','percentage','fixed'));

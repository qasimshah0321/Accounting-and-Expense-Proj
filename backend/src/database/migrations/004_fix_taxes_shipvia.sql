-- ============================================================
-- Migration 004: Fix taxes and ship_via missing columns
-- ============================================================

-- ============================================================
-- FIX: taxes table
-- ============================================================

-- Service uses 'tax_type' but schema had 'type'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='taxes' AND column_name='type')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='taxes' AND column_name='tax_type') THEN
    ALTER TABLE taxes RENAME COLUMN type TO tax_type;
  END IF;
END $$;

ALTER TABLE taxes ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50) DEFAULT 'percentage';
ALTER TABLE taxes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE taxes ADD COLUMN IF NOT EXISTS is_compound BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- FIX: ship_via table
-- ============================================================
ALTER TABLE ship_via ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);
ALTER TABLE ship_via ADD COLUMN IF NOT EXISTS service_type VARCHAR(100);
ALTER TABLE ship_via ADD COLUMN IF NOT EXISTS estimated_days INTEGER;
ALTER TABLE ship_via ADD COLUMN IF NOT EXISTS tracking_url_template TEXT;

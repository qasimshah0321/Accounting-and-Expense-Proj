-- Migration 038: Fix estimates table to match service expectations
-- Adds missing columns and aligns schema with estimates.service.ts

-- ── estimates table ──────────────────────────────────────────────────────────

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS bill_to            TEXT,
  ADD COLUMN IF NOT EXISTS ship_to            TEXT,
  ADD COLUMN IF NOT EXISTS reference_no       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tax_id             CHAR(36),
  ADD COLUMN IF NOT EXISTS tax_rate           DECIMAL(7,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total        DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes     TEXT,
  ADD COLUMN IF NOT EXISTS converted_to_sales_order BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sales_order_id     CHAR(36);

-- Copy existing data into new columns where applicable
UPDATE estimates SET bill_to   = customer_address  WHERE bill_to  IS NULL AND customer_address IS NOT NULL;
UPDATE estimates SET ship_to   = ship_to_address   WHERE ship_to  IS NULL AND ship_to_address  IS NOT NULL;
UPDATE estimates SET grand_total = total_amount     WHERE grand_total = 0 AND total_amount > 0;
UPDATE estimates SET terms_and_conditions = terms   WHERE terms_and_conditions IS NULL AND terms IS NOT NULL;
UPDATE estimates SET converted_to_sales_order = TRUE WHERE converted_to_so IS NOT NULL;
UPDATE estimates SET sales_order_id = converted_to_so WHERE converted_to_so IS NOT NULL AND converted_to_so != '';

-- ── estimate_line_items table ─────────────────────────────────────────────────

ALTER TABLE estimate_line_items
  ADD COLUMN IF NOT EXISTS line_number        INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sku                VARCHAR(100),
  ADD COLUMN IF NOT EXISTS unit_of_measure    VARCHAR(50) DEFAULT 'pcs';

-- Backfill line_number based on sort_order or row order
UPDATE estimate_line_items SET line_number = sort_order WHERE line_number = 1 AND sort_order > 0;

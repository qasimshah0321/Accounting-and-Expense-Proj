-- Migration 040: Add missing columns to taxes table
-- The original schema was missing description, tax_type, and is_compound
-- which the taxes service expects.

ALTER TABLE taxes
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS tax_type     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_compound  TINYINT(1) NOT NULL DEFAULT 0;

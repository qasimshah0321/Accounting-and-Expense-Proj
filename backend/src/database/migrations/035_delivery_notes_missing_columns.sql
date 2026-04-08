-- Migration 035: Add missing columns to delivery_notes table
-- The createDeliveryNote service inserts these fields but they were never added to the schema

ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bill_to TEXT DEFAULT NULL;

-- Migration 034: Delivery Note Configuration and Inventory Tracking
-- Adds company-level setting for mandatory/optional delivery note flow
-- Adds inventory_deducted tracking on invoice_line_items

-- Company-level delivery note config
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS dn_requirement ENUM('mandatory','optional') NOT NULL DEFAULT 'optional';

-- Track whether inventory was already deducted (by DN) for each invoice line item
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS inventory_deducted TINYINT(1) NOT NULL DEFAULT 0;

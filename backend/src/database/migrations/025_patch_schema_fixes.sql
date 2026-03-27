-- Migration 025: Patch schema fixes applied directly on server
-- Captures all ALTER TABLE changes made during ERP flow debugging

-- 1. delivery_notes: make legacy columns nullable + add invoice_id
ALTER TABLE delivery_notes
  MODIFY COLUMN delivery_no VARCHAR(50) NULL DEFAULT NULL,
  MODIFY COLUMN order_id CHAR(36) NULL DEFAULT NULL,
  MODIFY COLUMN ship_to_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS invoice_id CHAR(36) NULL DEFAULT NULL;

-- 2. delivery_note_line_items: make company_id/delivery_note_id nullable,
--    add missing columns (idempotent — IF NOT EXISTS guards)
ALTER TABLE delivery_note_line_items
  MODIFY COLUMN company_id CHAR(36) NULL DEFAULT NULL,
  MODIFY COLUMN delivery_note_id CHAR(36) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS line_number INT NOT NULL DEFAULT 1 AFTER delivery_note_id,
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100) DEFAULT NULL AFTER product_id,
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'pcs' AFTER backordered_qty,
  ADD COLUMN IF NOT EXISTS stock_location VARCHAR(100) DEFAULT NULL AFTER unit_of_measure;

-- 3. inventory_transactions: add columns required by ship endpoint
ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS transaction_no VARCHAR(50) DEFAULT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100) DEFAULT NULL AFTER product_id,
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT NULL AFTER sku,
  ADD COLUMN IF NOT EXISTS stock_location VARCHAR(100) DEFAULT NULL AFTER unit_of_measure,
  ADD COLUMN IF NOT EXISTS balance_before DECIMAL(15,4) DEFAULT 0 AFTER quantity,
  ADD COLUMN IF NOT EXISTS transaction_date DATE NOT NULL DEFAULT (CURDATE()) AFTER balance_after;

-- 4. invoices: add shipping_charges and grand_total if missing
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS shipping_charges DECIMAL(15,2) DEFAULT 0 AFTER discount_amount,
  ADD COLUMN IF NOT EXISTS grand_total DECIMAL(15,2) DEFAULT NULL AFTER shipping_charges;

-- 5. invoice_line_items: add discount_per_item
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS discount_per_item DECIMAL(15,2) DEFAULT 0 AFTER rate;

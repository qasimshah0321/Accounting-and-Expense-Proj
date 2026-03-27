-- Migration 024: Fix delivery_notes schema and create delivery_note_line_items

-- Add missing columns to delivery_notes
ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS delivery_note_no VARCHAR(50) AFTER company_id,
  ADD COLUMN IF NOT EXISTS sales_order_id CHAR(36) AFTER delivery_note_no,
  ADD COLUMN IF NOT EXISTS ship_to TEXT AFTER customer_name,
  ADD COLUMN IF NOT EXISTS po_number VARCHAR(100) AFTER sales_order_id,
  ADD COLUMN IF NOT EXISTS shipment_date DATE AFTER delivery_date,
  ADD COLUMN IF NOT EXISTS ship_via_name VARCHAR(100) AFTER ship_via_id,
  ADD COLUMN IF NOT EXISTS total_ordered_qty DECIMAL(15,4) DEFAULT 0 AFTER tracking_number,
  ADD COLUMN IF NOT EXISTS total_shipped_qty DECIMAL(15,4) DEFAULT 0 AFTER total_ordered_qty,
  ADD COLUMN IF NOT EXISTS total_backordered_qty DECIMAL(15,4) DEFAULT 0 AFTER total_shipped_qty,
  ADD COLUMN IF NOT EXISTS deleted_at DATETIME DEFAULT NULL;

-- Populate delivery_note_no from delivery_no for existing rows
UPDATE delivery_notes SET delivery_note_no = delivery_no WHERE delivery_note_no IS NULL AND delivery_no IS NOT NULL;

-- Populate sales_order_id from order_id for existing rows
UPDATE delivery_notes SET sales_order_id = order_id WHERE sales_order_id IS NULL AND order_id IS NOT NULL;

-- Populate ship_to from ship_to_address for existing rows
UPDATE delivery_notes SET ship_to = ship_to_address WHERE ship_to IS NULL AND ship_to_address IS NOT NULL;

-- Add unique index on delivery_note_no
ALTER TABLE delivery_notes
  ADD INDEX IF NOT EXISTS idx_dn_no (company_id, delivery_note_no),
  ADD INDEX IF NOT EXISTS idx_dn_so (company_id, sales_order_id);

-- Create delivery_note_line_items table
CREATE TABLE IF NOT EXISTS delivery_note_line_items (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  company_id  CHAR(36) NOT NULL,
  delivery_note_id CHAR(36) NOT NULL,
  line_number INT NOT NULL DEFAULT 1,
  sales_order_line_item_id CHAR(36) DEFAULT NULL,
  product_id  CHAR(36) DEFAULT NULL,
  sku         VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  ordered_qty DECIMAL(15,4) DEFAULT 0,
  shipped_qty DECIMAL(15,4) DEFAULT 0,
  backordered_qty DECIMAL(15,4) DEFAULT 0,
  unit_of_measure VARCHAR(50) DEFAULT 'pcs',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dnli_dn (delivery_note_id),
  INDEX idx_dnli_co (company_id)
);

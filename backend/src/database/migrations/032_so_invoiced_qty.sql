-- Migration 032: Track invoiced qty on SO line items and link invoice lines back to SO
ALTER TABLE sales_order_line_items
  ADD COLUMN IF NOT EXISTS invoiced_qty DECIMAL(15,4) NOT NULL DEFAULT 0;

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS sales_order_line_item_id CHAR(36) NULL;

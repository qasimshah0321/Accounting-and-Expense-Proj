-- Migration 036: Add sales_order_line_item_id to delivery_note_line_items
-- Enables partial DN tracking against Sales Order line items (mirrors invoiced_qty tracking)

ALTER TABLE delivery_note_line_items
  ADD COLUMN IF NOT EXISTS sales_order_line_item_id CHAR(36) DEFAULT NULL;

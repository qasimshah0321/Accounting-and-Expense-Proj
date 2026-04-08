-- Migration 037: DN invoiced quantity tracking + invoice → DN line item link
-- Enables partial DN invoicing with status tracking (partially_invoiced / invoiced)

-- Track how much of each DN line item has been invoiced
ALTER TABLE delivery_note_line_items
  ADD COLUMN IF NOT EXISTS invoiced_qty DECIMAL(15,4) NOT NULL DEFAULT 0;

-- Link each invoice line item back to the DN line item it came from
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS dn_line_item_id CHAR(36) NULL;

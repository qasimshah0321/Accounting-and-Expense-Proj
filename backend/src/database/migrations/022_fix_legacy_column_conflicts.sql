-- Migration 022: Fix legacy column conflicts (no triggers, just nullable columns)

-- sales_orders: make order_no nullable (service only provides sales_order_no)
ALTER TABLE sales_orders
  MODIFY COLUMN order_no VARCHAR(50) NULL DEFAULT NULL;

-- sales_order_line_items: make FK columns nullable (service doesn't provide order_id/company_id)
ALTER TABLE sales_order_line_items
  DROP FOREIGN KEY fk_so_li_company,
  DROP FOREIGN KEY fk_so_li_order;

ALTER TABLE sales_order_line_items
  MODIFY COLUMN order_id   CHAR(36) NULL DEFAULT NULL,
  MODIFY COLUMN company_id CHAR(36) NULL DEFAULT NULL;

-- invoices: add columns service expects (grand_total, sales_order_id, bill_to, ship_to, etc.)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS grand_total          DECIMAL(15,2) DEFAULT 0 AFTER discount_amount,
  ADD COLUMN IF NOT EXISTS sales_order_id       CHAR(36)      AFTER order_id,
  ADD COLUMN IF NOT EXISTS bill_to              TEXT          AFTER billing_address,
  ADD COLUMN IF NOT EXISTS ship_to              TEXT          AFTER ship_to_address,
  ADD COLUMN IF NOT EXISTS tax_id               CHAR(36)      AFTER tax_amount,
  ADD COLUMN IF NOT EXISTS tax_rate             DECIMAL(7,4)  DEFAULT 0 AFTER tax_id,
  ADD COLUMN IF NOT EXISTS po_number            VARCHAR(100)  AFTER sales_order_id,
  ADD COLUMN IF NOT EXISTS reference_no         VARCHAR(100)  AFTER po_number,
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT          AFTER notes,
  ADD COLUMN IF NOT EXISTS internal_notes       TEXT          AFTER terms_and_conditions;

-- Sync existing grand_total from total_amount
UPDATE invoices SET grand_total = total_amount WHERE grand_total = 0 OR grand_total IS NULL;

-- invoice_line_items: make company_id nullable, add missing columns
ALTER TABLE invoice_line_items
  DROP FOREIGN KEY fk_inv_li_company;

ALTER TABLE invoice_line_items
  MODIFY COLUMN company_id CHAR(36) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS line_number     INT          DEFAULT 0 AFTER id,
  ADD COLUMN IF NOT EXISTS sku             VARCHAR(100) AFTER product_id,
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50)  DEFAULT 'pcs' AFTER description;

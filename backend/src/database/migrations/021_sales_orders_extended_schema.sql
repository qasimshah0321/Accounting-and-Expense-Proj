-- Migration 021: Extend sales_orders and sales_order_line_items with missing columns

-- sales_orders: add service-expected columns
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS sales_order_no         VARCHAR(50)        AFTER company_id,
  ADD COLUMN IF NOT EXISTS bill_to                TEXT               AFTER customer_name,
  ADD COLUMN IF NOT EXISTS ship_to                TEXT               AFTER bill_to,
  ADD COLUMN IF NOT EXISTS reference_no           VARCHAR(100)       AFTER ship_to,
  ADD COLUMN IF NOT EXISTS po_number              VARCHAR(100)       AFTER reference_no,
  ADD COLUMN IF NOT EXISTS source_type            VARCHAR(50)        DEFAULT 'manual' AFTER po_number,
  ADD COLUMN IF NOT EXISTS due_date               DATE               AFTER order_date,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE               AFTER due_date,
  ADD COLUMN IF NOT EXISTS tax_id                 CHAR(36)           AFTER discount_amount,
  ADD COLUMN IF NOT EXISTS tax_rate               DECIMAL(7,4)       DEFAULT 0 AFTER tax_id,
  ADD COLUMN IF NOT EXISTS grand_total            DECIMAL(15,2)      DEFAULT 0 AFTER tax_rate,
  ADD COLUMN IF NOT EXISTS total_ordered_qty      DECIMAL(15,4)      DEFAULT 0 AFTER grand_total,
  ADD COLUMN IF NOT EXISTS total_delivered_qty    DECIMAL(15,4)      DEFAULT 0 AFTER total_ordered_qty,
  ADD COLUMN IF NOT EXISTS total_pending_qty      DECIMAL(15,4)      DEFAULT 0 AFTER total_delivered_qty,
  ADD COLUMN IF NOT EXISTS terms_and_conditions   TEXT               AFTER notes,
  ADD COLUMN IF NOT EXISTS internal_notes         TEXT               AFTER terms_and_conditions;

-- Populate sales_order_no from order_no for existing rows
UPDATE sales_orders SET sales_order_no = order_no WHERE sales_order_no IS NULL;

-- Add unique index on (company_id, sales_order_no)
ALTER TABLE sales_orders
  ADD UNIQUE INDEX IF NOT EXISTS uq_so_company_sono (company_id, sales_order_no);

-- sales_order_line_items: add service-expected columns
ALTER TABLE sales_order_line_items
  ADD COLUMN IF NOT EXISTS sales_order_id  CHAR(36)    AFTER id,
  ADD COLUMN IF NOT EXISTS line_number     INT         DEFAULT 0 AFTER sales_order_id,
  ADD COLUMN IF NOT EXISTS sku             VARCHAR(100) AFTER product_id,
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50)  DEFAULT 'pcs' AFTER description;

-- Populate sales_order_id from order_id for existing rows
UPDATE sales_order_line_items SET sales_order_id = order_id WHERE sales_order_id IS NULL;

-- Migration 013: Extend inventory_transactions for delivery note shipping
-- Adds missing columns and expands transaction_type CHECK to include 'delivery_note'

-- Add missing columns (IF NOT EXISTS so this is idempotent)
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS transaction_no  VARCHAR(100);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS sku             VARCHAR(100);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS balance_before  NUMERIC(15,4);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS stock_location  VARCHAR(100);

-- Make product_id nullable (items found only by SKU won't have a product_id on the line item)
ALTER TABLE inventory_transactions ALTER COLUMN product_id DROP NOT NULL;

-- Expand transaction_type CHECK to include 'delivery_note'
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'sale','purchase','adjustment','adjustment_in','adjustment_out',
    'opening_stock','write_off','transfer_in','transfer_out',
    'return_in','return_out','delivery_note'
  ));

-- ============================================================
-- Migration 003: Fix schema to match service layer
-- ============================================================

-- ============================================================
-- FIX: products table
-- ============================================================

-- Make product_no nullable (service doesn't generate it)
ALTER TABLE products ALTER COLUMN product_no DROP NOT NULL;

-- Drop old product_no unique constraint (auto-named by PG)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_company_id_product_no_key;

-- Fix product_type CHECK constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_type_check;
ALTER TABLE products ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('inventory','service','non-inventory'));
ALTER TABLE products ALTER COLUMN product_type SET DEFAULT 'inventory';

-- Rename unit_price -> selling_price, unit_cost -> cost_price (only if target doesn't already exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='unit_price')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='selling_price') THEN
    ALTER TABLE products RENAME COLUMN unit_price TO selling_price;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='unit_cost')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price') THEN
    ALTER TABLE products RENAME COLUMN unit_cost TO cost_price;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='reorder_point')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='reorder_level') THEN
    ALTER TABLE products RENAME COLUMN reorder_point TO reorder_level;
  END IF;
END $$;

-- Add missing product columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(15,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_location VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC(10,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_for_purchase BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure selling_price and cost_price exist (in case rename didn't run for fresh column)
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(15,4) DEFAULT 0;

-- ============================================================
-- FIX: document_sequences table
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_sequences' AND column_name='current_sequence')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_sequences' AND column_name='next_number') THEN
    ALTER TABLE document_sequences RENAME COLUMN current_sequence TO next_number;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_sequences' AND column_name='last_reset_date') THEN
    ALTER TABLE document_sequences DROP COLUMN last_reset_date;
  END IF;
END $$;

-- Ensure next_number starts at 1 (not 0)
ALTER TABLE document_sequences ALTER COLUMN next_number SET DEFAULT 1;
UPDATE document_sequences SET next_number = 1 WHERE next_number = 0;

ALTER TABLE document_sequences ADD COLUMN IF NOT EXISTS next_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE document_sequences ADD COLUMN IF NOT EXISTS padding INTEGER NOT NULL DEFAULT 4;
ALTER TABLE document_sequences ADD COLUMN IF NOT EXISTS include_date BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- FIX: audit_logs table
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='ip_address')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_ip') THEN
    ALTER TABLE audit_logs RENAME COLUMN ip_address TO user_ip;
  END IF;
END $$;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_ip VARCHAR(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS field_name VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changes JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================
-- FIX: document_status_history table
-- ============================================================
ALTER TABLE document_status_history ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- FIX: inventory_transactions - add 'adjustment' to allowed types
-- ============================================================
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'sale','purchase','adjustment','adjustment_in','adjustment_out',
    'opening_stock','write_off','transfer_in','transfer_out','return_in','return_out'
  ));

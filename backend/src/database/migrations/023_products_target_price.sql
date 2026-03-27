-- Migration 023: Add target_price column to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS target_price DECIMAL(15,2) DEFAULT 0 AFTER selling_price;

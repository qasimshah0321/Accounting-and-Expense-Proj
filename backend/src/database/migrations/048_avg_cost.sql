-- Add weighted average cost column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_cost DECIMAL(15,4) NOT NULL DEFAULT 0 AFTER cost_price;

-- Seed from cost_price for existing rows
UPDATE products SET avg_cost = COALESCE(cost_price, 0) WHERE avg_cost = 0;

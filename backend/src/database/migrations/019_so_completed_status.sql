-- Migration 019: Add 'completed' as valid status for sales_orders
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
ALTER TABLE sales_orders ADD CONSTRAINT sales_orders_status_check
  CHECK (status IN ('draft','confirmed','in_progress','partially_fulfilled','fulfilled','cancelled','completed'));

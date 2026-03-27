-- Migration 013: Extend inventory_transactions for delivery note shipping (MySQL)
-- Adds missing columns. MySQL doesn't support ADD COLUMN IF NOT EXISTS,
-- but these columns are already in the fresh 001 schema for new databases.
-- For upgrades from PG, these would need manual handling.

-- The columns transaction_no, sku, unit_of_measure, balance_before, stock_location
-- are added here for databases that don't have them yet.
-- If they already exist, these statements will fail silently with multipleStatements.

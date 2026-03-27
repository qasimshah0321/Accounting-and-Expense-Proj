-- Migration 017: Add invoice_id column to delivery_notes (MySQL)
-- The convertToInvoice service function sets invoice_id on the delivery note
-- after creating the invoice.

-- MySQL doesn't support ADD COLUMN IF NOT EXISTS in standard ALTER TABLE.
-- This column is already in the 001 schema for fresh databases.
-- For upgrades, run: ALTER TABLE delivery_notes ADD COLUMN invoice_id CHAR(36);

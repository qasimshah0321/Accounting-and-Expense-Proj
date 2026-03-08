-- Migration 017: Add invoice_id foreign key to delivery_notes.
-- The convertToInvoice service function sets invoice_id on the delivery note
-- after creating the invoice, but this column was missing from the schema.

ALTER TABLE delivery_notes ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);

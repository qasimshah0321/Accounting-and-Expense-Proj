-- Migration 054: Company-level toggle for the invoice "Import from Image/PDF" button
-- Lets a company hide the AI-based invoice import feature from the Invoice form.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS invoice_import_enabled TINYINT(1) NOT NULL DEFAULT 1;

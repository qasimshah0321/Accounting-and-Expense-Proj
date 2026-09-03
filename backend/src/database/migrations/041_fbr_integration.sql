-- Migration 041: Pakistan FBR (Federal Board of Revenue) POS API Integration
-- Adds per-company FBR credentials/config and per-invoice FBR submission tracking.

-- FBR config per company (stored as extensions on companies table)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS fbr_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fbr_pos_id VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_username VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_password_enc TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_sandbox_mode BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS fbr_ntn VARCHAR(20) DEFAULT NULL;

-- FBR submission data on invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS fbr_usin VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_invoice_token TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_qr_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_submission_status VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_submitted_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_error TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS buyer_ntn VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS buyer_cnic VARCHAR(15) DEFAULT NULL;

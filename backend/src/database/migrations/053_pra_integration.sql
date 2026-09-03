-- Migration 053: Punjab Revenue Authority (PRA) Fiscal Invoicing Integration
-- Adds PRA (PRAL eIMS / "Software Fiscal Device") config on companies and PRA
-- submission tracking on invoices — mirrors backend/src/modules/fbr/, built from
-- PRAL's "Technical Specification for Data Sharing through Software Fiscal
-- Device with PRA" v1.2.
--
-- Also introduces a company-level tax_authority switch so only one of FBR / PRA
-- is ever active for a company at a time; mutual exclusivity is enforced in the
-- fbr.service.ts / pra.service.ts config-save functions (enabling one forces the
-- other's *_enabled flag off and updates this column).

-- ── Active tax authority switch ─────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tax_authority VARCHAR(10) NOT NULL DEFAULT 'none'; -- none | fbr | pra

UPDATE companies SET tax_authority='fbr' WHERE fbr_enabled=TRUE AND tax_authority='none';

-- ── Company-level PRA config ────────────────────────────────────────────────
-- PRA issues separate POS IDs + Bearer tokens for Sandbox (Test POS ID) and
-- Production (Live POS ID) — both are kept so switching modes doesn't lose
-- credentials. Tokens are AES-encrypted the same way as fbr_security_token_enc.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS pra_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pra_sandbox_mode         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pra_pntn                 VARCHAR(20)  DEFAULT NULL,  -- Punjab National Tax Number
  ADD COLUMN IF NOT EXISTS pra_sandbox_pos_id       VARCHAR(50)  DEFAULT NULL,  -- Test POS ID (PRA portal → Generate Test POS)
  ADD COLUMN IF NOT EXISTS pra_sandbox_token_enc    TEXT         DEFAULT NULL,  -- Sandbox Bearer token (AES-encrypted)
  ADD COLUMN IF NOT EXISTS pra_production_pos_id    VARCHAR(50)  DEFAULT NULL,  -- Live POS ID (PRA portal → POS Details)
  ADD COLUMN IF NOT EXISTS pra_production_token_enc TEXT         DEFAULT NULL;  -- Production Bearer token (AES-encrypted)

-- ── Per-invoice PRA fields ──────────────────────────────────────────────────
-- PRA reuses hs_code (invoice_line_items/products, added in 052) as PCTCode,
-- and buyer_ntn / buyer_cnic (invoices, added in 041) as BuyerPNTN / BuyerCNIC —
-- no per-line-item PRA-only columns are needed beyond what FBR already added.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pra_invoice_type      VARCHAR(10)  DEFAULT 'New', -- New | Debit | Credit
  ADD COLUMN IF NOT EXISTS pra_ref_usin          VARCHAR(50)  DEFAULT NULL, -- own invoice_no of the original invoice (Debit/Credit only)
  ADD COLUMN IF NOT EXISTS pra_payment_mode      TINYINT      DEFAULT 1,   -- 1 Cash 2 Card 3 Gift Voucher 4 Loyalty Card 5 Mixed 6 Cheque
  ADD COLUMN IF NOT EXISTS pra_invoice_number    VARCHAR(100) DEFAULT NULL, -- PRA Fiscal Invoice Number
  ADD COLUMN IF NOT EXISTS pra_qr_url            VARCHAR(500) DEFAULT NULL, -- invoice-verification URL for the printed QR
  ADD COLUMN IF NOT EXISTS pra_submission_status VARCHAR(20)  DEFAULT NULL, -- submitted | failed
  ADD COLUMN IF NOT EXISTS pra_submitted_at      TIMESTAMP    NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pra_error             TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pra_response_json     TEXT         DEFAULT NULL; -- raw PRA response

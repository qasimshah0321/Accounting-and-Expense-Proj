-- Migration 026: Add extended columns to vendors table
-- The initial schema was minimal; the vendors service expects these extra columns.

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS contact_person  VARCHAR(255)    NULL AFTER name,
  ADD COLUMN IF NOT EXISTS mobile          VARCHAR(50)     NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS fax             VARCHAR(50)     NULL AFTER mobile,
  ADD COLUMN IF NOT EXISTS website         VARCHAR(255)    NULL AFTER fax,
  ADD COLUMN IF NOT EXISTS tax_id          VARCHAR(100)    NULL AFTER postal_code,
  ADD COLUMN IF NOT EXISTS payment_method  VARCHAR(50)     NULL AFTER payment_terms,
  ADD COLUMN IF NOT EXISTS vendor_type     VARCHAR(100)    NULL AFTER currency,
  ADD COLUMN IF NOT EXISTS vendor_group    VARCHAR(100)    NULL AFTER vendor_type,
  ADD COLUMN IF NOT EXISTS vendor_segment  VARCHAR(100)    NULL AFTER vendor_group;

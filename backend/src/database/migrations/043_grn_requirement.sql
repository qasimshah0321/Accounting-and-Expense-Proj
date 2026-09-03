-- Migration 043: GRN Requirement configuration at company level
-- Mirrors dn_requirement pattern: 'mandatory' forces PO→GRN→Bill flow,
-- 'optional' allows direct PO→Bill conversion (skipping GRN).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS grn_requirement ENUM('mandatory','optional') NOT NULL DEFAULT 'optional';

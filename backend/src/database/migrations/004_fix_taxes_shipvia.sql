-- ============================================================
-- Migration 004: Fix taxes and ship_via missing columns (MySQL)
-- ============================================================

-- Taxes: add tax_type, description, is_compound if they don't exist
-- In MySQL, columns already present will cause an error, so these are only
-- needed on first migration. The 001 schema already includes these in the
-- fresh MySQL version, but this is kept for compatibility with upgrades.

-- Ship_via: add carrier, service_type, estimated_days, tracking_url_template
-- Same note as above.

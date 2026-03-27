-- Migration 020: Extend customers table with missing columns
-- Adds contact_person, mobile, fax, website, split billing/shipping address fields,
-- customer_type, customer_group, customer_segment, tax_id

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS contact_person   VARCHAR(255)   AFTER name,
  ADD COLUMN IF NOT EXISTS mobile           VARCHAR(50)    AFTER phone,
  ADD COLUMN IF NOT EXISTS fax              VARCHAR(50)    AFTER mobile,
  ADD COLUMN IF NOT EXISTS website          VARCHAR(255)   AFTER fax,
  ADD COLUMN IF NOT EXISTS billing_city     VARCHAR(100)   AFTER billing_address,
  ADD COLUMN IF NOT EXISTS billing_state    VARCHAR(100)   AFTER billing_city,
  ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20) AFTER billing_state,
  ADD COLUMN IF NOT EXISTS billing_country  VARCHAR(100)   AFTER billing_postal_code,
  ADD COLUMN IF NOT EXISTS shipping_city    VARCHAR(100)   AFTER shipping_address,
  ADD COLUMN IF NOT EXISTS shipping_state   VARCHAR(100)   AFTER shipping_city,
  ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20) AFTER shipping_state,
  ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(100)   AFTER shipping_postal_code,
  ADD COLUMN IF NOT EXISTS tax_id           VARCHAR(100)   AFTER postal_code,
  ADD COLUMN IF NOT EXISTS customer_type    VARCHAR(50)    AFTER currency,
  ADD COLUMN IF NOT EXISTS customer_group   VARCHAR(100)   AFTER customer_type,
  ADD COLUMN IF NOT EXISTS customer_segment VARCHAR(100)   AFTER customer_group;

-- Migration 052: Pakistan FBR Digital Invoicing (DI) API Integration
-- Refactors the legacy POS ("imsp") FBR integration (migration 041) to the
-- current PRAL Digital Invoicing API (Technical Spec v1.12).
--
-- Auth model changes from username/password login to a single 5-year Bearer
-- "security token" issued by PRAL. Adds the seller profile fields, per-invoice
-- buyer fields, per-line-item FBR tax breakdown, product/customer FBR defaults,
-- and a local cache table for FBR reference data (provinces / HS codes / UoM /
-- rates / SROs) used to populate dropdowns.
--
-- Legacy columns from 041 (fbr_pos_id, fbr_username, fbr_password_enc) are left
-- in place (unused) to avoid a destructive drop.

-- ── Company-level FBR (DI) config ───────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS fbr_security_token_enc   TEXT         DEFAULT NULL,  -- AES-encrypted 5-yr Bearer token
  ADD COLUMN IF NOT EXISTS fbr_seller_business_name VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_seller_province      VARCHAR(50)  DEFAULT NULL,  -- must match FBR province list (ref 5.1)
  ADD COLUMN IF NOT EXISTS fbr_seller_address       VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_business_activity    VARCHAR(50)  DEFAULT NULL,  -- Manufacturer / Importer / Distributor / ...
  ADD COLUMN IF NOT EXISTS fbr_sector               VARCHAR(80)  DEFAULT NULL,  -- Steel / FMCG / Textile / Services / ...
  ADD COLUMN IF NOT EXISTS fbr_default_scenario_id  VARCHAR(10)  DEFAULT NULL;  -- e.g. SN001 (sandbox testing)

-- ── Per-invoice FBR (DI) fields ─────────────────────────────────────────────
-- buyer_ntn / buyer_cnic already added in migration 041.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS buyer_registration_type VARCHAR(20)  DEFAULT 'Unregistered', -- Registered / Unregistered
  ADD COLUMN IF NOT EXISTS buyer_province          VARCHAR(50)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS buyer_business_name     VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_scenario_id         VARCHAR(10)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_invoice_type        VARCHAR(30)  DEFAULT 'Sale Invoice', -- Sale Invoice / Debit Note
  ADD COLUMN IF NOT EXISTS fbr_response_json       TEXT         DEFAULT NULL;           -- raw FBR validationResponse

-- ── Per-line-item FBR (DI) fields ───────────────────────────────────────────
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS hs_code             VARCHAR(20)    DEFAULT NULL,  -- Harmonized System code, e.g. 0101.2100
  ADD COLUMN IF NOT EXISTS uom                 VARCHAR(60)    DEFAULT NULL,  -- Unit of Measurement (ref 5.6)
  ADD COLUMN IF NOT EXISTS sale_type           VARCHAR(120)   DEFAULT NULL,  -- e.g. "Goods at standard rate (default)"
  ADD COLUMN IF NOT EXISTS rate_desc           VARCHAR(120)   DEFAULT NULL,  -- rate string sent to FBR, e.g. "18%"
  ADD COLUMN IF NOT EXISTS sro_schedule_no     VARCHAR(60)    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sro_item_serial_no  VARCHAR(60)    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fixed_notified_value DECIMAL(15,2) DEFAULT 0,     -- fixedNotifiedValueOrRetailPrice
  ADD COLUMN IF NOT EXISTS sales_tax_withheld  DECIMAL(15,2)  DEFAULT 0,     -- salesTaxWithheldAtSource
  ADD COLUMN IF NOT EXISTS extra_tax           DECIMAL(15,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS further_tax         DECIMAL(15,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fed_payable         DECIMAL(15,2)  DEFAULT 0;

-- ── Product FBR defaults (line items inherit these) ─────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hs_code       VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_sale_type VARCHAR(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fbr_uom       VARCHAR(60)  DEFAULT NULL;

-- ── Customer FBR defaults (buyer fields inherit these) ──────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS ntn               VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cnic              VARCHAR(15) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS province          VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS registration_type VARCHAR(20) DEFAULT 'Unregistered';

-- ── Local cache of FBR reference data ───────────────────────────────────────
-- Populated on demand from the FBR reference APIs (provinces, HS codes, UoM,
-- sale-type→rate, doc types, SRO schedules/items). Used to drive dropdowns
-- without calling FBR on every form load.
CREATE TABLE IF NOT EXISTS fbr_reference_data (
  id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  company_id  CHAR(36)     NOT NULL,
  ref_type    VARCHAR(40)  NOT NULL,   -- provinces | doctypes | hscodes | uom | saletypes | sro | transtypes ...
  code        VARCHAR(120) NOT NULL,   -- id / HS code / province code (as string)
  description VARCHAR(1000) DEFAULT NULL,
  extra_json  TEXT         DEFAULT NULL, -- any extra attributes (rate value, uom id, etc.)
  synced_at   DATETIME     NOT NULL DEFAULT NOW(),
  created_at  DATETIME     NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_fbr_ref (company_id, ref_type, code),
  KEY idx_fbr_ref_lookup (company_id, ref_type),
  CONSTRAINT fk_fbr_ref_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Migration 039: Request for Quotation (RFQ) tables

CREATE TABLE IF NOT EXISTS rfqs (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id        CHAR(36) NOT NULL,
  rfq_no            VARCHAR(50) NOT NULL,
  vendor_id         CHAR(36),
  vendor_name       VARCHAR(255),
  vendor_address    TEXT,
  reference_no      VARCHAR(100),
  rfq_date          DATE NOT NULL,
  required_by_date  DATE,
  status            VARCHAR(50) NOT NULL DEFAULT 'draft',
  subtotal          DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_id            CHAR(36),
  tax_rate          DECIMAL(7,4) DEFAULT 0,
  tax_amount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  grand_total       DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  converted_to_po   BOOLEAN NOT NULL DEFAULT FALSE,
  purchase_order_id CHAR(36),
  created_by        CHAR(36),
  updated_by        CHAR(36),
  deleted_at        DATETIME,
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  updated_at        DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_rfqs_company_no (company_id, rfq_no),
  CONSTRAINT fk_rfqs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfq_line_items (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  rfq_id          CHAR(36) NOT NULL,
  line_number     INT DEFAULT 1,
  product_id      CHAR(36),
  sku             VARCHAR(100),
  description     VARCHAR(500) NOT NULL,
  ordered_qty     DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit_of_measure VARCHAR(50) DEFAULT 'pcs',
  rate            DECIMAL(15,4) NOT NULL DEFAULT 0,
  tax_id          CHAR(36),
  tax_rate        DECIMAL(7,4) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  updated_at      DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_rfq_li_rfq FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rfqs_company_id ON rfqs(company_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_vendor_id ON rfqs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_deleted_at ON rfqs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_rfq_li_rfq_id ON rfq_line_items(rfq_id);

-- Add document sequence for RFQ
INSERT IGNORE INTO document_sequences (id, company_id, document_type, prefix, next_number, padding, include_date, created_at, updated_at)
SELECT UUID(), id, 'rfq', 'RFQ', 1, 4, 0, NOW(), NOW() FROM companies;

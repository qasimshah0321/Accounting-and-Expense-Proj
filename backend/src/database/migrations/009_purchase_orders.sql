-- Purchase Orders module (MySQL)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                     CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id             CHAR(36) NOT NULL,
  purchase_order_no      VARCHAR(50) NOT NULL,
  vendor_id              CHAR(36),
  vendor_name            VARCHAR(255) NOT NULL,
  vendor_address         TEXT,
  reference_no           VARCHAR(100),
  order_date             DATE NOT NULL,
  expected_delivery_date DATE,
  due_date               DATE,
  status                 VARCHAR(50) NOT NULL DEFAULT 'draft',
  receipt_status         VARCHAR(50) NOT NULL DEFAULT 'unreceived',
  subtotal               DECIMAL(15,4) NOT NULL DEFAULT 0,
  tax_id                 CHAR(36),
  tax_rate               DECIMAL(8,4) NOT NULL DEFAULT 0,
  tax_amount             DECIMAL(15,4) NOT NULL DEFAULT 0,
  discount_amount        DECIMAL(15,4) NOT NULL DEFAULT 0,
  grand_total            DECIMAL(15,4) NOT NULL DEFAULT 0,
  total_ordered_qty      DECIMAL(15,4) NOT NULL DEFAULT 0,
  total_received_qty     DECIMAL(15,4) NOT NULL DEFAULT 0,
  notes                  TEXT,
  internal_notes         TEXT,
  created_by             CHAR(36),
  updated_by             CHAR(36),
  deleted_at             DATETIME,
  created_at             DATETIME NOT NULL DEFAULT NOW(),
  updated_at             DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_po_company_no (company_id, purchase_order_no),
  CONSTRAINT fk_po_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_order_line_items (
  id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  purchase_order_id   CHAR(36) NOT NULL,
  line_number         INT NOT NULL,
  product_id          CHAR(36),
  sku                 VARCHAR(100),
  description         TEXT NOT NULL,
  ordered_qty         DECIMAL(15,4) NOT NULL DEFAULT 0,
  received_qty        DECIMAL(15,4) NOT NULL DEFAULT 0,
  unit_of_measure     VARCHAR(50) NOT NULL DEFAULT 'pcs',
  rate                DECIMAL(15,4) NOT NULL DEFAULT 0,
  tax_id              CHAR(36),
  tax_rate            DECIMAL(8,4) NOT NULL DEFAULT 0,
  tax_amount          DECIMAL(15,4) NOT NULL DEFAULT 0,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_poli_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_po_company    ON purchase_orders(company_id);
CREATE INDEX idx_po_vendor     ON purchase_orders(vendor_id);
CREATE INDEX idx_po_status     ON purchase_orders(company_id, status);
CREATE INDEX idx_poli_po       ON purchase_order_line_items(purchase_order_id);

-- Seed document sequence for all existing companies
INSERT IGNORE INTO document_sequences (id, company_id, document_type, prefix, next_number, padding, include_date)
SELECT UUID(), id, 'purchase_order', 'PO', 1, 3, 0
FROM companies;

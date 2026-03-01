-- Purchase Orders module
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  purchase_order_no      VARCHAR(50) NOT NULL,
  vendor_id              UUID REFERENCES vendors(id),
  vendor_name            VARCHAR(255) NOT NULL,
  vendor_address         TEXT,
  reference_no           VARCHAR(100),
  order_date             DATE NOT NULL,
  expected_delivery_date DATE,
  due_date               DATE,
  status                 VARCHAR(50) NOT NULL DEFAULT 'draft',
  receipt_status         VARCHAR(50) NOT NULL DEFAULT 'unreceived',
  subtotal               NUMERIC(15,4) NOT NULL DEFAULT 0,
  tax_id                 UUID REFERENCES taxes(id),
  tax_rate               NUMERIC(8,4) NOT NULL DEFAULT 0,
  tax_amount             NUMERIC(15,4) NOT NULL DEFAULT 0,
  discount_amount        NUMERIC(15,4) NOT NULL DEFAULT 0,
  grand_total            NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_ordered_qty      NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_received_qty     NUMERIC(15,4) NOT NULL DEFAULT 0,
  notes                  TEXT,
  internal_notes         TEXT,
  created_by             UUID REFERENCES users(id),
  updated_by             UUID REFERENCES users(id),
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, purchase_order_no)
);

CREATE TABLE IF NOT EXISTS purchase_order_line_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_number         INTEGER NOT NULL,
  product_id          UUID REFERENCES products(id),
  sku                 VARCHAR(100),
  description         TEXT NOT NULL,
  ordered_qty         NUMERIC(15,4) NOT NULL DEFAULT 0,
  received_qty        NUMERIC(15,4) NOT NULL DEFAULT 0,
  unit_of_measure     VARCHAR(50) NOT NULL DEFAULT 'pcs',
  rate                NUMERIC(15,4) NOT NULL DEFAULT 0,
  tax_id              UUID REFERENCES taxes(id),
  tax_rate            NUMERIC(8,4) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(15,4) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_company    ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor     ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_status     ON purchase_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_poli_po       ON purchase_order_line_items(purchase_order_id);

-- Seed document sequence for all existing companies
INSERT INTO document_sequences (company_id, document_type, prefix, next_number, padding, include_date)
SELECT id, 'purchase_order', 'PO', 1, 3, false
FROM companies
ON CONFLICT (company_id, document_type) DO NOTHING;

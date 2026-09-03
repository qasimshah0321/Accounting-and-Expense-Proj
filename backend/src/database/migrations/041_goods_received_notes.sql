-- Migration 041: Goods Received Notes (GRN)

CREATE TABLE IF NOT EXISTS goods_received_notes (
  id                  CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  company_id          CHAR(36) NOT NULL,
  grn_no              VARCHAR(50),
  purchase_order_id   CHAR(36) DEFAULT NULL,
  vendor_id           CHAR(36) DEFAULT NULL,
  vendor_name         VARCHAR(255),
  vendor_address      TEXT,
  reference_no        VARCHAR(100),
  receipt_date        DATE NOT NULL,
  expected_date       DATE DEFAULT NULL,
  carrier             VARCHAR(100),
  tracking_number     VARCHAR(100),
  deliver_to          TEXT,
  status              VARCHAR(50) DEFAULT 'draft',
  billed              TINYINT(1) DEFAULT 0,
  total_ordered_qty   DECIMAL(15,4) DEFAULT 0,
  total_received_qty  DECIMAL(15,4) DEFAULT 0,
  total_pending_qty   DECIMAL(15,4) DEFAULT 0,
  bill_id             CHAR(36) DEFAULT NULL,
  notes               TEXT,
  internal_notes      TEXT,
  created_by          CHAR(36),
  updated_by          CHAR(36),
  deleted_at          DATETIME DEFAULT NULL,
  created_at          DATETIME DEFAULT NOW(),
  updated_at          DATETIME DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_received_note_line_items (
  id                             CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  company_id                     CHAR(36) NOT NULL,
  grn_id                         CHAR(36) NOT NULL,
  line_number                    INT,
  purchase_order_line_item_id    CHAR(36) DEFAULT NULL,
  product_id                     CHAR(36) DEFAULT NULL,
  sku                            VARCHAR(100),
  description                    TEXT,
  ordered_qty                    DECIMAL(15,4) DEFAULT 0,
  received_qty                   DECIMAL(15,4) DEFAULT 0,
  pending_qty                    DECIMAL(15,4) DEFAULT 0,
  billed_qty                     DECIMAL(15,4) DEFAULT 0,
  unit_of_measure                VARCHAR(50) DEFAULT 'pcs',
  unit_cost                      DECIMAL(15,4) DEFAULT 0,
  inventory_added                TINYINT(1) DEFAULT 0,
  created_at                     DATETIME DEFAULT NOW()
);

-- Seed GRN document sequence for all existing companies
INSERT IGNORE INTO document_sequences (company_id, document_type, prefix, next_number, padding, include_date)
SELECT id, 'goods_received_note', 'GRN', 1, 3, false
FROM companies;

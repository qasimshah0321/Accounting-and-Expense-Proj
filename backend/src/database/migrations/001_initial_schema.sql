-- ============================================================
-- ERP System - Initial Schema Migration (MySQL)
-- ============================================================

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(50),
  address       TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  country       VARCHAR(100),
  postal_code   VARCHAR(20),
  tax_number    VARCHAR(100),
  currency      VARCHAR(10) NOT NULL DEFAULT 'USD',
  timezone      VARCHAR(100) NOT NULL DEFAULT 'UTC',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT NOW(),
  updated_at    DATETIME NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id    CHAR(36) NOT NULL,
  username      VARCHAR(100),
  name          VARCHAR(255),
  first_name    VARCHAR(100),
  last_name     VARCHAR(100),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'user',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_login    DATETIME,
  refresh_token TEXT,
  deleted_at    DATETIME,
  created_at    DATETIME NOT NULL DEFAULT NOW(),
  updated_at    DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_users_company_email (company_id, email),
  CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id      CHAR(36) NOT NULL,
  customer_no     VARCHAR(50) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  billing_address TEXT,
  shipping_address TEXT,
  city            VARCHAR(100),
  state           VARCHAR(100),
  country         VARCHAR(100),
  postal_code     VARCHAR(20),
  tax_number      VARCHAR(100),
  credit_limit    DECIMAL(15,2) DEFAULT 0,
  payment_terms   INT DEFAULT 30,
  currency        VARCHAR(10) DEFAULT 'USD',
  notes           TEXT,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_by      CHAR(36),
  updated_by      CHAR(36),
  deleted_at      DATETIME,
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  updated_at      DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_customers_company_no (company_id, customer_no),
  CONSTRAINT fk_customers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id      CHAR(36) NOT NULL,
  vendor_no       VARCHAR(50) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  address         TEXT,
  city            VARCHAR(100),
  state           VARCHAR(100),
  country         VARCHAR(100),
  postal_code     VARCHAR(20),
  tax_number      VARCHAR(100),
  payment_terms   INT DEFAULT 30,
  currency        VARCHAR(10) DEFAULT 'USD',
  bank_name       VARCHAR(255),
  bank_account    VARCHAR(100),
  notes           TEXT,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_by      CHAR(36),
  updated_by      CHAR(36),
  deleted_at      DATETIME,
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  updated_at      DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_vendors_company_no (company_id, vendor_no),
  CONSTRAINT fk_vendors_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_vendors_company_id ON vendors(company_id);
CREATE INDEX idx_vendors_deleted_at ON vendors(deleted_at);

-- ============================================================
-- TAXES
-- ============================================================
CREATE TABLE IF NOT EXISTS taxes (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id    CHAR(36) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  rate          DECIMAL(7,4) NOT NULL,
  type          VARCHAR(50) NOT NULL DEFAULT 'percentage',
  is_default    TINYINT(1) NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_by    CHAR(36),
  updated_by    CHAR(36),
  deleted_at    DATETIME,
  created_at    DATETIME NOT NULL DEFAULT NOW(),
  updated_at    DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_taxes_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_taxes_company_id ON taxes(company_id);

-- ============================================================
-- SHIP VIA
-- ============================================================
CREATE TABLE IF NOT EXISTS ship_via (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id    CHAR(36) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_by    CHAR(36),
  updated_by    CHAR(36),
  deleted_at    DATETIME,
  created_at    DATETIME NOT NULL DEFAULT NOW(),
  updated_at    DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ship_via_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_ship_via_company_id ON ship_via(company_id);

-- ============================================================
-- STOCK LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_locations (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id    CHAR(36) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  code          VARCHAR(50) NOT NULL,
  description   TEXT,
  is_default    TINYINT(1) NOT NULL DEFAULT 0,
  created_by    CHAR(36),
  updated_by    CHAR(36),
  deleted_at    DATETIME,
  created_at    DATETIME NOT NULL DEFAULT NOW(),
  updated_at    DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_stock_locations_company_code (company_id, code),
  CONSTRAINT fk_stock_locations_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_stock_locations_company_id ON stock_locations(company_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id        CHAR(36) NOT NULL,
  product_no        VARCHAR(50),
  sku               VARCHAR(100) NOT NULL,
  barcode           VARCHAR(100),
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  product_type      VARCHAR(50) NOT NULL DEFAULT 'inventory',
  category          VARCHAR(100),
  subcategory       VARCHAR(100),
  brand             VARCHAR(100),
  manufacturer      VARCHAR(100),
  cost_price        DECIMAL(15,2) NOT NULL DEFAULT 0,
  selling_price     DECIMAL(15,2) NOT NULL DEFAULT 0,
  wholesale_price   DECIMAL(15,2),
  currency          VARCHAR(10) DEFAULT 'USD',
  unit_of_measure   VARCHAR(50) DEFAULT 'pcs',
  track_inventory   TINYINT(1) NOT NULL DEFAULT 1,
  current_stock     DECIMAL(15,4) NOT NULL DEFAULT 0,
  reorder_level     DECIMAL(15,4) DEFAULT 0,
  reorder_quantity  DECIMAL(15,4) DEFAULT 0,
  stock_location    VARCHAR(100),
  tax_id            CHAR(36),
  is_taxable        TINYINT(1) NOT NULL DEFAULT 1,
  weight            DECIMAL(10,4),
  weight_unit       VARCHAR(20),
  dimensions        VARCHAR(100),
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  is_for_sale       TINYINT(1) NOT NULL DEFAULT 1,
  is_for_purchase   TINYINT(1) NOT NULL DEFAULT 1,
  image_url         TEXT,
  notes             TEXT,
  created_by        CHAR(36),
  updated_by        CHAR(36),
  deleted_at        DATETIME,
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  updated_at        DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_products_company_sku (company_id, sku),
  CONSTRAINT fk_products_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_products_sku ON products(company_id, sku);

-- ============================================================
-- PRODUCT STOCK LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_stock_locations (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id        CHAR(36) NOT NULL,
  product_id        CHAR(36) NOT NULL,
  location_id       CHAR(36) NOT NULL,
  quantity_on_hand  DECIMAL(15,4) NOT NULL DEFAULT 0,
  updated_at        DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_psl_product_location (product_id, location_id),
  CONSTRAINT fk_psl_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_psl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_psl_location FOREIGN KEY (location_id) REFERENCES stock_locations(id) ON DELETE CASCADE
);
CREATE INDEX idx_psl_company_id ON product_stock_locations(company_id);
CREATE INDEX idx_psl_product_id ON product_stock_locations(product_id);

-- ============================================================
-- INVENTORY TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id        CHAR(36) NOT NULL,
  product_id        CHAR(36),
  location_id       CHAR(36),
  transaction_type  VARCHAR(50) NOT NULL,
  quantity          DECIMAL(15,4) NOT NULL,
  balance_after     DECIMAL(15,4),
  reference_type    VARCHAR(50),
  reference_id      CHAR(36),
  reference_no      VARCHAR(100),
  transaction_date  DATE NOT NULL DEFAULT (CURDATE()),
  notes             TEXT,
  created_by        CHAR(36),
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_inv_tx_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_inv_tx_company_id ON inventory_transactions(company_id);
CREATE INDEX idx_inv_tx_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inv_tx_date ON inventory_transactions(transaction_date);

-- ============================================================
-- DOCUMENT SEQUENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS document_sequences (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id        CHAR(36) NOT NULL,
  document_type     VARCHAR(50) NOT NULL,
  prefix            VARCHAR(20) NOT NULL,
  next_number       INT NOT NULL DEFAULT 1,
  padding           INT NOT NULL DEFAULT 4,
  include_date      TINYINT(1) NOT NULL DEFAULT 1,
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  updated_at        DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_doc_seq_company_type (company_id, document_type),
  CONSTRAINT fk_doc_seq_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_doc_seq_company_id ON document_sequences(company_id);

-- ============================================================
-- ESTIMATES
-- ============================================================
CREATE TABLE IF NOT EXISTS estimates (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id        CHAR(36) NOT NULL,
  estimate_no       VARCHAR(50) NOT NULL,
  customer_id       CHAR(36),
  customer_name     VARCHAR(255),
  customer_address  TEXT,
  ship_to_address   TEXT,
  ship_via_id       CHAR(36),
  estimate_date     DATE NOT NULL,
  expiry_date       DATE,
  status            VARCHAR(50) NOT NULL DEFAULT 'draft',
  subtotal          DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount   DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  terms             TEXT,
  converted_to_so   CHAR(36),
  created_by        CHAR(36),
  updated_by        CHAR(36),
  deleted_at        DATETIME,
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  updated_at        DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_estimates_company_no (company_id, estimate_no),
  CONSTRAINT fk_estimates_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_estimates_company_id ON estimates(company_id);
CREATE INDEX idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_deleted_at ON estimates(deleted_at);

-- ============================================================
-- ESTIMATE LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id      CHAR(36) NOT NULL,
  estimate_id     CHAR(36) NOT NULL,
  product_id      CHAR(36),
  description     VARCHAR(500),
  ordered_qty     DECIMAL(15,4) NOT NULL DEFAULT 1,
  rate            DECIMAL(15,4) NOT NULL DEFAULT 0,
  discount        DECIMAL(7,4) DEFAULT 0,
  tax_id          CHAR(36),
  tax_rate        DECIMAL(7,4) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  line_total      DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order      INT DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  updated_at      DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_est_li_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_est_li_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);
CREATE INDEX idx_est_li_estimate_id ON estimate_line_items(estimate_id);

-- ============================================================
-- SALES ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_orders (
  id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id          CHAR(36) NOT NULL,
  order_no            VARCHAR(50) NOT NULL,
  estimate_id         CHAR(36),
  customer_id         CHAR(36),
  customer_name       VARCHAR(255),
  customer_address    TEXT,
  ship_to_address     TEXT,
  ship_via_id         CHAR(36),
  order_date          DATE NOT NULL,
  expected_ship_date  DATE,
  status              VARCHAR(50) NOT NULL DEFAULT 'draft',
  fulfillment_status  VARCHAR(50) NOT NULL DEFAULT 'unfulfilled',
  subtotal            DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  terms               TEXT,
  created_by          CHAR(36),
  updated_by          CHAR(36),
  deleted_at          DATETIME,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_sales_orders_company_no (company_id, order_no),
  CONSTRAINT fk_so_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_so_company_id ON sales_orders(company_id);
CREATE INDEX idx_so_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_so_status ON sales_orders(status);
CREATE INDEX idx_so_deleted_at ON sales_orders(deleted_at);

-- ============================================================
-- SALES ORDER LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_order_line_items (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id      CHAR(36) NOT NULL,
  order_id        CHAR(36) NOT NULL,
  product_id      CHAR(36),
  description     VARCHAR(500),
  ordered_qty     DECIMAL(15,4) NOT NULL DEFAULT 1,
  delivered_qty   DECIMAL(15,4) NOT NULL DEFAULT 0,
  pending_qty     DECIMAL(15,4) GENERATED ALWAYS AS (ordered_qty - delivered_qty) STORED,
  rate            DECIMAL(15,4) NOT NULL DEFAULT 0,
  discount        DECIMAL(7,4) DEFAULT 0,
  tax_id          CHAR(36),
  tax_rate        DECIMAL(7,4) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  line_total      DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order      INT DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  updated_at      DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_so_li_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_so_li_order FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_so_li_order_id ON sales_order_line_items(order_id);

-- ============================================================
-- DELIVERY NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_notes (
  id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id          CHAR(36) NOT NULL,
  delivery_no         VARCHAR(50) NOT NULL,
  order_id            CHAR(36),
  customer_id         CHAR(36),
  customer_name       VARCHAR(255),
  ship_to_address     TEXT,
  ship_via_id         CHAR(36),
  delivery_date       DATE NOT NULL,
  shipped_date        DATE,
  delivered_date      DATE,
  status              VARCHAR(50) NOT NULL DEFAULT 'draft',
  tracking_number     VARCHAR(100),
  invoiced            TINYINT(1) NOT NULL DEFAULT 0,
  notes               TEXT,
  created_by          CHAR(36),
  updated_by          CHAR(36),
  deleted_at          DATETIME,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_delivery_notes_company_no (company_id, delivery_no),
  CONSTRAINT fk_dn_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_dn_company_id ON delivery_notes(company_id);
CREATE INDEX idx_dn_order_id ON delivery_notes(order_id);
CREATE INDEX idx_dn_status ON delivery_notes(status);
CREATE INDEX idx_dn_deleted_at ON delivery_notes(deleted_at);

-- ============================================================
-- DELIVERY NOTE LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_note_line_items (
  id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id          CHAR(36) NOT NULL,
  delivery_note_id    CHAR(36) NOT NULL,
  order_line_item_id  CHAR(36),
  product_id          CHAR(36),
  description         VARCHAR(500),
  ordered_qty         DECIMAL(15,4) DEFAULT 0,
  shipped_qty         DECIMAL(15,4) NOT NULL DEFAULT 0,
  inventory_deducted  TINYINT(1) NOT NULL DEFAULT 0,
  sort_order          INT DEFAULT 0,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_dn_li_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_dn_li_delivery_note FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE CASCADE
);
CREATE INDEX idx_dn_li_delivery_note_id ON delivery_note_line_items(delivery_note_id);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id        CHAR(36) NOT NULL,
  invoice_no        VARCHAR(50) NOT NULL,
  order_id          CHAR(36),
  delivery_note_id  CHAR(36),
  customer_id       CHAR(36),
  customer_name     VARCHAR(255),
  billing_address   TEXT,
  ship_to_address   TEXT,
  invoice_date      DATE NOT NULL,
  due_date          DATE,
  status            VARCHAR(50) NOT NULL DEFAULT 'draft',
  payment_status    VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  subtotal          DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount   DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid       DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_due        DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  terms             TEXT,
  created_by        CHAR(36),
  updated_by        CHAR(36),
  deleted_at        DATETIME,
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  updated_at        DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_invoices_company_no (company_id, invoice_no),
  CONSTRAINT fk_inv_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_inv_company_id ON invoices(company_id);
CREATE INDEX idx_inv_customer_id ON invoices(customer_id);
CREATE INDEX idx_inv_status ON invoices(status);
CREATE INDEX idx_inv_payment_status ON invoices(payment_status);
CREATE INDEX idx_inv_due_date ON invoices(due_date);
CREATE INDEX idx_inv_deleted_at ON invoices(deleted_at);

-- ============================================================
-- INVOICE LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id      CHAR(36) NOT NULL,
  invoice_id      CHAR(36) NOT NULL,
  product_id      CHAR(36),
  description     VARCHAR(500),
  quantity        DECIMAL(15,4) NOT NULL DEFAULT 1,
  rate            DECIMAL(15,4) NOT NULL DEFAULT 0,
  discount        DECIMAL(7,4) DEFAULT 0,
  tax_id          CHAR(36),
  tax_rate        DECIMAL(7,4) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  line_total      DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order      INT DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  updated_at      DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_inv_li_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_li_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX idx_inv_li_invoice_id ON invoice_line_items(invoice_id);

-- ============================================================
-- CUSTOMER PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_payments (
  id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id          CHAR(36) NOT NULL,
  payment_no          VARCHAR(50) NOT NULL,
  customer_id         CHAR(36) NOT NULL,
  invoice_id          CHAR(36),
  payment_date        DATE NOT NULL,
  amount              DECIMAL(15,2) NOT NULL,
  unallocated_amount  DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method      VARCHAR(50) NOT NULL,
  reference_no        VARCHAR(100),
  notes               TEXT,
  created_by          CHAR(36),
  updated_by          CHAR(36),
  deleted_at          DATETIME,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_cp_company_no (company_id, payment_no),
  CONSTRAINT fk_cp_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_cp_company_id ON customer_payments(company_id);
CREATE INDEX idx_cp_customer_id ON customer_payments(customer_id);
CREATE INDEX idx_cp_deleted_at ON customer_payments(deleted_at);

-- ============================================================
-- BILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id      CHAR(36) NOT NULL,
  bill_no         VARCHAR(50) NOT NULL,
  vendor_id       CHAR(36),
  vendor_name     VARCHAR(255),
  vendor_invoice_no VARCHAR(100),
  bill_date       DATE NOT NULL,
  due_date        DATE,
  status          VARCHAR(50) NOT NULL DEFAULT 'draft',
  payment_status  VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  subtotal        DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid     DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_due      DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      CHAR(36),
  updated_by      CHAR(36),
  deleted_at      DATETIME,
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  updated_at      DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_bills_company_no (company_id, bill_no),
  CONSTRAINT fk_bills_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_bills_company_id ON bills(company_id);
CREATE INDEX idx_bills_vendor_id ON bills(vendor_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_payment_status ON bills(payment_status);
CREATE INDEX idx_bills_due_date ON bills(due_date);
CREATE INDEX idx_bills_deleted_at ON bills(deleted_at);

-- ============================================================
-- BILL LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_line_items (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id      CHAR(36) NOT NULL,
  bill_id         CHAR(36) NOT NULL,
  product_id      CHAR(36),
  description     VARCHAR(500),
  quantity        DECIMAL(15,4) NOT NULL DEFAULT 1,
  rate            DECIMAL(15,4) NOT NULL DEFAULT 0,
  discount        DECIMAL(7,4) DEFAULT 0,
  tax_id          CHAR(36),
  tax_rate        DECIMAL(7,4) DEFAULT 0,
  tax_amount      DECIMAL(15,2) DEFAULT 0,
  line_total      DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order      INT DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT NOW(),
  updated_at      DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_bill_li_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_li_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);
CREATE INDEX idx_bill_li_bill_id ON bill_line_items(bill_id);

-- ============================================================
-- VENDOR PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_payments (
  id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id          CHAR(36) NOT NULL,
  payment_no          VARCHAR(50) NOT NULL,
  vendor_id           CHAR(36) NOT NULL,
  bill_id             CHAR(36),
  payment_date        DATE NOT NULL,
  amount              DECIMAL(15,2) NOT NULL,
  unallocated_amount  DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method      VARCHAR(50) NOT NULL,
  reference_no        VARCHAR(100),
  notes               TEXT,
  created_by          CHAR(36),
  updated_by          CHAR(36),
  deleted_at          DATETIME,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_vp_company_no (company_id, payment_no),
  CONSTRAINT fk_vp_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_vp_company_id ON vendor_payments(company_id);
CREATE INDEX idx_vp_vendor_id ON vendor_payments(vendor_id);
CREATE INDEX idx_vp_deleted_at ON vendor_payments(deleted_at);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id        CHAR(36) NOT NULL,
  expense_no        VARCHAR(50) NOT NULL,
  vendor_id         CHAR(36),
  payee_name        VARCHAR(255),
  expense_category  VARCHAR(100) NOT NULL,
  expense_account   VARCHAR(100),
  reference_no      VARCHAR(100),
  invoice_no        VARCHAR(100),
  expense_date      DATE NOT NULL,
  amount            DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_id            CHAR(36),
  tax_amount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount      DECIMAL(15,2) GENERATED ALWAYS AS (amount + tax_amount) STORED,
  payment_method    VARCHAR(50),
  status            VARCHAR(50) NOT NULL DEFAULT 'draft',
  payment_status    VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  paid_date         DATE,
  description       TEXT,
  notes             TEXT,
  created_by        CHAR(36),
  updated_by        CHAR(36),
  deleted_at        DATETIME,
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  updated_at        DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_expenses_company_no (company_id, expense_no),
  CONSTRAINT fk_exp_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_exp_company_id ON expenses(company_id);
CREATE INDEX idx_exp_deleted_at ON expenses(deleted_at);
CREATE INDEX idx_exp_status ON expenses(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id    CHAR(36) NOT NULL,
  user_id       CHAR(36),
  user_name     VARCHAR(255),
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(100) NOT NULL,
  entity_id     CHAR(36),
  user_ip       VARCHAR(45),
  field_name    VARCHAR(100),
  old_value     TEXT,
  new_value     TEXT,
  changes       JSON,
  description   TEXT,
  created_at    DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_audit_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- ============================================================
-- DOCUMENT STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS document_status_history (
  id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id        CHAR(36) NOT NULL,
  document_type     VARCHAR(50) NOT NULL,
  document_id       CHAR(36) NOT NULL,
  document_no       VARCHAR(100),
  from_status       VARCHAR(50),
  to_status         VARCHAR(50) NOT NULL,
  changed_by        CHAR(36),
  changed_by_name   VARCHAR(255),
  reason            TEXT,
  notes             TEXT,
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_dsh_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_dsh_company_id ON document_status_history(company_id);
CREATE INDEX idx_dsh_document ON document_status_history(document_type, document_id);

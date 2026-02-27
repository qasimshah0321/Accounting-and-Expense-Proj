-- ============================================================
-- ERP System - Initial Schema Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  username      VARCHAR(100),
  name          VARCHAR(255),
  first_name    VARCHAR(100),
  last_name     VARCHAR(100),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','manager','user','viewer')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  refresh_token TEXT,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  credit_limit    NUMERIC(15,2) DEFAULT 0,
  payment_terms   INTEGER DEFAULT 30,
  currency        VARCHAR(10) DEFAULT 'USD',
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, customer_no)
);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  payment_terms   INTEGER DEFAULT 30,
  currency        VARCHAR(10) DEFAULT 'USD',
  bank_name       VARCHAR(255),
  bank_account    VARCHAR(100),
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, vendor_no)
);
CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_at ON vendors(deleted_at);

-- ============================================================
-- TAXES
-- ============================================================
CREATE TABLE IF NOT EXISTS taxes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  rate          NUMERIC(7,4) NOT NULL,
  type          VARCHAR(50) NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage','fixed')),
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES users(id),
  updated_by    UUID REFERENCES users(id),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_taxes_company_id ON taxes(company_id);

-- ============================================================
-- SHIP VIA
-- ============================================================
CREATE TABLE IF NOT EXISTS ship_via (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES users(id),
  updated_by    UUID REFERENCES users(id),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ship_via_company_id ON ship_via(company_id);

-- ============================================================
-- STOCK LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_locations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  code          VARCHAR(50) NOT NULL,
  description   TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES users(id),
  updated_by    UUID REFERENCES users(id),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);
CREATE INDEX IF NOT EXISTS idx_stock_locations_company_id ON stock_locations(company_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_no        VARCHAR(50),
  sku               VARCHAR(100) NOT NULL,
  barcode           VARCHAR(100),
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  product_type      VARCHAR(50) NOT NULL DEFAULT 'inventory' CHECK (product_type IN ('inventory','service','non-inventory')),
  category          VARCHAR(100),
  subcategory       VARCHAR(100),
  brand             VARCHAR(100),
  manufacturer      VARCHAR(100),
  cost_price        NUMERIC(15,2) NOT NULL DEFAULT 0,
  selling_price     NUMERIC(15,2) NOT NULL DEFAULT 0,
  wholesale_price   NUMERIC(15,2),
  currency          VARCHAR(10) DEFAULT 'USD',
  unit_of_measure   VARCHAR(50) DEFAULT 'pcs',
  track_inventory   BOOLEAN NOT NULL DEFAULT TRUE,
  current_stock     NUMERIC(15,4) NOT NULL DEFAULT 0,
  reorder_level     NUMERIC(15,4) DEFAULT 0,
  reorder_quantity  NUMERIC(15,4) DEFAULT 0,
  stock_location    VARCHAR(100),
  tax_id            UUID REFERENCES taxes(id),
  is_taxable        BOOLEAN NOT NULL DEFAULT TRUE,
  weight            NUMERIC(10,4),
  weight_unit       VARCHAR(20),
  dimensions        VARCHAR(100),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_for_sale       BOOLEAN NOT NULL DEFAULT TRUE,
  is_for_purchase   BOOLEAN NOT NULL DEFAULT TRUE,
  image_url         TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id),
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(company_id, sku);

-- ============================================================
-- PRODUCT STOCK LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_stock_locations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id       UUID NOT NULL REFERENCES stock_locations(id) ON DELETE CASCADE,
  quantity_on_hand  NUMERIC(15,4) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_psl_company_id ON product_stock_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_psl_product_id ON product_stock_locations(product_id);

-- ============================================================
-- INVENTORY TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  location_id       UUID REFERENCES stock_locations(id),
  transaction_type  VARCHAR(50) NOT NULL CHECK (transaction_type IN (
    'sale','purchase','adjustment','adjustment_in','adjustment_out','opening_stock','write_off',
    'transfer_in','transfer_out','return_in','return_out'
  )),
  quantity          NUMERIC(15,4) NOT NULL,
  balance_after     NUMERIC(15,4),
  reference_type    VARCHAR(50),
  reference_id      UUID,
  reference_no      VARCHAR(100),
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_tx_company_id ON inventory_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_date ON inventory_transactions(transaction_date);

-- ============================================================
-- DOCUMENT SEQUENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS document_sequences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type     VARCHAR(50) NOT NULL,
  prefix            VARCHAR(20) NOT NULL,
  next_number       INTEGER NOT NULL DEFAULT 1,
  padding           INTEGER NOT NULL DEFAULT 4,
  include_date      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, document_type)
);
CREATE INDEX IF NOT EXISTS idx_doc_seq_company_id ON document_sequences(company_id);

-- ============================================================
-- ESTIMATES
-- ============================================================
CREATE TABLE IF NOT EXISTS estimates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  estimate_no       VARCHAR(50) NOT NULL,
  customer_id       UUID REFERENCES customers(id),
  customer_name     VARCHAR(255),
  customer_address  TEXT,
  ship_to_address   TEXT,
  ship_via_id       UUID REFERENCES ship_via(id),
  estimate_date     DATE NOT NULL,
  expiry_date       DATE,
  status            VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  subtotal          NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  terms             TEXT,
  converted_to_so   UUID,
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id),
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, estimate_no)
);
CREATE INDEX IF NOT EXISTS idx_estimates_company_id ON estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_deleted_at ON estimates(deleted_at);

-- ============================================================
-- ESTIMATE LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  estimate_id     UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  description     VARCHAR(500),
  ordered_qty     NUMERIC(15,4) NOT NULL DEFAULT 1,
  rate            NUMERIC(15,4) NOT NULL DEFAULT 0,
  discount        NUMERIC(7,4) DEFAULT 0,
  tax_id          UUID REFERENCES taxes(id),
  tax_rate        NUMERIC(7,4) DEFAULT 0,
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  line_total      NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_est_li_estimate_id ON estimate_line_items(estimate_id);

-- ============================================================
-- SALES ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_no            VARCHAR(50) NOT NULL,
  estimate_id         UUID REFERENCES estimates(id),
  customer_id         UUID REFERENCES customers(id),
  customer_name       VARCHAR(255),
  customer_address    TEXT,
  ship_to_address     TEXT,
  ship_via_id         UUID REFERENCES ship_via(id),
  order_date          DATE NOT NULL,
  expected_ship_date  DATE,
  status              VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','in_progress','partially_fulfilled','fulfilled','cancelled')),
  fulfillment_status  VARCHAR(50) NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled','partially_fulfilled','fulfilled')),
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  terms               TEXT,
  created_by          UUID REFERENCES users(id),
  updated_by          UUID REFERENCES users(id),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, order_no)
);
CREATE INDEX IF NOT EXISTS idx_so_company_id ON sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_so_customer_id ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_so_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_deleted_at ON sales_orders(deleted_at);

-- ============================================================
-- SALES ORDER LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_order_line_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  description     VARCHAR(500),
  ordered_qty     NUMERIC(15,4) NOT NULL DEFAULT 1,
  delivered_qty   NUMERIC(15,4) NOT NULL DEFAULT 0,
  pending_qty     NUMERIC(15,4) GENERATED ALWAYS AS (ordered_qty - delivered_qty) STORED,
  rate            NUMERIC(15,4) NOT NULL DEFAULT 0,
  discount        NUMERIC(7,4) DEFAULT 0,
  tax_id          UUID REFERENCES taxes(id),
  tax_rate        NUMERIC(7,4) DEFAULT 0,
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  line_total      NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_so_li_order_id ON sales_order_line_items(order_id);

-- ============================================================
-- DELIVERY NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_notes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  delivery_no         VARCHAR(50) NOT NULL,
  order_id            UUID REFERENCES sales_orders(id),
  customer_id         UUID REFERENCES customers(id),
  customer_name       VARCHAR(255),
  ship_to_address     TEXT,
  ship_via_id         UUID REFERENCES ship_via(id),
  delivery_date       DATE NOT NULL,
  shipped_date        DATE,
  delivered_date      DATE,
  status              VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready_to_ship','shipped','in_transit','delivered','cancelled')),
  tracking_number     VARCHAR(100),
  invoiced            BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  updated_by          UUID REFERENCES users(id),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, delivery_no)
);
CREATE INDEX IF NOT EXISTS idx_dn_company_id ON delivery_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_dn_order_id ON delivery_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_dn_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_dn_deleted_at ON delivery_notes(deleted_at);

-- ============================================================
-- DELIVERY NOTE LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_note_line_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  delivery_note_id    UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  order_line_item_id  UUID REFERENCES sales_order_line_items(id),
  product_id          UUID REFERENCES products(id),
  description         VARCHAR(500),
  ordered_qty         NUMERIC(15,4) DEFAULT 0,
  shipped_qty         NUMERIC(15,4) NOT NULL DEFAULT 0,
  inventory_deducted  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dn_li_delivery_note_id ON delivery_note_line_items(delivery_note_id);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_no        VARCHAR(50) NOT NULL,
  order_id          UUID REFERENCES sales_orders(id),
  delivery_note_id  UUID REFERENCES delivery_notes(id),
  customer_id       UUID REFERENCES customers(id),
  customer_name     VARCHAR(255),
  billing_address   TEXT,
  ship_to_address   TEXT,
  invoice_date      DATE NOT NULL,
  due_date          DATE,
  status            VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','posted','cancelled','void')),
  payment_status    VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partially_paid','paid','overdue')),
  subtotal          NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid       NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_due        NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  terms             TEXT,
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id),
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, invoice_no)
);
CREATE INDEX IF NOT EXISTS idx_inv_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_inv_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_inv_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_inv_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_inv_deleted_at ON invoices(deleted_at);

-- ============================================================
-- INVOICE LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  description     VARCHAR(500),
  quantity        NUMERIC(15,4) NOT NULL DEFAULT 1,
  rate            NUMERIC(15,4) NOT NULL DEFAULT 0,
  discount        NUMERIC(7,4) DEFAULT 0,
  tax_id          UUID REFERENCES taxes(id),
  tax_rate        NUMERIC(7,4) DEFAULT 0,
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  line_total      NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_li_invoice_id ON invoice_line_items(invoice_id);

-- ============================================================
-- CUSTOMER PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payment_no          VARCHAR(50) NOT NULL,
  customer_id         UUID NOT NULL REFERENCES customers(id),
  invoice_id          UUID REFERENCES invoices(id),
  payment_date        DATE NOT NULL,
  amount              NUMERIC(15,2) NOT NULL,
  unallocated_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_method      VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash','check','card','bank_transfer')),
  reference_no        VARCHAR(100),
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  updated_by          UUID REFERENCES users(id),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, payment_no)
);
CREATE INDEX IF NOT EXISTS idx_cp_company_id ON customer_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_cp_customer_id ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_cp_deleted_at ON customer_payments(deleted_at);

-- ============================================================
-- BILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bill_no         VARCHAR(50) NOT NULL,
  vendor_id       UUID REFERENCES vendors(id),
  vendor_name     VARCHAR(255),
  vendor_invoice_no VARCHAR(100),
  bill_date       DATE NOT NULL,
  due_date        DATE,
  status          VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','posted','cancelled')),
  payment_status  VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partially_paid','paid','overdue')),
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_due      NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, bill_no)
);
CREATE INDEX IF NOT EXISTS idx_bills_company_id ON bills(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_vendor_id ON bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_deleted_at ON bills(deleted_at);

-- ============================================================
-- BILL LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_line_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bill_id         UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  description     VARCHAR(500),
  quantity        NUMERIC(15,4) NOT NULL DEFAULT 1,
  rate            NUMERIC(15,4) NOT NULL DEFAULT 0,
  discount        NUMERIC(7,4) DEFAULT 0,
  tax_id          UUID REFERENCES taxes(id),
  tax_rate        NUMERIC(7,4) DEFAULT 0,
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  line_total      NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bill_li_bill_id ON bill_line_items(bill_id);

-- ============================================================
-- VENDOR PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payment_no          VARCHAR(50) NOT NULL,
  vendor_id           UUID NOT NULL REFERENCES vendors(id),
  bill_id             UUID REFERENCES bills(id),
  payment_date        DATE NOT NULL,
  amount              NUMERIC(15,2) NOT NULL,
  unallocated_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_method      VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash','check','card','bank_transfer')),
  reference_no        VARCHAR(100),
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  updated_by          UUID REFERENCES users(id),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, payment_no)
);
CREATE INDEX IF NOT EXISTS idx_vp_company_id ON vendor_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_vp_vendor_id ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vp_deleted_at ON vendor_payments(deleted_at);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  expense_no        VARCHAR(50) NOT NULL,
  vendor_id         UUID REFERENCES vendors(id),
  payee_name        VARCHAR(255),
  expense_category  VARCHAR(100) NOT NULL,
  expense_account   VARCHAR(100),
  reference_no      VARCHAR(100),
  invoice_no        VARCHAR(100),
  expense_date      DATE NOT NULL,
  amount            NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_id            UUID REFERENCES taxes(id),
  tax_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(15,2) GENERATED ALWAYS AS (amount + tax_amount) STORED,
  payment_method    VARCHAR(50) CHECK (payment_method IN ('cash','check','card','bank_transfer')),
  status            VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','posted','cancelled')),
  payment_status    VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  paid_date         DATE,
  description       TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  updated_by        UUID REFERENCES users(id),
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, expense_no)
);
CREATE INDEX IF NOT EXISTS idx_exp_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_exp_deleted_at ON expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_exp_status ON expenses(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id),
  user_name     VARCHAR(255),
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(100) NOT NULL,
  entity_id     UUID,
  user_ip       VARCHAR(45),
  field_name    VARCHAR(100),
  old_value     TEXT,
  new_value     TEXT,
  changes       JSONB,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- ============================================================
-- DOCUMENT STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS document_status_history (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type     VARCHAR(50) NOT NULL,
  document_id       UUID NOT NULL,
  document_no       VARCHAR(100),
  from_status       VARCHAR(50),
  to_status         VARCHAR(50) NOT NULL,
  changed_by        UUID REFERENCES users(id),
  changed_by_name   VARCHAR(255),
  reason            TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dsh_company_id ON document_status_history(company_id);
CREATE INDEX IF NOT EXISTS idx_dsh_document ON document_status_history(document_type, document_id);

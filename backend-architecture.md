# ERP System - Backend Architecture Design

## Table of Contents
1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Business Rules & Validations](#business-rules--validations)
4. [Document Conversion Logic](#document-conversion-logic)
5. [Numbering Service](#numbering-service)
6. [Audit & Logging](#audit--logging)
7. [Sample Request/Response](#sample-requestresponse)

---

## Database Schema

### Core Entities

#### 1. Companies
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    fiscal_year_start DATE,
    fiscal_year_end DATE,
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_companies_is_active ON companies(is_active);
CREATE INDEX idx_companies_deleted_at ON companies(deleted_at);
```

#### 2. Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL, -- admin, manager, accountant, sales, inventory
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
```

---

### Master Data Entities

#### 3. Customers
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    customer_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(255),

    -- Billing Address
    billing_address TEXT,
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100),

    -- Shipping Address
    shipping_address TEXT,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100),

    -- Financial Info
    tax_id VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms INT DEFAULT 30, -- days
    currency VARCHAR(10) DEFAULT 'USD',

    -- Classification
    customer_type VARCHAR(50), -- retail, wholesale, distributor
    customer_group VARCHAR(100),
    customer_segment VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_customer_no ON customers(customer_no);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_is_active ON customers(is_active);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);
```

#### 4. Vendors
```sql
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    vendor_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(255),

    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),

    -- Financial Info
    tax_id VARCHAR(50),
    payment_terms INT DEFAULT 30, -- days
    payment_method VARCHAR(50), -- bank_transfer, check, cash, credit_card
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',

    -- Classification
    vendor_type VARCHAR(50),
    vendor_group VARCHAR(100),
    vendor_segment VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_vendors_company_id ON vendors(company_id);
CREATE INDEX idx_vendors_vendor_no ON vendors(vendor_no);
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_is_active ON vendors(is_active);
```

#### 5. Products (SKUs)
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Categorization
    product_type VARCHAR(50) NOT NULL, -- inventory, service, non-inventory
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    manufacturer VARCHAR(255),

    -- Pricing
    cost_price DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,
    wholesale_price DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'USD',

    -- Inventory
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    track_inventory BOOLEAN DEFAULT TRUE,
    current_stock DECIMAL(15,2) DEFAULT 0,
    reorder_level DECIMAL(15,2) DEFAULT 0,
    reorder_quantity DECIMAL(15,2) DEFAULT 0,
    stock_location VARCHAR(100),

    -- Tax
    tax_id UUID REFERENCES taxes(id),
    is_taxable BOOLEAN DEFAULT TRUE,

    -- Physical Attributes
    weight DECIMAL(10,2),
    weight_unit VARCHAR(20), -- kg, lb
    dimensions VARCHAR(100), -- LxWxH

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_for_sale BOOLEAN DEFAULT TRUE,
    is_for_purchase BOOLEAN DEFAULT TRUE,

    -- Images & Attachments
    image_url TEXT,

    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_product_type ON products(product_type);
```

#### 6. Taxes
```sql
CREATE TABLE taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rate DECIMAL(5,2) NOT NULL, -- percentage
    tax_type VARCHAR(50), -- sales_tax, vat, gst, service_tax
    is_compound BOOLEAN DEFAULT FALSE, -- compound tax applies on subtotal + other taxes
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_taxes_company_id ON taxes(company_id);
CREATE INDEX idx_taxes_is_active ON taxes(is_active);
CREATE UNIQUE INDEX idx_taxes_company_default ON taxes(company_id, is_default)
    WHERE is_default = TRUE AND deleted_at IS NULL;
```

#### 7. Ship Via
```sql
CREATE TABLE ship_via (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    carrier VARCHAR(100), -- FedEx, UPS, DHL, USPS, etc.
    service_type VARCHAR(100), -- Express, Ground, International
    estimated_days INT,
    tracking_url_template VARCHAR(500), -- URL template with {tracking_number} placeholder
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_ship_via_company_id ON ship_via(company_id);
CREATE INDEX idx_ship_via_is_active ON ship_via(is_active);
```

---

### Document Entities

#### 8. Estimates (Quotations)
```sql
CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    estimate_no VARCHAR(50) UNIQUE NOT NULL,

    -- Customer Info
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(255), -- denormalized for historical reference
    bill_to TEXT,
    ship_to TEXT,

    -- Reference
    reference_no VARCHAR(100),

    -- Dates
    estimate_date DATE NOT NULL,
    expiry_date DATE,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft, sent, accepted, rejected, expired, converted

    -- Amounts
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_id UUID REFERENCES taxes(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) DEFAULT 0,

    -- Conversion Tracking
    converted_to_sales_order BOOLEAN DEFAULT FALSE,
    sales_order_id UUID,

    -- Notes
    terms_and_conditions TEXT,
    notes TEXT,
    internal_notes TEXT,

    -- Attachments
    attachments JSONB, -- [{filename, url, size, type}]

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_estimates_company_id ON estimates(company_id);
CREATE INDEX idx_estimates_estimate_no ON estimates(estimate_no);
CREATE INDEX idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_estimate_date ON estimates(estimate_date);
```

#### 9. Estimate Line Items
```sql
CREATE TABLE estimate_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    line_number INT NOT NULL,

    -- Product Info
    product_id UUID REFERENCES products(id),
    sku VARCHAR(100),
    description TEXT NOT NULL,

    -- Quantity & Pricing
    ordered_qty DECIMAL(15,2) NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    rate DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Tax
    tax_id UUID REFERENCES taxes(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,

    -- Calculated
    line_total DECIMAL(15,2) GENERATED ALWAYS AS (ordered_qty * rate) STORED,
    line_total_with_tax DECIMAL(15,2) GENERATED ALWAYS AS (ordered_qty * rate + tax_amount) STORED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_estimate_line_items_estimate_id ON estimate_line_items(estimate_id);
CREATE INDEX idx_estimate_line_items_product_id ON estimate_line_items(product_id);
```

#### 10. Sales Orders
```sql
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    sales_order_no VARCHAR(50) UNIQUE NOT NULL,

    -- Customer Info
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(255),
    bill_to TEXT,
    ship_to TEXT,

    -- Reference
    reference_no VARCHAR(100),
    po_number VARCHAR(100), -- Customer's PO number

    -- Source
    source_type VARCHAR(50), -- manual, estimate, ecommerce
    estimate_id UUID REFERENCES estimates(id),

    -- Dates
    order_date DATE NOT NULL,
    due_date DATE,
    expected_delivery_date DATE,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft, confirmed, in_progress, partially_fulfilled, fulfilled, cancelled
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled',
    -- unfulfilled, partially_fulfilled, fulfilled

    -- Amounts
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_id UUID REFERENCES taxes(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) DEFAULT 0,

    -- Fulfillment Tracking
    total_ordered_qty DECIMAL(15,2) DEFAULT 0,
    total_delivered_qty DECIMAL(15,2) DEFAULT 0,
    total_pending_qty DECIMAL(15,2) DEFAULT 0,

    -- Notes
    terms_and_conditions TEXT,
    notes TEXT,
    internal_notes TEXT,

    -- Attachments
    attachments JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_sales_orders_company_id ON sales_orders(company_id);
CREATE INDEX idx_sales_orders_sales_order_no ON sales_orders(sales_order_no);
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_order_date ON sales_orders(order_date);
CREATE INDEX idx_sales_orders_estimate_id ON sales_orders(estimate_id);
```

#### 11. Sales Order Line Items
```sql
CREATE TABLE sales_order_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    line_number INT NOT NULL,

    -- Product Info
    product_id UUID REFERENCES products(id),
    sku VARCHAR(100),
    description TEXT NOT NULL,

    -- Quantity & Pricing
    ordered_qty DECIMAL(15,2) NOT NULL DEFAULT 1,
    delivered_qty DECIMAL(15,2) DEFAULT 0,
    pending_qty DECIMAL(15,2) GENERATED ALWAYS AS (ordered_qty - delivered_qty) STORED,

    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    rate DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Tax
    tax_id UUID REFERENCES taxes(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,

    -- Calculated
    line_total DECIMAL(15,2) GENERATED ALWAYS AS (ordered_qty * rate) STORED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_order_line_items_sales_order_id ON sales_order_line_items(sales_order_id);
CREATE INDEX idx_sales_order_line_items_product_id ON sales_order_line_items(product_id);
```

#### 12. Delivery Notes
```sql
CREATE TABLE delivery_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    delivery_note_no VARCHAR(50) UNIQUE NOT NULL,

    -- Customer Info
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(255),
    ship_to TEXT,

    -- Reference
    sales_order_id UUID REFERENCES sales_orders(id),
    po_number VARCHAR(100),
    reference_no VARCHAR(100),

    -- Dates
    delivery_date DATE NOT NULL,
    due_date DATE,
    shipment_date DATE,

    -- Shipping
    ship_via_id UUID REFERENCES ship_via(id),
    ship_via_name VARCHAR(100),
    tracking_number VARCHAR(100),
    shipping_cost DECIMAL(15,2) DEFAULT 0,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft, ready_to_ship, shipped, in_transit, delivered, cancelled

    -- Quantities
    total_ordered_qty DECIMAL(15,2) DEFAULT 0,
    total_shipped_qty DECIMAL(15,2) DEFAULT 0,
    total_backordered_qty DECIMAL(15,2) DEFAULT 0,

    -- Invoice Tracking
    invoiced BOOLEAN DEFAULT FALSE,
    invoice_id UUID,

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Attachments
    attachments JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_delivery_notes_company_id ON delivery_notes(company_id);
CREATE INDEX idx_delivery_notes_delivery_note_no ON delivery_notes(delivery_note_no);
CREATE INDEX idx_delivery_notes_customer_id ON delivery_notes(customer_id);
CREATE INDEX idx_delivery_notes_sales_order_id ON delivery_notes(sales_order_id);
CREATE INDEX idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX idx_delivery_notes_delivery_date ON delivery_notes(delivery_date);
```

#### 13. Delivery Note Line Items
```sql
CREATE TABLE delivery_note_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
    line_number INT NOT NULL,

    -- Product Info
    product_id UUID REFERENCES products(id),
    sku VARCHAR(100),
    description TEXT NOT NULL,

    -- Quantity
    ordered_qty DECIMAL(15,2) NOT NULL DEFAULT 0,
    shipped_qty DECIMAL(15,2) NOT NULL DEFAULT 0,
    backordered_qty DECIMAL(15,2) GENERATED ALWAYS AS (
        GREATEST(ordered_qty - shipped_qty, 0)
    ) STORED,

    unit_of_measure VARCHAR(50) DEFAULT 'pcs',

    -- Inventory Impact
    inventory_deducted BOOLEAN DEFAULT FALSE,
    stock_location VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_note_line_items_delivery_note_id
    ON delivery_note_line_items(delivery_note_id);
CREATE INDEX idx_delivery_note_line_items_product_id
    ON delivery_note_line_items(product_id);
```

#### 14. Invoices
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    invoice_no VARCHAR(50) UNIQUE NOT NULL,

    -- Customer Info
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(255),
    bill_to TEXT,
    ship_to TEXT,

    -- Reference
    sales_order_id UUID REFERENCES sales_orders(id),
    delivery_note_id UUID REFERENCES delivery_notes(id),
    po_number VARCHAR(100),
    reference_no VARCHAR(100),

    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft, sent, partially_paid, paid, overdue, cancelled
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    -- unpaid, partially_paid, paid

    -- Amounts
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_id UUID REFERENCES taxes(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    shipping_charges DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) DEFAULT 0,

    -- Payment Tracking
    amount_paid DECIMAL(15,2) DEFAULT 0,
    amount_due DECIMAL(15,2) GENERATED ALWAYS AS (grand_total - amount_paid) STORED,

    -- Accounting
    posted_to_ledger BOOLEAN DEFAULT FALSE,
    posted_date TIMESTAMP,

    -- Notes
    terms_and_conditions TEXT,
    notes TEXT,
    internal_notes TEXT,

    -- Attachments
    attachments JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_invoice_no ON invoices(invoice_no);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

#### 15. Invoice Line Items
```sql
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    line_number INT NOT NULL,

    -- Product Info
    product_id UUID REFERENCES products(id),
    sku VARCHAR(100),
    description TEXT NOT NULL,

    -- Quantity & Pricing
    quantity DECIMAL(15,2) NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    rate DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_per_item DECIMAL(15,2) DEFAULT 0,

    -- Tax
    tax_id UUID REFERENCES taxes(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,

    -- Calculated
    line_total DECIMAL(15,2) GENERATED ALWAYS AS (
        (quantity * rate) - discount_per_item
    ) STORED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_product_id ON invoice_line_items(product_id);
```

---

### Purchase Module Entities

#### 16. Bills (Vendor Invoices)
```sql
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    bill_no VARCHAR(50) UNIQUE NOT NULL,

    -- Vendor Info
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    vendor_name VARCHAR(255),
    vendor_address TEXT,

    -- Reference
    purchase_order_id UUID, -- for future PO module
    vendor_invoice_no VARCHAR(100), -- vendor's invoice number
    reference_no VARCHAR(100),

    -- Dates
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft, received, partially_paid, paid, overdue, cancelled
    payment_status VARCHAR(50) DEFAULT 'unpaid',

    -- Amounts
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_id UUID REFERENCES taxes(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    shipping_charges DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) DEFAULT 0,

    -- Payment Tracking
    amount_paid DECIMAL(15,2) DEFAULT 0,
    amount_due DECIMAL(15,2) GENERATED ALWAYS AS (grand_total - amount_paid) STORED,

    -- Accounting
    posted_to_ledger BOOLEAN DEFAULT FALSE,
    posted_date TIMESTAMP,

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Attachments
    attachments JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_bills_company_id ON bills(company_id);
CREATE INDEX idx_bills_bill_no ON bills(bill_no);
CREATE INDEX idx_bills_vendor_id ON bills(vendor_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_bill_date ON bills(bill_date);
```

#### 17. Bill Line Items
```sql
CREATE TABLE bill_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    line_number INT NOT NULL,

    -- Product Info
    product_id UUID REFERENCES products(id),
    sku VARCHAR(100),
    description TEXT NOT NULL,

    -- Quantity & Pricing
    quantity DECIMAL(15,2) NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    rate DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Tax
    tax_id UUID REFERENCES taxes(id),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,

    -- Calculated
    line_total DECIMAL(15,2) GENERATED ALWAYS AS (quantity * rate) STORED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bill_line_items_bill_id ON bill_line_items(bill_id);
CREATE INDEX idx_bill_line_items_product_id ON bill_line_items(product_id);
```

#### 18. Expenses
```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    expense_no VARCHAR(50) UNIQUE NOT NULL,

    -- Vendor Info (optional for non-vendor expenses)
    vendor_id UUID REFERENCES vendors(id),
    payee_name VARCHAR(255),

    -- Classification
    expense_category VARCHAR(100) NOT NULL, -- utilities, rent, salaries, supplies
    expense_account VARCHAR(100), -- GL account reference

    -- Reference
    reference_no VARCHAR(100),
    invoice_no VARCHAR(100),

    -- Dates
    expense_date DATE NOT NULL,

    -- Amount
    amount DECIMAL(15,2) NOT NULL,
    tax_id UUID REFERENCES taxes(id),
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount + tax_amount) STORED,

    -- Payment
    payment_method VARCHAR(50), -- cash, check, card, bank_transfer
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, paid
    paid_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, approved, posted, cancelled

    -- Accounting
    posted_to_ledger BOOLEAN DEFAULT FALSE,
    posted_date TIMESTAMP,

    -- Notes
    description TEXT,
    notes TEXT,

    -- Attachments
    attachments JSONB, -- receipts, invoices

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_expenses_company_id ON expenses(company_id);
CREATE INDEX idx_expenses_expense_no ON expenses(expense_no);
CREATE INDEX idx_expenses_vendor_id ON expenses(vendor_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_status ON expenses(status);
```

---

### Payment Entities

#### 19. Customer Payments
```sql
CREATE TABLE customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    payment_no VARCHAR(50) UNIQUE NOT NULL,

    -- Customer Info
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(255),

    -- Payment Details
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    -- cash, check, bank_transfer, credit_card, debit_card, online

    -- Bank Details (for bank transfers)
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    transaction_reference VARCHAR(100),
    check_number VARCHAR(50),

    -- Amount
    amount DECIMAL(15,2) NOT NULL,

    -- Invoice Allocation
    invoice_id UUID REFERENCES invoices(id),
    allocated_amount DECIMAL(15,2),

    -- Status
    status VARCHAR(50) DEFAULT 'received', -- received, deposited, bounced, cancelled

    -- Accounting
    posted_to_ledger BOOLEAN DEFAULT FALSE,
    posted_date TIMESTAMP,
    deposit_to_account VARCHAR(100), -- bank account GL code

    -- Notes
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_customer_payments_company_id ON customer_payments(company_id);
CREATE INDEX idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX idx_customer_payments_invoice_id ON customer_payments(invoice_id);
CREATE INDEX idx_customer_payments_payment_date ON customer_payments(payment_date);
```

#### 20. Vendor Payments
```sql
CREATE TABLE vendor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    payment_no VARCHAR(50) UNIQUE NOT NULL,

    -- Vendor Info
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    vendor_name VARCHAR(255),

    -- Payment Details
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,

    -- Bank Details
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    transaction_reference VARCHAR(100),
    check_number VARCHAR(50),

    -- Amount
    amount DECIMAL(15,2) NOT NULL,

    -- Bill Allocation
    bill_id UUID REFERENCES bills(id),
    allocated_amount DECIMAL(15,2),

    -- Status
    status VARCHAR(50) DEFAULT 'paid', -- paid, pending, cancelled

    -- Accounting
    posted_to_ledger BOOLEAN DEFAULT FALSE,
    posted_date TIMESTAMP,
    payment_from_account VARCHAR(100), -- bank account GL code

    -- Notes
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_vendor_payments_company_id ON vendor_payments(company_id);
CREATE INDEX idx_vendor_payments_vendor_id ON vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_bill_id ON vendor_payments(bill_id);
```

---

### Inventory Entities

#### 21. Inventory Transactions
```sql
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    transaction_no VARCHAR(50) UNIQUE NOT NULL,

    -- Product Info
    product_id UUID NOT NULL REFERENCES products(id),
    sku VARCHAR(100),

    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL,
    -- delivery_note, purchase_receipt, adjustment, transfer, return
    transaction_date TIMESTAMP NOT NULL,

    -- Quantity
    quantity DECIMAL(15,2) NOT NULL, -- positive for IN, negative for OUT
    unit_of_measure VARCHAR(50),

    -- Cost
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,

    -- Stock Balance
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),

    -- Location
    stock_location VARCHAR(100),
    from_location VARCHAR(100), -- for transfers
    to_location VARCHAR(100), -- for transfers

    -- Reference Documents
    reference_type VARCHAR(50), -- delivery_note, bill, adjustment, etc.
    reference_id UUID,
    reference_no VARCHAR(100),

    -- Notes
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_inventory_transactions_company_id ON inventory_transactions(company_id);
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_transaction_date ON inventory_transactions(transaction_date);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);
```

#### 22. Stock Locations
```sql
CREATE TABLE stock_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    location_code VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(50), -- warehouse, store, showroom, van

    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),

    -- Contact
    manager_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_stock_locations_company_id ON stock_locations(company_id);
```

#### 23. Product Stock by Location
```sql
CREATE TABLE product_stock_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    product_id UUID NOT NULL REFERENCES products(id),
    location_id UUID NOT NULL REFERENCES stock_locations(id),

    quantity_on_hand DECIMAL(15,2) DEFAULT 0,
    quantity_reserved DECIMAL(15,2) DEFAULT 0, -- allocated to orders
    quantity_available DECIMAL(15,2) GENERATED ALWAYS AS
        (quantity_on_hand - quantity_reserved) STORED,

    reorder_level DECIMAL(15,2) DEFAULT 0,
    reorder_quantity DECIMAL(15,2) DEFAULT 0,

    last_stock_count_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(product_id, location_id)
);

CREATE INDEX idx_product_stock_locations_company_id ON product_stock_locations(company_id);
CREATE INDEX idx_product_stock_locations_product_id ON product_stock_locations(product_id);
CREATE INDEX idx_product_stock_locations_location_id ON product_stock_locations(location_id);
```

---

### System Entities

#### 24. Document Number Sequences
```sql
CREATE TABLE document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    document_type VARCHAR(50) NOT NULL,
    -- invoice, sales_order, estimate, delivery_note, bill, expense, payment

    prefix VARCHAR(20) NOT NULL, -- INV, SO, EST, DN, BILL, EXP, PMT
    next_number INT NOT NULL DEFAULT 1,
    padding INT DEFAULT 4, -- number of digits (e.g., 0001)

    -- Format: {prefix}-{YYYYMMDD}-{number}
    include_date BOOLEAN DEFAULT TRUE,
    date_format VARCHAR(20) DEFAULT 'YYYYMMDD',

    -- Reset Options
    reset_yearly BOOLEAN DEFAULT FALSE,
    reset_monthly BOOLEAN DEFAULT FALSE,
    last_reset_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, document_type)
);

CREATE INDEX idx_document_sequences_company_id ON document_sequences(company_id);
```

#### 25. Audit Log
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),

    -- Entity Info
    entity_type VARCHAR(100) NOT NULL, -- invoice, sales_order, customer, etc.
    entity_id UUID NOT NULL,

    -- Action
    action VARCHAR(50) NOT NULL, -- create, update, delete, status_change

    -- User Info
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(255),
    user_ip VARCHAR(50),

    -- Changes
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changes JSONB, -- full change log

    -- Metadata
    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

#### 26. Document Status History
```sql
CREATE TABLE document_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Document Reference
    document_type VARCHAR(50) NOT NULL,
    document_id UUID NOT NULL,
    document_no VARCHAR(100),

    -- Status Change
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,

    -- User Info
    changed_by UUID REFERENCES users(id),
    changed_by_name VARCHAR(255),

    -- Reason
    reason TEXT,
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doc_status_history_company_id ON document_status_history(company_id);
CREATE INDEX idx_doc_status_history_document ON document_status_history(document_type, document_id);
CREATE INDEX idx_doc_status_history_created_at ON document_status_history(created_at);
```

---

## API Endpoints

### Authentication & Authorization

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh-token
GET    /api/v1/auth/me
PUT    /api/v1/auth/change-password
```

---

### Master Data APIs

#### Customers

```
GET    /api/v1/customers
GET    /api/v1/customers/:id
POST   /api/v1/customers
PUT    /api/v1/customers/:id
DELETE /api/v1/customers/:id (soft delete)
GET    /api/v1/customers/:id/invoices
GET    /api/v1/customers/:id/sales-orders
GET    /api/v1/customers/:id/statements
GET    /api/v1/customers/:id/outstanding-balance
```

**Query Parameters for List:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` (searches name, email, customer_no)
- `is_active` (true/false)
- `customer_type`
- `customer_group`
- `sort_by` (default: name)
- `sort_order` (asc/desc)

#### Vendors

```
GET    /api/v1/vendors
GET    /api/v1/vendors/:id
POST   /api/v1/vendors
PUT    /api/v1/vendors/:id
DELETE /api/v1/vendors/:id
GET    /api/v1/vendors/:id/bills
GET    /api/v1/vendors/:id/payments
GET    /api/v1/vendors/:id/outstanding-balance
```

#### Products

```
GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PUT    /api/v1/products/:id
DELETE /api/v1/products/:id
GET    /api/v1/products/:id/stock-levels
GET    /api/v1/products/:id/transaction-history
POST   /api/v1/products/:id/adjust-stock
GET    /api/v1/products/low-stock
```

**Query Parameters:**
- `product_type` (inventory/service/non-inventory)
- `category`
- `is_active`
- `is_for_sale`
- `is_for_purchase`
- `search` (SKU, name, barcode)

#### Taxes

```
GET    /api/v1/taxes
GET    /api/v1/taxes/:id
POST   /api/v1/taxes
PUT    /api/v1/taxes/:id
DELETE /api/v1/taxes/:id
PATCH  /api/v1/taxes/:id/toggle-active
PATCH  /api/v1/taxes/:id/set-default
```

#### Ship Via

```
GET    /api/v1/ship-via
GET    /api/v1/ship-via/:id
POST   /api/v1/ship-via
PUT    /api/v1/ship-via/:id
DELETE /api/v1/ship-via/:id
PATCH  /api/v1/ship-via/:id/toggle-active
```

---

### Sales Transaction APIs

#### Estimates

```
GET    /api/v1/estimates
GET    /api/v1/estimates/:id
POST   /api/v1/estimates
PUT    /api/v1/estimates/:id
DELETE /api/v1/estimates/:id
PATCH  /api/v1/estimates/:id/status
POST   /api/v1/estimates/:id/convert-to-sales-order
POST   /api/v1/estimates/:id/send-email
GET    /api/v1/estimates/:id/pdf
POST   /api/v1/estimates/:id/duplicate
```

**Status Transitions:**
- draft → sent
- sent → accepted
- sent → rejected
- sent → expired
- accepted → converted

#### Sales Orders

```
GET    /api/v1/sales-orders
GET    /api/v1/sales-orders/:id
POST   /api/v1/sales-orders
PUT    /api/v1/sales-orders/:id
DELETE /api/v1/sales-orders/:id
PATCH  /api/v1/sales-orders/:id/status
POST   /api/v1/sales-orders/:id/convert-to-delivery-note
POST   /api/v1/sales-orders/:id/convert-to-invoice
GET    /api/v1/sales-orders/:id/fulfillment-status
GET    /api/v1/sales-orders/:id/delivery-notes
GET    /api/v1/sales-orders/:id/pdf
```

**Status Transitions:**
- draft → confirmed
- confirmed → in_progress
- in_progress → partially_fulfilled
- in_progress → fulfilled
- any → cancelled

#### Delivery Notes

```
GET    /api/v1/delivery-notes
GET    /api/v1/delivery-notes/:id
POST   /api/v1/delivery-notes
PUT    /api/v1/delivery-notes/:id
DELETE /api/v1/delivery-notes/:id
PATCH  /api/v1/delivery-notes/:id/status
POST   /api/v1/delivery-notes/:id/ship
POST   /api/v1/delivery-notes/:id/mark-delivered
POST   /api/v1/delivery-notes/:id/convert-to-invoice
GET    /api/v1/delivery-notes/:id/pdf
GET    /api/v1/delivery-notes/:id/tracking
```

**Status Transitions:**
- draft → ready_to_ship
- ready_to_ship → shipped
- shipped → in_transit
- in_transit → delivered
- any → cancelled

**Inventory Impact:**
- Status changes to "shipped" → deduct inventory
- Status changes to "cancelled" → restore inventory (if previously shipped)

#### Invoices

```
GET    /api/v1/invoices
GET    /api/v1/invoices/:id
POST   /api/v1/invoices
PUT    /api/v1/invoices/:id
DELETE /api/v1/invoices/:id
PATCH  /api/v1/invoices/:id/status
POST   /api/v1/invoices/:id/send-email
POST   /api/v1/invoices/:id/record-payment
GET    /api/v1/invoices/:id/payments
GET    /api/v1/invoices/:id/pdf
GET    /api/v1/invoices/overdue
```

**Status Transitions:**
- draft → sent
- sent → partially_paid (when payment recorded)
- sent → paid (when fully paid)
- sent → overdue (automatic based on due date)
- any → cancelled

---

### Purchase Transaction APIs

#### Bills

```
GET    /api/v1/bills
GET    /api/v1/bills/:id
POST   /api/v1/bills
PUT    /api/v1/bills/:id
DELETE /api/v1/bills/:id
PATCH  /api/v1/bills/:id/status
POST   /api/v1/bills/:id/record-payment
GET    /api/v1/bills/:id/payments
GET    /api/v1/bills/overdue
```

#### Expenses

```
GET    /api/v1/expenses
GET    /api/v1/expenses/:id
POST   /api/v1/expenses
PUT    /api/v1/expenses/:id
DELETE /api/v1/expenses/:id
PATCH  /api/v1/expenses/:id/status
POST   /api/v1/expenses/:id/approve
POST   /api/v1/expenses/:id/mark-paid
```

---

### Payment APIs

#### Customer Payments

```
GET    /api/v1/customer-payments
GET    /api/v1/customer-payments/:id
POST   /api/v1/customer-payments
PUT    /api/v1/customer-payments/:id
DELETE /api/v1/customer-payments/:id
POST   /api/v1/customer-payments/:id/allocate-to-invoice
GET    /api/v1/customer-payments/unallocated
```

#### Vendor Payments

```
GET    /api/v1/vendor-payments
GET    /api/v1/vendor-payments/:id
POST   /api/v1/vendor-payments
PUT    /api/v1/vendor-payments/:id
DELETE /api/v1/vendor-payments/:id
POST   /api/v1/vendor-payments/:id/allocate-to-bill
```

---

### Inventory APIs

```
GET    /api/v1/inventory/stock-levels
GET    /api/v1/inventory/transactions
POST   /api/v1/inventory/adjust-stock
POST   /api/v1/inventory/transfer-stock
GET    /api/v1/inventory/valuation
GET    /api/v1/inventory/low-stock-report
GET    /api/v1/inventory/stock-movement/:productId
```

---

### Reporting APIs

```
GET    /api/v1/reports/sales-summary
GET    /api/v1/reports/sales-by-customer
GET    /api/v1/reports/sales-by-product
GET    /api/v1/reports/accounts-receivable-aging
GET    /api/v1/reports/accounts-payable-aging
GET    /api/v1/reports/inventory-summary
GET    /api/v1/reports/profit-loss
GET    /api/v1/reports/balance-sheet
```

---

### Utility APIs

```
POST   /api/v1/utils/generate-document-number
GET    /api/v1/utils/audit-logs
GET    /api/v1/utils/status-history/:documentType/:documentId
POST   /api/v1/utils/upload-file
DELETE /api/v1/utils/delete-file/:fileId
```

---

## Sample Request/Response

### 1. Create Estimate

**Request:**
```json
POST /api/v1/estimates
Content-Type: application/json
Authorization: Bearer {token}

{
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "estimate_date": "2025-01-15",
  "expiry_date": "2025-02-15",
  "reference_no": "REF-2025-001",
  "bill_to": "123 Main St, New York, NY 10001, USA",
  "ship_to": "456 Oak Ave, Los Angeles, CA 90001, USA",
  "tax_id": "789e4567-e89b-12d3-a456-426614174000",
  "line_items": [
    {
      "product_id": "321e4567-e89b-12d3-a456-426614174000",
      "description": "MacBook Pro 16\"",
      "ordered_qty": 2,
      "rate": 2500.00,
      "tax_id": "789e4567-e89b-12d3-a456-426614174000"
    },
    {
      "product_id": "321e4567-e89b-12d3-a456-426614174001",
      "description": "Magic Mouse",
      "ordered_qty": 2,
      "rate": 99.00,
      "tax_id": "789e4567-e89b-12d3-a456-426614174000"
    }
  ],
  "notes": "Thank you for your business",
  "terms_and_conditions": "Payment due within 30 days"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "987e4567-e89b-12d3-a456-426614174000",
    "estimate_no": "EST-20250115-001",
    "customer_id": "123e4567-e89b-12d3-a456-426614174000",
    "customer_name": "John Doe",
    "estimate_date": "2025-01-15",
    "expiry_date": "2025-02-15",
    "reference_no": "REF-2025-001",
    "status": "draft",
    "bill_to": "123 Main St, New York, NY 10001, USA",
    "ship_to": "456 Oak Ave, Los Angeles, CA 90001, USA",
    "line_items": [
      {
        "id": "111e4567-e89b-12d3-a456-426614174000",
        "line_number": 1,
        "product_id": "321e4567-e89b-12d3-a456-426614174000",
        "sku": "MBP-16-2024",
        "description": "MacBook Pro 16\"",
        "ordered_qty": 2,
        "rate": 2500.00,
        "tax_rate": 10.00,
        "tax_amount": 500.00,
        "line_total": 5000.00,
        "line_total_with_tax": 5500.00
      },
      {
        "id": "222e4567-e89b-12d3-a456-426614174000",
        "line_number": 2,
        "product_id": "321e4567-e89b-12d3-a456-426614174001",
        "sku": "MOUSE-MAGIC",
        "description": "Magic Mouse",
        "ordered_qty": 2,
        "rate": 99.00,
        "tax_rate": 10.00,
        "tax_amount": 19.80,
        "line_total": 198.00,
        "line_total_with_tax": 217.80
      }
    ],
    "subtotal": 5198.00,
    "tax_rate": 10.00,
    "tax_amount": 519.80,
    "discount_amount": 0.00,
    "grand_total": 5717.80,
    "notes": "Thank you for your business",
    "terms_and_conditions": "Payment due within 30 days",
    "converted_to_sales_order": false,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  "message": "Estimate created successfully"
}
```

---

### 2. Convert Estimate to Sales Order

**Request:**
```json
POST /api/v1/estimates/987e4567-e89b-12d3-a456-426614174000/convert-to-sales-order
Content-Type: application/json
Authorization: Bearer {token}

{
  "order_date": "2025-01-20",
  "due_date": "2025-02-20",
  "po_number": "PO-2025-001",
  "copy_line_items": true,
  "mark_estimate_converted": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sales_order": {
      "id": "555e4567-e89b-12d3-a456-426614174000",
      "sales_order_no": "SO-20250120-001",
      "customer_id": "123e4567-e89b-12d3-a456-426614174000",
      "estimate_id": "987e4567-e89b-12d3-a456-426614174000",
      "source_type": "estimate",
      "status": "draft",
      "order_date": "2025-01-20",
      "due_date": "2025-02-20",
      "po_number": "PO-2025-001",
      "subtotal": 5198.00,
      "tax_amount": 519.80,
      "grand_total": 5717.80,
      "line_items": [
        {
          "product_id": "321e4567-e89b-12d3-a456-426614174000",
          "sku": "MBP-16-2024",
          "description": "MacBook Pro 16\"",
          "ordered_qty": 2,
          "delivered_qty": 0,
          "pending_qty": 2,
          "rate": 2500.00
        },
        {
          "product_id": "321e4567-e89b-12d3-a456-426614174001",
          "sku": "MOUSE-MAGIC",
          "description": "Magic Mouse",
          "ordered_qty": 2,
          "delivered_qty": 0,
          "pending_qty": 2,
          "rate": 99.00
        }
      ]
    },
    "estimate_updated": {
      "id": "987e4567-e89b-12d3-a456-426614174000",
      "status": "converted",
      "converted_to_sales_order": true,
      "sales_order_id": "555e4567-e89b-12d3-a456-426614174000"
    }
  },
  "message": "Estimate converted to Sales Order successfully"
}
```

---

### 3. Create Delivery Note from Sales Order

**Request:**
```json
POST /api/v1/sales-orders/555e4567-e89b-12d3-a456-426614174000/convert-to-delivery-note
Content-Type: application/json
Authorization: Bearer {token}

{
  "delivery_date": "2025-01-25",
  "shipment_date": "2025-01-26",
  "ship_via_id": "666e4567-e89b-12d3-a456-426614174000",
  "line_items": [
    {
      "sales_order_line_item_id": "111e4567-e89b-12d3-a456-426614174000",
      "shipped_qty": 2
    },
    {
      "sales_order_line_item_id": "222e4567-e89b-12d3-a456-426614174000",
      "shipped_qty": 1
    }
  ],
  "tracking_number": "1Z999AA10123456784",
  "notes": "Handle with care"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "delivery_note": {
      "id": "777e4567-e89b-12d3-a456-426614174000",
      "delivery_note_no": "DN-20250125-001",
      "customer_id": "123e4567-e89b-12d3-a456-426614174000",
      "sales_order_id": "555e4567-e89b-12d3-a456-426614174000",
      "status": "draft",
      "delivery_date": "2025-01-25",
      "shipment_date": "2025-01-26",
      "ship_via_id": "666e4567-e89b-12d3-a456-426614174000",
      "ship_via_name": "FedEx Express",
      "tracking_number": "1Z999AA10123456784",
      "line_items": [
        {
          "product_id": "321e4567-e89b-12d3-a456-426614174000",
          "sku": "MBP-16-2024",
          "ordered_qty": 2,
          "shipped_qty": 2,
          "backordered_qty": 0
        },
        {
          "product_id": "321e4567-e89b-12d3-a456-426614174001",
          "sku": "MOUSE-MAGIC",
          "ordered_qty": 2,
          "shipped_qty": 1,
          "backordered_qty": 1
        }
      ],
      "total_ordered_qty": 4,
      "total_shipped_qty": 3,
      "total_backordered_qty": 1
    },
    "sales_order_updated": {
      "id": "555e4567-e89b-12d3-a456-426614174000",
      "fulfillment_status": "partially_fulfilled",
      "line_items": [
        {
          "id": "111e4567-e89b-12d3-a456-426614174000",
          "ordered_qty": 2,
          "delivered_qty": 2,
          "pending_qty": 0
        },
        {
          "id": "222e4567-e89b-12d3-a456-426614174000",
          "ordered_qty": 2,
          "delivered_qty": 1,
          "pending_qty": 1
        }
      ]
    }
  },
  "message": "Delivery Note created successfully"
}
```

---

### 4. Ship Delivery Note (Inventory Deduction)

**Request:**
```json
POST /api/v1/delivery-notes/777e4567-e89b-12d3-a456-426614174000/ship
Content-Type: application/json
Authorization: Bearer {token}

{
  "shipment_date": "2025-01-26",
  "deduct_inventory": true,
  "stock_location": "WAREHOUSE-01"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "delivery_note": {
      "id": "777e4567-e89b-12d3-a456-426614174000",
      "delivery_note_no": "DN-20250125-001",
      "status": "shipped",
      "shipment_date": "2025-01-26"
    },
    "inventory_transactions": [
      {
        "id": "888e4567-e89b-12d3-a456-426614174000",
        "transaction_no": "INV-OUT-20250126-001",
        "product_id": "321e4567-e89b-12d3-a456-426614174000",
        "sku": "MBP-16-2024",
        "transaction_type": "delivery_note",
        "quantity": -2,
        "balance_before": 50,
        "balance_after": 48,
        "reference_type": "delivery_note",
        "reference_id": "777e4567-e89b-12d3-a456-426614174000",
        "reference_no": "DN-20250125-001"
      },
      {
        "id": "999e4567-e89b-12d3-a456-426614174000",
        "transaction_no": "INV-OUT-20250126-002",
        "product_id": "321e4567-e89b-12d3-a456-426614174001",
        "sku": "MOUSE-MAGIC",
        "transaction_type": "delivery_note",
        "quantity": -1,
        "balance_before": 100,
        "balance_after": 99,
        "reference_type": "delivery_note",
        "reference_id": "777e4567-e89b-12d3-a456-426614174000",
        "reference_no": "DN-20250125-001"
      }
    ],
    "product_stock_updated": [
      {
        "product_id": "321e4567-e89b-12d3-a456-426614174000",
        "sku": "MBP-16-2024",
        "previous_stock": 50,
        "new_stock": 48
      },
      {
        "product_id": "321e4567-e89b-12d3-a456-426614174001",
        "sku": "MOUSE-MAGIC",
        "previous_stock": 100,
        "new_stock": 99
      }
    ]
  },
  "message": "Delivery Note shipped and inventory deducted successfully"
}
```

---

### 5. Create Invoice from Delivery Note

**Request:**
```json
POST /api/v1/delivery-notes/777e4567-e89b-12d3-a456-426614174000/convert-to-invoice
Content-Type: application/json
Authorization: Bearer {token}

{
  "invoice_date": "2025-01-27",
  "due_date": "2025-02-27",
  "payment_terms": 30,
  "copy_shipped_quantities": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "101e4567-e89b-12d3-a456-426614174000",
      "invoice_no": "INV-20250127-001",
      "customer_id": "123e4567-e89b-12d3-a456-426614174000",
      "sales_order_id": "555e4567-e89b-12d3-a456-426614174000",
      "delivery_note_id": "777e4567-e89b-12d3-a456-426614174000",
      "status": "draft",
      "payment_status": "unpaid",
      "invoice_date": "2025-01-27",
      "due_date": "2025-02-27",
      "line_items": [
        {
          "product_id": "321e4567-e89b-12d3-a456-426614174000",
          "sku": "MBP-16-2024",
          "description": "MacBook Pro 16\"",
          "quantity": 2,
          "rate": 2500.00,
          "line_total": 5000.00
        },
        {
          "product_id": "321e4567-e89b-12d3-a456-426614174001",
          "sku": "MOUSE-MAGIC",
          "description": "Magic Mouse",
          "quantity": 1,
          "rate": 99.00,
          "line_total": 99.00
        }
      ],
      "subtotal": 5099.00,
      "tax_rate": 10.00,
      "tax_amount": 509.90,
      "grand_total": 5608.90,
      "amount_paid": 0.00,
      "amount_due": 5608.90
    },
    "delivery_note_updated": {
      "id": "777e4567-e89b-12d3-a456-426614174000",
      "invoiced": true,
      "invoice_id": "101e4567-e89b-12d3-a456-426614174000"
    }
  },
  "message": "Invoice created from Delivery Note successfully"
}
```

---

### 6. Record Customer Payment

**Request:**
```json
POST /api/v1/invoices/101e4567-e89b-12d3-a456-426614174000/record-payment
Content-Type: application/json
Authorization: Bearer {token}

{
  "payment_date": "2025-02-01",
  "amount": 5608.90,
  "payment_method": "bank_transfer",
  "bank_name": "Chase Bank",
  "transaction_reference": "TXN-2025-02-01-12345",
  "deposit_to_account": "1000-Cash",
  "notes": "Full payment received"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "202e4567-e89b-12d3-a456-426614174000",
      "payment_no": "PMT-20250201-001",
      "customer_id": "123e4567-e89b-12d3-a456-426614174000",
      "invoice_id": "101e4567-e89b-12d3-a456-426614174000",
      "payment_date": "2025-02-01",
      "amount": 5608.90,
      "payment_method": "bank_transfer",
      "bank_name": "Chase Bank",
      "transaction_reference": "TXN-2025-02-01-12345",
      "status": "received",
      "allocated_amount": 5608.90
    },
    "invoice_updated": {
      "id": "101e4567-e89b-12d3-a456-426614174000",
      "status": "paid",
      "payment_status": "paid",
      "amount_paid": 5608.90,
      "amount_due": 0.00
    }
  },
  "message": "Payment recorded successfully"
}
```

---

### 7. Get List of Estimates (with pagination & filters)

**Request:**
```
GET /api/v1/estimates?page=1&limit=10&status=draft&customer_id=123e4567-e89b-12d3-a456-426614174000&sort_by=estimate_date&sort_order=desc
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "estimates": [
      {
        "id": "987e4567-e89b-12d3-a456-426614174000",
        "estimate_no": "EST-20250115-001",
        "customer_id": "123e4567-e89b-12d3-a456-426614174000",
        "customer_name": "John Doe",
        "estimate_date": "2025-01-15",
        "expiry_date": "2025-02-15",
        "status": "draft",
        "grand_total": 5717.80,
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total_records": 1,
      "total_pages": 1
    }
  },
  "message": "Estimates retrieved successfully"
}
```

---

## Business Rules & Validations

### General Validations

1. **Multi-tenancy:**
   - All queries must include `company_id` filter
   - Users can only access data for their company
   - Enforce at middleware/query level

2. **Soft Delete:**
   - Deletion sets `deleted_at` timestamp
   - Soft-deleted records excluded from queries (WHERE deleted_at IS NULL)
   - Restore functionality available

3. **Required Fields:**
   - Customer/Vendor: name, company_id
   - Product: sku, name, company_id, product_type
   - All documents: company_id, customer_id/vendor_id, date, status

4. **Unique Constraints:**
   - Document numbers: unique per company
   - Customer/Vendor numbers: unique per company
   - SKU: unique per company

---

### Document-Specific Rules

#### Estimates

**Create/Update:**
- `estimate_date` cannot be in future
- `expiry_date` must be after `estimate_date`
- At least one line item required
- Line item `ordered_qty` must be > 0
- `rate` must be >= 0

**Status Transitions:**
- `draft` → `sent`: All required fields must be filled
- `sent` → `accepted`: Only allowed by customer or authorized user
- `sent` → `rejected`: Only allowed by customer or authorized user
- `accepted` → `converted`: Automatic when converted to Sales Order
- Cannot edit estimate after status = `converted`

**Conversion to Sales Order:**
- Status must be `draft` or `accepted`
- Line items copied to Sales Order
- Estimate marked as `converted_to_sales_order = true`

---

#### Sales Orders

**Create/Update:**
- `order_date` cannot be in future
- If created from estimate, `estimate_id` must be valid and not already converted
- At least one line item required
- `ordered_qty` must be > 0

**Status Transitions:**
- `draft` → `confirmed`: Customer confirmed
- `confirmed` → `in_progress`: Order being processed
- `in_progress` → `partially_fulfilled`: Some items delivered
- `in_progress` → `fulfilled`: All items delivered (automatic based on delivery notes)
- Cannot cancel if already `fulfilled`

**Fulfillment Tracking:**
- Update `delivered_qty` when Delivery Note created
- Calculate `pending_qty = ordered_qty - delivered_qty`
- Automatic status change:
  - `fulfillment_status = 'partially_fulfilled'` when any item partially delivered
  - `fulfillment_status = 'fulfilled'` when all items fully delivered

**Conversion to Delivery Note:**
- Status must be `confirmed` or `in_progress`
- Cannot ship more than `pending_qty`

**Conversion to Invoice:**
- Can create invoice without Delivery Note (direct invoicing)
- Invoice created with ordered quantities

---

#### Delivery Notes

**Create/Update:**
- Must reference a Sales Order OR be standalone
- `shipped_qty` cannot exceed `ordered_qty`
- `backordered_qty = ordered_qty - shipped_qty` (auto-calculated)
- `delivery_date` cannot be in future
- `ship_via_id` must be active

**Status Transitions:**
- `draft` → `ready_to_ship`: Order packed and ready
- `ready_to_ship` → `shipped`: **Inventory deduction happens here**
- `shipped` → `in_transit`: Tracking updated
- `in_transit` → `delivered`: Customer received
- Cancellation allowed only if status = `draft` or `ready_to_ship`

**Inventory Impact:**
- When status → `shipped`:
  - Deduct `shipped_qty` from `products.current_stock`
  - Create inventory transaction records
  - Set `inventory_deducted = true` on line items
  - Prevent over-shipment (validate stock availability)

- When status → `cancelled` (and previously shipped):
  - Restore inventory (reverse transactions)
  - Set `inventory_deducted = false`

**Validation on Ship:**
```javascript
// Pseudo-code
for each line_item:
  if (product.track_inventory):
    if (product.current_stock < line_item.shipped_qty):
      throw Error("Insufficient stock for SKU: {sku}")
```

**Conversion to Invoice:**
- Can convert even if partially shipped
- Invoice created only for shipped quantities
- Multiple delivery notes can create multiple invoices

---

#### Invoices

**Create/Update:**
- `invoice_date` cannot be in future
- `due_date` must be >= `invoice_date`
- At least one line item required
- `quantity` must be > 0
- If created from Delivery Note, quantities must match shipped quantities

**Status Transitions:**
- `draft` → `sent`: Invoice emailed to customer
- `sent` → `partially_paid`: Partial payment recorded
- `sent` → `paid`: Full payment recorded (automatic)
- Auto-status update to `overdue` if `due_date` passed and not paid

**Payment Validation:**
- `amount_paid` cannot exceed `grand_total`
- When payment recorded:
  - Update `amount_paid`
  - Calculate `amount_due = grand_total - amount_paid`
  - If `amount_due = 0`: `payment_status = 'paid'`, `status = 'paid'`
  - If `amount_due < grand_total`: `payment_status = 'partially_paid'`

**Accounting Impact:**
- When status → `sent` or `paid`:
  - Post to General Ledger (if enabled)
  - Create journal entries:
    - Debit: Accounts Receivable
    - Credit: Sales Revenue
    - Credit: Tax Payable (if applicable)

---

#### Bills (Vendor Invoices)

**Create/Update:**
- `bill_date` cannot be in future
- `due_date` must be >= `bill_date`
- `vendor_invoice_no` recommended for tracking

**Payment Validation:**
- Similar to Invoices
- When payment recorded, update `amount_paid` and status

**Inventory Impact (if linked to purchase receipt):**
- Increase inventory on product receipt
- Track cost price updates

---

#### Expenses

**Create/Update:**
- `amount` must be > 0
- `expense_category` required for reporting
- Expense account mapping required for GL posting

**Approval Workflow:**
- Draft expenses require approval
- Status: `draft` → `approved` → `posted`
- Only approved expenses post to ledger

**Payment Tracking:**
- Mark as paid when expense settled
- Link to vendor payment if applicable

---

### Inventory Rules

**Stock Deduction:**
- Only on Delivery Note status = `shipped`
- Validate sufficient stock before deduction
- Support negative stock (configurable per company)

**Stock Adjustment:**
- Manual adjustments create inventory transactions
- Require reason/notes
- Audit logged

**Stock Transfers:**
- Transfer between locations
- Create OUT transaction from source location
- Create IN transaction to destination location

**Low Stock Alerts:**
- Alert when `current_stock <= reorder_level`
- Generate purchase suggestions

---

### Payment Rules

**Customer Payments:**
- Can allocate to single invoice or leave unallocated
- Unallocated payments can be applied later
- Prevent over-payment (validate against invoice amount_due)

**Vendor Payments:**
- Similar to customer payments
- Link to specific bills

**Payment Allocation:**
- FIFO: First In, First Out (oldest invoice first)
- Manual allocation allowed

---

## Document Conversion Logic

### 1. Estimate → Sales Order

**Trigger:** `POST /api/v1/estimates/:id/convert-to-sales-order`

**Process:**
1. Validate estimate status (`draft` or `accepted`)
2. Create new Sales Order:
   - Copy customer details
   - Copy line items with `ordered_qty`
   - Set `source_type = 'estimate'`
   - Link `estimate_id`
3. Update Estimate:
   - Set `converted_to_sales_order = true`
   - Set `sales_order_id`
   - Change status to `converted`
4. Log audit trail

**Fields Mapping:**
```
Estimate → Sales Order
-------------------------
customer_id → customer_id
bill_to → bill_to
ship_to → ship_to
line_items[].ordered_qty → line_items[].ordered_qty
line_items[].rate → line_items[].rate
tax_id → tax_id
```

---

### 2. Sales Order → Delivery Note

**Trigger:** `POST /api/v1/sales-orders/:id/convert-to-delivery-note`

**Process:**
1. Validate Sales Order status (`confirmed` or `in_progress`)
2. Validate requested `shipped_qty` against `pending_qty`
3. Create Delivery Note:
   - Copy customer details
   - Copy ship_to address
   - Create line items with `ordered_qty` and `shipped_qty`
   - Calculate `backordered_qty`
   - Link `sales_order_id`
4. Update Sales Order line items:
   - Increment `delivered_qty` by `shipped_qty`
   - Recalculate `pending_qty`
5. Update Sales Order fulfillment status:
   - If all items fully delivered: `fulfillment_status = 'fulfilled'`
   - Else: `fulfillment_status = 'partially_fulfilled'`

**Partial Shipment Support:**
- Allow creating multiple Delivery Notes for same Sales Order
- Track cumulative delivered quantities
- Prevent over-shipment

**Fields Mapping:**
```
Sales Order → Delivery Note
----------------------------
customer_id → customer_id
ship_to → ship_to
sales_order_no → reference_no (optional)
line_items[].ordered_qty → line_items[].ordered_qty
User Input: shipped_qty → line_items[].shipped_qty
```

---

### 3. Delivery Note → Invoice

**Trigger:** `POST /api/v1/delivery-notes/:id/convert-to-invoice`

**Process:**
1. Validate Delivery Note status (`shipped` or `delivered`)
2. Create Invoice:
   - Copy customer details
   - Create line items with `quantity = shipped_qty`
   - Copy pricing from linked Sales Order (if available)
   - Link `delivery_note_id` and `sales_order_id`
3. Update Delivery Note:
   - Set `invoiced = true`
   - Set `invoice_id`
4. Update Sales Order (if linked):
   - Track invoiced status

**Fields Mapping:**
```
Delivery Note → Invoice
-----------------------
customer_id → customer_id
bill_to (from SO) → bill_to
ship_to → ship_to
line_items[].shipped_qty → line_items[].quantity
line_items[].rate (from SO) → line_items[].rate
```

---

### 4. Sales Order → Invoice (Direct)

**Trigger:** `POST /api/v1/sales-orders/:id/convert-to-invoice`

**Use Case:** Direct invoicing without delivery note (e.g., services)

**Process:**
1. Validate Sales Order status
2. Create Invoice:
   - Copy all line items with `quantity = ordered_qty`
   - Copy pricing
   - Link `sales_order_id`
3. Update Sales Order:
   - Mark as invoiced

---

## Numbering Service

### Auto-Number Generation

**Service:** `DocumentNumberService`

**Format:** `{PREFIX}-{DATE}-{SEQUENCE}`

**Examples:**
- Invoice: `INV-20250127-0001`
- Sales Order: `SO-20250127-0001`
- Estimate: `EST-20250127-0001`
- Delivery Note: `DN-20250127-0001`
- Bill: `BILL-20250127-0001`
- Expense: `EXP-20250127-0001`
- Payment: `PMT-20250127-0001`

**Configuration per Company:**
```sql
-- document_sequences table
{
  "company_id": "...",
  "document_type": "invoice",
  "prefix": "INV",
  "next_number": 1,
  "padding": 4,
  "include_date": true,
  "date_format": "YYYYMMDD",
  "reset_yearly": false,
  "reset_monthly": false
}
```

**Algorithm:**
```javascript
function generateDocumentNumber(companyId, documentType) {
  // Get sequence configuration
  const sequence = getSequence(companyId, documentType);

  // Build number parts
  const parts = [];

  // Add prefix
  parts.push(sequence.prefix);

  // Add date (if enabled)
  if (sequence.include_date) {
    const dateStr = formatDate(new Date(), sequence.date_format);
    parts.push(dateStr);
  }

  // Add sequence number (padded)
  const seqNumber = sequence.next_number.toString().padStart(sequence.padding, '0');
  parts.push(seqNumber);

  // Join with separator
  const documentNumber = parts.join('-');

  // Increment sequence
  incrementSequence(companyId, documentType);

  // Check for reset conditions
  if (sequence.reset_yearly && isNewYear()) {
    resetSequence(companyId, documentType);
  } else if (sequence.reset_monthly && isNewMonth()) {
    resetSequence(companyId, documentType);
  }

  return documentNumber;
}
```

**Concurrency Handling:**
- Use database row-level locking or atomic increment
- PostgreSQL: `UPDATE document_sequences SET next_number = next_number + 1 WHERE id = ? RETURNING next_number`
- Ensure uniqueness with database constraints

**Reset Mechanism:**
```javascript
function resetSequence(companyId, documentType) {
  // Reset to 1 (or configured start number)
  updateSequence(companyId, documentType, {
    next_number: 1,
    last_reset_date: new Date()
  });
}
```

---

## Audit & Logging

### Audit Log Strategy

**What to Log:**
- All create, update, delete operations on documents
- Status changes
- Payment recordings
- Document conversions
- Stock movements
- User login/logout

**Audit Log Entry:**
```javascript
{
  "id": "uuid",
  "company_id": "uuid",
  "entity_type": "invoice",
  "entity_id": "uuid",
  "action": "update",
  "user_id": "uuid",
  "user_name": "John Smith",
  "user_ip": "192.168.1.100",
  "field_name": "status",
  "old_value": "draft",
  "new_value": "sent",
  "changes": {
    "status": {
      "old": "draft",
      "new": "sent"
    },
    "sent_date": {
      "old": null,
      "new": "2025-01-27"
    }
  },
  "description": "Invoice status changed from draft to sent",
  "created_at": "2025-01-27T10:15:30Z"
}
```

**Implementation:**
- Trigger on database level OR application middleware
- Use JSONB for storing change diff
- Index on entity_type, entity_id, created_at

---

### Status History Tracking

**Purpose:** Track document status transitions

**Status History Entry:**
```javascript
{
  "id": "uuid",
  "company_id": "uuid",
  "document_type": "sales_order",
  "document_id": "uuid",
  "document_no": "SO-20250120-001",
  "from_status": "draft",
  "to_status": "confirmed",
  "changed_by": "uuid",
  "changed_by_name": "John Smith",
  "reason": "Customer confirmed via email",
  "notes": "PO# PO-2025-001 received",
  "created_at": "2025-01-20T14:30:00Z"
}
```

**Use Cases:**
- Display status timeline in UI
- Audit compliance
- Track approval workflows

---

### Activity Log (User Actions)

**Purpose:** Track user activities for security and compliance

**Log Entry:**
```javascript
{
  "user_id": "uuid",
  "action": "view_invoice",
  "resource_type": "invoice",
  "resource_id": "uuid",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "line_items[0].quantity",
        "message": "Quantity must be greater than 0"
      },
      {
        "field": "customer_id",
        "message": "Customer ID is required"
      }
    ]
  },
  "timestamp": "2025-01-27T10:00:00Z"
}
```

### Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `CONFLICT` - Business rule violation (e.g., insufficient stock)
- `INTERNAL_ERROR` - Server error

---

## Performance Optimization

1. **Indexes:**
   - All foreign keys indexed
   - Commonly filtered fields (status, date, customer_id)
   - Composite indexes for multi-column filters

2. **Caching:**
   - Cache master data (customers, products, taxes)
   - Cache document sequences
   - Use Redis for session management

3. **Query Optimization:**
   - Use pagination for list endpoints
   - Limit result set size
   - Avoid N+1 queries (use JOINs or batch loading)

4. **Database:**
   - Partition large tables by date
   - Archive old records
   - Regular VACUUM and ANALYZE (PostgreSQL)

---

## Security Considerations

1. **Authentication:**
   - JWT tokens with expiration
   - Refresh token rotation
   - Session timeout

2. **Authorization:**
   - Role-Based Access Control (RBAC)
   - Resource-level permissions
   - Company-level data isolation

3. **Data Protection:**
   - Encrypt sensitive fields (tax_id, bank_account)
   - HTTPS only
   - SQL injection prevention (parameterized queries)
   - XSS protection

4. **Audit:**
   - Log all sensitive operations
   - Monitor failed login attempts
   - Track IP addresses

---

## Additional Modules (Not in Original Prompt)

### Sale Receipts

```sql
CREATE TABLE sale_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    receipt_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'received',
    -- Similar structure to customer_payments
);
```

### Customer Refunds

```sql
CREATE TABLE customer_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    refund_no VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),
    refund_date DATE NOT NULL,
    refund_amount DECIMAL(15,2) NOT NULL,
    refund_method VARCHAR(50),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'processed',
    -- Debit customer account, credit cash/bank
);
```

### Vendor Credits

```sql
CREATE TABLE vendor_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    credit_no VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    bill_id UUID REFERENCES bills(id),
    credit_date DATE NOT NULL,
    credit_amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'applied',
);
```

### Request for Quotation (RFQ)

```sql
CREATE TABLE rfqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    rfq_no VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    rfq_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'sent', -- sent, received, accepted, rejected
    -- Line items similar to estimates
);
```

### Purchase Orders

```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    po_no VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    po_date DATE NOT NULL,
    expected_delivery_date DATE,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, confirmed, received, cancelled
    -- Line items similar to sales orders
);
```

---

## Assumptions & Edge Cases

### Assumptions

1. Single currency per company (multi-currency not implemented)
2. Simple tax calculation (single tax rate per document)
3. No batch/serial number tracking for inventory
4. No multi-warehouse complex allocation logic
5. Payment terms in days (not configurable custom terms)
6. Single billing/shipping address per document
7. No approval workflows (can be added later)
8. No recurring invoices/subscriptions
9. No credit limit enforcement (can be added)
10. Inventory valuation: FIFO assumed

### Edge Cases

1. **Negative Inventory:**
   - Allow or prevent based on company setting
   - Warning message if enabled

2. **Partial Payments:**
   - Support multiple payments per invoice
   - Track payment allocation

3. **Document Editing After Conversion:**
   - Prevent editing source document
   - Allow cancellation with inventory reversal

4. **Concurrent Stock Updates:**
   - Use database locking
   - Retry mechanism for conflicts

5. **Date Validations:**
   - Allow backdating with permission
   - Fiscal year validation

6. **Rounding Differences:**
   - Line-level vs document-level tax
   - Store precision up to 2 decimal places

7. **Deleted Master Data:**
   - Soft delete maintains referential integrity
   - Historical documents retain denormalized data

8. **Bulk Operations:**
   - Batch create/update with transaction rollback
   - Bulk delete with cascade validation

9. **Multi-Location Stock:**
   - Specify stock location per line item
   - Prevent negative stock at location level

10. **Currency Exchange:**
    - Future enhancement
    - Store exchange rates if needed

---

## Migration & Data Import

### Initial Data Setup

1. **Company Setup:**
   - Create company record
   - Configure document sequences
   - Set fiscal year

2. **Master Data Import:**
   - Import customers (CSV/Excel)
   - Import vendors
   - Import products with opening stock
   - Import taxes

3. **Opening Balances:**
   - Import outstanding invoices
   - Import outstanding bills
   - Import inventory opening balance

### Sample Import Format (CSV)

**Products Import:**
```csv
sku,name,description,category,cost_price,selling_price,opening_stock,stock_location
MBP-16,MacBook Pro 16,Apple MacBook Pro,Electronics,2000,2500,50,WAREHOUSE-01
MOUSE,Magic Mouse,Apple Magic Mouse,Accessories,70,99,100,WAREHOUSE-01
```

---

## Next Steps for Implementation

1. **Phase 1: Core Setup**
   - Database schema creation
   - Authentication & authorization
   - Master data APIs (Customers, Vendors, Products)

2. **Phase 2: Sales Module**
   - Estimates
   - Sales Orders
   - Delivery Notes
   - Invoices
   - Customer Payments

3. **Phase 3: Purchase Module**
   - Bills
   - Expenses
   - Vendor Payments

4. **Phase 4: Inventory**
   - Stock transactions
   - Stock adjustments
   - Multi-location support

5. **Phase 5: Reporting**
   - Sales reports
   - Purchase reports
   - Inventory reports
   - Financial reports (if GL integrated)

6. **Phase 6: Advanced Features**
   - Approval workflows
   - Recurring documents
   - Multi-currency
   - API integrations

---

## Conclusion

This backend architecture provides a solid foundation for a comprehensive ERP system with:

- **Scalable database design** with proper indexing and relationships
- **RESTful API** design with clear endpoints and conventions
- **Business logic** enforcement at database and application level
- **Audit trail** for compliance and debugging
- **Flexible document conversion** supporting multiple business workflows
- **Inventory management** with transaction tracking
- **Multi-tenant support** with company-level isolation

The design balances normalization with practical denormalization for historical data preservation, supports partial fulfillment and payment workflows, and provides extensibility for future enhancements.

---

**Document Version:** 1.0
**Last Updated:** 2025-01-27
**Author:** Backend Architecture Team

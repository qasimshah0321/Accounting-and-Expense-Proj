-- Migration 014: RBAC with menu-level permissions

-- 1. Update users.role constraint
-- Drop old constraint and add new one with 3 roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','customer','salesperson'));

-- Migrate existing roles: manager→salesperson, user/viewer→customer
UPDATE users SET role = 'salesperson' WHERE role = 'manager';
UPDATE users SET role = 'customer' WHERE role IN ('user', 'viewer');

-- 2. Create role_menu_permissions table
CREATE TABLE IF NOT EXISTS role_menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  menu_name VARCHAR(100) NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  display_name VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, role, menu_name)
);

-- 3. Create user_customer_map table
CREATE TABLE IF NOT EXISTS user_customer_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Seed default permissions for all existing companies
DO $$
DECLARE
  cid UUID;
BEGIN
  FOR cid IN SELECT id FROM companies LOOP
    -- Admin gets all menus (full access, always)
    INSERT INTO role_menu_permissions (company_id, role, menu_name, can_access, display_name) VALUES
      (cid, 'admin', 'Dashboard', true, 'Dashboard'),
      (cid, 'admin', 'Invoices', true, 'Invoices'),
      (cid, 'admin', 'Sales Order', true, 'Sales Orders'),
      (cid, 'admin', 'Delivery Notes', true, 'Delivery Notes'),
      (cid, 'admin', 'Estimates/Quotations', true, 'Estimates/Quotations'),
      (cid, 'admin', 'Customer Payments', true, 'Customer Payments'),
      (cid, 'admin', 'Bills', true, 'Bills'),
      (cid, 'admin', 'Expenses', true, 'Expenses'),
      (cid, 'admin', 'Purchase Order', true, 'Purchase Order'),
      (cid, 'admin', 'Bill Payments', true, 'Bill Payments'),
      (cid, 'admin', 'Customer Center', true, 'Customer Center'),
      (cid, 'admin', 'Vendor Center', true, 'Vendor Center'),
      (cid, 'admin', 'Product Center', true, 'Product Center'),
      (cid, 'admin', 'Stock Valuation', true, 'Stock Valuation'),
      (cid, 'admin', 'Stock Mobility', true, 'Stock Mobility'),
      (cid, 'admin', 'Financial Statements', true, 'Financial Statements'),
      (cid, 'admin', 'Revenue & Sales Analysis', true, 'Revenue & Sales Analysis'),
      (cid, 'admin', 'Cost & Expense Analytics', true, 'Cost & Expense Analytics'),
      (cid, 'admin', 'Receivables & Payables', true, 'Receivables & Payables'),
      (cid, 'admin', 'Planning & Performance Analysis', true, 'Planning & Performance Analysis'),
      (cid, 'admin', 'Banking Center', true, 'Banking Center'),
      (cid, 'admin', 'Chart of Accounts', true, 'Chart of Accounts'),
      (cid, 'admin', 'Journal Entries', true, 'Journal Entries'),
      (cid, 'admin', 'General Ledger', true, 'General Ledger'),
      (cid, 'admin', 'Trial Balance', true, 'Trial Balance'),
      (cid, 'admin', 'Recurring Documents', true, 'Recurring Documents'),
      (cid, 'admin', 'Company Settings', true, 'Company Settings'),
      (cid, 'admin', 'ERP Flow Guide', true, 'ERP Flow Guide'),
      (cid, 'admin', 'Tax', true, 'Tax'),
      (cid, 'admin', 'Ship Via', true, 'Ship Via'),
      (cid, 'admin', 'Users & Roles', true, 'Users & Roles'),
      (cid, 'admin', 'Role Permissions', true, 'Role Permissions')
    ON CONFLICT (company_id, role, menu_name) DO NOTHING;

    -- Salesperson permissions
    INSERT INTO role_menu_permissions (company_id, role, menu_name, can_access, display_name) VALUES
      (cid, 'salesperson', 'Dashboard', true, 'Dashboard'),
      (cid, 'salesperson', 'Invoices', true, 'Invoices'),
      (cid, 'salesperson', 'Sales Order', true, 'Orders'),
      (cid, 'salesperson', 'Delivery Notes', true, 'Delivery Notes'),
      (cid, 'salesperson', 'Customer Payments', true, 'Customer Payments'),
      (cid, 'salesperson', 'Customer Center', true, 'Customer Center'),
      (cid, 'salesperson', 'Product Center', true, 'Product Center'),
      (cid, 'salesperson', 'Stock Valuation', true, 'Stock Valuation'),
      (cid, 'salesperson', 'Stock Mobility', true, 'Stock Mobility'),
      (cid, 'salesperson', 'Financial Statements', true, 'Financial Statements'),
      (cid, 'salesperson', 'Revenue & Sales Analysis', true, 'Revenue & Sales Analysis')
    ON CONFLICT (company_id, role, menu_name) DO NOTHING;

    -- Customer permissions
    INSERT INTO role_menu_permissions (company_id, role, menu_name, can_access, display_name) VALUES
      (cid, 'customer', 'Dashboard', true, 'Dashboard'),
      (cid, 'customer', 'Sales Order', true, 'Orders'),
      (cid, 'customer', 'Product Center', true, 'Product Center')
    ON CONFLICT (company_id, role, menu_name) DO NOTHING;
  END LOOP;
END;
$$;

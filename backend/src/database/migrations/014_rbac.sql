-- Migration 014: RBAC with menu-level permissions (MySQL)

-- 1. Create role_menu_permissions table
CREATE TABLE IF NOT EXISTS role_menu_permissions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL,
  menu_name VARCHAR(100) NOT NULL,
  can_access TINYINT(1) NOT NULL DEFAULT 1,
  display_name VARCHAR(100),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_rmp_company_role_menu (company_id, role, menu_name),
  CONSTRAINT fk_rmp_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 2. Create user_customer_map table
CREATE TABLE IF NOT EXISTS user_customer_map (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_ucm_user (user_id),
  CONSTRAINT fk_ucm_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_ucm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ucm_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 3. Seed default permissions for all existing companies
-- Admin permissions
INSERT IGNORE INTO role_menu_permissions (id, company_id, role, menu_name, can_access, display_name)
SELECT UUID(), c.id, 'admin', m.menu_name, 1, m.display_name
FROM companies c
CROSS JOIN (
  SELECT 'Dashboard' AS menu_name, 'Dashboard' AS display_name
  UNION ALL SELECT 'Invoices', 'Invoices'
  UNION ALL SELECT 'Sales Order', 'Sales Orders'
  UNION ALL SELECT 'Delivery Notes', 'Delivery Notes'
  UNION ALL SELECT 'Estimates/Quotations', 'Estimates/Quotations'
  UNION ALL SELECT 'Customer Payments', 'Customer Payments'
  UNION ALL SELECT 'Bills', 'Bills'
  UNION ALL SELECT 'Expenses', 'Expenses'
  UNION ALL SELECT 'Purchase Order', 'Purchase Order'
  UNION ALL SELECT 'Bill Payments', 'Bill Payments'
  UNION ALL SELECT 'Customer Center', 'Customer Center'
  UNION ALL SELECT 'Vendor Center', 'Vendor Center'
  UNION ALL SELECT 'Product Center', 'Product Center'
  UNION ALL SELECT 'Stock Valuation', 'Stock Valuation'
  UNION ALL SELECT 'Stock Mobility', 'Stock Mobility'
  UNION ALL SELECT 'Financial Statements', 'Financial Statements'
  UNION ALL SELECT 'Revenue & Sales Analysis', 'Revenue & Sales Analysis'
  UNION ALL SELECT 'Cost & Expense Analytics', 'Cost & Expense Analytics'
  UNION ALL SELECT 'Receivables & Payables', 'Receivables & Payables'
  UNION ALL SELECT 'Planning & Performance Analysis', 'Planning & Performance Analysis'
  UNION ALL SELECT 'Banking Center', 'Banking Center'
  UNION ALL SELECT 'Chart of Accounts', 'Chart of Accounts'
  UNION ALL SELECT 'Journal Entries', 'Journal Entries'
  UNION ALL SELECT 'General Ledger', 'General Ledger'
  UNION ALL SELECT 'Trial Balance', 'Trial Balance'
  UNION ALL SELECT 'Recurring Documents', 'Recurring Documents'
  UNION ALL SELECT 'Company Settings', 'Company Settings'
  UNION ALL SELECT 'ERP Flow Guide', 'ERP Flow Guide'
  UNION ALL SELECT 'Tax', 'Tax'
  UNION ALL SELECT 'Ship Via', 'Ship Via'
  UNION ALL SELECT 'Users & Roles', 'Users & Roles'
  UNION ALL SELECT 'Role Permissions', 'Role Permissions'
) m;

-- Salesperson permissions
INSERT IGNORE INTO role_menu_permissions (id, company_id, role, menu_name, can_access, display_name)
SELECT UUID(), c.id, 'salesperson', m.menu_name, 1, m.display_name
FROM companies c
CROSS JOIN (
  SELECT 'Dashboard' AS menu_name, 'Dashboard' AS display_name
  UNION ALL SELECT 'Invoices', 'Invoices'
  UNION ALL SELECT 'Sales Order', 'Orders'
  UNION ALL SELECT 'Delivery Notes', 'Delivery Notes'
  UNION ALL SELECT 'Customer Payments', 'Customer Payments'
  UNION ALL SELECT 'Customer Center', 'Customer Center'
  UNION ALL SELECT 'Product Center', 'Product Center'
  UNION ALL SELECT 'Stock Valuation', 'Stock Valuation'
  UNION ALL SELECT 'Stock Mobility', 'Stock Mobility'
  UNION ALL SELECT 'Financial Statements', 'Financial Statements'
  UNION ALL SELECT 'Revenue & Sales Analysis', 'Revenue & Sales Analysis'
) m;

-- Customer permissions
INSERT IGNORE INTO role_menu_permissions (id, company_id, role, menu_name, can_access, display_name)
SELECT UUID(), c.id, 'customer', m.menu_name, 1, m.display_name
FROM companies c
CROSS JOIN (
  SELECT 'Dashboard' AS menu_name, 'Dashboard' AS display_name
  UNION ALL SELECT 'Sales Order', 'Orders'
  UNION ALL SELECT 'Product Center', 'Product Center'
) m;

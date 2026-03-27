-- 010_accounting_backbone.sql (MySQL)
-- Phase 1: General Ledger backbone - transforms system into true double-entry accounting

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  sub_type VARCHAR(100),
  parent_id CHAR(36),
  description TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  normal_balance VARCHAR(6) NOT NULL,
  balance DECIMAL(15,4) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_coa_company_acct (company_id, account_number),
  CONSTRAINT fk_coa_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Journal Entries (header)
CREATE TABLE IF NOT EXISTS journal_entries (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  entry_no VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  reference_type VARCHAR(50),
  reference_id CHAR(36),
  reference_no VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'posted',
  reversed_by CHAR(36),
  created_by CHAR(36),
  posted_by CHAR(36),
  posted_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_je_company_no (company_id, entry_no),
  CONSTRAINT fk_je_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Journal Entry Lines (double-entry)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  journal_entry_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  description TEXT,
  debit DECIMAL(15,4) NOT NULL DEFAULT 0,
  credit DECIMAL(15,4) NOT NULL DEFAULT 0,
  line_number INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_jel_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_jel_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
  CONSTRAINT debit_credit_check CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
  )
);

-- Fiscal Periods
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  fiscal_year INT NOT NULL,
  period_number INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uq_fp_company_year_period (company_id, fiscal_year, period_number),
  CONSTRAINT fk_fp_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_coa_company ON chart_of_accounts(company_id);
CREATE INDEX idx_coa_type ON chart_of_accounts(company_id, account_type);
CREATE INDEX idx_je_company ON journal_entries(company_id);
CREATE INDEX idx_je_date ON journal_entries(company_id, entry_date);
CREATE INDEX idx_je_ref ON journal_entries(reference_type, reference_id);
CREATE INDEX idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);
CREATE INDEX idx_fp_company ON fiscal_periods(company_id);

-- Document sequence for journal entries
INSERT IGNORE INTO document_sequences (id, company_id, document_type, prefix, next_number, padding, include_date)
SELECT UUID(), id, 'journal_entry', 'JE', 1, 5, 0
FROM companies;

-- Seed default Chart of Accounts for each company (standard accounts)
-- MySQL doesn't support CROSS JOIN (VALUES ...), so we use UNION ALL
INSERT IGNORE INTO chart_of_accounts (id, company_id, account_number, name, account_type, sub_type, normal_balance, is_system)
SELECT UUID(), c.id, a.account_number, a.name, a.account_type, a.sub_type, a.normal_balance, 1
FROM companies c
CROSS JOIN (
  SELECT '1000' AS account_number, 'Cash and Cash Equivalents' AS name, 'asset' AS account_type, 'current_asset' AS sub_type, 'debit' AS normal_balance
  UNION ALL SELECT '1010', 'Petty Cash', 'asset', 'current_asset', 'debit'
  UNION ALL SELECT '1100', 'Accounts Receivable', 'asset', 'current_asset', 'debit'
  UNION ALL SELECT '1150', 'Allowance for Doubtful Accounts', 'asset', 'current_asset', 'credit'
  UNION ALL SELECT '1200', 'Inventory', 'asset', 'current_asset', 'debit'
  UNION ALL SELECT '1300', 'Prepaid Expenses', 'asset', 'current_asset', 'debit'
  UNION ALL SELECT '1500', 'Property, Plant & Equipment', 'asset', 'fixed_asset', 'debit'
  UNION ALL SELECT '1510', 'Accumulated Depreciation', 'asset', 'fixed_asset', 'credit'
  UNION ALL SELECT '1900', 'Other Assets', 'asset', 'other_asset', 'debit'
  UNION ALL SELECT '2000', 'Accounts Payable', 'liability', 'current_liability', 'credit'
  UNION ALL SELECT '2100', 'Accrued Expenses', 'liability', 'current_liability', 'credit'
  UNION ALL SELECT '2200', 'Sales Tax Payable', 'liability', 'current_liability', 'credit'
  UNION ALL SELECT '2300', 'Short-term Loans', 'liability', 'current_liability', 'credit'
  UNION ALL SELECT '2500', 'Long-term Debt', 'liability', 'long_term_liability', 'credit'
  UNION ALL SELECT '3000', 'Owner''s Equity', 'equity', 'equity', 'credit'
  UNION ALL SELECT '3100', 'Retained Earnings', 'equity', 'equity', 'credit'
  UNION ALL SELECT '3200', 'Owner''s Drawing', 'equity', 'equity', 'debit'
  UNION ALL SELECT '4000', 'Sales Revenue', 'revenue', 'operating_revenue', 'credit'
  UNION ALL SELECT '4100', 'Service Revenue', 'revenue', 'operating_revenue', 'credit'
  UNION ALL SELECT '4900', 'Other Income', 'revenue', 'other_revenue', 'credit'
  UNION ALL SELECT '5000', 'Cost of Goods Sold', 'expense', 'cost_of_sales', 'debit'
  UNION ALL SELECT '5100', 'Salaries & Wages', 'expense', 'operating_expense', 'debit'
  UNION ALL SELECT '5200', 'Rent Expense', 'expense', 'operating_expense', 'debit'
  UNION ALL SELECT '5300', 'Utilities Expense', 'expense', 'operating_expense', 'debit'
  UNION ALL SELECT '5400', 'Office Supplies', 'expense', 'operating_expense', 'debit'
  UNION ALL SELECT '5500', 'Marketing & Advertising', 'expense', 'operating_expense', 'debit'
  UNION ALL SELECT '5600', 'Professional Fees', 'expense', 'operating_expense', 'debit'
  UNION ALL SELECT '5700', 'Depreciation Expense', 'expense', 'operating_expense', 'debit'
  UNION ALL SELECT '5800', 'Bank Charges', 'expense', 'operating_expense', 'debit'
  UNION ALL SELECT '5900', 'Other Expenses', 'expense', 'other_expense', 'debit'
) a;

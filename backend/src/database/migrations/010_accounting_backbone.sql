-- 010_accounting_backbone.sql
-- Phase 1: General Ledger backbone - transforms system into true double-entry accounting

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_number VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  sub_type VARCHAR(100),
  parent_id UUID REFERENCES chart_of_accounts(id),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  normal_balance VARCHAR(6) NOT NULL CHECK (normal_balance IN ('debit','credit')),
  balance NUMERIC(15,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, account_number)
);

-- Journal Entries (header)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_no VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  reference_no VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','reversed')),
  reversed_by UUID REFERENCES journal_entries(id),
  created_by UUID REFERENCES users(id),
  posted_by UUID REFERENCES users(id),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, entry_no)
);

-- Journal Entry Lines (double-entry)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  description TEXT,
  debit NUMERIC(15,4) NOT NULL DEFAULT 0,
  credit NUMERIC(15,4) NOT NULL DEFAULT 0,
  line_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT debit_credit_check CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
  )
);

-- Fiscal Periods
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','locked')),
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, fiscal_year, period_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coa_company ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(company_id, account_type);
CREATE INDEX IF NOT EXISTS idx_je_company ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(company_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_je_ref ON journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_fp_company ON fiscal_periods(company_id);

-- Document sequence for journal entries
INSERT INTO document_sequences (company_id, document_type, prefix, next_number, padding, include_date)
SELECT id, 'journal_entry', 'JE', 1, 5, false
FROM companies
ON CONFLICT (company_id, document_type) DO NOTHING;

-- Seed default Chart of Accounts for each company (standard accounts)
INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, is_system)
SELECT
  c.id,
  a.account_number,
  a.name,
  a.account_type,
  a.sub_type,
  a.normal_balance,
  true
FROM companies c
CROSS JOIN (VALUES
  -- ASSETS (1xxx)
  ('1000', 'Cash and Cash Equivalents',       'asset', 'current_asset',    'debit'),
  ('1010', 'Petty Cash',                       'asset', 'current_asset',    'debit'),
  ('1100', 'Accounts Receivable',              'asset', 'current_asset',    'debit'),
  ('1150', 'Allowance for Doubtful Accounts',  'asset', 'current_asset',    'credit'),
  ('1200', 'Inventory',                        'asset', 'current_asset',    'debit'),
  ('1300', 'Prepaid Expenses',                 'asset', 'current_asset',    'debit'),
  ('1500', 'Property, Plant & Equipment',      'asset', 'fixed_asset',      'debit'),
  ('1510', 'Accumulated Depreciation',         'asset', 'fixed_asset',      'credit'),
  ('1900', 'Other Assets',                     'asset', 'other_asset',      'debit'),
  -- LIABILITIES (2xxx)
  ('2000', 'Accounts Payable',                 'liability', 'current_liability', 'credit'),
  ('2100', 'Accrued Expenses',                 'liability', 'current_liability', 'credit'),
  ('2200', 'Sales Tax Payable',                'liability', 'current_liability', 'credit'),
  ('2300', 'Short-term Loans',                 'liability', 'current_liability', 'credit'),
  ('2500', 'Long-term Debt',                   'liability', 'long_term_liability','credit'),
  -- EQUITY (3xxx)
  ('3000', 'Owner''s Equity',                  'equity', 'equity',          'credit'),
  ('3100', 'Retained Earnings',                'equity', 'equity',          'credit'),
  ('3200', 'Owner''s Drawing',                 'equity', 'equity',          'debit'),
  -- REVENUE (4xxx)
  ('4000', 'Sales Revenue',                    'revenue', 'operating_revenue', 'credit'),
  ('4100', 'Service Revenue',                  'revenue', 'operating_revenue', 'credit'),
  ('4900', 'Other Income',                     'revenue', 'other_revenue',   'credit'),
  -- EXPENSES (5xxx)
  ('5000', 'Cost of Goods Sold',               'expense', 'cost_of_sales',  'debit'),
  ('5100', 'Salaries & Wages',                 'expense', 'operating_expense','debit'),
  ('5200', 'Rent Expense',                     'expense', 'operating_expense','debit'),
  ('5300', 'Utilities Expense',                'expense', 'operating_expense','debit'),
  ('5400', 'Office Supplies',                  'expense', 'operating_expense','debit'),
  ('5500', 'Marketing & Advertising',          'expense', 'operating_expense','debit'),
  ('5600', 'Professional Fees',                'expense', 'operating_expense','debit'),
  ('5700', 'Depreciation Expense',             'expense', 'operating_expense','debit'),
  ('5800', 'Bank Charges',                     'expense', 'operating_expense','debit'),
  ('5900', 'Other Expenses',                   'expense', 'other_expense',   'debit')
) AS a(account_number, name, account_type, sub_type, normal_balance)
ON CONFLICT (company_id, account_number) DO NOTHING;

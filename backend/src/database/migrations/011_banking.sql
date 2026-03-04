-- 011_banking.sql
-- Phase 3: Banking module - bank accounts, transactions, reconciliation

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  bank_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('checking','savings','credit_card','cash','other')),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  opening_balance NUMERIC(15,4) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15,4) NOT NULL DEFAULT 0,
  gl_account_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Bank Transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,4) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit','withdrawal','transfer','fee','interest','adjustment')),
  reference_no VARCHAR(100),
  payee VARCHAR(255),
  category VARCHAR(255),
  is_reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciliation_id UUID,
  matched_journal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Bank Reconciliations
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  statement_ending_balance NUMERIC(15,4) NOT NULL,
  book_balance NUMERIC(15,4) NOT NULL DEFAULT 0,
  reconciled_balance NUMERIC(15,4) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','reconciled')),
  reconciled_by UUID REFERENCES users(id),
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from bank_transactions.reconciliation_id to bank_reconciliations
ALTER TABLE bank_transactions
  ADD CONSTRAINT fk_bank_tx_reconciliation
  FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_gl ON bank_accounts(gl_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_company ON bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON bank_transactions(bank_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_tx_reconciled ON bank_transactions(bank_account_id, is_reconciled);
CREATE INDEX IF NOT EXISTS idx_bank_recon_company ON bank_reconciliations(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_account ON bank_reconciliations(bank_account_id);

-- Document sequence for bank_transaction
INSERT INTO document_sequences (company_id, document_type, prefix, next_number, padding, include_date)
SELECT id, 'bank_transaction', 'BT', 1, 5, false
FROM companies
ON CONFLICT (company_id, document_type) DO NOTHING;

-- Seed bank-related chart of accounts for each company
INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, is_system)
SELECT c.id, a.account_number, a.name, a.account_type, a.sub_type, a.normal_balance, true
FROM companies c
CROSS JOIN (VALUES
  ('1010', 'Checking Account',  'asset', 'bank', 'debit'),
  ('1020', 'Savings Account',   'asset', 'bank', 'debit'),
  ('1030', 'Petty Cash',        'asset', 'bank', 'debit')
) AS a(account_number, name, account_type, sub_type, normal_balance)
ON CONFLICT (company_id, account_number) DO UPDATE
  SET sub_type = EXCLUDED.sub_type;

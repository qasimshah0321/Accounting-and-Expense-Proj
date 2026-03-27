-- 011_banking.sql (MySQL)
-- Phase 3: Banking module - bank accounts, transactions, reconciliation

-- Drop partial tables from any previously failed run (DDL cannot roll back)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS bank_reconciliations;
DROP TABLE IF EXISTS bank_transactions;
DROP TABLE IF EXISTS bank_accounts;
SET FOREIGN_KEY_CHECKS = 1;

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  bank_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  opening_balance DECIMAL(15,4) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15,4) NOT NULL DEFAULT 0,
  gl_account_id CHAR(36),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  deleted_at DATETIME,
  CONSTRAINT fk_bank_accounts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Bank Transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  bank_account_id CHAR(36) NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,4) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  reference_no VARCHAR(100),
  payee VARCHAR(255),
  category VARCHAR(255),
  is_reconciled TINYINT(1) NOT NULL DEFAULT 0,
  reconciled_at DATETIME,
  reconciliation_id CHAR(36),
  matched_journal_entry_id CHAR(36),
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  deleted_at DATETIME,
  CONSTRAINT fk_bank_tx_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_bank_tx_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
);

-- Bank Reconciliations
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  bank_account_id CHAR(36) NOT NULL,
  statement_date DATE NOT NULL,
  statement_ending_balance DECIMAL(15,4) NOT NULL,
  book_balance DECIMAL(15,4) NOT NULL DEFAULT 0,
  reconciled_balance DECIMAL(15,4) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  reconciled_by CHAR(36),
  reconciled_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_bank_recon_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_bank_recon_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
);

-- Add FK from bank_transactions.reconciliation_id to bank_reconciliations
ALTER TABLE bank_transactions
  ADD CONSTRAINT fk_bank_tx_reconciliation
  FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id);

-- Indexes
CREATE INDEX idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX idx_bank_accounts_gl ON bank_accounts(gl_account_id);
CREATE INDEX idx_bank_tx_company ON bank_transactions(company_id);
CREATE INDEX idx_bank_tx_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_tx_date ON bank_transactions(bank_account_id, transaction_date);
CREATE INDEX idx_bank_tx_reconciled ON bank_transactions(bank_account_id, is_reconciled);
CREATE INDEX idx_bank_recon_company ON bank_reconciliations(company_id);
CREATE INDEX idx_bank_recon_account ON bank_reconciliations(bank_account_id);

-- Document sequence for bank_transaction
INSERT IGNORE INTO document_sequences (id, company_id, document_type, prefix, next_number, padding, include_date)
SELECT UUID(), id, 'bank_transaction', 'BT', 1, 5, 0
FROM companies;

-- Seed bank-related chart of accounts for each company
INSERT IGNORE INTO chart_of_accounts (id, company_id, account_number, name, account_type, sub_type, normal_balance, is_system)
SELECT UUID(), c.id, a.account_number, a.name, a.account_type, a.sub_type, a.normal_balance, 1
FROM companies c
CROSS JOIN (
  SELECT '1010' AS account_number, 'Checking Account' AS name, 'asset' AS account_type, 'bank' AS sub_type, 'debit' AS normal_balance
  UNION ALL SELECT '1020', 'Savings Account', 'asset', 'bank', 'debit'
  UNION ALL SELECT '1030', 'Petty Cash', 'asset', 'bank', 'debit'
) a;

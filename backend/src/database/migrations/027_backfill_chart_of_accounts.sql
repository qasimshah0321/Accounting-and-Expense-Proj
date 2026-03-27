-- 027_backfill_chart_of_accounts.sql
-- Backfill default chart of accounts for any companies that were registered
-- after migration 010 ran (and thus have no GL accounts).

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
  UNION ALL SELECT '3000', "Owner's Equity", 'equity', 'equity', 'credit'
  UNION ALL SELECT '3100', 'Retained Earnings', 'equity', 'equity', 'credit'
  UNION ALL SELECT '3200', "Owner's Drawing", 'equity', 'equity', 'debit'
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

-- Ensure journal_entry document sequence exists for all companies
INSERT IGNORE INTO document_sequences (id, company_id, document_type, prefix, next_number, padding, include_date)
SELECT UUID(), id, 'journal_entry', 'JE', 1, 5, 0
FROM companies;

-- Migration 046: Add accounts required for complete GL posting coverage
-- Input Tax Recoverable (purchase-side tax), Inventory Write-Off, and Suspense

INSERT IGNORE INTO chart_of_accounts
  (id, company_id, account_number, name, account_type, sub_type, normal_balance, is_system, balance)
SELECT
  UUID(), c.id, '1250', 'Input Tax Recoverable',
  'asset', 'current_asset', 'debit', 1, 0
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts x
  WHERE x.company_id = c.id AND x.account_number = '1250'
);

INSERT IGNORE INTO chart_of_accounts
  (id, company_id, account_number, name, account_type, sub_type, normal_balance, is_system, balance)
SELECT
  UUID(), c.id, '5050', 'Inventory Write-Off / Shrinkage',
  'expense', 'cost_of_sales', 'debit', 1, 0
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts x
  WHERE x.company_id = c.id AND x.account_number = '5050'
);

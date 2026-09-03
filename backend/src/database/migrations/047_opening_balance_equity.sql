-- Migration 047: Add Opening Balance Equity account (3050)
-- Used as the offsetting account when posting opening balances during system migration

INSERT IGNORE INTO chart_of_accounts
  (id, company_id, account_number, name, account_type, sub_type, normal_balance, is_system, balance)
SELECT
  UUID(), c.id, '3050', 'Opening Balance Equity',
  'equity', 'equity', 'credit', 1, 0
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts x
  WHERE x.company_id = c.id AND x.account_number = '3050'
);

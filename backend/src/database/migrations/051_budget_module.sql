-- ============================================================
-- 051: Budget Module
-- ------------------------------------------------------------
-- Adds budget_periods and budget_lines tables to support
-- Budget vs Actual reporting (Report 3 in Enhanced Statements).
--   budget_periods : a named fiscal-year budget (draft/active/locked)
--   budget_lines   : per-account, per-month budgeted amounts
-- ============================================================

CREATE TABLE IF NOT EXISTS budget_periods (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  fiscal_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('draft','active','locked') NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by CHAR(36),
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  PRIMARY KEY (id),
  KEY idx_bp_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budget_lines (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  budget_period_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uk_budget_line (budget_period_id, account_id, month, year),
  KEY idx_bl_period (budget_period_id),
  CONSTRAINT fk_bl_period FOREIGN KEY (budget_period_id) REFERENCES budget_periods(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

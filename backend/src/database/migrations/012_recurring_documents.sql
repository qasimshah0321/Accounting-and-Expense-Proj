-- Migration 012: Recurring Documents (MySQL)
-- Allows creation of recurring invoice/bill/expense templates

CREATE TABLE IF NOT EXISTS recurring_documents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  document_type VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  frequency VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  total_runs INT DEFAULT 0,
  max_runs INT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  template_data JSON NOT NULL,
  created_by CHAR(36),
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  deleted_at DATETIME,
  CONSTRAINT fk_recurring_docs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_recurring_docs_company ON recurring_documents(company_id);
CREATE INDEX idx_recurring_docs_next_run ON recurring_documents(next_run_date);

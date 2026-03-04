-- Migration 012: Recurring Documents
-- Allows creation of recurring invoice/bill/expense templates

CREATE TABLE IF NOT EXISTS recurring_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('invoice','bill','expense')),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly','monthly','quarterly','annually')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  total_runs INTEGER DEFAULT 0,
  max_runs INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recurring_docs_company ON recurring_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_docs_next_run ON recurring_documents(next_run_date) WHERE is_active=true AND deleted_at IS NULL;

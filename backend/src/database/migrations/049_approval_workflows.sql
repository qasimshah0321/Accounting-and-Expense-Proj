-- ============================================================
-- 049: Approval Workflow Engine
-- ============================================================

SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS approval_workflow_rules (
  id              CHAR(36)       NOT NULL DEFAULT (UUID()),
  company_id      CHAR(36)       NOT NULL,
  document_type   VARCHAR(50)    NOT NULL,
  min_amount      DECIMAL(15,2)  NOT NULL DEFAULT 0,
  max_amount      DECIMAL(15,2)  NULL,
  approver_role   VARCHAR(100)   NOT NULL,
  step_order      INT            NOT NULL DEFAULT 1,
  is_active       TINYINT(1)     NOT NULL DEFAULT 1,
  created_at      DATETIME       NOT NULL DEFAULT NOW(),
  updated_at      DATETIME       NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  KEY idx_awr_company_doctype (company_id, document_type, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_requests (
  id                CHAR(36)       NOT NULL DEFAULT (UUID()),
  company_id        CHAR(36)       NOT NULL,
  rule_id           CHAR(36)       NOT NULL,
  document_type     VARCHAR(50)    NOT NULL,
  document_id       CHAR(36)       NOT NULL,
  document_no       VARCHAR(100)   NULL,
  document_amount   DECIMAL(15,2)  NULL,
  status            VARCHAR(20)    NOT NULL DEFAULT 'pending',
  requested_by      CHAR(36)       NULL,
  actioned_by       CHAR(36)       NULL,
  actioned_at       DATETIME       NULL,
  rejection_reason  TEXT           NULL,
  created_at        DATETIME       NOT NULL DEFAULT NOW(),
  updated_at        DATETIME       NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  KEY idx_ar_company_status (company_id, status),
  KEY idx_ar_document (document_type, document_id),
  KEY idx_ar_rule (rule_id),
  CONSTRAINT chk_ar_status CHECK (status IN ('pending','approved','rejected','cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================
-- 050: Scheduler Job Log
-- ------------------------------------------------------------
-- Auditability for the in-process node-cron job runner.
-- Each scheduled job logs its execution here.
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduler_job_log (
  id                INT           NOT NULL AUTO_INCREMENT,
  job_name          VARCHAR(100)  NOT NULL,
  started_at        DATETIME      NOT NULL DEFAULT NOW(),
  completed_at      DATETIME      NULL,
  records_affected  INT           NOT NULL DEFAULT 0,
  error_message     TEXT          NULL,
  PRIMARY KEY (id),
  KEY idx_sjl_job_name (job_name),
  KEY idx_sjl_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

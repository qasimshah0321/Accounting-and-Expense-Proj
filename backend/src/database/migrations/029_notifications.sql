-- Migration 029: In-app notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  company_id    VARCHAR(36)  NOT NULL,
  recipient_user_id VARCHAR(36) NOT NULL,
  type          VARCHAR(50)  NOT NULL DEFAULT 'general',
  title         VARCHAR(255) NOT NULL,
  body          TEXT         NOT NULL,
  data          JSON         NULL,
  is_read       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user_read (recipient_user_id, is_read),
  INDEX idx_notif_company   (company_id),
  INDEX idx_notif_created   (created_at)
);

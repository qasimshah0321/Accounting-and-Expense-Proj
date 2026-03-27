-- Push notification subscriptions for Web Push API
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  user_role VARCHAR(20) NOT NULL DEFAULT 'admin',
  linked_customer_id VARCHAR(36) NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ps_company (company_id),
  INDEX idx_ps_user (user_id),
  INDEX idx_ps_customer (linked_customer_id)
);

-- 045: Custom company-defined roles (replaces role_menu_permissions-based roles)

CREATE TABLE IF NOT EXISTS roles (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  company_id  CHAR(36)     NOT NULL,
  role_code   VARCHAR(50)  NOT NULL,
  role_name   VARCHAR(100) NOT NULL,
  description TEXT,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT NOW(),
  updated_at  DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_code (company_id, role_code),
  KEY        idx_roles_co (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default roles for any existing companies that already have users
INSERT IGNORE INTO roles (company_id, role_code, role_name, description)
SELECT DISTINCT company_id, 'salesperson', 'Salesperson', 'Sales team member with access to sales modules'
FROM users WHERE role = 'salesperson' AND deleted_at IS NULL;

INSERT IGNORE INTO roles (company_id, role_code, role_name, description)
SELECT DISTINCT company_id, 'customer', 'Customer', 'Customer portal access'
FROM users WHERE role = 'customer' AND deleted_at IS NULL;

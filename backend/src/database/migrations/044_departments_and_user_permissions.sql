-- 044: Departments + Department-level + User-level menu permissions

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  company_id  CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(20)  NOT NULL DEFAULT '#4f46e5',
  created_at  DATETIME     NOT NULL DEFAULT NOW(),
  updated_at  DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_dept_name   (company_id, name),
  KEY        idx_dept_co    (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-department menu permissions
CREATE TABLE IF NOT EXISTS department_menu_permissions (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  company_id    CHAR(36)     NOT NULL,
  department_id CHAR(36)     NOT NULL,
  menu_name     VARCHAR(100) NOT NULL,
  can_access    TINYINT(1)   NOT NULL DEFAULT 1,
  display_name  VARCHAR(100),
  updated_at    DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_dept_menu     (department_id, menu_name),
  KEY        idx_dept_menu_co (company_id),
  KEY        idx_dept_menu_d  (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-user menu permission overrides (user > dept > role)
CREATE TABLE IF NOT EXISTS user_menu_permissions (
  id           CHAR(36)     NOT NULL DEFAULT (UUID()),
  company_id   CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  menu_name    VARCHAR(100) NOT NULL,
  can_access   TINYINT(1)   NOT NULL DEFAULT 1,
  display_name VARCHAR(100),
  updated_at   DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_menu     (user_id, menu_name),
  KEY        idx_user_menu_co (company_id),
  KEY        idx_user_menu_u  (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add department_id to users (one user → one department)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department_id CHAR(36) NULL DEFAULT NULL;

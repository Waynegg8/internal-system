-- ============================================
-- 0001_core_tables.sql
-- 整合自以下遷移文件:
--   - 2025-10-30T000000Z_init_auth.sql
--   - 2025-10-30T000100Z_clients.sql
--   - 2025-10-30T001000Z_client_services_lifecycle.sql
--   - 2025-10-31T020200Z_refactor_client_services.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-30T000000Z_init_auth.sql
-- ============================================

-- 初始化使用者與會話結構（可重入）

-- Users（員工/用戶）
CREATE TABLE IF NOT EXISTS Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT 0,
  gender TEXT NOT NULL,
  birth_date TEXT,
  start_date TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  login_attempts INTEGER DEFAULT 0,
  last_failed_login TEXT,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON Users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON Users(is_admin);

-- sessions（會話）
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  meta_json TEXT,
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);





-- ============================================
-- 來源: 2025-10-30T000100Z_clients.sql
-- ============================================

-- 客戶管理基礎結構（列表 API 依賴）

-- Clients
CREATE TABLE IF NOT EXISTS Clients (
  client_id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  tax_registration_number TEXT,
  business_status TEXT DEFAULT '營業中',
  assignee_user_id INTEGER NOT NULL,
  phone TEXT,
  email TEXT,
  client_notes TEXT,
  payment_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);
CREATE INDEX IF NOT EXISTS idx_clients_assignee ON Clients(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON Clients(company_name);

-- CustomerTags
CREATE TABLE IF NOT EXISTS CustomerTags (
  tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_name TEXT UNIQUE NOT NULL,
  tag_color TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ClientTagAssignments
CREATE TABLE IF NOT EXISTS ClientTagAssignments (
  assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES CustomerTags(tag_id),
  UNIQUE(client_id, tag_id)
);





-- ============================================
-- 來源: 2025-10-30T001000Z_client_services_lifecycle.sql
-- ============================================

-- ClientServices lifecycle columns

-- ALTER TABLE ClientServices ADD COLUMN suspended_at TEXT;  -- 已存在，跳過
-- ALTER TABLE ClientServices ADD COLUMN resumed_at TEXT;  -- 已存在，跳過
-- ALTER TABLE ClientServices ADD COLUMN suspension_reason TEXT;  -- 已存在，跳過
-- ALTER TABLE ClientServices ADD COLUMN suspension_effective_date TEXT;  -- 已存在，跳過 -- YYYY-MM-DD
-- ALTER TABLE ClientServices ADD COLUMN auto_renew BOOLEAN DEFAULT 1;  -- 已存在，跳過
-- ALTER TABLE ClientServices ADD COLUMN cancelled_at TEXT;  -- 已存在，跳過
-- ALTER TABLE ClientServices ADD COLUMN cancelled_by INTEGER;  -- 已存在，跳過

-- 索引創建移到 0002_tasks_timesheets.sql（ClientServices 表在 0002 中創建）
-- CREATE INDEX IF NOT EXISTS idx_client_services_status ON ClientServices(status);
-- CREATE INDEX IF NOT EXISTS idx_client_services_suspend_effective ON ClientServices(suspension_effective_date);

-- ServiceChangeHistory table
CREATE TABLE IF NOT EXISTS ServiceChangeHistory (
  change_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT,
  changed_by INTEGER NOT NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  reason TEXT,
  notes TEXT,
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (changed_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_service_change_service ON ServiceChangeHistory(client_service_id);
CREATE INDEX IF NOT EXISTS idx_service_change_date ON ServiceChangeHistory(changed_at);





-- ============================================
-- 來源: 2025-10-31T020200Z_refactor_client_services.sql
-- ============================================

-- 修改ClientServices表结构（不破坏外键约束）

-- 這些 ALTER TABLE 語句移到 0002_tasks_timesheets.sql（ClientServices 表在 0002 中創建）
-- ALTER TABLE ClientServices ADD COLUMN service_cycle TEXT DEFAULT 'monthly';
-- ALTER TABLE ClientServices ADD COLUMN task_template_id INTEGER;
-- ALTER TABLE ClientServices ADD COLUMN auto_generate_tasks BOOLEAN DEFAULT 1;

-- 索引創建也移到 0002
-- CREATE INDEX IF NOT EXISTS idx_client_services_cycle ON ClientServices(service_cycle);
-- CREATE INDEX IF NOT EXISTS idx_client_services_template ON ClientServices(task_template_id);




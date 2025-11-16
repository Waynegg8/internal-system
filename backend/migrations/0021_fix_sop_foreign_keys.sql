-- ============================================
-- 0021_fix_sop_foreign_keys.sql
-- 修復 SOP 外鍵約束，將 SOPs 改為 SOPDocuments
-- ============================================

-- 1. 重建 ClientServiceSOPs 表（修復外鍵引用）
DROP TABLE IF EXISTS ClientServiceSOPs;

CREATE TABLE IF NOT EXISTS ClientServiceSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(client_service_id, sop_id)
);

-- 2. 重建 TaskConfigSOPs 表（修復外鍵引用）
DROP TABLE IF EXISTS TaskConfigSOPs;

CREATE TABLE IF NOT EXISTS TaskConfigSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (config_id) REFERENCES ClientServiceTaskConfigs(config_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(config_id, sop_id)
);

-- 3. 重建 ActiveTaskSOPs 表（修復外鍵引用）
DROP TABLE IF EXISTS ActiveTaskSOPs;

CREATE TABLE IF NOT EXISTS ActiveTaskSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(task_id, sop_id)
);







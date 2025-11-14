-- ============================================
-- 移除服務組件層級，簡化架構
-- 任務配置直接關聯到 ClientServices
-- 工時表記錄任務類型（task_type），不記錄 task_id
-- ============================================

-- 1. 清理測試數據和舊表
DROP TABLE IF EXISTS ServiceComponentTaskSOPs;
DROP TABLE IF EXISTS ServiceComponentTasks;
DROP TABLE IF EXISTS ServiceComponentSOPs;
DROP TABLE IF EXISTS ServiceComponentFAQs;
DROP TABLE IF EXISTS ServiceComponents;
DROP TABLE IF EXISTS ActiveTasks;
DROP TABLE IF EXISTS ActiveTaskSOPs;
DROP TABLE IF EXISTS ActiveTaskFAQs;
DROP TABLE IF EXISTS ActiveTaskDocuments;
DROP TABLE IF EXISTS TaskHistoryLog;

-- 2. 創建新的任務配置表（直接關聯到 ClientServices）
CREATE TABLE IF NOT EXISTS ClientServiceTaskConfigs (
  config_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  task_name TEXT NOT NULL,              -- 任務類型名稱
  task_description TEXT,
  assignee_user_id INTEGER,
  estimated_hours REAL,
  advance_days INTEGER DEFAULT 7,       -- 提前幾天生成任務
  due_rule TEXT DEFAULT 'end_of_month' CHECK(due_rule IN ('end_of_month', 'specific_day', 'next_month_day', 'days_after_start')),
  due_value INTEGER,
  stage_order INTEGER DEFAULT 0,
  delivery_frequency TEXT DEFAULT 'monthly' CHECK(delivery_frequency IN ('monthly', 'bi-monthly', 'quarterly', 'yearly', 'one-time')),
  delivery_months TEXT,                 -- JSON 陣列，例如 "[1,3,6,9]"
  auto_generate INTEGER DEFAULT 1,      -- 是否自動生成任務
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id)
);

-- 3. 創建新的 ActiveTasks 表
CREATE TABLE IF NOT EXISTS ActiveTasks (
  task_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_service_id INTEGER NOT NULL,   -- 直接關聯到客戶服務
  service_id INTEGER NOT NULL,
  task_config_id INTEGER,                -- 關聯到任務配置（可選，手動創建的任務可能沒有）
  task_type TEXT NOT NULL,               -- 任務類型/名稱（用於工時統計）⭐
  task_description TEXT,
  assignee_user_id INTEGER,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  service_year INTEGER NOT NULL,
  service_month INTEGER NOT NULL,
  due_date TEXT,
  completed_at TEXT,
  estimated_hours REAL,
  actual_hours REAL,
  stage_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (task_config_id) REFERENCES ClientServiceTaskConfigs(config_id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id)
);

-- 4. 創建服務層級 SOP 關聯表
CREATE TABLE IF NOT EXISTS ClientServiceSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPs(sop_id) ON DELETE CASCADE,
  UNIQUE(client_service_id, sop_id)
);

-- 5. 創建任務配置層級 SOP 關聯表
CREATE TABLE IF NOT EXISTS TaskConfigSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (config_id) REFERENCES ClientServiceTaskConfigs(config_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPs(sop_id) ON DELETE CASCADE,
  UNIQUE(config_id, sop_id)
);

-- 6. 創建 ActiveTasks 的 SOP 關聯表
CREATE TABLE IF NOT EXISTS ActiveTaskSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPs(sop_id) ON DELETE CASCADE,
  UNIQUE(task_id, sop_id)
);

-- 7. 重建 Timesheets 表（使用 task_type 而不是 task_id）
DROP TABLE IF EXISTS Timesheets;

CREATE TABLE IF NOT EXISTS Timesheets (
  timesheet_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,              -- YYYY-MM-DD
  client_id TEXT,                       -- 客戶ID（可為空：非客戶工時）
  service_id INTEGER,                   -- 服務ID
  task_type TEXT,                       -- 任務類型/名稱 ⭐（用於報表統計）
  work_type TEXT NOT NULL,              -- normal | ot-weekday | ot-rest | holiday
  hours REAL NOT NULL,                  -- 0.5 的倍數
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (service_id) REFERENCES Services(service_id)
);

-- 8. 創建索引優化查詢
CREATE INDEX IF NOT EXISTS idx_timesheets_user_date ON Timesheets(user_id, work_date) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_timesheets_client ON Timesheets(client_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_timesheets_service ON Timesheets(service_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_timesheets_task_type ON Timesheets(task_type) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_timesheets_type ON Timesheets(work_type) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_timesheets_report ON Timesheets(client_id, service_id, task_type, work_date) WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_task_configs_service ON ClientServiceTaskConfigs(client_service_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_task_configs_assignee ON ClientServiceTaskConfigs(assignee_user_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_task_configs_name ON ClientServiceTaskConfigs(task_name) WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_service_sops_service ON ClientServiceSOPs(client_service_id);
CREATE INDEX IF NOT EXISTS idx_task_config_sops_config ON TaskConfigSOPs(config_id);

CREATE INDEX IF NOT EXISTS idx_active_tasks_service ON ActiveTasks(client_service_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_active_tasks_type ON ActiveTasks(task_type) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_active_tasks_assignee ON ActiveTasks(assignee_user_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_active_tasks_status ON ActiveTasks(status) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_active_tasks_year_month ON ActiveTasks(service_year, service_month) WHERE is_deleted = 0;



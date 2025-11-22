-- 徹底重構：基於數據穩定性的任務生成模板系統
-- 核心思想：客戶服務配置建立後變動不大，第一次完整計算後，後續月份應該複用

-- 1. 任務生成模板表：存儲每個配置的穩定生成規則
-- 這個表存儲的是"如何生成任務"的規則，而不是具體某個月的任務
CREATE TABLE IF NOT EXISTS TaskGenerationTemplates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_service_id INTEGER NOT NULL,
  config_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  
  -- 任務基本信息（穩定數據）
  task_name TEXT NOT NULL,
  task_description TEXT,
  assignee_user_id INTEGER,
  estimated_hours REAL,
  stage_order INTEGER DEFAULT 0,
  notes TEXT,
  
  -- 生成規則（穩定數據）
  generation_time_rule TEXT,
  generation_time_params TEXT, -- JSON
  due_rule TEXT,
  due_value TEXT,
  days_due INTEGER,
  advance_days INTEGER,
  is_fixed_deadline INTEGER DEFAULT 0,
  
  -- 執行規則（穩定數據）
  execution_frequency TEXT,
  execution_months TEXT, -- JSON array
  effective_month TEXT, -- YYYY-MM
  auto_generate INTEGER DEFAULT 1,
  
  -- 服務信息（穩定數據，避免 JOIN）
  company_name TEXT,
  service_name TEXT,
  service_type TEXT,
  service_execution_months TEXT, -- JSON array
  
  -- 模板版本和變更追蹤
  template_version INTEGER DEFAULT 1,
  config_hash TEXT, -- 用於檢測配置是否變更
  last_calculated_at TEXT, -- 上次計算時間
  last_applied_month TEXT, -- 上次應用的月份 YYYY-MM
  
  -- 狀態
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (config_id) REFERENCES ClientServiceTaskConfigs(config_id),
  UNIQUE(client_service_id, config_id)
);

-- 2. 模板 SOP 表：預存每個模板的完整 SOP 列表
-- 避免每次生成時都要查詢 TaskConfigSOPs
CREATE TABLE IF NOT EXISTS TaskGenerationTemplateSOPs (
  template_sop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  -- 可以預存 SOP 的完整信息，避免 JOIN
  sop_name TEXT,
  sop_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES TaskGenerationTemplates(template_id) ON DELETE CASCADE,
  UNIQUE(template_id, sop_id)
);

-- 3. 優化 TaskGenerationQueue：添加模板引用
-- 這樣可以知道這個任務是從哪個模板生成的，便於追蹤和複用
-- 注意：如果列已存在則跳過
-- ALTER TABLE TaskGenerationQueue ADD COLUMN template_id INTEGER;
-- ALTER TABLE TaskGenerationQueue ADD COLUMN template_version INTEGER;

-- 4. 創建索引
CREATE INDEX IF NOT EXISTS idx_task_generation_templates_active ON TaskGenerationTemplates(is_active, client_service_id);
CREATE INDEX IF NOT EXISTS idx_task_generation_templates_config ON TaskGenerationTemplates(config_id, is_active);
CREATE INDEX IF NOT EXISTS idx_task_generation_templates_hash ON TaskGenerationTemplates(config_hash);
CREATE INDEX IF NOT EXISTS idx_task_generation_templates_last_applied ON TaskGenerationTemplates(last_applied_month);
CREATE INDEX IF NOT EXISTS idx_task_generation_template_sops ON TaskGenerationTemplateSOPs(template_id, sort_order);
-- 注意：TaskGenerationQueue 可能尚未創建，索引創建改為條件執行
-- CREATE INDEX IF NOT EXISTS idx_task_generation_queue_template ON TaskGenerationQueue(template_id, target_year, target_month);

-- 5. 配置變更追蹤表：記錄配置的變更歷史
-- 用於檢測哪些配置發生了變更，需要重新計算模板
CREATE TABLE IF NOT EXISTS TaskConfigChangeLog (
  change_id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_id INTEGER NOT NULL,
  client_service_id INTEGER NOT NULL,
  change_type TEXT, -- 'created', 'updated', 'deleted'
  changed_fields TEXT, -- JSON array of changed field names
  old_values TEXT, -- JSON of old values
  new_values TEXT, -- JSON of new values
  changed_at TEXT DEFAULT (datetime('now')),
  changed_by INTEGER,
  FOREIGN KEY (config_id) REFERENCES ClientServiceTaskConfigs(config_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id)
);

CREATE INDEX IF NOT EXISTS idx_task_config_change_log_config ON TaskConfigChangeLog(config_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_config_change_log_service ON TaskConfigChangeLog(client_service_id, changed_at DESC);


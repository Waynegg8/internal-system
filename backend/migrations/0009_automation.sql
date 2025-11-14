-- ============================================
-- 0009_automation.sql
-- 整合自以下遷移文件:
--   - 2025-10-30T001200Z_automation_rules.sql
--   - 2025-10-30T001300Z_system_settings.sql
--   - 2025-10-30T001301Z_cron_executions.sql
--   - 2025-11-03T030000Z_create_business_trips.sql
--   - 2025-11-07T120000Z_add_user_profile_fields.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-30T001200Z_automation_rules.sql
-- ============================================

-- Automation rules and run logs

CREATE TABLE IF NOT EXISTS AutomationRules (
  rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_name TEXT NOT NULL,
  schedule_type TEXT NOT NULL,         -- daily|weekly|monthly|cron
  schedule_value TEXT,                 -- e.g. '02:00', 'Mon 03:00', '1 02:00', or CRON expr
  condition_json TEXT,                 -- JSON string describing conditions/filters
  action_json TEXT NOT NULL,           -- JSON string describing actions
  is_enabled BOOLEAN DEFAULT 1,
  last_run_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  CHECK (schedule_type IN ('daily','weekly','monthly','cron'))
);

CREATE INDEX IF NOT EXISTS idx_auto_rules_enabled ON AutomationRules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_auto_rules_sched ON AutomationRules(schedule_type);

CREATE TABLE IF NOT EXISTS AutomationRunLogs (
  run_id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL,
  started_at TEXT DEFAULT (datetime('now')),
  finished_at TEXT,
  status TEXT DEFAULT 'success',       -- success|failed
  message TEXT,
  FOREIGN KEY (rule_id) REFERENCES AutomationRules(rule_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_runs_rule ON AutomationRunLogs(rule_id);
CREATE INDEX IF NOT EXISTS idx_auto_runs_started ON AutomationRunLogs(started_at);





-- ============================================
-- 來源: 2025-10-30T001300Z_system_settings.sql
-- ============================================

-- System Settings table
CREATE TABLE IF NOT EXISTS Settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description TEXT,
  is_dangerous INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON Settings(setting_key);

-- Seed a few common keys if not exists
INSERT OR IGNORE INTO Settings (setting_key, setting_value, description, is_dangerous)
VALUES
  ('company_name', '', '公司名稱', 0),
  ('contact_email', '', '聯絡信箱', 0),
  ('timezone', 'Asia/Taipei', '系統時區', 0),
  ('currency', 'TWD', '系統幣別', 0),
  ('timesheet_min_unit', '0.5', '工時填寫最小單位（小時）', 0),
  ('soft_delete_enabled', '1', '啟用軟刪除（1/0）', 0),
  ('workday_start', '08:30', '工作日開始時間', 0),
  ('workday_end', '17:30', '工作日結束時間', 0),
  ('report_locale', 'zh-TW', '報表語系', 0),
  ('rule_comp_hours_expiry', 'current_month', '補休有效期規則', 1),
  ('attendance_bonus_amount', '1000', '全勤獎金金額（元）', 0),
  ('overhead_cost_per_hour', '100', '每小時管理成本（元/小時）', 0),
  ('target_profit_margin', '50', '目標毛利率（%）', 0);





-- ============================================
-- 來源: 2025-10-30T001301Z_cron_executions.sql
-- ============================================

-- Cron Job Executions (排程執行記錄)
-- 用於追蹤自動化任務的執行歷史與狀態

CREATE TABLE IF NOT EXISTS CronJobExecutions (
  execution_id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT NOT NULL,              -- 任務名稱（如 comp_leave_expiry, annual_leave_update）
  status TEXT NOT NULL,                -- success|failed|running
  executed_at TEXT NOT NULL,           -- 執行時間（UTC ISO8601）
  details TEXT,                        -- JSON 格式詳細資訊（成功時記錄影響筆數等）
  error_message TEXT,                  -- 錯誤訊息（失敗時）
  CHECK (status IN ('success', 'failed', 'running'))
);

-- 索引：按任務名稱查詢執行歷史
CREATE INDEX IF NOT EXISTS idx_cron_executions_job_name 
ON CronJobExecutions(job_name, executed_at DESC);

-- 索引：按執行時間查詢
CREATE INDEX IF NOT EXISTS idx_cron_executions_executed_at 
ON CronJobExecutions(executed_at DESC);




-- ============================================
-- 來源: 2025-11-03T030000Z_create_business_trips.sql
-- ============================================

-- Business Trips (外出登記) - 用於計算交通補貼

CREATE TABLE IF NOT EXISTS BusinessTrips (
  trip_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_id INTEGER,                      -- 關聯客戶（可選）
  trip_date TEXT NOT NULL,                -- YYYY-MM-DD 外出日期
  destination TEXT NOT NULL,              -- 目的地
  distance_km REAL NOT NULL,              -- 距離（公里）
  purpose TEXT,                           -- 外出目的
  transport_subsidy_cents INTEGER NOT NULL DEFAULT 0, -- 交通補貼（分）
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by INTEGER,
  notes TEXT,                             -- 備註
  is_deleted BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (reviewed_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_trips_user ON BusinessTrips(user_id);
CREATE INDEX IF NOT EXISTS idx_business_trips_client ON BusinessTrips(client_id);
CREATE INDEX IF NOT EXISTS idx_business_trips_date ON BusinessTrips(trip_date);
CREATE INDEX IF NOT EXISTS idx_business_trips_status ON BusinessTrips(status);

-- 計算交通補貼的規則：每5公里60元
-- 補貼計算公式：FLOOR(distance_km / 5) * 60 * 100 (轉換為分)




-- ============================================
-- 來源: 2025-11-07T120000Z_add_user_profile_fields.sql
-- ============================================

-- 为Settings表添加分类字段
-- 注意：Users表中已经包含了gender和start_date字段，无需重复添加

-- 为Settings表添加分类字段
ALTER TABLE Settings ADD COLUMN setting_category TEXT DEFAULT 'general';

-- 创建分类索引
CREATE INDEX IF NOT EXISTS idx_settings_category ON Settings(setting_category);

-- 更新现有设置为系统分类
UPDATE Settings SET setting_category = 'system' WHERE setting_key IN (
  'company_name', 'contact_email', 'timezone', 'currency', 
  'timesheet_min_unit', 'soft_delete_enabled', 'workday_start', 
  'workday_end', 'report_locale', 'rule_comp_hours_expiry',
  'attendance_bonus_amount', 'overhead_cost_per_hour', 'target_profit_margin'
);




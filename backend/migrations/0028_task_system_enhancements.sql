-- ============================================
-- 任務系統增強：欄位補齊與新紀錄表
-- ============================================

-- ActiveTasks：補齊依賴、順延與說明欄位
ALTER TABLE ActiveTasks ADD COLUMN prerequisite_task_id INTEGER;
ALTER TABLE ActiveTasks ADD COLUMN estimated_work_days INTEGER DEFAULT 3;
ALTER TABLE ActiveTasks ADD COLUMN original_due_date TEXT;
ALTER TABLE ActiveTasks ADD COLUMN due_date_adjusted BOOLEAN DEFAULT 0;
ALTER TABLE ActiveTasks ADD COLUMN adjustment_reason TEXT;
ALTER TABLE ActiveTasks ADD COLUMN adjustment_count INTEGER DEFAULT 0;
ALTER TABLE ActiveTasks ADD COLUMN last_adjustment_date TEXT;
ALTER TABLE ActiveTasks ADD COLUMN can_start_date TEXT;
ALTER TABLE ActiveTasks ADD COLUMN status_note TEXT;
ALTER TABLE ActiveTasks ADD COLUMN blocker_reason TEXT;
ALTER TABLE ActiveTasks ADD COLUMN overdue_reason TEXT;
ALTER TABLE ActiveTasks ADD COLUMN last_status_update TEXT;
ALTER TABLE ActiveTasks ADD COLUMN expected_completion_date TEXT;
ALTER TABLE ActiveTasks ADD COLUMN is_overdue BOOLEAN DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_active_tasks_prerequisite ON ActiveTasks(prerequisite_task_id);
CREATE INDEX IF NOT EXISTS idx_active_tasks_overdue ON ActiveTasks(is_overdue);
CREATE INDEX IF NOT EXISTS idx_active_tasks_last_adjustment ON ActiveTasks(last_adjustment_date);

-- ActiveTaskStages：延遲紀錄與觸發紀錄
ALTER TABLE ActiveTaskStages ADD COLUMN delay_days INTEGER DEFAULT 0;
ALTER TABLE ActiveTaskStages ADD COLUMN triggered_at TEXT;
ALTER TABLE ActiveTaskStages ADD COLUMN triggered_by TEXT;
ALTER TABLE ActiveTaskStages ADD COLUMN notes TEXT;

-- 任務事件日誌：供儀表板與稽核使用
CREATE TABLE IF NOT EXISTS TaskEventLogs (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  stage_id INTEGER,
  config_id INTEGER,
  event_type TEXT NOT NULL,
  triggered_by TEXT,
  payload_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_event_logs_task ON TaskEventLogs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_event_logs_type ON TaskEventLogs(event_type);
CREATE INDEX IF NOT EXISTS idx_task_event_logs_created ON TaskEventLogs(created_at);

-- Dashboard 摘要儲存
CREATE TABLE IF NOT EXISTS DashboardSummary (
  summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
  summary_date TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  payload_json TEXT NOT NULL,
  generated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(summary_date, scope)
);

-- 任務設定有效月份
ALTER TABLE ClientServiceTaskConfigs ADD COLUMN effective_month TEXT;






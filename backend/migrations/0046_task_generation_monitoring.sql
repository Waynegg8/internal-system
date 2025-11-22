-- 任務生成監控表
-- 用於記錄任務生成的成功率、性能指標和錯誤

-- 主監控表
CREATE TABLE IF NOT EXISTS TaskGenerationMonitoring (
  monitoring_id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_type TEXT NOT NULL, -- 'manual' | 'auto' | 'one-time'
  target_year INTEGER NOT NULL,
  target_month INTEGER NOT NULL, -- 1-12
  status TEXT NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'failed' | 'partial'
  started_at TEXT NOT NULL, -- ISO 8601
  completed_at TEXT, -- ISO 8601
  duration_ms INTEGER, -- 持續時間（毫秒）
  total_tasks INTEGER DEFAULT 0, -- 總任務數
  generated_tasks INTEGER DEFAULT 0, -- 成功生成的任務數
  skipped_tasks INTEGER DEFAULT 0, -- 跳過的任務數
  error_count INTEGER DEFAULT 0, -- 錯誤數
  success_rate REAL, -- 成功率（百分比）
  error_messages TEXT, -- JSON 陣列，錯誤訊息列表
  metadata TEXT, -- JSON 物件，額外元數據
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 錯誤記錄表
CREATE TABLE IF NOT EXISTS TaskGenerationErrors (
  error_id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitoring_id INTEGER NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT, -- 錯誤堆疊（可選）
  context TEXT, -- JSON 物件，錯誤上下文
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (monitoring_id) REFERENCES TaskGenerationMonitoring(monitoring_id) ON DELETE CASCADE
);

-- 告警表
CREATE TABLE IF NOT EXISTS TaskGenerationAlerts (
  alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitoring_id INTEGER NOT NULL,
  alert_type TEXT NOT NULL, -- 'low_success_rate' | 'high_error_count' | 'slow_generation' | 'complete_failure'
  severity TEXT NOT NULL, -- 'critical' | 'warning'
  message TEXT NOT NULL,
  threshold_value REAL, -- 閾值
  actual_value REAL, -- 實際值
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (monitoring_id) REFERENCES TaskGenerationMonitoring(monitoring_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_monitoring_type_date ON TaskGenerationMonitoring(generation_type, target_year, target_month);
CREATE INDEX IF NOT EXISTS idx_monitoring_status ON TaskGenerationMonitoring(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_started_at ON TaskGenerationMonitoring(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_monitoring_id ON TaskGenerationErrors(monitoring_id);
CREATE INDEX IF NOT EXISTS idx_alerts_monitoring_id ON TaskGenerationAlerts(monitoring_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON TaskGenerationAlerts(severity, created_at DESC);




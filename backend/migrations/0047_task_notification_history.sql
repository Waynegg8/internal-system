-- ============================================
-- 任務通知歷史記錄表
-- 用於記錄任務通知發送歷史，實現通知頻率控制
-- ============================================

CREATE TABLE IF NOT EXISTS TaskNotificationHistory (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL, -- 'overdue' | 'upcoming' | 'delay' | 'conflict'
  sent_at TEXT NOT NULL, -- ISO 8601 格式日期時間
  recipients TEXT NOT NULL, -- JSON 字符串，接收者列表 [{ user_id, user_name }]
  notification_data TEXT, -- JSON 字符串，通知數據
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE
);

-- 索引：用於快速查詢特定任務的通知歷史
CREATE INDEX IF NOT EXISTS idx_task_notification_history_task ON TaskNotificationHistory(task_id);

-- 索引：用於快速查詢特定類型的通知歷史
CREATE INDEX IF NOT EXISTS idx_task_notification_history_type ON TaskNotificationHistory(notification_type);

-- 索引：用於快速查詢特定時間範圍內的通知歷史（按發送時間排序）
CREATE INDEX IF NOT EXISTS idx_task_notification_history_sent_at ON TaskNotificationHistory(sent_at DESC);

-- 複合索引：用於快速查詢特定任務和類型的通知歷史（頻率控制查詢）
CREATE INDEX IF NOT EXISTS idx_task_notification_history_task_type ON TaskNotificationHistory(task_id, notification_type);

-- 複合索引：用於快速查詢特定任務、類型和日期的通知歷史（每日頻率控制）
CREATE INDEX IF NOT EXISTS idx_task_notification_history_task_type_date ON TaskNotificationHistory(task_id, notification_type, sent_at DESC);




-- 0031_payroll_cache_queue.sql
-- 新增薪資重算佇列

-- 薪資重算佇列表
CREATE TABLE IF NOT EXISTS PayrollRecalcQueue (
  queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | error
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_error_at TEXT,
  last_attempt_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, year_month),
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_recalc_status 
ON PayrollRecalcQueue(status);

CREATE INDEX IF NOT EXISTS idx_payroll_recalc_month 
ON PayrollRecalcQueue(year_month);



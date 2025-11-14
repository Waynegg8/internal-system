-- ============================================
-- 儀錶板提醒資料表
-- ============================================

CREATE TABLE IF NOT EXISTS DashboardAlerts (
  alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  payload_json TEXT,
  is_admin_alert INTEGER NOT NULL DEFAULT 0,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  expiry_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_user ON DashboardAlerts(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_admin ON DashboardAlerts(is_admin_alert);
CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_created ON DashboardAlerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_type ON DashboardAlerts(alert_type);




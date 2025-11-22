-- ============================================
-- 0043_task_generation_history.sql
-- 創建 TaskGenerationHistory 表
-- 用於記錄任務自動生成的歷史記錄，支援審計和追蹤
-- ============================================

-- TaskGenerationHistory 表
CREATE TABLE IF NOT EXISTS TaskGenerationHistory (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_time TEXT NOT NULL, -- 生成時間（UTC ISO8601 格式）
  service_year INTEGER NOT NULL, -- 服務年份
  service_month INTEGER NOT NULL, -- 服務月份 (1-12)
  client_id TEXT NOT NULL, -- 客戶 ID
  client_service_id INTEGER NOT NULL, -- 客戶服務 ID
  service_name TEXT, -- 服務名稱（冗余欄位，便於查詢）
  generated_tasks TEXT, -- JSON 格式字串，生成的任務列表 [{ task_id, task_name, generation_time, due_date, ... }]
  generation_status TEXT NOT NULL DEFAULT 'success' CHECK(generation_status IN ('success', 'failed', 'partial')), -- 生成狀態
  error_message TEXT, -- 錯誤訊息（如果失敗）
  generated_count INTEGER DEFAULT 0, -- 成功生成的任務數量
  skipped_count INTEGER DEFAULT 0, -- 跳過的任務數量
  created_at TEXT NOT NULL DEFAULT (datetime('now')), -- 記錄創建時間
  FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE,
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE
);

-- 索引：按生成時間查詢（常用於歷史記錄列表）
CREATE INDEX IF NOT EXISTS idx_task_generation_history_time 
ON TaskGenerationHistory(generation_time DESC);

-- 索引：按服務年月查詢（常用於按月份篩選）
CREATE INDEX IF NOT EXISTS idx_task_generation_history_year_month 
ON TaskGenerationHistory(service_year, service_month);

-- 索引：按客戶查詢（常用於查看特定客戶的生成歷史）
CREATE INDEX IF NOT EXISTS idx_task_generation_history_client 
ON TaskGenerationHistory(client_id);

-- 索引：按客戶服務查詢（常用於查看特定服務的生成歷史）
CREATE INDEX IF NOT EXISTS idx_task_generation_history_client_service 
ON TaskGenerationHistory(client_service_id);

-- 索引：按生成狀態查詢（常用於篩選失敗記錄）
CREATE INDEX IF NOT EXISTS idx_task_generation_history_status 
ON TaskGenerationHistory(generation_status);

-- 複合索引：按客戶和時間範圍查詢（常用於客戶歷史記錄頁面）
CREATE INDEX IF NOT EXISTS idx_task_generation_history_client_time 
ON TaskGenerationHistory(client_id, generation_time DESC);

-- 複合索引：按服務年月和狀態查詢（常用於統計和監控）
CREATE INDEX IF NOT EXISTS idx_task_generation_history_year_month_status 
ON TaskGenerationHistory(service_year, service_month, generation_status);




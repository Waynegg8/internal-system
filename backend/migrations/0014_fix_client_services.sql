-- ============================================
-- 修復 ClientServices 表，確保有所有必要欄位
-- ============================================

-- 1. 檢查並添加 start_date 欄位（如果不存在）
ALTER TABLE ClientServices ADD COLUMN start_date TEXT;

-- 2. 檢查並添加 end_date 欄位（如果不存在）
ALTER TABLE ClientServices ADD COLUMN end_date TEXT;

-- 3. 添加 task_configs_count 欄位用於前端顯示
ALTER TABLE ClientServices ADD COLUMN task_configs_count INTEGER DEFAULT 0;

-- 4. 創建索引
CREATE INDEX IF NOT EXISTS idx_client_services_dates ON ClientServices(start_date, end_date) WHERE is_deleted = 0;













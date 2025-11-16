-- ============================================
-- 為 ClientServices 添加服務層執行頻率欄位（執行月份）與自動生成開關
-- 並補齊 service_type 欄位（若不存在）
-- 說明：
-- - execution_months：JSON 陣列字串，範例 '[1,3,5,7,9,11]'
-- - use_for_auto_generate：是否用於自動生成任務（0/1）
-- - service_type：'recurring' / 'one-time'
-- 注意：SQLite 不支援 IF EXISTS/IF NOT EXISTS 對欄位，直接嘗試新增；若已存在則由部署腳本忽略錯誤
-- ============================================

-- 補齊 service_type（如未存在）
ALTER TABLE ClientServices ADD COLUMN service_type TEXT DEFAULT 'recurring';

-- 新增執行月份（JSON 陣列）
ALTER TABLE ClientServices ADD COLUMN execution_months TEXT DEFAULT NULL;

-- 新增是否用於自動生成
ALTER TABLE ClientServices ADD COLUMN use_for_auto_generate INTEGER DEFAULT 1;

-- 建立索引以利查詢
CREATE INDEX IF NOT EXISTS idx_client_services_use_for_auto_generate
ON ClientServices(use_for_auto_generate) WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_client_services_service_type
ON ClientServices(service_type) WHERE is_deleted = 0;



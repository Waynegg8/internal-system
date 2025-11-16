-- ============================================
-- 為 ClientServices 添加用於自動生成任務的控制欄位
-- 並補充服務層執行設定欄位（若尚未存在）
-- ============================================
-- 注意：此遷移假設欄位尚未存在，若已存在請忽略重複執行的失敗訊息
-- 在 SQLite 中無法在 ALTER TABLE 時使用 IF NOT EXISTS，部署系統會確保遷移順序唯一執行

-- 1) 服務類型（定期 recurring / 一次性 one_off）
ALTER TABLE ClientServices ADD COLUMN service_type TEXT DEFAULT 'recurring';

-- 2) 服務執行月份（JSON 陣列字串），例如 "[1,2,3,4,5,6,7,8,9,10,11,12]"
ALTER TABLE ClientServices ADD COLUMN execution_months TEXT;

-- 3) 是否用於自動生成任務（服務層總開關）
ALTER TABLE ClientServices ADD COLUMN use_for_auto_generate INTEGER DEFAULT 1;

-- 4) 索引（查詢加速）
CREATE INDEX IF NOT EXISTS idx_client_services_use_for_auto_generate
ON ClientServices(use_for_auto_generate) WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_client_services_service_type_active
ON ClientServices(service_type) WHERE is_deleted = 0;



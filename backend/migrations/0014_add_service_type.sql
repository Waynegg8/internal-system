-- 0014_add_service_type.sql
-- 為 Services 表新增 service_type 欄位，用於標識服務類型（週期性/一次性）
-- 允許值：'recurring'（預設）、'one_off'

ALTER TABLE Services
ADD COLUMN service_type TEXT NOT NULL DEFAULT 'recurring'
CHECK (service_type IN ('recurring', 'one_off'));

-- 更新已存在資料的 updated_at
UPDATE Services
SET updated_at = datetime('now')
WHERE 1 = 1;









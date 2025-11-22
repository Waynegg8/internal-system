-- 徹底重構 TaskGenerationQueue：存儲完整預計算數據
-- 目標：預聚合階段計算所有數據，生成階段只需插入，無需額外查詢

-- 1. 添加更多預計算字段到 TaskGenerationQueue
ALTER TABLE TaskGenerationQueue ADD COLUMN task_name TEXT;
ALTER TABLE TaskGenerationQueue ADD COLUMN task_description TEXT;
ALTER TABLE TaskGenerationQueue ADD COLUMN assignee_user_id INTEGER;
ALTER TABLE TaskGenerationQueue ADD COLUMN estimated_hours REAL;
ALTER TABLE TaskGenerationQueue ADD COLUMN stage_order INTEGER;
ALTER TABLE TaskGenerationQueue ADD COLUMN notes TEXT;
ALTER TABLE TaskGenerationQueue ADD COLUMN company_name TEXT;
ALTER TABLE TaskGenerationQueue ADD COLUMN service_name TEXT;
ALTER TABLE TaskGenerationQueue ADD COLUMN service_type TEXT;

-- 2. 創建預聚合的 SOP 表（存儲 JSON 格式的 SOP 列表）
CREATE TABLE IF NOT EXISTS TaskGenerationQueueSOPs (
  queue_sop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (queue_id) REFERENCES TaskGenerationQueue(queue_id) ON DELETE CASCADE,
  UNIQUE(queue_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_task_generation_queue_sops_queue ON TaskGenerationQueueSOPs(queue_id);

-- 3. 創建預聚合的階段表（存儲 JSON 格式的階段列表）
-- 注意：階段信息可以存儲在 JSON 字段中，但為了查詢效率，也可以單獨存儲
-- 這裡我們選擇在 Queue 表中存儲 stage_order，SOP 單獨存儲

-- 4. 優化索引
CREATE INDEX IF NOT EXISTS idx_task_generation_queue_complete ON TaskGenerationQueue(status, target_year, target_month, client_service_id);
CREATE INDEX IF NOT EXISTS idx_task_generation_queue_generation_time ON TaskGenerationQueue(generation_time) WHERE status = 'pending';



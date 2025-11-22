-- ============================================
-- 0045_add_fixed_deadline.sql
-- 為 ClientServiceTaskConfigs 和 ActiveTasks 表新增 is_fixed_deadline 欄位
-- 支援固定期限任務處理
-- ============================================

-- 為 ClientServiceTaskConfigs 表新增 is_fixed_deadline 欄位
-- 標記任務配置是否為固定期限任務
-- 固定期限任務的到期日不受前置任務延後影響
ALTER TABLE ClientServiceTaskConfigs ADD COLUMN is_fixed_deadline INTEGER DEFAULT 0;

-- 為 ActiveTasks 表新增 is_fixed_deadline 欄位
-- 標記任務是否為固定期限任務（從配置繼承或手動設置）
-- 固定期限任務的到期日不受前置任務延後影響
ALTER TABLE ActiveTasks ADD COLUMN is_fixed_deadline INTEGER DEFAULT 0;

-- 索引：按固定期限標記查詢（常用於篩選固定期限任務）
CREATE INDEX IF NOT EXISTS idx_task_configs_fixed_deadline 
ON ClientServiceTaskConfigs(is_fixed_deadline) WHERE is_fixed_deadline = 1;

CREATE INDEX IF NOT EXISTS idx_active_tasks_fixed_deadline 
ON ActiveTasks(is_fixed_deadline) WHERE is_fixed_deadline = 1;

-- 複合索引：按固定期限和到期日查詢（常用於固定期限任務的到期日調整邏輯）
CREATE INDEX IF NOT EXISTS idx_active_tasks_fixed_deadline_due_date 
ON ActiveTasks(is_fixed_deadline, due_date) WHERE is_fixed_deadline = 1;

-- 說明：
-- - is_fixed_deadline = 1 表示固定期限任務，到期日不受前置任務延後影響
-- - is_fixed_deadline = 0 或 NULL 表示普通任務，到期日可能受前置任務延後影響
-- - 固定期限任務的到期日計算邏輯：如果前置任務延誤導致中間任務無法在固定期限前完成，
--   則調整中間任務的到期日為「固定期限的前一天」，並發送通知




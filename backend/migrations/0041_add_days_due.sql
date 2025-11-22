-- ============================================
-- 0041_add_days_due.sql
-- 為 ClientServiceTaskConfigs 新增 days_due 欄位（簡化期限模型：start_date + days_due）
-- 向下相容：保留 due_rule/due_value，不破壞既有查詢與生成流程
-- ============================================

-- 新增欄位：以月份起始日為基準（YYYY-MM-01）加上 days_due 天得到 due_date
ALTER TABLE ClientServiceTaskConfigs ADD COLUMN days_due INTEGER;

-- 建議索引（查詢優化）
CREATE INDEX IF NOT EXISTS idx_task_configs_days_due ON ClientServiceTaskConfigs(days_due);

-- 向後相容策略：
-- 不進行強制回填，保留舊的 due_rule/due_value。
-- 生成器將優先使用 days_due；若為 NULL 則回退至 due_rule/due_value。
-- UI 將引導輸入 days_due（更簡單），但不移除舊資料。









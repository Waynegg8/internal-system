-- ============================================
-- 0044_add_generation_time_rule.sql
-- 為 ClientServiceTaskConfigs 表新增 generation_time_rule 和 generation_time_params 欄位
-- 支援任務生成時間規則配置
-- ============================================

-- 新增生成時間規則類型欄位
-- 可能的值：
--   'service_month_start' - 服務月份開始時（服務月份的第1天）
--   'prev_month_last_x_days' - 服務月份前一個月的最後X天
--   'prev_month_x_day' - 服務月份前一個月的第X天
--   'next_month_start' - 服務月份後一個月開始時
--   'monthly_x_day' - 每月X日（服務月份的第X日）
--   NULL - 未配置，回退到 advance_days 邏輯
ALTER TABLE ClientServiceTaskConfigs ADD COLUMN generation_time_rule TEXT;

-- 新增生成時間規則參數欄位（JSON 格式）
-- 例如：
--   { "days": 3 } - 用於 prev_month_last_x_days 規則
--   { "day": 25 } - 用於 prev_month_x_day 或 monthly_x_day 規則
--   {} - 無參數規則（如 service_month_start, next_month_start）
ALTER TABLE ClientServiceTaskConfigs ADD COLUMN generation_time_params TEXT;

-- 索引：按生成時間規則查詢（常用於篩選特定規則類型的配置）
CREATE INDEX IF NOT EXISTS idx_task_configs_generation_time_rule 
ON ClientServiceTaskConfigs(generation_time_rule) WHERE generation_time_rule IS NOT NULL;

-- 說明：
-- - generation_time_rule 和 generation_time_params 用於替代或增強 advance_days 邏輯
-- - 如果 generation_time_rule 為 NULL，系統會回退到現有的 advance_days 邏輯（向後兼容）
-- - generation_time_params 存儲 JSON 格式的參數，例如：'{"days": 3}' 或 '{"day": 25}'




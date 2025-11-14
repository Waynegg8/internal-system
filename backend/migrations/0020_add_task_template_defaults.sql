-- 為 TaskTemplates 表添加預設期限設置欄位
-- 這些欄位用於任務模板的預設期限規則配置
-- 注意：由於欄位可能已經存在，此遷移已被標記為空操作

-- 欄位說明（這些欄位可能已經在之前的遷移中添加）：
-- - default_due_date_rule: 期限規則類型
-- - default_due_date_value: 期限具體數值
-- - default_due_date_offset_days: 期限偏移天數
-- - default_advance_days: 提前生成天數

-- 創建索引以提升查詢效能（冪等操作）
CREATE INDEX IF NOT EXISTS idx_task_templates_due_rule 
ON TaskTemplates(default_due_date_rule);

-- 6. 添加註釋
-- default_due_date_rule 可能的值：
--   'end_of_month' - 每月最後一天
--   'specific_day' - 每月固定日期
--   'next_month_day' - 次月固定日期
--   'days_after_start' - 從月初起算天數
--
-- default_due_date_value：
--   當 rule='specific_day' 或 'next_month_day' 時，表示具體日期（1-31）
--   當 rule='days_after_start' 時，表示從月初起算的天數
--
-- default_due_date_offset_days：
--   期限的額外偏移天數（可為負數）
--
-- default_advance_days：
--   提前多少天自動生成任務（預設7天）


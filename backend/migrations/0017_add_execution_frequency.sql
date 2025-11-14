-- ============================================
-- 添加任務執行頻率設置
-- 支援每月、雙月、季度、半年、年度、自訂頻率
-- ============================================

-- 1. 添加執行頻率欄位
ALTER TABLE ClientServiceTaskConfigs 
ADD COLUMN execution_frequency TEXT DEFAULT 'monthly';

-- 2. 添加執行月份欄位（JSON格式）
ALTER TABLE ClientServiceTaskConfigs 
ADD COLUMN execution_months TEXT DEFAULT NULL;

-- 3. 更新現有記錄（設為每月執行）
UPDATE ClientServiceTaskConfigs 
SET execution_frequency = 'monthly',
    execution_months = '[1,2,3,4,5,6,7,8,9,10,11,12]'
WHERE execution_frequency IS NULL;

-- 4. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_task_configs_frequency 
ON ClientServiceTaskConfigs(execution_frequency);

-- 5. 添加註釋
-- execution_frequency 可能的值：
--   'monthly' - 每月執行
--   'bi-monthly' - 雙月執行（奇數月）
--   'quarterly' - 季度執行（1,4,7,10月）
--   'semi-annual' - 半年執行（1,7月）
--   'annual' - 年度執行（僅1月）
--   'custom' - 自訂月份

-- execution_months 格式：JSON數組
--   範例：'[1,3,5,7,9,11]' 表示在1,3,5,7,9,11月執行






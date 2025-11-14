-- ============================================
-- 為任務模板階段添加執行頻率相關欄位
-- ============================================

-- 1. 添加 execution_frequency 欄位到 TaskTemplateStages
ALTER TABLE TaskTemplateStages ADD COLUMN execution_frequency TEXT DEFAULT 'monthly';

-- 2. 添加 execution_months 欄位到 TaskTemplateStages (JSON 格式，儲存陣列)
ALTER TABLE TaskTemplateStages ADD COLUMN execution_months TEXT DEFAULT '[1,2,3,4,5,6,7,8,9,10,11,12]';

-- 3. 更新現有記錄的預設值
UPDATE TaskTemplateStages
SET
  execution_frequency = 'monthly',
  execution_months = '[1,2,3,4,5,6,7,8,9,10,11,12]'
WHERE execution_frequency IS NULL;






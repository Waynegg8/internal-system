-- ============================================
-- 0012_fix_component_id.sql
-- 修復：為 ActiveTasks 添加 component_id 欄位
-- 2025-11-10
-- ============================================

-- 問題描述：
-- ActiveTasks 表缺少 component_id 欄位，導致：
-- 1. task-generator 無法正確插入任務
-- 2. service-components 刪除時查詢失敗（500 錯誤）

-- 添加 component_id 欄位到 ActiveTasks 表
-- 這個欄位用於關聯任務與服務組件
ALTER TABLE ActiveTasks ADD COLUMN component_id INTEGER;

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_active_tasks_component ON ActiveTasks(component_id);

-- 說明：
-- - component_id 關聯到 ServiceComponents.component_id
-- - 允許為 NULL（因為可能有手動創建的任務不屬於任何組件）
-- - 索引會提高基於 component_id 的查詢性能







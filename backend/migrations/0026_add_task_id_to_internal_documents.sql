-- 為 InternalDocuments 表添加 task_id 欄位
-- 2025-11-12

-- 添加 task_id 欄位（如果不存在）
ALTER TABLE InternalDocuments ADD COLUMN task_id INTEGER;

-- 如果 related_task_id 有值，將其複製到 task_id（一次性數據遷移）
UPDATE InternalDocuments 
SET task_id = related_task_id 
WHERE related_task_id IS NOT NULL AND task_id IS NULL;

-- 創建索引以提升查詢效率
CREATE INDEX IF NOT EXISTS idx_internal_documents_task_id ON InternalDocuments(task_id);











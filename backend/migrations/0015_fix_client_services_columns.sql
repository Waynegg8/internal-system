-- ============================================
-- 修復 ClientServices 表，添加 updated_at 欄位
-- ============================================

-- 直接使用 ALTER TABLE 添加缺失的 updated_at 欄位
-- start_date 和 end_date 已在 0014 中添加

-- SQLite 不支援在 ALTER TABLE 時添加 DEFAULT 值，所以分兩步：
-- 1. 先添加欄位
-- 2. 更新現有記錄的值

-- 嘗試添加 updated_at 欄位（如果已存在會忽略錯誤）
ALTER TABLE ClientServices ADD COLUMN updated_at TEXT;

-- 更新現有記錄，將 updated_at 設為 created_at（如果為 NULL）
UPDATE ClientServices 
SET updated_at = created_at 
WHERE updated_at IS NULL;

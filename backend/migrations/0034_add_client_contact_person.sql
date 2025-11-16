-- ============================================
-- 添加客戶聯絡人欄位
-- 支援多個聯絡人
-- ============================================

-- 檢查並添加 contact_person_1 欄位（如果不存在）
-- SQLite 不支援 IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- 所以我們使用 PRAGMA 檢查

-- 添加 contact_person_2 欄位
-- 由於無法直接使用 IF NOT EXISTS，我們依賴 migration 系統來避免重複執行

-- 嘗試添加欄位，如果失敗則跳過
-- 注意：這個方法在 D1 中可能不work，因為 D1 不支援動態 SQL

-- 由於欄位已存在，我們只添加索引
CREATE INDEX IF NOT EXISTS idx_clients_contact_person_1 ON Clients(contact_person_1) WHERE contact_person_1 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_contact_person_2 ON Clients(contact_person_2) WHERE contact_person_2 IS NOT NULL;

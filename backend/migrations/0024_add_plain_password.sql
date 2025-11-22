-- ============================================
-- 0024_add_plain_password.sql
-- 新增明文密碼欄位（用於管理員查看）
-- ============================================

-- 為 Users 表新增 plain_password 欄位
ALTER TABLE Users ADD COLUMN plain_password TEXT;

-- 注意：現有用戶的 plain_password 為 NULL
-- 只有在創建新用戶或重置密碼後才會有明文密碼













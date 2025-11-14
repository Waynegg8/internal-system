-- ============================================
-- 0011_initial_data.sql
-- 整合自以下遷移文件:
--   - 2025-10-30T001400Z_promote_admin_user.sql
--   - 2025-10-31T001800Z_fix_all_passwords.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-30T001400Z_promote_admin_user.sql
-- ============================================

-- Promote existing 'admin' user to administrator (idempotent)
UPDATE Users SET is_admin = 1, updated_at = datetime('now') WHERE LOWER(username) = 'admin' AND is_deleted = 0;





-- ============================================
-- 來源: 2025-10-31T001800Z_fix_all_passwords.sql
-- ============================================

-- Fix all user passwords to 111111 using PBKDF2
-- Password: 111111
-- Format: pbkdf2$100000$salt$hash
-- Note: Cloudflare Workers crypto API max iterations is 100000

UPDATE Users 
SET password_hash = 'pbkdf2$100000$+9PMuJVh17FuHvSjN9gMdQ==$fx+Q65o1T+hfJTdvio5RXuZKjtrDWvadNI1tOmArQrc='
WHERE username IN ('admin', 'liu', 'tian', 'chen');




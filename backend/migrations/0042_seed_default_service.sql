-- ============================================
-- 0042_seed_default_service.sql
-- 在系統缺少服務時，種子一筆預設服務，確保 E2E 依賴的清單不為空
-- ============================================

INSERT INTO Services (service_name, service_code, description, service_sop_id, service_type, sort_order, is_active)
SELECT '一般會計服務', 'ACC_GENERAL', '系統預設服務（自動種子）', NULL, 'recurring', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM Services WHERE is_active = 1);









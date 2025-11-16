-- ============================================
-- 最小服務資料種子：確保系統至少有一個可用的服務
-- 目的：E2E 測試（一次性服務執行）需要取得服務清單
-- 重入安全：若已存在活動服務則不重複插入
-- ============================================

INSERT INTO Services (service_name, service_code, description, service_type, sort_order, is_active)
SELECT '一般顧問服務', 'CONSULT_GENERAL', '系統預設服務（測試用）', 'recurring', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM Services WHERE is_active = 1);



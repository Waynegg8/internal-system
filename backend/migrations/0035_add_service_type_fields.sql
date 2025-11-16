-- ============================================
-- 添加服務類型相關欄位
-- 支援定期服務和一次性服務
-- ============================================

-- 由於欄位可能已存在，我們只添加索引
CREATE INDEX IF NOT EXISTS idx_client_services_service_type 
ON ClientServices(service_type) WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_services_default_service_type 
ON Services(default_service_type) WHERE is_active = 1;

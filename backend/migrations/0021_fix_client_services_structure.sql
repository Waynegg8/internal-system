-- ============================================
-- 修復 ClientServices 表結構，確保完整性
-- ============================================
-- 注意：此遷移僅創建索引，因為欄位應該已經存在

-- 由於某些欄位可能在之前的遷移中已添加（0014, 0015），
-- 我們不再嘗試添加欄位或重建表，只確保索引存在

-- 1. 為已存在的欄位創建或更新索引
CREATE INDEX IF NOT EXISTS idx_client_services_client ON ClientServices(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_status ON ClientServices(status);
CREATE INDEX IF NOT EXISTS idx_client_services_suspend_effective ON ClientServices(suspension_effective_date);
CREATE INDEX IF NOT EXISTS idx_client_services_cycle ON ClientServices(service_cycle);
CREATE INDEX IF NOT EXISTS idx_client_services_template ON ClientServices(task_template_id);
CREATE INDEX IF NOT EXISTS idx_client_services_service_id ON ClientServices(service_id);
CREATE INDEX IF NOT EXISTS idx_client_services_deleted ON ClientServices(is_deleted);
CREATE INDEX IF NOT EXISTS idx_client_services_client_service ON ClientServices(client_id, service_id, is_deleted);


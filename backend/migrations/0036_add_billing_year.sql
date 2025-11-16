-- ============================================
-- 添加 billing_year 欄位到 ServiceBillingSchedule
-- 支援收費計劃按年度管理
-- ============================================

-- 由於欄位可能已存在，我們只添加/重建索引
DROP INDEX IF EXISTS ux_billing_monthly;
DROP INDEX IF EXISTS ux_billing_onetime;
DROP INDEX IF EXISTS idx_billing_schedule_service_month;

-- 重新創建唯一性索引
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_recurring
ON ServiceBillingSchedule(client_service_id, billing_year, billing_month)
WHERE billing_type IN ('monthly', 'recurring');

CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_onetime
ON ServiceBillingSchedule(client_service_id, billing_date, description)
WHERE billing_type = 'one-time';

-- 創建常用索引
CREATE INDEX IF NOT EXISTS idx_billing_schedule_service_year_month 
ON ServiceBillingSchedule(client_service_id, billing_year, billing_month);

CREATE INDEX IF NOT EXISTS idx_billing_schedule_year_type 
ON ServiceBillingSchedule(billing_year, billing_type);

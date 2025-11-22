-- ============================================
-- 0044_billing_plans_tables.sql
-- 建立 BillingPlans 和 BillingPlanServices 表
-- 支援客戶年度收費計劃管理和收入分攤計算
-- ============================================
-- 設計說明：
-- 1. BillingPlans: 客戶年度收費計劃主表
--    - 支援定期服務收費計劃（recurring）和一次性服務收費計劃（one-time）
--    - 定期服務：一個客戶一個年度只有一個定期服務收費計劃
--    - 一次性服務：每個一次性服務有獨立的收費計劃
-- 2. BillingPlanServices: 收費計劃與服務的關聯表（多對多）
--    - 定期服務收費計劃可以關聯多個定期服務
--    - 一次性服務收費計劃只關聯一個一次性服務
-- 3. BillingPlanMonths: 收費計劃的月份明細（僅用於定期服務）
--    - 儲存每個月份的金額和付款期限
--    - 支援不同月份不同金額
-- ============================================

-- ============================================
-- 1. BillingPlans 表：客戶年度收費計劃主表
-- ============================================
CREATE TABLE IF NOT EXISTS BillingPlans (
  billing_plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 基本資訊
  client_id TEXT NOT NULL,
  billing_year INTEGER NOT NULL CHECK (billing_year >= 2000 AND billing_year <= 2100),
  billing_type TEXT NOT NULL CHECK (billing_type IN ('recurring', 'one-time')),
  
  -- 年度總計（計算欄位，用於快速查詢）
  year_total REAL NOT NULL DEFAULT 0 CHECK (year_total >= 0),
  
  -- 付款期限（預設值，可被月份明細覆蓋）
  payment_due_days INTEGER NOT NULL DEFAULT 30 CHECK (payment_due_days > 0),
  
  -- 一次性服務專用欄位（僅當 billing_type = 'one-time' 時使用）
  billing_date TEXT, -- YYYY-MM-DD，一次性服務的收費日期
  description TEXT,  -- 一次性服務收費項目名稱
  
  -- 備註
  notes TEXT,
  
  -- 時間戳記
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  -- 外鍵約束
  FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE
);

-- 定期服務收費計劃唯一性約束：一個客戶一個年度只有一個定期服務收費計劃
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_plans_recurring
ON BillingPlans(client_id, billing_year)
WHERE billing_type = 'recurring';

-- 一次性服務收費計劃唯一性約束：
-- 注意：一個客戶一個年度一個服務只能有一個一次性服務收費計劃
-- 此約束需要透過 BillingPlanServices 表配合檢查，在應用層確保：
-- - 一個一次性服務收費計劃（billing_type = 'one-time'）只能關聯一個服務
-- - 一個服務（service_type = 'one-time'）在同一個年度只能有一個收費計劃
-- 這裡只建立基本索引，唯一性在應用層檢查

-- 常用查詢索引
CREATE INDEX IF NOT EXISTS idx_billing_plans_client_year 
ON BillingPlans(client_id, billing_year);

CREATE INDEX IF NOT EXISTS idx_billing_plans_type 
ON BillingPlans(billing_type);

CREATE INDEX IF NOT EXISTS idx_billing_plans_year_type 
ON BillingPlans(billing_year, billing_type);

CREATE INDEX IF NOT EXISTS idx_billing_plans_client_type 
ON BillingPlans(client_id, billing_type);

-- ============================================
-- 2. BillingPlanServices 表：收費計劃與服務的關聯表
-- ============================================
CREATE TABLE IF NOT EXISTS BillingPlanServices (
  billing_plan_service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 關聯資訊
  billing_plan_id INTEGER NOT NULL,
  client_service_id INTEGER NOT NULL,
  
  -- 時間戳記
  created_at TEXT DEFAULT (datetime('now')),
  
  -- 外鍵約束
  FOREIGN KEY (billing_plan_id) REFERENCES BillingPlans(billing_plan_id) ON DELETE CASCADE,
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  
  -- 唯一性約束：同一個收費計劃不能重複關聯同一個服務
  UNIQUE(billing_plan_id, client_service_id)
);

-- 常用查詢索引
CREATE INDEX IF NOT EXISTS idx_billing_plan_services_plan 
ON BillingPlanServices(billing_plan_id);

CREATE INDEX IF NOT EXISTS idx_billing_plan_services_client_service 
ON BillingPlanServices(client_service_id);

-- ============================================
-- 3. BillingPlanMonths 表：收費計劃的月份明細
-- ============================================
-- 用途：
-- - 定期服務：儲存每個月份的金額（1-12月，可選月份）
-- - 一次性服務：儲存收費月份的金額（通常只有一個月份）
CREATE TABLE IF NOT EXISTS BillingPlanMonths (
  billing_plan_month_id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 關聯資訊
  billing_plan_id INTEGER NOT NULL,
  billing_month INTEGER NOT NULL CHECK (billing_month >= 1 AND billing_month <= 12),
  
  -- 金額資訊
  billing_amount REAL NOT NULL CHECK (billing_amount >= 0),
  
  -- 付款期限（可選，如果為 NULL 則使用 BillingPlans.payment_due_days）
  payment_due_days INTEGER CHECK (payment_due_days IS NULL OR payment_due_days > 0),
  
  -- 時間戳記
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  -- 外鍵約束
  FOREIGN KEY (billing_plan_id) REFERENCES BillingPlans(billing_plan_id) ON DELETE CASCADE,
  
  -- 唯一性約束：同一個收費計劃不能有重複的月份
  UNIQUE(billing_plan_id, billing_month)
);

-- 常用查詢索引
CREATE INDEX IF NOT EXISTS idx_billing_plan_months_plan 
ON BillingPlanMonths(billing_plan_id);

CREATE INDEX IF NOT EXISTS idx_billing_plan_months_month 
ON BillingPlanMonths(billing_month);

CREATE INDEX IF NOT EXISTS idx_billing_plan_months_plan_month 
ON BillingPlanMonths(billing_plan_id, billing_month);

-- ============================================
-- 4. 觸發器：自動更新 BillingPlans.year_total
-- ============================================
-- 當 BillingPlanMonths 表有變更時，自動更新 BillingPlans.year_total

-- 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS trg_update_billing_plan_year_total_insert;
DROP TRIGGER IF EXISTS trg_update_billing_plan_year_total_update;
DROP TRIGGER IF EXISTS trg_update_billing_plan_year_total_delete;

-- 插入月份明細時更新年度總計
CREATE TRIGGER trg_update_billing_plan_year_total_insert
AFTER INSERT ON BillingPlanMonths
BEGIN
  UPDATE BillingPlans
  SET year_total = (
    SELECT COALESCE(SUM(billing_amount), 0)
    FROM BillingPlanMonths
    WHERE billing_plan_id = NEW.billing_plan_id
  ),
  updated_at = datetime('now')
  WHERE billing_plan_id = NEW.billing_plan_id;
END;

-- 更新月份明細時更新年度總計
CREATE TRIGGER trg_update_billing_plan_year_total_update
AFTER UPDATE ON BillingPlanMonths
BEGIN
  UPDATE BillingPlans
  SET year_total = (
    SELECT COALESCE(SUM(billing_amount), 0)
    FROM BillingPlanMonths
    WHERE billing_plan_id = NEW.billing_plan_id
  ),
  updated_at = datetime('now')
  WHERE billing_plan_id = NEW.billing_plan_id;
END;

-- 刪除月份明細時更新年度總計
CREATE TRIGGER trg_update_billing_plan_year_total_delete
AFTER DELETE ON BillingPlanMonths
BEGIN
  UPDATE BillingPlans
  SET year_total = (
    SELECT COALESCE(SUM(billing_amount), 0)
    FROM BillingPlanMonths
    WHERE billing_plan_id = OLD.billing_plan_id
  ),
  updated_at = datetime('now')
  WHERE billing_plan_id = OLD.billing_plan_id;
END;

-- ============================================
-- 5. 觸發器：自動更新 BillingPlans.updated_at
-- ============================================
CREATE TRIGGER trg_update_billing_plans_updated_at
AFTER UPDATE ON BillingPlans
BEGIN
  UPDATE BillingPlans
  SET updated_at = datetime('now')
  WHERE billing_plan_id = NEW.billing_plan_id;
END;

-- ============================================
-- 6. 資料完整性檢查視圖（用於驗證）
-- ============================================
-- 檢查定期服務收費計劃是否正確關聯定期服務
CREATE VIEW IF NOT EXISTS v_billing_plan_integrity_check AS
SELECT 
  bp.billing_plan_id,
  bp.client_id,
  bp.billing_year,
  bp.billing_type,
  COUNT(DISTINCT bps.client_service_id) AS service_count,
  GROUP_CONCAT(DISTINCT cs.service_type) AS service_types
FROM BillingPlans bp
LEFT JOIN BillingPlanServices bps ON bp.billing_plan_id = bps.billing_plan_id
LEFT JOIN ClientServices cs ON bps.client_service_id = cs.client_service_id
GROUP BY bp.billing_plan_id;

-- ============================================
-- 7. 說明註解
-- ============================================
-- 使用方式：
-- 1. 定期服務收費計劃：
--    - 建立 BillingPlans 記錄（billing_type = 'recurring'）
--    - 建立 BillingPlanMonths 記錄（每個月份的金額，1-12月可選）
--    - 建立 BillingPlanServices 記錄（關聯多個定期服務，service_type = 'recurring'）
--    - year_total 會自動由觸發器計算（BillingPlanMonths 的總和）
-- 2. 一次性服務收費計劃：
--    - 建立 BillingPlans 記錄（billing_type = 'one-time'，設定 billing_date 和 description）
--    - 建立 BillingPlanMonths 記錄（收費月份的金額，通常只有一個月份）
--    - 建立 BillingPlanServices 記錄（關聯一個一次性服務，service_type = 'one-time'）
--    - year_total 會自動由觸發器計算（BillingPlanMonths 的總和）
-- 3. 收入分攤計算：
--    - 定期服務：
--      * 計算定期服務總收費 = Σ(BillingPlanMonths.billing_amount) WHERE billing_type = 'recurring'
--      * 計算每個定期服務的執行次數 = JSON_ARRAY_LENGTH(ClientServices.execution_months)
--      * 按執行次數比例分攤總收費到各個定期服務
--      * 每個服務每個月的應計收入 = 該服務全年分攤收入 ÷ 該服務的執行次數（如果該月在 execution_months 中）
--    - 一次性服務：
--      * 每個一次性服務的應計收入 = 該服務的 BillingPlanMonths 總金額
--      * 每個一次性服務每個月的應計收入 = 該月份在 BillingPlanMonths 中的金額（如果存在）
-- 4. 資料完整性：
--    - 定期服務收費計劃：一個客戶一個年度只有一個（UNIQUE constraint）
--    - 一次性服務收費計劃：一個客戶一個年度可以有多個（每個服務一個）
--    - BillingPlanServices：確保關聯的服務類型與收費計劃類型一致（在應用層檢查）
-- ============================================


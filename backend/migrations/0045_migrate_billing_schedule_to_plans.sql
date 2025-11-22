-- ============================================
-- 0045_migrate_billing_schedule_to_plans.sql
-- 從 ServiceBillingSchedule 遷移到 BillingPlans 架構
-- 
-- 遷移策略：
-- 1. 定期服務（billing_type = 'monthly' 或 'recurring'）：
--    - 按客戶、年度分組，建立 BillingPlans 記錄（billing_type = 'recurring'）
--    - 合併相同月份的金額（多個服務的相同月份金額相加）
--    - 建立 BillingPlanServices 關聯（多對多）
--    - 建立 BillingPlanMonths 月份明細
-- 2. 一次性服務（billing_type = 'one-time'）：
--    - 每個一次性服務建立獨立的 BillingPlans 記錄（billing_type = 'one-time'）
--    - 建立 BillingPlanServices 關聯（一對一）
--    - 建立 BillingPlanMonths 月份明細（從 billing_date 提取月份）
-- 
-- 注意事項：
-- - 此遷移為一次性操作，建議在測試環境先驗證
-- - 遷移後保留 ServiceBillingSchedule 表（可手動刪除）
-- - 建議在遷移前備份資料庫
-- ============================================

-- ============================================
-- 1. 遷移定期服務收費計劃
-- ============================================

-- 步驟 1.1：建立臨時表用於分組和聚合
CREATE TEMP TABLE IF NOT EXISTS temp_recurring_plans AS
SELECT 
  cs.client_id,
  sbs.billing_year,
  -- 聚合月份金額（多個服務的相同月份金額相加）
  sbs.billing_month,
  SUM(sbs.billing_amount) AS total_amount,
  MAX(sbs.payment_due_days) AS payment_due_days, -- 使用最大值（通常相同）
  MAX(sbs.notes) AS notes, -- 合併備註
  -- 收集所有相關的服務 ID
  GROUP_CONCAT(DISTINCT sbs.client_service_id) AS service_ids
FROM ServiceBillingSchedule sbs
INNER JOIN ClientServices cs ON sbs.client_service_id = cs.client_service_id
WHERE sbs.billing_type IN ('monthly', 'recurring')
  AND sbs.billing_year IS NOT NULL
  AND sbs.billing_month BETWEEN 1 AND 12
  AND cs.service_type = 'recurring'
  AND cs.is_deleted = 0
GROUP BY cs.client_id, sbs.billing_year, sbs.billing_month;

-- 步驟 1.2：建立 BillingPlans 記錄（按客戶、年度分組）
INSERT INTO BillingPlans (
  client_id,
  billing_year,
  billing_type,
  year_total, -- 暫時設為 0，由觸發器更新
  payment_due_days,
  notes,
  created_at,
  updated_at
)
SELECT DISTINCT
  client_id,
  billing_year,
  'recurring' AS billing_type,
  0 AS year_total, -- 將由觸發器自動計算
  payment_due_days,
  notes,
  datetime('now') AS created_at,
  datetime('now') AS updated_at
FROM temp_recurring_plans
WHERE NOT EXISTS (
  -- 避免重複建立（如果已經有計劃）
  SELECT 1 FROM BillingPlans bp
  WHERE bp.client_id = temp_recurring_plans.client_id
    AND bp.billing_year = temp_recurring_plans.billing_year
    AND bp.billing_type = 'recurring'
);

-- 步驟 1.3：建立 BillingPlanMonths 月份明細
INSERT INTO BillingPlanMonths (
  billing_plan_id,
  billing_month,
  billing_amount,
  payment_due_days,
  created_at,
  updated_at
)
SELECT 
  bp.billing_plan_id,
  trp.billing_month,
  trp.total_amount,
  trp.payment_due_days,
  datetime('now') AS created_at,
  datetime('now') AS updated_at
FROM temp_recurring_plans trp
INNER JOIN BillingPlans bp ON 
  bp.client_id = trp.client_id
  AND bp.billing_year = trp.billing_year
  AND bp.billing_type = 'recurring'
WHERE NOT EXISTS (
  -- 避免重複插入
  SELECT 1 FROM BillingPlanMonths bpm
  WHERE bpm.billing_plan_id = bp.billing_plan_id
    AND bpm.billing_month = trp.billing_month
);

-- 步驟 1.4：建立 BillingPlanServices 服務關聯
INSERT INTO BillingPlanServices (
  billing_plan_id,
  client_service_id,
  created_at
)
SELECT DISTINCT
  bp.billing_plan_id,
  sbs.client_service_id,
  datetime('now') AS created_at
FROM ServiceBillingSchedule sbs
INNER JOIN ClientServices cs ON sbs.client_service_id = cs.client_service_id
INNER JOIN BillingPlans bp ON 
  bp.client_id = cs.client_id
  AND bp.billing_year = sbs.billing_year
  AND bp.billing_type = 'recurring'
WHERE sbs.billing_type IN ('monthly', 'recurring')
  AND sbs.billing_year IS NOT NULL
  AND cs.service_type = 'recurring'
  AND cs.is_deleted = 0
  AND NOT EXISTS (
    -- 避免重複關聯
    SELECT 1 FROM BillingPlanServices bps
    WHERE bps.billing_plan_id = bp.billing_plan_id
      AND bps.client_service_id = sbs.client_service_id
  );

-- 清理臨時表
DROP TABLE IF EXISTS temp_recurring_plans;

-- ============================================
-- 2. 遷移一次性服務收費計劃
-- ============================================

-- 步驟 2.1：建立 BillingPlans 記錄（每個一次性服務一個計劃）
INSERT INTO BillingPlans (
  client_id,
  billing_year,
  billing_type,
  year_total,
  payment_due_days,
  billing_date,
  description,
  notes,
  created_at,
  updated_at
)
SELECT DISTINCT
  cs.client_id,
  CAST(SUBSTR(sbs.billing_date, 1, 4) AS INTEGER) AS billing_year,
  'one-time' AS billing_type,
  sbs.billing_amount AS year_total,
  sbs.payment_due_days,
  sbs.billing_date,
  sbs.description,
  sbs.notes,
  sbs.created_at,
  sbs.updated_at
FROM ServiceBillingSchedule sbs
INNER JOIN ClientServices cs ON sbs.client_service_id = cs.client_service_id
WHERE sbs.billing_type = 'one-time'
  AND sbs.billing_date IS NOT NULL
  AND cs.service_type = 'one-time'
  AND cs.is_deleted = 0
  AND NOT EXISTS (
    -- 避免重複建立
    SELECT 1 FROM BillingPlans bp
    INNER JOIN BillingPlanServices bps ON bp.billing_plan_id = bps.billing_plan_id
    WHERE bp.client_id = cs.client_id
      AND bp.billing_year = CAST(SUBSTR(sbs.billing_date, 1, 4) AS INTEGER)
      AND bp.billing_type = 'one-time'
      AND bps.client_service_id = sbs.client_service_id
  );

-- 步驟 2.2：建立 BillingPlanServices 服務關聯
INSERT INTO BillingPlanServices (
  billing_plan_id,
  client_service_id,
  created_at
)
SELECT 
  bp.billing_plan_id,
  sbs.client_service_id,
  datetime('now') AS created_at
FROM ServiceBillingSchedule sbs
INNER JOIN ClientServices cs ON sbs.client_service_id = cs.client_service_id
INNER JOIN BillingPlans bp ON 
  bp.client_id = cs.client_id
  AND bp.billing_year = CAST(SUBSTR(sbs.billing_date, 1, 4) AS INTEGER)
  AND bp.billing_type = 'one-time'
  AND bp.billing_date = sbs.billing_date
  AND bp.description = sbs.description
WHERE sbs.billing_type = 'one-time'
  AND sbs.billing_date IS NOT NULL
  AND cs.service_type = 'one-time'
  AND cs.is_deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM BillingPlanServices bps
    WHERE bps.billing_plan_id = bp.billing_plan_id
      AND bps.client_service_id = sbs.client_service_id
  );

-- 步驟 2.3：建立 BillingPlanMonths 月份明細
INSERT INTO BillingPlanMonths (
  billing_plan_id,
  billing_month,
  billing_amount,
  created_at,
  updated_at
)
SELECT 
  bp.billing_plan_id,
  CAST(SUBSTR(sbs.billing_date, 6, 2) AS INTEGER) AS billing_month,
  sbs.billing_amount,
  datetime('now') AS created_at,
  datetime('now') AS updated_at
FROM ServiceBillingSchedule sbs
INNER JOIN ClientServices cs ON sbs.client_service_id = cs.client_service_id
INNER JOIN BillingPlans bp ON 
  bp.client_id = cs.client_id
  AND bp.billing_year = CAST(SUBSTR(sbs.billing_date, 1, 4) AS INTEGER)
  AND bp.billing_type = 'one-time'
  AND bp.billing_date = sbs.billing_date
  AND bp.description = sbs.description
WHERE sbs.billing_type = 'one-time'
  AND sbs.billing_date IS NOT NULL
  AND cs.service_type = 'one-time'
  AND cs.is_deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM BillingPlanMonths bpm
    WHERE bpm.billing_plan_id = bp.billing_plan_id
      AND bpm.billing_month = CAST(SUBSTR(sbs.billing_date, 6, 2) AS INTEGER)
  );

-- ============================================
-- 3. 驗證遷移結果
-- ============================================

-- 驗證：檢查是否有遺漏的資料
-- 定期服務：檢查 ServiceBillingSchedule 中是否有未遷移的記錄
CREATE TEMP VIEW IF NOT EXISTS v_migration_check_recurring AS
SELECT 
  sbs.schedule_id,
  sbs.client_service_id,
  sbs.billing_year,
  sbs.billing_month,
  CASE 
    WHEN bp.billing_plan_id IS NULL THEN 'MISSING_PLAN'
    WHEN bps.billing_plan_service_id IS NULL THEN 'MISSING_SERVICE'
    WHEN bpm.billing_plan_month_id IS NULL THEN 'MISSING_MONTH'
    ELSE 'OK'
  END AS migration_status
FROM ServiceBillingSchedule sbs
INNER JOIN ClientServices cs ON sbs.client_service_id = cs.client_service_id
LEFT JOIN BillingPlans bp ON 
  bp.client_id = cs.client_id
  AND bp.billing_year = sbs.billing_year
  AND bp.billing_type = 'recurring'
LEFT JOIN BillingPlanServices bps ON 
  bps.billing_plan_id = bp.billing_plan_id
  AND bps.client_service_id = sbs.client_service_id
LEFT JOIN BillingPlanMonths bpm ON 
  bpm.billing_plan_id = bp.billing_plan_id
  AND bpm.billing_month = sbs.billing_month
WHERE sbs.billing_type IN ('monthly', 'recurring')
  AND sbs.billing_year IS NOT NULL
  AND cs.service_type = 'recurring'
  AND cs.is_deleted = 0;

-- 一次性服務：檢查是否有未遷移的記錄
CREATE TEMP VIEW IF NOT EXISTS v_migration_check_one_time AS
SELECT 
  sbs.schedule_id,
  sbs.client_service_id,
  sbs.billing_date,
  sbs.description,
  CASE 
    WHEN bp.billing_plan_id IS NULL THEN 'MISSING_PLAN'
    WHEN bps.billing_plan_service_id IS NULL THEN 'MISSING_SERVICE'
    WHEN bpm.billing_plan_month_id IS NULL THEN 'MISSING_MONTH'
    ELSE 'OK'
  END AS migration_status
FROM ServiceBillingSchedule sbs
INNER JOIN ClientServices cs ON sbs.client_service_id = cs.client_service_id
LEFT JOIN BillingPlans bp ON 
  bp.client_id = cs.client_id
  AND bp.billing_year = CAST(SUBSTR(sbs.billing_date, 1, 4) AS INTEGER)
  AND bp.billing_type = 'one-time'
  AND bp.billing_date = sbs.billing_date
  AND bp.description = sbs.description
LEFT JOIN BillingPlanServices bps ON 
  bps.billing_plan_id = bp.billing_plan_id
  AND bps.client_service_id = sbs.client_service_id
LEFT JOIN BillingPlanMonths bpm ON 
  bpm.billing_plan_id = bp.billing_plan_id
  AND bpm.billing_month = CAST(SUBSTR(sbs.billing_date, 6, 2) AS INTEGER)
WHERE sbs.billing_type = 'one-time'
  AND sbs.billing_date IS NOT NULL
  AND cs.service_type = 'one-time'
  AND cs.is_deleted = 0;

-- ============================================
-- 4. 遷移統計資訊
-- ============================================

-- 查詢遷移統計
-- SELECT 
--   'Recurring Plans' AS plan_type,
--   COUNT(DISTINCT bp.billing_plan_id) AS plan_count,
--   COUNT(DISTINCT bps.client_service_id) AS service_count,
--   COUNT(DISTINCT bpm.billing_plan_month_id) AS month_count,
--   SUM(bp.year_total) AS total_revenue
-- FROM BillingPlans bp
-- LEFT JOIN BillingPlanServices bps ON bp.billing_plan_id = bps.billing_plan_id
-- LEFT JOIN BillingPlanMonths bpm ON bp.billing_plan_id = bpm.billing_plan_id
-- WHERE bp.billing_type = 'recurring'
-- UNION ALL
-- SELECT 
--   'One-time Plans' AS plan_type,
--   COUNT(DISTINCT bp.billing_plan_id) AS plan_count,
--   COUNT(DISTINCT bps.client_service_id) AS service_count,
--   COUNT(DISTINCT bpm.billing_plan_month_id) AS month_count,
--   SUM(bp.year_total) AS total_revenue
-- FROM BillingPlans bp
-- LEFT JOIN BillingPlanServices bps ON bp.billing_plan_id = bps.billing_plan_id
-- LEFT JOIN BillingPlanMonths bpm ON bp.billing_plan_id = bpm.billing_plan_id
-- WHERE bp.billing_type = 'one-time';

-- ============================================
-- 5. 回滾腳本（如果需要）
-- ============================================

-- 回滾遷移（刪除所有新架構的資料）
-- 注意：此操作不可逆，請謹慎使用
-- DELETE FROM BillingPlanMonths;
-- DELETE FROM BillingPlanServices;
-- DELETE FROM BillingPlans;

-- ============================================
-- 6. 說明註解
-- ============================================
-- 使用方式：
-- 1. 在測試環境執行此遷移腳本
-- 2. 使用 v_migration_check_recurring 和 v_migration_check_one_time 視圖檢查遷移結果
-- 3. 驗證資料完整性和業務邏輯正確性
-- 4. 確認無誤後，在生產環境執行
-- 5. 遷移完成後，可以選擇保留或刪除 ServiceBillingSchedule 表
-- 
-- 注意事項：
-- - 遷移前務必備份資料庫
-- - 建議在低峰時段執行遷移
-- - 遷移過程中避免對 ServiceBillingSchedule 進行寫入操作
-- - 遷移後驗證所有業務邏輯是否正常運作
-- ============================================




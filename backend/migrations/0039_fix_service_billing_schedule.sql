-- ============================================
-- 0039_fix_service_billing_schedule.sql
-- 對齊規格文件之 ServiceBillingSchedule 表結構（正式環境相容修正）
-- 目標：
-- - billing_type 僅允許 'monthly'、'one-time'
-- - billing_year 可為 NULL（一次性不需年度）
-- - billing_month 預設 0（一次性用 0）
-- - 保留既有資料、索引與時間戳
-- - 提供唯一性條件（依規格：月費/循環按年度+月份唯一；一次性按日期+描述唯一）
-- ============================================

-- 建立新表（避免 ALTER 受限）
CREATE TABLE IF NOT EXISTS ServiceBillingSchedule_new_0039 (
  schedule_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id  INTEGER NOT NULL,
  billing_type       TEXT NOT NULL CHECK (billing_type IN ('monthly','one-time')),
  billing_year       INTEGER,                                 -- 可為 NULL（一次性不需年度）
  billing_month      INTEGER NOT NULL DEFAULT 0 CHECK (billing_month BETWEEN 0 AND 12),
  billing_amount     REAL NOT NULL CHECK (billing_amount >= 0),
  payment_due_days   INTEGER NOT NULL DEFAULT 30 CHECK (payment_due_days > 0),
  billing_date       TEXT,                                    -- YYYY-MM-DD，一次性使用
  description        TEXT,                                    -- 一次性說明
  notes              TEXT,
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE
);

-- 將舊資料搬移到新表，嘗試合理轉換欄位
INSERT INTO ServiceBillingSchedule_new_0039 (
  schedule_id, client_service_id, billing_type, billing_year, billing_month,
  billing_amount, payment_due_days, billing_date, description, notes, created_at, updated_at
)
SELECT
  s.schedule_id,
  s.client_service_id,
  CASE 
    WHEN LOWER(COALESCE(s.billing_type, 'monthly')) IN ('monthly','one-time') THEN LOWER(s.billing_type)
    WHEN LOWER(COALESCE(s.billing_type, 'monthly')) = 'recurring' THEN 'monthly'
    ELSE 'monthly'
  END AS billing_type,
  -- 若原表沒有 billing_year 欄位或為 NULL，保留 NULL，以符合同一性（一次性不需年度）
  CASE 
    WHEN typeof((SELECT 1 FROM pragma_table_info('ServiceBillingSchedule') WHERE name='billing_year')) = 'null' THEN NULL
    ELSE s.billing_year
  END AS billing_year,
  COALESCE(s.billing_month, 0) AS billing_month,
  s.billing_amount,
  COALESCE(s.payment_due_days, 30) AS payment_due_days,
  s.billing_date,
  s.description,
  s.notes,
  s.created_at,
  s.updated_at
FROM ServiceBillingSchedule s;

-- 替換舊表
DROP TABLE ServiceBillingSchedule;
ALTER TABLE ServiceBillingSchedule_new_0039 RENAME TO ServiceBillingSchedule;

-- 索引與唯一性條件
-- 月費/循環：同 client_service_id + billing_year + billing_month 唯一
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_monthly_0039
ON ServiceBillingSchedule(client_service_id, billing_year, billing_month)
WHERE billing_type = 'monthly';

-- 一次性：同 client_service_id + billing_date + description 唯一
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_one_time_0039
ON ServiceBillingSchedule(client_service_id, billing_date, COALESCE(description, ''))
WHERE billing_type = 'one-time';

-- 查詢效能索引
CREATE INDEX IF NOT EXISTS ix_billing_client_service_id_0039
ON ServiceBillingSchedule(client_service_id);



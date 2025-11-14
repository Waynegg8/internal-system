-- ============================================
-- 0003_financial.sql
-- 整合自以下遷移文件:
--   - 2025-10-30T000500Z_receipts.sql
--   - 2025-10-31T020000Z_create_billing_schedule.sql
--   - 2025-10-31T020300Z_enhance_receipts.sql
--   - 2025-11-01T220000Z_add_service_month.sql
--   - 2025-11-01T240000Z_create_receipt_items_payments.sql
--   - 2025-11-02T000300Z_add_service_month_to_receipts.sql
--   - 2025-11-03T000000Z_add_fee_fields_to_receipt_items.sql
--   - 2025-11-03T010000Z_add_withholding_amount.sql
--   - 2025-11-06T000000Z_alter_billing_schedule_support_onetime.sql
--   - 2025-11-07T000000Z_add_service_period_to_receipts.sql
--   - 2025-11-07T100000Z_create_receipt_service_types.sql
--   - 2025-11-07T100100Z_create_billing_reminders.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-30T000500Z_receipts.sql
-- ============================================

-- Receipts minimal schema for list API

CREATE TABLE IF NOT EXISTS Receipts (
  receipt_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  receipt_date TEXT NOT NULL,
  due_date TEXT,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'unpaid',
  is_auto_generated BOOLEAN DEFAULT 1,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  -- 從後續遷移移過來的欄位
  service_start_month TEXT,
  service_end_month TEXT
);

CREATE INDEX IF NOT EXISTS idx_receipts_client ON Receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON Receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON Receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_status_due ON Receipts(status, due_date);
CREATE INDEX IF NOT EXISTS idx_receipts_client_status ON Receipts(client_id, status);





-- ============================================
-- 來源: 2025-10-31T020000Z_create_billing_schedule.sql
-- ============================================

-- 创建服务收费明细表
CREATE TABLE IF NOT EXISTS ServiceBillingSchedule (
  schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  billing_month INTEGER NOT NULL CHECK(billing_month BETWEEN 1 AND 12),
  billing_amount REAL NOT NULL CHECK(billing_amount >= 0),
  payment_due_days INTEGER DEFAULT 30 CHECK(payment_due_days > 0),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  -- 從後續遷移移過來的欄位（支持一次性收費）
  billing_type TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_type IN ('monthly','one-time')),
  billing_date TEXT,
  description TEXT,
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  UNIQUE(client_service_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_billing_schedule_service ON ServiceBillingSchedule(client_service_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_month ON ServiceBillingSchedule(billing_month);




-- ============================================
-- 來源: 2025-10-31T020300Z_enhance_receipts.sql
-- ============================================

-- 增强Receipts表（添加类型和关联字段）

ALTER TABLE Receipts ADD COLUMN receipt_type TEXT DEFAULT 'normal';
-- normal: 正常收据（任务完成后）
-- advance: 预收款
-- deposit: 订金
-- final: 尾款

ALTER TABLE Receipts ADD COLUMN related_task_id INTEGER;
-- 关联任务ID（可空，预收时没有任务）

ALTER TABLE Receipts ADD COLUMN client_service_id INTEGER;
-- 关联客户服务（用于自动带入金额）

ALTER TABLE Receipts ADD COLUMN billing_month INTEGER CHECK(billing_month IS NULL OR (billing_month BETWEEN 1 AND 12));
-- 对应哪个月份的收费（1-12，用于匹配收费明细）

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_receipts_type ON Receipts(receipt_type);
CREATE INDEX IF NOT EXISTS idx_receipts_task ON Receipts(related_task_id);
CREATE INDEX IF NOT EXISTS idx_receipts_service ON Receipts(client_service_id);
CREATE INDEX IF NOT EXISTS idx_receipts_month ON Receipts(billing_month);




-- ============================================
-- 來源: 2025-11-01T220000Z_add_service_month.sql
-- ============================================

-- 添加任务服务归属月份字段
-- 用于按月筛选和管理任务，表示该任务是为哪个月的服务而执行的

-- 1. 添加字段
ALTER TABLE ActiveTasks ADD COLUMN service_month TEXT;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_active_tasks_service_month 
  ON ActiveTasks(service_month);

-- 3. 为现有任务回填 service_month
-- 从任务名称中提取"YYYY年M月"格式
UPDATE ActiveTasks 
SET service_month = (
  CASE
    -- 匹配 "2025年1月" 格式
    WHEN task_name LIKE '%年_月%' OR task_name LIKE '%年__月%' THEN
      substr(
        task_name, 
        instr(task_name, '年') - 4, 
        instr(task_name, '月') - instr(task_name, '年') + 5
      )
    ELSE NULL
  END
)
WHERE service_month IS NULL AND is_deleted = 0;

-- 4. 对于无法解析的任务，使用创建时间的月份
UPDATE ActiveTasks 
SET service_month = strftime('%Y-%m', created_at)
WHERE service_month IS NULL AND is_deleted = 0;

-- 5. 标准化格式：将"2025年1月"转换为"2025-01"
UPDATE ActiveTasks
SET service_month = (
  substr(service_month, 1, 4) || '-' || 
  CASE 
    WHEN length(substr(service_month, 6, instr(substr(service_month, 6), '月') - 1)) = 1 
    THEN '0' || substr(service_month, 6, 1)
    ELSE substr(service_month, 6, 2)
  END
)
WHERE service_month LIKE '%年%月%' AND is_deleted = 0;

-- 6. 验证：确保所有活动任务都有 service_month
-- （预期结果：应该是0行）
-- SELECT COUNT(*) FROM ActiveTasks WHERE service_month IS NULL AND is_deleted = 0;




-- ============================================
-- 來源: 2025-11-01T240000Z_create_receipt_items_payments.sql
-- ============================================

-- 收据明细表（支持多项服务）
CREATE TABLE IF NOT EXISTS ReceiptItems (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK(quantity > 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  subtotal REAL NOT NULL CHECK(subtotal >= 0),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON ReceiptItems(receipt_id);

-- 收款记录表
CREATE TABLE IF NOT EXISTS Payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  payment_amount REAL NOT NULL CHECK(payment_amount > 0),
  payment_method TEXT DEFAULT 'transfer', -- cash/transfer/check/other
  reference_number TEXT,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_receipt ON Payments(receipt_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON Payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON Payments(is_deleted);

-- 为Receipts表添加已收款金额字段（用于快速查询）
ALTER TABLE Receipts ADD COLUMN paid_amount REAL DEFAULT 0 CHECK(paid_amount >= 0);

-- 更新现有收据的paid_amount（全部为0）
UPDATE Receipts SET paid_amount = 0 WHERE paid_amount IS NULL;




-- ============================================
-- 來源: 2025-11-02T000300Z_add_service_month_to_receipts.sql
-- ============================================

-- 添加 service_month 到 Receipts 表用于关联任务

ALTER TABLE Receipts ADD COLUMN service_month TEXT;
-- 服务月份（格式：YYYY-MM，用于关联 ActiveTasks）

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_receipts_service_month ON Receipts(service_month);

-- 从现有数据填充 service_month（基于 receipt_date 和 billing_month）
-- 如果 billing_month 存在，使用 receipt_date 的年份 + billing_month
-- 否则使用 receipt_date 的年月
UPDATE Receipts 
SET service_month = CASE 
  WHEN billing_month IS NOT NULL AND billing_month BETWEEN 1 AND 12 
    THEN substr(receipt_date, 1, 4) || '-' || printf('%02d', billing_month)
  ELSE substr(receipt_date, 1, 7)
END
WHERE service_month IS NULL;




-- ============================================
-- 來源: 2025-11-03T000000Z_add_fee_fields_to_receipt_items.sql
-- ============================================

-- 为ReceiptItems表添加代办费、规费、杂费字段
-- 2025-11-03
-- 注意：字段可能已存在

-- 字段已存在，跳过




-- ============================================
-- 來源: 2025-11-03T010000Z_add_withholding_amount.sql
-- ============================================

-- 为Receipts表添加扣缴金额字段
-- 2025-11-03
-- 注意：字段可能已存在

-- 字段已存在，跳过




-- ============================================
-- 來源: 2025-11-06T000000Z_alter_billing_schedule_support_onetime.sql
-- ============================================

-- 強化 ServiceBillingSchedule：完整支援一次性收費
-- 變更點：
-- 1) 新結構：加入 billing_type/billing_date/description，放寬 billing_month 檢核
-- 2) 移除舊 UNIQUE(client_service_id, billing_month) 限制，改為「部分唯一索引」
--    - 月費：客戶+月份唯一（僅限 billing_type='monthly'）
--    - 一次性：客戶+日期+說明 唯一（僅限 billing_type='one-time'）
-- 3) 兼容舊資料：保留既有 schedule_id 與時間戳
-- 注意：Cloudflare D1 會自動處理事務，不需要 BEGIN/COMMIT

-- 建立新表（避免直接 ALTER 造成限制無法移除）
CREATE TABLE IF NOT EXISTS ServiceBillingSchedule_new (
  schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  billing_type TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_type IN ('monthly','one-time')),
  billing_month INTEGER NOT NULL DEFAULT 0 CHECK(billing_month BETWEEN 0 AND 12),
  billing_amount REAL NOT NULL CHECK(billing_amount >= 0),
  payment_due_days INTEGER DEFAULT 30 CHECK(payment_due_days > 0),
  billing_date TEXT,           -- YYYY-MM-DD，僅對 once 使用
  description TEXT,            -- 一次性收費項目名稱
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE
);

-- 將舊資料搬移到新表，並合理填補新欄位
INSERT INTO ServiceBillingSchedule_new (
  schedule_id, client_service_id, billing_type, billing_month,
  billing_amount, payment_due_days, billing_date, description,
  notes, created_at, updated_at
) 
SELECT 
  schedule_id,
  client_service_id,
  COALESCE(billing_type, 'monthly') AS billing_type,
  CASE 
    WHEN COALESCE(billing_type,'monthly')='monthly' THEN COALESCE(billing_month, 0)
    ELSE COALESCE(billing_month, 0)
  END AS billing_month,
  billing_amount,
  payment_due_days,
  CASE WHEN COALESCE(billing_type,'monthly')='one-time' THEN billing_date ELSE NULL END AS billing_date,
  CASE WHEN COALESCE(billing_type,'monthly')='one-time' THEN description ELSE NULL END AS description,
  notes, created_at, updated_at
FROM ServiceBillingSchedule;

-- 替換舊表
DROP TABLE ServiceBillingSchedule;
ALTER TABLE ServiceBillingSchedule_new RENAME TO ServiceBillingSchedule;

-- 唯一性規則（使用 Partial Index 達成條件唯一）
-- 月費：同客戶同月份只允許一筆
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_monthly
ON ServiceBillingSchedule(client_service_id, billing_month)
WHERE billing_type = 'monthly';

-- 一次性：同客戶+同日期+同說明 只允許一筆（避免重複）
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_onetime
ON ServiceBillingSchedule(client_service_id, billing_date, description)
WHERE billing_type = 'one-time';

-- 常用索引
CREATE INDEX IF NOT EXISTS idx_billing_schedule_service ON ServiceBillingSchedule(client_service_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_type ON ServiceBillingSchedule(billing_type);
CREATE INDEX IF NOT EXISTS idx_billing_schedule_month ON ServiceBillingSchedule(billing_month);




-- ============================================
-- 來源: 2025-11-07T000000Z_add_service_period_to_receipts.sql
-- ============================================

-- 为Receipts表添加服务期间字段，支持跨月服务
-- 跳过：字段已存在（已在之前执行）

-- 仅确保数据已填充（如果有未填充的）
UPDATE Receipts 
SET service_start_month = COALESCE(service_start_month, service_month, substr(receipt_date, 1, 7)),
    service_end_month = COALESCE(service_end_month, service_month, substr(receipt_date, 1, 7))
WHERE service_start_month IS NULL OR service_end_month IS NULL;




-- ============================================
-- 來源: 2025-11-07T100000Z_create_receipt_service_types.sql
-- ============================================

-- 收据-服务类型关联表
-- 支持一张收据包含多个服务类型（如套餐）

CREATE TABLE IF NOT EXISTS ReceiptServiceTypes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id)
);

CREATE INDEX IF NOT EXISTS idx_receipt_service_types_receipt 
ON ReceiptServiceTypes(receipt_id);

CREATE INDEX IF NOT EXISTS idx_receipt_service_types_service 
ON ReceiptServiceTypes(service_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_service_types_unique 
ON ReceiptServiceTypes(receipt_id, service_id);




-- ============================================
-- 來源: 2025-11-07T100100Z_create_billing_reminders.sql
-- ============================================

-- 开票提醒表
-- 当服务任务完成时自动创建提醒
-- 支持暂缓开票（等其他服务完成）

CREATE TABLE IF NOT EXISTS BillingReminders (
  reminder_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_service_id INTEGER NOT NULL,
  service_month TEXT NOT NULL, -- YYYY-MM，服务月份
  suggested_amount REAL, -- 建议金额（从收费设定获取）
  status TEXT DEFAULT 'pending', -- pending/postponed/completed/cancelled
  postpone_reason TEXT, -- 暂缓原因
  postpone_until_services TEXT, -- 等待哪些服务完成（JSON array of service_ids）
  reminder_type TEXT DEFAULT 'task_completed', -- task_completed/scheduled
  created_by INTEGER, -- 谁触发的提醒（任务完成者）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT, -- 完成时间（开立收据时）
  completed_receipt_id TEXT, -- 关联的收据ID
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (completed_receipt_id) REFERENCES Receipts(receipt_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_client 
ON BillingReminders(client_id);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_status 
ON BillingReminders(status);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_service_month 
ON BillingReminders(service_month);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_pending 
ON BillingReminders(status, created_at) WHERE status = 'pending';




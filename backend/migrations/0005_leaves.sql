-- ============================================
-- 0005_leaves.sql
-- 整合自以下遷移文件:
--   - 2025-10-30T000400Z_leaves.sql
--   - 2025-10-30T000401Z_compensatory_leave_grants.sql
--   - 2025-10-30T001500Z_holidays.sql
--   - 2025-10-30T001600Z_update_holidays_2025.sql
--   - 2025-10-30T001700Z_add_holidays_2026.sql
--   - 2025-11-01T000000Z_add_leave_time_fields.sql
--   - 2025-11-01T000100Z_life_event_leave_grants.sql
--   - 2025-11-01T000200Z_cleanup_comp_from_leave_balances.sql
--   - 2025-11-01T000300Z_init_basic_leave_balances.sql
--   - 2025-11-06T001900Z_add_leave_delete_fields.sql
--   - 2025-10-31T000000Z_fix_compensatory_leave_fk.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-30T000400Z_leaves.sql
-- ============================================

-- Leave requests and balances

CREATE TABLE IF NOT EXISTS LeaveRequests (
  leave_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL,           -- annual/sick/personal/comp/... gender-limited in rules
  start_date TEXT NOT NULL,           -- YYYY-MM-DD
  end_date TEXT NOT NULL,             -- YYYY-MM-DD
  unit TEXT NOT NULL DEFAULT 'day',   -- day|half|hour
  amount REAL NOT NULL,               -- days or hours depending on unit
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by INTEGER,
  is_deleted BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_leaves_user ON LeaveRequests(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON LeaveRequests(status);
CREATE INDEX IF NOT EXISTS idx_leaves_date ON LeaveRequests(start_date, end_date);

CREATE TABLE IF NOT EXISTS LeaveBalances (
  balance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  total REAL NOT NULL,
  used REAL NOT NULL DEFAULT 0,
  remain REAL NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, leave_type, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_bal_user_year ON LeaveBalances(user_id, year);





-- ============================================
-- 來源: 2025-10-30T000401Z_compensatory_leave_grants.sql
-- ============================================

-- Compensatory Leave Grants (補休追蹤表)
-- 用於追蹤每筆補休的產生、使用與到期

CREATE TABLE IF NOT EXISTS CompensatoryLeaveGrants (
  grant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_timelog_id INTEGER,          -- 來源工時記錄 ID（關聯到 Timesheets）
  hours_generated REAL NOT NULL,      -- 產生的補休時數
  hours_used REAL NOT NULL DEFAULT 0, -- 已使用時數
  hours_remaining REAL NOT NULL,      -- 剩餘時數
  generated_date TEXT NOT NULL,       -- 產生日期（YYYY-MM-DD）
  expiry_date TEXT NOT NULL,          -- 到期日（當月底 YYYY-MM-DD）
  original_rate REAL,                 -- 原始費率（用於轉加班費計算）
  status TEXT DEFAULT 'active',       -- active|expired|fully_used
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (source_timelog_id) REFERENCES Timesheets(log_id),
  CHECK (status IN ('active', 'expired', 'fully_used')),
  CHECK (hours_remaining >= 0),
  CHECK (hours_used >= 0),
  CHECK (hours_generated > 0)
);

-- 索引：查詢用戶的有效補休
CREATE INDEX IF NOT EXISTS idx_comp_leave_user_status 
ON CompensatoryLeaveGrants(user_id, status, generated_date);

-- 索引：到期轉加班費 Cron Job 使用
CREATE INDEX IF NOT EXISTS idx_comp_leave_expiry 
ON CompensatoryLeaveGrants(expiry_date, status);

-- 補休到期轉加班費記錄表
CREATE TABLE IF NOT EXISTS CompensatoryOvertimePay (
  pay_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,           -- 記入的薪資月份（YYYY-MM）
  hours_expired REAL NOT NULL,        -- 到期的補休時數
  amount_cents INTEGER NOT NULL,      -- 轉換的加班費（分）
  source_grant_ids TEXT,              -- 來源 grant_id 列表（JSON array）
  processed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_overtime_pay_user_month 
ON CompensatoryOvertimePay(user_id, year_month);










-- ============================================
-- 來源: 2025-10-30T001500Z_holidays.sql
-- ============================================

-- Holidays（假日與日期屬性）

CREATE TABLE IF NOT EXISTS Holidays (
  holiday_date TEXT PRIMARY KEY,         -- YYYY-MM-DD
  name TEXT,                             -- 假日名稱（例：國慶日、春節）
  is_national_holiday BOOLEAN DEFAULT 0, -- 是否為國定假日
  is_weekly_restday BOOLEAN DEFAULT 0,   -- 是否為例假日（通常週日）
  is_makeup_workday BOOLEAN DEFAULT 0,   -- 是否為補班日
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON Holidays(holiday_date);

-- 插入 2025-2026 年台灣國定假日（範例資料）
-- 2025年
INSERT OR IGNORE INTO Holidays (holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday) VALUES
  ('2025-01-01', '元旦', 1, 0, 0),
  ('2025-01-27', '農曆除夕補假', 1, 0, 0),
  ('2025-01-28', '農曆除夕', 1, 0, 0),
  ('2025-01-29', '春節初一', 1, 0, 0),
  ('2025-01-30', '春節初二', 1, 0, 0),
  ('2025-01-31', '春節初三', 1, 0, 0),
  ('2025-02-28', '和平紀念日', 1, 0, 0),
  ('2025-04-03', '兒童節補假', 1, 0, 0),
  ('2025-04-04', '兒童節、清明節', 1, 0, 0),
  ('2025-05-01', '勞動節', 1, 0, 0),
  ('2025-05-31', '端午節', 1, 0, 0),
  ('2025-09-06', '中秋節補假', 1, 0, 0),
  ('2025-10-10', '國慶日', 1, 0, 0),
  
  -- 2026年（部分，可後續補充）
  ('2026-01-01', '元旦', 1, 0, 0),
  ('2026-02-16', '農曆除夕補假', 1, 0, 0),
  ('2026-02-17', '春節初一', 1, 0, 0),
  ('2026-02-18', '春節初二', 1, 0, 0),
  ('2026-02-19', '春節初三', 1, 0, 0),
  ('2026-02-28', '和平紀念日', 1, 0, 0),
  ('2026-04-03', '兒童節補假', 1, 0, 0),
  ('2026-04-04', '兒童節、清明節', 1, 0, 0),
  ('2026-05-01', '勞動節', 1, 0, 0),
  ('2026-10-10', '國慶日', 1, 0, 0);

-- 註：例假日（週日）和補班日需由系統根據日期計算或手動維護
-- 可透過管理介面或定期更新腳本維護




-- ============================================
-- 來源: 2025-10-30T001600Z_update_holidays_2025.sql
-- ============================================

-- 更新2025年完整假日資料（依《紀念日及節日實施條例》修正版）
-- 5月28日公布新增5個國定假日：農曆小年夜、勞動節、教師節、光復節、行憲紀念日

-- 先清除2025年舊資料
DELETE FROM Holidays WHERE holiday_date BETWEEN '2025-01-01' AND '2025-12-31';

-- 插入2025年完整假日資料（全年總放假120天，8個3天以上連續假期）
INSERT OR IGNORE INTO Holidays (holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday) VALUES
  -- 元旦（1/1）
  ('2025-01-01', '元旦', 1, 0, 0),
  
  -- 春節連假（1/25-2/2，休9天）
  ('2025-01-25', '農曆小年夜', 1, 0, 0),
  ('2025-01-26', '農曆除夕', 1, 0, 0),
  ('2025-01-27', '春節初一', 1, 0, 0),
  ('2025-01-28', '春節初二', 1, 0, 0),
  ('2025-01-29', '春節初三', 1, 0, 0),
  ('2025-01-30', '春節初四', 1, 0, 0),
  ('2025-01-31', '春節初五', 1, 0, 0),
  ('2025-02-01', '春節初六補假', 1, 0, 0),
  ('2025-02-02', '春節初七補假', 1, 0, 0),
  
  -- 228連假（2/28-3/2，休3天）
  ('2025-02-28', '和平紀念日', 1, 0, 0),
  ('2025-03-01', '和平紀念日補假', 1, 0, 0),
  ('2025-03-02', '和平紀念日補假', 1, 0, 0),
  
  -- 清明節連假（4/3-4/6，休4天）
  ('2025-04-03', '兒童節', 1, 0, 0),
  ('2025-04-04', '清明節', 1, 0, 0),
  ('2025-04-05', '兒童節補假', 1, 0, 0),
  ('2025-04-06', '清明節補假', 1, 0, 0),
  
  -- 勞動節（5/1）
  ('2025-05-01', '勞動節', 1, 0, 0),
  
  -- 端午節連假（5/30-6/1，休3天）
  ('2025-05-30', '端午節', 1, 0, 0),
  ('2025-05-31', '端午節補假', 1, 0, 0),
  ('2025-06-01', '端午節補假', 1, 0, 0),
  
  -- 教師節連假（9/27-9/29，休3天）
  ('2025-09-27', '教師節補假', 1, 0, 0),
  ('2025-09-28', '教師節（孔子誕辰）', 1, 0, 0),
  ('2025-09-29', '教師節補假', 1, 0, 0),
  
  -- 中秋節連假（10/4-10/6，休3天）
  ('2025-10-04', '中秋節', 1, 0, 0),
  ('2025-10-05', '中秋節補假', 1, 0, 0),
  ('2025-10-06', '中秋節補假', 1, 0, 0),
  
  -- 國慶日連假（10/10-10/12，休3天）
  ('2025-10-10', '國慶日', 1, 0, 0),
  ('2025-10-11', '國慶日補假', 1, 0, 0),
  ('2025-10-12', '國慶日補假', 1, 0, 0),
  
  -- 光復節連假（10/24-10/26，休3天）
  ('2025-10-24', '光復節', 1, 0, 0),
  ('2025-10-25', '光復節', 1, 0, 0),
  ('2025-10-26', '光復節補假', 1, 0, 0),
  
  -- 行憲紀念日（12/25）
  ('2025-12-25', '行憲紀念日', 1, 0, 0),
  
  -- 補班日（僅2/8一天）
  ('2025-02-08', '補班日', 0, 0, 1);

-- 註：此資料依據《紀念日及節日實施條例》（2025年5月28日修正公布）
-- 資料來源：總統府、人事行政總處
-- 全年總放假日數：120天
-- 3天以上連續假期：8個




-- ============================================
-- 來源: 2025-10-30T001700Z_add_holidays_2026.sql
-- ============================================

-- 2026年假日資料（依《紀念日及節日實施條例》2025年5月28日修正版）
-- 全年總放假120天，9個3天以上連續假期，無補班日

INSERT OR IGNORE INTO Holidays (holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday) VALUES
  -- 元旦（1/1）
  ('2026-01-01', '元旦', 1, 0, 0),
  
  -- 農曆春節連假（2/14-2/22，休9天）
  ('2026-02-14', '農曆小年夜', 1, 0, 0),
  ('2026-02-15', '農曆除夕', 1, 0, 0),
  ('2026-02-16', '春節初一', 1, 0, 0),
  ('2026-02-17', '春節初二', 1, 0, 0),
  ('2026-02-18', '春節初三', 1, 0, 0),
  ('2026-02-19', '春節初四', 1, 0, 0),
  ('2026-02-20', '春節初五', 1, 0, 0),
  ('2026-02-21', '春節初六補假', 1, 0, 0),
  ('2026-02-22', '春節初七補假', 1, 0, 0),
  
  -- 228連假（2/27-3/1，休3天）
  ('2026-02-27', '和平紀念日', 1, 0, 0),
  ('2026-02-28', '和平紀念日補假', 1, 0, 0),
  ('2026-03-01', '和平紀念日補假', 1, 0, 0),
  
  -- 清明節連假（4/3-4/6，休4天）
  ('2026-04-03', '兒童節', 1, 0, 0),
  ('2026-04-04', '清明節', 1, 0, 0),
  ('2026-04-05', '兒童節補假', 1, 0, 0),
  ('2026-04-06', '清明節補假', 1, 0, 0),
  
  -- 勞動節連假（5/1-5/3，休3天）
  ('2026-05-01', '勞動節', 1, 0, 0),
  ('2026-05-02', '勞動節補假', 1, 0, 0),
  ('2026-05-03', '勞動節補假', 1, 0, 0),
  
  -- 端午節連假（6/19-6/21，休3天）
  ('2026-06-19', '端午節', 1, 0, 0),
  ('2026-06-20', '端午節補假', 1, 0, 0),
  ('2026-06-21', '端午節補假', 1, 0, 0),
  
  -- 中秋節及教師節連假（9/25-9/28，休4天）
  ('2026-09-25', '中秋節', 1, 0, 0),
  ('2026-09-26', '中秋節補假', 1, 0, 0),
  ('2026-09-27', '教師節補假', 1, 0, 0),
  ('2026-09-28', '教師節（孔子誕辰）', 1, 0, 0),
  
  -- 國慶日連假（10/9-10/11，休3天）
  ('2026-10-09', '國慶日', 1, 0, 0),
  ('2026-10-10', '國慶日', 1, 0, 0),
  ('2026-10-11', '國慶日補假', 1, 0, 0),
  
  -- 光復節連假（10/24-10/26，休3天）
  ('2026-10-24', '光復節', 1, 0, 0),
  ('2026-10-25', '光復節', 1, 0, 0),
  ('2026-10-26', '光復節補假', 1, 0, 0),
  
  -- 行憲紀念日連假（12/25-12/27，休3天）
  ('2026-12-25', '行憲紀念日', 1, 0, 0),
  ('2026-12-26', '行憲紀念日補假', 1, 0, 0),
  ('2026-12-27', '行憲紀念日補假', 1, 0, 0);

-- 註：2026年無補班日（is_makeup_workday 恆為 0）
-- 資料來源：《紀念日及節日實施條例》（2025年5月28日修正公布）
-- 全年總放假日數：120天
-- 3天以上連續假期：9個




-- ============================================
-- 來源: 2025-11-01T000000Z_add_leave_time_fields.sql
-- ============================================

-- Add time fields to LeaveRequests for hourly leave tracking

ALTER TABLE LeaveRequests ADD COLUMN start_time TEXT;
ALTER TABLE LeaveRequests ADD COLUMN end_time TEXT;

-- start_time and end_time are in HH:MM format (e.g., "09:00", "14:30")
-- Only used when unit = 'hour'




-- ============================================
-- 來源: 2025-11-01T000100Z_life_event_leave_grants.sql
-- ============================================

-- Life Event Leave Grants (生活事件假期授予表)
-- 用於記錄婚假、喪假、產假、陪產假等生活事件產生的假期額度

CREATE TABLE IF NOT EXISTS LifeEventLeaveGrants (
  grant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,           -- marriage|funeral|maternity|paternity|other
  event_date TEXT NOT NULL,           -- 事件發生日期 (YYYY-MM-DD)
  leave_type TEXT NOT NULL,           -- 對應的假別類型
  days_granted REAL NOT NULL,         -- 授予的天數
  days_used REAL NOT NULL DEFAULT 0,  -- 已使用天數
  days_remaining REAL NOT NULL,       -- 剩餘天數
  valid_from TEXT NOT NULL,           -- 有效起始日 (YYYY-MM-DD)
  valid_until TEXT NOT NULL,          -- 有效截止日 (YYYY-MM-DD)
  notes TEXT,                         -- 備註（關係、說明等）
  status TEXT DEFAULT 'active',       -- active|expired|fully_used
  created_at TEXT DEFAULT (datetime('now')),
  created_by INTEGER,
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  CHECK (status IN ('active', 'expired', 'fully_used')),
  CHECK (days_remaining >= 0),
  CHECK (days_used >= 0),
  CHECK (days_granted > 0)
);

CREATE INDEX IF NOT EXISTS idx_life_event_user_status 
ON LifeEventLeaveGrants(user_id, status, valid_until);

CREATE INDEX IF NOT EXISTS idx_life_event_type 
ON LifeEventLeaveGrants(event_type, event_date);




-- ============================================
-- 來源: 2025-11-01T000200Z_cleanup_comp_from_leave_balances.sql
-- ============================================

-- Clean up comp leave type from LeaveBalances table
-- Comp leave should only be tracked in CompensatoryLeaveGrants table

DELETE FROM LeaveBalances WHERE leave_type = 'comp';




-- ============================================
-- 來源: 2025-11-01T000300Z_init_basic_leave_balances.sql
-- ============================================

-- Initialize basic leave balances for all users
-- This ensures every user has sick leave and personal leave records

-- Get current year
-- For each active user, ensure they have sick leave and personal leave balances

-- Sick leave: 30 days per year (普通傷病假)
INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at)
SELECT 
  user_id,
  'sick' as leave_type,
  CAST(strftime('%Y', 'now') AS INTEGER) as year,
  30 as total,
  0 as used,
  30 as remain,
  datetime('now') as updated_at
FROM Users
WHERE is_deleted = 0;

-- Personal leave: 14 days per year (事假)
INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at)
SELECT 
  user_id,
  'personal' as leave_type,
  CAST(strftime('%Y', 'now') AS INTEGER) as year,
  14 as total,
  0 as used,
  14 as remain,
  datetime('now') as updated_at
FROM Users
WHERE is_deleted = 0;

-- Annual leave will be calculated based on seniority (handled by separate logic)
-- Compensatory leave is tracked in CompensatoryLeaveGrants table
-- Life event leaves are tracked in LifeEventLeaveGrants table




-- ============================================
-- 來源: 2025-11-06T001900Z_add_leave_delete_fields.sql
-- ============================================

-- Add deleted_at and deleted_by fields to LeaveRequests for audit trail
-- 跳过：字段已存在（可能在之前的迁移中已添加）

-- 仅创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_leaves_deleted ON LeaveRequests(is_deleted);




-- ============================================
-- 來源: 2025-10-31T000000Z_fix_compensatory_leave_fk.sql
-- ============================================

-- 修复 CompensatoryLeaveGrants 表的外键约束
-- 原外键引用了不存在的 Timesheets(log_id)，应该引用 Timesheets(timesheet_id)

-- SQLite 不支持直接修改外键，需要重建表

-- 1. 创建新表（正确的外键）
CREATE TABLE IF NOT EXISTS CompensatoryLeaveGrants_new (
  grant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_timelog_id INTEGER,          -- 關聯到 Timesheets.timesheet_id
  hours_generated REAL NOT NULL,      -- 產生的補休時數
  hours_used REAL NOT NULL DEFAULT 0, -- 已使用時數
  hours_remaining REAL NOT NULL,      -- 剩餘時數
  generated_date TEXT NOT NULL,       -- 產生日期（YYYY-MM-DD）
  expiry_date TEXT NOT NULL,          -- 到期日（當月底 YYYY-MM-DD）
  original_rate REAL,                 -- 原始費率（用於轉加班費計算）
  status TEXT DEFAULT 'active',       -- active|expired|fully_used
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (source_timelog_id) REFERENCES Timesheets(timesheet_id),
  CHECK (status IN ('active', 'expired', 'fully_used')),
  CHECK (hours_remaining >= 0),
  CHECK (hours_used >= 0),
  CHECK (hours_generated > 0)
);

-- 2. 复制数据（如果旧表有数据）
INSERT INTO CompensatoryLeaveGrants_new 
SELECT * FROM CompensatoryLeaveGrants WHERE 1=0; -- 不复制数据，因为旧表可能没有数据

-- 3. 删除旧表
DROP TABLE IF EXISTS CompensatoryLeaveGrants;

-- 4. 重命名新表
ALTER TABLE CompensatoryLeaveGrants_new RENAME TO CompensatoryLeaveGrants;

-- 5. 重建索引
CREATE INDEX IF NOT EXISTS idx_comp_leave_user_status 
ON CompensatoryLeaveGrants(user_id, status, generated_date);

CREATE INDEX IF NOT EXISTS idx_comp_leave_expiry 
ON CompensatoryLeaveGrants(expiry_date, status);




-- ============================================
-- 0004_payroll.sql
-- 整合自以下遷移文件:
--   - 2025-10-30T000600Z_payroll.sql
--   - 2025-11-01T220000Z_add_user_salary_fields.sql
--   - 2025-11-03T020000Z_create_salary_items.sql
--   - 2025-11-03T030000Z_create_monthly_bonus.sql
--   - 2025-11-03T040000Z_create_yearend_bonus.sql
--   - 2025-11-03T040000Z_add_transport_subsidy_to_payroll.sql
--   - 2025-11-03T050000Z_add_meal_allowance_to_payroll.sql
--   - 2025-11-03T060000Z_create_payroll_settings.sql
--   - 2025-11-03T070000Z_update_transport_settings.sql
--   - 2025-11-03T080000Z_remove_overtime_multipliers.sql
--   - 2025-11-03T090000Z_add_recurring_to_salary_items.sql
--   - 2025-11-03T100000Z_change_yearend_payment_to_month.sql
--   - 2025-11-03T110000Z_fix_salary_effective_dates.sql
--   - 2025-11-03T120000Z_create_punch_records.sql
--   - 2025-11-04T000000Z_create_payroll_snapshots.sql
--   - 2025-11-05T000000Z_refactor_salary_categories.sql
--   - 2025-11-07T000000Z_create_payroll_cache.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-30T000600Z_payroll.sql
-- ============================================

-- Payroll runs and monthly payroll results

CREATE TABLE IF NOT EXISTS PayrollRuns (
  run_id TEXT PRIMARY KEY,
  month TEXT NOT NULL,              -- YYYY-MM
  idempotency_key TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(month)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_runs_idem ON PayrollRuns(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON PayrollRuns(month);

CREATE TABLE IF NOT EXISTS MonthlyPayroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  base_salary_cents INTEGER NOT NULL,
  regular_allowance_cents INTEGER NOT NULL,
  bonus_cents INTEGER NOT NULL,
  overtime_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  is_full_attendance BOOLEAN NOT NULL,
  FOREIGN KEY (run_id) REFERENCES PayrollRuns(run_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_payroll_run ON MonthlyPayroll(run_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_user ON MonthlyPayroll(user_id);






-- ============================================
-- 來源: 2025-11-01T220000Z_add_user_salary_fields.sql
-- ============================================

-- Add salary and allowance fields to Users table

-- Add base_salary field (monthly base salary in TWD)
ALTER TABLE Users ADD COLUMN base_salary INTEGER DEFAULT 40000;

-- Add regular_allowance field (monthly regular allowance that counts towards hourly rate)
ALTER TABLE Users ADD COLUMN regular_allowance INTEGER DEFAULT 0;

-- Add note field for salary notes
ALTER TABLE Users ADD COLUMN salary_notes TEXT;

-- Update existing users to have reasonable default salaries based on their role
UPDATE Users SET base_salary = 45000 WHERE is_admin = 1 AND base_salary = 40000;





-- ============================================
-- 來源: 2025-11-03T020000Z_create_salary_items.sql
-- ============================================

-- 薪资项目类型表和员工薪资项目表

-- 1. 薪资项目类型表（SalaryItemTypes）
CREATE TABLE IF NOT EXISTS SalaryItemTypes (
  item_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('allowance', 'bonus', 'deduction')),
  is_regular_payment BOOLEAN DEFAULT 0,  -- 是否为经常性给与（影响时薪计算）
  is_fixed BOOLEAN DEFAULT 0,  -- 金额是否固定
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_salary_item_types_active ON SalaryItemTypes(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_item_types_category ON SalaryItemTypes(category);
CREATE INDEX IF NOT EXISTS idx_salary_item_types_regular ON SalaryItemTypes(is_regular_payment);

-- 2. 员工薪资项目表（EmployeeSalaryItems）
CREATE TABLE IF NOT EXISTS EmployeeSalaryItems (
  employee_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),  -- 金额（以分为单位）
  effective_date TEXT NOT NULL,  -- 生效日期 YYYY-MM-DD
  expiry_date TEXT,  -- 过期日期（NULL表示永久有效）
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (item_type_id) REFERENCES SalaryItemTypes(item_type_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_salary_items_user ON EmployeeSalaryItems(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_type ON EmployeeSalaryItems(item_type_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_date ON EmployeeSalaryItems(effective_date, expiry_date);
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_active ON EmployeeSalaryItems(is_active);

-- 3. 插入预设薪资项目类型
INSERT INTO SalaryItemTypes (item_code, item_name, category, is_regular_payment, is_fixed, description, display_order) VALUES
  ('FULL_ATTENDANCE', '全勤奖金', 'bonus', 1, 0, '当月无病假、事假时发放', 1),
  ('MEAL_ALLOWANCE', '伙食津贴', 'allowance', 1, 1, '每月固定伙食津贴', 2),
  ('TRANSPORT_ALLOWANCE', '交通津贴', 'allowance', 1, 1, '每月固定交通津贴', 3),
  ('POSITION_ALLOWANCE', '职务加给', 'allowance', 1, 1, '主管或特殊职务加给', 4),
  ('PHONE_ALLOWANCE', '电话津贴', 'allowance', 1, 1, '每月电话费补助', 5),
  ('PARKING_ALLOWANCE', '停车津贴', 'allowance', 1, 1, '每月停车费补助', 6),
  ('PERFORMANCE', '绩效奖金', 'bonus', 1, 0, '每月绩效奖金（可按月调整）', 7),
  ('SPECIAL_BONUS', '特殊奖金', 'bonus', 0, 0, '非经常性特殊奖金', 8);

-- 4. 为现有员工设置预设薪资项目（示例）
-- 管理员获得较高的全勤奖金和职务加给
INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'FULL_ATTENDANCE'),
  300000,  -- 3000元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 1;

INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'MEAL_ALLOWANCE'),
  240000,  -- 2400元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 1;

INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'TRANSPORT_ALLOWANCE'),
  120000,  -- 1200元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 1;

-- 一般员工获得较低的全勤奖金
INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'FULL_ATTENDANCE'),
  200000,  -- 2000元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 0;

INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'MEAL_ALLOWANCE'),
  240000,  -- 2400元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 0;

INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'TRANSPORT_ALLOWANCE'),
  120000,  -- 1200元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 0;




-- ============================================
-- 來源: 2025-11-03T030000Z_create_monthly_bonus.sql
-- ============================================

-- 月度绩效奖金调整表
CREATE TABLE IF NOT EXISTS MonthlyBonusAdjustments (
  adjustment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM
  bonus_amount_cents INTEGER NOT NULL DEFAULT 0, -- 绩效奖金金额（分）
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_bonus_month ON MonthlyBonusAdjustments(month);
CREATE INDEX IF NOT EXISTS idx_monthly_bonus_user ON MonthlyBonusAdjustments(user_id);




-- ============================================
-- 來源: 2025-11-03T040000Z_create_yearend_bonus.sql
-- ============================================

-- 年终奖金表
CREATE TABLE IF NOT EXISTS YearEndBonus (
  bonus_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL, -- 年度（例如 2025）
  amount_cents INTEGER NOT NULL DEFAULT 0, -- 年终奖金金额（分）
  payment_date TEXT, -- 发放日期 YYYY-MM-DD
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_yearend_bonus_year ON YearEndBonus(year);
CREATE INDEX IF NOT EXISTS idx_yearend_bonus_user ON YearEndBonus(user_id);




-- ============================================
-- 來源: 2025-11-03T040000Z_add_transport_subsidy_to_payroll.sql
-- ============================================

-- Add transport subsidy field to MonthlyPayroll table

ALTER TABLE MonthlyPayroll ADD COLUMN transport_subsidy_cents INTEGER NOT NULL DEFAULT 0;

-- Update comment: transport_subsidy_cents 是從該月已核准的 BusinessTrips 計算得出




-- ============================================
-- 來源: 2025-11-03T050000Z_add_meal_allowance_to_payroll.sql
-- ============================================

-- Add meal allowance field to MonthlyPayroll table
-- 誤餐費：平日加班超過1.5小時則給90元

ALTER TABLE MonthlyPayroll ADD COLUMN meal_allowance_cents INTEGER NOT NULL DEFAULT 0;

-- meal_allowance_cents 是從該月工時表計算得出
-- 規則：平日（非週末、非國定假日）加班超過1.5小時的天數 × 90元




-- ============================================
-- 來源: 2025-11-03T060000Z_create_payroll_settings.sql
-- ============================================

-- 薪资系统设定表
CREATE TABLE IF NOT EXISTS PayrollSettings (
  setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL, -- 'number', 'text', 'boolean'
  category TEXT NOT NULL, -- 'meal', 'transport', 'leave', 'general'
  display_name TEXT NOT NULL,
  description TEXT,
  updated_by INTEGER,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (updated_by) REFERENCES Users(user_id)
);

-- 插入默认设定
INSERT INTO PayrollSettings (setting_key, setting_value, setting_type, category, display_name, description) VALUES
-- 误餐费设定
('meal_allowance_per_time', '100', 'number', 'meal', '误餐费单价（元/次）', '平日加班满1.5小时发放'),
('meal_allowance_min_overtime_hours', '1.5', 'number', 'meal', '误餐费最低加班时数', '达到此时数才发放误餐费'),

-- 交通补贴设定
('transport_rate_per_km', '5', 'number', 'transport', '交通补贴单价（元/公里）', '外出交通按公里数计算'),

-- 请假扣款设定
('sick_leave_deduction_rate', '1.0', 'number', 'leave', '病假扣款比例', '1.0 = 全额扣除，0.5 = 扣除50%'),
('personal_leave_deduction_rate', '1.0', 'number', 'leave', '事假扣款比例', '1.0 = 全额扣除'),
('leave_daily_salary_divisor', '30', 'number', 'leave', '日薪计算除数', '底薪除以此数字得到日薪'),

-- 加班费设定
('overtime_1_5x_multiplier', '1.5', 'number', 'general', '平日加班费倍率', '平日延长工时加班费倍率'),
('overtime_2x_multiplier', '2.0', 'number', 'general', '休息日加班费倍率', '休息日工作加班费倍率'),
('overtime_3x_multiplier', '3.0', 'number', 'general', '国定假日加班费倍率', '国定假日工作加班费倍率'),

-- 时薪计算设定
('hourly_rate_divisor', '240', 'number', 'general', '时薪计算除数', '(底薪+经常性给与)除以此数字得到时薪');

CREATE INDEX IF NOT EXISTS idx_payroll_settings_category ON PayrollSettings(category);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_key ON PayrollSettings(setting_key);




-- ============================================
-- 來源: 2025-11-03T070000Z_update_transport_settings.sql
-- ============================================

-- 更新交通补贴设定为区间制
-- 删除旧的交通补贴单价设定
DELETE FROM PayrollSettings WHERE setting_key = 'transport_rate_per_km';

-- 添加新的交通补贴区间设定
INSERT INTO PayrollSettings (setting_key, setting_value, setting_type, category, display_name, description) VALUES
('transport_amount_per_interval', '60', 'number', 'transport', '交通补贴每区间金额（元）', '每个区间固定金额'),
('transport_km_per_interval', '5', 'number', 'transport', '每个区间公里数', '例如：5公里为1个区间');




-- ============================================
-- 來源: 2025-11-03T080000Z_remove_overtime_multipliers.sql
-- ============================================

-- 删除加班费倍率设定（工时表中已存储加权工时）
DELETE FROM PayrollSettings WHERE setting_key IN (
    'overtime_1_5x_multiplier',
    'overtime_2x_multiplier', 
    'overtime_3x_multiplier'
);




-- ============================================
-- 來源: 2025-11-03T090000Z_add_recurring_to_salary_items.sql
-- ============================================

-- 为薪资项目添加循环发放设定
-- recurring_type: 'monthly'=每月发放, 'yearly'=每年指定月份发放, 'once'=仅发放一次
-- recurring_months: 发放月份（JSON数组，例如 "[6,9,12]" 表示6月、9月、12月发放），仅当 recurring_type='yearly' 时使用

-- 添加循环类型字段
ALTER TABLE EmployeeSalaryItems ADD COLUMN recurring_type TEXT DEFAULT 'monthly';

-- 添加发放月份字段
ALTER TABLE EmployeeSalaryItems ADD COLUMN recurring_months TEXT DEFAULT NULL;




-- ============================================
-- 來源: 2025-11-03T100000Z_change_yearend_payment_to_month.sql
-- ============================================

-- 将年终奖金的发放日期改为发放月份
-- 从 payment_date (YYYY-MM-DD) 改为 payment_month (YYYY-MM)

-- SQLite不支持直接ALTER COLUMN，需要重建表
-- 1. 创建临时表（新结构）
CREATE TABLE IF NOT EXISTS YearEndBonus_new (
  bonus_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_month TEXT, -- 发放月份 YYYY-MM（例如 2025-01）
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  UNIQUE(user_id, year)
);

-- 2. 迁移现有数据，将 payment_date 转换为 payment_month (取前7位)
INSERT INTO YearEndBonus_new (bonus_id, user_id, year, amount_cents, payment_month, notes, created_by, created_at, updated_at)
SELECT 
  bonus_id, 
  user_id, 
  year, 
  amount_cents, 
  CASE 
    WHEN payment_date IS NOT NULL AND length(payment_date) >= 7 
    THEN substr(payment_date, 1, 7)  -- 取前7位 YYYY-MM
    ELSE NULL 
  END AS payment_month,
  notes, 
  created_by, 
  created_at, 
  updated_at
FROM YearEndBonus;

-- 3. 删除旧表
DROP TABLE YearEndBonus;

-- 4. 重命名新表
ALTER TABLE YearEndBonus_new RENAME TO YearEndBonus;

-- 5. 重建索引
CREATE INDEX IF NOT EXISTS idx_yearend_bonus_year ON YearEndBonus(year);
CREATE INDEX IF NOT EXISTS idx_yearend_bonus_user ON YearEndBonus(user_id);




-- ============================================
-- 來源: 2025-11-03T110000Z_fix_salary_effective_dates.sql
-- ============================================

-- 修复薪资项目的生效日期
-- 将所有生效日期设置为2025年初，以便历史月份也能查询到

UPDATE EmployeeSalaryItems
SET effective_date = '2025-01-01'
WHERE effective_date > '2025-01-31';

-- 如果需要更早的日期，可以改为 '2024-01-01'




-- ============================================
-- 來源: 2025-11-03T120000Z_create_punch_records.sql
-- ============================================

-- 打卡記錄上傳表
CREATE TABLE IF NOT EXISTS PunchRecords (
  record_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM 格式
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL, -- R2存儲的key
  file_size_bytes INTEGER NOT NULL,
  file_type TEXT, -- MIME type
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, confirmed, deleted
  uploaded_at TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_punch_records_user ON PunchRecords(user_id);
CREATE INDEX IF NOT EXISTS idx_punch_records_month ON PunchRecords(month);
CREATE INDEX IF NOT EXISTS idx_punch_records_status ON PunchRecords(status);




-- ============================================
-- 來源: 2025-11-04T000000Z_create_payroll_snapshots.sql
-- ============================================

-- 創建薪資月結版本表
-- 用於記錄每次產製月結的完整數據和變更記錄

CREATE TABLE IF NOT EXISTS PayrollSnapshots (
  snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,                    -- 薪資月份 (YYYY-MM)
  version INTEGER NOT NULL DEFAULT 1,     -- 版本號（同一月份可有多個版本）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER NOT NULL,            -- 產製人員 user_id
  snapshot_data TEXT NOT NULL,            -- JSON格式：完整的薪資計算結果
  changes_summary TEXT,                   -- JSON格式：相比上一版本的變更摘要
  notes TEXT,                             -- 備註說明
  FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- 建立索引以加快查詢
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_month ON PayrollSnapshots(month);
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_month_version ON PayrollSnapshots(month, version);
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_created_at ON PayrollSnapshots(created_at);

-- 插入測試數據的註解
-- 實際數據將由系統產製月結時自動生成




-- ============================================
-- 來源: 2025-11-05T000000Z_refactor_salary_categories.sql
-- ============================================

-- 重构薪资项目分类系统
-- 跳过此迁移：因为表已存在且有外键约束，无法安全重建
-- 新的category值已在应用层处理，无需修改数据库结构
-- 如果将来需要严格的CHECK约束，需要在维护窗口期手动执行

SELECT 'Migration skipped - table already exists with FK constraints' AS status;




-- ============================================
-- 來源: 2025-11-07T000000Z_create_payroll_cache.sql
-- ============================================

-- ==================== 薪资计算缓存表 ====================
-- 用途：自动缓存每月薪资计算结果，加速报表查询
-- 更新机制：每次调用 calculateEmployeePayroll 后自动更新

CREATE TABLE IF NOT EXISTS PayrollCache (
  user_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,  -- YYYY-MM
  
  -- 薪资数据（单位：分）
  base_salary_cents INTEGER NOT NULL DEFAULT 0,
  gross_salary_cents INTEGER NOT NULL DEFAULT 0,
  net_salary_cents INTEGER NOT NULL DEFAULT 0,
  overtime_cents INTEGER NOT NULL DEFAULT 0,
  performance_bonus_cents INTEGER NOT NULL DEFAULT 0,
  year_end_bonus_cents INTEGER NOT NULL DEFAULT 0,
  
  -- 其他统计数据
  total_work_hours REAL DEFAULT 0,
  total_overtime_hours REAL DEFAULT 0,
  
  -- 自动更新时间
  last_calculated_at TEXT DEFAULT (datetime('now')),
  
  PRIMARY KEY (user_id, year_month),
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- 索引：按年月查询（用于年度报表）
CREATE INDEX IF NOT EXISTS idx_payroll_cache_year_month 
ON PayrollCache(year_month);

-- 索引：按员工查询
CREATE INDEX IF NOT EXISTS idx_payroll_cache_user 
ON PayrollCache(user_id);




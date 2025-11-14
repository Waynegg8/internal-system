PRAGMA foreign_keys=OFF;

-- 暫存舊資料表
ALTER TABLE EmployeeSalaryItems RENAME TO EmployeeSalaryItems_old;
ALTER TABLE SalaryItemTypes RENAME TO SalaryItemTypes_old;

-- 建立新的 SalaryItemTypes
CREATE TABLE IF NOT EXISTS SalaryItemTypes (
  item_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('regular_allowance','irregular_allowance','bonus','year_end_bonus','deduction')),
  is_regular_payment BOOLEAN DEFAULT 0,
  is_fixed BOOLEAN DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO SalaryItemTypes (
  item_type_id,
  item_code,
  item_name,
  category,
  is_regular_payment,
  is_fixed,
  description,
  is_active,
  display_order,
  created_at,
  updated_at
)
SELECT
  item_type_id,
  item_code,
  item_name,
  CASE
    WHEN category = 'allowance' AND IFNULL(is_regular_payment, 0) = 1 THEN 'regular_allowance'
    WHEN category = 'allowance' THEN 'irregular_allowance'
    WHEN category IN ('bonus', 'year_end_bonus', 'deduction') THEN category
    ELSE category
  END AS category,
  CASE
    WHEN category = 'allowance' THEN IFNULL(is_regular_payment, 0)
    WHEN category = 'regular_allowance' THEN 1
    ELSE IFNULL(is_regular_payment, 0)
  END AS is_regular_payment,
  is_fixed,
  description,
  is_active,
  display_order,
  created_at,
  updated_at
FROM SalaryItemTypes_old;

CREATE INDEX IF NOT EXISTS idx_salary_item_types_active ON SalaryItemTypes(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_item_types_category ON SalaryItemTypes(category);
CREATE INDEX IF NOT EXISTS idx_salary_item_types_regular ON SalaryItemTypes(is_regular_payment);

-- 重新建立 EmployeeSalaryItems 以更新外鍵參照
CREATE TABLE IF NOT EXISTS EmployeeSalaryItems (
  employee_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),
  effective_date TEXT NOT NULL,
  expiry_date TEXT,
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (item_type_id) REFERENCES SalaryItemTypes(item_type_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

INSERT INTO EmployeeSalaryItems (
  employee_item_id,
  user_id,
  item_type_id,
  amount_cents,
  effective_date,
  expiry_date,
  is_active,
  notes,
  created_by,
  created_at,
  updated_at
)
SELECT
  employee_item_id,
  user_id,
  item_type_id,
  amount_cents,
  effective_date,
  expiry_date,
  is_active,
  notes,
  created_by,
  created_at,
  updated_at
FROM EmployeeSalaryItems_old;

CREATE INDEX IF NOT EXISTS idx_employee_salary_items_user ON EmployeeSalaryItems(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_type ON EmployeeSalaryItems(item_type_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_date ON EmployeeSalaryItems(effective_date, expiry_date);
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_active ON EmployeeSalaryItems(is_active);

-- 清除舊資料表
DROP TABLE EmployeeSalaryItems_old;
DROP TABLE SalaryItemTypes_old;

PRAGMA foreign_keys=ON;


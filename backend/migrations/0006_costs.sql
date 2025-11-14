-- ============================================
-- 0006_costs.sql
-- 整合自以下遷移文件:
--   - 2025-10-30T000700Z_overhead.sql
--   - 2025-11-06T000000Z_overhead_recurring.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-30T000700Z_overhead.sql
-- ============================================

-- Overhead cost types and monthly overhead costs

CREATE TABLE IF NOT EXISTS OverheadCostTypes (
  cost_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_code TEXT UNIQUE NOT NULL,
  cost_name TEXT NOT NULL,
  category TEXT NOT NULL,
  allocation_method TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  CHECK (category IN ('fixed', 'variable')),
  CHECK (allocation_method IN ('per_employee', 'per_hour', 'per_revenue'))
);
CREATE INDEX IF NOT EXISTS idx_overhead_cost_types_active ON OverheadCostTypes(is_active);
CREATE INDEX IF NOT EXISTS idx_overhead_cost_types_category ON OverheadCostTypes(category);

CREATE TABLE IF NOT EXISTS MonthlyOverheadCosts (
  overhead_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_type_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  FOREIGN KEY (cost_type_id) REFERENCES OverheadCostTypes(cost_type_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(cost_type_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_monthly_overhead_date ON MonthlyOverheadCosts(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_overhead_type ON MonthlyOverheadCosts(cost_type_id);






-- ============================================
-- 來源: 2025-11-06T000000Z_overhead_recurring.sql
-- ============================================

-- Overhead recurring templates and monthly generation helper

CREATE TABLE IF NOT EXISTS OverheadRecurringTemplates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_type_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  recurring_type TEXT NOT NULL DEFAULT 'monthly', -- monthly | yearly | once
  recurring_months TEXT, -- JSON array (1..12), for yearly
  effective_from TEXT,   -- 'YYYY-MM'
  effective_to TEXT,     -- 'YYYY-MM' or NULL
  is_active BOOLEAN DEFAULT 1,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cost_type_id) REFERENCES OverheadCostTypes(cost_type_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_overhead_tpl_active ON OverheadRecurringTemplates(is_active);
CREATE INDEX IF NOT EXISTS idx_overhead_tpl_cost_type ON OverheadRecurringTemplates(cost_type_id);





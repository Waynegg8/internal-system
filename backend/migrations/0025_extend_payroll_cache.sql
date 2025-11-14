-- 擴展 PayrollCache 表結構，添加詳細欄位以支持增量更新
-- 來源：優化薪資重新計算邏輯

ALTER TABLE PayrollCache ADD COLUMN transport_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE PayrollCache ADD COLUMN leave_deduction_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE PayrollCache ADD COLUMN meal_allowance_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE PayrollCache ADD COLUMN deduction_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE PayrollCache ADD COLUMN total_regular_allowance_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE PayrollCache ADD COLUMN total_irregular_allowance_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE PayrollCache ADD COLUMN total_regular_bonus_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE PayrollCache ADD COLUMN is_full_attendance BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE PayrollCache ADD COLUMN data_json TEXT;
ALTER TABLE PayrollCache ADD COLUMN needs_recalc INTEGER NOT NULL DEFAULT 0;
ALTER TABLE PayrollCache ADD COLUMN last_error TEXT;
ALTER TABLE PayrollCache ADD COLUMN last_error_at TEXT;



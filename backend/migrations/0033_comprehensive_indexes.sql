-- ============================================
-- 0033_comprehensive_indexes.sql
-- 全面索引優化：為所有常用查詢添加索引
-- ============================================

-- ==================== PayrollCache 表索引 ====================
-- 優化：WHERE user_id = ? AND year_month = ?
CREATE INDEX IF NOT EXISTS idx_payroll_cache_user_month 
ON PayrollCache(user_id, year_month);

-- 優化：WHERE year_month = ?
CREATE INDEX IF NOT EXISTS idx_payroll_cache_month 
ON PayrollCache(year_month);

-- 優化：WHERE user_id = ? AND year_month = ? AND needs_recalc = 1
CREATE INDEX IF NOT EXISTS idx_payroll_cache_recalc 
ON PayrollCache(user_id, year_month, needs_recalc) WHERE needs_recalc = 1;

-- 優化：WHERE year_month = ? AND needs_recalc = 1
CREATE INDEX IF NOT EXISTS idx_payroll_cache_month_recalc 
ON PayrollCache(year_month, needs_recalc) WHERE needs_recalc = 1;

-- ==================== PayrollRecalcQueue 表索引 ====================
-- 優化：WHERE user_id = ? AND year_month = ?
CREATE INDEX IF NOT EXISTS idx_payroll_recalc_user_month 
ON PayrollRecalcQueue(user_id, year_month);

-- 優化：WHERE year_month = ? AND status IN ('pending', 'processing', 'error')
CREATE INDEX IF NOT EXISTS idx_payroll_recalc_month_status 
ON PayrollRecalcQueue(year_month, status);

-- ==================== MonthlyBonusAdjustments 表索引 ====================
-- 優化：WHERE user_id = ? AND month = ?
CREATE INDEX IF NOT EXISTS idx_monthly_bonus_user_month 
ON MonthlyBonusAdjustments(user_id, month);

-- 優化：WHERE month = ?
CREATE INDEX IF NOT EXISTS idx_monthly_bonus_month 
ON MonthlyBonusAdjustments(month);

-- ==================== Receipts 表索引 ====================
-- 優化：WHERE status IN (...) AND substr(receipt_date,1,7) = ?
CREATE INDEX IF NOT EXISTS idx_receipts_status_date 
ON Receipts(status, receipt_date) WHERE is_deleted = 0;

-- 優化：WHERE status IN (...) AND due_date < ?
CREATE INDEX IF NOT EXISTS idx_receipts_status_due 
ON Receipts(status, due_date) WHERE is_deleted = 0;

-- 優化：WHERE status = ? AND substr(receipt_date,1,7) = ?
CREATE INDEX IF NOT EXISTS idx_receipts_status_receipt_month 
ON Receipts(status, receipt_date) WHERE is_deleted = 0;

-- 優化：WHERE status = ? AND substr(receipt_date,1,4) = ? AND receipt_date <= ?
CREATE INDEX IF NOT EXISTS idx_receipts_status_receipt_year 
ON Receipts(status, receipt_date) WHERE is_deleted = 0;

-- 優化：WHERE client_id = ? AND receipt_date
CREATE INDEX IF NOT EXISTS idx_receipts_client_date 
ON Receipts(client_id, receipt_date) WHERE is_deleted = 0;

-- ==================== ReceiptItems 表索引 ====================
-- 優化：WHERE receipt_id IN (...)
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt 
ON ReceiptItems(receipt_id);

-- ==================== Payments 表索引 ====================
-- 優化：WHERE receipt_id IN (...) AND is_deleted = 0 GROUP BY receipt_id
CREATE INDEX IF NOT EXISTS idx_payments_receipt_deleted 
ON Payments(receipt_id, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE receipt_id = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_payments_receipt 
ON Payments(receipt_id) WHERE is_deleted = 0;

-- ==================== ActiveTasks 表索引 ====================
-- 優化：WHERE assignee_user_id = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_active_tasks_assignee_deleted 
ON ActiveTasks(assignee_user_id, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE client_service_id = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_active_tasks_service_deleted 
ON ActiveTasks(client_service_id, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE status IN (...) AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_active_tasks_status_deleted 
ON ActiveTasks(status, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE due_date ORDER BY due_date
CREATE INDEX IF NOT EXISTS idx_active_tasks_due_date 
ON ActiveTasks(due_date) WHERE is_deleted = 0;

-- 優化：WHERE service_year = ? AND service_month = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_active_tasks_year_month_deleted 
ON ActiveTasks(service_year, service_month, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE task_config_id IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_active_tasks_config 
ON ActiveTasks(task_config_id) WHERE task_config_id IS NOT NULL AND is_deleted = 0;

-- ==================== ActiveTaskStages 表索引 ====================
-- 優化：WHERE task_id = ? AND status = 'completed'
CREATE INDEX IF NOT EXISTS idx_task_stages_task_status 
ON ActiveTaskStages(task_id, status);

-- 優化：WHERE task_id = ?
CREATE INDEX IF NOT EXISTS idx_task_stages_task 
ON ActiveTaskStages(task_id);

-- ==================== EmployeeSalaryItems 表索引 ====================
-- 優化：WHERE user_id = ? AND effective_date <= ? AND (expiry_date IS NULL OR expiry_date >= ?)
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_user_dates 
ON EmployeeSalaryItems(user_id, effective_date, expiry_date);

-- 優化：WHERE user_id = ? AND item_type_id = ? ORDER BY effective_date DESC
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_user_type_date 
ON EmployeeSalaryItems(user_id, item_type_id, effective_date DESC);

-- 優化：WHERE item_type_id = ? AND is_active = 1
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_type_active 
ON EmployeeSalaryItems(item_type_id, is_active) WHERE is_active = 1;

-- ==================== Timesheets 表索引 ====================
-- 優化：WHERE user_id = ? AND work_date = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_timesheets_user_work_date_deleted 
ON Timesheets(user_id, work_date, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE client_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_timesheets_client_month_deleted 
ON Timesheets(client_id, work_date, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE service_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_timesheets_service_month_deleted 
ON Timesheets(service_id, work_date, is_deleted) WHERE is_deleted = 0;

-- 優化：GROUP BY user_id WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_timesheets_user_month_deleted 
ON Timesheets(user_id, work_date, is_deleted) WHERE is_deleted = 0;

-- ==================== ClientServices 表索引 ====================
-- 優化：WHERE client_id = ? AND service_id = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_client_services_client_service_deleted 
ON ClientServices(client_id, service_id, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE client_id = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_client_services_client_deleted 
ON ClientServices(client_id, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE service_id = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_client_services_service_deleted 
ON ClientServices(service_id, is_deleted) WHERE is_deleted = 0;

-- ==================== ClientCollaborators 表索引 ====================
-- 優化：WHERE client_id = ? AND user_id = ?
CREATE INDEX IF NOT EXISTS idx_client_collaborators_client_user 
ON ClientCollaborators(client_id, user_id);

-- ==================== Users 表索引 ====================
-- 優化：WHERE is_deleted = 0 ORDER BY user_id
CREATE INDEX IF NOT EXISTS idx_users_deleted_id 
ON Users(is_deleted, user_id) WHERE is_deleted = 0;

-- 優化：WHERE is_deleted = 0 ORDER BY name
CREATE INDEX IF NOT EXISTS idx_users_deleted_name 
ON Users(is_deleted, name) WHERE is_deleted = 0;

-- ==================== MonthlyPayroll 表索引 ====================
-- 優化：JOIN PayrollRuns ON pr.run_id = mp.run_id WHERE pr.month = ?
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_run_month 
ON MonthlyPayroll(run_id);

-- 優化：WHERE run_id = ?
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_run 
ON MonthlyPayroll(run_id);

-- ==================== PayrollRuns 表索引 ====================
-- 優化：WHERE month = ?
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month 
ON PayrollRuns(month);

-- ==================== CacheData 表索引 ====================
-- 優化：WHERE cache_key = ? AND cache_type = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_cache_data_key_type_deleted 
ON CacheData(cache_key, cache_type, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE cache_type = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_cache_data_type_deleted 
ON CacheData(cache_type, is_deleted) WHERE is_deleted = 0;

-- ==================== LeaveRequests 表索引 ====================
-- 優化：WHERE user_id = ? AND start_date <= ? AND end_date >= ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_leaves_user_date_range_deleted 
ON LeaveRequests(user_id, start_date, end_date, is_deleted) WHERE is_deleted = 0;

-- 優化：WHERE status = ? AND is_deleted = 0
CREATE INDEX IF NOT EXISTS idx_leaves_status_deleted 
ON LeaveRequests(status, is_deleted) WHERE is_deleted = 0;

-- ==================== 分析統計 ====================
-- 為所有表運行 ANALYZE 以更新查詢優化器統計信息
ANALYZE PayrollCache;
ANALYZE PayrollRecalcQueue;
ANALYZE MonthlyBonusAdjustments;
ANALYZE Receipts;
ANALYZE ReceiptItems;
ANALYZE Payments;
ANALYZE ActiveTasks;
ANALYZE ActiveTaskStages;
ANALYZE EmployeeSalaryItems;
ANALYZE Timesheets;
ANALYZE ClientServices;
ANALYZE ClientCollaborators;
ANALYZE Users;
ANALYZE MonthlyPayroll;
ANALYZE PayrollRuns;
ANALYZE CacheData;
ANALYZE LeaveRequests;


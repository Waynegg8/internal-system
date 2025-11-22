-- 完整工時規則驗證腳本
-- 檢查所有必須遵守的規則：

-- 規則 1: 正常工時不超過 8 小時（工作日）
SELECT 'rule_1_normal_hours_exceed' as rule, user_id, work_date, 
       SUM(CASE WHEN CAST(work_type AS INTEGER) = 1 THEN hours ELSE 0 END) as normal_hours
FROM Timesheets
WHERE work_date >= '2025-11-01' AND work_date <= '2025-11-30' 
  AND is_deleted = 0
  AND CAST(strftime('%w', work_date || ' 12:00:00') AS INTEGER) BETWEEN 1 AND 5  -- 工作日
GROUP BY user_id, work_date
HAVING normal_hours > 8;

-- 規則 2: 工作日正常工時+請假未滿8小時不能填加班
-- （需要 JOIN LeaveRequests，這裡用簡化版本檢查）
WITH daily_stats AS (
  SELECT t.user_id, t.work_date, 
         SUM(CASE WHEN CAST(t.work_type AS INTEGER) = 1 THEN t.hours ELSE 0 END) as normal_hours,
         SUM(CASE WHEN CAST(t.work_type AS INTEGER) >= 2 AND CAST(t.work_type AS INTEGER) <= 3 THEN t.hours ELSE 0 END) as overtime_hours
  FROM Timesheets t
  WHERE t.work_date >= '2025-11-01' AND t.work_date <= '2025-11-30' 
    AND t.is_deleted = 0
    AND CAST(strftime('%w', t.work_date || ' 12:00:00') AS INTEGER) BETWEEN 1 AND 5
  GROUP BY t.user_id, t.work_date
),
daily_leaves AS (
  SELECT l.user_id, 
         CASE WHEN l.unit = 'day' AND l.start_date = l.end_date THEN l.start_date ELSE NULL END as leave_date,
         CASE WHEN l.unit = 'day' THEN 8 ELSE l.amount END as leave_hours
  FROM LeaveRequests l
  WHERE l.start_date <= '2025-11-30' AND l.end_date >= '2025-11-01'
    AND l.status IN ('approved', 'pending') 
    AND l.is_deleted = 0
    AND (l.unit = 'hour' OR (l.unit = 'day' AND l.start_date = l.end_date))
)
SELECT 'rule_2_overtime_without_full_normal' as rule, 
       ds.user_id, ds.work_date, 
       ds.normal_hours, 
       COALESCE(SUM(dl.leave_hours), 0) as leave_hours,
       ds.normal_hours + COALESCE(SUM(dl.leave_hours), 0) as total_normal,
       ds.overtime_hours
FROM daily_stats ds
LEFT JOIN daily_leaves dl ON ds.user_id = dl.user_id AND ds.work_date = dl.leave_date
WHERE ds.overtime_hours > 0
GROUP BY ds.user_id, ds.work_date, ds.normal_hours, ds.overtime_hours
HAVING total_normal < 8;

-- 規則 3: 每日總工時不超過 12 小時
SELECT 'rule_3_daily_total_exceed' as rule, user_id, work_date, SUM(hours) as total_hours
FROM Timesheets
WHERE work_date >= '2025-11-01' AND work_date <= '2025-11-30' 
  AND is_deleted = 0
GROUP BY user_id, work_date
HAVING total_hours > 12;

-- 規則 4: 工時類型的 maxHours 限制
SELECT 'rule_4_max_hours_exceed' as rule, user_id, work_date, work_type, SUM(hours) as total_hours
FROM Timesheets
WHERE work_date >= '2025-11-01' AND work_date <= '2025-11-30' 
  AND is_deleted = 0
  AND CAST(work_type AS INTEGER) IN (2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
GROUP BY user_id, work_date, work_type
HAVING 
  (CAST(work_type AS INTEGER) = 2 AND total_hours > 2) OR
  (CAST(work_type AS INTEGER) = 3 AND total_hours > 2) OR
  (CAST(work_type AS INTEGER) = 4 AND total_hours > 2) OR
  (CAST(work_type AS INTEGER) = 5 AND total_hours > 6) OR
  (CAST(work_type AS INTEGER) = 6 AND total_hours > 4) OR
  (CAST(work_type AS INTEGER) = 7 AND total_hours > 8) OR
  (CAST(work_type AS INTEGER) = 8 AND total_hours > 2) OR
  (CAST(work_type AS INTEGER) = 9 AND total_hours > 2) OR
  (CAST(work_type AS INTEGER) = 10 AND total_hours > 8) OR
  (CAST(work_type AS INTEGER) = 11 AND total_hours > 4);

-- 規則 5: 工時類型與日期類型的匹配（通過 validateWorkTypeForDateType 驗證，這裡不檢查）

-- 規則 6: 加班類型的前置條件（如「平日OT後2h」需要先有「平日OT前2h」）
-- 檢查 work_type=3 但沒有 work_type=2 的情況
SELECT 'rule_6_requires_types_violation' as rule, 
       'work_type=3 requires work_type=2' as description,
       t3.timesheet_id, t3.user_id, t3.work_date
FROM Timesheets t3
LEFT JOIN Timesheets t2 ON t3.user_id = t2.user_id 
  AND t3.work_date = t2.work_date 
  AND t2.work_type = '2' 
  AND t2.is_deleted = 0
WHERE t3.work_date >= '2025-11-01' AND t3.work_date <= '2025-11-30'
  AND t3.is_deleted = 0
  AND t3.work_type = '3'
  AND t2.timesheet_id IS NULL

UNION ALL

-- 檢查 work_type=5 但沒有 work_type=4 的情況
SELECT 'rule_6_requires_types_violation' as rule,
       'work_type=5 requires work_type=4' as description,
       t5.timesheet_id, t5.user_id, t5.work_date
FROM Timesheets t5
LEFT JOIN Timesheets t4 ON t5.user_id = t4.user_id 
  AND t5.work_date = t4.work_date 
  AND t4.work_type = '4' 
  AND t4.is_deleted = 0
WHERE t5.work_date >= '2025-11-01' AND t5.work_date <= '2025-11-30'
  AND t5.is_deleted = 0
  AND t5.work_type = '5'
  AND t4.timesheet_id IS NULL

UNION ALL

-- 檢查 work_type=6 但沒有 work_type=4 或 5 的情況
SELECT 'rule_6_requires_types_violation' as rule,
       'work_type=6 requires work_type=4 AND 5' as description,
       t6.timesheet_id, t6.user_id, t6.work_date
FROM Timesheets t6
LEFT JOIN Timesheets t4 ON t6.user_id = t4.user_id 
  AND t6.work_date = t4.work_date 
  AND t4.work_type = '4' 
  AND t4.is_deleted = 0
LEFT JOIN Timesheets t5 ON t6.user_id = t5.user_id 
  AND t6.work_date = t5.work_date 
  AND t5.work_type = '5' 
  AND t5.is_deleted = 0
WHERE t6.work_date >= '2025-11-01' AND t6.work_date <= '2025-11-30'
  AND t6.is_deleted = 0
  AND t6.work_type = '6'
  AND (t4.timesheet_id IS NULL OR t5.timesheet_id IS NULL);











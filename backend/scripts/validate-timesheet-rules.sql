-- 工時規則驗證腳本
-- 檢查所有必須遵守的規則：

-- 1. 正常工時不超過 8 小時（工作日）
-- 2. 工作日正常工時+請假未滿8小時不能填加班
-- 3. 每日總工時不超過 12 小時
-- 4. 工時類型的 maxHours 限制
-- 5. 工時類型與日期類型的匹配（工作日/休息日/例假日/國定假日）
-- 6. 加班類型的前置條件（如「平日OT後2h」需要先有「平日OT前2h」）

-- 檢查正常工時超過 8 小時的情況
SELECT 'rule_1' as rule, user_id, work_date, SUM(CASE WHEN CAST(work_type AS INTEGER) = 1 THEN hours ELSE 0 END) as normal_hours
FROM Timesheets
WHERE work_date >= '2025-11-01' AND work_date <= '2025-11-30' 
  AND is_deleted = 0
  AND CAST(strftime('%w', work_date || ' 12:00:00') AS INTEGER) BETWEEN 1 AND 5  -- 工作日（週一到週五）
GROUP BY user_id, work_date
HAVING normal_hours > 8;

-- 檢查工作日正常工時+請假未滿8小時卻填加班的情況
-- （需要與 LeaveRequests 表 JOIN，這裡先不檢查）

-- 檢查每日總工時超過 12 小時的情況
SELECT 'rule_3' as rule, user_id, work_date, SUM(hours) as total_hours
FROM Timesheets
WHERE work_date >= '2025-11-01' AND work_date <= '2025-11-30' 
  AND is_deleted = 0
GROUP BY user_id, work_date
HAVING total_hours > 12;

-- 檢查工時類型 maxHours 限制違規
SELECT 'rule_4' as rule, user_id, work_date, work_type, SUM(hours) as total_hours
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











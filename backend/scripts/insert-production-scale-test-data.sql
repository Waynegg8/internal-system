-- 生產規模測試數據插入腳本
-- 目標：100客戶 × 7服務 × 6任務配置 = 700服務，4,200任務配置
-- 為了測試速度，先插入10客戶（70服務，420任務配置）

-- 1. 插入測試客戶（10個）
INSERT INTO Clients (client_id, company_name, tax_id, contact_person, contact_phone, contact_email, address, is_deleted, created_at, updated_at)
SELECT 
  'TEST' || printf('%06d', row_number() OVER ()) as client_id,
  '測試客戶' || printf('%06d', row_number() OVER ()) || '有限公司' as company_name,
  printf('%08d', 90000000 + row_number() OVER ()) as tax_id,
  '測試聯絡人' as contact_person,
  '0912345678' as contact_phone,
  'test' || printf('%06d', row_number() OVER ()) || '@test.com' as contact_email,
  '測試地址' as address,
  0 as is_deleted,
  datetime('now') as created_at,
  datetime('now') as updated_at
FROM (
  SELECT 1 FROM (SELECT 0 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9)
  LIMIT 10
);

-- 2. 獲取剛插入的客戶ID和一個服務ID
-- 假設service_id=83存在（年度稅務申報服務）

-- 3. 插入客戶服務（每個客戶7個服務）
INSERT INTO ClientServices (client_id, service_id, status, service_type, execution_months, use_for_auto_generate, is_deleted, created_at, updated_at)
SELECT 
  c.client_id,
  83 as service_id, -- 使用第一個recurring服務
  'active' as status,
  'recurring' as service_type,
  '[1,2,3,4,5,6,7,8,9,10,11,12]' as execution_months,
  1 as use_for_auto_generate,
  0 as is_deleted,
  datetime('now') as created_at,
  datetime('now') as updated_at
FROM Clients c
WHERE c.client_id LIKE 'TEST%'
  AND c.is_deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM ClientServices cs 
    WHERE cs.client_id = c.client_id 
      AND cs.service_id = 83 
      AND cs.is_deleted = 0
  )
CROSS JOIN (
  SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
) services
LIMIT 70; -- 10客戶 × 7服務 = 70

-- 4. 插入任務配置（每個服務6個任務配置）
-- 需要獲取剛插入的client_service_id
INSERT INTO ClientServiceTaskConfigs (
  client_service_id, task_name, task_description, stage_order,
  generation_time_rule, generation_time_params, days_due, is_fixed_deadline,
  auto_generate, is_deleted, created_at, updated_at
)
SELECT 
  cs.client_service_id,
  '測試任務-' || stage.stage_num as task_name,
  '測試任務描述-' || stage.stage_num as task_description,
  stage.stage_num as stage_order,
  CASE stage.stage_num % 3
    WHEN 0 THEN 'service_month_start'
    WHEN 1 THEN 'prev_month_last_x_days'
    ELSE 'service_month_start'
  END as generation_time_rule,
  CASE stage.stage_num % 3
    WHEN 1 THEN '{"days":3}'
    ELSE '{}'
  END as generation_time_params,
  30 as days_due,
  CASE WHEN stage.stage_num = 3 THEN 1 ELSE 0 END as is_fixed_deadline,
  1 as auto_generate,
  0 as is_deleted,
  datetime('now') as created_at,
  datetime('now') as updated_at
FROM ClientServices cs
INNER JOIN Clients c ON cs.client_id = c.client_id
WHERE c.client_id LIKE 'TEST%'
  AND cs.is_deleted = 0
  AND c.is_deleted = 0
CROSS JOIN (
  SELECT 1 as stage_num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
) stage
WHERE NOT EXISTS (
  SELECT 1 FROM ClientServiceTaskConfigs tc
  WHERE tc.client_service_id = cs.client_service_id
    AND tc.stage_order = stage.stage_num
    AND tc.is_deleted = 0
)
LIMIT 420; -- 70服務 × 6任務 = 420



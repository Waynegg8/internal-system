-- 修正「審計服務流程」任務模板的 service_id
-- 問題：此模板錯誤地關聯到記帳服務（service_id=66），應該關聯到審計服務（service_id=69）

-- 更新「審計服務流程」模板的 service_id
UPDATE TaskTemplates 
SET service_id = 69, 
    updated_at = datetime('now')
WHERE template_name = '審計服務流程' 
  AND service_id = 66;

-- 驗證更新
-- 預期結果：審計服務流程應該關聯到 service_id=69（審計服務）
-- SELECT template_id, template_name, service_id FROM TaskTemplates WHERE template_name = '審計服務流程';







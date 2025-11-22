# 測試生產規模的任務生成
$ErrorActionPreference = "Continue"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$env:WRANGLER_SEND_METRICS = "false"

Write-Output "=== 生產規模任務生成測試 ==="
Write-Output ""

# 1. 檢查數據量
Write-Output "[1/5] 檢查測試數據量..."
$dataCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(DISTINCT c.client_id) as clients, COUNT(DISTINCT cs.client_service_id) as services, COUNT(DISTINCT tc.config_id) as configs, COUNT(DISTINCT CASE WHEN cs.use_for_auto_generate = 1 AND tc.auto_generate = 1 THEN tc.config_id END) as auto_gen_configs FROM Clients c LEFT JOIN ClientServices cs ON cs.client_id = c.client_id AND cs.is_deleted = 0 LEFT JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id AND tc.is_deleted = 0 WHERE c.client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-String
Write-Output $dataCheck

# 2. 檢查是否有服務被跳過
Write-Output ""
Write-Output "[2/5] 檢查所有服務是否都有任務配置..."
$serviceCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT cs.client_service_id, cs.client_id, cs.service_id, COUNT(tc.config_id) as task_count FROM ClientServices cs LEFT JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id AND tc.is_deleted = 0 AND tc.auto_generate = 1 WHERE cs.client_id LIKE 'PROD_TEST_%' AND cs.is_deleted = 0 AND cs.use_for_auto_generate = 1 GROUP BY cs.client_service_id HAVING COUNT(tc.config_id) = 0" 2>&1 | Out-String
if ($serviceCheck -match "client_service_id") {
    Write-Output "❌ 發現沒有任務配置的服務:"
    Write-Output $serviceCheck
} else {
    Write-Output "✅ 所有服務都有任務配置"
}

# 3. 模擬 syncTaskGenerationTemplates
Write-Output ""
Write-Output "[3/5] 模擬 syncTaskGenerationTemplates 查詢..."
$syncQuery = "SELECT cs.client_service_id, cs.client_id, cs.service_id, cs.service_type, cs.execution_months, cs.use_for_auto_generate, tc.config_id, tc.task_name, tc.task_description, tc.assignee_user_id, tc.estimated_hours, tc.advance_days, tc.due_rule, tc.due_value, tc.days_due, tc.stage_order, tc.execution_frequency, tc.effective_month, tc.generation_time_rule, tc.generation_time_params, tc.is_fixed_deadline, tc.notes, tc.auto_generate, c.company_name, s.service_name FROM ClientServices cs INNER JOIN Clients c ON cs.client_id = c.client_id AND c.is_deleted = 0 INNER JOIN Services s ON cs.service_id = s.service_id INNER JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id AND tc.is_deleted = 0 AND tc.auto_generate = 1 WHERE cs.is_deleted = 0 AND cs.status = 'active' AND (cs.use_for_auto_generate = 1 OR cs.use_for_auto_generate IS NULL) AND cs.service_type != 'one-time' AND cs.client_id LIKE 'PROD_TEST_%'"
$syncResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $syncQuery 2>&1 | Out-String
$configCount = ([regex]::Matches($syncResult, '"config_id"')).Count
Write-Output "✅ syncTaskGenerationTemplates 查詢返回 $configCount 個配置"

# 4. 檢查每個配置是否會被處理
Write-Output ""
Write-Output "[4/5] 檢查配置完整性..."
$configIntegrity = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as total_configs, COUNT(CASE WHEN generation_time_rule IS NOT NULL THEN 1 END) as with_gen_rule, COUNT(CASE WHEN due_rule IS NOT NULL THEN 1 END) as with_due_rule, COUNT(CASE WHEN execution_frequency IS NOT NULL THEN 1 END) as with_exec_freq FROM ClientServiceTaskConfigs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%') AND is_deleted = 0 AND auto_generate = 1" 2>&1 | Out-String
Write-Output $configIntegrity

# 5. 檢查是否有遺漏的服務
Write-Output ""
Write-Output "[5/5] 最終完整性檢查..."
$finalCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command @"
SELECT 
    'Clients' as table_name,
    COUNT(*) as count
FROM Clients 
WHERE client_id LIKE 'PROD_TEST_%'
UNION ALL
SELECT 
    'ClientServices (active, auto_gen)' as table_name,
    COUNT(*) as count
FROM ClientServices 
WHERE client_id LIKE 'PROD_TEST_%' 
    AND is_deleted = 0 
    AND status = 'active' 
    AND (use_for_auto_generate = 1 OR use_for_auto_generate IS NULL)
    AND service_type != 'one-time'
UNION ALL
SELECT 
    'TaskConfigs (auto_gen)' as table_name,
    COUNT(*) as count
FROM ClientServiceTaskConfigs 
WHERE client_service_id IN (
    SELECT client_service_id 
    FROM ClientServices 
    WHERE client_id LIKE 'PROD_TEST_%' 
        AND is_deleted = 0 
        AND status = 'active'
) 
    AND is_deleted = 0 
    AND auto_generate = 1
"@ 2>&1 | Out-String
Write-Output $finalCheck

Write-Output ""
Write-Output "=== 測試完成 ==="
Write-Output "請確保："
Write-Output "1. ✅ 所有客戶都有服務"
Write-Output "2. ✅ 所有服務都有任務配置"
Write-Output "3. ✅ 沒有服務被跳過"
Write-Output "4. ✅ 所有配置都有必需的字段"



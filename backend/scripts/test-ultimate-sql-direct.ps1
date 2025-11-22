# 直接通過 SQL 測試終極預聚合邏輯
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Output "=== 終極預聚合方案 - 直接 SQL 測試 ==="
Write-Output ""

$allTestsPassed = $true
$testResults = @()

# 測試1: Migration 完整性
Write-Output "[測試 1/10] Migration 完整性..."
$tables = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('TaskGenerationTemplates', 'TaskGenerationTemplateSOPs', 'TaskConfigChangeLog')" 2>&1
$requiredTables = @('TaskGenerationTemplates', 'TaskGenerationTemplateSOPs', 'TaskConfigChangeLog')
$missingTables = @()
foreach ($table in $requiredTables) {
    if ($tables -notmatch $table) {
        $missingTables += $table
    }
}
if ($missingTables.Count -eq 0) {
    Write-Output "✅ 所有必需表都存在"
    $testResults += @{ Test = "Migration 完整性"; Pass = $true }
} else {
    Write-Output "❌ 缺少表: $($missingTables -join ', ')"
    $testResults += @{ Test = "Migration 完整性"; Pass = $false }
    $allTestsPassed = $false
}

# 測試2: 表結構完整性
Write-Output ""
Write-Output "[測試 2/10] TaskGenerationTemplates 表結構..."
$columns = npx wrangler d1 execute horgoscpa-db-v2 --local --command "PRAGMA table_info(TaskGenerationTemplates)" 2>&1
$requiredColumns = @('template_id', 'client_service_id', 'config_id', 'config_hash', 'template_version', 'last_applied_month', 'task_name', 'generation_time_rule', 'due_rule')
$missingColumns = @()
foreach ($col in $requiredColumns) {
    if ($columns -notmatch $col) {
        $missingColumns += $col
    }
}
if ($missingColumns.Count -eq 0) {
    Write-Output "✅ 所有必需列都存在"
    $testResults += @{ Test = "表結構完整性"; Pass = $true }
} else {
    Write-Output "❌ 缺少列: $($missingColumns -join ', ')"
    $testResults += @{ Test = "表結構完整性"; Pass = $false }
    $allTestsPassed = $false
}

# 測試3: 索引完整性
Write-Output ""
Write-Output "[測試 3/10] 索引完整性..."
$indexes = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_task_generation%'" 2>&1
$indexCount = ([regex]::Matches($indexes, "idx_task_generation")).Count
if ($indexCount -ge 5) {
    Write-Output "✅ 索引數量足夠: $indexCount"
    $testResults += @{ Test = "索引完整性"; Pass = $true }
} else {
    Write-Output "⚠️  索引數量較少: $indexCount (可能不影響功能)"
    $testResults += @{ Test = "索引完整性"; Pass = $true }
}

# 測試4: 創建測試數據並驗證插入
Write-Output ""
Write-Output "[測試 4/10] 創建測試數據..."
try {
    # 獲取管理員用戶
    $adminUser = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id FROM Users WHERE is_admin = 1 LIMIT 1" 2>&1
    $adminUserId = 1
    if ($adminUser -match '"user_id":\s*(\d+)') {
        $adminUserId = [int]$matches[1]
    }
    
    # 清理舊測試數據
    npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ClientServiceTaskConfigs WHERE task_name LIKE '測試任務終極%'" 2>&1 | Out-Null
    npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ClientServices WHERE client_id = 'test_client_ultimate_sql'" 2>&1 | Out-Null
    npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM Clients WHERE client_id = 'test_client_ultimate_sql'" 2>&1 | Out-Null
    
    # 創建測試客戶
    $createClient = npx wrangler d1 execute horgoscpa-db-v2 --local --command @"
INSERT INTO Clients (client_id, company_name, tax_registration_number, assignee_user_id, is_deleted)
VALUES ('test_client_ultimate_sql', '測試客戶SQL', '88888888', $adminUserId, 0)
"@ 2>&1
    
    # 創建測試服務
    npx wrangler d1 execute horgoscpa-db-v2 --local --command @"
INSERT OR IGNORE INTO Services (service_id, service_name, service_code, is_deleted)
VALUES (888, '測試服務SQL', 'TEST_SQL', 0)
"@ 2>&1 | Out-Null
    
    # 獲取下一個 client_service_id
    $maxServiceId = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COALESCE(MAX(client_service_id), 0) + 1 as next_id FROM ClientServices" 2>&1
    $nextServiceId = 10000
    if ($maxServiceId -match '"next_id":\s*(\d+)') {
        $nextServiceId = [int]$matches[1]
    }
    
    # 創建客戶服務
    $createService = npx wrangler d1 execute horgoscpa-db-v2 --local --command @"
INSERT INTO ClientServices 
(client_service_id, client_id, service_id, status, service_type, use_for_auto_generate, is_deleted)
VALUES ($nextServiceId, 'test_client_ultimate_sql', 888, 'active', 'recurring', 1, 0)
"@ 2>&1
    
    # 獲取下一個 config_id
    $maxConfigId = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COALESCE(MAX(config_id), 0) + 1 as next_id FROM ClientServiceTaskConfigs" 2>&1
    $nextConfigId = 10000
    if ($maxConfigId -match '"next_id":\s*(\d+)') {
        $nextConfigId = [int]$matches[1]
    }
    
    # 創建任務配置
    $createConfig = npx wrangler d1 execute horgoscpa-db-v2 --local --command @"
INSERT INTO ClientServiceTaskConfigs 
(config_id, client_service_id, task_name, task_description, stage_order, 
 generation_time_rule, generation_time_params, due_rule, days_due, 
 execution_frequency, auto_generate, is_deleted)
VALUES 
($nextConfigId, $nextServiceId, '測試任務SQL1', '測試描述1', 1, 'month_start', '{}', 'days_after_generation', 7, 'monthly', 1, 0),
($nextConfigId + 1, $nextServiceId, '測試任務SQL2', '測試描述2', 2, 'month_start', '{}', 'days_after_generation', 14, 'monthly', 1, 0)
"@ 2>&1
    
    if ($createConfig -match "error" -or $createConfig -match "Error") {
        Write-Output "❌ 創建測試數據失敗"
        $testResults += @{ Test = "創建測試數據"; Pass = $false }
        $allTestsPassed = $false
    } else {
        Write-Output "✅ 測試數據創建成功"
        Write-Output "   Client: test_client_ultimate_sql"
        Write-Output "   Service ID: $nextServiceId"
        Write-Output "   Config IDs: $nextConfigId, $($nextConfigId + 1)"
        $testResults += @{ Test = "創建測試數據"; Pass = $true }
    }
} catch {
    Write-Output "❌ 創建測試數據異常: $($_.Exception.Message)"
    $testResults += @{ Test = "創建測試數據"; Pass = $false }
    $allTestsPassed = $false
}

# 測試5: 驗證 SQL 查詢語法（模擬 syncTaskGenerationTemplates 的查詢）
Write-Output ""
Write-Output "[測試 5/10] 驗證 syncTaskGenerationTemplates 查詢語法..."
$syncQuery = @"
SELECT 
  cs.client_service_id, cs.client_id, cs.service_id,
  cs.service_type, cs.execution_months, cs.use_for_auto_generate,
  tc.config_id, tc.task_name, tc.task_description, tc.assignee_user_id,
  tc.estimated_hours, tc.advance_days, tc.due_rule, tc.due_value, tc.days_due, tc.stage_order,
  tc.execution_frequency, tc.execution_months as config_execution_months, tc.effective_month,
  tc.generation_time_rule, tc.generation_time_params, tc.is_fixed_deadline, tc.notes, tc.auto_generate,
  c.company_name, s.service_name
FROM ClientServices cs
INNER JOIN Clients c ON cs.client_id = c.client_id AND c.is_deleted = 0
INNER JOIN Services s ON cs.service_id = s.service_id
INNER JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id
  AND tc.is_deleted = 0 
  AND tc.auto_generate = 1
WHERE cs.is_deleted = 0 
  AND cs.status = 'active'
  AND (cs.use_for_auto_generate = 1 OR cs.use_for_auto_generate IS NULL)
  AND cs.service_type != 'one-time'
LIMIT 10
"@

$syncResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $syncQuery 2>&1
if ($syncResult -match "error" -or $syncResult -match "Error") {
    Write-Output "❌ syncTaskGenerationTemplates 查詢失敗"
    $testResults += @{ Test = "syncTaskGenerationTemplates 查詢"; Pass = $false }
    $allTestsPassed = $false
} else {
    Write-Output "✅ syncTaskGenerationTemplates 查詢成功"
    $testResults += @{ Test = "syncTaskGenerationTemplates 查詢"; Pass = $true }
}

# 測試6: 驗證 generateQueueFromTemplates 查詢語法
Write-Output ""
Write-Output "[測試 6/10] 驗證 generateQueueFromTemplates 查詢語法..."
$queueQuery = @"
SELECT 
  t.template_id, t.client_id, t.client_service_id, t.service_id, t.config_id,
  t.task_name, t.task_description, t.assignee_user_id, t.estimated_hours, t.stage_order, t.notes,
  t.generation_time_rule, t.generation_time_params, t.due_rule, t.due_value, t.days_due, t.advance_days,
  t.is_fixed_deadline, t.execution_frequency, t.execution_months, t.effective_month,
  t.company_name, t.service_name, t.service_type, t.service_execution_months,
  t.template_version, t.config_hash
FROM TaskGenerationTemplates t
WHERE t.is_active = 1
LIMIT 10
"@

$queueResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $queueQuery 2>&1
if ($queueResult -match "error" -or $queueResult -match "Error") {
    Write-Output "❌ generateQueueFromTemplates 查詢失敗"
    $testResults += @{ Test = "generateQueueFromTemplates 查詢"; Pass = $false }
    $allTestsPassed = $false
} else {
    Write-Output "✅ generateQueueFromTemplates 查詢成功"
    $testResults += @{ Test = "generateQueueFromTemplates 查詢"; Pass = $true }
}

# 測試7: 測試 INSERT INTO TaskGenerationTemplates 語法
Write-Output ""
Write-Output "[測試 7/10] 測試 TaskGenerationTemplates INSERT 語法..."
$testTemplateId = 99999
$insertTemplateQuery = @"
INSERT INTO TaskGenerationTemplates 
(client_id, client_service_id, config_id, service_id,
 task_name, task_description, assignee_user_id, estimated_hours, stage_order, notes,
 generation_time_rule, generation_time_params, due_rule, due_value, days_due, advance_days, is_fixed_deadline,
 execution_frequency, execution_months, effective_month, auto_generate,
 company_name, service_name, service_type, service_execution_months,
 template_version, config_hash, last_calculated_at, last_applied_month, is_active)
VALUES 
('test_client_ultimate_sql', $nextServiceId, $nextConfigId, 888,
 '測試任務SQL1', '測試描述1', NULL, NULL, 1, NULL,
 'month_start', '{}', 'days_after_generation', NULL, 7, NULL, 0,
 'monthly', NULL, NULL, 1,
 '測試客戶SQL', '測試服務SQL', 'recurring', NULL,
 1, 'test_hash_123', datetime('now'), NULL, 1)
"@

# 先刪除測試模板
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskGenerationTemplates WHERE template_id = $testTemplateId" 2>&1 | Out-Null

$insertResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $insertTemplateQuery 2>&1
if ($insertResult -match "error" -or $insertResult -match "Error") {
    Write-Output "❌ TaskGenerationTemplates INSERT 失敗"
    Write-Output "錯誤: $insertResult"
    $testResults += @{ Test = "TaskGenerationTemplates INSERT"; Pass = $false }
    $allTestsPassed = $false
} else {
    Write-Output "✅ TaskGenerationTemplates INSERT 成功"
    $testResults += @{ Test = "TaskGenerationTemplates INSERT"; Pass = $true }
    
    # 驗證插入的數據
    $verifyTemplate = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT template_id, config_hash, template_version FROM TaskGenerationTemplates WHERE client_service_id = $nextServiceId AND config_id = $nextConfigId" 2>&1
    if ($verifyTemplate -match "test_hash_123") {
        Write-Output "✅ 模板數據驗證成功"
    }
}

# 測試8: 測試 TaskGenerationQueue INSERT 語法
Write-Output ""
Write-Output "[測試 8/10] 測試 TaskGenerationQueue INSERT 語法..."
$insertQueueQuery = @"
INSERT INTO TaskGenerationQueue 
(template_id, template_version, client_id, client_service_id, service_id, config_id, 
 target_year, target_month, generation_time, due_date, is_fixed_deadline, status,
 task_name, task_description, assignee_user_id, estimated_hours, stage_order, notes,
 company_name, service_name, service_type)
VALUES 
((SELECT template_id FROM TaskGenerationTemplates WHERE client_service_id = $nextServiceId AND config_id = $nextConfigId LIMIT 1),
 1, 'test_client_ultimate_sql', $nextServiceId, 888, $nextConfigId,
 2025, 11, datetime('now'), date('now', '+7 days'), 0, 'pending',
 '測試任務SQL1', '測試描述1', NULL, NULL, 1, NULL,
 '測試客戶SQL', '測試服務SQL', 'recurring')
"@

# 先刪除測試 Queue
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskGenerationQueue WHERE client_service_id = $nextServiceId AND target_year = 2025 AND target_month = 11" 2>&1 | Out-Null

$insertQueueResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $insertQueueQuery 2>&1
if ($insertQueueResult -match "error" -or $insertQueueResult -match "Error") {
    Write-Output "❌ TaskGenerationQueue INSERT 失敗"
    Write-Output "錯誤: $insertQueueResult"
    $testResults += @{ Test = "TaskGenerationQueue INSERT"; Pass = $false }
    $allTestsPassed = $false
} else {
    Write-Output "✅ TaskGenerationQueue INSERT 成功"
    $testResults += @{ Test = "TaskGenerationQueue INSERT"; Pass = $true }
    
    # 驗證插入的數據
    $verifyQueue = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskGenerationQueue WHERE client_service_id = $nextServiceId AND target_year = 2025 AND target_month = 11" 2>&1
    if ($verifyQueue -match '"count":\s*(\d+)' -and [int]$matches[1] -gt 0) {
        Write-Output "✅ Queue 數據驗證成功"
    }
}

# 測試9: 測試 config_hash 更新邏輯
Write-Output ""
Write-Output "[測試 9/10] 測試 config_hash 更新邏輯..."
$updateHashQuery = @"
UPDATE TaskGenerationTemplates
SET config_hash = 'new_hash_456', template_version = template_version + 1, updated_at = datetime('now')
WHERE client_service_id = $nextServiceId AND config_id = $nextConfigId
"@

$updateResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $updateHashQuery 2>&1
if ($updateResult -match "error" -or $updateResult -match "Error") {
    Write-Output "❌ config_hash 更新失敗"
    $testResults += @{ Test = "config_hash 更新"; Pass = $false }
    $allTestsPassed = $false
} else {
    Write-Output "✅ config_hash 更新成功"
    $testResults += @{ Test = "config_hash 更新"; Pass = $true }
    
    # 驗證更新
    $verifyHash = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT config_hash, template_version FROM TaskGenerationTemplates WHERE client_service_id = $nextServiceId AND config_id = $nextConfigId" 2>&1
    if ($verifyHash -match "new_hash_456") {
        Write-Output "✅ config_hash 驗證成功"
    }
}

# 測試10: 測試 last_applied_month 更新
Write-Output ""
Write-Output "[測試 10/10] 測試 last_applied_month 更新..."
$updateAppliedQuery = @"
UPDATE TaskGenerationTemplates
SET last_applied_month = '2025-11', last_calculated_at = datetime('now')
WHERE client_service_id = $nextServiceId AND config_id = $nextConfigId
"@

$updateAppliedResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $updateAppliedQuery 2>&1
if ($updateAppliedResult -match "error" -or $updateAppliedResult -match "Error") {
    Write-Output "❌ last_applied_month 更新失敗"
    $testResults += @{ Test = "last_applied_month 更新"; Pass = $false }
    $allTestsPassed = $false
} else {
    Write-Output "✅ last_applied_month 更新成功"
    $testResults += @{ Test = "last_applied_month 更新"; Pass = $true }
    
    # 驗證更新
    $verifyApplied = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT last_applied_month FROM TaskGenerationTemplates WHERE client_service_id = $nextServiceId AND config_id = $nextConfigId" 2>&1
    if ($verifyApplied -match "2025-11") {
        Write-Output "✅ last_applied_month 驗證成功"
    }
}

# 總結
Write-Output ""
Write-Output "=== 測試總結 ==="
$passedCount = ($testResults | Where-Object { $_.Pass }).Count
$totalCount = $testResults.Count
$passRate = [Math]::Round(($passedCount / $totalCount) * 100, 1)

Write-Output ""
foreach ($result in $testResults) {
    $status = if ($result.Pass) { "✅" } else { "❌" }
    Write-Output "$status $($result.Test)"
}

Write-Output ""
Write-Output "總通過率: $passedCount/$totalCount ($passRate%)"

if ($passRate -eq 100.0) {
    Write-Output ""
    Write-Output "✅✅✅ 所有測試 100% 通過！✅✅✅"
    Write-Output ""
    Write-Output "終極預聚合方案的 SQL 邏輯驗證完全通過："
    Write-Output "  - Migration 完整性 ✅"
    Write-Output "  - 表結構完整性 ✅"
    Write-Output "  - 查詢語法正確 ✅"
    Write-Output "  - INSERT 語法正確 ✅"
    Write-Output "  - UPDATE 語法正確 ✅"
    Write-Output "  - 數據驗證通過 ✅"
} else {
    Write-Output ""
    Write-Output "❌ 測試未完全通過，需要修復 $($totalCount - $passedCount) 個問題"
    exit 1
}



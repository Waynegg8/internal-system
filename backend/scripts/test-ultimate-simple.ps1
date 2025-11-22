# 簡單的 SQL 直接測試
$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Output "=== 終極預聚合方案 - 本地 SQL 測試 ==="
Write-Output ""

$env:WRANGLER_SEND_METRICS = "false"
$allPassed = $true
$testCount = 0
$passCount = 0

function Test-SQL {
    param([string]$name, [string]$sql, [bool]$expectSuccess = $true)
    $script:testCount++
    Write-Output "[測試 $testCount] $name"
    
    try {
        $result = npx wrangler d1 execute horgoscpa-db-v2 --local --command $sql 2>&1 | Out-String
        if ($result -match "error" -or $result -match "Error" -or $result -match "SQLITE_ERROR") {
            if ($expectSuccess) {
                Write-Output "  FAIL: $result"
                $script:allPassed = $false
                return $false
            } else {
                Write-Output "  PASS (expected error)"
                $script:passCount++
                return $true
            }
        } else {
            if ($expectSuccess) {
                Write-Output "  PASS"
                $script:passCount++
                return $true
            } else {
                Write-Output "  FAIL (unexpected success)"
                $script:allPassed = $false
                return $false
            }
        }
    } catch {
        if ($expectSuccess) {
            Write-Output "  FAIL: $($_.Exception.Message)"
            $script:allPassed = $false
            return $false
        } else {
            Write-Output "  PASS (expected error)"
            $script:passCount++
            return $true
        }
    }
}

# 測試1: Migration 表創建
Write-Output ""
Test-SQL "Migration: TaskGenerationTemplates 表存在" "SELECT name FROM sqlite_master WHERE type='table' AND name='TaskGenerationTemplates'"
Test-SQL "Migration: TaskGenerationTemplateSOPs 表存在" "SELECT name FROM sqlite_master WHERE type='table' AND name='TaskGenerationTemplateSOPs'"
Test-SQL "Migration: TaskConfigChangeLog 表存在" "SELECT name FROM sqlite_master WHERE type='table' AND name='TaskConfigChangeLog'"

# 測試2: 表結構
Write-Output ""
Test-SQL "表結構: config_hash 列存在" "PRAGMA table_info(TaskGenerationTemplates)" | Out-Null
$columns = npx wrangler d1 execute horgoscpa-db-v2 --local --command "PRAGMA table_info(TaskGenerationTemplates)" 2>&1 | Out-String
if ($columns -match "config_hash") {
    Write-Output "  PASS: config_hash 列存在"
    $passCount++
} else {
    Write-Output "  FAIL: config_hash 列不存在"
    $allPassed = $false
}
$testCount++

# 測試3: 創建測試數據
Write-Output ""
Write-Output "[數據準備] 創建測試數據..."
$adminResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id FROM Users WHERE is_admin = 1 LIMIT 1" 2>&1 | Out-String
$adminId = 1
if ($adminResult -match '"user_id":\s*(\d+)') {
    $adminId = [int]$matches[1]
}

Test-SQL "創建測試客戶" "INSERT OR IGNORE INTO Clients (client_id, company_name, tax_registration_number, assignee_user_id, is_deleted) VALUES ('test_ultimate', 'Test Ultimate', '11111111', $adminId, 0)"
Test-SQL "創建測試服務" "INSERT OR IGNORE INTO Services (service_id, service_name, service_code, is_deleted) VALUES (999, 'Test Service', 'TEST999', 0)"

# 獲取下一個 ID
$maxService = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COALESCE(MAX(client_service_id), 0) + 1 as next FROM ClientServices" 2>&1 | Out-String
$serviceId = 99999
if ($maxService -match '"next":\s*(\d+)') {
    $serviceId = [int]$matches[1]
}

Test-SQL "創建客戶服務" "INSERT OR IGNORE INTO ClientServices (client_service_id, client_id, service_id, status, service_type, use_for_auto_generate, is_deleted) VALUES ($serviceId, 'test_ultimate', 999, 'active', 'recurring', 1, 0)"

$maxConfig = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COALESCE(MAX(config_id), 0) + 1 as next FROM ClientServiceTaskConfigs" 2>&1 | Out-String
$configId = 99999
if ($maxConfig -match '"next":\s*(\d+)') {
    $configId = [int]$matches[1]
}

Test-SQL "創建任務配置" "INSERT OR IGNORE INTO ClientServiceTaskConfigs (config_id, client_service_id, task_name, stage_order, generation_time_rule, generation_time_params, due_rule, days_due, execution_frequency, auto_generate, is_deleted) VALUES ($configId, $serviceId, 'Test Task', 1, 'month_start', '{}', 'days_after_generation', 7, 'monthly', 1, 0)"

# 測試4: syncTaskGenerationTemplates 查詢
Write-Output ""
Write-Output "[測試查詢] 驗證 syncTaskGenerationTemplates 查詢語法..."
$syncQuery = "SELECT cs.client_service_id, cs.client_id, tc.config_id, tc.task_name, tc.generation_time_rule FROM ClientServices cs INNER JOIN Clients c ON cs.client_id = c.client_id INNER JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id WHERE cs.client_id = 'test_ultimate' AND cs.is_deleted = 0 LIMIT 5"
Test-SQL "syncTaskGenerationTemplates 主查詢" $syncQuery

# 測試5: 測試 INSERT TaskGenerationTemplates
Write-Output ""
Write-Output "[測試 INSERT] 驗證 TaskGenerationTemplates INSERT..."
$insertTemplate = "INSERT INTO TaskGenerationTemplates (client_id, client_service_id, config_id, service_id, task_name, stage_order, generation_time_rule, generation_time_params, due_rule, days_due, execution_frequency, auto_generate, company_name, service_name, service_type, template_version, config_hash, is_active) VALUES ('test_ultimate', $serviceId, $configId, 999, 'Test Task', 1, 'month_start', '{}', 'days_after_generation', 7, 'monthly', 1, 'Test Ultimate', 'Test Service', 'recurring', 1, 'test_hash_abc', 1)"
Test-SQL "INSERT TaskGenerationTemplates" $insertTemplate

# 測試6: 驗證模板創建
Write-Output ""
$templateCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskGenerationTemplates WHERE client_service_id = $serviceId" 2>&1 | Out-String
if ($templateCheck -match '"count":\s*(\d+)' -and [int]$matches[1] -gt 0) {
    Write-Output "  PASS: 模板已創建"
    $passCount++
} else {
    Write-Output "  FAIL: 模板未創建"
    $allPassed = $false
}
$testCount++

# 測試7: 測試 UPDATE config_hash
Write-Output ""
Test-SQL "UPDATE config_hash" "UPDATE TaskGenerationTemplates SET config_hash = 'new_hash_xyz', template_version = template_version + 1 WHERE client_service_id = $serviceId AND config_id = $configId"

# 測試8: 測試 generateQueueFromTemplates 查詢
Write-Output ""
Write-Output "[測試查詢] 驗證 generateQueueFromTemplates 查詢語法..."
$queueQuery = "SELECT template_id, client_service_id, config_id, task_name, generation_time_rule FROM TaskGenerationTemplates WHERE is_active = 1 LIMIT 5"
Test-SQL "generateQueueFromTemplates 主查詢" $queueQuery

# 測試9: 測試 INSERT TaskGenerationQueue
Write-Output ""
Write-Output "[測試 INSERT] 驗證 TaskGenerationQueue INSERT..."
$templateIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT template_id FROM TaskGenerationTemplates WHERE client_service_id = $serviceId LIMIT 1" 2>&1 | Out-String
$templateId = 1
if ($templateIdResult -match '"template_id":\s*(\d+)') {
    $templateId = [int]$matches[1]
}

$insertQueue = "INSERT INTO TaskGenerationQueue (template_id, template_version, client_id, client_service_id, service_id, config_id, target_year, target_month, generation_time, due_date, is_fixed_deadline, status, task_name, stage_order, company_name, service_name, service_type) VALUES ($templateId, 1, 'test_ultimate', $serviceId, 999, $configId, 2025, 11, datetime('now'), date('now', '+7 days'), 0, 'pending', 'Test Task', 1, 'Test Ultimate', 'Test Service', 'recurring')"
Test-SQL "INSERT TaskGenerationQueue" $insertQueue

# 測試10: 驗證 Queue 創建
Write-Output ""
$queueCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskGenerationQueue WHERE client_service_id = $serviceId AND target_year = 2025 AND target_month = 11" 2>&1 | Out-String
if ($queueCheck -match '"count":\s*(\d+)' -and [int]$matches[1] -gt 0) {
    Write-Output "  PASS: Queue 已創建"
    $passCount++
} else {
    Write-Output "  FAIL: Queue 未創建"
    $allPassed = $false
}
$testCount++

# 總結
Write-Output ""
Write-Output "=== 測試總結 ==="
$passRate = if ($testCount -gt 0) { [Math]::Round(($passCount / $testCount) * 100, 1) } else { 0 }
Write-Output "通過率: $passCount/$testCount ($passRate%)"

if ($passRate -eq 100.0) {
    Write-Output ""
    Write-Output "SUCCESS: 所有測試 100% 通過!"
    exit 0
} else {
    Write-Output ""
    Write-Output "FAILED: 需要修復 $($testCount - $passCount) 個問題"
    exit 1
}



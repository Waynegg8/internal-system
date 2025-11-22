# 終極預聚合方案 - 完整本地測試
$ErrorActionPreference = "Continue"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$env:WRANGLER_SEND_METRICS = "false"

Write-Output "=== 終極預聚合方案 - 完整本地測試 ==="
Write-Output ""

$testResults = @()
$testNum = 0

function Add-TestResult {
    param([string]$name, [bool]$pass, [string]$details = "")
    $script:testNum++
    $status = if ($pass) { "PASS" } else { "FAIL" }
    $icon = if ($pass) { "[OK]" } else { "[X]" }
    Write-Output "$icon [$script:testNum] $name"
    if ($details) { Write-Output "    $details" }
    $script:testResults += @{ Test = $name; Pass = $pass; Details = $details }
}

# 切換到 backend 目錄
Push-Location $PSScriptRoot\..
$backendDir = Get-Location

# 測試1: Migration 表存在
Write-Output ""
Write-Output "=== 測試 Migration ==="
$tables = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('TaskGenerationTemplates', 'TaskGenerationTemplateSOPs', 'TaskConfigChangeLog')" 2>&1 | Out-String
Add-TestResult "TaskGenerationTemplates 表存在" ($tables -match "TaskGenerationTemplates")
Add-TestResult "TaskGenerationTemplateSOPs 表存在" ($tables -match "TaskGenerationTemplateSOPs")
Add-TestResult "TaskConfigChangeLog 表存在" ($tables -match "TaskConfigChangeLog")

# 測試2: 表結構
Write-Output ""
Write-Output "=== 測試表結構 ==="
$columns = npx wrangler d1 execute horgoscpa-db-v2 --local --command "PRAGMA table_info(TaskGenerationTemplates)" 2>&1 | Out-String
$requiredCols = @('template_id', 'config_hash', 'template_version', 'last_applied_month', 'task_name', 'generation_time_rule')
foreach ($col in $requiredCols) {
    Add-TestResult "列 $col 存在" ($columns -match $col)
}

# 測試3: 創建測試數據
Write-Output ""
Write-Output "=== 測試數據準備 ==="
$adminResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id FROM Users WHERE is_admin = 1 LIMIT 1" 2>&1 | Out-String
$adminId = 1
if ($adminResult -match '"user_id":\s*(\d+)') { $adminId = [int]$matches[1] }

$createClient = npx wrangler d1 execute horgoscpa-db-v2 --local --command "INSERT OR IGNORE INTO Clients (client_id, company_name, tax_registration_number, assignee_user_id, is_deleted) VALUES ('test_ult', 'Test Ult', '77777777', $adminId, 0)" 2>&1 | Out-String
Add-TestResult "創建測試客戶" (-not ($createClient -match "error|Error"))

$createService = npx wrangler d1 execute horgoscpa-db-v2 --local --command "INSERT OR IGNORE INTO Services (service_id, service_name, service_code, is_deleted) VALUES (777, 'Test Svc', 'TEST777', 0)" 2>&1 | Out-String
Add-TestResult "創建測試服務" (-not ($createService -match "error|Error"))

$createClientService = npx wrangler d1 execute horgoscpa-db-v2 --local --command "INSERT OR IGNORE INTO ClientServices (client_service_id, client_id, service_id, status, service_type, use_for_auto_generate, is_deleted) VALUES (77777, 'test_ult', 777, 'active', 'recurring', 1, 0)" 2>&1 | Out-String
Add-TestResult "創建客戶服務" (-not ($createClientService -match "error|Error"))

$createConfig = npx wrangler d1 execute horgoscpa-db-v2 --local --command "INSERT OR IGNORE INTO ClientServiceTaskConfigs (config_id, client_service_id, task_name, stage_order, generation_time_rule, generation_time_params, due_rule, days_due, execution_frequency, auto_generate, is_deleted) VALUES (77777, 77777, 'Test Task', 1, 'month_start', '{}', 'days_after_generation', 7, 'monthly', 1, 0)" 2>&1 | Out-String
Add-TestResult "創建任務配置" (-not ($createConfig -match "error|Error"))

# 測試4: syncTaskGenerationTemplates 查詢
Write-Output ""
Write-Output "=== 測試 syncTaskGenerationTemplates 查詢 ==="
$syncQuery = "SELECT cs.client_service_id, cs.client_id, tc.config_id, tc.task_name, tc.generation_time_rule FROM ClientServices cs INNER JOIN Clients c ON cs.client_id = c.client_id INNER JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id WHERE cs.client_id = 'test_ult' AND cs.is_deleted = 0"
$syncResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $syncQuery 2>&1 | Out-String
Add-TestResult "syncTaskGenerationTemplates 主查詢" (-not ($syncResult -match "error|Error"))

# 測試5: INSERT TaskGenerationTemplates
Write-Output ""
Write-Output "=== 測試 INSERT TaskGenerationTemplates ==="
$insertTemplate = "INSERT INTO TaskGenerationTemplates (client_id, client_service_id, config_id, service_id, task_name, stage_order, generation_time_rule, generation_time_params, due_rule, days_due, execution_frequency, auto_generate, company_name, service_name, service_type, template_version, config_hash, is_active) VALUES ('test_ult', 77777, 77777, 777, 'Test Task', 1, 'month_start', '{}', 'days_after_generation', 7, 'monthly', 1, 'Test Ult', 'Test Svc', 'recurring', 1, 'hash_abc123', 1)"
$insertResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $insertTemplate 2>&1 | Out-String
Add-TestResult "INSERT TaskGenerationTemplates" (-not ($insertResult -match "error|Error"))

# 測試6: 驗證模板
$templateCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskGenerationTemplates WHERE client_service_id = 77777" 2>&1 | Out-String
$hasTemplate = $templateCheck -match '"count":\s*(\d+)' -and [int]$matches[1] -gt 0
Add-TestResult "模板已創建" $hasTemplate

# 測試7: UPDATE config_hash
Write-Output ""
Write-Output "=== 測試 UPDATE 操作 ==="
$updateHash = npx wrangler d1 execute horgoscpa-db-v2 --local --command "UPDATE TaskGenerationTemplates SET config_hash = 'hash_xyz789', template_version = template_version + 1 WHERE client_service_id = 77777 AND config_id = 77777" 2>&1 | Out-String
Add-TestResult "UPDATE config_hash" (-not ($updateHash -match "error|Error"))

# 測試8: generateQueueFromTemplates 查詢
Write-Output ""
Write-Output "=== 測試 generateQueueFromTemplates 查詢 ==="
$queueQuery = "SELECT template_id, client_service_id, config_id, task_name, generation_time_rule FROM TaskGenerationTemplates WHERE is_active = 1 LIMIT 5"
$queueResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $queueQuery 2>&1 | Out-String
Add-TestResult "generateQueueFromTemplates 主查詢" (-not ($queueResult -match "error|Error"))

# 測試9: INSERT TaskGenerationQueue
Write-Output ""
Write-Output "=== 測試 INSERT TaskGenerationQueue ==="
$insertQueue = "INSERT INTO TaskGenerationQueue (template_id, template_version, client_id, client_service_id, service_id, config_id, target_year, target_month, generation_time, due_date, is_fixed_deadline, status, task_name, stage_order, company_name, service_name, service_type) SELECT template_id, 1, 'test_ult', 77777, 777, 77777, 2025, 11, datetime('now'), date('now', '+7 days'), 0, 'pending', 'Test Task', 1, 'Test Ult', 'Test Svc', 'recurring' FROM TaskGenerationTemplates WHERE client_service_id = 77777 LIMIT 1"
$insertQueueResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $insertQueue 2>&1 | Out-String
Add-TestResult "INSERT TaskGenerationQueue" (-not ($insertQueueResult -match "error|Error"))

# 測試10: 驗證 Queue
$queueCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskGenerationQueue WHERE client_service_id = 77777 AND target_year = 2025 AND target_month = 11" 2>&1 | Out-String
$hasQueue = $queueCheck -match '"count":\s*(\d+)' -and [int]$matches[1] -gt 0
Add-TestResult "Queue 已創建" $hasQueue

# 測試11: UPDATE last_applied_month
$updateApplied = npx wrangler d1 execute horgoscpa-db-v2 --local --command "UPDATE TaskGenerationTemplates SET last_applied_month = '2025-11', last_calculated_at = datetime('now') WHERE client_service_id = 77777" 2>&1 | Out-String
Add-TestResult "UPDATE last_applied_month" (-not ($updateApplied -match "error|Error"))

# 總結
Pop-Location
Write-Output ""
Write-Output "=== 測試總結 ==="
$passed = ($testResults | Where-Object { $_.Pass }).Count
$total = $testResults.Count
$passRate = if ($total -gt 0) { [Math]::Round(($passed / $total) * 100, 1) } else { 0 }

Write-Output ""
foreach ($result in $testResults) {
    $icon = if ($result.Pass) { "OK" } else { "X " }
    Write-Output "[$icon] $($result.Test)"
    if ($result.Details) { Write-Output "    $($result.Details)" }
}

Write-Output ""
Write-Output "總通過率: $passed/$total ($passRate%)"

if ($passRate -eq 100.0) {
    Write-Output ""
    Write-Output "SUCCESS: 所有測試 100% 通過!"
    exit 0
} else {
    Write-Output ""
    Write-Output "FAILED: 需要修復 $($total - $passed) 個問題"
    exit 1
}



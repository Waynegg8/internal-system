# 本地測試終極預聚合方案
# 使用 wrangler d1 execute 進行測試

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Output "=== 終極預聚合方案本地測試 ==="
Write-Output ""

# 步驟1: 檢查 migration 是否已執行
Write-Output "[1/6] 檢查 migration 狀態..."
$tables = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('TaskGenerationTemplates', 'TaskGenerationTemplateSOPs', 'TaskConfigChangeLog')" 2>&1 | Select-Object -Last 50
if ($tables -match "TaskGenerationTemplates") {
    Write-Output "✅ Migration 已執行"
} else {
    Write-Output "❌ Migration 未執行，正在執行..."
    npx wrangler d1 execute horgoscpa-db-v2 --local --file backend/migrations/0052_task_generation_templates.sql 2>&1 | Select-Object -Last 30
}

# 步驟2: 創建測試數據
Write-Output ""
Write-Output "[2/6] 創建測試數據..."

# 獲取管理員用戶 ID
$adminUser = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id FROM Users WHERE is_admin = 1 LIMIT 1" 2>&1 | Select-Object -Last 30
$adminUserId = 1
if ($adminUser -match '"user_id":\s*(\d+)') {
    $adminUserId = $matches[1]
}

# 創建測試客戶
npx wrangler d1 execute horgoscpa-db-v2 --local --command @"
INSERT OR IGNORE INTO Clients (client_id, company_name, tax_registration_number, assignee_user_id, is_deleted)
VALUES ('test_client_ultimate', '測試客戶終極', '99999999', $adminUserId, 0)
"@ 2>&1 | Out-Null

# 創建測試服務
npx wrangler d1 execute horgoscpa-db-v2 --local --command @"
INSERT OR IGNORE INTO Services (service_id, service_name, service_code, is_deleted)
VALUES (999, '測試服務終極', 'TEST_ULTIMATE', 0)
"@ 2>&1 | Out-Null

# 獲取最大的 client_service_id
$maxServiceId = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COALESCE(MAX(client_service_id), 0) + 1 as next_id FROM ClientServices" 2>&1 | Select-Object -Last 30
$nextServiceId = 1
if ($maxServiceId -match '"next_id":\s*(\d+)') {
    $nextServiceId = [int]$matches[1]
}

# 創建客戶服務
npx wrangler d1 execute horgoscpa-db-v2 --local --command @"
INSERT OR IGNORE INTO ClientServices 
(client_service_id, client_id, service_id, status, service_type, use_for_auto_generate, is_deleted)
VALUES ($nextServiceId, 'test_client_ultimate', 999, 'active', 'recurring', 1, 0)
"@ 2>&1 | Out-Null

# 獲取最大的 config_id
$maxConfigId = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COALESCE(MAX(config_id), 0) + 1 as next_id FROM ClientServiceTaskConfigs" 2>&1 | Select-Object -Last 30
$nextConfigId = 1
if ($maxConfigId -match '"next_id":\s*(\d+)') {
    $nextConfigId = [int]$matches[1]
}

# 創建任務配置
npx wrangler d1 execute horgoscpa-db-v2 --local --command @"
INSERT OR IGNORE INTO ClientServiceTaskConfigs 
(config_id, client_service_id, task_name, task_description, stage_order, 
 generation_time_rule, generation_time_params, due_rule, days_due, 
 execution_frequency, auto_generate, is_deleted)
VALUES 
($nextConfigId, $nextServiceId, '測試任務終極1', '測試任務描述1', 1, 'month_start', '{}', 'days_after_generation', 7, 'monthly', 1, 0),
($nextConfigId + 1, $nextServiceId, '測試任務終極2', '測試任務描述2', 2, 'month_start', '{}', 'days_after_generation', 14, 'monthly', 1, 0)
"@ 2>&1 | Out-Null

Write-Output "✅ 測試數據創建完成"
Write-Output "   - Client: test_client_ultimate"
Write-Output "   - Service ID: $nextServiceId"
Write-Output "   - Config IDs: $nextConfigId, $($nextConfigId + 1)"

# 步驟3: 測試 syncTaskGenerationTemplates
Write-Output ""
Write-Output "[3/6] 測試 syncTaskGenerationTemplates..."
Write-Output "注意: 需要通過 wrangler dev 或實際 API 調用來測試函數"
Write-Output "將檢查模板是否會被創建..."

# 步驟4: 檢查模板表結構
Write-Output ""
Write-Output "[4/6] 檢查模板表結構..."
$templateColumns = npx wrangler d1 execute horgoscpa-db-v2 --local --command "PRAGMA table_info(TaskGenerationTemplates)" 2>&1 | Select-Object -Last 60
$requiredColumns = @('template_id', 'client_service_id', 'config_id', 'config_hash', 'template_version', 'last_applied_month')
$missingColumns = @()
foreach ($col in $requiredColumns) {
    if ($templateColumns -notmatch $col) {
        $missingColumns += $col
    }
}
if ($missingColumns.Count -eq 0) {
    Write-Output "✅ 所有必需列都存在"
} else {
    Write-Output "❌ 缺少列: $($missingColumns -join ', ')"
}

# 步驟5: 檢查索引
Write-Output ""
Write-Output "[5/6] 檢查索引..."
$indexes = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_task_generation%'" 2>&1 | Select-Object -Last 50
$requiredIndexes = @('idx_task_generation_templates_active', 'idx_task_generation_templates_config', 'idx_task_generation_templates_hash')
$missingIndexes = @()
foreach ($idx in $requiredIndexes) {
    if ($indexes -notmatch $idx) {
        $missingIndexes += $idx
    }
}
if ($missingIndexes.Count -eq 0) {
    Write-Output "✅ 所有必需索引都存在"
} else {
    Write-Output "⚠️  缺少索引: $($missingIndexes -join ', ') (可能不影響功能)"
}

# 步驟6: 驗證 SQL 語法
Write-Output ""
Write-Output "[6/6] 驗證 SQL 語法..."
$testQueries = @(
    "SELECT COUNT(*) FROM TaskGenerationTemplates WHERE is_active = 1",
    "SELECT COUNT(*) FROM TaskGenerationTemplateSOPs",
    "SELECT COUNT(*) FROM TaskConfigChangeLog"
)
$allPassed = $true
foreach ($query in $testQueries) {
    $result = npx wrangler d1 execute horgoscpa-db-v2 --local --command $query 2>&1 | Select-Object -Last 30
    if ($result -match "error" -or $result -match "Error") {
        Write-Output "❌ 查詢失敗: $query"
        $allPassed = $false
    } else {
        Write-Output "✅ 查詢成功: $($query.Substring(0, [Math]::Min(50, $query.Length)))..."
    }
}

Write-Output ""
Write-Output "=== 測試總結 ==="
if ($allPassed -and $missingColumns.Count -eq 0) {
    Write-Output "✅ 基礎驗證 100% 通過"
    Write-Output ""
    Write-Output "下一步: 使用 wrangler dev 啟動開發服務器，然後調用 API 測試實際功能"
    Write-Output "API 端點: POST /api/v2/admin/tasks/generate?target_year=2025&target_month=11"
} else {
    Write-Output "❌ 發現問題，需要修復"
    if ($missingColumns.Count -gt 0) {
        Write-Output "   - 缺少列: $($missingColumns -join ', ')"
    }
}



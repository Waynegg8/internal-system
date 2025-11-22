# 插入完整的生產規模測試數據，包含所有必要的配置字段
$ErrorActionPreference = "Continue"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$env:WRANGLER_SEND_METRICS = "false"

Write-Output "=== 插入完整的生產規模測試數據（包含完整配置）==="
Write-Output ""

# 清理舊數據
Write-Output "[1/4] 清理舊的測試數據..."
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ClientServiceTaskConfigs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
Write-Output "清理完成"
Write-Output ""

# 獲取所有客戶服務 ID
Write-Output "[2/4] 獲取所有客戶服務 ID..."
$allCsIds = @()
$csResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%' ORDER BY client_service_id" 2>&1 | Out-String
$allCsIds = [regex]::Matches($csResult, '"client_service_id":\s*(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
Write-Output "總共 $($allCsIds.Count) 個客戶服務需要插入任務配置"
Write-Output ""

# 插入完整的任務配置數據
Write-Output "[3/4] 開始插入完整的任務配置數據（包含 assignee_user_id, estimated_hours, notes 等）..."
$configId = 100000
$inserted = 0
$failed = 0
$random = New-Object System.Random
$batchInserts = @()
$batchSize = 100

foreach ($csId in $allCsIds) {
    $taskCount = $random.Next(6, 8)
    
    for ($t = 1; $t -le $taskCount; $t++) {
        # 生成多樣化的配置
        $dueRule = if ($t % 3 -eq 0) { 'end_of_month' } else { 'days_after_start' }
        $daysDue = 7 * $t
        
        # 50% 的任務有 assignee
        $assigneeUserId = if ($t % 2 -eq 0) { $random.Next(1, 10) } else { 'NULL' }
        
        # 隨機 estimated_hours (1-8 小時)
        $estimatedHours = $random.Next(1, 9)
        
        # 完整的 notes
        $notes = "這是任務階段 $t 的詳細說明，包含完整的配置信息，用於測試任務生成的完整性。任務包含詳細描述、負責人、預估工時等所有必要字段。"
        $notesEscaped = $notes.Replace("'", "''")
        
        # 完整的 task_description
        $taskDesc = "任務描述 $configId - 這是一個完整的任務配置，包含詳細說明和所有必要字段，用於驗證任務生成系統的正確性"
        $taskDescEscaped = $taskDesc.Replace("'", "''")
        
        # 構建 INSERT 值
        $assigneeValue = if ($assigneeUserId -eq 'NULL') { 'NULL' } else { $assigneeUserId }
        
        $batchInserts += "($configId, $csId, '任務階段$t', '$taskDescEscaped', $assigneeValue, $estimatedHours, $t, 'month_start', '{}', '$dueRule', $daysDue, 'monthly', 1, 0, '$notesEscaped')"
        $configId++
        
        # 批量插入
        if ($batchInserts.Count -ge $batchSize) {
            $sql = "INSERT INTO ClientServiceTaskConfigs (config_id, client_service_id, task_name, task_description, assignee_user_id, estimated_hours, stage_order, generation_time_rule, generation_time_params, due_rule, days_due, execution_frequency, auto_generate, is_deleted, notes) VALUES " + ($batchInserts -join ", ")
            
            $result = npx wrangler d1 execute horgoscpa-db-v2 --local --command $sql 2>&1 | Out-String
            
            if (-not ($result -match "error|Error|SQLITE_ERROR" -and $result -notmatch "UNIQUE")) {
                $inserted += $batchInserts.Count
            } else {
                $failed++
                Write-Output "批次失敗: $($result.Substring(0, [Math]::Min(300, $result.Length)))"
            }
            
            $batchInserts = @()
            
            if ($inserted % 500 -eq 0 -and $inserted -gt 0) {
                Write-Output "已插入 $inserted 個配置"
            }
        }
    }
}

# 插入剩餘的批次
if ($batchInserts.Count -gt 0) {
    $sql = "INSERT INTO ClientServiceTaskConfigs (config_id, client_service_id, task_name, task_description, assignee_user_id, estimated_hours, stage_order, generation_time_rule, generation_time_params, due_rule, days_due, execution_frequency, auto_generate, is_deleted, notes) VALUES " + ($batchInserts -join ", ")
    $result = npx wrangler d1 execute horgoscpa-db-v2 --local --command $sql 2>&1 | Out-String
    if (-not ($result -match "error|Error|SQLITE_ERROR" -and $result -notmatch "UNIQUE")) {
        $inserted += $batchInserts.Count
    } else {
        $failed++
    }
}

Write-Output "總共插入: $inserted 個任務配置，失敗: $failed 個批次"
Write-Output ""

# 驗證
Write-Output "[4/4] 驗證插入的數據完整性..."
$stats = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as total, COUNT(assignee_user_id) as has_assignee, COUNT(estimated_hours) as has_hours, COUNT(notes) as has_notes, COUNT(CASE WHEN task_description IS NOT NULL AND task_description != '' THEN 1 END) as has_description FROM ClientServiceTaskConfigs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%') AND is_deleted = 0" 2>&1 | Out-String
Write-Output $stats

$noTaskServices = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM ClientServices cs WHERE cs.client_id LIKE 'PROD_TEST_%' AND cs.is_deleted = 0 AND NOT EXISTS (SELECT 1 FROM ClientServiceTaskConfigs tc WHERE tc.client_service_id = cs.client_service_id AND tc.is_deleted = 0 AND tc.auto_generate = 1)" 2>&1 | Out-String
Write-Output "沒有任務配置的服務數: $noTaskServices"

Write-Output ""
Write-Output "=== 完成 ==="



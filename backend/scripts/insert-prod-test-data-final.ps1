# 最終插入生產規模測試數據
$ErrorActionPreference = "Continue"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$env:WRANGLER_SEND_METRICS = "false"

Write-Output "=== 插入生產規模測試數據（最終版）==="
Write-Output ""

# 獲取客戶服務ID
Write-Output "獲取客戶服務ID..."
$csResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%' ORDER BY client_service_id" 2>&1 | Out-String
$allCsIds = [regex]::Matches($csResult, '"client_service_id":\s*(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
Write-Output "找到 $($allCsIds.Count) 個客戶服務"

# 清理舊任務配置
Write-Output "清理舊任務配置..."
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ClientServiceTaskConfigs WHERE config_id >= 10000 AND config_id < 50000" 2>&1 | Out-Null

# 插入任務配置
Write-Output "插入任務配置..."
$configId = 10000
$inserted = 0
$batchInserts = @()
$batchSize = 100

foreach ($csId in $allCsIds) {
    for ($t = 1; $t -le 6; $t++) {
        $dueRule = if ($t % 3 -eq 0) { 'end_of_month' } else { 'days_after_start' }
        $daysDue = 7 * $t
        $batchInserts += "($configId, $csId, '任務階段$t', '任務描述$configId', $t, 'month_start', '{}', '$dueRule', $daysDue, 'monthly', 1, 0)"
        $configId++
    }
    
    if ($batchInserts.Count -ge $batchSize) {
        $sql = "INSERT INTO ClientServiceTaskConfigs (config_id, client_service_id, task_name, task_description, stage_order, generation_time_rule, generation_time_params, due_rule, days_due, execution_frequency, auto_generate, is_deleted) VALUES " + ($batchInserts -join ", ")
        $result = npx wrangler d1 execute horgoscpa-db-v2 --local --command $sql 2>&1 | Out-String
        if (-not ($result -match "error|Error|SQLITE")) {
            $inserted += $batchInserts.Count
            Write-Output "已插入 $inserted 個配置"
        } else {
            Write-Output "批次插入錯誤"
        }
        $batchInserts = @()
    }
}

# 插入剩餘的
if ($batchInserts.Count -gt 0) {
    $sql = "INSERT INTO ClientServiceTaskConfigs (config_id, client_service_id, task_name, task_description, stage_order, generation_time_rule, generation_time_params, due_rule, days_due, execution_frequency, auto_generate, is_deleted) VALUES " + ($batchInserts -join ", ")
    $result = npx wrangler d1 execute horgoscpa-db-v2 --local --command $sql 2>&1 | Out-String
    if (-not ($result -match "error|Error|SQLITE")) {
        $inserted += $batchInserts.Count
    }
}

Write-Output "任務配置插入完成: 總共 $inserted 個"

# 驗證
Write-Output ""
Write-Output "=== 驗證 ==="
$stats = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT (SELECT COUNT(*) FROM Clients WHERE client_id LIKE 'PROD_TEST_%') as clients, (SELECT COUNT(*) FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0) as services, (SELECT COUNT(*) FROM ClientServiceTaskConfigs tc INNER JOIN ClientServices cs ON tc.client_service_id = cs.client_service_id WHERE cs.client_id LIKE 'PROD_TEST_%' AND tc.is_deleted = 0) as configs" 2>&1 | Out-String
Write-Output $stats

$skipped = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as skipped FROM (SELECT cs.client_service_id FROM ClientServices cs LEFT JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id AND tc.is_deleted = 0 AND tc.auto_generate = 1 WHERE cs.client_id LIKE 'PROD_TEST_%' AND cs.is_deleted = 0 GROUP BY cs.client_service_id HAVING COUNT(tc.config_id) = 0)" 2>&1 | Out-String
Write-Output $skipped

$syncCount = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM ClientServices cs INNER JOIN Clients c ON cs.client_id = c.client_id AND c.is_deleted = 0 INNER JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id AND tc.is_deleted = 0 AND tc.auto_generate = 1 WHERE cs.is_deleted = 0 AND cs.status = 'active' AND (cs.service_type IS NULL OR cs.service_type != 'one-time') AND cs.client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-String
Write-Output $syncCount


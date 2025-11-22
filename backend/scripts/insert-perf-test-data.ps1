# 通過SQL批量插入100客戶×7服務×6任務測試資料
# 使用PowerShell逐批執行，避免SQL變量限制

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Output "=== 插入100客戶×7服務×6任務測試資料 ==="

# 1. 插入100個客戶（每批20個）
Write-Output "`n1. 插入100個客戶..."
for ($batch = 0; $batch -lt 5; $batch++) {
    $start = $batch * 20 + 1
    $end = [Math]::Min(($batch + 1) * 20, 100)
    $values = @()
    for ($i = $start; $i -le $end; $i++) {
        $id = "PERF_TEST_" + $i.ToString("000")
        $tax = (90000000 + $i).ToString()
        $values += "('$id', '性能測試客戶$($i.ToString('000'))', '$tax', 'active', '0912345678', 'test$($i.ToString('000'))@test.com', 50, 0, datetime('now'), datetime('now'))"
    }
    $sql = "INSERT INTO Clients (client_id, company_name, tax_registration_number, business_status, phone, email, assignee_user_id, is_deleted, created_at, updated_at) VALUES " + ($values -join ", ")
    Write-Output "  插入客戶 $start-$end..."
    npx wrangler d1 execute horgoscpa-db-v2 --remote --command $sql 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Output "  批次 $batch 失敗，繼續下一批..."
    }
}

# 驗證客戶
$result = npx wrangler d1 execute horgoscpa-db-v2 --remote --command "SELECT COUNT(*) as count FROM Clients WHERE client_id LIKE 'PERF_TEST%' AND is_deleted = 0" --json 2>&1 | Select-Object -Last 50
$json = $result -join '' | ConvertFrom-Json
$clientCount = $json[0].results[0].count
Write-Output "  實際插入 $clientCount 個客戶`n"

# 2. 插入700個服務（每個客戶7個服務）
Write-Output "2. 插入700個服務（每個客戶7個服務）..."
$clientIds = @()
for ($i = 1; $i -le 100; $i++) {
    $clientIds += "PERF_TEST_" + $i.ToString("000")
}

$batchNum = 0
foreach ($clientId in $clientIds) {
    $values = @()
    for ($j = 1; $j -le 7; $j++) {
        $values += "('$clientId', 83, 'active', 'recurring', '[1,2,3,4,5,6,7,8,9,10,11,12]', 1, 0, datetime('now'), datetime('now'))"
    }
    $sql = "INSERT INTO ClientServices (client_id, service_id, status, service_type, execution_months, use_for_auto_generate, is_deleted, created_at, updated_at) VALUES " + ($values -join ", ")
    npx wrangler d1 execute horgoscpa-db-v2 --remote --command $sql 2>&1 | Out-Null
    $batchNum++
    if ($batchNum % 10 -eq 0) {
        Write-Output "  已處理 $batchNum 個客戶..."
    }
}

# 驗證服務
$result = npx wrangler d1 execute horgoscpa-db-v2 --remote --command "SELECT COUNT(*) as count FROM ClientServices cs INNER JOIN Clients c ON cs.client_id = c.client_id WHERE c.client_id LIKE 'PERF_TEST%' AND cs.is_deleted = 0 AND c.is_deleted = 0" --json 2>&1 | Select-Object -Last 50
$json = $result -join '' | ConvertFrom-Json
$serviceCount = $json[0].results[0].count
Write-Output "  實際插入 $serviceCount 個服務`n"

# 3. 獲取client_service_id並插入4200個任務配置
Write-Output "3. 插入4200個任務配置（每個服務6個任務）..."
$result = npx wrangler d1 execute horgoscpa-db-v2 --remote --command "SELECT cs.client_service_id FROM ClientServices cs INNER JOIN Clients c ON cs.client_id = c.client_id WHERE c.client_id LIKE 'PERF_TEST%' AND cs.is_deleted = 0 AND c.is_deleted = 0" --json 2>&1 | Select-Object -Last 200
$json = $result -join '' | ConvertFrom-Json
$serviceIds = $json[0].results | ForEach-Object { $_.client_service_id }

Write-Output "  找到 $($serviceIds.Count) 個服務，開始插入任務配置..."
$batchNum = 0
foreach ($serviceId in $serviceIds) {
    $values = @()
    for ($stage = 1; $stage -le 6; $stage++) {
        $rule = if ($stage % 3 -eq 1) { "prev_month_last_x_days" } else { "service_month_start" }
        $params = if ($stage % 3 -eq 1) { '{\"days\":3}' } else { "{}" }
        $fixed = if ($stage -eq 3) { 1 } else { 0 }
        $values += "($serviceId, '測試任務-$stage', '測試任務描述-$stage', $stage, '$rule', '$params', 30, $fixed, 1, 0, datetime('now'), datetime('now'))"
    }
    $sql = "INSERT INTO ClientServiceTaskConfigs (client_service_id, task_name, task_description, stage_order, generation_time_rule, generation_time_params, days_due, is_fixed_deadline, auto_generate, is_deleted, created_at, updated_at) VALUES " + ($values -join ", ")
    npx wrangler d1 execute horgoscpa-db-v2 --remote --command $sql 2>&1 | Out-Null
    $batchNum++
    if ($batchNum % 50 -eq 0) {
        Write-Output "  已處理 $batchNum 個服務..."
    }
}

# 驗證任務配置
$result = npx wrangler d1 execute horgoscpa-db-v2 --remote --command "SELECT COUNT(*) as count FROM ClientServiceTaskConfigs tc INNER JOIN ClientServices cs ON tc.client_service_id = cs.client_service_id INNER JOIN Clients c ON cs.client_id = c.client_id WHERE c.client_id LIKE 'PERF_TEST%' AND tc.is_deleted = 0 AND cs.is_deleted = 0 AND c.is_deleted = 0" --json 2>&1 | Select-Object -Last 50
$json = $result -join '' | ConvertFrom-Json
$taskConfigCount = $json[0].results[0].count
Write-Output "  實際插入 $taskConfigCount 個任務配置`n"

Write-Output "=== 完成 ==="
Write-Output "客戶: $clientCount"
Write-Output "服務: $serviceCount"
Write-Output "任務配置: $taskConfigCount"


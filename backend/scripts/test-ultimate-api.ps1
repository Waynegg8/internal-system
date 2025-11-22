# 測試終極預聚合 API
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$baseUrl = "http://localhost:8787"
$targetYear = 2025
$targetMonth = 11

Write-Output "=== 測試終極預聚合 API ==="
Write-Output ""

# 步驟1: 登入獲取 session
Write-Output "[1/4] 登入獲取 session..."
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v2/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session
    $sessionCookie = $session.Cookies.GetCookies("http://localhost:8787") | Where-Object { $_.Name -eq "session" }
    if ($sessionCookie) {
        Write-Output "✅ 登入成功"
        $sessionId = $sessionCookie.Value
    } else {
        Write-Output "❌ 無法獲取 session cookie"
        exit 1
    }
} catch {
    Write-Output "❌ 登入失敗: $($_.Exception.Message)"
    Write-Output "嘗試使用默認 session..."
    $sessionId = "test-session"
}

# 步驟2: 觸發任務生成
Write-Output ""
Write-Output "[2/4] 觸發任務生成 (終極預聚合方案)..."
$headers = @{
    "Cookie" = "session=$sessionId"
    "Content-Type" = "application/json"
}

try {
    $startTime = Get-Date
    $generateResponse = Invoke-RestMethod -Uri "$baseUrl/api/v2/admin/tasks/generate?target_year=$targetYear&target_month=$targetMonth" -Method POST -Headers $headers -ErrorAction Stop
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Output "✅ API 調用成功"
    Write-Output "   耗時: $([Math]::Round($duration, 2)) 秒"
    Write-Output ""
    Write-Output "響應數據:"
    $generateResponse | ConvertTo-Json -Depth 5 | Write-Output
    
    # 驗證響應結構
    $checks = @()
    if ($generateResponse.data) {
        $data = $generateResponse.data
        $checks += @{ Name = "返回 data 對象"; Pass = $true }
        $checks += @{ Name = "有 generatedCount"; Pass = $null -ne $data.generatedCount }
        $checks += @{ Name = "有 queryCount"; Pass = $null -ne $data.queryCount }
        $checks += @{ Name = "有 templateSync"; Pass = $null -ne $data.templateSync }
        $checks += @{ Name = "有 queueGeneration"; Pass = $null -ne $data.queueGeneration }
        $checks += @{ Name = "有 taskGeneration"; Pass = $null -ne $data.taskGeneration }
        
        if ($data.templateSync) {
            $checks += @{ Name = "templateSync.createdCount"; Pass = $null -ne $data.templateSync.createdCount }
            $checks += @{ Name = "templateSync.unchangedCount"; Pass = $null -ne $data.templateSync.unchangedCount }
        }
        
        if ($data.queueGeneration) {
            $checks += @{ Name = "queueGeneration.queuedCount"; Pass = $null -ne $data.queueGeneration.queuedCount }
        }
        
        $checks += @{ Name = "queryCount <= 50"; Pass = $data.queryCount -le 50 }
        $checks += @{ Name = "總查詢次數合理"; Pass = $data.queryCount -lt 100 }
    } else {
        $checks += @{ Name = "返回 data 對象"; Pass = $false }
    }
    
    Write-Output ""
    Write-Output "驗證結果:"
    $passed = 0
    foreach ($check in $checks) {
        $status = if ($check.Pass) { "✅" } else { "❌" }
        Write-Output "$status $($check.Name)"
        if ($check.Pass) { $passed++ }
    }
    
    $passRate = [Math]::Round(($passed / $checks.Count) * 100, 1)
    Write-Output ""
    Write-Output "通過率: $passed/$($checks.Count) ($passRate%)"
    
} catch {
    Write-Output "❌ API 調用失敗: $($_.Exception.Message)"
    if ($_.ErrorDetails) {
        Write-Output "錯誤詳情: $($_.ErrorDetails.Message)"
    }
    exit 1
}

# 步驟3: 檢查模板是否創建
Write-Output ""
Write-Output "[3/4] 檢查模板是否創建..."
$templateCount = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskGenerationTemplates WHERE is_active = 1" 2>&1 | Select-Object -Last 30
if ($templateCount -match '"count":\s*(\d+)') {
    $count = $matches[1]
    Write-Output "✅ 模板數量: $count"
    if ([int]$count -gt 0) {
        Write-Output "✅ 模板已成功創建"
    } else {
        Write-Output "⚠️  模板數量為 0，可能需要檢查"
    }
} else {
    Write-Output "❌ 無法獲取模板數量"
}

# 步驟4: 檢查 Queue 是否創建
Write-Output ""
Write-Output "[4/4] 檢查 Queue 是否創建..."
$queueCount = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskGenerationQueue WHERE target_year = $targetYear AND target_month = $targetMonth" 2>&1 | Select-Object -Last 30
if ($queueCount -match '"count":\s*(\d+)') {
    $count = $matches[1]
    Write-Output "✅ Queue 數量: $count"
    if ([int]$count -gt 0) {
        Write-Output "✅ Queue 已成功創建"
    } else {
        Write-Output "⚠️  Queue 數量為 0，可能需要檢查"
    }
} else {
    Write-Output "❌ 無法獲取 Queue 數量"
}

Write-Output ""
Write-Output "=== 測試完成 ==="



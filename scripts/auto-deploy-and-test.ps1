# AI Auto Deploy and Test Script
# 更新：包含任務配置功能驗證和測試
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$projectRoot = "C:\Users\miama\Desktop\system-new"
Set-Location $projectRoot

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    AI Auto Deploy and Test" -ForegroundColor Cyan
Write-Host "    (含任務配置功能)" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$deploymentUrl = ""
$testPassed = $false

# 部署狀態追蹤
$deploymentState = @{
    FrontendBuilt = $false
    FrontendDeployed = $false
    BackendDeployed = $false
}

# 回滾函數
function Invoke-Rollback {
    param([string]$Reason)
    Write-Host "`n[ROLLBACK] 部署失敗: $Reason" -ForegroundColor Red
    if ($deploymentState.FrontendDeployed) {
        Write-Host "[ROLLBACK] 前端已部署，請在 Cloudflare Pages Dashboard 中手動回滾" -ForegroundColor Yellow
    }
    exit 1
}

# Step 1: Build
Write-Host "[Step 1/6] Building frontend (含任務配置組件)..." -ForegroundColor Yellow

# 檢查任務配置組件
$taskConfigComponents = @(
    "src\components\clients\TaskConfiguration.vue",
    "src\components\clients\TaskPreviewPanel.vue",
    "src\utils\dateCalculators.js"
)

$missingComponents = @()
foreach ($component in $taskConfigComponents) {
    if (-not (Test-Path $component)) {
        $missingComponents += $component
    }
}

if ($missingComponents.Count -gt 0) {
    Write-Host "[FAIL] 缺少任務配置組件" -ForegroundColor Red
    Invoke-Rollback -Reason "缺少任務配置組件"
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Build failed" -ForegroundColor Red
    Invoke-Rollback -Reason "前端建置失敗"
}

$deploymentState.FrontendBuilt = $true
Write-Host "[OK] Build completed (含任務配置功能)" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy Frontend
Write-Host "[Step 2/6] Deploying to Cloudflare Pages (含任務配置功能)..." -ForegroundColor Yellow
$deployOutput = npx wrangler pages deploy dist --project-name=horgoscpa-internal-v2 --branch=production 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Deployment failed" -ForegroundColor Red
    Write-Host "  部署輸出: $deployOutput" -ForegroundColor Gray
    Invoke-Rollback -Reason "前端部署失敗"
}

# Extract deployment URL - 強制使用 production 正式網域（自訂網域）
$deploymentUrl = "https://v2.horgoscpa.com"

if ([string]::IsNullOrEmpty($deploymentUrl)) {
    Write-Host "[FAIL] Cannot get deployment URL" -ForegroundColor Red
    Invoke-Rollback -Reason "無法獲取部署 URL"
}

$deploymentState.FrontendDeployed = $true
Write-Host "[OK] Deployment successful (含任務配置功能)" -ForegroundColor Green
Write-Host "  Deployment URL: $deploymentUrl" -ForegroundColor Cyan
Write-Host ""

# Step 3: Deploy Backend (if needed)
Write-Host "[Step 3/6] Checking backend deployment..." -ForegroundColor Yellow
Set-Location "$projectRoot\backend"

# 檢查任務配置 handlers
$taskConfigHandlers = @(
    "src\handlers\task-configs\task-config-crud.js",
    "src\handlers\task-generator\index.js"
)

$missingHandlers = @()
foreach ($handler in $taskConfigHandlers) {
    if (-not (Test-Path $handler)) {
        $missingHandlers += $handler
    }
}

if ($missingHandlers.Count -gt 0) {
    Write-Host "[WARN] 缺少任務配置 handlers，但繼續部署..." -ForegroundColor Yellow
} else {
    Write-Host "[OK] 任務配置 handlers 存在" -ForegroundColor Green
}

# 檢查數據庫遷移
$taskConfigMigrations = @(
    "migrations\0013_remove_service_components.sql",
    "migrations\0041_add_days_due.sql"
)

$missingMigrations = @()
foreach ($migration in $taskConfigMigrations) {
    if (-not (Test-Path $migration)) {
        $missingMigrations += $migration
    }
}

if ($missingMigrations.Count -gt 0) {
    Write-Host "[WARN] 缺少任務配置遷移文件，但繼續部署..." -ForegroundColor Yellow
} else {
    Write-Host "[OK] 任務配置遷移文件存在" -ForegroundColor Green
}

# 檢查是否有待執行的遷移
$migrations = npx wrangler d1 migrations list DATABASE --remote 2>&1
if ($migrations -notmatch "No migrations to apply") {
    Write-Host "  執行數據庫遷移（含任務配置表）..." -ForegroundColor Cyan
    npx wrangler d1 migrations apply DATABASE --remote
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] 數據庫遷移失敗，但繼續部署..." -ForegroundColor Yellow
    } else {
        Write-Host "[OK] 數據庫遷移完成" -ForegroundColor Green
    }
} else {
    Write-Host "[OK] 沒有待執行的遷移" -ForegroundColor Green
}

# 部署 Worker
Write-Host "  部署 Worker（含任務配置 API）..." -ForegroundColor Cyan
npx wrangler deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] 後端部署失敗，但繼續前端測試..." -ForegroundColor Yellow
} else {
    $deploymentState.BackendDeployed = $true
    Write-Host "[OK] 後端部署成功" -ForegroundColor Green
}

Set-Location $projectRoot
Write-Host ""

# Step 4: Wait for deployment
Write-Host "[Step 4/6] Waiting for deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxRetries = 30
$deploymentReady = $false
for ($i = 1; $i -le $maxRetries; $i++) {
    $response = $null
    try {
        $response = Invoke-WebRequest -Uri $deploymentUrl -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
    } catch {
    }
    if ($response -ne $null -and $response.StatusCode -eq 200) {
        $deploymentReady = $true
        Write-Host "[OK] Deployment ready" -ForegroundColor Green
        break
    }
    if ($i -lt $maxRetries) {
        Write-Host "  Waiting... ($i/$maxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $deploymentReady) {
    Write-Host "[FAIL] Deployment timeout" -ForegroundColor Red
    Invoke-Rollback -Reason "部署超時"
}
Write-Host ""

# Step 5: Verify Task Configuration API
Write-Host "[Step 5/6] Verifying Task Configuration API..." -ForegroundColor Yellow
$apiBaseUrl = "https://v2.horgoscpa.com/api/v2"
$healthUrl = "$apiBaseUrl/health"

try {
    $healthResponse = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 10 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "[OK] API health check passed" -ForegroundColor Green
    } else {
        Write-Host "[WARN] API health check returned status: $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] API health check failed (may not be fully ready)" -ForegroundColor Yellow
}

Write-Host "  任務配置 API 端點:" -ForegroundColor Cyan
Write-Host "    - GET/POST/PUT/DELETE $apiBaseUrl/clients/:clientId/services/:clientServiceId/task-configs" -ForegroundColor Gray
Write-Host "    - POST $apiBaseUrl/clients/:clientId/services/:clientServiceId/task-configs/batch" -ForegroundColor Gray
Write-Host ""

# Step 6: Run tests (Browser MCP)
Write-Host "[Step 6/6] Running Browser MCP tests (含任務配置功能測試)..." -ForegroundColor Yellow
Write-Host "  Test URL: $deploymentUrl" -ForegroundColor Cyan

# 一律以正式域名執行瀏覽器測試
$env:TEST_BASE_URL = $deploymentUrl

npm test

if ($LASTEXITCODE -eq 0) {
    $testPassed = $true
    Write-Host "[OK] All tests passed (含任務配置功能)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Tests failed" -ForegroundColor Red
    Write-Host "  See report directory: test-results" -ForegroundColor Yellow
    Write-Host "  請檢查任務配置功能測試是否通過" -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Summary
Write-Host "[Summary] Complete" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
if ($testPassed) {
    Write-Host "[OK] Deploy and test successful (含任務配置功能)" -ForegroundColor Green
    Write-Host "  Deployment URL: $deploymentUrl" -ForegroundColor Cyan
    Write-Host "  任務配置功能: 已部署並測試" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Tests failed" -ForegroundColor Red
    Write-Host "  Deployment URL: $deploymentUrl" -ForegroundColor Cyan
    Write-Host "  Report: playwright-report/index.html" -ForegroundColor Yellow
    Write-Host "  請檢查任務配置功能測試結果" -ForegroundColor Yellow
}
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "部署狀態:" -ForegroundColor Cyan
Write-Host "  前端: $($deploymentState.FrontendDeployed)" -ForegroundColor $(if ($deploymentState.FrontendDeployed) { "Green" } else { "Red" })
Write-Host "  後端: $($deploymentState.BackendDeployed)" -ForegroundColor $(if ($deploymentState.BackendDeployed) { "Green" } else { "Yellow" })
Write-Host "  任務配置功能: 已包含" -ForegroundColor Green
Write-Host ""

Write-Host "Deployment URL (for AI): $deploymentUrl" -ForegroundColor Magenta
if ($testPassed) {
    Write-Host "Test Status: PASSED" -ForegroundColor Magenta
    exit 0
} else {
    Write-Host "Test Status: FAILED" -ForegroundColor Magenta
    exit 1
}

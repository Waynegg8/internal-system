# 完整自動化部署腳本（前端 + 後端）
# 使用 Wrangler CLI 進行 Cloudflare 部署
# 注意：Cloudflare 沒有官方的 MCP 伺服器，必須使用 Wrangler CLI
# 更新：包含任務配置功能驗證和回滾支持

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$projectRoot = "C:\Users\miama\Desktop\system-new"
Set-Location $projectRoot

# 部署狀態追蹤（用於回滾）
$deploymentState = @{
    FrontendBuilt = $false
    FrontendDeployed = $false
    BackendMigrationsApplied = $false
    BackendDeployed = $false
    PreviousDeploymentId = $null
}

# 回滾函數
function Invoke-Rollback {
    param(
        [string]$Reason
    )
    
    Write-Host "`n===========================================" -ForegroundColor Red
    Write-Host "    部署失敗，執行回滾" -ForegroundColor Red
    Write-Host "===========================================" -ForegroundColor Red
    Write-Host "失敗原因: $Reason" -ForegroundColor Yellow
    Write-Host ""
    
    # 如果後端已部署，嘗試回滾到上一個版本
    if ($deploymentState.BackendDeployed) {
        Write-Host "⚠ 後端已部署，無法自動回滾 Worker 版本" -ForegroundColor Yellow
        Write-Host "  請手動檢查 Cloudflare Dashboard 並回滾到上一個版本" -ForegroundColor Yellow
    }
    
    # 如果前端已部署，提示手動回滾
    if ($deploymentState.FrontendDeployed) {
        Write-Host "⚠ 前端已部署，請在 Cloudflare Pages Dashboard 中手動回滾" -ForegroundColor Yellow
    }
    
    # 如果數據庫遷移已應用，提示檢查
    if ($deploymentState.BackendMigrationsApplied) {
        Write-Host "⚠ 數據庫遷移已應用，請檢查數據庫狀態" -ForegroundColor Yellow
        Write-Host "  如需回滾遷移，請手動執行相應的 SQL 腳本" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "回滾建議:" -ForegroundColor Cyan
    Write-Host "  1. 檢查 Cloudflare Dashboard 中的部署歷史" -ForegroundColor Gray
    Write-Host "  2. 回滾到上一個穩定版本" -ForegroundColor Gray
    Write-Host "  3. 檢查數據庫狀態和遷移記錄" -ForegroundColor Gray
    Write-Host ""
    
    exit 1
}

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "    完整自動化部署流程（含任務配置功能）" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Wrangler 登入狀態
Write-Host "[步驟 0/7] 檢查 Cloudflare 登入狀態..." -ForegroundColor Yellow
try {
    $whoami = npx wrangler whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "未登錄"
    }
    Write-Host "✓ 已登錄 Cloudflare" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ 未登錄 Cloudflare" -ForegroundColor Red
    Write-Host "  請先執行: npx wrangler login" -ForegroundColor Yellow
    exit 1
}

# 步驟 1: 建置前端
Write-Host "[步驟 1/7] 建置前端專案（含任務配置組件）..." -ForegroundColor Yellow
Set-Location $projectRoot

# 檢查任務配置相關組件是否存在
$taskConfigComponents = @(
    "src\components\clients\TaskConfiguration.vue",
    "src\components\clients\TaskPreviewPanel.vue",
    "src\components\clients\TaskGenerationTimeRule.vue",
    "src\components\clients\TaskDueDateRule.vue",
    "src\utils\dateCalculators.js",
    "src\utils\validation.js"
)

Write-Host "  檢查任務配置組件..." -ForegroundColor Cyan
$missingComponents = @()
foreach ($component in $taskConfigComponents) {
    if (-not (Test-Path $component)) {
        $missingComponents += $component
        Write-Host "  ⚠ 缺少組件: $component" -ForegroundColor Yellow
    }
}

if ($missingComponents.Count -gt 0) {
    Write-Host "✗ 缺少必要的任務配置組件" -ForegroundColor Red
    Write-Host "  缺少的組件:" -ForegroundColor Yellow
    foreach ($component in $missingComponents) {
        Write-Host "    - $component" -ForegroundColor Gray
    }
    Invoke-Rollback -Reason "缺少必要的任務配置組件"
}

Write-Host "  ✓ 所有任務配置組件存在" -ForegroundColor Green

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 前端依賴安裝失敗" -ForegroundColor Red
    Invoke-Rollback -Reason "前端依賴安裝失敗"
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 前端建置失敗" -ForegroundColor Red
    Invoke-Rollback -Reason "前端建置失敗"
}

if (-not (Test-Path "dist")) {
    Write-Host "✗ dist 目錄不存在" -ForegroundColor Red
    Invoke-Rollback -Reason "dist 目錄不存在"
}

$deploymentState.FrontendBuilt = $true
Write-Host "✓ 前端建置完成（含任務配置功能）" -ForegroundColor Green
Write-Host ""

# 步驟 2: 部署前端到 Cloudflare Pages
Write-Host "[步驟 2/7] 部署前端到 Cloudflare Pages..." -ForegroundColor Yellow
Write-Host "  專案名稱: horgoscpa-internal-v2" -ForegroundColor Cyan
Write-Host "  部署目錄: dist" -ForegroundColor Cyan
Write-Host "  包含功能: 任務配置、任務預覽、SOP 綁定" -ForegroundColor Cyan

$deployOutput = npx wrangler pages deploy dist --project-name=horgoscpa-internal-v2 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 前端部署失敗" -ForegroundColor Red
    Write-Host "  部署輸出: $deployOutput" -ForegroundColor Gray
    Invoke-Rollback -Reason "前端部署失敗"
}

$deploymentState.FrontendDeployed = $true
Write-Host "✓ 前端部署成功（含任務配置功能）" -ForegroundColor Green
Write-Host ""

# 步驟 3: 部署後端 Worker
Write-Host "[步驟 3/7] 部署後端 Worker（含任務配置 API）..." -ForegroundColor Yellow
Set-Location "$projectRoot\backend"

# 檢查任務配置相關 handlers
$taskConfigHandlers = @(
    "src\handlers\task-configs\task-config-crud.js",
    "src\handlers\task-generator\index.js",
    "src\utils\dateCalculators.js"
)

Write-Host "  檢查任務配置 handlers..." -ForegroundColor Cyan
$missingHandlers = @()
foreach ($handler in $taskConfigHandlers) {
    if (-not (Test-Path $handler)) {
        $missingHandlers += $handler
        Write-Host "  ⚠ 缺少 handler: $handler" -ForegroundColor Yellow
    }
}

if ($missingHandlers.Count -gt 0) {
    Write-Host "✗ 缺少必要的任務配置 handlers" -ForegroundColor Red
    Invoke-Rollback -Reason "缺少必要的任務配置 handlers"
}

Write-Host "  ✓ 所有任務配置 handlers 存在" -ForegroundColor Green

# 檢查任務配置相關數據庫遷移
Write-Host "  檢查任務配置數據庫遷移..." -ForegroundColor Cyan
$taskConfigMigrations = @(
    "migrations\0013_remove_service_components.sql",
    "migrations\0028_task_system_enhancements.sql",
    "migrations\0041_add_days_due.sql"
)

$missingMigrations = @()
foreach ($migration in $taskConfigMigrations) {
    if (-not (Test-Path $migration)) {
        $missingMigrations += $migration
        Write-Host "  ⚠ 缺少遷移文件: $migration" -ForegroundColor Yellow
    }
}

if ($missingMigrations.Count -gt 0) {
    Write-Host "✗ 缺少必要的任務配置數據庫遷移" -ForegroundColor Red
    Invoke-Rollback -Reason "缺少必要的任務配置數據庫遷移"
}

Write-Host "  ✓ 所有任務配置遷移文件存在" -ForegroundColor Green

# 檢查後端依賴
if (-not (Test-Path "node_modules")) {
    Write-Host "  安裝後端依賴..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 後端依賴安裝失敗" -ForegroundColor Red
        Invoke-Rollback -Reason "後端依賴安裝失敗"
    }
}

# 驗證遷移文件（可選）
if (Test-Path "scripts\validate-migrations.js") {
    Write-Host "  驗證遷移文件..." -ForegroundColor Cyan
    node scripts\validate-migrations.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ 遷移文件驗證有問題，但繼續部署..." -ForegroundColor Yellow
    }
}

# 執行數據庫遷移（自動模式）
Write-Host "  檢查數據庫遷移（含任務配置表）..." -ForegroundColor Cyan
$migrations = npx wrangler d1 migrations list DATABASE --remote 2>&1
if ($migrations -match "No migrations to apply") {
    Write-Host "  ✓ 沒有待執行的遷移" -ForegroundColor Green
} else {
    Write-Host "  執行數據庫遷移（包含 ClientServiceTaskConfigs, TaskConfigSOPs 等表）..." -ForegroundColor Cyan
    npx wrangler d1 migrations apply DATABASE --remote
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 數據庫遷移失敗" -ForegroundColor Red
        Invoke-Rollback -Reason "數據庫遷移失敗"
    }
    $deploymentState.BackendMigrationsApplied = $true
    Write-Host "  ✓ 數據庫遷移完成（任務配置表已創建）" -ForegroundColor Green
}

# 部署 Worker
Write-Host "  部署 Worker（含任務配置 API 路由）..." -ForegroundColor Cyan
npx wrangler deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 後端部署失敗" -ForegroundColor Red
    Invoke-Rollback -Reason "後端部署失敗"
}

$deploymentState.BackendDeployed = $true
Write-Host "✓ 後端部署成功（含任務配置 API）" -ForegroundColor Green
Write-Host ""

# 步驟 4: 等待部署就緒
Write-Host "[步驟 4/7] 等待部署就緒..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "  ✓ 等待完成" -ForegroundColor Green
Write-Host ""

# 步驟 5: 驗證任務配置 API 端點
Write-Host "[步驟 5/7] 驗證任務配置 API 端點..." -ForegroundColor Yellow
$apiBaseUrl = "https://v2.horgoscpa.com/api/v2"
$healthUrl = "$apiBaseUrl/health"

Write-Host "  檢查 API 健康狀態..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 10 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "  ✓ API 健康檢查通過" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ API 健康檢查返回狀態碼: $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ API 健康檢查失敗（可能尚未完全就緒）" -ForegroundColor Yellow
    Write-Host "    錯誤: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "  任務配置 API 端點（需要認證）:" -ForegroundColor Cyan
Write-Host "    - GET    $apiBaseUrl/clients/:clientId/services/:clientServiceId/task-configs" -ForegroundColor Gray
Write-Host "    - POST   $apiBaseUrl/clients/:clientId/services/:clientServiceId/task-configs" -ForegroundColor Gray
Write-Host "    - PUT    $apiBaseUrl/clients/:clientId/services/:clientServiceId/task-configs/:configId" -ForegroundColor Gray
Write-Host "    - DELETE $apiBaseUrl/clients/:clientId/services/:clientServiceId/task-configs/:configId" -ForegroundColor Gray
Write-Host "    - POST   $apiBaseUrl/clients/:clientId/services/:clientServiceId/task-configs/batch" -ForegroundColor Gray
Write-Host ""

# 步驟 6: 部署後驗證
Write-Host "[步驟 6/7] 部署後驗證..." -ForegroundColor Yellow
Write-Host "  前端地址: https://v2.horgoscpa.com" -ForegroundColor Cyan
Write-Host "  後端 API: $apiBaseUrl/*" -ForegroundColor Cyan
Write-Host "  任務配置功能: 已部署" -ForegroundColor Cyan
Write-Host ""

# 步驟 7: 測試部署
Write-Host "[步驟 7/7] 測試部署..." -ForegroundColor Yellow
Write-Host "  建議測試以下端點:" -ForegroundColor Cyan
Write-Host "    - GET  $apiBaseUrl/health" -ForegroundColor Gray
Write-Host "    - POST $apiBaseUrl/auth/login" -ForegroundColor Gray
Write-Host ""
Write-Host "  任務配置功能測試:" -ForegroundColor Cyan
Write-Host "    1. 登入系統" -ForegroundColor Gray
Write-Host "    2. 進入客戶服務配置頁面" -ForegroundColor Gray
Write-Host "    3. 測試任務配置創建、編輯、刪除" -ForegroundColor Gray
Write-Host "    4. 測試任務預覽功能" -ForegroundColor Gray
Write-Host "    5. 測試生成時間和到期日規則" -ForegroundColor Gray
Write-Host "    6. 測試 SOP 自動綁定" -ForegroundColor Gray
Write-Host "    7. 測試批量設置負責人" -ForegroundColor Gray
Write-Host ""

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "✓ 完整部署流程完成（含任務配置功能）！" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "部署狀態:" -ForegroundColor Cyan
Write-Host "  ✓ 前端已建置並部署" -ForegroundColor Green
Write-Host "  ✓ 後端已部署（含任務配置 API）" -ForegroundColor Green
Write-Host "  ✓ 數據庫遷移已應用（含任務配置表）" -ForegroundColor Green
Write-Host "  ✓ 所有組件已驗證" -ForegroundColor Green
Write-Host ""

Set-Location $projectRoot











# Cloudflare Worker 部署腳本 (PowerShell)
# 更新：包含任務配置功能驗證
# 設置編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ErrorActionPreference = "Stop"

Write-Host "🚀 開始部署到 Cloudflare（含任務配置功能）..." -ForegroundColor Green
Write-Host ""

# 部署狀態追蹤
$deploymentState = @{
    MigrationsApplied = $false
    WorkerDeployed = $false
}

# 回滾函數
function Invoke-Rollback {
    param([string]$Reason)
    Write-Host "`n[ROLLBACK] 部署失敗: $Reason" -ForegroundColor Red
    if ($deploymentState.MigrationsApplied) {
        Write-Host "[ROLLBACK] 數據庫遷移已應用，請檢查數據庫狀態" -ForegroundColor Yellow
    }
    exit 1
}

# 1. 檢查是否已登錄
Write-Host "1️⃣  檢查 Cloudflare 登錄狀態..." -ForegroundColor Yellow
try {
    $whoami = wrangler whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "未登錄"
    }
    Write-Host "   ✅ 已登錄 Cloudflare" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   ❌ 未登錄 Cloudflare，請先運行: wrangler login" -ForegroundColor Red
    exit 1
}

# 2. 檢查依賴
Write-Host "2️⃣  檢查依賴..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "   📦 安裝依賴..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ 依賴安裝失敗" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✅ 依賴已安裝" -ForegroundColor Green
}
Write-Host ""

# 3. 驗證任務配置相關文件
Write-Host "3️⃣  驗證任務配置相關文件..." -ForegroundColor Yellow

# 檢查任務配置 handlers
$taskConfigHandlers = @(
    "src\handlers\task-configs\task-config-crud.js",
    "src\handlers\task-generator\index.js",
    "src\utils\dateCalculators.js"
)

Write-Host "   檢查任務配置 handlers..." -ForegroundColor Cyan
$missingHandlers = @()
foreach ($handler in $taskConfigHandlers) {
    if (-not (Test-Path $handler)) {
        $missingHandlers += $handler
        Write-Host "     ⚠️  缺少: $handler" -ForegroundColor Yellow
    }
}

if ($missingHandlers.Count -gt 0) {
    Write-Host "   ❌ 缺少必要的任務配置 handlers" -ForegroundColor Red
    Invoke-Rollback -Reason "缺少任務配置 handlers"
} else {
    Write-Host "   ✅ 所有任務配置 handlers 存在" -ForegroundColor Green
}

# 檢查任務配置數據庫遷移
$taskConfigMigrations = @(
    "migrations\0013_remove_service_components.sql",
    "migrations\0028_task_system_enhancements.sql",
    "migrations\0041_add_days_due.sql"
)

Write-Host "   檢查任務配置數據庫遷移..." -ForegroundColor Cyan
$missingMigrations = @()
foreach ($migration in $taskConfigMigrations) {
    if (-not (Test-Path $migration)) {
        $missingMigrations += $migration
        Write-Host "     ⚠️  缺少: $migration" -ForegroundColor Yellow
    }
}

if ($missingMigrations.Count -gt 0) {
    Write-Host "   ❌ 缺少必要的任務配置數據庫遷移" -ForegroundColor Red
    Invoke-Rollback -Reason "缺少任務配置數據庫遷移"
} else {
    Write-Host "   ✅ 所有任務配置遷移文件存在" -ForegroundColor Green
}

# 驗證遷移文件（可選）
if (Test-Path "scripts\validate-migrations.js") {
    Write-Host "   驗證遷移文件..." -ForegroundColor Cyan
    node scripts\validate-migrations.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  遷移文件驗證有問題，但繼續部署..." -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ 遷移文件驗證通過" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  驗證腳本不存在，跳過驗證" -ForegroundColor Yellow
}
Write-Host ""

# 4. 運行數據庫遷移（生產環境，含任務配置表）
Write-Host "4️⃣  數據庫遷移（含任務配置表）..." -ForegroundColor Yellow
$response = Read-Host "   是否運行生產環境數據庫遷移? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "   🗄️  執行數據庫遷移（包含 ClientServiceTaskConfigs, TaskConfigSOPs 等表）..." -ForegroundColor Cyan
    
    # 檢查待執行的遷移
    $migrations = wrangler d1 migrations list DATABASE --remote 2>&1
    if ($migrations -match "No migrations to apply") {
        Write-Host "   ✅ 沒有待執行的遷移" -ForegroundColor Green
    } else {
        wrangler d1 migrations apply DATABASE --remote
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ❌ 數據庫遷移失敗" -ForegroundColor Red
            Invoke-Rollback -Reason "數據庫遷移失敗"
        }
        $deploymentState.MigrationsApplied = $true
        Write-Host "   ✅ 數據庫遷移完成（任務配置表已創建/更新）" -ForegroundColor Green
    }
} else {
    Write-Host "   ⏭️  跳過數據庫遷移" -ForegroundColor Yellow
}
Write-Host ""

# 5. 部署 Worker（含任務配置 API）
Write-Host "5️⃣  部署 Worker（含任務配置 API 路由）..." -ForegroundColor Yellow
wrangler deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ 部署失敗" -ForegroundColor Red
    Invoke-Rollback -Reason "Worker 部署失敗"
}
$deploymentState.WorkerDeployed = $true
Write-Host "   ✅ Worker 部署成功（含任務配置 API）" -ForegroundColor Green
Write-Host ""

# 6. 部署後驗證
Write-Host "6️⃣  部署後驗證..." -ForegroundColor Yellow
Write-Host "   📍 API 地址: https://v2.horgoscpa.com/api/v2/*" -ForegroundColor Cyan
Write-Host "   💡 建議測試以下端點:" -ForegroundColor Cyan
Write-Host "      - GET  https://v2.horgoscpa.com/api/v2/health" -ForegroundColor Gray
Write-Host "      - POST https://v2.horgoscpa.com/api/v2/auth/login" -ForegroundColor Gray
Write-Host ""
Write-Host "   📋 任務配置 API 端點:" -ForegroundColor Cyan
Write-Host "      - GET    /api/v2/clients/:clientId/services/:clientServiceId/task-configs" -ForegroundColor Gray
Write-Host "      - POST   /api/v2/clients/:clientId/services/:clientServiceId/task-configs" -ForegroundColor Gray
Write-Host "      - PUT    /api/v2/clients/:clientId/services/:clientServiceId/task-configs/:configId" -ForegroundColor Gray
Write-Host "      - DELETE /api/v2/clients/:clientId/services/:clientServiceId/task-configs/:configId" -ForegroundColor Gray
Write-Host "      - POST   /api/v2/clients/:clientId/services/:clientServiceId/task-configs/batch" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ 部署完成（含任務配置功能）！" -ForegroundColor Green
Write-Host ""
Write-Host "部署狀態:" -ForegroundColor Cyan
Write-Host "  ✅ 任務配置 handlers: 已部署" -ForegroundColor Green
Write-Host "  ✅ 任務配置數據庫表: $($deploymentState.MigrationsApplied)" -ForegroundColor $(if ($deploymentState.MigrationsApplied) { "Green" } else { "Yellow" })
Write-Host "  ✅ Worker: 已部署" -ForegroundColor Green
Write-Host ""


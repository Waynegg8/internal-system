# Cloudflare Worker 自動化部署腳本（非互動式）
# 設置編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ErrorActionPreference = "Stop"

Write-Host "🚀 開始自動化部署到 Cloudflare..." -ForegroundColor Green
Write-Host ""

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

# 3. 驗證遷移文件
Write-Host "3️⃣  驗證遷移文件..." -ForegroundColor Yellow
if (Test-Path "scripts\validate-migrations.js") {
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

# 4. 自動執行數據庫遷移（生產環境）
Write-Host "4️⃣  數據庫遷移..." -ForegroundColor Yellow
Write-Host "   🗄️  執行數據庫遷移（自動模式）..." -ForegroundColor Cyan

# 先檢查是否有待執行的遷移
$migrations = wrangler d1 migrations list DATABASE --remote 2>&1
if ($migrations -match "No migrations to apply") {
    Write-Host "   ✅ 沒有待執行的遷移" -ForegroundColor Green
} else {
    # 執行遷移
    wrangler d1 migrations apply DATABASE --remote
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ 數據庫遷移失敗" -ForegroundColor Red
        Write-Host "   💡 錯誤詳情已顯示在上方" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "   ✅ 數據庫遷移完成" -ForegroundColor Green
}
Write-Host ""

# 5. 部署 Worker
Write-Host "5️⃣  部署 Worker..." -ForegroundColor Yellow
wrangler deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ 部署失敗" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Worker 部署成功" -ForegroundColor Green
Write-Host ""

# 6. 部署後驗證
Write-Host "6️⃣  部署後資訊..." -ForegroundColor Yellow
Write-Host "   📍 API 地址: https://horgoscpa.com/api/v2/*" -ForegroundColor Cyan
Write-Host "   💡 建議測試以下端點:" -ForegroundColor Cyan
Write-Host "      - GET  https://horgoscpa.com/api/v2/health" -ForegroundColor Gray
Write-Host "      - POST https://horgoscpa.com/api/v2/auth/login" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ 自動化部署完成！" -ForegroundColor Green






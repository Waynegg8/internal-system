# 完整自動化部署腳本（前端 + 後端）
# 使用 Wrangler CLI 進行 Cloudflare 部署
# 注意：Cloudflare 沒有官方的 MCP 伺服器，必須使用 Wrangler CLI

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$projectRoot = "C:\Users\miama\Desktop\system-new"
Set-Location $projectRoot

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "    完整自動化部署流程" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Wrangler 登入狀態
Write-Host "[步驟 0/5] 檢查 Cloudflare 登入狀態..." -ForegroundColor Yellow
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
Write-Host "[步驟 1/5] 建置前端專案..." -ForegroundColor Yellow
Set-Location $projectRoot
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 前端依賴安裝失敗" -ForegroundColor Red
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 前端建置失敗" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "dist")) {
    Write-Host "✗ dist 目錄不存在" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 前端建置完成" -ForegroundColor Green
Write-Host ""

# 步驟 2: 部署前端到 Cloudflare Pages
Write-Host "[步驟 2/5] 部署前端到 Cloudflare Pages..." -ForegroundColor Yellow
Write-Host "  專案名稱: horgoscpa-internal-v2" -ForegroundColor Cyan
Write-Host "  部署目錄: dist" -ForegroundColor Cyan

npx wrangler pages deploy dist --project-name=horgoscpa-internal-v2

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 前端部署失敗" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 前端部署成功" -ForegroundColor Green
Write-Host ""

# 步驟 3: 部署後端 Worker
Write-Host "[步驟 3/5] 部署後端 Worker..." -ForegroundColor Yellow
Set-Location "$projectRoot\backend"

# 檢查後端依賴
if (-not (Test-Path "node_modules")) {
    Write-Host "  安裝後端依賴..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 後端依賴安裝失敗" -ForegroundColor Red
        exit 1
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
Write-Host "  檢查數據庫遷移..." -ForegroundColor Cyan
$migrations = npx wrangler d1 migrations list DATABASE --remote 2>&1
if ($migrations -match "No migrations to apply") {
    Write-Host "  ✓ 沒有待執行的遷移" -ForegroundColor Green
} else {
    Write-Host "  執行數據庫遷移..." -ForegroundColor Cyan
    npx wrangler d1 migrations apply DATABASE --remote
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 數據庫遷移失敗" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ 數據庫遷移完成" -ForegroundColor Green
}

# 部署 Worker
Write-Host "  部署 Worker..." -ForegroundColor Cyan
npx wrangler deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 後端部署失敗" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 後端部署成功" -ForegroundColor Green
Write-Host ""

# 步驟 4: 部署後驗證
Write-Host "[步驟 4/5] 部署後驗證..." -ForegroundColor Yellow
Write-Host "  前端地址: https://horgoscpa-internal-v2.pages.dev" -ForegroundColor Cyan
Write-Host "  後端 API: https://v2.horgoscpa.com/api/v2/*" -ForegroundColor Cyan
Write-Host ""

# 步驟 5: 測試部署
Write-Host "[步驟 5/5] 測試部署..." -ForegroundColor Yellow
Write-Host "  建議測試以下端點:" -ForegroundColor Cyan
Write-Host "    - GET  https://v2.horgoscpa.com/api/v2/health" -ForegroundColor Gray
Write-Host "    - POST https://v2.horgoscpa.com/api/v2/auth/login" -ForegroundColor Gray
Write-Host ""

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "✓ 完整部署流程完成！" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectRoot






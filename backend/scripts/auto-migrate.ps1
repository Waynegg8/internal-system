# 自動化數據庫遷移腳本
# 設置編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ErrorActionPreference = "Stop"

Write-Host "🔄 自動化數據庫遷移流程" -ForegroundColor Green
Write-Host ""

# 1. 檢查環境
Write-Host "1️⃣  檢查環境..." -ForegroundColor Yellow
try {
    $whoami = wrangler whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "未登錄"
    }
    Write-Host "   ✅ Cloudflare 已登錄" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 未登錄 Cloudflare，請先運行: wrangler login" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. 驗證遷移文件
Write-Host "2️⃣  驗證遷移文件..." -ForegroundColor Yellow
if (Test-Path "scripts\validate-migrations.js") {
    node scripts\validate-migrations.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  遷移文件驗證失敗，請檢查後再繼續" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ 遷移文件驗證通過" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  驗證腳本不存在，跳過驗證" -ForegroundColor Yellow
}
Write-Host ""

# 3. 檢查待執行的遷移
Write-Host "3️⃣  檢查待執行的遷移..." -ForegroundColor Yellow
$migrations = wrangler d1 migrations list DATABASE --remote 2>&1
if ($migrations -match "No migrations to apply") {
    Write-Host "   ✅ 沒有待執行的遷移" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ 遷移流程完成！" -ForegroundColor Green
    exit 0
}

$pendingCount = ($migrations | Select-String "Migrations to be applied" -Context 0,20 | Select-Object -First 1).Line
Write-Host "   📋 $pendingCount" -ForegroundColor Cyan
Write-Host ""

# 4. 確認執行
Write-Host "4️⃣  確認執行遷移..." -ForegroundColor Yellow
$response = Read-Host "   是否執行數據庫遷移? (y/n)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host "   ⏭️  已取消遷移" -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# 5. 執行遷移
Write-Host "5️⃣  執行數據庫遷移..." -ForegroundColor Yellow
wrangler d1 migrations apply DATABASE --remote
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ 遷移執行失敗" -ForegroundColor Red
    Write-Host "   💡 請檢查錯誤訊息並修復問題" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ 遷移執行成功" -ForegroundColor Green
Write-Host ""

# 6. 驗證遷移結果
Write-Host "6️⃣  驗證遷移結果..." -ForegroundColor Yellow
$finalCheck = wrangler d1 migrations list DATABASE --remote 2>&1
if ($finalCheck -match "No migrations to apply") {
    Write-Host "   ✅ 所有遷移已成功執行" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  仍有待執行的遷移" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✅ 自動化遷移流程完成！" -ForegroundColor Green







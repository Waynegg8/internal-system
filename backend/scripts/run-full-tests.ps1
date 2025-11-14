# 完整測試執行腳本
# 執行所有測試：數據注入、API 測試、數據完整性測試
# 設置編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ErrorActionPreference = "Stop"

Write-Host "🧪 開始執行完整測試流程..." -ForegroundColor Green
Write-Host ""

# 解析參數
$isLocal = $args -contains "--local"
$isRemote = $args -contains "--remote"
$skipSeed = $args -contains "--skip-seed"

if (-not $isLocal -and -not $isRemote) {
    Write-Host "❌ 請指定環境: --local 或 --remote" -ForegroundColor Red
    exit 1
}

$envFlag = if ($isLocal) { "本地" } else { "遠端" }
Write-Host "📌 測試環境: $envFlag" -ForegroundColor Cyan
Write-Host ""

# 1. 數據庫遷移
Write-Host "1️⃣  執行數據庫遷移..." -ForegroundColor Yellow
if ($isLocal) {
    wrangler d1 migrations apply DATABASE --local
} else {
    $response = Read-Host "   是否執行遠端數據庫遷移? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        wrangler d1 migrations apply DATABASE --remote
    }
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ 數據庫遷移失敗" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ 數據庫遷移完成" -ForegroundColor Green
Write-Host ""

# 2. 注入測試數據
if (-not $skipSeed) {
    Write-Host "2️⃣  注入測試數據..." -ForegroundColor Yellow
    if ($isLocal) {
        node scripts/seed-test-data.js --local
    } else {
        node scripts/seed-test-data.js --remote
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ 測試數據注入失敗" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ 測試數據注入完成" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "2️⃣  跳過測試數據注入 (--skip-seed)" -ForegroundColor Yellow
    Write-Host ""
}

# 3. API 端點測試
Write-Host "3️⃣  執行 API 端點測試..." -ForegroundColor Yellow
if ($isLocal) {
    node scripts/test-api-endpoints.js --local
} else {
    node scripts/test-api-endpoints.js --remote
}
$apiTestResult = $LASTEXITCODE
if ($apiTestResult -ne 0) {
    Write-Host "   ⚠️  API 測試有失敗項目" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ API 測試全部通過" -ForegroundColor Green
}
Write-Host ""

# 4. 數據完整性測試
Write-Host "4️⃣  執行數據完整性測試..." -ForegroundColor Yellow
if ($isLocal) {
    node scripts/test-data-integrity.js --local
} else {
    node scripts/test-data-integrity.js --remote
}
$integrityTestResult = $LASTEXITCODE
if ($integrityTestResult -ne 0) {
    Write-Host "   ⚠️  數據完整性測試有失敗項目" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ 數據完整性測試全部通過" -ForegroundColor Green
}
Write-Host ""

# 5. 生成總結報告
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "測試總結" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "環境: $envFlag" -ForegroundColor White
Write-Host "API 測試: $(if ($apiTestResult -eq 0) { '✅ 通過' } else { '❌ 失敗' })" -ForegroundColor $(if ($apiTestResult -eq 0) { 'Green' } else { 'Red' })
Write-Host "數據完整性測試: $(if ($integrityTestResult -eq 0) { '✅ 通過' } else { '❌ 失敗' })" -ForegroundColor $(if ($integrityTestResult -eq 0) { 'Green' } else { 'Red' })
Write-Host ""

$overallSuccess = ($apiTestResult -eq 0) -and ($integrityTestResult -eq 0)
if ($overallSuccess) {
    Write-Host "✅ 所有測試通過！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ 部分測試失敗，請檢查上述錯誤" -ForegroundColor Red
    exit 1
}






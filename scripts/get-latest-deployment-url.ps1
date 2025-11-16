# 獲取最新的 Cloudflare Pages 部署 URL
# 用於 Playwright 測試配置

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$projectName = "horgoscpa-internal-v2"
$deploymentUrl = "https://v2.horgoscpa.com"

Write-Host "使用正式環境 URL（production branch）" -ForegroundColor Yellow
Write-Host "✓ 部署 URL: $deploymentUrl" -ForegroundColor Green
Write-Host ""
Write-Host "設定環境變數並執行測試:" -ForegroundColor Cyan
Write-Host "  `$env:PLAYWRIGHT_BASE_URL=`"$deploymentUrl`"; `$env:ENFORCE_PROD=`"1`"; npm test" -ForegroundColor White
Write-Host ""

# 設定環境變數（僅在當前 PowerShell 會話中有效）
$env:PLAYWRIGHT_BASE_URL = $deploymentUrl
$env:ENFORCE_PROD = "1"
Write-Host "✓ 已設定環境變數 PLAYWRIGHT_BASE_URL / ENFORCE_PROD" -ForegroundColor Green
Write-Host ""

# 詢問是否立即執行測試
$response = Read-Host "是否立即執行測試? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "執行測試..." -ForegroundColor Yellow
    npm test
}



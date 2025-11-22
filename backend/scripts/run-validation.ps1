# 數據庫遷移驗證腳本（PowerShell）
# 設置正確的編碼以顯示繁體中文

# 設置控制台編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# 執行驗證腳本
node scripts/validate-migrations.js

# 如果報告文件存在，顯示內容
if (Test-Path "MIGRATION_VALIDATION_REPORT.txt") {
    Write-Host "`n驗證報告內容：`n" -ForegroundColor Green
    Get-Content "MIGRATION_VALIDATION_REPORT.txt" -Encoding UTF8
}













# 數據庫遷移整合腳本（PowerShell）
# 設置正確的編碼以顯示繁體中文

# 設置控制台編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# 執行整合腳本
node scripts/consolidate-migrations.js







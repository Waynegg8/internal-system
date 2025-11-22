# 設置 UTF-8 編碼以正確顯示中文
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# 獲取測試文件參數（如果提供）
$testFile = $args[0]

# 構建測試命令
if ($testFile) {
    $testCommand = "npx playwright test `"$testFile`" --reporter=list --workers=1 --timeout=120000"
} else {
    $testCommand = "npx playwright test --reporter=list --workers=1 --timeout=120000"
}

# 執行測試
Write-Host "開始執行測試..." -ForegroundColor Cyan
Invoke-Expression $testCommand

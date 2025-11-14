# MCP 自動設定腳本
# 此腳本會自動設定 Context7 和 Cloudflare API Token

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   MCP 自動設定腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Cursor MCP 設定檔案位置
$mcpConfigPaths = @(
    "$env:APPDATA\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json",
    "$env:APPDATA\Cursor\User\settings\mcp.json",
    "$env:APPDATA\Cursor\mcp.json"
)

$mcpConfigPath = $null
foreach ($path in $mcpConfigPaths) {
    if (Test-Path $path) {
        $mcpConfigPath = $path
        Write-Host "✓ 找到 Cursor MCP 設定檔案: $path" -ForegroundColor Green
        break
    }
}

if (-not $mcpConfigPath) {
    Write-Host "⚠ 未找到現有的 MCP 設定檔案，將建立新的設定檔案" -ForegroundColor Yellow
    $mcpConfigPath = $mcpConfigPaths[0]
    $configDir = Split-Path $mcpConfigPath -Parent
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
}

# 讀取專案中的 MCP 配置
$projectConfigPath = Join-Path $PSScriptRoot "..\.cursor\mcp-config.json"
if (-not (Test-Path $projectConfigPath)) {
    Write-Host "✗ 錯誤: 找不到專案配置檔案: $projectConfigPath" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 讀取專案配置檔案: $projectConfigPath" -ForegroundColor Green
$projectConfigJson = Get-Content $projectConfigPath -Raw
$projectConfig = $projectConfigJson | ConvertFrom-Json

# 讀取或建立 Cursor MCP 設定檔案
$cursorConfig = New-Object PSObject

if (Test-Path $mcpConfigPath) {
    try {
        $existingJson = Get-Content $mcpConfigPath -Raw
        $existingConfig = $existingJson | ConvertFrom-Json
        if ($existingConfig.mcpServers) {
            $cursorConfig | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value $existingConfig.mcpServers
        } else {
            $cursorConfig | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value (New-Object PSObject)
        }
        if ($existingConfig.env) {
            $cursorConfig | Add-Member -MemberType NoteProperty -Name "env" -Value $existingConfig.env
        } else {
            $cursorConfig | Add-Member -MemberType NoteProperty -Name "env" -Value (New-Object PSObject)
        }
        Write-Host "✓ 讀取現有 Cursor 設定檔案" -ForegroundColor Green
    } catch {
        Write-Host "⚠ 無法解析現有設定檔案，將建立新設定" -ForegroundColor Yellow
        $cursorConfig | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value (New-Object PSObject)
        $cursorConfig | Add-Member -MemberType NoteProperty -Name "env" -Value (New-Object PSObject)
    }
} else {
    $cursorConfig | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value (New-Object PSObject)
    $cursorConfig | Add-Member -MemberType NoteProperty -Name "env" -Value (New-Object PSObject)
}

# 合併 Context7 設定
if ($projectConfig.mcpServers.context7) {
    $cursorConfig.mcpServers | Add-Member -MemberType NoteProperty -Name "context7" -Value $projectConfig.mcpServers.context7 -Force
    Write-Host "✓ 設定 Context7 MCP" -ForegroundColor Green
} else {
    Write-Host "⚠ 專案配置中沒有 Context7 設定" -ForegroundColor Yellow
}

# 合併 Tesseract OCR 設定（免費開源）
if ($projectConfig.mcpServers."tesseract-ocr") {
    $cursorConfig.mcpServers | Add-Member -MemberType NoteProperty -Name "tesseract-ocr" -Value $projectConfig.mcpServers."tesseract-ocr" -Force
    Write-Host "✓ 設定 Tesseract OCR MCP（免費開源）" -ForegroundColor Green
} else {
    Write-Host "⚠ 專案配置中沒有 Tesseract OCR 設定" -ForegroundColor Yellow
}

# 合併環境變數
if ($projectConfig.env) {
    if (-not $cursorConfig.env) {
        $cursorConfig.env = New-Object PSObject
    }
    if ($projectConfig.env.CLOUDFLARE_API_TOKEN) {
        $cursorConfig.env | Add-Member -MemberType NoteProperty -Name "CLOUDFLARE_API_TOKEN" -Value $projectConfig.env.CLOUDFLARE_API_TOKEN -Force
        Write-Host "✓ 設定環境變數: CLOUDFLARE_API_TOKEN" -ForegroundColor Green
    }
    if ($projectConfig.env.CLOUDFLARE_ACCOUNT_ID) {
        $cursorConfig.env | Add-Member -MemberType NoteProperty -Name "CLOUDFLARE_ACCOUNT_ID" -Value $projectConfig.env.CLOUDFLARE_ACCOUNT_ID -Force
        Write-Host "✓ 設定環境變數: CLOUDFLARE_ACCOUNT_ID" -ForegroundColor Green
    }
}

# 儲存設定檔案
try {
    $jsonContent = $cursorConfig | ConvertTo-Json -Depth 10
    $jsonContent | Set-Content $mcpConfigPath -Encoding UTF8
    Write-Host ""
    Write-Host "✓ 成功更新 Cursor MCP 設定檔案: $mcpConfigPath" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "✗ 錯誤: 無法寫入設定檔案: $_" -ForegroundColor Red
    exit 1
}

# 設定系統環境變數（Cloudflare）
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   設定系統環境變數" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($projectConfig.env.CLOUDFLARE_API_TOKEN) {
    $token = $projectConfig.env.CLOUDFLARE_API_TOKEN
    try {
        [System.Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", $token, "User")
        Write-Host "✓ 設定系統環境變數: CLOUDFLARE_API_TOKEN" -ForegroundColor Green
    } catch {
        Write-Host "⚠ 無法設定系統環境變數 CLOUDFLARE_API_TOKEN: $_" -ForegroundColor Yellow
        Write-Host "  請手動設定: `$env:CLOUDFLARE_API_TOKEN='$token'" -ForegroundColor Yellow
    }
}

if ($projectConfig.env.CLOUDFLARE_ACCOUNT_ID) {
    $accountId = $projectConfig.env.CLOUDFLARE_ACCOUNT_ID
    try {
        [System.Environment]::SetEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID", $accountId, "User")
        Write-Host "✓ 設定系統環境變數: CLOUDFLARE_ACCOUNT_ID" -ForegroundColor Green
    } catch {
        Write-Host "⚠ 無法設定系統環境變數 CLOUDFLARE_ACCOUNT_ID: $_" -ForegroundColor Yellow
        Write-Host "  請手動設定: `$env:CLOUDFLARE_ACCOUNT_ID='$accountId'" -ForegroundColor Yellow
    }
}

# 設定當前 PowerShell 會話的環境變數
if ($projectConfig.env.CLOUDFLARE_API_TOKEN) {
    $env:CLOUDFLARE_API_TOKEN = $projectConfig.env.CLOUDFLARE_API_TOKEN
}
if ($projectConfig.env.CLOUDFLARE_ACCOUNT_ID) {
    $env:CLOUDFLARE_ACCOUNT_ID = $projectConfig.env.CLOUDFLARE_ACCOUNT_ID
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   設定完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "已完成的設定:" -ForegroundColor Green
Write-Host "  ✓ Context7 MCP 已設定" -ForegroundColor Green
if ($projectConfig.mcpServers."tesseract-ocr") {
    Write-Host "  ✓ Tesseract OCR MCP 已設定（免費開源）" -ForegroundColor Green
}
Write-Host "  ✓ Cloudflare API Token 已設定" -ForegroundColor Green
Write-Host "  ✓ Cloudflare Account ID 已設定" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  1. 執行 'npm install' 安裝 MCP SDK 和 Tesseract.js 依賴" -ForegroundColor Yellow
Write-Host "  2. 完全關閉並重新啟動 Cursor 編輯器" -ForegroundColor Yellow
Write-Host "  3. 在對話中使用 'use context7' 來測試 Context7 功能" -ForegroundColor Yellow
Write-Host "  4. 上傳圖片並要求 AI 辨識文字來測試 Tesseract OCR 功能（完全免費）" -ForegroundColor Yellow
Write-Host "  5. 執行 'npx wrangler whoami' 來驗證 Cloudflare 設定" -ForegroundColor Yellow
Write-Host ""
Write-Host "設定檔案位置: $mcpConfigPath" -ForegroundColor Gray
Write-Host ""

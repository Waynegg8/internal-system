# MCP 自動設定腳本（簡化版）
# 此腳本會自動設定 Context7 和 Cloudflare API Token

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   MCP 自動設定腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Cursor MCP 設定檔案位置
$mcpConfigPath = "$env:APPDATA\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json"

# 確保目錄存在
$configDir = Split-Path $mcpConfigPath -Parent
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "✓ 建立設定目錄: $configDir" -ForegroundColor Green
}

# 讀取專案中的 MCP 配置
$projectConfigPath = Join-Path $PSScriptRoot "..\.cursor\mcp-config.json"
if (-not (Test-Path $projectConfigPath)) {
    Write-Host "✗ 錯誤: 找不到專案配置檔案: $projectConfigPath" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 讀取專案配置檔案: $projectConfigPath" -ForegroundColor Green

# 讀取專案配置
$projectConfigJson = Get-Content $projectConfigPath -Raw -Encoding UTF8
$projectConfig = $projectConfigJson | ConvertFrom-Json

# 讀取現有配置（如果存在）
$finalConfig = $null
if (Test-Path $mcpConfigPath) {
    try {
        $existingJson = Get-Content $mcpConfigPath -Raw -Encoding UTF8
        $existingConfig = $existingJson | ConvertFrom-Json
        $finalConfig = $existingConfig
        Write-Host "✓ 讀取現有 Cursor 設定檔案" -ForegroundColor Green
    } catch {
        Write-Host "⚠ 無法解析現有設定檔案，將建立新設定" -ForegroundColor Yellow
        $finalConfig = @{
            mcpServers = @{}
            env = @{}
        } | ConvertTo-Json | ConvertFrom-Json
    }
} else {
    $finalConfig = @{
        mcpServers = @{}
        env = @{}
    } | ConvertTo-Json | ConvertFrom-Json
}

# 合併 Context7 設定
if ($projectConfig.mcpServers.context7) {
    if (-not $finalConfig.mcpServers) {
        $finalConfig | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value @{} -Force
    }
    $finalConfig.mcpServers.context7 = $projectConfig.mcpServers.context7
    Write-Host "✓ 設定 Context7 MCP" -ForegroundColor Green
}

# 合併環境變數
if ($projectConfig.env) {
    if (-not $finalConfig.env) {
        $finalConfig | Add-Member -MemberType NoteProperty -Name "env" -Value @{} -Force
    }
    if ($projectConfig.env.CLOUDFLARE_API_TOKEN) {
        $finalConfig.env.CLOUDFLARE_API_TOKEN = $projectConfig.env.CLOUDFLARE_API_TOKEN
        Write-Host "✓ 設定環境變數: CLOUDFLARE_API_TOKEN" -ForegroundColor Green
    }
    if ($projectConfig.env.CLOUDFLARE_ACCOUNT_ID) {
        $finalConfig.env.CLOUDFLARE_ACCOUNT_ID = $projectConfig.env.CLOUDFLARE_ACCOUNT_ID
        Write-Host "✓ 設定環境變數: CLOUDFLARE_ACCOUNT_ID" -ForegroundColor Green
    }
}

# 儲存設定檔案
try {
    $jsonContent = $finalConfig | ConvertTo-Json -Depth 10
    $jsonContent | Set-Content $mcpConfigPath -Encoding UTF8
    Write-Host ""
    Write-Host "✓ 成功更新 Cursor MCP 設定檔案: $mcpConfigPath" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "✗ 錯誤: 無法寫入設定檔案: $_" -ForegroundColor Red
    Write-Host "錯誤詳情: $($_.Exception.Message)" -ForegroundColor Red
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
    }
}

if ($projectConfig.env.CLOUDFLARE_ACCOUNT_ID) {
    $accountId = $projectConfig.env.CLOUDFLARE_ACCOUNT_ID
    try {
        [System.Environment]::SetEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID", $accountId, "User")
        Write-Host "✓ 設定系統環境變數: CLOUDFLARE_ACCOUNT_ID" -ForegroundColor Green
    } catch {
        Write-Host "⚠ 無法設定系統環境變數 CLOUDFLARE_ACCOUNT_ID: $_" -ForegroundColor Yellow
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
Write-Host "  ✓ Cloudflare API Token 已設定" -ForegroundColor Green
Write-Host "  ✓ Cloudflare Account ID 已設定" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  1. 完全關閉並重新啟動 Cursor 編輯器" -ForegroundColor Yellow
Write-Host "  2. 在對話中使用 'use context7' 來測試 Context7 功能" -ForegroundColor Yellow
Write-Host "  3. 執行 'npx wrangler whoami' 來驗證 Cloudflare 設定" -ForegroundColor Yellow
Write-Host ""
Write-Host "設定檔案位置: $mcpConfigPath" -ForegroundColor Gray
Write-Host ""













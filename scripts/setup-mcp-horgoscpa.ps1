# Horgoscpa MCP 設定腳本
# 將 Horgoscpa 資料庫 MCP 橋接器加入到 Cursor 的 MCP 配置中

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "   Horgoscpa MCP 設定腳本" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Cursor MCP 設定檔案位置（兩個可能的位置）
$mcpConfigPath1 = "$env:APPDATA\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json"
$mcpConfigPath2 = "$env:USERPROFILE\.cursor\mcp.json"
$mcpConfigPath = $mcpConfigPath1

if (-not (Test-Path $mcpConfigPath)) {
    Write-Host "WARN: 未找到 Cursor MCP 設定檔案，建立新檔案..." -ForegroundColor Yellow
    $configDir = Split-Path $mcpConfigPath -Parent
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    $defaultConfig = @{
        mcpServers = @{}
    } | ConvertTo-Json -Depth 10
    $defaultConfig | Set-Content $mcpConfigPath -Encoding UTF8
}

# 讀取專案中的 MCP 配置
$projectRoot = Split-Path $PSScriptRoot -Parent
$projectConfigPath = Join-Path $projectRoot ".cursor\mcp-config-horgoscpa.json"

if (-not (Test-Path $projectConfigPath)) {
    Write-Host "ERROR: 找不到專案 MCP 配置檔案: $projectConfigPath" -ForegroundColor Red
    exit 1
}

$projectConfig = Get-Content $projectConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json

# 讀取或建立 Cursor MCP 設定檔案
$cursorConfig = @{}
if (Test-Path $mcpConfigPath) {
    try {
        $existingJson = Get-Content $mcpConfigPath -Raw -Encoding UTF8
        $existingConfig = $existingJson | ConvertFrom-Json
        if ($existingConfig.mcpServers) {
            $cursorConfig = @{
                mcpServers = $existingConfig.mcpServers
            }
        } else {
            $cursorConfig = @{
                mcpServers = @{}
            }
        }
    } catch {
        Write-Host "WARN: 無法讀取現有配置，建立新配置..." -ForegroundColor Yellow
        $cursorConfig = @{
            mcpServers = @{}
        }
    }
} else {
    $cursorConfig = @{
        mcpServers = @{}
    }
}

# 合併所有 Horgoscpa MCP 配置
if (-not $cursorConfig.mcpServers) {
    $cursorConfig.mcpServers = @{}
}

$configuredServers = @()

# 設定 horgoscpa-database
if ($projectConfig.mcpServers."horgoscpa-database") {
    $cursorConfig.mcpServers."horgoscpa-database" = $projectConfig.mcpServers."horgoscpa-database"
    $configuredServers += "horgoscpa-database"
    Write-Host "OK: 設定 Horgoscpa 資料庫 MCP 橋接器" -ForegroundColor Green
}

# 設定 horgoscpa-logs
if ($projectConfig.mcpServers."horgoscpa-logs") {
    $cursorConfig.mcpServers."horgoscpa-logs" = $projectConfig.mcpServers."horgoscpa-logs"
    $configuredServers += "horgoscpa-logs"
    Write-Host "OK: 設定 Horgoscpa 日誌 MCP 橋接器" -ForegroundColor Green
}

# 設定 cloudflare-management
$cloudflareMgmt = "cloudflare-management"
if ($projectConfig.mcpServers.$cloudflareMgmt) {
    $cursorConfig.mcpServers.$cloudflareMgmt = $projectConfig.mcpServers.$cloudflareMgmt
    $configuredServers += "cloudflare-management"
    Write-Host "OK: 設定 Cloudflare 管理 MCP 橋接器" -ForegroundColor Green
}

# 設定 spec-workflow
$projectRoot = Split-Path $PSScriptRoot -Parent
$specWorkflowConfig = @{
    command = "npx"
    args = @(
        "-y",
        "@pimzino/spec-workflow-mcp@latest",
        $projectRoot
    )
}
$cursorConfig.mcpServers."spec-workflow" = $specWorkflowConfig
$configuredServers += "spec-workflow"
Write-Host "OK: 設定 Spec Workflow MCP 橋接器" -ForegroundColor Green

if ($configuredServers.Count -eq 0) {
    Write-Host "WARN: 專案配置中沒有找到任何 Horgoscpa MCP 配置" -ForegroundColor Yellow
}

# 寫入設定檔案（兩個位置都更新）
try {
    $jsonContent = $cursorConfig | ConvertTo-Json -Depth 10
    
    # 更新第一個位置
    if (Test-Path (Split-Path $mcpConfigPath1 -Parent)) {
        $jsonContent | Set-Content $mcpConfigPath1 -Encoding UTF8
        Write-Host "OK: 成功更新 Cursor MCP 設定檔案: $mcpConfigPath1" -ForegroundColor Green
    }
    
    # 更新第二個位置（.cursor/mcp.json）
    $mcpConfigDir2 = Split-Path $mcpConfigPath2 -Parent
    if (-not (Test-Path $mcpConfigDir2)) {
        New-Item -ItemType Directory -Path $mcpConfigDir2 -Force | Out-Null
    }
    $jsonContent | Set-Content $mcpConfigPath2 -Encoding UTF8
    Write-Host "OK: 成功更新 Cursor MCP 設定檔案: $mcpConfigPath2" -ForegroundColor Green
} catch {
    Write-Host "ERROR: 寫入設定檔案失敗: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   設定完成" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "已設定的 MCP 伺服器:" -ForegroundColor Yellow
if ($cursorConfig.mcpServers) {
    foreach ($serverName in $cursorConfig.mcpServers.PSObject.Properties.Name) {
        Write-Host "  OK: $serverName" -ForegroundColor Green
    }
} else {
    Write-Host "  (無)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host '  1. Completely close and restart Cursor editor' -ForegroundColor White
Write-Host '  2. After restart, MCP servers will be available' -ForegroundColor White
Write-Host ""

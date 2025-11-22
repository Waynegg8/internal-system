$configPath = "$env:APPDATA\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json"

Write-Host "Checking MCP Configuration..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path $configPath) {
    Write-Host "Config file exists: $configPath" -ForegroundColor Green
    Write-Host ""
    
    $content = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    
    if ($content.mcpServers) {
        Write-Host "MCP Servers configured:" -ForegroundColor Yellow
        $content.mcpServers.PSObject.Properties.Name | ForEach-Object {
            $server = $content.mcpServers.$_
            Write-Host "  - $_" -ForegroundColor Green
            Write-Host "    Command: $($server.command)" -ForegroundColor Gray
            Write-Host "    Args: $($server.args -join ' ')" -ForegroundColor Gray
            if ($server.env) {
                Write-Host "    Env vars: $($server.env.PSObject.Properties.Name.Count) variables" -ForegroundColor Gray
            }
        }
        Write-Host ""
        Write-Host "Total servers: $($content.mcpServers.PSObject.Properties.Name.Count)" -ForegroundColor Cyan
    } else {
        Write-Host "No MCP servers found in config" -ForegroundColor Red
    }
} else {
    Write-Host "Config file not found: $configPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run the setup script first:" -ForegroundColor Yellow
    Write-Host "  .\scripts\setup-mcp-horgoscpa.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "Note: Cursor must be restarted for MCP changes to take effect" -ForegroundColor Yellow










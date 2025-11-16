# 獲取最新的 Cloudflare Pages 部署 URL
# 用於 Playwright 測試配置

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$projectName = "horgoscpa-internal-v2"

Write-Host "正在獲取最新的部署 URL..." -ForegroundColor Yellow

try {
    # 獲取最新的部署列表
    $deployments = npx wrangler pages deployment list --project-name=$projectName --json 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 無法獲取部署列表" -ForegroundColor Red
        Write-Host "   請確認已登入 Cloudflare: npx wrangler login" -ForegroundColor Yellow
        exit 1
    }
    
    # 解析 JSON（取第一行，因為 wrangler 可能輸出多行）
    $deploymentsJson = $deployments | Select-Object -First 1 | ConvertFrom-Json
    
    if ($deploymentsJson -and $deploymentsJson.Count -gt 0) {
        $latestDeployment = $deploymentsJson[0]
        $deploymentUrl = $latestDeployment.url
        
        Write-Host "✓ 找到最新部署 URL: $deploymentUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "設定環境變數並執行測試:" -ForegroundColor Cyan
        Write-Host "  `$env:PLAYWRIGHT_BASE_URL=`"$deploymentUrl`"; npm test" -ForegroundColor White
        Write-Host ""
        
        # 設定環境變數（僅在當前 PowerShell 會話中有效）
        $env:PLAYWRIGHT_BASE_URL = $deploymentUrl
        Write-Host "✓ 已設定環境變數 PLAYWRIGHT_BASE_URL" -ForegroundColor Green
        Write-Host ""
        
        # 詢問是否立即執行測試
        $response = Read-Host "是否立即執行測試? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            Write-Host "執行測試..." -ForegroundColor Yellow
            npm test
        }
    } else {
        Write-Host "❌ 未找到部署記錄" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 錯誤: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "手動設定方式:" -ForegroundColor Yellow
    Write-Host "  `$env:PLAYWRIGHT_BASE_URL=`"https://xxx.pages.dev`"; npm test" -ForegroundColor White
    exit 1
}



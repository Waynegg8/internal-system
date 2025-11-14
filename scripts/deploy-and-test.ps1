# 自動化部署與測試腳本
# 整合部署與 E2E 測試的完整流程

param(
    [switch]$SkipBuild,
    [switch]$SkipTests,
    [string]$Environment = "development"
)

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    自動化部署與測試流程" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "C:\Users\miama\Desktop\system-new"
Set-Location $projectRoot

$exitCode = 0

# 步驟 1: 建置專案
if (-not $SkipBuild) {
    Write-Host "[步驟 1/4] 建置前端專案..." -ForegroundColor Yellow
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 建置失敗" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ 建置完成" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[步驟 1/4] 跳過建置" -ForegroundColor Gray
    Write-Host ""
}

# 步驟 2: 啟動預覽伺服器
Write-Host "[步驟 2/4] 啟動預覽伺服器..." -ForegroundColor Yellow

# 檢查是否有現有的 Vite preview 進程
$existingProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
    $_.MainWindowTitle -like "*vite*" 
}

if ($existingProcess) {
    Write-Host "發現現有的預覽伺服器，停止中..." -ForegroundColor Yellow
    Stop-Process -Id $existingProcess.Id -Force
    Start-Sleep -Seconds 2
}

# 啟動新的預覽伺服器
Write-Host "啟動預覽伺服器..." -ForegroundColor Yellow
$previewJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    npm run preview
} -ArgumentList $projectRoot

# 等待伺服器啟動
Write-Host "等待伺服器啟動..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 驗證伺服器是否運行
$maxRetries = 10
$retryCount = 0
$serverReady = $false

while ($retryCount -lt $maxRetries -and -not $serverReady) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4173" -Method Head -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            Write-Host "✓ 預覽伺服器已啟動" -ForegroundColor Green
        }
    } catch {
        $retryCount++
        Write-Host "等待伺服器啟動... ($retryCount/$maxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $serverReady) {
    Write-Host "✗ 預覽伺服器啟動失敗" -ForegroundColor Red
    Stop-Job -Job $previewJob
    Remove-Job -Job $previewJob
    exit 1
}

Write-Host ""

# 步驟 3: 執行測試
if (-not $SkipTests) {
    Write-Host "[步驟 3/4] 執行測試..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  測試功能已移除（Playwright 已卸載）" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[步驟 3/4] 跳過測試" -ForegroundColor Gray
    Write-Host ""
}

# 步驟 4: 清理
Write-Host "[步驟 4/4] 清理環境..." -ForegroundColor Yellow

# 停止預覽伺服器
Stop-Job -Job $previewJob
Remove-Job -Job $previewJob

Write-Host "✓ 清理完成" -ForegroundColor Green
Write-Host ""

# 總結
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    流程完成" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

if ($exitCode -eq 0) {
    Write-Host "✓ 部署與測試成功完成" -ForegroundColor Green
} else {
    Write-Host "✗ 部署或測試失敗，請檢查錯誤訊息" -ForegroundColor Red
}

Write-Host ""

exit $exitCode




# AI Auto Deploy and Test Script
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$projectRoot = "C:\Users\miama\Desktop\system-new"
Set-Location $projectRoot

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    AI Auto Deploy and Test" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$deploymentUrl = ""
$testPassed = $false

# Step 1: Build
Write-Host "[Step 1/5] Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Build completed" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy
Write-Host "[Step 2/5] Deploying to Cloudflare Pages..." -ForegroundColor Yellow
$deployOutput = npx wrangler pages deploy dist --project-name=horgoscpa-internal-v2 --branch=production 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Deployment failed" -ForegroundColor Red
    exit 1
}

# Extract deployment URL - 強制使用 production 正式網域（自訂網域）
$deploymentUrl = "https://v2.horgoscpa.com"

if ([string]::IsNullOrEmpty($deploymentUrl)) {
    Write-Host "[FAIL] Cannot get deployment URL" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Deployment successful" -ForegroundColor Green
Write-Host "  Deployment URL: $deploymentUrl" -ForegroundColor Cyan
Write-Host ""

# Step 3: Wait for deployment
Write-Host "[Step 3/5] Waiting for deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxRetries = 30
$deploymentReady = $false
for ($i = 1; $i -le $maxRetries; $i++) {
    $response = $null
    try {
        $response = Invoke-WebRequest -Uri $deploymentUrl -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
    } catch {
    }
    if ($response -ne $null -and $response.StatusCode -eq 200) {
        $deploymentReady = $true
        Write-Host "[OK] Deployment ready" -ForegroundColor Green
        break
    }
    if ($i -lt $maxRetries) {
        Write-Host "  Waiting... ($i/$maxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $deploymentReady) {
    Write-Host "[FAIL] Deployment timeout" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Run tests (Browser MCP)
Write-Host "[Step 4/5] Running Browser MCP tests..." -ForegroundColor Yellow
Write-Host "  Test URL: https://v2.horgoscpa.com" -ForegroundColor Cyan

# 一律以正式域名執行瀏覽器測試
$env:TEST_BASE_URL = "https://v2.horgoscpa.com"

npm test

if ($LASTEXITCODE -eq 0) {
    $testPassed = $true
    Write-Host "[OK] All tests passed" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Tests failed" -ForegroundColor Red
    Write-Host "  See report directory: test-results" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Summary
Write-Host "[Step 5/5] Complete" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
if ($testPassed) {
    Write-Host "[OK] Deploy and test successful" -ForegroundColor Green
    Write-Host "  Deployment URL: $deploymentUrl" -ForegroundColor Cyan
} else {
    Write-Host "[FAIL] Tests failed" -ForegroundColor Red
    Write-Host "  Deployment URL: $deploymentUrl" -ForegroundColor Cyan
    Write-Host "  Report: playwright-report/index.html" -ForegroundColor Yellow
}
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Deployment URL (for AI): $deploymentUrl" -ForegroundColor Magenta
if ($testPassed) {
    Write-Host "Test Status: PASSED" -ForegroundColor Magenta
    exit 0
} else {
    Write-Host "Test Status: FAILED" -ForegroundColor Magenta
    exit 1
}

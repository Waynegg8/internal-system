# Frontend Deployment Script - Cloudflare Pages
# Usage: .\scripts\deploy-frontend.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "`nDeploying Frontend to Cloudflare Pages..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan

# Check if in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Please run this script from project root" -ForegroundColor Red
    exit 1
}

# 1. Install dependencies
Write-Host "`nStep 1: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Dependency installation failed" -ForegroundColor Red
    exit 1
}

# 2. Build project
Write-Host "`nStep 2: Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Build failed" -ForegroundColor Red
    exit 1
}

# 3. Check build result
if (-not (Test-Path "dist")) {
    Write-Host "Error: dist directory does not exist" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green
$distFiles = (Get-ChildItem -Path "dist" -Recurse -File).Count
Write-Host "  Build files count: $distFiles" -ForegroundColor Cyan

# 4. Deploy to Cloudflare Pages
Write-Host "`nStep 3: Deploying to Cloudflare Pages..." -ForegroundColor Yellow
Write-Host "  Project name: horgoscpa-internal-v2" -ForegroundColor Cyan
Write-Host "  Deploy directory: dist" -ForegroundColor Cyan
Write-Host "`n  Note: This step requires Cloudflare login" -ForegroundColor Yellow
Write-Host "  If not logged in, run: npx wrangler login" -ForegroundColor Yellow
Write-Host "`n  Deploying..." -ForegroundColor Yellow

npx wrangler pages deploy dist --project-name=horgoscpa-internal-v2

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeployment successful!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "  1. Configure custom domain in Cloudflare Dashboard" -ForegroundColor White
    Write-Host "  2. Add CNAME record: v2.horgoscpa.com -> [Your Pages domain]" -ForegroundColor White
    Write-Host "  3. Visit: https://v2.horgoscpa.com/login" -ForegroundColor White
} else {
    Write-Host "`nDeployment failed" -ForegroundColor Red
    Write-Host "  Please check error messages and retry" -ForegroundColor Yellow
    exit 1
}


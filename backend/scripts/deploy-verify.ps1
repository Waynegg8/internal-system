# 部署後驗證腳本
# 設置編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ErrorActionPreference = "Continue"

Write-Host "🔍 開始部署後驗證..." -ForegroundColor Green
Write-Host ""

$baseUrl = "https://horgoscpa.com/api/v2"
$errors = 0
$warnings = 0

# 1. 檢查健康檢查端點
Write-Host "1️⃣  檢查健康檢查端點..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ 健康檢查通過 (HTTP $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  健康檢查返回非 200 狀態碼: $($response.StatusCode)" -ForegroundColor Yellow
        $warnings++
    }
} catch {
    Write-Host "   ❌ 健康檢查失敗: $($_.Exception.Message)" -ForegroundColor Red
    $errors++
}
Write-Host ""

# 2. 檢查 API 路由
Write-Host "2️⃣  檢查 API 路由..." -ForegroundColor Yellow
$testRoutes = @(
    "/auth/login",
    "/clients",
    "/dashboard"
)

foreach ($route in $testRoutes) {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$route" -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
        # 401 或 403 是正常的（需要認證）
        if ($response.StatusCode -in @(200, 401, 403)) {
            Write-Host "   ✅ $route 可訪問 (HTTP $($response.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $route 返回異常狀態碼: $($response.StatusCode)" -ForegroundColor Yellow
            $warnings++
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -in @(401, 403)) {
            Write-Host "   ✅ $route 可訪問 (HTTP $statusCode - 需要認證)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $route 無法訪問: $($_.Exception.Message)" -ForegroundColor Red
            $errors++
        }
    }
}
Write-Host ""

# 3. 檢查 Worker 狀態
Write-Host "3️⃣  檢查 Worker 狀態..." -ForegroundColor Yellow
try {
    $status = wrangler deployments list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Worker 狀態正常" -ForegroundColor Green
        Write-Host "   $status" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  無法獲取 Worker 狀態" -ForegroundColor Yellow
        $warnings++
    }
} catch {
    Write-Host "   ⚠️  檢查 Worker 狀態時出錯: $($_.Exception.Message)" -ForegroundColor Yellow
    $warnings++
}
Write-Host ""

# 4. 檢查數據庫連接
Write-Host "4️⃣  檢查數據庫連接..." -ForegroundColor Yellow
try {
    $dbCheck = wrangler d1 execute DATABASE --remote --command "SELECT 1 as test" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ 數據庫連接正常" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  數據庫連接檢查失敗" -ForegroundColor Yellow
        $warnings++
    }
} catch {
    Write-Host "   ⚠️  檢查數據庫連接時出錯: $($_.Exception.Message)" -ForegroundColor Yellow
    $warnings++
}
Write-Host ""

# 總結
Write-Host "=" * 60
Write-Host "驗證總結" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host "錯誤: $errors" -ForegroundColor $(if ($errors -eq 0) { "Green" } else { "Red" })
Write-Host "警告: $warnings" -ForegroundColor $(if ($warnings -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($errors -eq 0) {
    Write-Host "✅ 部署驗證通過！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ 部署驗證失敗，發現 $errors 個錯誤" -ForegroundColor Red
    exit 1
}






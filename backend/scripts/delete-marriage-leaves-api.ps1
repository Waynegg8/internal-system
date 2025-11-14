# 刪除婚假記錄的 API 調用腳本
# 注意：此腳本需要在已登入的瀏覽器會話中執行，或需要提供認證 token

$apiUrl = "https://v2.horgoscpa.com/api/v2/admin/delete-marriage-leaves"

Write-Host "正在調用 API 刪除婚假記錄..." -ForegroundColor Yellow
Write-Host "API URL: $apiUrl" -ForegroundColor Gray

try {
    # 使用 Invoke-WebRequest 調用 API
    # 注意：此腳本需要瀏覽器會話 cookie，建議在瀏覽器控制台中執行
    $response = Invoke-WebRequest -Uri $apiUrl -Method DELETE -UseBasicParsing -ErrorAction Stop
    
    Write-Host "`n✓ 請求成功！" -ForegroundColor Green
    Write-Host "狀態碼: $($response.StatusCode)" -ForegroundColor Green
    
    $data = $response.Content | ConvertFrom-Json
    Write-Host "`n響應內容:" -ForegroundColor Cyan
    $data | ConvertTo-Json -Depth 10
    
    if ($data.ok -eq $true) {
        $deletedCount = $data.data.deleted
        Write-Host "`n✓ 已成功刪除 $deletedCount 筆婚假記錄" -ForegroundColor Green
    } else {
        Write-Host "`n✗ 刪除失敗: $($data.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "`n✗ 請求失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n提示：此操作需要在瀏覽器中執行，因為需要認證 cookie。" -ForegroundColor Yellow
    Write-Host "`n請在瀏覽器控制台中執行以下代碼：" -ForegroundColor Yellow
    Write-Host "fetch('$apiUrl', { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' } }).then(r => r.json()).then(data => { console.log('結果:', data); if (data.ok) { console.log('已刪除 ' + data.data.deleted + ' 筆婚假記錄'); console.log('刪除的記錄:', data.data.records); } else { console.error('刪除失敗:', data.message); } }).catch(err => console.error('錯誤:', err));" -ForegroundColor Cyan
}


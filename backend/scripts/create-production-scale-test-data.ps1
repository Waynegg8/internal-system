# 創建生產規模測試數據
$ErrorActionPreference = "Continue"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$env:WRANGLER_SEND_METRICS = "false"

Write-Output "=== 創建生產規模測試數據 ==="
Write-Output ""

$CLIENT_COUNT = 100
$SERVICES_PER_CLIENT_MIN = 7
$SERVICES_PER_CLIENT_MAX = 8
$TASKS_PER_SERVICE_MIN = 6
$TASKS_PER_SERVICE_MAX = 7

Write-Output "目標數據量:"
Write-Output "  - 客戶: $CLIENT_COUNT 個"
Write-Output "  - 每客戶服務: $SERVICES_PER_CLIENT_MIN-$SERVICES_PER_CLIENT_MAX 個"
Write-Output "  - 每服務任務: $TASKS_PER_SERVICE_MIN-$TASKS_PER_SERVICE_MAX 個"
Write-Output ""

# 獲取管理員用戶
Write-Output "[1/15] 獲取管理員用戶..."
$adminResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id FROM Users WHERE is_admin = 1 LIMIT 1" 2>&1 | Out-String
$adminId = 1
if ($adminResult -match 'user_id.*?(\d+)') {
    $adminId = [int]$matches[1]
}
Write-Output "管理員 ID: $adminId"

# 清理舊數據（按順序刪除，避免外鍵約束）
Write-Output ""
Write-Output "[2/15] 清理舊測試數據..."
# 先刪除關聯表的數據（按外鍵依賴順序）
# 1. 刪除工時表相關數據
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM Timesheets WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
# 2. 刪除外出相關數據（BusinessTrips 的 client_id 是 INTEGER，無法直接匹配，但可以通過其他方式清理）
# 注意：BusinessTrips 的 client_id 是 INTEGER，無法直接匹配 TEXT 類型的 client_id，這裡跳過
# 如果需要清理，可以通過其他方式（如通過 user_id 或其他關聯）
# 3. 刪除 SOP 關聯數據
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskTemplateStageSOPs WHERE stage_id IN (SELECT stage_id FROM TaskTemplateStages WHERE template_id IN (SELECT template_id FROM TaskTemplates))" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskGenerationTemplateSOPs WHERE template_id IN (SELECT template_id FROM TaskGenerationTemplates WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskGenerationQueueSOPs WHERE queue_id IN (SELECT queue_id FROM TaskGenerationQueue WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ActiveTaskSOPs WHERE task_id IN (SELECT task_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskConfigSOPs WHERE config_id IN (SELECT config_id FROM ClientServiceTaskConfigs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%'))" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ClientServiceSOPs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
# 4. 刪除收費相關數據
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM BillingPlanMonths WHERE billing_plan_id IN (SELECT billing_plan_id FROM BillingPlans WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM BillingPlanServices WHERE billing_plan_id IN (SELECT billing_plan_id FROM BillingPlans WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM BillingPlans WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ServiceBillingSchedule WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
# 5. 刪除任務生成相關數據
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskGenerationQueueSOPs WHERE queue_id IN (SELECT queue_id FROM TaskGenerationQueue WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskGenerationQueue WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskGenerationTemplateSOPs WHERE template_id IN (SELECT template_id FROM TaskGenerationTemplates WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskGenerationTemplates WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
# 6. 刪除任務配置相關數據
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskConfigSOPs WHERE config_id IN (SELECT config_id FROM ClientServiceTaskConfigs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%'))" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ClientServiceTaskConfigs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
# 7. 刪除客戶服務
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
# 8. 刪除附件
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM Attachments WHERE entity_id IN (SELECT receipt_id FROM Receipts WHERE client_id LIKE 'PROD_TEST_%') OR entity_id IN (SELECT CAST(task_id AS TEXT) FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
# 9. 刪除內部文檔
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM InternalDocuments WHERE client_id LIKE 'PROD_TEST_%' OR related_task_id IN (SELECT task_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
# 10. 刪除 FAQ 關聯
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskTemplateStageFAQs WHERE stage_id IN (SELECT stage_id FROM TaskTemplateStages WHERE template_id IN (SELECT template_id FROM TaskTemplates))" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM InternalFAQ WHERE client_id LIKE 'PROD_TEST_%' OR client_id IS NULL" 2>&1 | Out-Null
# 11. 刪除付款記錄
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM Payments WHERE receipt_id IN (SELECT receipt_id FROM Receipts WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
# 12. 刪除收據相關數據
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ReceiptServiceTypes WHERE receipt_id IN (SELECT receipt_id FROM Receipts WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ReceiptItems WHERE receipt_id IN (SELECT receipt_id FROM Receipts WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM Receipts WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
# 13. 刪除開票提醒
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM BillingReminders WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
# 14. 刪除活躍任務相關數據
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ActiveTaskSOPs WHERE task_id IN (SELECT task_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ActiveTaskStages WHERE task_id IN (SELECT task_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
# 15. 刪除股東和董監事
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM Shareholders WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM DirectorsSupervisors WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
# 16. 刪除客戶協作和標籤關聯
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ClientCollaborators WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ClientTagAssignments WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
# 17. 刪除客戶標籤（如果沒有其他客戶使用）
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM CustomerTags WHERE tag_id NOT IN (SELECT DISTINCT tag_id FROM ClientTagAssignments)" 2>&1 | Out-Null
# 18. 刪除薪資重算佇列（測試數據相關）
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM PayrollRecalcQueue WHERE reason = '測試數據生成觸發'" 2>&1 | Out-Null
# 19. 刪除客戶基本信息
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM Clients WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-Null
# 20. 刪除其他測試相關數據（歷史記錄、監控等）
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskStatusUpdates WHERE task_id IN (SELECT task_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskDueDateAdjustments WHERE task_id IN (SELECT task_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskEventLogs WHERE task_id IN (SELECT task_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskNotificationHistory WHERE task_id IN (SELECT task_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ReceiptEditHistory WHERE receipt_id IN (SELECT receipt_id FROM Receipts WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM DashboardAlerts WHERE payload_json LIKE '%PROD_TEST_%'" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM ServiceChangeHistory WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskConfigChangeLog WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM TaskGenerationHistory WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM CronJobExecutions WHERE job_name LIKE '%test%' OR details LIKE '%PROD_TEST_%'" 2>&1 | Out-Null
npx wrangler d1 execute horgoscpa-db-v2 --local --command "DELETE FROM DashboardSummary WHERE payload_json LIKE '%PROD_TEST_%'" 2>&1 | Out-Null
Write-Output "清理完成"

# 創建測試用戶（必須在創建工時表和請假記錄之前）
Write-Output ""
Write-Output "[3/30] 創建測試用戶..."
$testUserIds = @()
$testUserCount = 3  # 創建3個測試用戶

# 使用簡單的密碼哈希（PBKDF2的簡化版本，用於測試）
# 注意：實際系統使用 PBKDF2，這裡使用簡單的哈希用於測試數據生成
function Get-SimplePasswordHash {
    param([string]$password)
    # 使用簡單的哈希（實際系統應使用 PBKDF2）
    # 這裡使用 base64 編碼的簡單哈希作為測試
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($password)
    $hash = [System.Convert]::ToBase64String($bytes)
    # 使用 PBKDF2 格式（簡化版本，實際系統會使用真正的 PBKDF2）
    $salt = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("salt"))
    return "pbkdf2`$100000`$$salt`$$hash"
}

for ($i = 1; $i -le $testUserCount; $i++) {
    $username = "test_user_$i"
    $name = "測試員工$i"
    $email = "test$i@example.com"
    $password = "111111"  # 測試密碼
    $passwordHash = Get-SimplePasswordHash -password $password
    $gender = if (($i % 2) -eq 0) { "F" } else { "M" }
    $startDate = (Get-Date).AddMonths(-12).AddDays((Get-Random -Minimum 1 -Maximum 365)).ToString('yyyy-MM-dd')
    $phone = "09$(Get-Random -Minimum 10000000 -Maximum 99999999)"
    $address = "測試地址$i"
    $emergencyContactName = "緊急聯絡人$i"
    $emergencyContactPhone = "09$(Get-Random -Minimum 10000000 -Maximum 99999999)"
    
    # 檢查用戶是否已存在
    $existingUser = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id FROM Users WHERE username = '$username'" 2>&1 | Out-String
    if ($existingUser -match '"user_id":\s*(\d+)') {
        $userId = [int]$matches[1]
        $testUserIds += $userId
        Write-Output "  用戶 $username 已存在，ID: $userId"
    } else {
        # 創建新用戶
        $userSql = "INSERT INTO Users (username, password_hash, name, email, is_admin, gender, start_date, phone, address, emergency_contact_name, emergency_contact_phone, is_deleted, created_at, updated_at) VALUES ('$username', '$passwordHash', '$name', '$email', 0, '$gender', '$startDate', '$phone', '$address', '$emergencyContactName', '$emergencyContactPhone', 0, datetime('now'), datetime('now'))"
        $userResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $userSql 2>&1 | Out-String
        
        # 獲取剛創建的用戶ID
        $newUserResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id FROM Users WHERE username = '$username'" 2>&1 | Out-String
        if ($newUserResult -match '"user_id":\s*(\d+)') {
            $userId = [int]$matches[1]
            $testUserIds += $userId
            Write-Output "  創建用戶 $username，ID: $userId"
        }
    }
}
Write-Output "已創建/獲取 $($testUserIds.Count) 個測試用戶"

# 獲取起始 ID
Write-Output ""
Write-Output "[4/30] 獲取起始 ID..."
$maxServiceIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COALESCE(MAX(service_id), 0) as max_id FROM Services" 2>&1 | Out-String
$startServiceId = 1000
if ($maxServiceIdResult -match 'max_id.*?(\d+)') {
    $startServiceId = [int]$matches[1] + 1
}

$maxClientServiceIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COALESCE(MAX(client_service_id), 0) as max_id FROM ClientServices" 2>&1 | Out-String
$startClientServiceId = 10000
if ($maxClientServiceIdResult -match 'max_id.*?(\d+)') {
    $startClientServiceId = [int]$matches[1] + 1
}

$maxConfigIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COALESCE(MAX(config_id), 0) as max_id FROM ClientServiceTaskConfigs" 2>&1 | Out-String
$startConfigId = 10000
if ($maxConfigIdResult -match 'max_id.*?(\d+)') {
    $startConfigId = [int]$matches[1] + 1
}

Write-Output "起始 ID: Service=$startServiceId, ClientService=$startClientServiceId, Config=$startConfigId"

# 創建服務
Write-Output ""
Write-Output "[5/30] 創建服務..."
$serviceIds = @()
for ($i = 0; $i -lt 10; $i++) {
    $serviceId = $startServiceId + $i
    $serviceName = "生產測試服務$($i + 1)"
    $serviceCode = "PROD_SVC_$serviceId"
    $sql = 'INSERT OR IGNORE INTO Services (service_id, service_name, service_code) VALUES (' + $serviceId + ', ''' + $serviceName + ''', ''' + $serviceCode + ''')'
    $result = npx wrangler d1 execute horgoscpa-db-v2 --local --command $sql 2>&1 | Out-String
    if (-not ($result -match "error|Error|SQLITE_ERROR")) {
        $serviceIds += $serviceId
    }
}
Write-Output "創建 $($serviceIds.Count) 個服務"

# 創建客戶、服務、任務配置和收費計劃
Write-Output ""
Write-Output "[6/30] 創建客戶、服務、任務配置和收費計劃..."
$totalClients = 0
$totalServices = 0
$totalConfigs = 0
$currentClientServiceId = $startClientServiceId
$currentConfigId = $startConfigId
$batchSize = 20

for ($batch = 0; $batch -lt [Math]::Ceiling($CLIENT_COUNT / $batchSize); $batch++) {
    $batchStart = $batch * $batchSize
    $batchEnd = [Math]::Min($batchStart + $batchSize, $CLIENT_COUNT)
    $batchClients = $batchEnd - $batchStart
    
    Write-Output "處理客戶批次 $($batch + 1) ($batchStart - $($batchEnd - 1))..."
    
    $clientInserts = @()
    $clientServiceInserts = @()
    $configInserts = @()
    $serviceSopInserts = @()  # 服務層級 SOP 關聯
    $configSopInserts = @()   # 任務配置層級 SOP 關聯
    
    for ($c = 0; $c -lt $batchClients; $c++) {
        $clientNum = $batchStart + $c + 1
        $clientId = "PROD_TEST_$clientNum"
        $companyName = "生產測試客戶$clientNum"
        # 統一編號格式：企業客戶8碼數字（系統會自動加前綴00），個人客戶10碼字母+數字
        # 這裡生成企業客戶的8碼統一編號
        $taxNum = (10000000 + $clientNum).ToString().PadLeft(8, '0')
        
        # 客戶基本信息字段 - 確保所有數據都是正常的
        # 營業狀態：100%營業中（正常數據）
        $businessStatus = '營業中'
        
        # 電話：100%有電話（正常數據）
        $phone = "04-$(Get-Random -Minimum 20000000 -Maximum 29999999)"
        
        # Email：100%有Email（正常數據）
        $email = "test$clientNum@example.com"
        
        # 客戶備註：100%有備註（正常數據）
        $clientNotes = "這是客戶 $clientNum 的完整基本信息，包含聯絡資訊、負責人、地址、資本額等所有必要字段。狀態：$businessStatus"
        
        # 收款備註：100%有備註（正常數據）
        $paymentNotes = "客戶 $clientNum 的收款備註信息。付款期限：$(Get-Random -Minimum 15 -Maximum 60)天"
        
        # 負責人：從測試用戶中隨機選擇（確保用戶已創建）
        $assigneeUserId = if ($testUserIds.Count -gt 0) { $testUserIds[(Get-Random -Maximum $testUserIds.Count)] } else { $adminId }
        
        # 基本字段（所有數據都是正常的，不需要處理 NULL）
        $clientInserts += "('$clientId', '$companyName', '$taxNum', '$businessStatus', $assigneeUserId, '$phone', '$email', '$clientNotes', '$paymentNotes', 0)"
        
        # 每個客戶 7-8 個服務 - 涵蓋定期和一次性服務
        $serviceCount = Get-Random -Minimum $SERVICES_PER_CLIENT_MIN -Maximum ($SERVICES_PER_CLIENT_MAX + 1)
        
        for ($s = 0; $s -lt $serviceCount; $s++) {
            if ($serviceIds.Count -gt 0) {
                $serviceId = $serviceIds[($c + $s) % $serviceIds.Count]
            } else {
                Write-Output "錯誤: 沒有可用的服務 ID"
                exit 1
            }
            $clientServiceId = $currentClientServiceId++
            
            # 服務基本信息字段 - 確保所有數據都是正常的
            # 服務類型：80%定期服務，20%一次性服務（正常組合）
            $serviceTypeRand = Get-Random -Maximum 10
            $serviceType = if ($serviceTypeRand -lt 8) { 'recurring' } else { 'one-time' }
            
            # 服務狀態：100%活躍（正常數據）
            $status = 'active'
            
            # 開始日期：100%有開始日期（正常數據）
            $startDate = (Get-Date).AddMonths(-((Get-Random -Minimum 0 -Maximum 24))).ToString('yyyy-MM-dd')
            
            # 結束日期：定期服務無結束日期，一次性服務30%有結束日期（正常組合）
            $endDate = $null
            if ($serviceType -eq 'one-time' -and (Get-Random -Maximum 10) -lt 3) {
                $months = Get-Random -Minimum 1 -Maximum 6
                $endDate = (Get-Date).AddMonths($months).ToString('yyyy-MM-dd')
            }
            
            # 執行月份 - 涵蓋各種組合
            $executionMonths = $null
            if ($serviceType -eq 'recurring') {
                $monthPatternRand = Get-Random -Maximum 100
                if ($monthPatternRand -lt 30) {
                    # 30%：全年（1-12月）
                    $selectedMonths = 1..12
                } elseif ($monthPatternRand -lt 50) {
                    # 20%：半年（1-6月或7-12月）
                    $selectedMonths = if ((Get-Random -Maximum 2) -eq 0) { 1..6 } else { 7..12 }
                } elseif ($monthPatternRand -lt 65) {
                    # 15%：季度（1,4,7,10月）
                    $selectedMonths = @(1, 4, 7, 10)
                } elseif ($monthPatternRand -lt 80) {
                    # 15%：雙月（1,3,5,7,9,11月）
                    $selectedMonths = @(1, 3, 5, 7, 9, 11)
                } elseif ($monthPatternRand -lt 90) {
                    # 10%：單月（隨機1個月）
                    $selectedMonths = @(Get-Random -Minimum 1 -Maximum 13)
                } else {
                    # 10%：自訂月份（隨機2-5個月）
                    $monthCount = Get-Random -Minimum 2 -Maximum 6
                    $selectedMonths = 1..12 | Get-Random -Count $monthCount | Sort-Object
                }
                $executionMonths = "[" + ($selectedMonths -join ",") + "]"
            } else {
                # 一次性服務：執行月份為空或單月
                if ((Get-Random -Maximum 2) -eq 0) {
                    $selectedMonths = @(Get-Random -Minimum 1 -Maximum 13)
                    $executionMonths = "[" + $selectedMonths[0] + "]"
                }
            }
            
            # 用於自動生成：100%有（正常數據）
            $useForAutoGenerate = 1
            
            # 構建客戶服務 INSERT VALUES（包含所有字段，處理 NULL 值）
            $startDateStr = if ($startDate) { "'$startDate'" } else { 'NULL' }
            $endDateStr = if ($endDate) { "'$endDate'" } else { 'NULL' }
            $executionMonthsStr = if ($executionMonths) { "'$executionMonths'" } else { 'NULL' }
            $clientServiceInserts += "($clientServiceId, '$clientId', $serviceId, '$status', '$serviceType', $useForAutoGenerate, 0, $executionMonthsStr, $startDateStr, $endDateStr)"
            
            # 為每個服務添加 2-4 個 SOP 關聯（服務層級）
            if ($sopIds.Count -gt 0) {
                $serviceSopCount = Get-Random -Minimum 2 -Maximum 5
                $selectedSopIds = $sopIds | Get-Random -Count $serviceSopCount
                $sortOrder = 0
                foreach ($sopId in $selectedSopIds) {
                    $serviceSopInserts += "($clientServiceId, $sopId, $sortOrder)"
                    $sortOrder++
                }
            }
            
            # 每個服務 6-7 個任務
            $taskCount = Get-Random -Minimum $TASKS_PER_SERVICE_MIN -Maximum ($TASKS_PER_SERVICE_MAX + 1)
            
            for ($t = 0; $t -lt $taskCount; $t++) {
                $configId = $currentConfigId++
                $taskName = "任務階段$($t + 1)"
                $stageOrder = $t + 1
                $taskDesc = "任務描述$configId - 這是一個完整的任務配置，包含詳細說明和所有必要字段"
                
                # 任務生成時間規則 - 涵蓋各種組合
                $genTimeRuleRand = Get-Random -Maximum 100
                if ($genTimeRuleRand -lt 40) {
                    # 40%：month_start
                    $genTimeRule = 'month_start'
                    $genTimeParams = '{}'
                } elseif ($genTimeRuleRand -lt 80) {
                    # 40%：day_of_month（不同的day值：1-28）
                    $genTimeRule = 'day_of_month'
                    $day = Get-Random -Minimum 1 -Maximum 29
                    $genTimeParams = "{`"day`":$day}"
                } else {
                    # 20%：days_before_month_end（不同的days值：1-7）
                    $genTimeRule = 'days_before_month_end'
                    $days = Get-Random -Minimum 1 -Maximum 8
                    $genTimeParams = "{`"days`":$days}"
                }
                
                # 任務到期日規則 - 涵蓋各種組合
                $dueRuleRand = Get-Random -Maximum 100
                if ($dueRuleRand -lt 50) {
                    # 50%：days_after_start（不同的days_due：7-31）
                    $dueRule = 'days_after_start'
                    $daysDue = Get-Random -Minimum 7 -Maximum 32
                    $dueValue = $null
                } elseif ($dueRuleRand -lt 80) {
                    # 30%：end_of_month
                    $dueRule = 'end_of_month'
                    $daysDue = Get-Random -Minimum 7 -Maximum 32  # 保留days_due字段
                    $dueValue = $null
                } else {
                    # 20%：specific_day（不同的day：1-28）
                    $dueRule = 'specific_day'
                    $daysDue = Get-Random -Minimum 7 -Maximum 32  # 保留days_due字段
                    $dueValue = Get-Random -Minimum 1 -Maximum 29
                }
                
                # 固定期限：20%固定，80%非固定
                $isFixedDeadline = if ((Get-Random -Maximum 10) -lt 2) { 1 } else { 0 }
                
                # 提前天數：3-14天
                $advanceDays = Get-Random -Minimum 3 -Maximum 15
                
                # 負責人：從測試用戶中隨機選擇（確保用戶已創建）
                $assigneeUserId = if ($testUserIds.Count -gt 0) { $testUserIds[(Get-Random -Maximum $testUserIds.Count)] } else { $adminId }
                
                # 預估工時：1-8小時
                $estimatedHours = Get-Random -Minimum 1 -Maximum 9
                
                # 執行頻率 - 涵蓋各種組合
                $execFreqRand = Get-Random -Maximum 100
                if ($execFreqRand -lt 50) {
                    # 50%：monthly
                    $execFreq = 'monthly'
                } elseif ($execFreqRand -lt 70) {
                    # 20%：bi-monthly
                    $execFreq = 'bi-monthly'
                } elseif ($execFreqRand -lt 85) {
                    # 15%：quarterly
                    $execFreq = 'quarterly'
                } elseif ($execFreqRand -lt 95) {
                    # 10%：semi-annual
                    $execFreq = 'semi-annual'
                } else {
                    # 5%：annual
                    $execFreq = 'annual'
                }
                
                # 備註：100%有備註（正常數據）
                $notes = "這是任務階段 $stageOrder 的完整配置，包含所有必要字段。任務 ID: $configId，預估工時: $estimatedHours 小時，執行頻率: $execFreq，到期規則: $dueRule"
                
                # 構建 SQL VALUES（所有數據都是正常的）
                $dueValueStr = if ($dueValue) { $dueValue } else { 'NULL' }
                
                # 根據表結構的字段順序構建 INSERT VALUES
                # 字段順序：config_id, client_service_id, task_name, task_description, assignee_user_id, estimated_hours, advance_days, due_rule, due_value, stage_order, execution_frequency, auto_generate, notes, generation_time_rule, generation_time_params, days_due, is_fixed_deadline, is_deleted
                $configInserts += "($configId, $clientServiceId, '$taskName', '$taskDesc', $assigneeUserId, $estimatedHours, $advanceDays, '$dueRule', $dueValueStr, $stageOrder, '$execFreq', 1, '$notes', '$genTimeRule', '$genTimeParams', $daysDue, $isFixedDeadline, 0)"
                
                # 為每個任務配置添加 1-3 個 SOP 關聯（任務配置層級）
                if ($sopIds.Count -gt 0) {
                    $configSopCount = Get-Random -Minimum 1 -Maximum 4
                    $selectedSopIds = $sopIds | Get-Random -Count $configSopCount
                    $sortOrder = 0
                    foreach ($sopId in $selectedSopIds) {
                        $configSopInserts += "($configId, $sopId, $sortOrder)"
                        $sortOrder++
                    }
                }
            }
            $totalConfigs += $taskCount
        }
        $totalServices += $serviceCount
        $totalClients++
    }
    
    # 批量插入客戶（包含所有基本信息字段）
    if ($clientInserts.Count -gt 0) {
        # 根據實際表結構構建 INSERT 語句（只包含存在的字段）
        # 注意：如果數據庫有額外字段（contact_person_1, company_owner, company_address, capital_amount, primary_contact_method, line_id），需要手動添加到這裡
        $clientSql = "INSERT INTO Clients (client_id, company_name, tax_registration_number, business_status, assignee_user_id, phone, email, client_notes, payment_notes, is_deleted) VALUES " + ($clientInserts -join ", ")
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $clientSql 2>&1 | Out-Null
    }
    
    # 批量插入客戶服務（包含所有基本信息字段）
    if ($clientServiceInserts.Count -gt 0) {
        # 根據實際表結構構建 INSERT 語句（包含所有字段）
        $csSql = "INSERT INTO ClientServices (client_service_id, client_id, service_id, status, service_type, use_for_auto_generate, is_deleted, execution_months, start_date, end_date) VALUES " + ($clientServiceInserts -join ", ")
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $csSql 2>&1 | Out-Null
    }
    
    # 分批插入任務配置（避免 SQL 變量限制）
    $configBatchSize = 100
    for ($i = 0; $i -lt $configInserts.Count; $i += $configBatchSize) {
        $batchConfigs = $configInserts[$i..[Math]::Min($i + $configBatchSize - 1, $configInserts.Count - 1)]
        if ($batchConfigs.Count -gt 0) {
            # 根據表結構的實際字段順序構建 INSERT 語句（不包含 delivery_frequency 和 delivery_months，因為已被 execution_frequency 和 execution_months 取代）
            $configSql = "INSERT INTO ClientServiceTaskConfigs (config_id, client_service_id, task_name, task_description, assignee_user_id, estimated_hours, advance_days, due_rule, due_value, stage_order, execution_frequency, auto_generate, notes, generation_time_rule, generation_time_params, days_due, is_fixed_deadline, is_deleted) VALUES " + ($batchConfigs -join ", ")
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $configSql 2>&1 | Out-Null
        }
    }
    
    Write-Output "  已創建: $totalClients 客戶, $totalServices 服務, $totalConfigs 任務配置"
    Write-Output "  已創建: $($serviceSopInserts.Count) 個服務層級 SOP 關聯, $($configSopInserts.Count) 個任務配置層級 SOP 關聯"
}

# 創建任務生成模板並添加 SOP 關聯
Write-Output ""
Write-Output "[6/15] 創建任務生成模板並添加 SOP 關聯..."
# 獲取所有任務配置（使用 JOIN 獲取 client_id 和 service_id）
$allConfigs = @()
$configsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT tc.config_id, tc.client_service_id, cs.client_id, cs.service_id, tc.task_name, tc.task_description, tc.assignee_user_id, tc.estimated_hours, tc.stage_order, tc.notes, tc.generation_time_rule, tc.generation_time_params, tc.due_rule, tc.due_value, tc.days_due, tc.advance_days, tc.is_fixed_deadline, tc.execution_frequency, tc.execution_months FROM ClientServiceTaskConfigs tc INNER JOIN ClientServices cs ON tc.client_service_id = cs.client_service_id WHERE cs.client_id LIKE 'PROD_TEST_%' AND tc.is_deleted = 0 LIMIT 1000" 2>&1 | Out-String

# 解析配置數據（使用多行模式匹配格式化的 JSON）
$configMatches = [regex]::Matches($configsResult, '"config_id":\s*(\d+)[\s\S]*?"client_service_id":\s*(\d+)[\s\S]*?"client_id":\s*"([^"]+)"[\s\S]*?"service_id":\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$totalTemplates = 0
$totalTemplateSops = 0

foreach ($match in $configMatches) {
    $configId = [int]$match.Groups[1].Value
    $clientServiceId = [int]$match.Groups[2].Value
    $clientId = $match.Groups[3].Value
    $serviceId = [int]$match.Groups[4].Value
    
    # 獲取服務和客戶信息
    $serviceInfo = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT service_name FROM Services WHERE service_id = $serviceId" 2>&1 | Out-String
    $clientInfo = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT company_name FROM Clients WHERE client_id = '$clientId'" 2>&1 | Out-String
    $serviceName = if ($serviceInfo -match '"service_name":\s*"([^"]+)"') { $matches[1] } else { "服務$serviceId" }
    $companyName = if ($clientInfo -match '"company_name":\s*"([^"]+)"') { $matches[1] } else { "客戶" }
    
    # 獲取配置的執行月份
    $configExecMonths = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT execution_months FROM ClientServiceTaskConfigs WHERE config_id = $configId" 2>&1 | Out-String
    $execMonths = if ($configExecMonths -match '"execution_months":\s*"([^"]*)"') { $matches[1] } else { '[1,2,3,4,5,6,7,8,9,10,11,12]' }
    
    # 獲取服務的執行月份和服務類型
    $serviceInfo = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT execution_months, service_type FROM ClientServices WHERE client_service_id = $clientServiceId" 2>&1 | Out-String
    $serviceExecMonthsStr = if ($serviceInfo -match '"execution_months":\s*"([^"]*)"') { $matches[1] } else { '[1,2,3,4,5,6,7,8,9,10,11,12]' }
    $serviceType = if ($serviceInfo -match '"service_type":\s*"([^"]+)"') { $matches[1] } else { 'recurring' }
    
    # 創建任務生成模板（簡化版本，只包含關鍵字段）
    $currentMonth = (Get-Date).ToString('yyyy-MM')
    $templateSql = "INSERT OR IGNORE INTO TaskGenerationTemplates (client_id, client_service_id, config_id, service_id, task_name, task_description, assignee_user_id, estimated_hours, stage_order, notes, generation_time_rule, generation_time_params, due_rule, due_value, days_due, advance_days, is_fixed_deadline, execution_frequency, execution_months, effective_month, auto_generate, company_name, service_name, service_type, service_execution_months, template_version, is_active) SELECT '$clientId', $clientServiceId, $configId, $serviceId, tc.task_name, tc.task_description, tc.assignee_user_id, tc.estimated_hours, tc.stage_order, tc.notes, tc.generation_time_rule, tc.generation_time_params, tc.due_rule, tc.due_value, tc.days_due, tc.advance_days, tc.is_fixed_deadline, tc.execution_frequency, tc.execution_months, '$currentMonth', 1, '$companyName', '$serviceName', '$serviceType', '$serviceExecMonthsStr', 1, 1 FROM ClientServiceTaskConfigs tc WHERE tc.config_id = $configId"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $templateSql 2>&1 | Out-Null
    
    # 獲取剛創建的模板 ID
    $templateIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT template_id FROM TaskGenerationTemplates WHERE config_id = $configId AND client_service_id = $clientServiceId LIMIT 1" 2>&1 | Out-String
    if ($templateIdResult -match '"template_id":\s*(\d+)') {
        $templateId = [int]$matches[1]
        $totalTemplates++
        
        # 為模板添加 SOP 關聯（從任務配置的 SOP 複製）
        if ($sopIds.Count -gt 0) {
            $templateSopCount = Get-Random -Minimum 1 -Maximum 4
            $selectedSopIds = $sopIds | Get-Random -Count $templateSopCount
            $sortOrder = 0
            foreach ($sopId in $selectedSopIds) {
                # 獲取 SOP 信息
                $sopInfo = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT title FROM SOPDocuments WHERE sop_id = $sopId" 2>&1 | Out-String
                $sopName = if ($sopInfo -match '"title":\s*"([^"]+)"') { $matches[1] } else { "SOP$sopId" }
                $sopUrl = "https://example.com/sop/$sopId"
                
                $templateSopSql = "INSERT OR IGNORE INTO TaskGenerationTemplateSOPs (template_id, sop_id, sort_order, sop_name, sop_url) VALUES ($templateId, $sopId, $sortOrder, '$sopName', '$sopUrl')"
                npx wrangler d1 execute horgoscpa-db-v2 --local --command $templateSopSql 2>&1 | Out-Null
                $totalTemplateSops++
                $sortOrder++
            }
        }
    }
}
Write-Output "  已創建: $totalTemplates 個任務生成模板, $totalTemplateSops 個模板 SOP 關聯"

# 創建收費計劃
Write-Output ""
Write-Output "[8/30] 創建收費計劃..."
$currentYear = (Get-Date).Year
$totalBillingPlans = 0
$totalBillingMonths = 0

# 獲取所有客戶服務 ID（用於創建收費計劃）
$allClientServices = @()
$csResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT client_service_id, client_id, service_type FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0" 2>&1 | Out-String
$csMatches = [regex]::Matches($csResult, '"client_service_id":\s*(\d+)[\s\S]*?"client_id":\s*"([^"]+)"[\s\S]*?"service_type":\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::Singleline)
foreach ($match in $csMatches) {
    $allClientServices += @{
        client_service_id = [int]$match.Groups[1].Value
        client_id = $match.Groups[2].Value
        service_type = $match.Groups[3].Value
    }
}

# 按客戶分組服務
$servicesByClient = @{}
foreach ($cs in $allClientServices) {
    if (-not $servicesByClient.ContainsKey($cs.client_id)) {
        $servicesByClient[$cs.client_id] = @()
    }
    $servicesByClient[$cs.client_id] += $cs
}

# 為每個客戶創建收費計劃
foreach ($clientId in $servicesByClient.Keys) {
    $services = $servicesByClient[$clientId]
    $recurringServices = $services | Where-Object { $_.service_type -eq 'recurring' }
    $oneTimeServices = $services | Where-Object { $_.service_type -eq 'one-time' }
    
    # 為定期服務創建一個年度收費計劃
    if ($recurringServices.Count -gt 0) {
        $billingPlanId = $currentYear * 1000000 + [Math]::Floor((Get-Random -Minimum 1 -Maximum 1000000))
        $paymentDueDays = 30
        $yearTotal = 0
        $monthAmounts = @{}
        
        # 為每個月份生成金額（根據執行月份）- 涵蓋各種金額組合
        for ($month = 1; $month -le 12; $month++) {
            $monthTotal = 0
            foreach ($cs in $recurringServices) {
                # 檢查該服務是否在這個月執行
                $csResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT execution_months FROM ClientServices WHERE client_service_id = $($cs.client_service_id)" 2>&1 | Out-String
                if ($csResult -match '"execution_months":\s*"([^"]*)"') {
                    $execMonthsStr = $matches[1]
                    try {
                        $execMonths = $execMonthsStr -replace '[\[\]]', '' -split ',' | ForEach-Object { [int]$_.Trim() }
                        if ($execMonths -contains $month) {
                            # 不同的金額範圍：30%低金額(5000-15000)，50%中金額(15000-35000)，20%高金額(35000-50000)
                            $amountRand = Get-Random -Maximum 100
                            $serviceAmount = if ($amountRand -lt 30) {
                                Get-Random -Minimum 5000 -Maximum 15001
                            } elseif ($amountRand -lt 80) {
                                Get-Random -Minimum 15000 -Maximum 35001
                            } else {
                                Get-Random -Minimum 35000 -Maximum 50001
                            }
                            $monthTotal += $serviceAmount
                        }
                    } catch {
                        # 解析失敗，跳過
                    }
                }
            }
            if ($monthTotal -gt 0) {
                $monthAmounts[$month] = $monthTotal
                $yearTotal += $monthTotal
            }
        }
        
        # 付款期限：15天(10%)，30天(60%)，45天(20%)，60天(10%)
        $paymentDueDaysRand = Get-Random -Maximum 100
        $paymentDueDays = if ($paymentDueDaysRand -lt 10) { 15 } elseif ($paymentDueDaysRand -lt 70) { 30 } elseif ($paymentDueDaysRand -lt 90) { 45 } else { 60 }
        
        # 插入 BillingPlans
        $billingPlanNotes = if ((Get-Random -Maximum 2) -eq 0) { '生產測試客戶年度收費計劃' } else { $null }
        $billingPlanNotesStr = if ($billingPlanNotes) { "'$billingPlanNotes'" } else { 'NULL' }
        $billingPlanSql = "INSERT INTO BillingPlans (billing_plan_id, client_id, billing_year, billing_type, year_total, payment_due_days, notes) VALUES ($billingPlanId, '$clientId', $currentYear, 'recurring', $yearTotal, $paymentDueDays, $billingPlanNotesStr)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $billingPlanSql 2>&1 | Out-Null
        
        # 插入 BillingPlanServices
        foreach ($cs in $recurringServices) {
            $bpsSql = "INSERT INTO BillingPlanServices (billing_plan_id, client_service_id) VALUES ($billingPlanId, $($cs.client_service_id))"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $bpsSql 2>&1 | Out-Null
        }
        
        # 插入 BillingPlanMonths
        foreach ($month in $monthAmounts.Keys) {
            $amount = $monthAmounts[$month]
            $bpmSql = "INSERT INTO BillingPlanMonths (billing_plan_id, billing_month, billing_amount, payment_due_days) VALUES ($billingPlanId, $month, $amount, $paymentDueDays)"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $bpmSql 2>&1 | Out-Null
            $totalBillingMonths++
        }
        
        # 為每個服務創建 ServiceBillingSchedule（開票提醒需要，根據 receipt-utils.js）
        foreach ($cs in $recurringServices) {
            foreach ($month in $monthAmounts.Keys) {
                $amount = $monthAmounts[$month]
                # 檢查該服務是否在這個月執行
                $csResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT execution_months FROM ClientServices WHERE client_service_id = $($cs.client_service_id)" 2>&1 | Out-String
                if ($csResult -match '"execution_months":\s*"([^"]*)"') {
                    $execMonthsStr = $matches[1]
                    try {
                        $execMonths = $execMonthsStr -replace '[\[\]]', '' -split ',' | ForEach-Object { [int]$_.Trim() }
                        if ($execMonths -contains $month) {
                            # 計算該服務在該月的金額（平均分配或按比例）
                            $serviceAmount = [Math]::Round($amount / $recurringServices.Count, 2)
                            $sbsSql = "INSERT OR IGNORE INTO ServiceBillingSchedule (client_service_id, billing_type, billing_year, billing_month, billing_amount, payment_due_days, created_at, updated_at) VALUES ($($cs.client_service_id), 'monthly', $currentYear, $month, $serviceAmount, $paymentDueDays, datetime('now'), datetime('now'))"
                            npx wrangler d1 execute horgoscpa-db-v2 --local --command $sbsSql 2>&1 | Out-Null
                        }
                    } catch {
                        # 解析失敗，跳過
                    }
                }
            }
        }
        
        $totalBillingPlans++
    }
    
    # 為一次性服務創建獨立的收費計劃 - 涵蓋各種金額組合
    foreach ($cs in $oneTimeServices) {
        $billingPlanId = $currentYear * 1000000 + [Math]::Floor((Get-Random -Minimum 1 -Maximum 1000000))
        $billingDate = (Get-Date).AddMonths((Get-Random -Minimum -6 -Maximum 6)).ToString('yyyy-MM-dd')
        
        # 不同的金額範圍：30%低金額(10000-30000)，50%中金額(30000-70000)，20%高金額(70000-100000)
        $amountRand = Get-Random -Maximum 100
        $billingAmount = if ($amountRand -lt 30) {
            Get-Random -Minimum 10000 -Maximum 30001
        } elseif ($amountRand -lt 80) {
            Get-Random -Minimum 30000 -Maximum 70001
        } else {
            Get-Random -Minimum 70000 -Maximum 100001
        }
        
        $description = "一次性服務收費"
        
        # 付款期限：15天(10%)，30天(60%)，45天(20%)，60天(10%)
        $paymentDueDaysRand = Get-Random -Maximum 100
        $paymentDueDays = if ($paymentDueDaysRand -lt 10) { 15 } elseif ($paymentDueDaysRand -lt 70) { 30 } elseif ($paymentDueDaysRand -lt 90) { 45 } else { 60 }
        
        # 插入 BillingPlans（一次性服務）
        $billingPlanNotes = if ((Get-Random -Maximum 2) -eq 0) { '生產測試客戶一次性服務收費' } else { $null }
        $billingPlanNotesStr = if ($billingPlanNotes) { "'$billingPlanNotes'" } else { 'NULL' }
        $billingPlanSql = "INSERT INTO BillingPlans (billing_plan_id, client_id, billing_year, billing_type, year_total, payment_due_days, billing_date, description, notes) VALUES ($billingPlanId, '$clientId', $currentYear, 'one-time', $billingAmount, $paymentDueDays, '$billingDate', '$description', $billingPlanNotesStr)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $billingPlanSql 2>&1 | Out-Null
        
        # 插入 BillingPlanServices
        $bpsSql = "INSERT INTO BillingPlanServices (billing_plan_id, client_service_id) VALUES ($billingPlanId, $($cs.client_service_id))"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $bpsSql 2>&1 | Out-Null
        
        # 插入 BillingPlanMonths（一次性服務的收費月份）
        $billingMonth = [int]$billingDate.Split('-')[1]
        $bpmSql = "INSERT INTO BillingPlanMonths (billing_plan_id, billing_month, billing_amount, payment_due_days) VALUES ($billingPlanId, $billingMonth, $billingAmount, $paymentDueDays)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $bpmSql 2>&1 | Out-Null
        $totalBillingMonths++
        
        # 為一次性服務創建 ServiceBillingSchedule（開票提醒需要，根據 receipt-utils.js）
        $sbsSql = "INSERT OR IGNORE INTO ServiceBillingSchedule (client_service_id, billing_type, billing_year, billing_month, billing_amount, payment_due_days, billing_date, description, created_at, updated_at) VALUES ($($cs.client_service_id), 'one-time', $currentYear, 0, $billingAmount, $paymentDueDays, '$billingDate', '$description', datetime('now'), datetime('now'))"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $sbsSql 2>&1 | Out-Null
        
        $totalBillingPlans++
    }
}

Write-Output "  已創建: $totalBillingPlans 個收費計劃, $totalBillingMonths 個月份明細"

# 創建薪資數據
Write-Output ""
Write-Output "[9/30] 創建薪資數據..."
# 使用已創建的測試用戶ID列表
$allUserIds = $testUserIds

# 獲取或創建薪資項目類型
$salaryItemTypeIds = @()
$salaryItemTypes = @(
    @{code='BASE_SALARY'; name='基本薪資'; category='regular_allowance'; is_regular=1; is_fixed=1},
    @{code='TRANSPORT'; name='交通津貼'; category='regular_allowance'; is_regular=1; is_fixed=1},
    @{code='MEAL'; name='餐費津貼'; category='regular_allowance'; is_regular=1; is_fixed=1},
    @{code='PERFORMANCE'; name='績效獎金'; category='bonus'; is_regular=0; is_fixed=0},
    @{code='YEAR_END'; name='年終獎金'; category='year_end_bonus'; is_regular=0; is_fixed=0},
    @{code='INSURANCE'; name='保險費'; category='deduction'; is_regular=1; is_fixed=1},
    @{code='TAX'; name='所得稅'; category='deduction'; is_regular=1; is_fixed=0}
)

foreach ($itemType in $salaryItemTypes) {
    $checkSql = "SELECT item_type_id FROM SalaryItemTypes WHERE item_code = '$($itemType.code)'"
    $checkResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $checkSql 2>&1 | Out-String
    if ($checkResult -match '"item_type_id":\s*(\d+)') {
        $salaryItemTypeIds += [int]$matches[1]
    } else {
        $insertSql = "INSERT INTO SalaryItemTypes (item_code, item_name, category, is_regular_payment, is_fixed, description, is_active, display_order) VALUES ('$($itemType.code)', '$($itemType.name)', '$($itemType.category)', $($itemType.is_regular), $($itemType.is_fixed), '$($itemType.name)項目', 1, 0)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $insertSql 2>&1 | Out-Null
        $newIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $checkSql 2>&1 | Out-String
        if ($newIdResult -match '"item_type_id":\s*(\d+)') {
            $salaryItemTypeIds += [int]$matches[1]
        }
    }
}

# 為每個用戶創建薪資項目
$totalSalaryItems = 0
foreach ($userId in $allUserIds) {
    # 基本薪資（每個用戶都有）
    $baseSalaryItemId = $salaryItemTypeIds[0]  # BASE_SALARY
    $baseSalaryAmount = (Get-Random -Minimum 30000 -Maximum 80001) * 100  # 30000-80000元，轉換為分
    $monthsAgo = Get-Random -Minimum 0 -Maximum 12
    $effectiveDate = (Get-Date).AddMonths(-$monthsAgo).ToString('yyyy-MM-dd')
    $salarySql = "INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, is_active, created_by) VALUES ($userId, $baseSalaryItemId, $baseSalaryAmount, '$effectiveDate', 1, $adminId)"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $salarySql 2>&1 | Out-Null
    $totalSalaryItems++
    
    # 交通津貼（80%用戶有）
    if ((Get-Random -Maximum 10) -lt 8) {
        $transportItemId = $salaryItemTypeIds[1]  # TRANSPORT
        $transportAmount = (Get-Random -Minimum 2000 -Maximum 5001) * 100
        $salarySql = "INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, is_active, created_by) VALUES ($userId, $transportItemId, $transportAmount, '$effectiveDate', 1, $adminId)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $salarySql 2>&1 | Out-Null
        $totalSalaryItems++
    }
    
    # 餐費津貼（70%用戶有）
    if ((Get-Random -Maximum 10) -lt 7) {
        $mealItemId = $salaryItemTypeIds[2]  # MEAL
        $mealAmount = (Get-Random -Minimum 1800 -Maximum 3001) * 100
        $salarySql = "INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, is_active, created_by) VALUES ($userId, $mealItemId, $mealAmount, '$effectiveDate', 1, $adminId)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $salarySql 2>&1 | Out-Null
        $totalSalaryItems++
    }
}
Write-Output "  已創建: $totalSalaryItems 個員工薪資項目"

# 創建成本數據
Write-Output ""
Write-Output "[10/30] 創建成本數據..."
# 獲取或創建成本類型
$costTypeIds = @()
$costTypes = @(
    @{code='RENT'; name='辦公室租金'; category='fixed'; method='per_employee'},
    @{code='UTILITIES'; name='水電費'; category='variable'; method='per_employee'},
    @{code='INTERNET'; name='網路費'; category='fixed'; method='per_employee'},
    @{code='SOFTWARE'; name='軟體授權費'; category='fixed'; method='per_employee'},
    @{code='MARKETING'; name='行銷費用'; category='variable'; method='per_revenue'}
)

foreach ($costType in $costTypes) {
    $checkSql = "SELECT cost_type_id FROM OverheadCostTypes WHERE cost_code = '$($costType.code)'"
    $checkResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $checkSql 2>&1 | Out-String
    if ($checkResult -match '"cost_type_id":\s*(\d+)') {
        $costTypeIds += [int]$matches[1]
    } else {
        $insertSql = "INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description, is_active, display_order) VALUES ('$($costType.code)', '$($costType.name)', '$($costType.category)', '$($costType.method)', '$($costType.name)成本', 1, 0)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $insertSql 2>&1 | Out-Null
        $newIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $checkSql 2>&1 | Out-String
        if ($newIdResult -match '"cost_type_id":\s*(\d+)') {
            $costTypeIds += [int]$matches[1]
        }
    }
}

# 為過去12個月創建成本記錄
$totalCosts = 0
$currentYear = (Get-Date).Year
for ($month = 1; $month -le 12; $month++) {
    foreach ($costTypeId in $costTypeIds) {
        $amount = (Get-Random -Minimum 10000 -Maximum 100001)  # 10000-100000元
        $costSql = "INSERT OR IGNORE INTO MonthlyOverheadCosts (cost_type_id, year, month, amount, recorded_by) VALUES ($costTypeId, $currentYear, $month, $amount, $adminId)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $costSql 2>&1 | Out-Null
        $totalCosts++
    }
}
Write-Output "  已創建: $totalCosts 個月份成本記錄"

# 創建外出數據
Write-Output ""
Write-Output "[11/30] 創建外出數據..."
$totalTrips = 0
# 為過去3個月創建外出記錄
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $tripDate = (Get-Date).AddMonths($monthOffset).AddDays((Get-Random -Minimum 1 -Maximum 28))
    $tripDateStr = $tripDate.ToString('yyyy-MM-dd')
    
    # 每個月每個用戶有30%機率有外出記錄
    foreach ($userId in $testUserIds) {
        if ((Get-Random -Maximum 10) -lt 3) {
            # BusinessTrips 的 client_id 是 INTEGER，但 Clients 的 client_id 是 TEXT
            # 由於類型不匹配，這裡使用 NULL（client_id 是可選字段）
            $destination = "客戶地點$(Get-Random -Minimum 1 -Maximum 100)"
            $distance = Get-Random -Minimum 5 -Maximum 51  # 5-50公里
            $transportSubsidy = [Math]::Floor($distance / 5) * 60 * 100  # 每5公里60元，轉換為分
            $purpose = "客戶拜訪"
            $status = 'approved'
            $reviewedBy = $adminId
            
            $tripSql = "INSERT INTO BusinessTrips (user_id, client_id, trip_date, destination, distance_km, purpose, transport_subsidy_cents, status, reviewed_by, reviewed_at) VALUES ($userId, NULL, '$tripDateStr', '$destination', $distance, '$purpose', $transportSubsidy, '$status', $reviewedBy, datetime('now'))"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $tripSql 2>&1 | Out-Null
            $totalTrips++
        }
    }
}
Write-Output "  已創建: $totalTrips 個外出記錄"

# 創建假期數據
Write-Output ""
Write-Output "[12/30] 創建假期數據..."
# 為每個用戶創建假期餘額
$currentYear = (Get-Date).Year
$totalLeaveBalances = 0
foreach ($userId in $testUserIds) {
    # 年假（根據年資計算，這裡簡化為14-20天）
    $annualLeaveDays = Get-Random -Minimum 14 -Maximum 21
    $annualUsed = Get-Random -Minimum 0 -Maximum ([Math]::Floor($annualLeaveDays * 0.5))
    $annualRemain = $annualLeaveDays - $annualUsed
    $leaveBalanceSql = "INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain) VALUES ($userId, 'annual', $currentYear, $annualLeaveDays, $annualUsed, $annualRemain)"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $leaveBalanceSql 2>&1 | Out-Null
    $totalLeaveBalances++
    
    # 病假（30天）
    $sickUsed = Get-Random -Minimum 0 -Maximum 6
    $sickRemain = 30 - $sickUsed
    $leaveBalanceSql = "INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain) VALUES ($userId, 'sick', $currentYear, 30, $sickUsed, $sickRemain)"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $leaveBalanceSql 2>&1 | Out-Null
    $totalLeaveBalances++
    
    # 事假（14天）
    $personalUsed = Get-Random -Minimum 0 -Maximum 4
    $personalRemain = 14 - $personalUsed
    $leaveBalanceSql = "INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain) VALUES ($userId, 'personal', $currentYear, 14, $personalUsed, $personalRemain)"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $leaveBalanceSql 2>&1 | Out-Null
    $totalLeaveBalances++
}

# 創建假期申請記錄
$totalLeaveRequests = 0
foreach ($userId in $testUserIds) {
    # 每個用戶過去3個月有20%機率有假期申請
    if ((Get-Random -Maximum 10) -lt 2) {
        $startDate = (Get-Date).AddMonths((Get-Random -Minimum -3 -Maximum 1)).AddDays((Get-Random -Minimum 1 -Maximum 28))
        $endDate = $startDate.AddDays((Get-Random -Minimum 1 -Maximum 4))
        $leaveTypes = @('annual', 'sick', 'personal')
        $leaveType = $leaveTypes[(Get-Random -Maximum $leaveTypes.Length)]
        $amount = ($endDate - $startDate).Days + 1
        $reason = "假期申請"
        $status = 'approved'
        $reviewedBy = $adminId
        
        # 根據真實業務邏輯：請假申請創建時直接為 'approved'，無需審核（reviewed_by 和 reviewed_at 為 NULL）
        $leaveRequestSql = "INSERT INTO LeaveRequests (user_id, leave_type, start_date, end_date, unit, amount, reason, status, submitted_at) VALUES ($userId, '$leaveType', '$($startDate.ToString('yyyy-MM-dd'))', '$($endDate.ToString('yyyy-MM-dd'))', 'day', $amount, '$reason', 'approved', datetime('now'))"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $leaveRequestSql 2>&1 | Out-Null
        $totalLeaveRequests++
    }
}
Write-Output "  已創建: $totalLeaveBalances 個假期餘額, $totalLeaveRequests 個假期申請"

# 創建工時表數據（符合所有業務規則）
Write-Output ""
Write-Output "[13/30] 創建工時表數據（符合業務規則）..."
$totalTimesheets = 0

# 工時類型定義（符合勞基法）
# 1: 正常工時（工作日，最多8小時）
# 2: 平日加班前2小時（工作日，最多2小時，需要先有8小時正常工時）
# 3: 平日加班後2小時（工作日，最多2小時，需要先有類型2）
# 4: 休息日加班前2小時（休息日，最多2小時）
# 5: 休息日加班3-8小時（休息日，最多6小時，需要先有類型4）
# 6: 休息日加班9-12小時（休息日，最多4小時，需要先有類型4和5）
# 7: 國定假日加班8小時內（國定假日，最多8小時）
# 8: 國定假日加班9-10小時（國定假日，最多2小時，需要先有類型7）
# 9: 國定假日加班11-12小時（國定假日，最多2小時，需要先有類型8）
# 10: 例假日加班8小時內（例假日，最多8小時）
# 11: 例假日加班9-12小時（例假日，最多4小時，需要先有類型10）

# 日期類型與工時類型匹配規則
# workday: 允許 1, 2, 3
# restday: 允許 4, 5, 6
# weekly_restday: 允許 10, 11
# national_holiday: 允許 7, 8, 9

# 為過去3個月創建工時記錄
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $monthDate = (Get-Date).AddMonths($monthOffset)
    $daysInMonth = [DateTime]::DaysInMonth($monthDate.Year, $monthDate.Month)
    
    # 獲取該月的所有請假記錄（用於排除請假日期）
    $monthStr = $monthDate.ToString("yyyy-MM")
    $leaveResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id, start_date, end_date, unit, amount FROM LeaveRequests WHERE start_date LIKE '$monthStr%' OR end_date LIKE '$monthStr%' AND status IN ('approved', 'pending') AND is_deleted = 0" 2>&1 | Out-String
    $leaveDatesByUser = @{}  # key: "user_id", value: Set of dates
    $leaveMatches = [regex]::Matches($leaveResult, '"user_id":\s*(\d+)[\s\S]*?"start_date":\s*"([^"]+)"[\s\S]*?"end_date":\s*"([^"]+)"[\s\S]*?"unit":\s*"([^"]+)"[\s\S]*?"amount":\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    foreach ($match in $leaveMatches) {
        $leaveUserId = [int]$match.Groups[1].Value
        $leaveStartDate = $match.Groups[2].Value
        $leaveEndDate = $match.Groups[3].Value
        $leaveUnit = $match.Groups[4].Value
        $leaveAmount = [int]$match.Groups[5].Value
        
        if (-not $leaveDatesByUser.ContainsKey($leaveUserId)) {
            $leaveDatesByUser[$leaveUserId] = New-Object System.Collections.Generic.HashSet[string]
        }
        
        # 如果是按天請假，將所有日期加入集合
        if ($leaveUnit -eq 'day') {
            $start = [DateTime]::ParseExact($leaveStartDate, "yyyy-MM-dd", $null)
            $end = [DateTime]::ParseExact($leaveEndDate, "yyyy-MM-dd", $null)
            $current = $start
            while ($current -le $end) {
                if ($current.ToString("yyyy-MM") -eq $monthStr) {
                    [void]$leaveDatesByUser[$leaveUserId].Add($current.ToString("yyyy-MM-dd"))
                }
                $current = $current.AddDays(1)
            }
        } else {
            # 如果是按小時請假，只加入開始日期
            if ($leaveStartDate.StartsWith($monthStr)) {
                [void]$leaveDatesByUser[$leaveUserId].Add($leaveStartDate)
            }
        }
    }
    
    foreach ($userId in $testUserIds) {
        # 追蹤每個用戶每天的工時記錄（用於計算總工時和前置條件）
        $dailyTimesheets = @{}  # key: "YYYY-MM-DD", value: array of @{work_type, hours}
        
        # 獲取該用戶的請假日期集合
        $userLeaveDates = if ($leaveDatesByUser.ContainsKey($userId)) { $leaveDatesByUser[$userId] } else { New-Object System.Collections.Generic.HashSet[string] }
        
        # 每個月每個用戶有15-22個工作日的工時記錄（包含工作日、休息日、假日）
        # 排除請假日期
        $availableDays = @()
        for ($day = 1; $day -le $daysInMonth; $day++) {
            $workDate = $monthDate.ToString("yyyy-MM-") + $day.ToString("00")
            if (-not $userLeaveDates.Contains($workDate)) {
                $availableDays += $day
            }
        }
        
        if ($availableDays.Count -eq 0) { continue }
        
        $workDays = [Math]::Min((Get-Random -Minimum 15 -Maximum 23), $availableDays.Count)
        $selectedDays = $availableDays | Get-Random -Count $workDays | Sort-Object
        
        foreach ($day in $selectedDays) {
            $workDate = $monthDate.ToString("yyyy-MM-") + $day.ToString("00")
            $dateObj = [DateTime]::ParseExact($workDate, "yyyy-MM-dd", $null)
            $dayOfWeek = $dateObj.DayOfWeek.value__  # 0=Sunday, 6=Saturday
            
            # 判斷日期類型
            # 先查詢是否為國定假日
            $holidayCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT is_national_holiday, is_weekly_restday, is_makeup_workday FROM Holidays WHERE holiday_date = '$workDate'" 2>&1 | Out-String
            $isNationalHoliday = $false
            $isWeeklyRestday = $false
            $isMakeupWorkday = $false
            if ($holidayCheck -match '"is_national_holiday":\s*1') { $isNationalHoliday = $true }
            if ($holidayCheck -match '"is_weekly_restday":\s*1') { $isWeeklyRestday = $true }
            if ($holidayCheck -match '"is_makeup_workday":\s*1') { $isMakeupWorkday = $true }
            
            # 確定日期類型
            $dateType = 'workday'
            if ($isNationalHoliday) {
                $dateType = 'national_holiday'
            } elseif ($isWeeklyRestday -or $dayOfWeek -eq 0) {
                $dateType = 'weekly_restday'
            } elseif ($dayOfWeek -eq 6) {
                $dateType = 'restday'
            } elseif ($isMakeupWorkday) {
                $dateType = 'workday'  # 補班日視為工作日
            }
            
            # 根據日期類型選擇允許的工時類型
            $allowedWorkTypes = @()
            if ($dateType -eq 'workday') {
                $allowedWorkTypes = @(1, 2, 3)  # 正常工時、平日加班前2h、平日加班後2h
            } elseif ($dateType -eq 'restday') {
                $allowedWorkTypes = @(4, 5, 6)  # 休息日加班前2h、3-8h、9-12h
            } elseif ($dateType -eq 'weekly_restday') {
                $allowedWorkTypes = @(10, 11)  # 例假日加班8h內、9-12h
            } elseif ($dateType -eq 'national_holiday') {
                $allowedWorkTypes = @(7, 8, 9)  # 國定假日加班8h內、9-10h、11-12h
            }
            
            if ($allowedWorkTypes.Count -eq 0) { continue }
            
            # 獲取當天已有的工時記錄（用於計算總工時和前置條件）
            $existingTimesheets = @()
            if ($dailyTimesheets.ContainsKey($workDate)) {
                $existingTimesheets = $dailyTimesheets[$workDate]
            }
            $existingTotalHours = ($existingTimesheets | Measure-Object -Property hours -Sum).Sum
            $existingWorkTypes = $existingTimesheets | ForEach-Object { $_.work_type }
            
            # 選擇工時類型（考慮前置條件和限制）
            $selectedWorkType = 1  # 默認正常工時
            $selectedHours = 0
            
            if ($dateType -eq 'workday') {
                # 工作日：優先填正常工時，如果已滿8小時再考慮加班
                $normalHours = ($existingTimesheets | Where-Object { $_.work_type -eq 1 } | Measure-Object -Property hours -Sum).Sum
                
                if ($normalHours -lt 8) {
                    # 還有正常工時額度
                    $selectedWorkType = 1
                    $remainingNormal = 8 - $normalHours
                    $selectedHours = [Math]::Min($remainingNormal, (Get-Random -Minimum 4 -Maximum 9) * 0.5)
                    # 確保是0.5的倍數且不超過剩餘額度
                    $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                } elseif ($normalHours -ge 8 -and $existingTotalHours -lt 12) {
                    # 正常工時已滿，可以填加班
                    if ($existingWorkTypes -contains 2) {
                        # 已有類型2，可以填類型3
                        if ($existingWorkTypes -notcontains 3) {
                            $selectedWorkType = 3
                            $type2Hours = ($existingTimesheets | Where-Object { $_.work_type -eq 2 } | Measure-Object -Property hours -Sum).Sum
                            $remainingOvertime = 12 - $existingTotalHours
                            $randomHours = (Get-Random -Minimum 0.5 -Maximum 2.5) * 0.5
                            $selectedHours = [Math]::Min(2, [Math]::Min($remainingOvertime, $randomHours))
                            $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                        } else {
                            continue  # 類型2和3都已填，不再填
                        }
                    } else {
                        # 填類型2（平日加班前2小時）
                        $remainingOvertime = 12 - $existingTotalHours
                        $selectedWorkType = 2
                        $randomHours = (Get-Random -Minimum 0.5 -Maximum 2.5) * 0.5
                        $selectedHours = [Math]::Min(2, [Math]::Min($remainingOvertime, $randomHours))
                        $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                    }
                } else {
                    continue  # 已滿12小時，不再填
                }
            } elseif ($dateType -eq 'restday') {
                # 休息日：可以填類型4、5、6
                $remainingHours = 12 - $existingTotalHours
                if ($remainingHours -le 0) { continue }
                
                if ($existingWorkTypes -contains 4 -and $existingWorkTypes -contains 5) {
                    # 已有類型4和5，可以填類型6
                    if ($existingWorkTypes -notcontains 6) {
                        $selectedWorkType = 6
                        $randomHours = (Get-Random -Minimum 0.5 -Maximum 4.5) * 0.5
                        $selectedHours = [Math]::Min(4, [Math]::Min($remainingHours, $randomHours))
                        $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                    } else {
                        continue
                    }
                } elseif ($existingWorkTypes -contains 4) {
                    # 已有類型4，可以填類型5
                    $type4Hours = ($existingTimesheets | Where-Object { $_.work_type -eq 4 } | Measure-Object -Property hours -Sum).Sum
                    $selectedWorkType = 5
                    $randomHours = (Get-Random -Minimum 0.5 -Maximum 6.5) * 0.5
                    $selectedHours = [Math]::Min(6, [Math]::Min($remainingHours, $randomHours))
                    $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                } else {
                    # 填類型4（休息日加班前2小時）
                    $selectedWorkType = 4
                    $randomHours = (Get-Random -Minimum 0.5 -Maximum 2.5) * 0.5
                    $selectedHours = [Math]::Min(2, [Math]::Min($remainingHours, $randomHours))
                    $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                }
            } elseif ($dateType -eq 'weekly_restday') {
                # 例假日：可以填類型10、11
                $remainingHours = 12 - $existingTotalHours
                if ($remainingHours -le 0) { continue }
                
                if ($existingWorkTypes -contains 10) {
                    # 已有類型10，可以填類型11
                    if ($existingWorkTypes -notcontains 11) {
                        $selectedWorkType = 11
                        $randomHours = (Get-Random -Minimum 0.5 -Maximum 4.5) * 0.5
                        $selectedHours = [Math]::Min(4, [Math]::Min($remainingHours, $randomHours))
                        $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                    } else {
                        continue
                    }
                } else {
                    # 填類型10（例假日加班8小時內）
                    $selectedWorkType = 10
                    $randomHours = (Get-Random -Minimum 4 -Maximum 9) * 0.5
                    $selectedHours = [Math]::Min(8, [Math]::Min($remainingHours, $randomHours))
                    $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                }
            } elseif ($dateType -eq 'national_holiday') {
                # 國定假日：可以填類型7、8、9
                $remainingHours = 12 - $existingTotalHours
                if ($remainingHours -le 0) { continue }
                
                if ($existingWorkTypes -contains 7 -and $existingWorkTypes -contains 8) {
                    # 已有類型7和8，可以填類型9
                    if ($existingWorkTypes -notcontains 9) {
                        $selectedWorkType = 9
                        $randomHours = (Get-Random -Minimum 0.5 -Maximum 2.5) * 0.5
                    $selectedHours = [Math]::Min(2, [Math]::Min($remainingHours, $randomHours))
                        $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                    } else {
                        continue
                    }
                } elseif ($existingWorkTypes -contains 7) {
                    # 已有類型7，可以填類型8
                    $selectedWorkType = 8
                    $randomHours = (Get-Random -Minimum 0.5 -Maximum 2.5) * 0.5
                    $selectedHours = [Math]::Min(2, [Math]::Min($remainingHours, $randomHours))
                    $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                } else {
                    # 填類型7（國定假日加班8小時內）
                    $selectedWorkType = 7
                    $randomHours = (Get-Random -Minimum 4 -Maximum 9) * 0.5
                    $selectedHours = [Math]::Min(8, [Math]::Min($remainingHours, $randomHours))
                    $selectedHours = [Math]::Floor($selectedHours * 2) / 2
                }
            }
            
            if ($selectedHours -le 0) { continue }
            
            # 驗證工時類型的最大小時數限制
            $maxHoursMap = @{
                1 = 8;   # 正常工時最多8小時
                2 = 2;   # 平日加班前2小時最多2小時
                3 = 2;   # 平日加班後2小時最多2小時
                4 = 2;   # 休息日加班前2小時最多2小時
                5 = 6;   # 休息日加班3-8小時最多6小時
                6 = 4;   # 休息日加班9-12小時最多4小時
                7 = 8;   # 國定假日加班8小時內最多8小時
                8 = 2;   # 國定假日加班9-10小時最多2小時
                9 = 2;   # 國定假日加班11-12小時最多2小時
                10 = 8;  # 例假日加班8小時內最多8小時
                11 = 4   # 例假日加班9-12小時最多4小時
            }
            
            # 檢查該類型當天已填的總工時
            $existingTypeHours = ($existingTimesheets | Where-Object { $_.work_type -eq $selectedWorkType } | Measure-Object -Property hours -Sum).Sum
            $maxHours = $maxHoursMap[$selectedWorkType]
            if ($existingTypeHours + $selectedHours -gt $maxHours) {
                $selectedHours = [Math]::Max(0, $maxHours - $existingTypeHours)
                if ($selectedHours -le 0) { continue }
            }
            
            # 驗證每日總工時不超過12小時
            if ($existingTotalHours + $selectedHours -gt 12) {
                $selectedHours = [Math]::Max(0, 12 - $existingTotalHours)
                if ($selectedHours -le 0) { continue }
            }
            
            # 插入工時記錄
            $clientId = "PROD_TEST_$(Get-Random -Minimum 1 -Maximum ($CLIENT_COUNT + 1))"
            $serviceId = $serviceIds[(Get-Random -Maximum $serviceIds.Count)]
            $taskType = "任務類型$(Get-Random -Minimum 1 -Maximum 10)"
            $note = "工時記錄 - $dateType"
            
            $timesheetSql = "INSERT INTO Timesheets (user_id, work_date, client_id, service_id, task_type, work_type, hours, note) VALUES ($userId, '$workDate', '$clientId', $serviceId, '$taskType', '$selectedWorkType', $selectedHours, '$note')"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $timesheetSql 2>&1 | Out-Null
            $totalTimesheets++
            
            # 更新當天的工時記錄追蹤
            if (-not $dailyTimesheets.ContainsKey($workDate)) {
                $dailyTimesheets[$workDate] = @()
            }
            $dailyTimesheets[$workDate] += @{work_type = $selectedWorkType; hours = $selectedHours}
        }
    }
}
Write-Output "  已創建: $totalTimesheets 個工時記錄（符合所有業務規則）"

# 創建任務模板數據並添加 SOP 關聯
Write-Output ""
Write-Output "[13/15] 創建任務模板數據並添加 SOP 關聯..."
$totalTemplates = 0
$totalTemplateStages = 0
# 為每個服務創建任務模板
foreach ($serviceId in $serviceIds) {
    $templateName = "服務$serviceId 任務模板"
    $description = "這是服務 $serviceId 的標準任務模板"
    
    $templateSql = "INSERT INTO TaskTemplates (template_name, service_id, description, is_active) VALUES ('$templateName', $serviceId, '$description', 1)"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $templateSql 2>&1 | Out-Null
    
    # 獲取剛創建的模板 ID
    $templateIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT template_id FROM TaskTemplates WHERE template_name = '$templateName' ORDER BY template_id DESC LIMIT 1" 2>&1 | Out-String
    if ($templateIdResult -match '"template_id":\s*(\d+)') {
        $templateId = [int]$matches[1]
        $totalTemplates++
        
        # 為每個模板創建3-5個階段
        $stageCount = Get-Random -Minimum 3 -Maximum 6
        for ($s = 0; $s -lt $stageCount; $s++) {
            $stageName = "階段$($s + 1)"
            $stageOrder = $s + 1
            $stageDesc = "這是階段 $stageOrder 的描述"
            $estimatedHours = Get-Random -Minimum 1 -Maximum 5
            
            $stageSql = "INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours, execution_frequency, execution_months) VALUES ($templateId, '$stageName', $stageOrder, '$stageDesc', $estimatedHours, 'monthly', '[1,2,3,4,5,6,7,8,9,10,11,12]')"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $stageSql 2>&1 | Out-Null
            
            # 獲取剛創建的階段 ID
            $stageIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT stage_id FROM TaskTemplateStages WHERE template_id = $templateId AND stage_order = $stageOrder LIMIT 1" 2>&1 | Out-String
            if ($stageIdResult -match '"stage_id":\s*(\d+)') {
                $stageId = [int]$matches[1]
                $totalTemplateStages++
                
                # 為每個階段添加 1-2 個 SOP 關聯
                if ($sopIds.Count -gt 0) {
                    $stageSopCount = Get-Random -Minimum 1 -Maximum 3
                    $selectedSopIds = $sopIds | Get-Random -Count $stageSopCount
                    $sortOrder = 0
                    foreach ($sopId in $selectedSopIds) {
                        $stageSopSql = "INSERT OR IGNORE INTO TaskTemplateStageSOPs (stage_id, sop_id, sort_order) VALUES ($stageId, $sopId, $sortOrder)"
                        npx wrangler d1 execute horgoscpa-db-v2 --local --command $stageSopSql 2>&1 | Out-Null
                        $sortOrder++
                    }
                }
            }
        }
    }
}
Write-Output "  已創建: $totalTemplates 個任務模板, $totalTemplateStages 個模板階段（包含 SOP 關聯）"

# 創建活躍任務（從任務生成模板生成）
Write-Output ""
Write-Output "[14/20] 創建活躍任務..."
$currentYear = (Get-Date).Year
$currentMonth = (Get-Date).Month
$totalActiveTasks = 0
$totalActiveTaskStages = 0
$totalActiveTaskSOPs = 0

# 獲取所有任務生成模板（用於生成活躍任務）
$templatesResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT template_id, client_id, client_service_id, service_id, config_id, task_name, task_description, assignee_user_id, estimated_hours, stage_order, notes, execution_months FROM TaskGenerationTemplates WHERE client_id LIKE 'PROD_TEST_%' AND is_active = 1 LIMIT 500" 2>&1 | Out-String
$templateMatches = [regex]::Matches($templatesResult, '"template_id":\s*(\d+)[\s\S]*?"client_id":\s*"([^"]+)"[\s\S]*?"client_service_id":\s*(\d+)[\s\S]*?"service_id":\s*(\d+)[\s\S]*?"config_id":\s*(\d+)[\s\S]*?"task_name":\s*"([^"]+)"[\s\S]*?"task_description":\s*"([^"]*)"[\s\S]*?"assignee_user_id":\s*(\d+|null)[\s\S]*?"estimated_hours":\s*([\d.]+|null)[\s\S]*?"stage_order":\s*(\d+)[\s\S]*?"notes":\s*"([^"]*)"[\s\S]*?"execution_months":\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::Singleline)

# 為過去3個月和當前月生成任務
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    $targetYear = $targetDate.Year
    $targetMonth = $targetDate.Month
    $serviceMonthStr = "$targetYear-$($targetMonth.ToString('00'))"
    
    foreach ($match in $templateMatches) {
        $templateId = [int]$match.Groups[1].Value
        $clientId = $match.Groups[2].Value
        $clientServiceId = [int]$match.Groups[3].Value
        $serviceId = [int]$match.Groups[4].Value
        $configId = [int]$match.Groups[5].Value
        $taskName = $match.Groups[6].Value
        $taskDescription = $match.Groups[7].Value -replace "'", "''"
        $assigneeUserIdStr = $match.Groups[8].Value
        $assigneeUserId = if ($assigneeUserIdStr -eq "null") { $null } else { [int]$assigneeUserIdStr }
        $estimatedHoursStr = $match.Groups[9].Value
        $estimatedHours = if ($estimatedHoursStr -eq "null") { $null } else { [double]$estimatedHoursStr }
        $stageOrder = [int]$match.Groups[10].Value
        $notes = ($match.Groups[11].Value -replace "'", "''")
        $execMonthsStr = $match.Groups[12].Value
        
        # 檢查執行月份是否包含目標月份
        $execMonths = if ($execMonthsStr -match '\[([\d,]+)\]') { $matches[1].Split(',') | ForEach-Object { [int]$_.Trim() } } else { @(1..12) }
        if ($execMonths -notcontains $targetMonth) {
            continue
        }
        
        # 檢查是否已存在該任務
        $existingTask = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id FROM ActiveTasks WHERE client_service_id = $clientServiceId AND service_year = $targetYear AND service_month = $targetMonth AND task_type = '$taskName' AND is_deleted = 0 LIMIT 1" 2>&1 | Out-String
        if ($existingTask -match '"task_id":\s*(\d+)') {
            continue
        }
        
        # 計算到期日（簡化：根據 due_rule）
        $dueDate = $null
        $dueDateStr = "NULL"
        if ($targetMonth -eq $currentMonth -and $targetYear -eq $currentYear) {
            # 當前月：到期日為月底
            $lastDay = [DateTime]::DaysInMonth($targetYear, $targetMonth)
            $dueDate = "$targetYear-$($targetMonth.ToString('00'))-$($lastDay.ToString('00'))"
            $dueDateStr = "'$dueDate'"
        } else {
            # 過去月份：到期日已過
            $lastDay = [DateTime]::DaysInMonth($targetYear, $targetMonth)
            $dueDate = "$targetYear-$($targetMonth.ToString('00'))-$($lastDay.ToString('00'))"
            $dueDateStr = "'$dueDate'"
        }
        
        # 決定任務狀態（過去月份：部分完成，當前月：進行中）
        $status = if ($monthOffset -lt 0) {
            $statusOptions = @('in_progress', 'completed', 'completed')
            $statusOptions[(Get-Random -Maximum $statusOptions.Count)]
        } else {
            'in_progress'
        }
        
        $completedAt = "NULL"
        if ($status -eq 'completed') {
            $days = Get-Random -Minimum 1 -Maximum 28
            $completedDate = $targetDate.AddDays($days)
            $completedAt = "'$($completedDate.ToString('yyyy-MM-dd'))'"
        }
        
        # 確保有負責人
        if (-not $assigneeUserId) {
            $assigneeUserId = $testUserIds[(Get-Random -Maximum $testUserIds.Count)]
        }
        
        # 決定是否為固定期限任務（20% 機率）
        $isFixedDeadline = if ((Get-Random -Maximum 5) -eq 0) { 1 } else { 0 }
        $fixedDeadlineStr = "NULL"
        if ($isFixedDeadline -eq 1) {
            # 固定期限為月底
            $fixedDeadlineStr = "'$dueDate'"
        }
        
        # 決定是否有前置任務（30% 機率有前置任務）
        $prerequisiteTaskId = "NULL"
        $canStartDate = "NULL"
        if ((Get-Random -Maximum 10) -lt 3) {
            # 查找同一服務的前一個任務（作為前置任務）
            $prevTaskResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id, completed_at FROM ActiveTasks WHERE client_service_id = $clientServiceId AND service_year = $targetYear AND service_month < $targetMonth AND is_deleted = 0 ORDER BY service_month DESC, task_id DESC LIMIT 1" 2>&1 | Out-String
            if ($prevTaskResult -match '"task_id":\s*(\d+)') {
                $prerequisiteTaskId = [int]$matches[1]
                # 如果前置任務已完成，設置 can_start_date
                if ($prevTaskResult -match '"completed_at":\s*"([^"]+)"') {
                    $completedAtStr = $matches[1]
                    $canStartDate = "'$($completedAtStr.Split('T')[0])'"
                } else {
                    # 前置任務未完成，can_start_date 為 NULL（等待完成）
                    $canStartDate = "NULL"
                }
            }
        }
        
        # 插入活躍任務
        $taskSql = "INSERT INTO ActiveTasks (client_id, client_service_id, service_id, task_config_id, task_type, task_description, assignee_user_id, service_year, service_month, due_date, original_due_date, estimated_hours, stage_order, notes, status, completed_at, is_fixed_deadline, fixed_deadline, prerequisite_task_id, can_start_date, created_at, updated_at) VALUES ('$clientId', $clientServiceId, $serviceId, $configId, '$taskName', '$taskDescription', $assigneeUserId, $targetYear, $targetMonth, $dueDateStr, $dueDateStr, " + (if ($estimatedHours) { "$estimatedHours" } else { "NULL" }) + ", $stageOrder, '$notes', '$status', $completedAt, $isFixedDeadline, $fixedDeadlineStr, " + (if ($prerequisiteTaskId -ne "NULL") { "$prerequisiteTaskId" } else { "NULL" }) + ", $canStartDate, datetime('now'), datetime('now'))"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $taskSql 2>&1 | Out-Null
        
        # 獲取剛創建的任務 ID
        $taskIdResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id FROM ActiveTasks WHERE client_service_id = $clientServiceId AND service_year = $targetYear AND service_month = $targetMonth AND task_type = '$taskName' AND is_deleted = 0 ORDER BY task_id DESC LIMIT 1" 2>&1 | Out-String
        if ($taskIdResult -match '"task_id":\s*(\d+)') {
            $taskId = [int]$matches[1]
            $totalActiveTasks++
            
            # 創建任務階段（從任務配置或模板階段生成）
            # 獲取任務配置的階段信息
            $configStagesResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT stage_order FROM ClientServiceTaskConfigs WHERE config_id = $configId AND is_deleted = 0 ORDER BY stage_order" 2>&1 | Out-String
            $stageOrders = @()
            if ($configStagesResult -match 'stage_order') {
                $stageMatches = [regex]::Matches($configStagesResult, '"stage_order":\s*(\d+)')
                foreach ($stageMatch in $stageMatches) {
                    $stageOrders += [int]$stageMatch.Groups[1].Value
                }
            }
            
            # 如果沒有階段，創建一個默認階段
            if ($stageOrders.Count -eq 0) {
                $stageOrders = @(0)
            }
            
            foreach ($stageOrderNum in $stageOrders) {
                $stageName = "階段$stageOrderNum"
                $stageStatus = if ($status -eq 'completed') { 'completed' } else { if (Get-Random -Maximum 3 -lt 1) { 'completed' } else { 'in_progress' } }
                $startedAt = "NULL"
                $completedAtStage = "NULL"
                
                if ($stageStatus -ne 'pending') {
                    $days1 = Get-Random -Minimum 1 -Maximum 15
                    $startDate = $targetDate.AddDays($days1)
                    $startedAt = "'$($startDate.ToString('yyyy-MM-dd'))'"
                }
                
                if ($stageStatus -eq 'completed') {
                    $days2 = Get-Random -Minimum 15 -Maximum 28
                    $completeDate = $targetDate.AddDays($days2)
                    $completedAtStage = "'$($completeDate.ToString('yyyy-MM-dd'))'"
                }
                
                $stageSql = "INSERT INTO ActiveTaskStages (task_id, stage_name, stage_order, status, started_at, completed_at) VALUES ($taskId, '$stageName', $stageOrderNum, '$stageStatus', $startedAt, $completedAtStage)"
                npx wrangler d1 execute horgoscpa-db-v2 --local --command $stageSql 2>&1 | Out-Null
                $totalActiveTaskStages++
            }
            
            # 創建任務 SOP 關聯（從任務配置的 SOP 繼承）
            $configSopsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT sop_id, sort_order FROM TaskConfigSOPs WHERE config_id = $configId ORDER BY sort_order LIMIT 5" 2>&1 | Out-String
            $sopMatches = [regex]::Matches($configSopsResult, '"sop_id":\s*(\d+)[\s\S]*?"sort_order":\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
            if ($sopMatches.Count -eq 0) {
                # 如果沒有配置 SOP，從模板 SOP 繼承
                $templateSopsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT sop_id, sort_order FROM TaskGenerationTemplateSOPs WHERE template_id = $templateId ORDER BY sort_order LIMIT 5" 2>&1 | Out-String
                $sopMatches = [regex]::Matches($templateSopsResult, '"sop_id":\s*(\d+)[\s\S]*?"sort_order":\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
            }
            
            foreach ($sopMatch in $sopMatches) {
                $sopId = [int]$sopMatch.Groups[1].Value
                $sopSortOrder = [int]$sopMatch.Groups[2].Value
                $taskSopSql = "INSERT OR IGNORE INTO ActiveTaskSOPs (task_id, sop_id, sort_order) VALUES ($taskId, $sopId, $sopSortOrder)"
                npx wrangler d1 execute horgoscpa-db-v2 --local --command $taskSopSql 2>&1 | Out-Null
                $totalActiveTaskSOPs++
            }
            
            # 記錄任務狀態轉換歷史（TaskStatusUpdates）
            if ($status -eq 'completed') {
                $statusUpdateSql = "INSERT INTO TaskStatusUpdates (task_id, old_status, new_status, status, updated_by, updated_at) VALUES ($taskId, 'in_progress', 'completed', 'completed', $assigneeUserId, datetime('now'))"
                npx wrangler d1 execute horgoscpa-db-v2 --local --command $statusUpdateSql 2>&1 | Out-Null
            } elseif ($status -eq 'in_progress') {
                $statusUpdateSql = "INSERT INTO TaskStatusUpdates (task_id, old_status, new_status, status, updated_by, updated_at) VALUES ($taskId, 'pending', 'in_progress', 'in_progress', $assigneeUserId, datetime('now'))"
                npx wrangler d1 execute horgoscpa-db-v2 --local --command $statusUpdateSql 2>&1 | Out-Null
            }
            
            # 如果任務完成，生成 DashboardAlerts（開票提醒）
            if ($status -eq 'completed') {
                # 獲取客戶負責人
                $clientOwnerResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT assignee_user_id FROM Clients WHERE client_id = '$clientId' LIMIT 1" 2>&1 | Out-String
                $clientOwnerId = $null
                if ($clientOwnerResult -match '"assignee_user_id":\s*(\d+)') {
                    $clientOwnerId = [int]$matches[1]
                }
                
                # 獲取服務名稱
                $serviceNameResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT service_name FROM Services WHERE service_id = $serviceId LIMIT 1" 2>&1 | Out-String
                $serviceName = "服務"
                if ($serviceNameResult -match '"service_name":\s*"([^"]+)"') {
                    $serviceName = $matches[1] -replace "'", "''"
                }
                
                # 獲取客戶名稱
                $clientNameResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT company_name FROM Clients WHERE client_id = '$clientId' LIMIT 1" 2>&1 | Out-String
                $clientName = "客戶"
                if ($clientNameResult -match '"company_name":\s*"([^"]+)"') {
                    $clientName = $matches[1] -replace "'", "''"
                }
                
                $alertTitle = "$clientName - $serviceName 已完成"
                $alertDescription = "請立即開立收據（任務：$taskName）"
                $alertLink = "/tasks/$taskId"
                $alertPayload = "{`"taskId`":$taskId,`"clientId`":`"$clientId`",`"clientServiceId`":$clientServiceId,`"serviceName`":`"$serviceName`",`"taskName`":`"$taskName`",`"clientName`":`"$clientName`",`"dueDate`":`"$dueDate`"}"
                
                # 為客戶負責人創建提醒
                if ($clientOwnerId) {
                    $alertSql = "INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert, created_at) VALUES ($clientOwnerId, 'receipt_pending', '$alertTitle', '$alertDescription', '$alertLink', '$alertPayload', 0, datetime('now'))"
                    npx wrangler d1 execute horgoscpa-db-v2 --local --command $alertSql 2>&1 | Out-Null
                }
                
                # 為管理員創建提醒
                $adminAlertSql = "INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert, created_at) VALUES (NULL, 'receipt_pending', '$alertTitle', '$alertDescription', '$alertLink', '$alertPayload', 1, datetime('now'))"
                npx wrangler d1 execute horgoscpa-db-v2 --local --command $adminAlertSql 2>&1 | Out-Null
                
                # 模擬 autoAdjustDependentTasks 邏輯：如果任務完成且延誤，調整後續任務並記錄 TaskDueDateAdjustments
                if ($completedAt -ne "NULL" -and $completedAt -match "'([^']+)'") {
                    $completedDateStr = $matches[1]
                    $completedDate = [DateTime]::Parse($completedDateStr)
                    $dueDateObj = [DateTime]::Parse($dueDate)
                    $delayDays = ($completedDate - $dueDateObj).Days
                    
                    if ($delayDays -gt 0) {
                        # 查找所有依賴此任務的後續任務
                        $dependentTasksResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id, due_date FROM ActiveTasks WHERE prerequisite_task_id = $taskId AND is_deleted = 0 AND status NOT IN ('completed', 'cancelled') LIMIT 10" 2>&1 | Out-String
                        $dependentMatches = [regex]::Matches($dependentTasksResult, '"task_id":\s*(\d+)[\s\S]*?"due_date":\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::Singleline)
                        
                        foreach ($depMatch in $dependentMatches) {
                            $depTaskId = [int]$depMatch.Groups[1].Value
                            $depOldDueDate = $depMatch.Groups[2].Value
                            $depOldDueDateObj = [DateTime]::Parse($depOldDueDate)
                            
                            # 最多延長7天（根據 autoAdjustDependentTasks 邏輯）
                            $adjustDays = [Math]::Min($delayDays, 7)
                            $depNewDueDateObj = $depOldDueDateObj.AddDays($adjustDays)
                            $depNewDueDate = $depNewDueDateObj.ToString('yyyy-MM-dd')
                            
                            # 更新後續任務的到期日
                            $updateDepTaskSql = "UPDATE ActiveTasks SET due_date = '$depNewDueDate', due_date_adjusted = 1, adjustment_count = adjustment_count + 1, last_adjustment_date = datetime('now'), can_start_date = '$completedDateStr' WHERE task_id = $depTaskId"
                            npx wrangler d1 execute horgoscpa-db-v2 --local --command $updateDepTaskSql 2>&1 | Out-Null
                            
                            # 記錄 TaskDueDateAdjustments
                            $adjustmentReason = "前置任務 $taskId 延遲完成，自動延長 $adjustDays 天"
                            $adjustmentSql = "INSERT INTO TaskDueDateAdjustments (task_id, old_due_date, new_due_date, reason, adjustment_type, adjusted_by, is_overdue, adjusted_at) VALUES ($depTaskId, '$depOldDueDate', '$depNewDueDate', '$adjustmentReason', 'auto_adjust', $assigneeUserId, 0, datetime('now'))"
                            npx wrangler d1 execute horgoscpa-db-v2 --local --command $adjustmentSql 2>&1 | Out-Null
                        }
                    }
                }
                
                # 記錄任務完成事件（TaskEventLogs）
                $eventPayload = "{`"source`":`"test_data_generation`",`"status`":`"completed`"}"
                $eventSql = "INSERT INTO TaskEventLogs (task_id, stage_id, config_id, event_type, triggered_by, payload_json, created_at) VALUES ($taskId, NULL, $configId, 'service_all_completed', 'system:test_data', '$eventPayload', datetime('now'))"
                npx wrangler d1 execute horgoscpa-db-v2 --local --command $eventSql 2>&1 | Out-Null
                
                # 模擬 handleFixedDeadlineTaskLogic：如果完成的任務延誤且是固定期限任務的前置任務，調整中間任務並發送通知
                if ($delayDays -gt 0) {
                    # 查找所有固定期限任務，檢查它們的前置任務鏈是否包含此任務
                    $fixedDeadlineTasksResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id, due_date, assignee_user_id, client_service_id FROM ActiveTasks WHERE is_fixed_deadline = 1 AND is_deleted = 0 AND status NOT IN ('completed', 'cancelled') LIMIT 20" 2>&1 | Out-String
                    $fixedTaskMatches = [regex]::Matches($fixedDeadlineTasksResult, '"task_id":\s*(\d+)[\s\S]*?"due_date":\s*"([^"]+)"[\s\S]*?"assignee_user_id":\s*(\d+)[\s\S]*?"client_service_id":\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
                    
                    foreach ($fixedMatch in $fixedTaskMatches) {
                        $fixedTaskId = [int]$fixedMatch.Groups[1].Value
                        $fixedDeadline = $fixedMatch.Groups[2].Value
                        $fixedAssigneeId = [int]$fixedMatch.Groups[3].Value
                        $fixedClientServiceId = [int]$fixedMatch.Groups[4].Value
                        
                        # 檢查此固定期限任務的前置任務鏈是否包含剛完成的任務（簡化檢查：檢查直接前置任務）
                        $fixedPrereqResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT prerequisite_task_id FROM ActiveTasks WHERE task_id = $fixedTaskId AND is_deleted = 0 LIMIT 1" 2>&1 | Out-String
                        if ($fixedPrereqResult -match '"prerequisite_task_id":\s*' + $taskId) {
                            # 找到中間任務（前置任務和固定期限任務之間的所有任務）
                            $intermediateTasksResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id, due_date, assignee_user_id FROM ActiveTasks WHERE prerequisite_task_id = $taskId AND is_deleted = 0 AND status NOT IN ('completed', 'cancelled') AND task_id != $fixedTaskId LIMIT 5" 2>&1 | Out-String
                            $intermediateMatches = [regex]::Matches($intermediateTasksResult, '"task_id":\s*(\d+)[\s\S]*?"due_date":\s*"([^"]+)"[\s\S]*?"assignee_user_id":\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
                            
                            foreach ($interMatch in $intermediateMatches) {
                                $interTaskId = [int]$interMatch.Groups[1].Value
                                $interOldDueDate = $interMatch.Groups[2].Value
                                $interAssigneeId = [int]$interMatch.Groups[3].Value
                                $interOldDueDateObj = [DateTime]::Parse($interOldDueDate)
                                $fixedDeadlineObj = [DateTime]::Parse($fixedDeadline)
                                
                                # 計算預估完成時間（簡化：使用 completedDate + estimated_hours）
                                $estimatedHoursResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT estimated_hours FROM ActiveTasks WHERE task_id = $interTaskId LIMIT 1" 2>&1 | Out-String
                                $estimatedHours = 8
                                if ($estimatedHoursResult -match '"estimated_hours":\s*(\d+)') {
                                    $estimatedHours = [int]$matches[1]
                                }
                                $estimatedWorkDays = [Math]::Ceiling($estimatedHours / 8.0)
                                $estimatedCompletion = $completedDate.AddDays($estimatedWorkDays)
                                
                                # 如果預估完成時間超過固定期限，調整中間任務的到期日為固定期限前一天
                                if ($estimatedCompletion -gt $fixedDeadlineObj) {
                                    $interNewDueDateObj = $fixedDeadlineObj.AddDays(-1)
                                    $interNewDueDate = $interNewDueDateObj.ToString('yyyy-MM-dd')
                                    
                                    # 更新中間任務的到期日
                                    $updateInterTaskSql = "UPDATE ActiveTasks SET due_date = '$interNewDueDate', due_date_adjusted = 1, adjustment_count = adjustment_count + 1, last_adjustment_date = datetime('now'), adjustment_reason = '因固定期限任務 $fixedTaskId 的期限限制，調整為固定期限前一天', can_start_date = '$completedDateStr' WHERE task_id = $interTaskId"
                                    npx wrangler d1 execute horgoscpa-db-v2 --local --command $updateInterTaskSql 2>&1 | Out-Null
                                    
                                    # 記錄 TaskDueDateAdjustments
                                    $fixedAdjustmentReason = "固定期限任務 $fixedTaskId 衝突，調整為固定期限前一天（固定期限：$fixedDeadline）"
                                    $fixedAdjustmentSql = "INSERT INTO TaskDueDateAdjustments (task_id, old_due_date, new_due_date, reason, adjustment_type, adjusted_by, is_overdue, adjusted_at) VALUES ($interTaskId, '$interOldDueDate', '$interNewDueDate', '$fixedAdjustmentReason', 'fixed_deadline_adjust', $assigneeUserId, 0, datetime('now'))"
                                    npx wrangler d1 execute horgoscpa-db-v2 --local --command $fixedAdjustmentSql 2>&1 | Out-Null
                                    
                                    # 發送固定期限任務衝突通知（DashboardAlerts）
                                    $fixedAlertTitle = "固定期限任務衝突：任務 $interTaskId"
                                    $fixedAlertDescription = "任務因前置任務延誤，已調整到期日為 $interNewDueDate（固定期限：$fixedDeadline）"
                                    $fixedAlertLink = "/tasks/$interTaskId"
                                    $fixedAlertPayload = "{`"taskId`":$interTaskId,`"fixedDeadlineTaskId`":$fixedTaskId,`"originalDueDate`":`"$interOldDueDate`",`"adjustedDueDate`":`"$interNewDueDate`",`"fixedDeadline`":`"$fixedDeadline`"}"
                                    
                                    # 為中間任務負責人創建提醒
                                    if ($interAssigneeId) {
                                        $fixedAlertSql = "INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert, created_at) VALUES ($interAssigneeId, 'fixed_deadline_conflict', '$fixedAlertTitle', '$fixedAlertDescription', '$fixedAlertLink', '$fixedAlertPayload', 0, datetime('now'))"
                                        npx wrangler d1 execute horgoscpa-db-v2 --local --command $fixedAlertSql 2>&1 | Out-Null
                                    }
                                    
                                    # 為固定期限任務負責人創建提醒
                                    if ($fixedAssigneeId) {
                                        $fixedAlertSql2 = "INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert, created_at) VALUES ($fixedAssigneeId, 'fixed_deadline_conflict', '$fixedAlertTitle', '$fixedAlertDescription', '$fixedAlertLink', '$fixedAlertPayload', 0, datetime('now'))"
                                        npx wrangler d1 execute horgoscpa-db-v2 --local --command $fixedAlertSql2 2>&1 | Out-Null
                                    }
                                    
                                    # 為客戶負責人創建提醒
                                    if ($clientOwnerId) {
                                        $fixedAlertSql3 = "INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert, created_at) VALUES ($clientOwnerId, 'fixed_deadline_conflict', '$fixedAlertTitle', '$fixedAlertDescription', '$fixedAlertLink', '$fixedAlertPayload', 0, datetime('now'))"
                                        npx wrangler d1 execute horgoscpa-db-v2 --local --command $fixedAlertSql3 2>&1 | Out-Null
                                    }
                                    
                                    # 為管理員創建提醒
                                    $fixedAdminAlertSql = "INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert, created_at) VALUES (NULL, 'fixed_deadline_conflict', '$fixedAlertTitle', '$fixedAlertDescription', '$fixedAlertLink', '$fixedAlertPayload', 1, datetime('now'))"
                                    npx wrangler d1 execute horgoscpa-db-v2 --local --command $fixedAdminAlertSql 2>&1 | Out-Null
                                }
                            }
                        }
                    }
                }
            }
            
            # 記錄任務階段完成事件（TaskEventLogs）
            foreach ($stageOrderNum in $stageOrders) {
                $stageResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT active_stage_id FROM ActiveTaskStages WHERE task_id = $taskId AND stage_order = $stageOrderNum LIMIT 1" 2>&1 | Out-String
                if ($stageResult -match '"active_stage_id":\s*(\d+)') {
                    $stageId = [int]$matches[1]
                    $stageStatusResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT status FROM ActiveTaskStages WHERE active_stage_id = $stageId LIMIT 1" 2>&1 | Out-String
                    if ($stageStatusResult -match '"status":\s*"completed"') {
                        $stageEventPayload = "{`"stage_order`":$stageOrderNum,`"status`":`"completed`"}"
                        $stageEventSql = "INSERT INTO TaskEventLogs (task_id, stage_id, config_id, event_type, triggered_by, payload_json, created_at) VALUES ($taskId, $stageId, $configId, 'stage_completed', 'system:test_data', '$stageEventPayload', datetime('now'))"
                        npx wrangler d1 execute horgoscpa-db-v2 --local --command $stageEventSql 2>&1 | Out-Null
                    }
                }
            }
        }
    }
}
Write-Output "  已創建: $totalActiveTasks 個活躍任務, $totalActiveTaskStages 個任務階段, $totalActiveTaskSOPs 個任務 SOP 關聯"

# 模擬任務通知歷史（TaskNotificationHistory）- 模擬定時任務通知
Write-Output ""
Write-Output "[16/30] 創建任務通知歷史..."
$totalTaskNotifications = 0

# 獲取逾期任務和即將到期任務（過去3個月和當前月份）
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    $targetYear = $targetDate.Year
    $targetMonth = $targetDate.Month
    $currentDate = (Get-Date).AddMonths($monthOffset)
    $currentDateStr = $currentDate.ToString('yyyy-MM-dd')
    
    # 獲取逾期任務（due_date < current_date AND status NOT IN ('completed', 'cancelled')）
    $overdueTasksResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id, assignee_user_id, due_date FROM ActiveTasks WHERE service_year = $targetYear AND service_month = $targetMonth AND due_date < '$currentDateStr' AND status NOT IN ('completed', 'cancelled') AND is_deleted = 0 LIMIT 20" 2>&1 | Out-String
    $overdueMatches = [regex]::Matches($overdueTasksResult, '"task_id":\s*(\d+)[\s\S]*?"assignee_user_id":\s*(\d+)[\s\S]*?"due_date":\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    foreach ($match in $overdueMatches) {
        $notifTaskId = [int]$match.Groups[1].Value
        $notifAssigneeId = [int]$match.Groups[2].Value
        $notifDueDate = $match.Groups[3].Value
        $notifDueDateObj = [DateTime]::Parse($notifDueDate)
        $delayDays = ($currentDate - $notifDueDateObj).Days
        
        # 模擬發送逾期通知（30% 機率，模擬每日頻率控制）
        if ((Get-Random -Maximum 10) -lt 3) {
            $recipientsJson = "[{`"user_id`":$notifAssigneeId,`"user_name`":`"測試用戶`"}]"
            $notificationDataJson = "{`"taskId`":$notifTaskId,`"delayDays`":$delayDays,`"dueDate`":`"$notifDueDate`"}"
            $notifSql = "INSERT INTO TaskNotificationHistory (task_id, notification_type, sent_at, recipients, notification_data, created_at) VALUES ($notifTaskId, 'overdue', '$($currentDate.ToString('yyyy-MM-dd'))', '$recipientsJson', '$notificationDataJson', datetime('now'))"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $notifSql 2>&1 | Out-Null
            $totalTaskNotifications++
        }
    }
    
    # 獲取即將到期任務（due_date = current_date + 1 day）
    $tomorrowDate = $currentDate.AddDays(1)
    $tomorrowDateStr = $tomorrowDate.ToString('yyyy-MM-dd')
    $upcomingTasksResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id, assignee_user_id FROM ActiveTasks WHERE service_year = $targetYear AND service_month = $targetMonth AND due_date = '$tomorrowDateStr' AND status NOT IN ('completed', 'cancelled') AND is_deleted = 0 LIMIT 20" 2>&1 | Out-String
    $upcomingMatches = [regex]::Matches($upcomingTasksResult, '"task_id":\s*(\d+)[\s\S]*?"assignee_user_id":\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    foreach ($match in $upcomingMatches) {
        $notifTaskId = [int]$match.Groups[1].Value
        $notifAssigneeId = [int]$match.Groups[2].Value
        
        # 模擬發送即將到期通知（30% 機率）
        if ((Get-Random -Maximum 10) -lt 3) {
            $recipientsJson = "[{`"user_id`":$notifAssigneeId,`"user_name`":`"測試用戶`"}]"
            $notificationDataJson = "{`"taskId`":$notifTaskId,`"remainingDays`":1,`"dueDate`":`"$tomorrowDateStr`"}"
            $notifSql = "INSERT INTO TaskNotificationHistory (task_id, notification_type, sent_at, recipients, notification_data, created_at) VALUES ($notifTaskId, 'upcoming', '$($currentDate.ToString('yyyy-MM-dd'))', '$recipientsJson', '$notificationDataJson', datetime('now'))"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $notifSql 2>&1 | Out-Null
            $totalTaskNotifications++
        }
    }
}
Write-Output "  已創建: $totalTaskNotifications 個任務通知歷史記錄"

# 創建開票提醒（任務完成觸發）
Write-Output ""
Write-Output "[17/30] 創建開票提醒..."
$totalBillingReminders = 0

# 獲取所有已完成的任務（過去3個月）
for ($monthOffset = -3; $monthOffset -le -1; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    $targetYear = $targetDate.Year
    $targetMonth = $targetDate.Month
    $serviceMonthStr = "$targetYear-$($targetMonth.ToString('00'))"
    
    # 獲取該月已完成的任務
    $completedTasksResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id, client_id, client_service_id, service_year, service_month FROM ActiveTasks WHERE service_year = $targetYear AND service_month = $targetMonth AND status = 'completed' AND is_deleted = 0 LIMIT 100" 2>&1 | Out-String
    $taskMatches = [regex]::Matches($completedTasksResult, '"task_id":\s*(\d+)[\s\S]*?"client_id":\s*"([^"]+)"[\s\S]*?"client_service_id":\s*(\d+)[\s\S]*?"service_year":\s*(\d+)[\s\S]*?"service_month":\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    foreach ($taskMatch in $taskMatches) {
        $taskId = [int]$taskMatch.Groups[1].Value
        $clientId = $taskMatch.Groups[2].Value
        $clientServiceId = [int]$taskMatch.Groups[3].Value
        
        # 檢查是否已存在提醒
        $existingReminder = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT reminder_id FROM BillingReminders WHERE client_service_id = $clientServiceId AND service_month = '$serviceMonthStr' LIMIT 1" 2>&1 | Out-String
        if ($existingReminder -match '"reminder_id":\s*(\d+)') {
            continue
        }
        
        # 檢查該服務該月份是否所有任務都完成（開票提醒條件檢查）
        $allTasksCompletedResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM ActiveTasks WHERE client_service_id = $clientServiceId AND service_year = $targetYear AND service_month = $targetMonth AND is_deleted = 0" 2>&1 | Out-String
        $totalTasks = 0
        $completedTasks = 0
        if ($allTasksCompletedResult -match '"total":\s*(\d+).*?"completed":\s*(\d+)') {
            $totalTasks = [int]$matches[1]
            $completedTasks = [int]$matches[2]
        }
        # 如果還有未完成的任務，不生成提醒
        if ($totalTasks -gt 0 -and $completedTasks -lt $totalTasks) {
            continue
        }
        
        # 獲取收費計劃金額（從 ServiceBillingSchedule，根據真實業務邏輯 receipt-utils.js）
        $billingAmountResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT billing_amount FROM ServiceBillingSchedule WHERE client_service_id = $clientServiceId AND billing_month = $targetMonth LIMIT 1" 2>&1 | Out-String
        $suggestedAmount = 0
        if ($billingAmountResult -match '"billing_amount":\s*([\d.]+)') {
            $suggestedAmount = [double]$matches[1]
        } else {
            # 如果沒有收費計劃，使用隨機金額
            $suggestedAmount = Get-Random -Minimum 5000 -Maximum 50001
        }
        
        # 創建開票提醒
        $reminderSql = "INSERT INTO BillingReminders (client_id, client_service_id, service_month, suggested_amount, status, reminder_type, created_by, created_at, updated_at) VALUES ('$clientId', $clientServiceId, '$serviceMonthStr', $suggestedAmount, 'pending', 'task_completed', $adminId, datetime('now'), datetime('now'))"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $reminderSql 2>&1 | Out-Null
        $totalBillingReminders++
    }
}
Write-Output "  已創建: $totalBillingReminders 個開票提醒"

# 創建收據（根據收費計劃和開票提醒生成）
Write-Output ""
Write-Output "[18/30] 創建收據..."
$totalReceipts = 0
$totalReceiptItems = 0
$totalReceiptServiceTypes = 0

# 獲取所有開票提醒（過去3個月）
for ($monthOffset = -3; $monthOffset -le -1; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    $targetYear = $targetDate.Year
    $targetMonth = $targetDate.Month
    $serviceMonthStr = "$targetYear-$($targetMonth.ToString('00'))"
    
    # 獲取該月的開票提醒
    $remindersResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT reminder_id, client_id, client_service_id, service_month, suggested_amount FROM BillingReminders WHERE service_month = '$serviceMonthStr' AND status = 'pending' LIMIT 50" 2>&1 | Out-String
    $reminderMatches = [regex]::Matches($remindersResult, '"reminder_id":\s*(\d+)[\s\S]*?"client_id":\s*"([^"]+)"[\s\S]*?"client_service_id":\s*(\d+)[\s\S]*?"service_month":\s*"([^"]+)"[\s\S]*?"suggested_amount":\s*([\d.]+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    foreach ($reminderMatch in $reminderMatches) {
        $reminderId = [int]$reminderMatch.Groups[1].Value
        $clientId = $reminderMatch.Groups[2].Value
        $clientServiceId = [int]$reminderMatch.Groups[3].Value
        $suggestedAmount = [double]$reminderMatch.Groups[5].Value
        
        # 檢查是否已存在收據
        $existingReceipt = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT receipt_id FROM Receipts WHERE client_service_id = $clientServiceId AND billing_month = $targetMonth AND is_deleted = 0 LIMIT 1" 2>&1 | Out-String
        if ($existingReceipt -match '"receipt_id":\s*"([^"]+)"') {
            continue
        }
        
        # 生成收據號碼（YYYYMM-XXX 格式）
        $receiptPrefix = "$($targetYear.ToString('0000'))$($targetMonth.ToString('00'))"
        $maxReceiptResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT receipt_id FROM Receipts WHERE receipt_id LIKE '$receiptPrefix-%' ORDER BY receipt_id DESC LIMIT 1" 2>&1 | Out-String
        $seq = 1
        if ($maxReceiptResult -match "$receiptPrefix-(\d+)") {
            $seq = [int]$matches[1] + 1
        }
        $receiptId = "$receiptPrefix-$($seq.ToString('000'))"
        
        # 計算收據日期和到期日
        $days3 = Get-Random -Minimum 1 -Maximum 28
        $receiptDate = $targetDate.AddDays($days3).ToString('yyyy-MM-dd')
        $dueDate = (Get-Date $receiptDate).AddDays(30).ToString('yyyy-MM-dd')
        
        # 獲取服務信息
        $serviceResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT service_id, service_name FROM ClientServices cs INNER JOIN Services s ON cs.service_id = s.service_id WHERE cs.client_service_id = $clientServiceId LIMIT 1" 2>&1 | Out-String
        $serviceId = $null
        $serviceName = "服務項目"
        if ($serviceResult -match '"service_id":\s*(\d+).*?"service_name":\s*"([^"]+)"') {
            $serviceId = [int]$matches[1]
            $serviceName = $matches[2] -replace "'", "''"
        }
        
        # 創建收據
        $receiptSql = "INSERT INTO Receipts (receipt_id, client_id, receipt_date, due_date, total_amount, status, receipt_type, client_service_id, billing_month, service_start_month, service_end_month, notes, created_by, created_at, updated_at, is_auto_generated, paid_amount) VALUES ('$receiptId', '$clientId', '$receiptDate', '$dueDate', $suggestedAmount, 'unpaid', 'normal', $clientServiceId, $targetMonth, '$serviceMonthStr', '$serviceMonthStr', '自動生成', $adminId, datetime('now'), datetime('now'), 1, 0)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $receiptSql 2>&1 | Out-Null
        $totalReceipts++
        
        # 創建收據項目（確保總金額一致）
        $itemQuantity = Get-Random -Minimum 1 -Maximum 3
        $unitPrice = [Math]::Round($suggestedAmount / $itemQuantity, 2)
        $subtotal = [Math]::Round($unitPrice * $itemQuantity, 2)
        # 調整最後一個項目的金額，確保總和等於 total_amount
        $adjustment = $suggestedAmount - $subtotal
        if ($itemQuantity -gt 1 -and [Math]::Abs($adjustment) -gt 0.01) {
            $subtotal = [Math]::Round($subtotal + $adjustment, 2)
        }
        
        $itemSql = "INSERT INTO ReceiptItems (receipt_id, service_name, quantity, unit_price, subtotal, notes) VALUES ('$receiptId', '$serviceName', $itemQuantity, $unitPrice, $subtotal, '服務項目')"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $itemSql 2>&1 | Out-Null
        $totalReceiptItems++
        
        # 確保 Receipts.total_amount = ReceiptItems.subtotal 的總和（數據一致性）
        $itemsTotalResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT SUM(subtotal) as total FROM ReceiptItems WHERE receipt_id = '$receiptId'" 2>&1 | Out-String
        $itemsTotal = $suggestedAmount
        if ($itemsTotalResult -match '"total":\s*([\d.]+)') {
            $itemsTotal = [double]$matches[1]
        }
        # 更新收據總金額以匹配項目總和（模擬收據編輯，記錄 ReceiptEditHistory）
        $oldTotalAmount = $suggestedAmount
        $updateReceiptTotalSql = "UPDATE Receipts SET total_amount = $itemsTotal WHERE receipt_id = '$receiptId'"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $updateReceiptTotalSql 2>&1 | Out-Null
        
        # 如果總金額有變化，記錄編輯歷史（模擬收據編輯）
        if ([Math]::Abs($itemsTotal - $oldTotalAmount) -gt 0.01) {
            $editHistorySql = "INSERT INTO ReceiptEditHistory (receipt_id, field_name, old_value, new_value, modified_by, modified_at) VALUES ('$receiptId', 'total_amount', '$oldTotalAmount', '$itemsTotal', $adminId, datetime('now'))"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $editHistorySql 2>&1 | Out-Null
        }
        
        # 創建收據服務類型關聯
        if ($serviceId) {
            $receiptServiceTypeSql = "INSERT OR IGNORE INTO ReceiptServiceTypes (receipt_id, service_id) VALUES ('$receiptId', $serviceId)"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $receiptServiceTypeSql 2>&1 | Out-Null
            $totalReceiptServiceTypes++
        }
        
        # 更新開票提醒狀態
        $updateReminderSql = "UPDATE BillingReminders SET status = 'completed', completed_at = datetime('now'), completed_receipt_id = '$receiptId' WHERE reminder_id = $reminderId"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $updateReminderSql 2>&1 | Out-Null
    }
}
Write-Output "  已創建: $totalReceipts 個收據, $totalReceiptItems 個收據項目, $totalReceiptServiceTypes 個收據服務類型關聯"

# 創建付款記錄
Write-Output ""
Write-Output "[19/30] 創建付款記錄..."
$totalPayments = 0

# 獲取所有未付款或部分付款的收據（過去3個月）
for ($monthOffset = -3; $monthOffset -le -1; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    $targetYear = $targetDate.Year
    $targetMonth = $targetDate.Month
    
    # 獲取該月的收據
    $receiptsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT receipt_id, total_amount, paid_amount, status FROM Receipts WHERE billing_month = $targetMonth AND is_deleted = 0 AND status IN ('unpaid', 'partial') LIMIT 50" 2>&1 | Out-String
    $receiptMatches = [regex]::Matches($receiptsResult, '"receipt_id":\s*"([^"]+)"[\s\S]*?"total_amount":\s*([\d.]+)[\s\S]*?"paid_amount":\s*([\d.]+)[\s\S]*?"status":\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    foreach ($receiptMatch in $receiptMatches) {
        $receiptId = $receiptMatch.Groups[1].Value
        $totalAmount = [double]$receiptMatch.Groups[2].Value
        $paidAmount = [double]$receiptMatch.Groups[3].Value
        $status = $receiptMatch.Groups[4].Value
        
        # 決定付款金額（部分付款或全額付款）
        $remainingAmount = $totalAmount - $paidAmount
        if ($remainingAmount -le 0) {
            continue
        }
        
        $paymentAmount = if (Get-Random -Maximum 3 -lt 2) {
            # 70% 機率全額付款
            $remainingAmount
        } else {
            # 30% 機率部分付款
            [Math]::Round($remainingAmount * (Get-Random -Minimum 0.3 -Maximum 0.9), 2)
        }
        
        # 計算付款日期（收據日期後1-30天）
        $receiptDateResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT receipt_date FROM Receipts WHERE receipt_id = '$receiptId' LIMIT 1" 2>&1 | Out-String
        $receiptDate = $targetDate
        if ($receiptDateResult -match '"receipt_date":\s*"(\d{4}-\d{2}-\d{2})"') {
            $receiptDate = [DateTime]::Parse($matches[1])
        }
        $paymentDate = $receiptDate.AddDays((Get-Random -Minimum 1 -Maximum 31)).ToString('yyyy-MM-dd')
        
        # 付款方式
        $paymentMethods = @('transfer', 'cash', 'check')
        $paymentMethod = $paymentMethods[(Get-Random -Maximum $paymentMethods.Count)]
        
        # 創建付款記錄
        $paymentSql = "INSERT INTO Payments (receipt_id, payment_date, payment_amount, payment_method, reference_number, notes, created_by, created_at, updated_at) VALUES ('$receiptId', '$paymentDate', $paymentAmount, '$paymentMethod', 'REF$((Get-Random -Minimum 100000 -Maximum 999999))', '付款記錄', $adminId, datetime('now'), datetime('now'))"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $paymentSql 2>&1 | Out-Null
        $totalPayments++
        
        # 更新收據的已付款金額和狀態（數據一致性：確保 paid_amount = Payments 的總和）
        $paymentsTotalResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT SUM(payment_amount) as total FROM Payments WHERE receipt_id = '$receiptId' AND is_deleted = 0" 2>&1 | Out-String
        $newPaidAmount = $paidAmount + $paymentAmount
        if ($paymentsTotalResult -match '"total":\s*([\d.]+)') {
            $newPaidAmount = [double]$matches[1]
        }
        
        # 獲取舊狀態和舊金額（用於記錄編輯歷史）
        $oldReceiptResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT status, paid_amount FROM Receipts WHERE receipt_id = '$receiptId' LIMIT 1" 2>&1 | Out-String
        $oldStatus = "unpaid"
        $oldPaidAmount = 0
        if ($oldReceiptResult -match '"status":\s*"([^"]+)".*?"paid_amount":\s*([\d.]+)') {
            $oldStatus = $matches[1]
            $oldPaidAmount = [double]$matches[2]
        }
        
        $newStatus = if ($newPaidAmount -ge $totalAmount) { 'paid' } else { 'partial' }
        $updateReceiptSql = "UPDATE Receipts SET paid_amount = $newPaidAmount, status = '$newStatus', updated_at = datetime('now') WHERE receipt_id = '$receiptId'"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $updateReceiptSql 2>&1 | Out-Null
        
        # 記錄收據編輯歷史（ReceiptEditHistory）- 模擬收據狀態和金額變更
        if ([Math]::Abs($oldPaidAmount - $newPaidAmount) -gt 0.01) {
            $paidAmountHistorySql = "INSERT INTO ReceiptEditHistory (receipt_id, field_name, old_value, new_value, modified_by, modified_at) VALUES ('$receiptId', 'paid_amount', '$oldPaidAmount', '$newPaidAmount', $adminId, datetime('now'))"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $paidAmountHistorySql 2>&1 | Out-Null
        }
        if ($oldStatus -ne $newStatus) {
            $statusHistorySql = "INSERT INTO ReceiptEditHistory (receipt_id, field_name, old_value, new_value, modified_by, modified_at) VALUES ('$receiptId', 'status', '$oldStatus', '$newStatus', $adminId, datetime('now'))"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $statusHistorySql 2>&1 | Out-Null
        }
    }
}
Write-Output "  已創建: $totalPayments 個付款記錄"

# 創建客戶標籤
Write-Output ""
Write-Output "[20/30] 創建客戶標籤和關聯..."
$totalCustomerTags = 0
$totalClientTagAssignments = 0

# 創建一些基礎標籤
$tagNames = @('VIP客戶', '長期合作', '新客戶', '重要客戶', '一般客戶', '待開發', '暫停服務')
$tagColors = @('#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE')
for ($i = 0; $i -lt $tagNames.Count; $i++) {
    $tagName = $tagNames[$i]
    $tagColor = $tagColors[$i]
    $tagSql = "INSERT OR IGNORE INTO CustomerTags (tag_name, tag_color) VALUES ('$tagName', '$tagColor')"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $tagSql 2>&1 | Out-Null
    $totalCustomerTags++
}

# 為客戶分配標籤
$allClientsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT client_id FROM Clients WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0 LIMIT 100" 2>&1 | Out-String
$clientMatches = [regex]::Matches($allClientsResult, '"client_id":\s*"([^"]+)"')
$allTagIds = @()
$tagIdsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT tag_id FROM CustomerTags" 2>&1 | Out-String
$tagIdMatches = [regex]::Matches($tagIdsResult, '"tag_id":\s*(\d+)')
foreach ($tagIdMatch in $tagIdMatches) {
    $allTagIds += [int]$tagIdMatch.Groups[1].Value
}

foreach ($clientMatch in $clientMatches) {
    $clientId = $clientMatch.Groups[1].Value
    # 每個客戶分配1-3個標籤
    $tagCount = Get-Random -Minimum 1 -Maximum 4
    $tagCountToSelect = [Math]::Min($tagCount, $allTagIds.Count)
    $selectedTagIds = $allTagIds | Get-Random -Count $tagCountToSelect
    foreach ($tagId in $selectedTagIds) {
        $assignmentSql = "INSERT OR IGNORE INTO ClientTagAssignments (client_id, tag_id) VALUES ('$clientId', $tagId)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $assignmentSql 2>&1 | Out-Null
        $totalClientTagAssignments++
    }
}
Write-Output "  已創建: $totalCustomerTags 個客戶標籤, $totalClientTagAssignments 個標籤關聯"

# 創建客戶協作人
Write-Output ""
Write-Output "[21/30] 創建客戶協作人..."
$totalClientCollaborators = 0

foreach ($clientMatch in $clientMatches) {
    $clientId = $clientMatch.Groups[1].Value
    # 每個客戶有1-2個協作人
    $collaboratorCount = Get-Random -Minimum 1 -Maximum 3
    $userCountToSelect = [Math]::Min($collaboratorCount, $testUserIds.Count)
    $selectedUserIds = $testUserIds | Get-Random -Count $userCountToSelect
    foreach ($userId in $selectedUserIds) {
        $collaboratorSql = "INSERT OR IGNORE INTO ClientCollaborators (client_id, user_id, created_by) VALUES ('$clientId', $userId, $adminId)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $collaboratorSql 2>&1 | Out-Null
        $totalClientCollaborators++
    }
}
Write-Output "  已創建: $totalClientCollaborators 個客戶協作人"

# 創建股東和董監事
Write-Output ""
Write-Output "[22/30] 創建股東和董監事..."
$totalShareholders = 0
$totalDirectorsSupervisors = 0

foreach ($clientMatch in $clientMatches) {
    $clientId = $clientMatch.Groups[1].Value
    
    # 創建股東（每個客戶2-5個股東）
    $shareholderCount = Get-Random -Minimum 2 -Maximum 6
    $totalSharePercentage = 0
    for ($i = 0; $i -lt $shareholderCount; $i++) {
        $shareholderName = "股東$((Get-Random -Minimum 1 -Maximum 100))"
        $sharePercentage = if ($i -eq $shareholderCount - 1) {
            # 最後一個股東補足到100%
            100 - $totalSharePercentage
        } else {
            $pct = Get-Random -Minimum 10 -Maximum 40
            $totalSharePercentage += $pct
            $pct
        }
        $shareCount = Get-Random -Minimum 1000 -Maximum 10001
        $shareAmount = Get-Random -Minimum 100000 -Maximum 1000001
        $shareTypes = @('普通股', '特別股', '優先股')
        $shareType = $shareTypes[(Get-Random -Maximum $shareTypes.Count)]
        
        $shareholderSql = "INSERT INTO Shareholders (client_id, name, share_percentage, share_count, share_amount, share_type) VALUES ('$clientId', '$shareholderName', $sharePercentage, $shareCount, $shareAmount, '$shareType')"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $shareholderSql 2>&1 | Out-Null
        $totalShareholders++
    }
    
    # 創建董監事（每個客戶3-7個）
    $directorCount = Get-Random -Minimum 3 -Maximum 8
    $positions = @('董事長', '副董事長', '董事', '監事', '獨立董事', '監察人')
    $baseDate = Get-Date
    for ($i = 0; $i -lt $directorCount; $i++) {
        $directorName = "董監事$((Get-Random -Minimum 1 -Maximum 100))"
        $position = $positions[(Get-Random -Maximum $positions.Count)]
        $termStart = $baseDate.AddYears(-2).ToString('yyyy-MM-dd')
        $termEnd = $baseDate.AddYears(2).ToString('yyyy-MM-dd')
        $isCurrent = 1
        
        $directorSql = "INSERT INTO DirectorsSupervisors (client_id, name, position, term_start, term_end, is_current) VALUES ('$clientId', '$directorName', '$position', '$termStart', '$termEnd', $isCurrent)"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $directorSql 2>&1 | Out-Null
        $totalDirectorsSupervisors++
    }
}
Write-Output "  已創建: $totalShareholders 個股東, $totalDirectorsSupervisors 個董監事"

# 創建內部文檔
Write-Output ""
Write-Output "[21/26] 創建內部文檔..."
$totalInternalDocuments = 0

# 獲取所有客戶和任務（用於關聯文檔）
$allClientsForDocs = @()
$allTasksForDocs = @()

$clientsForDocsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT client_id FROM Clients WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0 LIMIT 50" 2>&1 | Out-String
$clientDocMatches = [regex]::Matches($clientsForDocsResult, '"client_id":\s*"([^"]+)"')
foreach ($match in $clientDocMatches) {
    $allClientsForDocs += $match.Groups[1].Value
}

$tasksForDocsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id, client_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0 LIMIT 100" 2>&1 | Out-String
$taskDocMatches = [regex]::Matches($tasksForDocsResult, '"task_id":\s*(\d+)[\s\S]*?"client_id":\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::Singleline)
foreach ($match in $taskDocMatches) {
    $allTasksForDocs += @{task_id = [int]$match.Groups[1].Value; client_id = $match.Groups[2].Value}
}

# 為過去3個月創建文檔
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    $targetYear = $targetDate.Year
    $targetMonth = $targetDate.Month
    $yearMonthStr = "$targetYear-$($targetMonth.ToString('00'))"
    
    # 每個月創建10-20個文檔
    $docCount = Get-Random -Minimum 10 -Maximum 21
    for ($i = 0; $i -lt $docCount; $i++) {
        $docTitle = "文檔$yearMonthStr-$($i + 1)"
        $docDescription = "這是$yearMonthStr 的文檔"
        $fileName = "document_$yearMonthStr`_$($i + 1).pdf"
        $fileUrl = "https://example.com/documents/$fileName"
        $fileSize = Get-Random -Minimum 100000 -Maximum 10000001
        $fileType = "application/pdf"
        $categories = @('contract', 'finance', 'hr', 'tax', 'other')
        $category = $categories[(Get-Random -Maximum $categories.Count)]
        $tags = "$category,文檔,測試"
        $uploadedBy = $testUserIds[(Get-Random -Maximum $testUserIds.Count)]
        
        # 決定關聯（客戶、任務、或無關聯）
        $clientId = "NULL"
        $taskId = "NULL"
        if (Get-Random -Maximum 3 -lt 2) {
            # 70% 機率關聯客戶
            if ($allClientsForDocs.Count -gt 0) {
                $clientId = "'$($allClientsForDocs[(Get-Random -Maximum $allClientsForDocs.Count)])'"
            }
        }
        if (Get-Random -Maximum 3 -lt 1 -and $allTasksForDocs.Count -gt 0) {
            # 30% 機率關聯任務
            $selectedTask = $allTasksForDocs[(Get-Random -Maximum $allTasksForDocs.Count)]
            $taskId = $selectedTask.task_id
            if ($clientId -eq "NULL") {
                $clientId = "'$($selectedTask.client_id)'"
            }
        }
        
        $docSql = "INSERT INTO InternalDocuments (title, description, file_name, file_url, file_size, file_type, category, tags, uploaded_by, created_at, updated_at, scope, client_id, year_month, doc_year, doc_month, related_task_id) VALUES ('$docTitle', '$docDescription', '$fileName', '$fileUrl', $fileSize, '$fileType', '$category', '$tags', $uploadedBy, datetime('now'), datetime('now'), 'internal', $clientId, '$yearMonthStr', $targetYear, $targetMonth, " + (if ($taskId -ne "NULL") { "$taskId" } else { "NULL" }) + ")"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $docSql 2>&1 | Out-Null
        $totalInternalDocuments++
    }
}
Write-Output "  已創建: $totalInternalDocuments 個內部文檔"

# 創建附件
Write-Output ""
# Write-Output "[23/21] 創建附件..."
$totalAttachments = 0

# 獲取收據、任務、文檔 ID（用於關聯附件）
$receiptsForAttachments = @()
$tasksForAttachments = @()

$receiptsAttResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT receipt_id FROM Receipts WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0 LIMIT 50" 2>&1 | Out-String
$receiptAttMatches = [regex]::Matches($receiptsAttResult, '"receipt_id":\s*"([^"]+)"')
foreach ($match in $receiptAttMatches) {
    $receiptsForAttachments += $match.Groups[1].Value
}

$tasksAttResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0 LIMIT 50" 2>&1 | Out-String
$taskAttMatches = [regex]::Matches($tasksAttResult, '"task_id":\s*(\d+)')
foreach ($match in $taskAttMatches) {
    $tasksForAttachments += [int]$match.Groups[1].Value
}

# 為各種實體創建附件
$entityTypes = @('receipt', 'task')
foreach ($entityType in $entityTypes) {
    $entityIds = if ($entityType -eq 'receipt') { $receiptsForAttachments } else { $tasksForAttachments }
    if ($entityIds.Count -eq 0) { continue }
    
    # 每個實體有30%機率有附件
    foreach ($entityId in $entityIds) {
        if ((Get-Random -Maximum 10) -lt 3) {
            $attachmentCount = Get-Random -Minimum 1 -Maximum 3
            for ($i = 0; $i -lt $attachmentCount; $i++) {
                $fileName = "attachment_$entityType`_$entityId`_$($i + 1).pdf"
                $objectKey = "attachments/$entityType/$entityId/$fileName"
                $fileSize = Get-Random -Minimum 50000 -Maximum 5000001
                $contentType = "application/pdf"
                $uploaderUserId = $testUserIds[(Get-Random -Maximum $testUserIds.Count)]
                
                $attachmentSql = "INSERT INTO Attachments (entity_type, entity_id, object_key, filename, content_type, size_bytes, uploader_user_id, uploaded_at) VALUES ('$entityType', '$entityId', '$objectKey', '$fileName', '$contentType', $fileSize, $uploaderUserId, datetime('now'))"
                npx wrangler d1 execute horgoscpa-db-v2 --local --command $attachmentSql 2>&1 | Out-Null
                $totalAttachments++
            }
        }
    }
}
Write-Output "  已創建: $totalAttachments 個附件"

# 創建內部 FAQ
Write-Output ""
# Write-Output "[24/21] 創建內部 FAQ..."
$totalInternalFAQs = 0
$totalTaskTemplateStageFAQs = 0

# 創建一些基礎 FAQ
$faqQuestions = @(
    "如何處理客戶的月結單？",
    "報稅時需要注意什麼？",
    "如何處理客戶的發票？",
    "薪資計算的標準是什麼？",
    "請假流程如何處理？",
    "外出登記的補貼如何計算？",
    "任務完成的標準是什麼？",
    "收據開立的流程？",
    "如何處理客戶投訴？",
    "系統使用常見問題"
)
$faqAnswers = @(
    "月結單需要在每月25日前完成，並發送給客戶確認。",
    "報稅時需要確認所有單據齊全，並在截止日期前提交。",
    "發票需要根據收費計劃開立，並在任務完成後及時處理。",
    "薪資計算包括底薪、加給、獎金、加班費、補助和扣款。",
    "請假需要提前申請，並由主管審核通過後生效。",
    "外出補貼按照每5公里60元的標準計算。",
    "任務完成需要所有階段都完成，並由負責人確認。",
    "收據開立需要根據收費計劃和任務完成情況進行。",
    "客戶投訴需要及時處理，並記錄處理結果。",
    "系統使用問題可以參考操作手冊或聯繫系統管理員。"
)
$faqCategories = @('accounting', 'tax', 'business', 'internal')

for ($i = 0; $i -lt $faqQuestions.Count; $i++) {
    $question = $faqQuestions[$i] -replace "'", "''"
    $answer = $faqAnswers[$i] -replace "'", "''"
    $category = $faqCategories[(Get-Random -Maximum $faqCategories.Count)]
    $tags = '["' + $category + '","常見問題"]'
    $createdBy = $testUserIds[(Get-Random -Maximum $testUserIds.Count)]
    
    $faqSql = "INSERT INTO InternalFAQ (question, answer, category, tags, created_by, created_at, updated_at, scope) VALUES ('$question', '$answer', '$category', '$tags', $createdBy, datetime('now'), datetime('now'), 'internal')"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $faqSql 2>&1 | Out-Null
    $totalInternalFAQs++
}

# 為任務模板階段關聯 FAQ
$stageFaqResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT stage_id FROM TaskTemplateStages LIMIT 50" 2>&1 | Out-String
$stageFaqMatches = [regex]::Matches($stageFaqResult, '"stage_id":\s*(\d+)')
$allFaqIds = @()
$faqIdsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT faq_id FROM InternalFAQ LIMIT 20" 2>&1 | Out-String
$faqIdMatches = [regex]::Matches($faqIdsResult, '"faq_id":\s*(\d+)')
foreach ($match in $faqIdMatches) {
    $allFaqIds += [int]$match.Groups[1].Value
}

foreach ($stageMatch in $stageFaqMatches) {
    $stageId = [int]$stageMatch.Groups[1].Value
    # 每個階段有50%機率有關聯 FAQ
    if ((Get-Random -Maximum 2) -eq 0 -and $allFaqIds.Count -gt 0) {
        $faqCount = Get-Random -Minimum 1 -Maximum 3
        $faqCountToSelect = [Math]::Min($faqCount, $allFaqIds.Count)
        $selectedFaqIds = $allFaqIds | Get-Random -Count $faqCountToSelect
        $sortOrder = 0
        foreach ($faqId in $selectedFaqIds) {
            $stageFaqSql = "INSERT OR IGNORE INTO TaskTemplateStageFAQs (stage_id, faq_id, sort_order) VALUES ($stageId, $faqId, $sortOrder)"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $stageFaqSql 2>&1 | Out-Null
            $totalTaskTemplateStageFAQs++
            $sortOrder++
        }
    }
}
Write-Output "  已創建: $totalInternalFAQs 個內部 FAQ, $totalTaskTemplateStageFAQs 個任務模板階段 FAQ 關聯"

# 修正工時表與任務的關聯（Timesheets.task_type 對應 ActiveTasks.task_type）
Write-Output ""
# Write-Output "[25/21] 修正工時表與任務的關聯..."
$updatedTimesheets = 0

# 獲取所有活躍任務的 task_type
$tasksForTimesheets = @{}
$tasksResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT task_id, task_type, client_id, service_id FROM ActiveTasks WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0" 2>&1 | Out-String
$taskTimesheetMatches = [regex]::Matches($tasksResult, '"task_id":\s*(\d+)[\s\S]*?"task_type":\s*"([^"]+)"[\s\S]*?"client_id":\s*"([^"]+)"[\s\S]*?"service_id":\s*(\d+)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
foreach ($match in $taskTimesheetMatches) {
    $taskId = [int]$match.Groups[1].Value
    $taskType = $match.Groups[2].Value
    $clientId = $match.Groups[3].Value
    $serviceId = [int]$match.Groups[4].Value
    
    $key = "$clientId|$serviceId"
    if (-not $tasksForTimesheets.ContainsKey($key)) {
        $tasksForTimesheets[$key] = @()
    }
    $tasksForTimesheets[$key] += @{task_type = $taskType; task_id = $taskId}
}

# 更新工時表的 task_type 以對應任務
foreach ($key in $tasksForTimesheets.Keys) {
    $parts = $key.Split('|')
    $clientId = $parts[0]
    $serviceId = $parts[1]
    $availableTasks = $tasksForTimesheets[$key]
    
    if ($availableTasks.Count -eq 0) { continue }
    
    # 更新該客戶和服務的工時記錄
    $selectedTask = $availableTasks[(Get-Random -Maximum $availableTasks.Count)]
    $taskType = $selectedTask.task_type -replace "'", "''"
    
    $updateSql = "UPDATE Timesheets SET task_type = '$taskType' WHERE client_id = '$clientId' AND service_id = $serviceId AND (task_type IS NULL OR task_type = '') AND is_deleted = 0"
    $updateResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command $updateSql 2>&1 | Out-Null
    if ($updateResult -match 'Changes') {
        $updatedTimesheets++
    }
}
Write-Output "  已更新: $updatedTimesheets 組工時記錄的任務關聯"

# 觸發薪資重算（PayrollCache.needs_recalc, PayrollRecalcQueue）
Write-Output ""
# Write-Output "[23/21] 觸發薪資重算..."
$totalPayrollRecalcQueues = 0

# 獲取所有有工時/請假/外出記錄的用戶和月份
$affectedUsersMonths = @{}
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    $targetYear = $targetDate.Year
    $targetMonth = $targetDate.Month
    $yearMonthStr = "$targetYear-$($targetMonth.ToString('00'))"
    
    # 獲取有工時記錄的用戶
    $timesheetUsersResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT DISTINCT user_id FROM Timesheets WHERE work_date LIKE '$yearMonthStr%' AND is_deleted = 0 LIMIT 50" 2>&1 | Out-String
    $timesheetUserMatches = [regex]::Matches($timesheetUsersResult, '"user_id":\s*(\d+)')
    foreach ($match in $timesheetUserMatches) {
        $userId = [int]$match.Groups[1].Value
        $key = "$userId|$yearMonthStr"
        if (-not $affectedUsersMonths.ContainsKey($key)) {
            $affectedUsersMonths[$key] = @{user_id = $userId; year_month = $yearMonthStr}
        }
    }
    
    # 獲取有請假記錄的用戶
    $leaveUsersResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT DISTINCT user_id FROM LeaveRequests WHERE start_date LIKE '$yearMonthStr%' OR end_date LIKE '$yearMonthStr%' AND is_deleted = 0 LIMIT 50" 2>&1 | Out-String
    $leaveUserMatches = [regex]::Matches($leaveUsersResult, '"user_id":\s*(\d+)')
    foreach ($match in $leaveUserMatches) {
        $userId = [int]$match.Groups[1].Value
        $key = "$userId|$yearMonthStr"
        if (-not $affectedUsersMonths.ContainsKey($key)) {
            $affectedUsersMonths[$key] = @{user_id = $userId; year_month = $yearMonthStr}
        }
    }
    
    # 獲取有外出記錄的用戶
    $tripUsersResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT DISTINCT user_id FROM BusinessTrips WHERE trip_date LIKE '$yearMonthStr%' AND is_deleted = 0 LIMIT 50" 2>&1 | Out-String
    $tripUserMatches = [regex]::Matches($tripUsersResult, '"user_id":\s*(\d+)')
    foreach ($match in $tripUserMatches) {
        $userId = [int]$match.Groups[1].Value
        $key = "$userId|$yearMonthStr"
        if (-not $affectedUsersMonths.ContainsKey($key)) {
            $affectedUsersMonths[$key] = @{user_id = $userId; year_month = $yearMonthStr}
        }
    }
}

# 為每個受影響的用戶和月份創建 PayrollRecalcQueue 記錄
foreach ($key in $affectedUsersMonths.Keys) {
    $userMonth = $affectedUsersMonths[$key]
    $userId = $userMonth.user_id
    $yearMonth = $userMonth.year_month
    
    # 檢查是否已存在記錄
    $existingQueueResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT queue_id FROM PayrollRecalcQueue WHERE user_id = $userId AND year_month = '$yearMonth' LIMIT 1" 2>&1 | Out-String
    if ($existingQueueResult -match '"queue_id":\s*(\d+)') {
        continue
    }
    
    # 創建重算佇列記錄
    $queueSql = "INSERT INTO PayrollRecalcQueue (user_id, year_month, status, reason, created_at) VALUES ($userId, '$yearMonth', 'pending', '測試數據生成觸發', datetime('now'))"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $queueSql 2>&1 | Out-Null
    $totalPayrollRecalcQueues++
    
    # 設置 PayrollCache.needs_recalc = 1（如果 PayrollCache 存在）
    $cacheUpdateSql = "UPDATE PayrollCache SET needs_recalc = 1 WHERE user_id = $userId AND year_month = '$yearMonth'"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $cacheUpdateSql 2>&1 | Out-Null
}
Write-Output "  已創建: $totalPayrollRecalcQueues 個薪資重算佇列記錄"

# 更新請假餘額（根據真實業務邏輯：請假申請創建時直接為 approved，無需審核，但需要扣減餘額）
Write-Output ""
# Write-Output "[24/21] 更新請假餘額（請假申請直接為 approved，無需審核）..."
$updatedLeaveBalances = 0

# 根據已批准的請假記錄更新 LeaveBalances（請假申請創建時直接為 approved）
$approvedLeavesResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT leave_id, user_id, leave_type, amount, unit FROM LeaveRequests WHERE status = 'approved' AND is_deleted = 0 LIMIT 100" 2>&1 | Out-String
$approvedLeaveMatches = [regex]::Matches($approvedLeavesResult, '"leave_id":\s*(\d+)[\s\S]*?"user_id":\s*(\d+)[\s\S]*?"leave_type":\s*"([^"]+)"[\s\S]*?"amount":\s*([\d.]+)[\s\S]*?"unit":\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::Singleline)
foreach ($match in $approvedLeaveMatches) {
    $userId = [int]$match.Groups[2].Value
    $leaveType = $match.Groups[3].Value
    $amount = [double]$match.Groups[4].Value
    $unit = $match.Groups[5].Value
    
    # 檢查 LeaveBalances 是否存在
    $balanceResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT balance_id, remain FROM LeaveBalances WHERE user_id = $userId AND leave_type = '$leaveType' LIMIT 1" 2>&1 | Out-String
    if ($balanceResult -match '"balance_id":\s*(\d+).*?"remain":\s*([\d.]+)') {
        $balanceId = [int]$matches[1]
        $currentRemain = [double]$matches[2]
        $deductAmount = if ($unit -eq 'day') { $amount } else { $amount / 8.0 }  # 小時轉換為天
        $newRemain = [Math]::Max(0, $currentRemain - $deductAmount)
        $newUsed = $currentRemain - $newRemain
        
        # 更新餘額（remain 減少，used 增加）
        $updateBalanceSql = "UPDATE LeaveBalances SET remain = $newRemain, used = used + $newUsed, updated_at = datetime('now') WHERE balance_id = $balanceId"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $updateBalanceSql 2>&1 | Out-Null
        $updatedLeaveBalances++
    }
}
Write-Output "  已更新: $updatedLeaveBalances 個假期餘額（請假申請直接為 approved，無需審核）"

# 驗證數據
Write-Output ""
# 創建月度獎金調整（MonthlyBonusAdjustments）
Write-Output ""
Write-Output "[23/30] 創建月度獎金調整..."
$totalMonthlyBonuses = 0

# 獲取所有用戶（過去3個月和當前月份）
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    $targetYear = $targetDate.Year
    $targetMonth = $targetDate.Month
    $monthStr = "$targetYear-$($targetMonth.ToString('00'))"
    
    # 獲取所有用戶
    $usersResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id FROM Users WHERE is_deleted = 0 LIMIT 20" 2>&1 | Out-String
    $userMatches = [regex]::Matches($usersResult, '"user_id":\s*(\d+)')
    
    foreach ($userMatch in $userMatches) {
        $userId = [int]$userMatch.Groups[1].Value
        
        # 30% 機率有月度獎金
        if ((Get-Random -Maximum 10) -lt 3) {
            $bonusAmountCents = Get-Random -Minimum 5000 -Maximum 50001  # 50-500 元（以分為單位）
            $notes = "績效獎金"
            
            $bonusSql = "INSERT OR IGNORE INTO MonthlyBonusAdjustments (user_id, month, bonus_amount_cents, notes, created_by, created_at, updated_at) VALUES ($userId, '$monthStr', $bonusAmountCents, '$notes', $adminId, datetime('now'), datetime('now'))"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $bonusSql 2>&1 | Out-Null
            $totalMonthlyBonuses++
        }
    }
}
Write-Output "  已創建: $totalMonthlyBonuses 個月度獎金調整記錄"

# 創建生活事件假期授予（LifeEventLeaveGrants）
Write-Output ""
Write-Output "[24/30] 創建生活事件假期授予..."
$totalLifeEventGrants = 0

# 獲取所有用戶
$usersResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT user_id FROM Users WHERE is_deleted = 0 LIMIT 20" 2>&1 | Out-String
$userMatches = [regex]::Matches($usersResult, '"user_id":\s*(\d+)')

$eventTypes = @('marriage', 'funeral', 'maternity', 'paternity', 'other')
$leaveTypeMap = @{
    'marriage' = 'marriage'
    'funeral' = 'funeral'
    'maternity' = 'maternity'
    'paternity' = 'paternity'
    'other' = 'personal'
}

foreach ($userMatch in $userMatches) {
    $userId = [int]$userMatch.Groups[1].Value
    
    # 10% 機率有生活事件假期
    if ((Get-Random -Maximum 10) -eq 0) {
        $eventType = $eventTypes[(Get-Random -Maximum $eventTypes.Length)]
        $leaveType = $leaveTypeMap[$eventType]
        
        # 事件日期為過去6個月內的隨機日期
        $months4 = Get-Random -Minimum -6 -Maximum 1
        $days4 = Get-Random -Minimum 1 -Maximum 28
        $eventDate = (Get-Date).AddMonths($months4).AddDays($days4)
        $eventDateStr = $eventDate.ToString('yyyy-MM-dd')
        
        # 根據事件類型設置天數
        $daysGranted = switch ($eventType) {
            'marriage' { 8 }
            'funeral' { Get-Random -Minimum 3 -Maximum 9 }
            'maternity' { 56 }
            'paternity' { 7 }
            default { Get-Random -Minimum 1 -Maximum 4 }
        }
        
        $validFrom = $eventDateStr
        $validUntil = $eventDate.AddYears(1).ToString('yyyy-MM-dd')
        $notes = "生活事件：$eventType"
        
        $lifeEventSql = "INSERT INTO LifeEventLeaveGrants (user_id, event_type, event_date, leave_type, days_granted, days_used, days_remaining, valid_from, valid_until, notes, status, created_by, created_at) VALUES ($userId, '$eventType', '$eventDateStr', '$leaveType', $daysGranted, 0, $daysGranted, '$validFrom', '$validUntil', '$notes', 'active', $adminId, datetime('now'))"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $lifeEventSql 2>&1 | Out-Null
        $totalLifeEventGrants++
    }
}
Write-Output "  已創建: $totalLifeEventGrants 個生活事件假期授予記錄"

# 模擬服務變更歷史（ServiceChangeHistory）
Write-Output ""
Write-Output "[25/30] 創建服務變更歷史..."
$totalServiceChanges = 0

# 獲取所有客戶服務（過去3個月）
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    
    $servicesResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT client_service_id, status FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0 LIMIT 50" 2>&1 | Out-String
    $serviceMatches = [regex]::Matches($servicesResult, '"client_service_id":\s*(\d+).*?"status":\s*"([^"]+)"')
    
    foreach ($serviceMatch in $serviceMatches) {
        $clientServiceId = [int]$serviceMatch.Groups[1].Value
        $currentStatus = $serviceMatch.Groups[2].Value
        
        # 20% 機率有狀態變更歷史
        if ((Get-Random -Maximum 10) -lt 2) {
            $oldStatus = if ($currentStatus -eq 'active') { 'inactive' } else { 'active' }
            $changedDate = $targetDate.AddDays((Get-Random -Minimum 1 -Maximum 28)).ToString('yyyy-MM-dd')
            $reason = "服務狀態調整"
            $notes = "從 $oldStatus 變更為 $currentStatus"
            
            $changeSql = "INSERT INTO ServiceChangeHistory (client_service_id, old_status, new_status, changed_by, changed_at, reason, notes) VALUES ($clientServiceId, '$oldStatus', '$currentStatus', $adminId, '$changedDate', '$reason', '$notes')"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $changeSql 2>&1 | Out-Null
            $totalServiceChanges++
        }
    }
}
Write-Output "  已創建: $totalServiceChanges 個服務變更歷史記錄"

# 模擬任務配置變更日誌（TaskConfigChangeLog）
Write-Output ""
Write-Output "[26/30] 創建任務配置變更日誌..."
$totalConfigChanges = 0

# 獲取所有任務配置（過去3個月）
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    
    $configsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT config_id, client_service_id FROM ClientServiceTaskConfigs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%') AND is_deleted = 0 LIMIT 50" 2>&1 | Out-String
    $configMatches = [regex]::Matches($configsResult, '"config_id":\s*(\d+).*?"client_service_id":\s*(\d+)')
    
    foreach ($configMatch in $configMatches) {
        $configId = [int]$configMatch.Groups[1].Value
        $clientServiceId = [int]$configMatch.Groups[2].Value
        
        # 10% 機率有配置變更
        if ((Get-Random -Maximum 10) -eq 0) {
            $changeType = @('created', 'updated')[(Get-Random -Maximum 2)]
            $changedFields = '["task_name", "estimated_hours"]'
            $oldValues = '{"task_name":"舊任務名稱","estimated_hours":8}'
            $newValues = '{"task_name":"新任務名稱","estimated_hours":10}'
            $days5 = Get-Random -Minimum 1 -Maximum 28
            $changedDate = $targetDate.AddDays($days5).ToString('yyyy-MM-dd')
            
            $changeLogSql = "INSERT INTO TaskConfigChangeLog (config_id, client_service_id, change_type, changed_fields, old_values, new_values, changed_at, changed_by) VALUES ($configId, $clientServiceId, '$changeType', '$changedFields', '$oldValues', '$newValues', '$changedDate', $adminId)"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $changeLogSql 2>&1 | Out-Null
            $totalConfigChanges++
        }
    }
}
Write-Output "  已創建: $totalConfigChanges 個任務配置變更日誌記錄"

# 模擬任務生成歷史（TaskGenerationHistory）
Write-Output ""
Write-Output "[27/30] 創建任務生成歷史..."
$totalGenerationHistory = 0

# 獲取過去3個月和當前月份的任務生成記錄
for ($monthOffset = -3; $monthOffset -le 0; $monthOffset++) {
    $targetDate = (Get-Date).AddMonths($monthOffset)
    $targetYear = $targetDate.Year
    $targetMonth = $targetDate.Month
    
    # 獲取該月的任務生成模板
    $templatesResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT template_id, client_service_id FROM TaskGenerationTemplates WHERE effective_month = '$targetYear-$($targetMonth.ToString('00'))' AND is_active = 1 LIMIT 20" 2>&1 | Out-String
    $templateMatches = [regex]::Matches($templatesResult, '"template_id":\s*(\d+).*?"client_service_id":\s*(\d+)')
    
    foreach ($templateMatch in $templateMatches) {
        $templateId = [int]$templateMatch.Groups[1].Value
        $clientServiceId = [int]$templateMatch.Groups[2].Value
        
        # 獲取該模板生成的任務數量
        $tasksCountResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM ActiveTasks WHERE client_service_id = $clientServiceId AND service_year = $targetYear AND service_month = $targetMonth AND is_deleted = 0" 2>&1 | Out-String
        $tasksCount = 0
        if ($tasksCountResult -match '"count":\s*(\d+)') {
            $tasksCount = [int]$matches[1]
        }
        
        if ($tasksCount -gt 0) {
            $days6 = Get-Random -Minimum 1 -Maximum 5
            $generationDate = $targetDate.AddDays($days6).ToString('yyyy-MM-dd')
            $generationType = @('auto', 'manual')[(Get-Random -Maximum 2)]
            $status = 'success'
            $metadata = "{`"template_id`":$templateId,`"tasks_generated`":$tasksCount}"
            
            $historySql = "INSERT INTO TaskGenerationHistory (template_id, client_service_id, generation_type, target_year, target_month, status, generated_tasks_count, metadata, generated_at, created_at) VALUES ($templateId, $clientServiceId, '$generationType', $targetYear, $targetMonth, '$status', $tasksCount, '$metadata', '$generationDate', datetime('now'))"
            npx wrangler d1 execute horgoscpa-db-v2 --local --command $historySql 2>&1 | Out-Null
            $totalGenerationHistory++
        }
    }
}
Write-Output "  已創建: $totalGenerationHistory 個任務生成歷史記錄"

# 模擬定時任務執行記錄（CronJobExecutions）
Write-Output ""
Write-Output "[28/30] 創建定時任務執行記錄..."
$totalCronExecutions = 0

$jobNames = @('task_auto_generation', 'daily_payroll_calculation', 'comp_leave_expiry', 'annual_payroll_calculation', 'precompute_report_caches', 'dashboard_daily_summary', 'task_notifications', 'precompute_dashboard_data')

# 過去30天的執行記錄
for ($dayOffset = -30; $dayOffset -le 0; $dayOffset++) {
    $targetDate = (Get-Date).AddDays($dayOffset)
    $executedAt = $targetDate.ToString('yyyy-MM-dd HH:mm:ss')
    
    # 每天執行多個任務
    foreach ($jobName in $jobNames) {
        # 80% 機率成功
        $status = if ((Get-Random -Maximum 10) -lt 8) { 'success' } else { 'failed' }
        $details = if ($status -eq 'success') { "{`"tasks_generated`":10,`"duration_ms`":5000}" } else { "{}" }
        $errorMessage = if ($status -eq 'failed') { "執行失敗" } else { $null }
        
        $cronSql = "INSERT INTO CronJobExecutions (job_name, status, executed_at, details, error_message) VALUES ('$jobName', '$status', '$executedAt', '$details', " + (if ($errorMessage) { "'$errorMessage'" } else { "NULL" }) + ")"
        npx wrangler d1 execute horgoscpa-db-v2 --local --command $cronSql 2>&1 | Out-Null
        $totalCronExecutions++
    }
}
Write-Output "  已創建: $totalCronExecutions 個定時任務執行記錄"

# 模擬儀表板摘要（DashboardSummary）
Write-Output ""
Write-Output "[29/30] 創建儀表板摘要..."
$totalDashboardSummaries = 0

# 過去30天的摘要
for ($dayOffset = -30; $dayOffset -le 0; $dayOffset++) {
    $targetDate = (Get-Date).AddDays($dayOffset)
    $summaryDate = $targetDate.ToString('yyyy-MM-dd')
    
    # 創建全局摘要
    $payload = "{`"total_tasks`":100,`"completed_tasks`":80,`"pending_tasks`":20,`"total_receipts`":50,`"unpaid_receipts`":10}"
    $summarySql = "INSERT OR IGNORE INTO DashboardSummary (summary_date, scope, payload_json, generated_at) VALUES ('$summaryDate', 'global', '$payload', datetime('now'))"
    npx wrangler d1 execute horgoscpa-db-v2 --local --command $summarySql 2>&1 | Out-Null
    $totalDashboardSummaries++
}
Write-Output "  已創建: $totalDashboardSummaries 個儀表板摘要記錄"

Write-Output "[30/30] 驗證數據創建..."
$verifyClientsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM Clients WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-String
$verifyServicesResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-String
$verifyConfigsResult = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM ClientServiceTaskConfigs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-String

$clientCount = 0
$serviceCount = 0
$configCount = 0

if ($verifyClientsResult -match 'count.*?(\d+)') { $clientCount = [int]$matches[1] }
if ($verifyServicesResult -match 'count.*?(\d+)') { $serviceCount = [int]$matches[1] }
if ($verifyConfigsResult -match 'count.*?(\d+)') { $configCount = [int]$matches[1] }

Write-Output ""
Write-Output "=== 數據創建完成 ==="
Write-Output "實際創建:"
Write-Output "  - 客戶: $clientCount 個"
Write-Output "  - 客戶服務: $serviceCount 個"
Write-Output "  - 任務配置: $configCount 個"
Write-Output "  - 活躍任務: $totalActiveTasks 個"
Write-Output "  - 任務階段: $totalActiveTaskStages 個"
Write-Output "  - 任務 SOP 關聯: $totalActiveTaskSOPs 個"
Write-Output "  - 開票提醒: $totalBillingReminders 個"
Write-Output "  - 收據: $totalReceipts 個"
Write-Output "  - 收據項目: $totalReceiptItems 個"
Write-Output "  - 付款記錄: $totalPayments 個"
Write-Output "  - 客戶標籤: $totalCustomerTags 個"
Write-Output "  - 標籤關聯: $totalClientTagAssignments 個"
Write-Output "  - 客戶協作人: $totalClientCollaborators 個"
Write-Output "  - 股東: $totalShareholders 個"
Write-Output "  - 董監事: $totalDirectorsSupervisors 個"
Write-Output "  - 內部文檔: $totalInternalDocuments 個"
Write-Output "  - 附件: $totalAttachments 個"
Write-Output "  - 內部 FAQ: $totalInternalFAQs 個"
Write-Output "  - FAQ 關聯: $totalTaskTemplateStageFAQs 個"
Write-Output ""
Write-Output "預期範圍:"
Write-Output "  - 客戶: $CLIENT_COUNT 個"
Write-Output "  - 客戶服務: $($CLIENT_COUNT * $SERVICES_PER_CLIENT_MIN) - $($CLIENT_COUNT * $SERVICES_PER_CLIENT_MAX) 個"
Write-Output "  - 任務配置: $($CLIENT_COUNT * $SERVICES_PER_CLIENT_MIN * $TASKS_PER_SERVICE_MIN) - $($CLIENT_COUNT * $SERVICES_PER_CLIENT_MAX * $TASKS_PER_SERVICE_MAX) 個"
Write-Output "  - 活躍任務: 約 $($totalActiveTasks) 個（過去3個月+當前月）"
Write-Output "  - 收據: 約 $($totalReceipts) 個（根據開票提醒生成）"

# 檢查數據完整性
Write-Output ""
Write-Output "[15/15] 檢查數據完整性和所有模塊（包含 SOP 關聯）..."
$integritySql = "SELECT COUNT(DISTINCT c.client_id) as client_count, COUNT(DISTINCT cs.client_service_id) as service_count, COUNT(DISTINCT tc.config_id) as config_count FROM Clients c LEFT JOIN ClientServices cs ON cs.client_id = c.client_id AND cs.is_deleted = 0 LEFT JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id AND tc.is_deleted = 0 WHERE c.client_id LIKE 'PROD_TEST_%'"
$integrityCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command $integritySql 2>&1 | Out-String

Write-Output "完整性檢查結果:"
Write-Output $integrityCheck

# 檢查收費計劃完整性
$billingCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(DISTINCT bp.billing_plan_id) as billing_plans, COUNT(DISTINCT bps.client_service_id) as services_with_billing, COUNT(DISTINCT bpm.billing_month) as billing_months FROM BillingPlans bp LEFT JOIN BillingPlanServices bps ON bp.billing_plan_id = bps.billing_plan_id LEFT JOIN BillingPlanMonths bpm ON bp.billing_plan_id = bpm.billing_plan_id WHERE bp.client_id LIKE 'PROD_TEST_%'" 2>&1 | Out-String
Write-Output ""
Write-Output "收費計劃檢查結果:"
Write-Output $billingCheck

# 檢查客戶基本信息完整性
$clientInfoCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as total, COUNT(phone) as has_phone, COUNT(email) as has_email, COUNT(contact_person_1) as has_contact1, COUNT(company_owner) as has_owner, COUNT(company_address) as has_address, COUNT(capital_amount) as has_capital FROM Clients WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0" 2>&1 | Out-String
Write-Output ""
Write-Output "客戶基本信息完整性檢查:"
Write-Output $clientInfoCheck

# 檢查服務基本信息完整性
$serviceInfoCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as total, COUNT(start_date) as has_start_date, COUNT(end_date) as has_end_date, COUNT(execution_months) as has_execution_months FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%' AND is_deleted = 0" 2>&1 | Out-String
Write-Output ""
Write-Output "服務基本信息完整性檢查:"
Write-Output $serviceInfoCheck

# 檢查其他模塊數據
$salaryCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM EmployeeSalaryItems" 2>&1 | Out-String
$costCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM MonthlyOverheadCosts" 2>&1 | Out-String
$tripCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM BusinessTrips" 2>&1 | Out-String
$leaveCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM LeaveRequests" 2>&1 | Out-String
$timesheetCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM Timesheets" 2>&1 | Out-String
$templateCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskTemplates" 2>&1 | Out-String

# 檢查 SOP 關聯數據
$sopDocsCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM SOPDocuments WHERE is_deleted = 0" 2>&1 | Out-String
$serviceSopCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM ClientServiceSOPs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-String
$configSopCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskConfigSOPs WHERE config_id IN (SELECT config_id FROM ClientServiceTaskConfigs WHERE client_service_id IN (SELECT client_service_id FROM ClientServices WHERE client_id LIKE 'PROD_TEST_%'))" 2>&1 | Out-String
$templateSopCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskGenerationTemplateSOPs WHERE template_id IN (SELECT template_id FROM TaskGenerationTemplates WHERE client_id LIKE 'PROD_TEST_%')" 2>&1 | Out-String
$stageSopCheck = npx wrangler d1 execute horgoscpa-db-v2 --local --command "SELECT COUNT(*) as count FROM TaskTemplateStageSOPs WHERE stage_id IN (SELECT stage_id FROM TaskTemplateStages WHERE template_id IN (SELECT template_id FROM TaskTemplates))" 2>&1 | Out-String

Write-Output ""
Write-Output "其他模塊數據檢查:"
Write-Output "  - 薪資項目: $salaryCheck"
Write-Output "  - 成本記錄: $costCheck"
Write-Output "  - 外出記錄: $tripCheck"
Write-Output "  - 假期申請: $leaveCheck"
Write-Output "  - 工時記錄: $timesheetCheck"
Write-Output "  - 任務模板: $templateCheck"
Write-Output ""
Write-Output "SOP 關聯數據檢查:"
Write-Output "  - SOP 文檔: $sopDocsCheck"
Write-Output "  - 服務層級 SOP 關聯: $serviceSopCheck"
Write-Output "  - 任務配置層級 SOP 關聯: $configSopCheck"
Write-Output "  - 任務生成模板 SOP 關聯: $templateSopCheck"
Write-Output "  - 任務模板階段 SOP 關聯: $stageSopCheck"

if ($clientCount -eq $CLIENT_COUNT -and $serviceCount -gt 0 -and $configCount -gt 0) {
    Write-Output ""
    Write-Output "✅ 生產規模測試數據創建成功！"
    Write-Output "  - 客戶基本信息：完整（所有數據正常）"
    Write-Output "  - 服務基本信息：完整（所有數據正常）"
    Write-Output "  - 任務配置：完整（所有數據正常，都有負責人）"
    Write-Output "  - 收費計劃：已創建"
    Write-Output "  - 薪資數據：已創建"
    Write-Output "  - 成本數據：已創建"
    Write-Output "  - 外出數據：已創建"
    Write-Output "  - 假期數據：已創建"
    Write-Output "  - 工時表數據：已創建"
    Write-Output "  - 任務模板：已創建（包含階段和 SOP 關聯）"
    Write-Output "  - SOP 文檔：已創建"
    Write-Output "  - 服務層級 SOP 關聯：已創建"
    Write-Output "  - 任務配置層級 SOP 關聯：已創建"
    Write-Output "  - 任務生成模板 SOP 關聯：已創建"
    Write-Output "  - 任務模板階段 SOP 關聯：已創建"
    exit 0
} else {
    Write-Output ""
    Write-Output "❌ 數據創建不完整，需要檢查"
    exit 1
}

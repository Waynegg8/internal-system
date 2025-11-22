# 創建多樣化的測試任務模板
# 包括：多階段模板、單階段多任務模板

$ErrorActionPreference = "Stop"

Write-Host "開始創建測試任務模板..." -ForegroundColor Green

# 獲取服務ID（全流程測試服務）
$serviceId = 92

# 獲取用戶ID（管理員）
$adminUserId = 1

# 模板1：多階段模板（3個階段，每個階段2-3個任務）
Write-Host "`n創建模板1：多階段模板（3階段，共7個任務）..." -ForegroundColor Yellow

$template1Body = @{
    template_name = "全流程測試-多階段模板"
    service_id = $serviceId
    client_id = $null
    description = "多階段測試模板：包含準備、執行、完成三個階段，每個階段有多個任務"
    default_due_date_rule = "end_of_month"
    default_due_date_value = $null
    default_due_date_offset_days = 0
    default_advance_days = 7
    tasks = @(
        # 階段1：準備階段（3個任務）
        @{
            name = "資料收集與整理"
            stage_order = 1
            description = "收集客戶相關資料並進行初步整理"
            estimated_hours = 2.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "初步審核"
            stage_order = 1
            description = "對收集的資料進行初步審核"
            estimated_hours = 1.5
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "準備工作環境"
            stage_order = 1
            description = "準備所需的工作環境和工具"
            estimated_hours = 0.5
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        # 階段2：執行階段（2個任務）
        @{
            name = "核心業務處理"
            stage_order = 2
            description = "執行核心業務處理流程"
            estimated_hours = 4.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "數據驗證"
            stage_order = 2
            description = "驗證處理後的數據準確性"
            estimated_hours = 2.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        # 階段3：完成階段（2個任務）
        @{
            name = "最終審核"
            stage_order = 3
            description = "進行最終審核確認"
            estimated_hours = 1.5
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "提交與歸檔"
            stage_order = 3
            description = "提交結果並進行歸檔"
            estimated_hours = 1.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        }
    )
} | ConvertTo-Json -Depth 10

# 模板2：單階段多任務模板（1個階段，5個任務）
Write-Host "`n創建模板2：單階段多任務模板（1階段，5個任務）..." -ForegroundColor Yellow

$template2Body = @{
    template_name = "全流程測試-單階段多任務模板"
    service_id = $serviceId
    client_id = $null
    description = "單階段多任務測試模板：一個階段包含5個並行任務"
    default_due_date_rule = "days_after_start"
    default_due_date_value = 15
    default_due_date_offset_days = 0
    default_advance_days = 5
    tasks = @(
        @{
            name = "任務A：財務報表編製"
            stage_order = 1
            description = "編製月度財務報表"
            estimated_hours = 3.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "任務B：稅務申報準備"
            stage_order = 1
            description = "準備稅務申報相關資料"
            estimated_hours = 2.5
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "任務C：客戶溝通"
            stage_order = 1
            description = "與客戶進行定期溝通"
            estimated_hours = 1.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "任務D：內部審核"
            stage_order = 1
            description = "進行內部審核流程"
            estimated_hours = 2.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "任務E：文檔整理"
            stage_order = 1
            description = "整理相關文檔和記錄"
            estimated_hours = 1.5
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        }
    )
} | ConvertTo-Json -Depth 10

# 模板3：複雜多階段模板（4個階段，共10個任務）
Write-Host "`n創建模板3：複雜多階段模板（4階段，共10個任務）..." -ForegroundColor Yellow

$template3Body = @{
    template_name = "全流程測試-複雜多階段模板"
    service_id = $serviceId
    client_id = $null
    description = "複雜多階段測試模板：包含4個階段，共10個任務，測試複雜的任務依賴關係"
    default_due_date_rule = "specific_day"
    default_due_date_value = 25
    default_due_date_offset_days = 0
    default_advance_days = 10
    tasks = @(
        # 階段1：初始化（2個任務）
        @{
            name = "項目啟動"
            stage_order = 1
            description = "啟動新項目並分配資源"
            estimated_hours = 1.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "需求確認"
            stage_order = 1
            description = "確認項目需求和範圍"
            estimated_hours = 1.5
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        # 階段2：規劃（3個任務）
        @{
            name = "制定計劃"
            stage_order = 2
            description = "制定詳細執行計劃"
            estimated_hours = 2.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "資源分配"
            stage_order = 2
            description = "分配所需資源"
            estimated_hours = 1.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "時間表制定"
            stage_order = 2
            description = "制定項目時間表"
            estimated_hours = 1.5
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        # 階段3：執行（3個任務）
        @{
            name = "執行核心任務"
            stage_order = 3
            description = "執行核心業務任務"
            estimated_hours = 5.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "進度監控"
            stage_order = 3
            description = "監控項目進度"
            estimated_hours = 1.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "問題處理"
            stage_order = 3
            description = "處理執行過程中的問題"
            estimated_hours = 2.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        # 階段4：完成（2個任務）
        @{
            name = "質量檢查"
            stage_order = 4
            description = "進行最終質量檢查"
            estimated_hours = 2.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        },
        @{
            name = "項目結案"
            stage_order = 4
            description = "完成項目並結案"
            estimated_hours = 1.0
            execution_frequency = "monthly"
            execution_months = @(1,2,3,4,5,6,7,8,9,10,11,12)
        }
    )
} | ConvertTo-Json -Depth 10

# 讀取 API base URL
$apiBase = if ($env:API_BASE) { $env:API_BASE } else { "https://v2.horgoscpa.com/api/v2" }

# 讀取認證 token（需要從環境變數或配置文件獲取）
$token = if ($env:API_TOKEN) { $env:API_TOKEN } else {
    Write-Host "警告：未設置 API_TOKEN，將嘗試使用默認認證" -ForegroundColor Yellow
    ""
}

# 創建模板的函數
function Create-TaskTemplate {
    param(
        [string]$Body,
        [string]$TemplateName
    )
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($token) {
            $headers["Authorization"] = "Bearer $token"
        }
        
        $response = Invoke-RestMethod -Uri "$apiBase/task-templates" `
            -Method POST `
            -Headers $headers `
            -Body $Body `
            -ErrorAction Stop
        
        if ($response.success -or $response.data) {
            $templateId = $response.data.template_id
            Write-Host "✓ 成功創建模板：$TemplateName (ID: $templateId)" -ForegroundColor Green
            return $templateId
        } else {
            Write-Host "✗ 創建模板失敗：$TemplateName - $($response.message)" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "✗ 創建模板失敗：$TemplateName - $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  響應內容：$responseBody" -ForegroundColor Red
        }
        return $null
    }
}

# 創建所有模板
$template1Id = Create-TaskTemplate -Body $template1Body -TemplateName "多階段模板"
$template2Id = Create-TaskTemplate -Body $template2Body -TemplateName "單階段多任務模板"
$template3Id = Create-TaskTemplate -Body $template3Body -TemplateName "複雜多階段模板"

Write-Host "`n模板創建完成！" -ForegroundColor Green
Write-Host "模板1（多階段）：$template1Id" -ForegroundColor Cyan
Write-Host "模板2（單階段多任務）：$template2Id" -ForegroundColor Cyan
Write-Host "模板3（複雜多階段）：$template3Id" -ForegroundColor Cyan


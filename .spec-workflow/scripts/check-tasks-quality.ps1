# Tasks.md 品質檢查腳本
# 檢查所有 tasks.md 是否包含必填欄位和正確格式

$specsPath = ".spec-workflow/specs"
$issues = @()

Write-Host "開始檢查 tasks.md 品質..." -ForegroundColor Cyan

Get-ChildItem -Path $specsPath -Directory | ForEach-Object {
    $specDir = $_.FullName
    $specName = $_.Name
    $tasksFile = Join-Path $specDir "tasks.md"
    
    if (Test-Path $tasksFile) {
        $content = Get-Content $tasksFile -Raw
        $lines = Get-Content $tasksFile
        
        # 檢查必填欄位
        $hasPrompt = $content -match "_Prompt:"
        $hasRequirements = $content -match "_Requirements:"
        $hasLeverage = $content -match "_Leverage:"
        
        # 檢查任務數量
        $taskCount = ($lines | Select-String "^- \[ \]").Count
        
        # 檢查是否有階層式編號
        $hasHierarchical = $content -match "^\s*-\s*\[ \]\s+\d+\.\d+" -Multiline
        
        $specIssues = @()
        
        if (-not $hasPrompt) {
            $specIssues += "缺少 _Prompt 欄位"
        }
        if (-not $hasRequirements) {
            $specIssues += "缺少 _Requirements 欄位"
        }
        if (-not $hasLeverage) {
            $specIssues += "缺少 _Leverage 欄位"
        }
        if ($taskCount -eq 0) {
            $specIssues += "沒有找到任何任務"
        }
        
        if ($specIssues.Count -gt 0) {
            $issues += [PSCustomObject]@{
                Spec = $specName
                Issues = $specIssues -join "; "
                TaskCount = $taskCount
            }
        } else {
            Write-Host "✓ $specName - OK ($taskCount 個任務)" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠ $specName - 缺少 tasks.md" -ForegroundColor Yellow
    }
}

Write-Host "`n檢查完成！" -ForegroundColor Cyan

if ($issues.Count -gt 0) {
    Write-Host "`n發現以下問題：" -ForegroundColor Red
    $issues | Format-Table -AutoSize
    
    Write-Host "`n建議：" -ForegroundColor Yellow
    Write-Host "1. 檢查上述模組的 tasks.md 是否完整" -ForegroundColor Yellow
    Write-Host "2. 確保每個任務都包含 _Prompt, _Requirements, _Leverage 欄位" -ForegroundColor Yellow
    Write-Host "3. 可能需要重新生成不完整的 tasks.md" -ForegroundColor Yellow
} else {
    Write-Host "`n所有 tasks.md 都通過基本檢查！" -ForegroundColor Green
}


# Requirements Document: BR6.3: 工時顯示功能

## Introduction

工時顯示功能提供請假記錄顯示、工時完整性檢查和統計功能，幫助員工了解工時狀況和統計數據。

**User Story**: 作為會計師事務所的員工，我需要查看請假記錄、工時完整性和統計數據，以便了解工時狀況。

## Alignment with Product Vision

本功能支持工時記錄系統的核心目標：
- **可視化工時狀況**：通過請假記錄和完整性檢查，清晰展示工時狀況
- **統計分析**：提供本週和本月的統計數據，便於分析

## Requirements

### BR6.3.1: 請假記錄顯示

**User Story**: 作為員工，我需要查看每日請假記錄，以便了解請假情況。

#### 驗收標準
- WHEN 員工查看工時表格時 THEN 系統 SHALL 在表格底部顯示每日請假記錄
- WHEN 顯示請假記錄時 THEN 系統 SHALL 顯示格式：`{請假類型} {時數}h`，多筆請假用逗號分隔（例如：`病假 4h, 事假 2h`）
- WHEN 當天無請假記錄時 THEN 系統 SHALL 顯示 `-`
- WHEN 計算工時完整性時 THEN 系統 SHALL 將請假時數計入計算（見 BR6.3.2）

### BR6.3.2: 工時完整性檢查

**User Story**: 作為員工，我需要查看工時完整性，以便了解是否已滿 8 小時正常工時。

#### 驗收標準
- WHEN 員工查看工時表格時 THEN 系統 SHALL 在表格底部顯示「工時完整性」行
- WHEN 日期為工作日時 THEN 系統 SHALL 計算正常工時 + 請假時數（從 BR6.3.1 獲取請假時數）
- WHEN 正常工時 + 請假時數 >= 8 小時時 THEN 系統 SHALL 顯示 ✓
- WHEN 正常工時 + 請假時數 < 8 小時時 THEN 系統 SHALL 顯示 ✗缺X.Xh（X.X 為不足的小時數，保留小數點後 1 位）
- WHEN 日期為休息日/例假日/國定假日時 THEN 系統 SHALL 顯示 `-`（不檢查完整性）

### BR6.3.3: 本週統計

**User Story**: 作為員工，我需要查看本週統計數據，以便了解本週工時狀況。

#### 驗收標準
- WHEN 員工查看工時頁面時 THEN 系統 SHALL 顯示本週統計卡片
- WHEN 顯示本週統計時 THEN 系統 SHALL 顯示以下數據：
  - 本週總工時
  - 本週加班工時
  - 本週加權工時
  - 本週請假時數
- WHEN 計算加權工時時 THEN 系統 SHALL 根據工時類型的 `multiplier` 計算（例如：平日OT前2h 的 multiplier 為 1.34）
- WHEN 顯示統計數據時 THEN 系統 SHALL 顯示到小數點後 1 位

### BR6.3.4: 本月統計

**User Story**: 作為員工，我需要查看本月統計數據，以便了解本月工時狀況。

#### 驗收標準
- WHEN 員工查看工時頁面時 THEN 系統 SHALL 顯示本月統計卡片
- WHEN 顯示本月統計時 THEN 系統 SHALL 顯示以下數據：
  - 本月總工時
  - 本月加班工時
  - 本月加權工時
  - 本月請假時數
- WHEN 計算加權工時時 THEN 系統 SHALL 根據工時類型的 `multiplier` 計算
- WHEN 顯示統計數據時 THEN 系統 SHALL 顯示到小數點後 1 位

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個組件應有單一明確的職責（TimesheetTable 負責顯示，TimesheetSummary 負責統計）
- **Modular Design**: 統計計算邏輯應獨立於 UI 組件，放在 store 中
- **Dependency Management**: 組件依賴 store 數據，不直接操作 API
- **Clear Interfaces**: 組件通過 props 接收數據，通過 events 通知父組件

### Performance
- 統計數據計算時間 < 500ms
- 頁面載入時間 < 3 秒

### Security
- 僅授權用戶可查看自己的工時記錄
- 統計數據計算應在後端驗證用戶權限

### Reliability
- 統計數據計算準確
- 請假記錄顯示準確
- 工時完整性檢查準確

### Usability
- 統計數據清晰易讀
- 請假記錄格式統一
- 工時完整性標記明顯


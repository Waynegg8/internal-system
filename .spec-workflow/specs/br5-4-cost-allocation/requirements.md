# Requirements Document: BR5.4: 成本分攤計算

## Introduction

成本分攤計算功能提供按不同方式分攤管理費用並計算員工時薪和客戶任務成本的功能。本功能幫助管理員根據不同分攤方式將管理費用分攤給員工，並計算員工時薪和客戶任務成本。

**User Story**: 作為管理員，我需要計算成本分攤並查看員工時薪和客戶任務成本，以便進行成本分析。

## Alignment with Product Vision

本功能支持成本管理系統的核心目標：
- **準確分攤**：根據不同分攤方式準確計算分攤金額
- **成本分析**：為員工成本分析和客戶任務成本分析提供數據基礎

## Requirements

### BR5.4.0: 成本分攤計算流程

**User Story**: 作為管理員，我需要選擇分攤方式並執行完整的成本分攤計算流程，以便獲得完整的成本分析結果。

#### 驗收標準

- WHEN 管理員選擇分攤方式時 THEN 系統 SHALL 允許選擇三種分攤方式之一（按員工數/按工時/按收入）
- WHEN 系統執行成本分攤計算時 THEN 系統 SHALL 按以下順序執行：
  1. 根據選擇的分攤方式計算每個員工的分攤金額（BR5.4.1/BR5.4.2/BR5.4.3）
  2. 計算每個員工的實際時薪（BR5.4.4）
  3. 計算客戶任務成本（BR5.4.5）
- WHEN 系統查詢總成本時 THEN 系統 SHALL 從 MonthlyCostRecords 表查詢指定年份和月份的管理費用總額
- WHEN 系統確定員工範圍時 THEN 系統 SHALL 只計算在指定月份有工時記錄的員工（從 Timesheets 表查詢）

### BR5.4.1: 按員工數分攤

**User Story**: 作為管理員，我需要按員工數分攤管理費用，以便平均分攤給每個員工。

#### 驗收標準

- WHEN 系統計算按員工數分攤時 THEN 系統 SHALL 使用公式：`總成本 ÷ 員工總數`
- WHEN 系統分攤時 THEN 系統 SHALL 每個員工平均分攤相同金額
- WHEN 系統計算員工總數時 THEN 系統 SHALL 統計在指定月份有工時記錄的員工總數

### BR5.4.2: 按工時分攤

**User Story**: 作為管理員，我需要按工時分攤管理費用，以便按員工實際工時比例分攤。

#### 驗收標準

- WHEN 系統計算按工時分攤時 THEN 系統 SHALL 使用公式：`總成本 × (員工實際工時 ÷ 總實際工時)`
- WHEN 系統計算實際工時時 THEN 系統 SHALL 從 Timesheets 表查詢，直接 `SUM(hours)`，不考慮工時類型的加權係數，也不扣除請假時數

### BR5.4.3: 按收入分攤

**User Story**: 作為管理員，我需要按收入分攤管理費用，以便按員工收入比例分攤。

#### 驗收標準

- WHEN 系統計算按收入分攤時 THEN 系統 SHALL 使用公式：`總成本 × (員工收入 ÷ 總收入)`
- WHEN 系統計算員工收入時 THEN 系統 SHALL 使用 BR1 的應計收入邏輯（從 ClientServices 和 BillingPlans 表計算）
- WHEN 系統計算員工收入時 THEN 系統 SHALL 只計算該月的應計收入
- WHEN 系統計算員工收入時 THEN 系統 SHALL 按員工在該客戶的工時比例分配給員工

### BR5.4.4: 員工時薪計算

**User Story**: 作為管理員，我需要計算員工實際時薪，以便了解員工的實際成本。

#### 驗收標準

- WHEN 系統計算員工時薪時 THEN 系統 SHALL 使用公式：`(月薪 + 分攤的管理費用) ÷ 實際工時`
- WHEN 系統計算月薪時 THEN 系統 SHALL 從薪資系統取得（底薪 + 津貼/獎金 + 補休轉加班費 - 請假扣款）
- WHEN 系統計算實際工時時 THEN 系統 SHALL 從 Timesheets 表查詢，直接 `SUM(hours)`，不考慮工時類型的加權係數，也不扣除請假時數
- WHEN 系統計算分攤的管理費用時 THEN 系統 SHALL 使用根據選擇的分攤方式（BR5.4.1/BR5.4.2/BR5.4.3）計算出的該員工分攤金額
- WHEN 系統計算時薪時遇到實際工時為 0 的情況 THEN 系統 SHALL 返回錯誤或標記為無法計算，不執行除零運算

### BR5.4.5: 客戶任務成本計算

**User Story**: 作為管理員，我需要計算客戶任務成本，以便了解客戶任務的實際成本。

#### 驗收標準

- WHEN 系統計算客戶任務成本時 THEN 系統 SHALL 使用公式：`工時 × 分攤後的時薪`
- WHEN 系統計算時 THEN 系統 SHALL 使用計算出的員工實際時薪（來自 BR5.4.4）
- WHEN 系統查詢任務工時時 THEN 系統 SHALL 從 Timesheets 表查詢指定月份、指定員工、指定客戶任務的工時
- WHEN 系統計算任務成本時 THEN 系統 SHALL 為每個客戶任務計算成本，並按客戶和任務分組展示

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責（如 cost-allocation.js 只負責分攤計算邏輯）
- **Modular Design**: 計算邏輯、API 處理、前端組件應該分離且可重用
- **Dependency Management**: 最小化模組間的相互依賴
- **Clear Interfaces**: 定義清晰的服務接口（如 revenue-calculation.js 提供應計收入計算接口）

### Performance
- API 響應時間 < 2 秒（複雜計算）
- 計算結果準確無誤
- 優化資料庫查詢，避免 N+1 查詢問題

### Security
- 僅管理員可以訪問成本分攤計算功能
- 使用參數化查詢防止 SQL 注入
- 驗證輸入參數（年份、月份、分攤方式）

### Reliability
- 計算邏輯準確
- 數據來源可靠
- 處理邊界情況（如工時為 0、收入為 0 等）

### Usability
- 提供清晰的錯誤提示訊息
- 計算結果以易讀的格式展示
- 支援結果匯出功能（可選）


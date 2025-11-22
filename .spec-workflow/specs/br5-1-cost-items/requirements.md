# Requirements Document: BR5.1: 成本項目類型管理

## Introduction

成本項目類型管理功能提供成本項目類型的新增、編輯、刪除功能。本功能幫助管理員設定和管理成本項目類型，為月度管理費用記錄和成本分攤計算提供基礎分類。

**User Story**: 作為管理員，我需要管理成本項目類型，以便建立成本分類體系並為成本分攤計算提供基礎。

## Alignment with Product Vision

本功能支持成本管理系統的核心目標：
- **建立成本分類體系**：建立完整的成本項目分類體系，為成本管理提供基礎
- **支援分攤計算**：為成本分攤計算提供分攤方式設定
- **提升管理效率**：集中管理成本項目類型，提升管理效率

## Requirements

### BR5.1.1: 成本項目類型列表展示

**User Story**: 作為管理員，我需要查看成本項目類型列表，以便了解所有成本項目類型。

#### 驗收標準

- WHEN 管理員打開成本項目類型列表頁面時 THEN 系統 SHALL 顯示所有成本項目類型
- WHEN 管理員查看成本項目類型列表時 THEN 系統 SHALL 顯示以下資訊：
  - 成本代碼（`cost_code`）
  - 成本名稱（`cost_name`）
  - 類別（`category`：固定/變動）
  - 分攤方式（`allocation_method`：按員工數/按工時/按收入）
  - 描述（`description`）
- WHEN 管理員查看成本項目類型列表時 THEN 系統 SHALL 按成本名稱（`cost_name`）排序

### BR5.1.2: 新增成本項目類型

**User Story**: 作為管理員，我需要新增成本項目類型，以便建立新的成本分類。

#### 驗收標準

- WHEN 管理員新增成本項目類型時 THEN 系統 SHALL 要求以下欄位為必填：
  - 成本代碼（`cost_code`，唯一）
  - 成本名稱（`cost_name`）
  - 類別（`category`：固定/變動）
  - 分攤方式（`allocation_method`：按員工數/按工時/按收入）
- WHEN 管理員新增成本項目類型時 THEN 系統 SHALL 允許填寫描述（`description`，可選）
- WHEN 管理員新增成本項目類型時 THEN 系統 SHALL 檢查成本代碼不能重複
- WHEN 管理員新增成本項目類型時 THEN 系統 SHALL 記錄建立時間（`created_at`）

### BR5.1.3: 編輯成本項目類型

**User Story**: 作為管理員，我需要編輯成本項目類型，以便更新成本項目類型資訊。

#### 驗收標準

- WHEN 管理員編輯成本項目類型時 THEN 系統 SHALL 允許修改以下欄位：
  - 成本代碼（`cost_code`）
  - 成本名稱（`cost_name`）
  - 類別（`category`）
  - 分攤方式（`allocation_method`）
  - 描述（`description`）
- WHEN 管理員編輯成本項目類型時 THEN 系統 SHALL 要求以下欄位為必填：
  - 成本代碼（`cost_code`）
  - 成本名稱（`cost_name`）
  - 類別（`category`）
  - 分攤方式（`allocation_method`）
- WHEN 管理員編輯成本項目類型時 THEN 系統 SHALL 檢查成本代碼不能與其他成本項目類型重複（排除當前項目）
- WHEN 管理員編輯成本項目類型時 THEN 系統 SHALL 記錄更新時間（`updated_at`）

### BR5.1.4: 刪除成本項目類型

**User Story**: 作為管理員，我需要刪除成本項目類型，以便移除不需要的成本分類。

#### 驗收標準

- WHEN 管理員刪除成本項目類型時 THEN 系統 SHALL 採用硬刪除（從資料庫中完全刪除）
- WHEN 管理員刪除成本項目類型時 THEN 系統 SHALL 檢查該成本項目類型是否已被使用：
  - 檢查 `MonthlyOverheadCosts` 表中是否有對應的 `cost_type_id`
  - 檢查 `OverheadRecurringTemplates` 表中是否有對應的 `cost_type_id`
- WHEN 成本項目類型已被使用時 THEN 系統 SHALL 提示錯誤並阻止刪除
- WHEN 成本項目類型未被使用時 THEN 系統 SHALL 允許刪除

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 2 秒

### Security
- 僅管理員可以訪問成本項目類型管理功能
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證
- 所有操作留存審計日誌（建立/修改/刪除）

### Reliability
- 成本項目類型資料完整準確
- 刪除前檢查使用情況，防止數據不一致

### Usability
- 界面簡潔直觀
- 操作流程清晰
- 錯誤提示明確


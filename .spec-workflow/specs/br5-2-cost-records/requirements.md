# Requirements Document: BR5.2: 月度管理費用記錄

## Introduction

月度管理費用記錄功能提供月度管理費用的新增、編輯、刪除功能。本功能幫助管理員記錄和管理每個月的管理費用，為成本分攤計算提供數據基礎。

**User Story**: 作為管理員，我需要管理月度管理費用記錄，以便記錄每個月的管理費用並為成本分攤計算提供數據基礎。

## Alignment with Product Vision

本功能支持成本管理系統的核心目標：
- **記錄管理費用**：準確記錄每個月的管理費用，為成本分攤計算提供數據基礎
- **數據完整性**：確保費用記錄完整準確，支援成本分析
- **提升管理效率**：集中管理月度費用記錄，提升管理效率

## Requirements

### BR5.2.1: 月度管理費用列表展示

**User Story**: 作為管理員，我需要查看月度管理費用列表，以便了解所有月度管理費用記錄。

#### 驗收標準

- WHEN 管理員打開月度管理費用列表頁面時 THEN 系統 SHALL 顯示所有月度管理費用記錄
- WHEN 管理員查看月度管理費用列表時 THEN 系統 SHALL 顯示以下資訊：
  - 成本項目類型（`cost_item_type_id`，顯示成本名稱）
  - 年份（`year`）
  - 月份（`month`）
  - 金額（`amount`）
  - 備註（`notes`）
  - 錄入人（`created_by`，顯示用戶名稱）
  - 錄入時間（`created_at`）
- WHEN 管理員查看月度管理費用列表時 THEN 系統 SHALL 按年份降序、月份降序、成本項目類型名稱排序

### BR5.2.2: 新增月度管理費用

**User Story**: 作為管理員，我需要新增月度管理費用記錄，以便記錄每個月的管理費用。

#### 驗收標準

- WHEN 管理員新增月度管理費用時 THEN 系統 SHALL 要求以下欄位為必填：
  - 成本項目類型（`cost_item_type_id`）
  - 年份（`year`）
  - 月份（`month`）
  - 金額（`amount`）
- WHEN 管理員新增月度管理費用時 THEN 系統 SHALL 允許填寫備註（`notes`，可選）
- WHEN 管理員新增月度管理費用時 THEN 系統 SHALL 要求金額必須為正數
- WHEN 管理員新增月度管理費用時 THEN 系統 SHALL 驗證年份為有效年份（建議範圍：1900-2100）
- WHEN 管理員新增月度管理費用時 THEN 系統 SHALL 驗證月份為有效月份（1-12）
- WHEN 管理員新增月度管理費用時 THEN 系統 SHALL 驗證成本項目類型存在且為啟用狀態
- WHEN 管理員新增月度管理費用時 THEN 系統 SHALL 檢查同一成本項目類型在同一月只能有一筆記錄
- WHEN 同一成本項目類型在同一月已有記錄時 THEN 系統 SHALL 提示錯誤並阻止新增
- WHEN 管理員新增月度管理費用時 THEN 系統 SHALL 記錄錄入時間和錄入人

### BR5.2.3: 編輯月度管理費用

**User Story**: 作為管理員，我需要編輯月度管理費用記錄，以便更新費用資訊。

#### 驗收標準

- WHEN 管理員編輯月度管理費用時 THEN 系統 SHALL 允許修改以下欄位：
  - 成本項目類型（`cost_item_type_id`）
  - 年份（`year`）
  - 月份（`month`）
  - 金額（`amount`）
  - 備註（`notes`）
- WHEN 管理員編輯月度管理費用時 THEN 系統 SHALL 要求以下欄位為必填：
  - 成本項目類型（`cost_item_type_id`）
  - 年份（`year`）
  - 月份（`month`）
  - 金額（`amount`）
- WHEN 管理員編輯月度管理費用時 THEN 系統 SHALL 要求金額必須為正數
- WHEN 管理員編輯月度管理費用時 THEN 系統 SHALL 驗證年份為有效年份（建議範圍：1900-2100）
- WHEN 管理員編輯月度管理費用時 THEN 系統 SHALL 驗證月份為有效月份（1-12）
- WHEN 管理員編輯月度管理費用時 THEN 系統 SHALL 驗證成本項目類型存在且為啟用狀態
- WHEN 管理員編輯月度管理費用時 THEN 系統 SHALL 檢查同一成本項目類型在同一月只能有一筆記錄（排除當前記錄）
- WHEN 修改後的成本項目類型和月份組合與其他記錄衝突時 THEN 系統 SHALL 提示錯誤並阻止修改
- WHEN 管理員編輯月度管理費用時 THEN 系統 SHALL 記錄更新時間和更新人

### BR5.2.4: 刪除月度管理費用

**User Story**: 作為管理員，我需要刪除月度管理費用記錄，以便移除錯誤的記錄。

#### 驗收標準

- WHEN 管理員刪除月度管理費用時 THEN 系統 SHALL 採用硬刪除（從資料庫中完全刪除）
- WHEN 管理員刪除月度管理費用時 THEN 系統 SHALL 允許刪除（無額外限制）
- WHEN 管理員刪除月度管理費用時 THEN 系統 SHALL 驗證記錄存在
- WHEN 管理員刪除月度管理費用時 THEN 系統 SHALL 在刪除前顯示確認對話框（前端 UI 層面）

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
- 僅管理員可以訪問月度管理費用記錄管理功能
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證
- 所有操作留存審計日誌（建立/修改/刪除）

### Reliability
- 月度管理費用記錄資料完整準確
- 月度唯一性檢查確保數據一致性

### Usability
- 界面簡潔直觀
- 操作流程清晰
- 錯誤提示明確


# Requirements Document: BR4.2: 員工底薪與加給設定

## Introduction

員工底薪與加給設定功能提供統一的員工底薪設定、薪資項目管理和薪資項目類型管理界面。本功能幫助管理員設定和管理員工的底薪和薪資項目。

**User Story**: 作為會計師事務所的管理員，我需要設定和管理員工的底薪和薪資項目，以便能夠靈活配置員工的薪資結構。

## Alignment with Product Vision

本功能支持薪資管理系統的核心目標：
- **提升薪資管理效率**：集中管理員工底薪和薪資項目，提供統一的管理界面
- **確保數據準確性**：支援完整的 CRUD 操作，確保數據準確
- **支援靈活配置**：支援多種發放週期和生效日期設定，滿足不同業務需求

## Requirements

### BR4.2.1: 員工底薪設定

**User Story**: 作為管理員，我需要設定員工的底薪，以便在薪資計算時使用。

#### 驗收標準
- WHEN 管理員設定員工底薪時 THEN 系統 SHALL 驗證底薪金額必須大於等於 0
- WHEN 管理員設定員工底薪時 THEN 系統 SHALL 驗證員工 ID 存在
- WHEN 管理員設定員工底薪時 THEN 系統 SHALL 保存底薪設定
- WHEN 管理員設定員工底薪時 THEN 系統 SHALL 自動觸發該員工的薪資重新計算
- WHEN 管理員查看員工底薪時 THEN 系統 SHALL 顯示當前底薪金額
- IF 員工不存在 THEN 系統 SHALL 返回錯誤訊息

### BR4.2.2: 薪資項目管理

**User Story**: 作為管理員，我需要新增、編輯、刪除員工的薪資項目，以便靈活配置員工的薪資結構。

#### 驗收標準
- WHEN 管理員新增薪資項目時 THEN 系統 SHALL 要求選擇薪資項目類型、金額、發放週期、生效日期和過期日期
- WHEN 管理員新增薪資項目時 THEN 系統 SHALL 驗證金額必須大於 0
- WHEN 管理員新增薪資項目時 THEN 系統 SHALL 驗證生效日期格式正確（YYYY-MM-DD）
- WHEN 管理員新增薪資項目時 THEN 系統 SHALL 驗證過期日期必須晚於生效日期（如提供）
- WHEN 管理員編輯薪資項目時 THEN 系統 SHALL 允許修改金額、發放週期、生效日期和過期日期
- WHEN 管理員編輯薪資項目時 THEN 系統 SHALL 不允許修改薪資項目類型（需刪除後重新建立）
- WHEN 管理員刪除薪資項目時 THEN 系統 SHALL 軟刪除該項目（設置 is_deleted = 1）
- WHEN 管理員新增、編輯、刪除薪資項目時 THEN 系統 SHALL 自動觸發該員工的薪資重新計算
- WHEN 管理員查看員工薪資項目時 THEN 系統 SHALL 顯示所有有效的薪資項目（is_deleted = 0）

### BR4.2.3: 發放週期設定

**User Story**: 作為管理員，我需要設定薪資項目的發放週期，以便控制薪資項目的發放時機。

#### 驗收標準
- WHEN 管理員設定發放週期時 THEN 系統 SHALL 支援以下選項：
  - `recurring_type = 'monthly'`：每月發放
  - `recurring_type = 'once'`：僅在生效月份發放
  - `recurring_type = 'yearly'`：在 `recurring_months` JSON 陣列指定的月份發放
- WHEN 管理員選擇「每年指定月份」時 THEN 系統 SHALL 允許選擇多個月份（1-12）
- WHEN 管理員選擇「每年指定月份」時 THEN 系統 SHALL 要求至少選擇一個月份
- WHEN 管理員選擇「每年指定月份」時 THEN 系統 SHALL 驗證 `recurring_months` 為有效的 JSON 陣列

### BR4.2.4: 生效日期設定

**User Story**: 作為管理員，我需要設定薪資項目的生效日期和過期日期，以便控制薪資項目的有效期間。

#### 驗收標準
- WHEN 管理員設定生效日期時 THEN 系統 SHALL 要求選擇生效日期（格式：YYYY-MM-DD）
- WHEN 管理員設定過期日期時 THEN 系統 SHALL 允許選擇過期日期（格式：YYYY-MM-DD，可為 NULL）
- WHEN 系統計算薪資時 THEN 系統 SHALL 只計算生效日期已到且過期日期未到的薪資項目

### BR4.2.5: 薪資項目類型管理

**User Story**: 作為管理員，我需要管理薪資項目類型，以便統一管理薪資項目分類。

#### 驗收標準
- WHEN 管理員新增薪資項目類型時 THEN 系統 SHALL 要求輸入類型名稱和分類（加給、津貼、獎金、扣款、年終獎金）
- WHEN 管理員新增薪資項目類型時 THEN 系統 SHALL 驗證類型名稱不能為空
- WHEN 管理員新增薪資項目類型時 THEN 系統 SHALL 驗證類型名稱不能重複
- WHEN 管理員編輯薪資項目類型時 THEN 系統 SHALL 允許修改類型名稱和分類
- WHEN 管理員編輯薪資項目類型時 THEN 系統 SHALL 驗證修改後的類型名稱不能與其他類型重複
- WHEN 管理員刪除薪資項目類型時 THEN 系統 SHALL 檢查是否有員工使用該類型
- WHEN 管理員刪除薪資項目類型時 THEN 系統 SHALL 如果有員工使用該類型，則阻止刪除並提示
- WHEN 管理員刪除薪資項目類型時 THEN 系統 SHALL 如果沒有員工使用該類型，則硬刪除該類型（從資料庫中完全刪除）
- WHEN 管理員搜尋薪資項目類型時 THEN 系統 SHALL 支援在類型名稱中搜尋（部分匹配）
- WHEN 管理員查看薪資項目類型時 THEN 系統 SHALL 顯示類型名稱、分類和建立時間

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 2 秒
- 支援大量員工和薪資項目的管理

### Security
- 只有管理員可以管理員工底薪和薪資項目
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 薪資項目數據完整準確
- 發放週期和生效日期邏輯正確
- CRUD 操作穩定

### Usability
- 界面簡潔直觀
- 操作流程清晰
- 表單驗證提示明確


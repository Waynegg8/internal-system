# Requirements Document: BR8.1: 外出記錄列表

## Introduction

外出記錄列表功能提供統一的外出記錄查看、查詢、篩選界面。本功能幫助員工快速找到目標外出記錄、查看統計摘要，並追蹤交通補貼。

**User Story**: 作為會計師事務所的員工，我需要查看和管理外出記錄列表，以便能夠快速找到目標外出記錄、查看統計摘要，並追蹤交通補貼。

## Alignment with Product Vision

本功能支持外出記錄管理系統的核心目標：
- **提升外出記錄管理效率**：集中展示所有外出記錄，提供統一的查看和管理界面
- **快速定位記錄**：提供靈活的篩選功能，幫助員工快速找到目標外出記錄
- **統計分析**：提供統計摘要，幫助了解外出情況和交通補貼
- **提升工作效率**：支援多種篩選方式，滿足不同查詢需求

## Requirements

### BR8.1.1: 外出記錄列表展示

**User Story**: 作為員工，我需要查看外出記錄列表，以便了解所有外出記錄的狀況。

#### 驗收標準
- WHEN 員工打開外出記錄列表頁面時 THEN 系統 SHALL 顯示外出記錄（員工只能查看自己的記錄，管理員可以查看所有記錄）
- WHEN 系統顯示外出記錄列表時 THEN 系統 SHALL 只顯示未刪除的記錄（`is_deleted = 0`），不限制狀態（可顯示 pending、approved、rejected 等所有狀態）
- WHEN 員工查看外出記錄列表時 THEN 系統 SHALL 顯示以下資訊：
  - 外出日期（`trip_date`）
  - 員工名稱（`user_name`）
  - 客戶名稱（`client_name`，如果有關聯）
  - 目的地（`destination`）
  - 外出目的（`purpose`，如果有）
  - 距離（`distance_km`，公里）
  - 交通補貼（`transport_subsidy_twd`，新台幣）
  - 狀態（`status`）
- WHEN 管理員查看外出記錄列表時 THEN 系統 SHALL 顯示所有員工的外出記錄
- WHEN 一般員工查看外出記錄列表時 THEN 系統 SHALL 只顯示自己的外出記錄

### BR8.1.2: 月份篩選

**User Story**: 作為員工，我需要按月份篩選外出記錄，以便查看特定月份的外出情況。

#### 驗收標準
- WHEN 員工選擇月份時 THEN 系統 SHALL 篩選出該月份的外出記錄
- WHEN 員工打開外出記錄列表頁面時 THEN 系統 SHALL 預設顯示當前月份的外出記錄
- WHEN 員工切換月份時 THEN 系統 SHALL 重新載入該月份的外出記錄和統計摘要

### BR8.1.3: 員工篩選

**User Story**: 作為管理員，我需要按員工篩選外出記錄，以便查看特定員工的外出情況。

#### 驗收標準
- WHEN 管理員選擇員工時 THEN 系統 SHALL 篩選出該員工的外出記錄
- WHEN 管理員選擇「全部員工」時 THEN 系統 SHALL 顯示所有員工的外出記錄
- WHEN 一般員工查看外出記錄列表時 THEN 系統 SHALL 不顯示員工篩選選項（因為只能查看自己的記錄）

### BR8.1.4: 客戶篩選

**User Story**: 作為員工，我需要按客戶篩選外出記錄，以便查看與特定客戶相關的外出記錄。

#### 驗收標準
- WHEN 員工選擇客戶時 THEN 系統 SHALL 篩選出與該客戶相關的外出記錄
- WHEN 員工選擇「全部客戶」時 THEN 系統 SHALL 顯示所有外出記錄（不限制客戶）
- WHEN 外出記錄沒有關聯客戶時 THEN 系統 SHALL 在客戶欄位顯示「無」

### BR8.1.5: 統計摘要

**User Story**: 作為員工，我需要查看外出統計摘要，以便了解所選月份的外出情況和交通補貼。

#### 驗收標準
- WHEN 員工查看外出記錄列表時 THEN 系統 SHALL 顯示統計摘要卡片，包含：
  - 所選月份外出次數（`trip_count`）
  - 總距離（`total_distance_km`，公里）
  - 交通補貼總額（`total_subsidy_twd`，新台幣）
- WHEN 員工切換月份或員工篩選條件時 THEN 系統 SHALL 重新計算統計摘要（統計摘要不支援客戶篩選）
- WHEN 統計摘要計算時 THEN 系統 SHALL 只計算 `status = 'approved'` 的外出記錄

### BR8.1.6: 分頁功能

**User Story**: 作為員工，我需要分頁查看外出記錄，以便在大量記錄中瀏覽。

#### 驗收標準
- WHEN 外出記錄數量超過每頁顯示數量時 THEN 系統 SHALL 顯示分頁控件
- WHEN 員工切換頁面時 THEN 系統 SHALL 載入對應頁面的外出記錄
- WHEN 員工調整每頁顯示數量時 THEN 系統 SHALL 重新載入並顯示對應數量的記錄
- WHEN 系統分頁時 THEN 系統 SHALL 預設每頁顯示 20 筆，最多 100 筆

### BR8.1.7: 刪除功能

**User Story**: 作為員工或管理員，我需要刪除外出記錄，以便修正錯誤的記錄。

#### 驗收標準
- WHEN 員工點擊刪除按鈕時 THEN 系統 SHALL 顯示確認對話框
- WHEN 員工確認刪除時 THEN 系統 SHALL 軟刪除該外出記錄（`is_deleted = 1`）
- WHEN 外出記錄被刪除時 THEN 系統 SHALL 觸發薪資重新計算
- WHEN 一般員工嘗試刪除其他員工的外出記錄時 THEN 系統 SHALL 拒絕操作並顯示錯誤訊息
- WHEN 管理員刪除任何外出記錄時 THEN 系統 SHALL 允許操作

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義清晰的組件和層級之間的契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 3 秒
- 篩選操作響應時間 < 1 秒
- 支援分頁以處理大量數據

### Security
- 員工只能查看和刪除自己的外出記錄
- 管理員可以查看和刪除所有外出記錄
- 所有 API 請求需要身份驗證
- 使用參數化查詢防止 SQL 注入

### Reliability
- 系統應該優雅地處理錯誤情況
- 提供清晰的錯誤訊息給用戶
- 確保數據一致性（刪除記錄時觸發薪資重新計算）

### Usability
- 界面簡潔直觀
- 操作流程清晰
- 提供即時反饋（載入狀態、成功/錯誤提示）
- 支援鍵盤快捷鍵（如需要）


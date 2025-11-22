# Requirements Document: BR3.1: 收據列表

## Introduction

收據列表功能提供統一的收據查看、查詢、篩選界面。本功能幫助員工快速找到目標收據、追蹤收據狀態，並識別逾期收據。

**User Story**: 作為會計師事務所的員工，我需要查看和管理收據列表，以便能夠快速找到目標收據、追蹤收據狀態，並識別逾期收據。

## Alignment with Product Vision

本功能支持收據管理系統的核心目標：
- **提升收據管理效率**：集中展示所有收據，提供統一的查看和管理界面
- **快速定位收據**：提供靈活的篩選和搜尋功能，幫助員工快速找到目標收據
- **及時識別逾期**：自動標記逾期收據，幫助員工及時追蹤未收款項
- **提升工作效率**：支援多種篩選方式，滿足不同查詢需求

## Requirements

### BR3.1.1: 收據列表展示

**User Story**: 作為員工，我需要查看收據列表，以便了解所有收據的狀況。

#### 驗收標準
- WHEN 員工打開收據列表頁面時 THEN 系統 SHALL 顯示所有收據（所有員工都可以查看，無權限限制）
- WHEN 員工查看收據列表時 THEN 系統 SHALL 顯示以下資訊：
  - 收據號碼（`receipt_id`）
  - 客戶名稱（`company_name`）
  - 統一編號（`tax_registration_number`）
  - 開立日期（`receipt_date`）
  - 到期日期（`due_date`）
  - 總金額（`total_amount`）
  - 已付金額（`paid_amount`）
  - 未付金額（`outstanding_amount` = `total_amount` - `paid_amount`）
  - 狀態（`unpaid`、`partial`、`paid`、`cancelled`、`overdue`）
  - 收據類型（`normal`、`prepayment`、`deposit`）
  - 逾期標記和逾期天數（如果逾期）
- WHEN 收據逾期時 THEN 系統 SHALL 顯示逾期標記（例如：紅色標記）和逾期天數（例如「逾期 15 天」）
- WHEN 收據已付款或已作廢時 THEN 系統 SHALL 不顯示逾期標記

### BR3.1.2: 關鍵詞搜尋

**User Story**: 作為員工，我需要搜尋收據，以便快速找到目標收據。

#### 驗收標準
- WHEN 員工使用關鍵詞搜尋時 THEN 系統 SHALL 在收據號碼（`receipt_id`）、客戶名稱（`company_name`）、統一編號（`tax_registration_number`）中搜尋
- WHEN 員工輸入關鍵詞時 THEN 系統 SHALL 支援部分匹配（使用 `LIKE %keyword%`）
- WHEN 員工搜尋時 THEN 系統 SHALL 即時顯示搜尋結果（或提供搜尋按鈕）

### BR3.1.3: 狀態篩選

**User Story**: 作為員工，我需要按狀態篩選收據，以便查看特定狀態的收據。

#### 驗收標準
- WHEN 員工使用狀態篩選時 THEN 系統 SHALL 支援篩選：未付款（`unpaid`）、部分付款（`partial`）、已付款（`paid`）、已作廢（`cancelled`）、已逾期（`overdue`）
- WHEN 員工選擇「全部狀態」時 THEN 系統 SHALL 顯示所有狀態的收據
- WHEN 員工選擇特定狀態時 THEN 系統 SHALL 只顯示該狀態的收據

### BR3.1.4: 收據類型篩選

**User Story**: 作為員工，我需要按收據類型篩選收據，以便查看特定類型的收據。

#### 驗收標準
- WHEN 員工使用收據類型篩選時 THEN 系統 SHALL 支援篩選：一般收據（`normal`）、預收款（`prepayment`）、押金（`deposit`）
- WHEN 員工選擇「全部類型」時 THEN 系統 SHALL 顯示所有類型的收據
- WHEN 員工選擇特定類型時 THEN 系統 SHALL 只顯示該類型的收據

### BR3.1.5: 日期範圍篩選

**User Story**: 作為員工，我需要按日期範圍篩選收據，以便查看特定時間段的收據。

#### 驗收標準
- WHEN 員工使用日期範圍篩選時 THEN 系統 SHALL 支援多種日期篩選：開立日期（`receipt_date`）、到期日期（`due_date`）、服務月份（`service_start_month`、`service_end_month`）
- WHEN 員工選擇日期範圍時 THEN 系統 SHALL 預設基於開立日期（`receipt_date`）
- WHEN 員工選擇日期範圍時 THEN 系統 SHALL 支援選擇開始日期和結束日期

### BR3.1.6: 客戶篩選

**User Story**: 作為員工，我需要按客戶篩選收據，以便查看特定客戶的收據。

#### 驗收標準
- WHEN 員工使用客戶篩選時 THEN 系統 SHALL 允許選擇特定客戶（基於 `client_id`）
- WHEN 員工選擇客戶時 THEN 系統 SHALL 只顯示該客戶的收據
- WHEN 員工選擇「全部客戶」時 THEN 系統 SHALL 顯示所有客戶的收據

### BR3.1.7: 月份/年度篩選

**User Story**: 作為員工，我需要按月份或年度篩選收據，以便查看特定月份或年度的收據。

#### 驗收標準
- WHEN 員工使用月份/年度篩選時 THEN 系統 SHALL 允許選擇特定月份或年度（基於 `billing_month` 或 `service_start_month`）
- WHEN 員工選擇月份時 THEN 系統 SHALL 只顯示該月份的收據
- WHEN 員工選擇年度時 THEN 系統 SHALL 只顯示該年度的收據

### BR3.1.8: 排序

**User Story**: 作為員工，我需要查看排序後的收據列表，以便快速找到最新的收據。

#### 驗收標準
- WHEN 員工查看收據列表時 THEN 系統 SHALL 按開立日期降序（最新的在前），然後按收據號碼降序排序
- WHEN 系統排序時 THEN 系統 SHALL 只需要預設排序（不需要多種排序方式）

### BR3.1.9: 分頁

**User Story**: 作為員工，我需要分頁查看收據列表，以便管理大量收據。

#### 驗收標準
- WHEN 員工查看收據列表時 THEN 系統 SHALL 預設每頁顯示 20 筆，最多 100 筆
- WHEN 員工調整分頁設定時 THEN 系統 SHALL 允許選擇每頁顯示筆數（10、20、50、100 等）
- WHEN 員工切換頁面時 THEN 系統 SHALL 保持篩選條件

### BR3.1.10: 逾期收據標記

**User Story**: 作為員工，我需要識別逾期收據，以便及時追蹤未收款項。

#### 驗收標準
- WHEN 收據的到期日期（`due_date`）已過且狀態為「未付款」或「部分付款」時 THEN 系統 SHALL 自動標記為逾期（`overdue`）
- WHEN 收據的到期日期（`due_date`）為 NULL 時 THEN 系統 SHALL 不標記為逾期
- WHEN 收據已付款或已作廢時 THEN 系統 SHALL 不顯示為逾期
- WHEN 員工查看收據列表時 THEN 系統 SHALL 顯示逾期標記和逾期天數（例如「逾期 15 天」）
- WHEN 系統計算逾期天數時 THEN 系統 SHALL 計算逾期天數 = 今天 - 到期日期（`due_date`），僅當 `due_date` 不為 NULL 時計算

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 3 秒
- 篩選操作響應時間 < 1 秒
- 支援分頁以處理大量收據

### Security
- 所有員工都可以查看收據列表（無權限限制）
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 篩選和搜尋結果準確
- 逾期標記計算準確
- 分頁功能穩定

### Usability
- 界面簡潔直觀
- 篩選條件清晰
- 搜尋結果即時顯示
- 逾期標記明顯易識別


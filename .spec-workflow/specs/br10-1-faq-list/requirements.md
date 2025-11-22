# Requirements Document: BR10.1: FAQ 列表

## Introduction

FAQ 列表功能提供統一的 FAQ 查看、查詢、篩選界面。本功能幫助員工快速找到目標 FAQ，提升知識傳遞效率。

**User Story**: 作為會計師事務所的員工，我需要查看和管理 FAQ 列表，以便能夠快速找到目標 FAQ、了解常見問題的解答。

## Alignment with Product Vision

本功能支持知識管理系統的核心目標：
- **提升知識傳遞效率**：集中展示所有 FAQ，提供統一的查看界面
- **快速定位 FAQ**：提供靈活的篩選和搜尋功能，幫助員工快速找到目標 FAQ
- **提升工作效率**：支援多種篩選方式，滿足不同查詢需求

## Requirements

### BR10.1.1: FAQ 列表展示

**User Story**: 作為員工，我需要查看 FAQ 列表，以便了解所有常見問題的解答。

#### 驗收標準
- WHEN 員工打開 FAQ 列表頁面時 THEN 系統 SHALL 顯示所有已發佈的 FAQ（`is_deleted = 0`，所有登入使用者都可以查看）
- WHEN 員工查看 FAQ 列表時 THEN 系統 SHALL 顯示以下資訊：
  - FAQ ID（`faq_id`）
  - 問題（`question`）
  - 服務類型分類（`category`）
  - 適用層級（`scope`：服務層級/任務層級）
  - 標籤（`tags`）
  - 建立者名稱（`created_by_name`，通過 JOIN Users 表取得）
- WHEN 員工查看 FAQ 列表時 THEN 系統 SHALL 按最後更新時間降序排序（最新的在前）

### BR10.1.2: 關鍵詞搜尋

**User Story**: 作為員工，我需要搜尋 FAQ，以便快速找到目標 FAQ。

#### 驗收標準
- WHEN 員工使用關鍵詞搜尋時 THEN 系統 SHALL 在問題（`question`）和答案（`answer`）中搜尋
- WHEN 員工輸入關鍵詞時 THEN 系統 SHALL 支援部分匹配（使用 `LIKE %keyword%`）
- WHEN 員工搜尋時 THEN 系統 SHALL 即時顯示搜尋結果（或提供搜尋按鈕）
- WHEN 員工清空搜尋關鍵詞時 THEN 系統 SHALL 顯示所有 FAQ（移除搜尋條件）
- WHEN 搜尋關鍵詞為空字串時 THEN 系統 SHALL 視為無搜尋條件

### BR10.1.3: 服務類型分類篩選

**User Story**: 作為員工，我需要按服務類型分類篩選 FAQ，以便查看特定分類的 FAQ。

#### 驗收標準
- WHEN 員工使用服務類型分類篩選時 THEN 系統 SHALL 支援選擇特定服務類型（基於 `category`）
- WHEN 員工選擇「全部」時 THEN 系統 SHALL 顯示所有服務類型的 FAQ
- WHEN 員工選擇特定服務類型時 THEN 系統 SHALL 只顯示該服務類型的 FAQ（`category` 完全匹配）
- WHEN FAQ 的 category 欄位為 NULL 或空字串時 THEN 系統 SHALL 不匹配任何服務類型篩選條件

### BR10.1.4: 適用層級篩選

**User Story**: 作為員工，我需要按適用層級篩選 FAQ，以便查看特定層級的 FAQ。

#### 驗收標準
- WHEN 員工使用適用層級篩選時 THEN 系統 SHALL 支援篩選：服務層級（`service`）、任務層級（`task`）
- WHEN 員工選擇「全部」時 THEN 系統 SHALL 顯示所有層級的 FAQ
- WHEN 員工選擇特定層級時 THEN 系統 SHALL 只顯示該層級的 FAQ（`scope` 完全匹配）
- WHEN FAQ 的 scope 欄位為 NULL 或空字串時 THEN 系統 SHALL 不匹配任何適用層級篩選條件

### BR10.1.5: 客戶篩選

**User Story**: 作為員工，我需要按客戶篩選 FAQ，以便查看特定客戶的 FAQ。

#### 驗收標準
- WHEN 員工使用客戶篩選時 THEN 系統 SHALL 允許選擇特定客戶（基於 `client_id`）
- WHEN 員工選擇客戶時 THEN 系統 SHALL 只顯示該客戶的 FAQ（`client_id` 匹配）
- WHEN 員工選擇「全部客戶」時 THEN 系統 SHALL 顯示所有客戶的 FAQ（包含未指定客戶的 FAQ，即 `client_id IS NULL`）
- WHEN FAQ 的 client_id 為 NULL 時 THEN 系統 SHALL 視為未指定客戶的 FAQ

### BR10.1.6: 標籤篩選

**User Story**: 作為員工，我需要按標籤篩選 FAQ，以便查看特定標籤的 FAQ。

#### 驗收標準
- WHEN 員工使用標籤篩選時 THEN 系統 SHALL 支援多選標籤（基於 `tags`）
- WHEN 員工選擇標籤時 THEN 系統 SHALL 只顯示包含該標籤的 FAQ
- WHEN 員工選擇多個標籤時 THEN 系統 SHALL 顯示包含任一選中標籤的 FAQ（OR 邏輯）
- WHEN 員工取消所有標籤選擇時 THEN 系統 SHALL 顯示所有 FAQ（移除標籤篩選條件）
- WHEN FAQ 的 tags 欄位為 NULL 或空字串時 THEN 系統 SHALL 不匹配任何標籤篩選條件

### BR10.1.7: 排序

**User Story**: 作為員工，我需要查看排序後的 FAQ 列表，以便快速找到最新的 FAQ。

#### 驗收標準
- WHEN 員工查看 FAQ 列表時 THEN 系統 SHALL 按最後更新時間降序（最新的在前）排序
- WHEN 系統排序時 THEN 系統 SHALL 只需要預設排序（不需要多種排序方式）

### BR10.1.8: 分頁

**User Story**: 作為員工，我需要分頁查看 FAQ 列表，以便管理大量 FAQ。

#### 驗收標準
- WHEN 員工查看 FAQ 列表時 THEN 系統 SHALL 預設每頁顯示 20 筆，最多 100 筆
- WHEN 員工調整分頁設定時 THEN 系統 SHALL 允許選擇每頁顯示筆數（10、20、50、100 等）
- WHEN 員工切換頁面時 THEN 系統 SHALL 保持篩選條件
- WHEN 員工調整每頁顯示筆數時 THEN 系統 SHALL 重置到第一頁並保持篩選條件
- WHEN 分頁參數無效時（如 page < 1 或 per_page > 100）THEN 系統 SHALL 返回錯誤或使用預設值

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
- 支援分頁以處理大量 FAQ

### Security
- 所有登入使用者都可以查看 FAQ 列表
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 篩選和搜尋結果準確
- 分頁功能穩定
- API 錯誤處理完善，不會導致系統崩潰
- 資料庫查詢失敗時有適當的錯誤處理和回退機制

### Usability
- 界面簡潔直觀
- 篩選條件清晰
- 搜尋結果即時顯示（或提供搜尋按鈕）
- 提供載入狀態指示
- 空狀態和錯誤狀態有明確的提示訊息
- 支援鍵盤快捷鍵操作（可選）

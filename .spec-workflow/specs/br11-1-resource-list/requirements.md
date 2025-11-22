# Requirements Document: BR11.1: 資源列表

## Introduction

資源列表功能提供統一的資源查看、查詢、篩選界面。本功能幫助員工快速找到目標資源、查看資源信息，並通過多種篩選條件精確定位資源。

**User Story**: 作為會計師事務所的員工，我需要查看和管理資源列表，以便能夠快速找到目標資源、查看資源信息，並通過篩選條件精確定位資源。

## Alignment with Product Vision

本功能支持資源管理系統的核心目標：
- **提升資源管理效率**：集中展示所有資源，提供統一的查看和管理界面
- **快速定位資源**：提供靈活的篩選和搜尋功能，幫助員工快速找到目標資源
- **提升工作效率**：支援多種篩選方式，滿足不同查詢需求
- **優化用戶體驗**：雙欄布局設計，提升資源查看效率

## Requirements

### BR11.1.1: 資源列表展示

**User Story**: 作為員工，我需要查看資源列表，以便了解所有資源的狀況。

#### 驗收標準
- WHEN 員工打開資源列表頁面時 THEN 系統 SHALL 顯示所有未刪除的資源（所有人都可以查看，無權限限制）
- WHEN 員工查看資源列表時 THEN 系統 SHALL 顯示以下資訊：
  - 資源標題（`title`）
  - 服務類型（`category`）
  - 適用層級（`scope`：服務層級/任務層級）
  - 客戶名稱（`client_id`，如果有）
  - 上傳時間（`created_at`）
  - 文件大小（`file_size`）
  - 上傳者（`uploader_name`）
  - 標籤（`tags`）
  - 年份月份（`doc_year`、`doc_month`，如果有）
- WHEN 員工點擊列表中的資源時 THEN 系統 SHALL 在右側預覽區域顯示資源詳情
- WHEN 資源列表為空時 THEN 系統 SHALL 顯示空狀態提示

### BR11.1.2: 關鍵詞搜尋

**User Story**: 作為員工，我需要搜尋資源，以便快速找到目標資源。

#### 驗收標準
- WHEN 員工使用關鍵詞搜尋時 THEN 系統 SHALL 在標題（`title`）、描述（`description`）、檔案名稱（`file_name`）中搜尋
- WHEN 員工輸入關鍵詞時 THEN 系統 SHALL 支援部分匹配（使用 `LIKE %keyword%`）
- WHEN 員工搜尋時 THEN 系統 SHALL 即時顯示搜尋結果（防抖 300ms）
- WHEN 搜尋結果為空時 THEN 系統 SHALL 顯示無結果提示

### BR11.1.3: 服務類型篩選

**User Story**: 作為員工，我需要按服務類型篩選資源，以便查看特定服務類型的資源。

#### 驗收標準
- WHEN 員工使用服務類型篩選時 THEN 系統 SHALL 允許選擇特定服務類型（基於 `category`）
- WHEN 員工選擇服務類型時 THEN 系統 SHALL 只顯示該服務類型的資源
- WHEN 員工選擇「全部」時 THEN 系統 SHALL 顯示所有服務類型的資源

### BR11.1.4: 層級篩選

**User Story**: 作為員工，我需要按適用層級篩選資源，以便查看特定層級的資源。

#### 驗收標準
- WHEN 員工使用層級篩選時 THEN 系統 SHALL 支援篩選：服務層級（`service`）、任務層級（`task`）
- WHEN 員工選擇「全部」時 THEN 系統 SHALL 顯示所有層級的資源
- WHEN 員工選擇特定層級時 THEN 系統 SHALL 只顯示該層級的資源

### BR11.1.5: 客戶篩選

**User Story**: 作為員工，我需要按客戶篩選資源，以便查看特定客戶的資源。

#### 驗收標準
- WHEN 員工使用客戶篩選時 THEN 系統 SHALL 允許選擇特定客戶（基於 `client_id`）
- WHEN 員工選擇客戶時 THEN 系統 SHALL 只顯示該客戶的資源
- WHEN 員工選擇「全部客戶」時 THEN 系統 SHALL 顯示所有客戶的資源（包括無客戶的資源）

### BR11.1.6: 日期篩選

**User Story**: 作為員工，我需要按日期篩選資源，以便查看特定時間段的資源。

#### 驗收標準
- WHEN 員工使用日期篩選時 THEN 系統 SHALL 允許選擇年份和月份（基於 `doc_year`、`doc_month`）
- WHEN 員工選擇年月時 THEN 系統 SHALL 只顯示該年月的資源
- WHEN 員工清除日期篩選時 THEN 系統 SHALL 顯示所有日期的資源

### BR11.1.7: 標籤篩選

**User Story**: 作為員工，我需要按標籤篩選資源，以便查看特定標籤的資源。

#### 驗收標準
- WHEN 員工使用標籤篩選時 THEN 系統 SHALL 允許選擇多個標籤（基於 `tags`）
- WHEN 員工選擇多個標籤時 THEN 系統 SHALL 顯示包含任一標籤的資源（OR 邏輯）
- WHEN 員工清除標籤篩選時 THEN 系統 SHALL 顯示所有資源

### BR11.1.8: 排序

**User Story**: 作為員工，我需要查看排序後的資源列表，以便快速找到最新的資源。

#### 驗收標準
- WHEN 員工查看資源列表時 THEN 系統 SHALL 按上傳時間降序（最新的在前）排序
- WHEN 系統排序時 THEN 系統 SHALL 只需要預設排序（不需要多種排序方式）

### BR11.1.9: 分頁

**User Story**: 作為員工，我需要分頁查看資源列表，以便管理大量資源。

#### 驗收標準
- WHEN 員工查看資源列表時 THEN 系統 SHALL 預設每頁顯示 20 筆，最多 100 筆
- WHEN 員工調整分頁設定時 THEN 系統 SHALL 允許選擇每頁顯示筆數（10、20、50、100 等）
- WHEN 員工切換頁面時 THEN 系統 SHALL 保持篩選條件

### BR11.1.10: 列表收起/展開

**User Story**: 作為員工，我需要調整列表和預覽區域的大小，以便獲得更好的查看體驗。

#### 驗收標準
- WHEN 員工點擊收起按鈕時 THEN 系統 SHALL 隱藏左側列表，預覽區域佔滿整個寬度
- WHEN 員工點擊展開按鈕時 THEN 系統 SHALL 顯示左側列表，恢復雙欄布局
- WHEN 列表收起時 THEN 系統 SHALL 在左上角顯示展開按鈕

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
- 支援分頁以處理大量資源

### Security
- 所有人員都可以查看資源列表（無權限限制）
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 篩選和搜尋結果準確
- 分頁功能穩定
- 列表和預覽區域同步正確

### Usability
- 界面簡潔直觀
- 篩選條件清晰
- 搜尋結果即時顯示
- 雙欄布局響應式設計







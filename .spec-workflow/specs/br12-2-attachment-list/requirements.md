# Requirements Document: BR12.2: 附件列表與篩選

## Introduction

附件列表與篩選功能提供統一的附件查看和篩選界面。**本功能專為任務服務，所有附件必須關聯到特定任務。**本功能幫助員工快速找到目標附件、查看附件列表，並從任務詳情頁跳轉到知識庫附件頁面進行預覽。

**User Story**: 作為會計師事務所的員工，我需要查看和管理任務附件列表，以便能夠快速找到目標附件、查看附件信息，並從任務詳情頁跳轉到知識庫附件頁面進行預覽。

## Alignment with Product Vision

本功能支持附件管理系統的核心目標：
- **集中管理附件**：提供統一的附件查看和管理界面
- **快速定位附件**：提供靈活的篩選功能，幫助員工快速找到目標附件
- **提升工作效率**：支援多種篩選方式，滿足不同查詢需求

## Requirements

### BR12.2.1: 附件列表展示

**User Story**: 作為員工，我需要查看附件列表，以便了解所有附件的狀況。

#### 驗收標準
- WHEN 員工打開附件列表頁面時 THEN 系統 SHALL 顯示所有附件
- WHEN 員工查看附件列表時 THEN 系統 SHALL 顯示以下資訊：
  - 附件名稱（`filename`）
  - 實體類型（固定為「任務」）
  - 實體ID（`entity_id`，即任務 ID）
  - 文件大小（`size_bytes`，需格式化顯示，如 KB、MB）
  - 文件類型（`content_type`）
  - 上傳時間（`uploaded_at`，需格式化顯示）
  - 上傳者（`uploader_user_id` 對應的用戶名稱，需通過 JOIN 查詢獲取）
- WHEN 員工查看附件列表時 THEN 系統 SHALL 只顯示未刪除的附件（`is_deleted=0`）
- WHEN 員工查看附件列表時 THEN 系統 SHALL 按上傳時間降序排列（最新的在前）

### BR12.2.2: 任務篩選

**User Story**: 作為員工，我需要按任務篩選附件，以便查看特定任務的附件。

#### 驗收標準
- WHEN 員工從任務詳情頁點擊「查看知識庫」時 THEN 系統 SHALL 自動跳轉到知識庫附件頁面
- WHEN 員工從任務詳情頁跳轉到知識庫附件頁面時 THEN 系統 SHALL 自動篩選該任務的附件（`entity_type='task' AND entity_id=任務ID`）
- WHEN 員工在知識庫附件頁面查看任務附件時 THEN 系統 SHALL 顯示任務篩選橫幅，包含任務 ID 和「回到任務」按鈕
- WHEN 員工點擊「回到任務」按鈕時 THEN 系統 SHALL 跳轉回對應的任務詳情頁

### BR12.2.3: 任務 ID 篩選

**User Story**: 作為員工，我需要按特定任務篩選附件，以便查看特定任務的附件。

#### 驗收標準
- WHEN 員工從任務詳情頁跳轉到知識庫附件頁面時 THEN 系統 SHALL 通過 URL 參數 `taskId` 和 `returnTo` 傳遞任務信息
- WHEN 員工在知識庫附件頁面時 THEN 系統 SHALL 根據 `taskId` 參數自動篩選該任務的附件
- WHEN 員工點擊附件時 THEN 系統 SHALL 即時在右側預覽區域顯示附件內容
- WHEN 員工在知識庫附件頁面時 THEN 系統 SHALL 顯示「回到任務」按鈕，點擊後跳轉到 `returnTo` 指定的任務詳情頁

### BR12.2.4: 關鍵詞搜尋

**User Story**: 作為員工，我需要搜尋附件，以便快速找到目標附件。

#### 驗收標準
- WHEN 員工使用關鍵詞搜尋時 THEN 系統 SHALL 在附件名稱（`filename`）中搜尋
- WHEN 員工輸入關鍵詞時 THEN 系統 SHALL 支援部分匹配（使用 `LIKE %keyword%`）
- WHEN 員工搜尋時 THEN 系統 SHALL 即時顯示搜尋結果（或提供搜尋按鈕）

### BR12.2.5: 分頁

**User Story**: 作為員工，我需要分頁查看附件列表，以便管理大量附件。

#### 驗收標準
- WHEN 員工查看附件列表時 THEN 系統 SHALL 預設每頁顯示 20 筆，最多 100 筆
- WHEN 員工調整分頁設定時 THEN 系統 SHALL 允許選擇每頁顯示筆數（10、20、50、100 等）
- WHEN 員工切換頁面時 THEN 系統 SHALL 保持篩選條件

### BR12.2.6: 任務詳情頁附件列表

**User Story**: 作為員工，我需要在任務詳情頁查看該任務的附件列表，並能跳轉到知識庫附件頁面進行預覽。

#### 驗收標準
- WHEN 員工查看任務詳情頁時 THEN 系統 SHALL 顯示該任務的附件列表（查詢 `entity_type='task' AND entity_id=任務ID`）
- WHEN 員工在任務詳情頁查看附件時 THEN 系統 SHALL 支持預覽、下載操作
- WHEN 員工點擊「查看知識庫」按鈕時 THEN 系統 SHALL 跳轉到知識庫附件頁面（`/knowledge/attachments`）並自動篩選該任務的附件
- WHEN 員工點擊「查看知識庫」時 THEN 系統 SHALL 在 URL 中傳遞 `taskId` 和 `returnTo` 參數
- WHEN 員工從任務詳情頁跳轉到知識庫附件頁面時 THEN 系統 SHALL 自動切換到「附件」tab
- WHEN 員工在知識庫附件頁面點擊附件時 THEN 系統 SHALL 即時在右側預覽區域顯示附件內容
- WHEN 員工在知識庫附件頁面點擊「回到任務」時 THEN 系統 SHALL 跳轉回對應的任務詳情頁

### BR12.2.7: 知識庫附件頁面

**User Story**: 作為員工，我需要在知識庫附件頁面查看任務附件，並能從任務詳情頁跳轉過來進行預覽。

#### 驗收標準
- WHEN 員工從任務詳情頁跳轉到知識庫附件頁面時 THEN 系統 SHALL 自動篩選該任務的附件
- WHEN 員工在知識庫附件頁面時 THEN 系統 SHALL 顯示任務篩選橫幅（當有 `taskId` 參數時）
- WHEN 員工在知識庫附件頁面時 THEN 系統 SHALL 使用左側列表、右側預覽的布局
- WHEN 員工在知識庫附件頁面點擊附件時 THEN 系統 SHALL 即時在右側預覽區域顯示附件內容
- WHEN 員工在知識庫附件頁面時 THEN 系統 SHALL 支持預覽、下載、刪除操作
- WHEN 員工在知識庫附件頁面時 THEN 系統 SHALL 不提供獨立上傳功能，必須從任務詳情頁上傳
- WHEN 員工在知識庫附件頁面時 THEN 系統 SHALL 顯示「回到任務」按鈕（當有 `taskId` 參數時），點擊後跳轉回任務詳情頁

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
- 支援分頁以處理大量附件

### Security
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 篩選和搜尋結果準確
- 分頁功能穩定

### Usability
- 界面簡潔直觀
- 篩選條件清晰
- 搜尋結果即時顯示



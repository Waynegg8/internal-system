# Requirements Document: BR12.1: 附件上傳

## Introduction

附件上傳功能提供統一的附件上傳能力，支持拖放/選檔上傳、多檔並行上傳、文件驗證和進度顯示。**本功能專為任務服務，所有附件必須關聯到特定任務。**

**User Story**: 作為會計師事務所的員工，我需要上傳附件到任務，以便保存任務相關文件。

## Alignment with Product Vision

本功能支持附件管理系統的核心目標：
- **統一上傳體驗**：為全系統提供一致的附件上傳界面和流程
- **提升上傳效率**：支持多檔並行上傳，減少等待時間
- **確保文件安全**：通過文件大小和類型驗證，確保系統安全
- **提升用戶體驗**：提供清晰的上傳進度反饋

## Requirements

### BR12.1.1: 文件選擇與上傳

**User Story**: 作為員工，我需要選擇文件並上傳，以便保存附件。

#### 驗收標準
- WHEN 員工上傳附件時 THEN 系統 SHALL 支持拖放上傳（將文件拖拽到上傳區域）
- WHEN 員工上傳附件時 THEN 系統 SHALL 支持點擊選擇文件上傳
- WHEN 員工選擇文件時 THEN 系統 SHALL 支持一次選擇多個文件
- WHEN 員工上傳多個文件時 THEN 系統 SHALL 支持並行上傳（同時上傳多個文件）
- WHEN 員工上傳多個文件時 THEN 系統 SHALL 限制同時上傳的文件數量不超過 5 個
- WHEN 員工上傳文件時 THEN 系統 SHALL 顯示每個文件的獨立上傳進度條
- WHEN 員工上傳文件時 THEN 系統 SHALL 顯示上傳進度百分比
- WHEN 員工上傳文件時 THEN 系統 SHALL 支持取消正在上傳的文件

### BR12.1.2: 文件大小驗證

**User Story**: 作為員工，我需要知道文件大小限制，以便上傳符合要求的文件。

#### 驗收標準
- WHEN 員工選擇文件時 THEN 系統 SHALL 驗證文件大小不超過 25MB
- WHEN 員工選擇超過 25MB 的文件時 THEN 系統 SHALL 提示錯誤並阻止上傳
- WHEN 系統驗證文件大小時 THEN 系統 SHALL 前後端一致（前端驗證和後端驗證都為 25MB）

### BR12.1.3: 文件類型驗證

**User Story**: 作為員工，我需要知道支持的文件類型，以便上傳正確格式的文件。

#### 驗收標準
- WHEN 員工選擇文件時 THEN 系統 SHALL 驗證文件類型為以下之一：PDF、Word、Excel、PowerPoint、圖片
- WHEN 員工選擇不支持的文件類型時 THEN 系統 SHALL 提示錯誤並阻止上傳
- WHEN 系統驗證文件類型時 THEN 系統 SHALL 支持以下格式：
  - PDF: `.pdf`
  - Word: `.doc`, `.docx`
  - Excel: `.xls`, `.xlsx`
  - PowerPoint: `.ppt`, `.pptx`
  - 圖片: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`

### BR12.1.4: 附件關聯

**User Story**: 作為員工，我需要將附件關聯到對應的任務，以便正確分類和管理附件。

#### 驗收標準
- WHEN 員工上傳附件時 THEN 系統 SHALL 要求指定 `entity_type='task'`（固定為任務）
- WHEN 員工上傳附件時 THEN 系統 SHALL 要求指定 `entity_id`（任務 ID）
- WHEN 員工上傳附件時 THEN 系統 SHALL 驗證 `entity_type` 必須為 `'task'`
- WHEN 員工上傳附件時 THEN 系統 SHALL 驗證 `entity_id` 必須為有效的任務 ID
- WHEN 員工在任務詳情頁上傳附件時 THEN 系統 SHALL 自動設置 `entity_type='task'` 和 `entity_id=任務ID`
- WHEN 員工在知識庫附件頁面時 THEN 系統 SHALL 不提供獨立上傳功能，必須從任務詳情頁上傳

### BR12.1.5: 上傳流程

**User Story**: 作為員工，我需要了解上傳流程，以便正確上傳附件。

#### 驗收標準
- WHEN 員工上傳附件時 THEN 系統 SHALL 使用兩步上傳流程：
  1. 第一步：調用 `POST /api/v2/attachments/upload-sign` 獲取上傳簽名
  2. 第二步：使用簽名 URL 調用 `PUT /api/v2/attachments/upload-direct` 上傳文件
- WHEN 員工上傳附件時 THEN 系統 SHALL 驗證上傳簽名的有效性（簽名未過期且格式正確）
- WHEN 員工上傳附件時 THEN 系統 SHALL 在簽名過期時拒絕上傳並提示錯誤
- WHEN 員工上傳附件成功時 THEN 系統 SHALL 在 `Attachments` 表中創建記錄
- WHEN 員工上傳附件成功時 THEN 系統 SHALL 將文件存儲到 Cloudflare R2
- WHEN 員工上傳附件成功時 THEN 系統 SHALL 記錄上傳者、上傳時間、文件信息到審計日誌

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- 文件上傳響應時間 < 5 秒（25MB 文件）
- 上傳進度更新頻率：每 100ms 更新一次
- 支持同時上傳最多 5 個文件

### Security
- 使用參數化查詢防止 SQL 注入
- 前端和後端都進行文件大小和類型驗證
- 上傳簽名有效期為 5 分鐘

### Reliability
- 上傳失敗時提供明確的錯誤提示
- 支持上傳重試機制
- 部分文件上傳失敗時，已成功的文件保留

### Usability
- 上傳界面簡潔直觀
- 上傳進度清晰可見
- 錯誤提示明確易懂
- 支持取消上傳操作



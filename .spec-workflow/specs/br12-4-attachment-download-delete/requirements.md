# Requirements Document: BR12.4: 附件下載與刪除

## Introduction

附件下載與刪除功能提供統一的附件下載和刪除能力。本功能幫助員工下載附件到本地，或刪除不需要的附件。

**User Story**: 作為會計師事務所的員工，我需要下載附件到本地，或刪除不需要的附件。

## Alignment with Product Vision

本功能支持附件管理系統的核心目標：
- **提供下載能力**：支持將附件下載到本地
- **提供刪除能力**：支持刪除不需要的附件
- **確保數據安全**：刪除時同時刪除數據庫記錄和 R2 文件

## Requirements

### BR12.4.1: 附件下載

**User Story**: 作為員工，我需要下載附件到本地，以便在本地查看或使用附件。

#### 驗收標準
- WHEN 員工下載附件時 THEN 系統 SHALL 調用 `GET /api/v2/attachments/:id/download` API
- WHEN 員工下載附件時 THEN 系統 SHALL 檢查附件是否存在
- IF 附件不存在 THEN 系統 SHALL 返回 404 錯誤
- IF 附件已刪除（`is_deleted = 1`）THEN 系統 SHALL 返回錯誤提示
- WHEN 員工下載附件時 THEN 系統 SHALL 從 R2 獲取文件並返回給用戶
- WHEN 員工下載附件時 THEN 系統 SHALL 保持原始文件名
- WHEN 員工下載附件成功時 THEN 系統 SHALL 記錄下載操作日誌（可選，使用 console.log 記錄下載者、下載時間、附件 ID，用於調試和監控）
- WHEN 員工下載附件失敗時 THEN 系統 SHALL 提示明確的錯誤信息

### BR12.4.2: 附件刪除

**User Story**: 作為員工，我需要刪除不需要的附件，以便清理附件列表。

#### 驗收標準
- WHEN 員工刪除附件時 THEN 系統 SHALL 調用 `DELETE /api/v2/attachments/:id` API
- WHEN 員工刪除附件時 THEN 系統 SHALL 檢查附件是否存在
- IF 附件不存在 THEN 系統 SHALL 返回 404 錯誤
- IF 附件已刪除（`is_deleted = 1`）THEN 系統 SHALL 返回錯誤提示
- WHEN 員工刪除附件時 THEN 系統 SHALL 先物理刪除 R2 中的文件，再物理刪除數據庫記錄（使用 `DELETE FROM Attachments` 而非 `UPDATE is_deleted`）
- IF R2 文件刪除失敗 THEN 系統 SHALL 記錄錯誤（使用 `console.warn`）但仍繼續刪除數據庫記錄
- WHEN 員工刪除附件成功時 THEN 系統 SHALL 記錄刪除操作日誌（可選，使用 console.log 記錄刪除者、刪除時間、附件 ID，用於調試和監控）
- WHEN 員工刪除附件失敗時 THEN 系統 SHALL 提示明確的錯誤信息
- WHEN 員工刪除附件時 THEN 系統 SHALL 要求確認（防止誤刪）

### BR12.4.3: 刪除確認

**User Story**: 作為員工，我需要確認刪除操作，以便防止誤刪附件。

#### 驗收標準
- WHEN 員工點擊刪除按鈕時 THEN 系統 SHALL 顯示確認對話框
- WHEN 員工確認刪除時 THEN 系統 SHALL 執行刪除操作
- WHEN 員工取消刪除時 THEN 系統 SHALL 不執行刪除操作

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- 下載響應時間 < 5 秒（25MB 文件）
- 刪除響應時間 < 2 秒

### Security
- 下載時檢查附件是否存在
- 下載時檢查附件是否已刪除（`is_deleted = 0`）
- 下載時檢查用戶是否已登入（通過認證中間件）
- 刪除時檢查附件是否存在
- 刪除時檢查附件是否已刪除（`is_deleted = 0`）
- 刪除時檢查用戶是否已登入（通過認證中間件）
- 所有數據庫操作使用參數化查詢防止 SQL 注入
- 所有 API 路由必須通過認證中間件保護

### Reliability
- 下載失敗時提供明確的錯誤提示
- 刪除失敗時提供明確的錯誤提示
- 支持下載重試機制

### Usability
- 下載操作簡單直觀
- 刪除操作需要確認，防止誤刪
- 錯誤提示明確易懂



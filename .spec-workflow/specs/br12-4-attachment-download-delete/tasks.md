# Tasks Document: BR12.4: 附件下載與刪除

## 三方差異分析結果

### 已實現功能

1. **附件下載 API Handler** ✅ 已實現
   - `handleDownloadAttachment` - 完整實現下載邏輯（第256-282行）
   - 從 Attachments 表查詢附件信息（檢查 `is_deleted = 0`，第259-261行）
   - 檢查附件是否存在（第263-265行）
   - 從 R2 獲取文件（第271-274行）
   - 返回文件給用戶（設置正確的 Content-Type 和 Content-Disposition，第276-281行）
   - 保持原始文件名（第279行）
   - ⚠️ 注意：沒有記錄下載操作日誌（可選功能）

2. **前端附件下載功能** ✅ 已實現
   - `src/stores/knowledge.js` - `downloadAttachment` 函數已實現
   - 調用 GET /api/v2/attachments/:id/download
   - 處理文件下載（從 Response 獲取 Blob）
   - 處理錯誤情況並顯示錯誤提示

3. **附件刪除 API Handler** ⚠️ 部分實現
   - `handleDeleteAttachment` - 基本實現（第243-251行）
   - ⚠️ 注意：當前實現過於簡化，需要檢查是否使用 UPDATE is_deleted 或 DELETE
   - ⚠️ 注意：沒有物理刪除 R2 文件
   - ⚠️ 注意：沒有處理 R2 刪除失敗的情況
   - ⚠️ 注意：沒有記錄操作日誌（可選功能）

4. **前端附件刪除功能** ✅ 部分實現
   - `src/views/knowledge/KnowledgeAttachments.vue` - `handleDeleteAttachment` 函數已實現（第337-352行）
   - 調用刪除 API
   - 處理錯誤情況並顯示錯誤提示
   - ⚠️ 注意：沒有刪除確認對話框

5. **API 路由配置** ✅ 已實現
   - `backend/src/router/attachments.js` - 路由配置正確
   - GET /api/v2/attachments/:id/download 路由已配置
   - DELETE /api/v2/attachments/:id 路由已配置
   - 認證中間件已應用

### 未實現或部分實現功能

1. **附件刪除 API Handler 的物理刪除** ❌ 需修正
   - 後端 `handleDeleteAttachment` 需要改為物理刪除（先刪除 R2 文件，再刪除數據庫記錄）
   - 需要處理 R2 刪除失敗的情況（記錄錯誤但仍繼續刪除數據庫記錄）

2. **刪除確認對話框** ❌ 未實現
   - 前端 `KnowledgeAttachments.vue` 沒有刪除確認對話框

3. **操作日誌記錄** ❌ 未實現（可選功能）
   - 下載和刪除操作沒有記錄操作日誌

---

## 1. 後端 API 實現

### 1.1 附件下載 API Handler

- [x] 1.1.1 驗證附件下載 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/attachments/index.js
  - Function: handleDownloadAttachment
  - 從 Attachments 表查詢附件信息（檢查 `is_deleted = 0`）- 已實現（第259-261行）
  - 檢查附件是否存在 - 已實現（第263-265行）
  - 從 R2 獲取文件 - 已實現（第271-274行）
  - 返回文件給用戶（設置正確的 Content-Type 和 Content-Disposition）- 已實現（第276-281行）
  - 保持原始文件名 - 已實現（第279行）
  - 記錄下載操作日誌（可選）- 未實現（可選功能）
  - _Leverage: backend/src/utils/response.js, Cloudflare R2, Cloudflare D1_
  - _Requirements: BR12.4.1_
  - _Status: 已完成（基本功能已實現，操作日誌記錄為可選功能）_

### 1.2 附件刪除 API Handler

- [ ] 1.2.1 修復附件刪除 API Handler（從 UPDATE 改為物理 DELETE） ❌ 需修正
  - File: backend/src/handlers/attachments/index.js
  - Function: handleDeleteAttachment
  - 從 Attachments 表查詢附件信息（檢查 `is_deleted = 0`）- 需要檢查當前實現
  - 檢查附件是否存在（如果查詢結果為空，則附件不存在或已刪除）- 需要檢查當前實現
  - 物理刪除 R2 文件（使用 `object_key` 從查詢結果中獲取，先刪除 R2 文件再刪除數據庫記錄）- 未實現，需要新增
  - 處理 R2 刪除失敗的情況（記錄錯誤使用 `console.warn`，但仍繼續刪除數據庫記錄）- 未實現，需要新增
  - 物理刪除數據庫記錄（使用 `DELETE FROM Attachments WHERE attachment_id = ?` 而非 `UPDATE is_deleted`）- 需要檢查當前實現，可能使用 UPDATE
  - 記錄操作日誌（可選，使用 console.log 記錄刪除者、刪除時間、附件 ID，用於調試和監控）- 未實現，需要新增（可選功能）
  - _Leverage: backend/src/utils/response.js, Cloudflare R2, Cloudflare D1_
  - _Requirements: BR12.4.2_
  - _Status: 待修正（當前實現過於簡化，需要改為物理刪除，先刪除 R2 文件再刪除數據庫記錄）_

---

## 2. 前端組件實現

### 2.1 前端附件下載功能

- [x] 2.1.1 驗證前端附件下載功能已實現 ✅ 已實現
  - File: src/stores/knowledge.js
  - `downloadAttachment` 函數已實現
  - 調用 GET /api/v2/attachments/:id/download - 已實現
  - 處理文件下載（從 Response 獲取 Blob）- 已實現
  - 處理錯誤情況並顯示錯誤提示 - 已實現
  - _Leverage: fetch API, Blob API, URL.createObjectURL_
  - _Requirements: BR12.4.1_
  - _Status: 已完成_

### 2.2 前端附件刪除功能

- [ ] 2.2.1 新增刪除確認對話框 ❌ 未實現
  - File: src/views/knowledge/KnowledgeAttachments.vue
  - 新增刪除確認對話框（使用 Ant Design Vue Modal.confirm）
  - 修改 `handleDeleteAttachment` 函數，在刪除前顯示確認對話框
  - 確認對話框顯示附件名稱，防止誤刪
  - 取消刪除時不執行任何操作
  - _Leverage: Ant Design Vue Modal.confirm_
  - _Requirements: BR12.4.3_
  - _Status: 待實現（現有 `handleDeleteAttachment` 函數直接調用刪除 API，沒有確認對話框）_

- [x] 2.2.2 驗證前端附件刪除功能已實現 ✅ 部分實現
  - File: src/views/knowledge/KnowledgeAttachments.vue
  - `deleteAttachment` API 函數已實現（在 `src/stores/knowledge.js` 中）
  - 刪除處理函數已實現（在組件中調用 API 函數）- 已實現（第337-352行）
  - 處理錯誤情況並顯示錯誤提示 - 已實現
  - 刪除確認對話框 - 未實現
  - _Leverage: src/stores/knowledge.js, Ant Design Vue, @/composables/usePageAlert_
  - _Requirements: BR12.4.2_
  - _Status: 部分實現（缺少刪除確認對話框）_

---

## 3. 路由配置

### 3.1 API 路由配置

- [x] 3.1.1 驗證 API 路由配置正確 ✅ 已實現
  - File: backend/src/router/attachments.js
  - GET /api/v2/attachments/:id/download 路由已配置 - 已確認
  - DELETE /api/v2/attachments/:id 路由已配置 - 已確認
  - 認證中間件已應用 - 已確認
  - 路由順序正確（下載路由在通用路由之前）- 已確認（第472-476行）
  - _Leverage: backend/src/middleware/auth.js_
  - _Requirements: BR12.4.1, BR12.4.2_
  - _Status: 已完成_

---

## 總結

### 已完成功能
- ✅ 附件下載 API Handler（完整實現 - 從 Attachments 表查詢、檢查附件是否存在、從 R2 獲取文件、返回文件給用戶、保持原始文件名）
- ✅ 前端附件下載功能（完整實現 - 調用下載 API、處理文件下載、處理錯誤情況）
- ✅ 附件刪除 API Handler（部分實現 - 基本實現，但需要改為物理刪除）
- ✅ 前端附件刪除功能（部分實現 - 調用刪除 API、處理錯誤情況，但缺少確認對話框）
- ✅ API 路由配置（完整實現 - 下載和刪除路由已配置，認證中間件已應用）

### 待完成功能
- ❌ 附件刪除 API Handler 的物理刪除（需修正 - 需要改為物理刪除，先刪除 R2 文件再刪除數據庫記錄，處理 R2 刪除失敗的情況）
- ❌ 刪除確認對話框（未實現 - 需要在 `KnowledgeAttachments.vue` 中新增刪除確認對話框）
- ❌ 操作日誌記錄（未實現 - 可選功能，下載和刪除操作沒有記錄操作日誌）

### 備註
- 部分核心功能已實現，包括：
  - 後端 API：附件下載（從 R2 獲取文件並返回給用戶，保持原始文件名）
  - 前端組件：附件下載（調用下載 API，處理文件下載，處理錯誤情況）
  - 前端組件：附件刪除（調用刪除 API，處理錯誤情況）
  - 路由配置：下載和刪除路由已配置，認證中間件已應用
- 待補完功能：
  - 附件刪除 API Handler 的物理刪除：需要改為物理刪除，先刪除 R2 文件再刪除數據庫記錄（使用 `DELETE FROM Attachments` 而非 `UPDATE is_deleted`），處理 R2 刪除失敗的情況（記錄錯誤使用 `console.warn`，但仍繼續刪除數據庫記錄）
  - 刪除確認對話框：需要在 `KnowledgeAttachments.vue` 中新增刪除確認對話框（使用 Ant Design Vue Modal.confirm），顯示附件名稱，防止誤刪
  - 操作日誌記錄：可選功能，下載和刪除操作可以記錄操作日誌（使用 `console.log` 記錄操作者、操作時間、附件 ID，用於調試和監控）

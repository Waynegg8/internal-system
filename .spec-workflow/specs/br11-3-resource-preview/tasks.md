# Tasks Document: BR11.3: 資源預覽

## 三方差異分析結果

### 已實現功能

1. **文件類型判斷** ✅ 已實現
   - `DocumentPreview.vue` - `fileType` computed 屬性判斷 PDF、圖片和其他格式（第65-82行）
   - 支援 PDF 文件類型判斷（第71-73行）
   - 支援圖片文件類型判斷（第75-79行）
   - ⚠️ 注意：沒有 Office 文件類型判斷（Word、Excel、PowerPoint）

2. **PDF 預覽** ✅ 已實現
   - `DocumentPreview.vue` - 使用 PdfViewer 組件（第5-7行）
   - 載入狀態顯示（第3行）
   - 錯誤處理和重試機制（第31-36行，第185-187行）
   - 文件載入邏輯（第144-146行）

3. **圖片預覽** ✅ 已實現
   - `DocumentPreview.vue` - 直接顯示圖片（第10-16行）
   - 載入狀態顯示（第3行）
   - 錯誤處理和重試機制（第31-36行，第185-187行）
   - 文件載入邏輯（第147-149行）

4. **其他格式處理** ✅ 已實現
   - `DocumentPreview.vue` - 顯示文件信息和下載按鈕（第19-28行）
   - 文件信息顯示（文件名、大小，第23-24行）
   - 下載功能（第25-27行，第158-183行）

5. **錯誤處理和重試機制** ✅ 已實現
   - `DocumentPreview.vue` - `handleRetry` 方法（第185-187行）
   - 錯誤提示（第31-36行）
   - 載入狀態管理（第59行，第121行，第154行）

### 未實現或部分實現功能

1. **Office 文件預覽** ❌ 未實現
   - `DocumentPreview.vue` 中沒有 Office 文件類型判斷
   - 沒有預覽 URL 生成 API 調用
   - 沒有 Google Docs Viewer iframe 嵌入

2. **預覽 URL 生成 API** ❌ 未實現
   - 後端沒有 `handleGetPreviewUrl` 函數
   - 前端沒有 `getPreviewUrl` API 調用函數
   - 路由沒有配置預覽 URL 生成 API

3. **E2E 測試** ❌ 未實現
   - `tests/e2e/knowledge/resource-preview.spec.ts` - 未找到

---

## 1. 後端 API 實現

### 1.1 預覽 URL 生成 API Handler

- [x] 1.1.1 實現預覽 URL 生成 API Handler ✅ 已實現
  - File: backend/src/handlers/knowledge/documents.js
  - 新增 `handleGetPreviewUrl` 函數（第622-698行）
  - 新增 `handlePreviewDocument` 函數（第705-807行）- 預覽代理端點
  - 生成簽名 URL（過期時間 1 小時，3600秒）
  - 使用 HMAC-SHA256 簽名驗證（參考 attachments handler 的簽名邏輯）
  - 驗證用戶權限（登入用戶才能生成預覽 URL）
  - 驗證文件存在於 R2
  - 預覽端點驗證簽名、過期時間、文檔 ID 和 file_url 匹配
  - API 路由: `GET /api/v2/documents/:id/preview-url`（需要認證）
  - API 路由: `GET /api/v2/documents/:id/preview?token=...`（不需要認證，簽名驗證）
  - 預覽端點設置 CORS 頭允許 Google Docs Viewer 訪問
  - _Leverage: backend/src/handlers/attachments/index.js (參考現有簽名生成邏輯)_
  - _Requirements: BR11.3.3_
  - _Status: 已完成_

### 1.2 配置預覽 URL 路由

- [x] 1.2.1 配置預覽 URL 路由 ✅ 已實現
  - File: backend/src/router/knowledge.js
  - 添加預覽 URL 路由配置（第49-53行：`/api/v2/documents/:id/preview-url`，使用 `withAuth(handleKnowledge)` 需要認證）
  - 添加預覽代理路由配置（第54-58行：`/api/v2/documents/:id/preview`，使用 `handleKnowledge` 直接處理，不需要認證）
  - 在 `backend/src/handlers/knowledge/index.js` 中添加路由處理（第83-89行）
  - 導入 `handleGetPreviewUrl` 和 `handlePreviewDocument` handlers（第9行）
  - 綁定 handlers 到對應的路由匹配邏輯
  - 路由順序正確：preview-url 在 preview 之前，避免路由衝突
  - 驗證：preview-url 端點需要認證（返回 UNAUTHORIZED），preview 端點不需要認證（簽名驗證）
  - _Leverage: backend/src/router/knowledge.js (現有路由配置)_
  - _Requirements: BR11.3.3_
  - _Status: 已完成_

---

## 2. 前端組件實現

### 2.1 前端 API 調用函數

- [x] 2.1.1 添加前端 API 調用函數 ✅ 已實現
  - File: src/api/knowledge.js
  - 新增 `getPreviewUrl` 函數（第216-234行）
  - 調用預覽 URL 生成 API：`GET /documents/${id}/preview-url`
  - 處理錯誤響應：檢查 error.response、error.request 和 error.message
  - 返回 API 響應，包含 previewUrl, expiresAt, expiresIn
  - 添加到 `useKnowledgeApi` composable（第432行）
  - 在 `src/stores/knowledge.js` 中導入函數（第2行）
  - 錯誤處理包括：響應錯誤、網路錯誤、配置錯誤
  - _Leverage: src/api/knowledge.js (現有 API 調用函數，參考 uploadDocument 的錯誤處理模式)_
  - _Requirements: BR11.3.3_
  - _Status: 已完成_

### 2.2 文件類型判斷

- [x] 2.2.1 驗證文件類型判斷已實現 ✅ 已實現
  - File: src/components/knowledge/DocumentPreview.vue
  - 驗證 `fileType` computed 屬性已實現（第65-82行）
  - 驗證支援 PDF 文件類型判斷（第71-73行）
  - 驗證支援圖片文件類型判斷（第75-79行）
  - ⚠️ 注意：沒有 Office 文件類型判斷（Word、Excel、PowerPoint）
  - _Requirements: BR11.3.1, BR11.3.2, BR11.3.3, BR11.3.4_
  - _Status: 已完成（需擴展支援 Office 文件類型判斷）_

### 2.3 PDF 預覽

- [x] 2.3.1 驗證 PDF 預覽已實現 ✅ 已實現
  - File: src/components/knowledge/DocumentPreview.vue
  - 驗證使用 PdfViewer 組件（第5-7行）
  - 驗證載入狀態顯示（第3行）
  - 驗證錯誤處理和重試機制（第31-36行，第185-187行）
  - 驗證文件載入邏輯（第144-146行）
  - _Requirements: BR11.3.1_
  - _Status: 已完成_

### 2.4 圖片預覽

- [x] 2.4.1 驗證圖片預覽已實現 ✅ 已實現
  - File: src/components/knowledge/DocumentPreview.vue
  - 驗證直接顯示圖片（第10-16行）
  - 驗證載入狀態顯示（第3行）
  - 驗證錯誤處理和重試機制（第31-36行，第185-187行）
  - 驗證文件載入邏輯（第147-149行）
  - _Requirements: BR11.3.2_
  - _Status: 已完成_

### 2.5 Office 文件預覽

- [x] 2.5.1 增強 DocumentPreview 組件 - Office 文件預覽 ✅ 已實現
  - File: src/components/knowledge/DocumentPreview.vue
  - 新增 Office 文件類型判斷（Word、Excel、PowerPoint）- 在 `fileType` computed 中添加 office 類型判斷（支援 .doc, .docx, .xls, .xlsx, .ppt, .pptx 擴展名和對應的 MIME 類型）
  - 調用預覽 URL 生成 API - 新增 `loadPreviewUrl` 函數調用 `getPreviewUrl` API
  - 使用 iframe 嵌入 Google Docs Viewer - 新增 `googleDocsViewerUrl` computed 屬性，使用 `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`
  - 處理預覽 URL 獲取失敗 - 在 `loadPreviewUrl` 中處理錯誤，顯示錯誤提示並提供下載按鈕
  - 顯示載入狀態 - 新增 `loadingPreviewUrl` ref，在 `a-spin` 中使用 `loading || loadingPreviewUrl`
  - Office 文件預覽失敗時顯示文件信息和下載按鈕
  - 錯誤狀態提供重試和下載按鈕
  - _Leverage: Google Docs Viewer API, src/api/knowledge.js (getPreviewUrl)_
  - _Requirements: BR11.3.3_
  - _Status: 已完成_

### 2.6 其他格式處理

- [x] 2.6.1 驗證其他格式處理已實現 ✅ 已實現
  - File: src/components/knowledge/DocumentPreview.vue
  - 驗證顯示文件信息和下載按鈕（第19-28行）
  - 驗證文件信息顯示（文件名、大小，第23-24行）
  - 驗證下載功能（第25-27行，第158-183行）
  - _Requirements: BR11.3.4_
  - _Status: 已完成_

### 2.7 錯誤處理和重試機制

- [x] 2.7.1 驗證錯誤處理和重試機制已實現 ✅ 已實現
  - File: src/components/knowledge/DocumentPreview.vue
  - 驗證 `handleRetry` 方法（第185-187行）
  - 驗證錯誤提示（第31-36行）
  - 驗證載入狀態管理（第59行，第121行，第154行）
  - _Requirements: BR11.3.1, BR11.3.2, BR11.3.3_
  - _Status: 已完成_

---

## 3. 測試

### 3.1 E2E 測試

- [x] 3.1.1 實現 E2E 測試 ✅ 已實現
  - File: tests/e2e/knowledge/resource-preview.spec.ts
  - 測試 PDF 文件預覽（應該能預覽 PDF 文件、PDF 載入中應該顯示載入狀態）
  - 測試圖片文件預覽（應該能預覽圖片文件）
  - 測試 Office 文件預覽（應該能預覽 Office 文件、預覽 URL 生成中應該顯示載入狀態、Office 文件載入失敗時應該顯示錯誤提示和下載按鈕）
  - 測試不支持預覽的文件格式處理（應該顯示文件信息和下載按鈕）
  - 測試預覽失敗時的錯誤處理和重試（預覽失敗時應該顯示錯誤提示和重試按鈕、應該能處理空文檔狀態）
  - 共 9 個測試用例，全部通過
  - 使用臨時文件創建測試數據（PDF、PNG、Office 文件）
  - 測試覆蓋所有 BR11.3 需求（BR11.3.1, BR11.3.2, BR11.3.3, BR11.3.4）
  - _Requirements: All BR11.3 requirements_
  - _Status: 已完成_

---

## 總結

### 已完成功能
- ✅ 文件類型判斷（完整實現 - PDF、圖片、Office 和其他格式判斷）
- ✅ PDF 預覽（完整實現 - 使用 PdfViewer 組件、載入狀態、錯誤處理和重試機制）
- ✅ 圖片預覽（完整實現 - 直接顯示圖片、載入狀態、錯誤處理和重試機制）
- ✅ Office 文件預覽（完整實現 - Office 文件類型判斷、預覽 URL 生成 API 調用、Google Docs Viewer iframe 嵌入、載入狀態、錯誤處理）
- ✅ 其他格式處理（完整實現 - 顯示文件信息和下載按鈕）
- ✅ 錯誤處理和重試機制（完整實現 - handleRetry 方法、錯誤提示、載入狀態管理）
- ✅ 預覽 URL 生成 API（完整實現 - 後端 handleGetPreviewUrl 和 handlePreviewDocument、路由配置、前端 getPreviewUrl）
- ✅ E2E 測試（完整實現 - 9 個測試用例，覆蓋所有 BR11.3 需求）

### 待完成功能
- 無（所有功能已完成）

### 備註
- 所有核心功能已基本實現，包括：
  - 前端組件：文件類型判斷（PDF、圖片）、PDF 預覽、圖片預覽、其他格式處理、錯誤處理和重試機制
  - 文件載入：通過 downloadDocument API 獲取文件內容
- 所有功能已完成：
  - ✅ Office 文件預覽：已實現 Office 文件類型判斷（Word、Excel、PowerPoint）、預覽 URL 生成 API 調用、Google Docs Viewer iframe 嵌入
  - ✅ 預覽 URL 生成 API：已實現 handleGetPreviewUrl 函數（生成簽名 URL，過期時間 1 小時）、handlePreviewDocument 預覽代理端點、路由配置完成、前端實現 getPreviewUrl API 調用函數
  - ✅ E2E 測試：已建立完整的測試套件，包含 9 個測試用例，覆蓋所有 BR11.3 需求（BR11.3.1, BR11.3.2, BR11.3.3, BR11.3.4）

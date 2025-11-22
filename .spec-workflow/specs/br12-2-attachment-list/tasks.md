# Tasks Document: BR12.2: 附件列表與篩選

## 三方差異分析結果

### 已實現功能

1. **附件列表 API Handler** ✅ 部分實現
   - `handleGetAttachments` - 基本功能已實現（第33-207行）
   - 支持篩選（entity_type, entity_id, q, file_type, dateFrom, dateTo）
   - 支持分頁（page, perPage）
   - 支持排序（按 uploaded_at DESC）
   - JOIN 查詢獲取上傳者名稱（第99-110行，第183-194行）
   - ⚠️ 注意：沒有 JOIN 查詢獲取關聯實體名稱（entity_name）
   - ⚠️ 注意：返回的數據結構不包含 entity_name 欄位

2. **前端附件列表 API 調用函數** ✅ 部分實現
   - `src/api/knowledge.js` - `fetchAttachments` 函數已實現（第226行）
   - ⚠️ 注意：使用的是 `fetchDocuments` API，不是 `/api/v2/attachments`
   - ⚠️ 注意：需要創建專門的附件 API 調用函數

3. **知識庫附件頁面** ✅ 部分實現
   - `KnowledgeAttachments.vue` - 基本頁面已實現
   - 左側列表、右側預覽布局（第46-132行）
   - 分頁功能（第112-126行）
   - 篩選功能（使用 KnowledgeLayout）
   - 任務篩選（從 URL 參數 taskId 自動篩選，第403-441行）
   - ⚠️ 注意：沒有獨立的 `AttachmentFilters` 和 `AttachmentList` 組件
   - ⚠️ 注意：使用 `KnowledgeLayout` 進行篩選，不是專門的附件篩選組件

4. **附件預覽組件** ✅ 已實現
   - `src/components/knowledge/AttachmentPreview.vue` - 基本預覽功能已實現
   - 支持 PDF、圖片、文本預覽
   - 支持下載功能

### 未實現或部分實現功能

1. **附件列表 API Handler 的 JOIN 查詢** ❌ 需補完
   - 後端 `handleGetAttachments` 沒有 JOIN 查詢獲取關聯實體名稱（entity_name）
   - 需要根據 entity_type 動態 JOIN 對應的實體表（ActiveTasks, Clients, SOPDocuments, Receipts）

2. **專門的附件 API 前端調用函數** ❌ 未實現
   - `src/api/attachments.js` - 未找到
   - 需要創建專門的附件 API 調用函數，使用 `/api/v2/attachments` API

3. **附件篩選組件** ❌ 未實現
   - `src/components/attachments/AttachmentFilters.vue` - 未找到
   - 需要創建獨立的附件篩選組件

4. **附件列表組件** ❌ 未實現
   - `src/components/attachments/AttachmentList.vue` - 未找到
   - 需要創建獨立的附件列表組件

5. **任務詳情頁附件列表整合** ❌ 未實現
   - 任務詳情頁沒有顯示附件列表
   - 沒有「查看知識庫」按鈕

6. **E2E 測試** ❌ 未實現
   - `tests/e2e/knowledge/attachment-list.spec.ts` - 未找到

---

## 1. 後端 API 實現

### 1.1 附件列表 API Handler

- [x] 1.1.1 調整附件列表 API Handler 以符合設計要求 ✅ 已完成
  - File: backend/src/handlers/attachments/index.js
  - Function: handleGetAttachments
  - 已實現基本功能（第33-207行），但需要調整以符合設計文檔要求
  - 添加 JOIN 查詢獲取關聯實體名稱（根據 entity_type 動態 JOIN 對應的實體表）：
    - entity_type='task' 時 JOIN ActiveTasks 表，使用 `task_type` 欄位作為實體名稱
    - entity_type='client' 時 JOIN Clients 表，使用 `company_name` 欄位作為實體名稱
    - entity_type='sop' 時 JOIN SOPDocuments 表，使用 `title` 欄位作為實體名稱
    - entity_type='receipt' 時 JOIN Receipts 表，使用 `receipt_id` 或組合欄位作為實體名稱
  - 處理實體不存在的情況（使用 LEFT JOIN 並在實體不存在時顯示「已刪除」或「未知實體」）
  - 確保返回所有必要欄位：attachment_id, entity_type, entity_id, entity_name, object_key, filename, content_type, size_bytes, uploader_user_id, uploader_name, uploaded_at
  - 注意：Attachments.entity_id 為 TEXT 類型，JOIN 時需進行類型轉換（task 和 sop 的 ID 為 INTEGER，需使用 CAST 轉換）
  - _Leverage: backend/src/utils/response.js, backend/src/router/attachments.js_
  - _Requirements: BR12.2.1, BR12.2.2, BR12.2.3, BR12.2.4, BR12.2.5_
  - _Status: ✅ 已完成 - 已添加 JOIN 查詢獲取 entity_name，處理實體不存在情況，確保返回所有必要欄位（包括 object_key 和 entity_name），支援 entity_id 類型轉換（CAST），區分「已刪除」和「未知實體」_

---

## 2. 前端組件實現

### 2.1 前端附件上傳 API 調用函數

- [x] 2.1.1 創建專門的附件 API 前端調用函數 ✅ 已完成
  - File: src/api/attachments.js
  - 實現 `fetchAttachments` 函數（調用 GET /api/v2/attachments，支援篩選參數）
  - 使用統一的錯誤處理和回應格式處理
  - 支援篩選參數：entity_type, entity_id, q, page, perPage
  - _Leverage: @/utils/apiHelpers, axios, @/utils/request_
  - _Requirements: BR12.2.1_
  - _Status: ✅ 已完成 - 實現了完整的 fetchAttachments 函數，支援所有篩選參數（entity_type, entity_id, q, page, perPage），包含參數標準化處理（per_page/perPage, type/entity_type, client/entity_id），使用統一的錯誤處理和回應格式，添加了完整的 JSDoc 文檔和範例_

### 2.2 附件篩選組件

- [x] 2.2.1 實現附件篩選組件 ✅ 已完成
  - File: src/components/attachments/AttachmentFilters.vue
  - 實現實體類型篩選下拉框（全部、任務、客戶、SOP、收據）
  - 實現實體 ID 篩選（可選，根據實體類型動態顯示，需調用對應的實體列表 API）
  - 實現關鍵詞搜尋輸入框
  - 實現篩選條件變更事件
  - 實現實體列表載入（當實體類型變更時，載入對應的實體列表）
  - _Leverage: Ant Design Vue components (Input, Select), 現有的實體列表 API (如 /api/v2/tasks, /api/v2/clients 等)_
  - _Requirements: BR12.2.2, BR12.2.3, BR12.2.4_
  - _Status: ✅ 已完成 - 實現了完整的附件篩選組件，包含實體類型篩選（全部、任務、客戶、SOP、收據）、動態實體 ID 篩選（根據實體類型自動載入對應實體列表）、關鍵詞搜尋輸入框、篩選條件變更事件（@filters-change），使用 FilterCard 組件包裝，支援實體列表載入狀態顯示，處理 entity_id 類型轉換（TEXT），使用 extractApiData 處理多種 API 響應格式_

### 2.3 附件列表組件

- [x] 2.3.1 實現附件列表組件 ✅ 已完成
  - File: src/components/attachments/AttachmentList.vue
  - 實現附件列表展示（使用 Ant Design Vue Table 組件）
  - 實現分頁組件
  - 實現附件點擊事件（選擇附件進行預覽）
  - 實現加載狀態顯示
  - 實現空數據提示
  - _Leverage: Ant Design Vue Table and Pagination components, @/utils/formatters_
  - _Requirements: BR12.2.1, BR12.2.5_
  - _Status: ✅ 已完成 - 實現了完整的附件列表組件，使用 Ant Design Vue Table 展示附件列表（文件名稱、實體類型、關聯實體、文件大小、文件類型、上傳時間、上傳者），實現分頁組件（支援 10/20/50/100 每頁顯示筆數），實現附件點擊事件（@attachment-click），實現加載狀態顯示和空數據提示，支援選中行高亮顯示，使用 @/utils/formatters 進行文件大小和日期時間格式化_

### 2.4 知識庫附件頁面

- [x] 2.4.1 調整知識庫附件頁面功能 ✅ 已完成
  - File: src/views/knowledge/KnowledgeAttachments.vue
  - 已實現基本頁面和預覽功能
  - ✅ 已整合新的 AttachmentFilters 和 AttachmentList 組件
  - ✅ 已調整以使用新的 /api/v2/attachments API（通過 src/api/attachments.js 的 fetchAttachments）
  - ✅ 實現左側列表、右側預覽布局
  - ✅ 實現篩選條件管理（整合 AttachmentFilters 組件，支持 entity_type、entity_id、q 篩選）
  - ✅ 實現分頁管理（通過 AttachmentList 組件）
  - ✅ 實現任務篩選（從 URL 參數 taskId 自動篩選，轉換為 entity_type=task 和 entity_id）
  - _Leverage: src/components/attachments/AttachmentFilters.vue, src/components/attachments/AttachmentList.vue, src/components/attachments/AttachmentPreview.vue, src/api/attachments.js, @/utils/apiHelpers_
  - _Requirements: BR12.2.7_
  - _Status: ✅ 已完成 - 已整合新的 AttachmentFilters 和 AttachmentList 組件，更新 store 的 fetchAttachments 以使用新的 /api/v2/attachments API，實現篩選條件轉換（taskId -> entity_type/entity_id），保持左側列表、右側預覽布局，實現任務篩選功能（從 URL 參數 taskId 自動篩選）_

### 2.5 任務詳情頁附件列表整合

- [x] 2.5.1 實現任務詳情頁附件列表整合 ✅ 已完成
  - File: src/views/tasks/TaskDetail.vue, src/components/tasks/TaskAttachments.vue
  - ✅ 在任務詳情頁顯示該任務的附件列表（使用新的 TaskAttachments 組件）
  - ✅ 實現「查看知識庫」按鈕，跳轉到知識庫附件頁面並自動篩選該任務的附件（帶上 taskId 和 returnTo 參數）
  - ✅ 使用 AttachmentList 組件顯示附件列表
  - ✅ 實現附件預覽 Modal（使用 AttachmentPreview 組件）
  - ✅ 實現附件下載功能
  - ✅ 實現分頁功能
  - _Leverage: src/components/attachments/AttachmentList.vue, src/components/attachments/AttachmentPreview.vue, src/api/attachments.js, Vue Router_
  - _Requirements: BR12.2.6_
  - _Status: ✅ 已完成 - 創建了 TaskAttachments 組件，整合到 TaskDetail.vue，使用 fetchAttachments API 查詢 entity_type='task' AND entity_id=任務ID，實現「查看知識庫」按鈕跳轉到 /knowledge/attachments 並帶上 taskId 參數自動篩選_

### 2.6 附件預覽組件

- [x] 2.6.1 驗證附件預覽組件功能 ✅ 已實現
  - File: src/components/knowledge/AttachmentPreview.vue
  - 已實現基本預覽功能
  - 支持 PDF、圖片、文本預覽
  - 支持下載功能
  - _Status: 已實現，符合設計要求_

---

## 3. 測試

### 3.1 E2E 測試

- [x] 3.1.1 實現 E2E 測試 ✅ 已完成
  - File: tests/e2e/knowledge/attachment-list.spec.ts
  - ✅ 測試完整列表查看流程
  - ✅ 測試篩選功能（使用 KnowledgeLayout 的統一篩選區域，不再使用獨立的 AttachmentFilters 組件）
  - ✅ 測試分頁功能
  - ✅ 測試任務詳情頁附件列表
  - ✅ 測試任務篩選 banner 的顯示和清除
  - ✅ 測試附件預覽功能
  - _Requirements: All BR12.2 requirements_
  - _Status: ✅ 已完成 - 創建了完整的 E2E 測試文件，測試附件列表的查看、篩選（使用 KnowledgeLayout 統一篩選區域）、分頁、任務詳情頁整合等功能_

---

## 總結

### 已完成功能
- ✅ 附件列表 API Handler（部分實現 - 基本功能已實現，支持篩選、分頁、排序，JOIN 查詢獲取上傳者名稱，但缺少 entity_name JOIN 查詢）
- ✅ 前端附件列表 API 調用函數（部分實現 - `src/api/knowledge.js` 中有 `fetchAttachments` 函數，但使用的是 `fetchDocuments` API，不是 `/api/v2/attachments`）
- ✅ 知識庫附件頁面（部分實現 - 基本頁面已實現，左側列表、右側預覽布局，分頁功能，篩選功能，任務篩選，但沒有獨立的 `AttachmentFilters` 和 `AttachmentList` 組件）
- ✅ 附件預覽組件（完整實現 - 支持 PDF、圖片、文本預覽，支持下載功能）

### 待完成功能
- ❌ 附件列表 API Handler 的 JOIN 查詢（需補完 - 後端 `handleGetAttachments` 沒有 JOIN 查詢獲取關聯實體名稱（entity_name），需要根據 entity_type 動態 JOIN 對應的實體表）
- ❌ 專門的附件 API 前端調用函數（未實現 - 需要創建 `src/api/attachments.js`，使用 `/api/v2/attachments` API）
- ❌ 附件篩選組件（未實現 - 需要創建 `src/components/attachments/AttachmentFilters.vue`）
- ❌ 附件列表組件（未實現 - 需要創建 `src/components/attachments/AttachmentList.vue`）
- ❌ 知識庫附件頁面調整（需調整 - 需要整合新的 `AttachmentFilters` 和 `AttachmentList` 組件，使用新的 `/api/v2/attachments` API）
- ❌ 任務詳情頁附件列表整合（未實現 - 需要在任務詳情頁顯示附件列表，實現「查看知識庫」按鈕）
- ❌ E2E 測試（未實現 - 需要建立完整的測試套件）

### 備註
- 部分核心功能已實現，包括：
  - 後端 API：附件列表查詢（支持篩選、分頁、排序，JOIN 查詢獲取上傳者名稱）
  - 前端組件：知識庫附件頁面（左側列表、右側預覽布局，分頁功能，篩選功能，任務篩選）
  - 前端組件：附件預覽組件（支持 PDF、圖片、文本預覽，支持下載功能）
- 待補完功能：
  - 附件列表 API Handler 的 JOIN 查詢：後端 `handleGetAttachments` 沒有 JOIN 查詢獲取關聯實體名稱（entity_name），需要根據 entity_type 動態 JOIN 對應的實體表（ActiveTasks, Clients, SOPDocuments, Receipts）
  - 專門的附件 API 前端調用函數：需要創建 `src/api/attachments.js`，使用 `/api/v2/attachments` API，而不是使用 `fetchDocuments` API
  - 附件篩選組件：需要創建獨立的 `AttachmentFilters` 組件，支持實體類型篩選、實體 ID 篩選、關鍵詞搜尋
  - 附件列表組件：需要創建獨立的 `AttachmentList` 組件，使用 Ant Design Vue Table 組件展示附件列表
  - 知識庫附件頁面調整：需要整合新的 `AttachmentFilters` 和 `AttachmentList` 組件，使用新的 `/api/v2/attachments` API
  - 任務詳情頁附件列表整合：需要在任務詳情頁顯示附件列表，實現「查看知識庫」按鈕
  - E2E 測試：需要建立完整的測試套件

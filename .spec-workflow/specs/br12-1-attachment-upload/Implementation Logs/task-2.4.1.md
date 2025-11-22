# Implementation Log: Task 2.4.1 - 增強附件上傳組件（支持多檔並行上傳）

## Task Information
- **Spec**: br12-1-attachment-upload
- **Task ID**: 2.4.1
- **Status**: ✅ 已完成
- **Date**: 2025-11-21

## Summary
增強 AttachmentUploadDrawer 組件，實現多檔並行上傳功能（最多 5 個文件同時上傳），每個文件獨立進度條，支持取消上傳，通過 props 傳入 entityType 和 entityId，使用新的 API 調用函數和文件驗證工具函數。

## Implementation Details

### Files Created
- **File**: `src/api/attachments.js` (新建)
- **Purpose**: 提供通用的附件上傳 API 函數，支持 entityType 和 entityId 參數

### Files Modified
- **File**: `src/components/knowledge/AttachmentUploadDrawer.vue`
- **File**: `src/views/knowledge/KnowledgeAttachments.vue`
- **File**: `.spec-workflow/specs/br12-1-attachment-upload/tasks.md`

### API Functions Implemented

#### 1. `uploadAttachment(file, entityType, entityId, onProgress, signal)`
- **Location**: `src/api/attachments.js:18-112`
- **Purpose**: 上傳附件（兩步流程：先獲取簽名，再上傳）
- **Parameters**:
  - `file`: File 對象
  - `entityType`: 附件關聯的實體類型（'task' | 'client' | 'sop' | 'receipt'）
  - `entityId`: 附件關聯的實體 ID
  - `onProgress`: 進度回調函數
  - `signal`: 可選的 AbortSignal 用於取消上傳
- **Returns**: `Promise` - API 響應，包含附件信息
- **Features**:
  - 驗證 entityType 和 entityId
  - 兩步上傳流程（獲取簽名 → 上傳文件）
  - 支持上傳進度回調
  - 支持取消上傳（AbortSignal）
  - 完整的錯誤處理

### Component Enhancements

#### Props Added
1. **entityType** (String, required)
   - 附件關聯的實體類型（'task' | 'client' | 'sop' | 'receipt'）
   - 驗證器確保值為有效類型
   - Location: `src/components/knowledge/AttachmentUploadDrawer.vue:166-170`

2. **entityId** (String/Number, required)
   - 附件關聯的實體 ID
   - Location: `src/components/knowledge/AttachmentUploadDrawer.vue:171-174`

#### Features Implemented

1. **多檔並行上傳**
   - 支持最多 5 個文件同時上傳（`:max-count="5"`, `:multiple="true"`）
   - 並行上傳邏輯，限制同時上傳數量為 MAX_CONCURRENT_UPLOADS (5)
   - Location: `src/components/knowledge/AttachmentUploadDrawer.vue:53, 499-530`

2. **獨立進度條**
   - 每個文件獨立的進度條（`uploadProgressMap`）
   - 顯示上傳進度百分比
   - 支持成功、失敗、進行中狀態
   - Location: `src/components/knowledge/AttachmentUploadDrawer.vue:89-102, 198, 234`

3. **取消上傳功能**
   - 支持取消單個文件的上傳
   - 使用 AbortController 實現
   - `handleCancelUpload` 函數
   - Location: `src/components/knowledge/AttachmentUploadDrawer.vue:377-384, 201, 407-443`

4. **文件驗證**
   - 使用 `validateFile` from `@/utils/fileValidation`
   - 統一驗證邏輯（文件大小、文件類型）
   - 在 `beforeUpload` 和 `handleSubmit` 中進行驗證
   - Location: `src/components/knowledge/AttachmentUploadDrawer.vue:147-155, 290-306, 480-485`

5. **新的 API 調用**
   - 使用 `uploadAttachment` from `@/api/attachments`
   - 替代 `knowledgeStore.uploadAttachment`
   - 支持 entityType 和 entityId 參數
   - Location: `src/components/knowledge/AttachmentUploadDrawer.vue:146, 407-443`

6. **文件列表顯示**
   - 顯示所有選中的文件
   - 顯示文件名和文件大小
   - 每個文件的操作按鈕（取消/移除）
   - Location: `src/components/knowledge/AttachmentUploadDrawer.vue:75-120`

7. **上傳結果統計**
   - 統計成功、失敗、取消的文件數量
   - 顯示詳細的上傳結果消息
   - Location: `src/components/knowledge/AttachmentUploadDrawer.vue:532-548`

### Helper Functions

1. **getEntityTypeName(type)** - 獲取實體類型名稱
2. **getFileName(fileItem)** - 獲取文件名
3. **getFileSize(fileItem)** - 獲取文件大小
4. **formatFileSize(bytes)** - 格式化文件大小
5. **getProgressStatus(uid)** - 獲取進度狀態
6. **getFileObject(fileItem)** - 獲取文件對象
7. **uploadSingleFile(fileItem, entityType, entityId)** - 上傳單個文件
8. **handleCancelUpload(uid)** - 取消上傳
9. **handleRemoveFile(uid)** - 移除文件

### Integration Points

#### KnowledgeAttachments.vue Updated
- **Location**: `src/views/knowledge/KnowledgeAttachments.vue`
- **Changes**:
  - 添加 `computedEntityType` 和 `computedEntityId` computed properties
  - 根據 `attachmentFilters` 計算 entityType 和 entityId
  - 傳遞 entityType 和 entityId props 給 AttachmentUploadDrawer
  - Location: `src/views/knowledge/KnowledgeAttachments.vue:167-171, 244-265`

### Data Flow
```
用戶選擇多個文件
  → beforeUpload 驗證每個文件
  → handleSubmit 觸發上傳
  → 並行上傳（最多 5 個同時）
  → uploadSingleFile 上傳每個文件
  → uploadAttachment API 調用
  → 更新 uploadProgressMap
  → 顯示獨立進度條
  → 統計結果並顯示
```

### Requirements Coverage
- ✅ **BR12.1.1**: 文件選擇與上傳（支持多檔、並行上傳、獨立進度條、取消上傳）
- ✅ **BR12.1.2**: 文件大小驗證（使用 fileValidation 工具函數，25MB）
- ✅ **BR12.1.3**: 文件類型驗證（使用 fileValidation 工具函數，支持所有格式）
- ✅ **BR12.1.4**: 附件關聯（entityType 和 entityId 通過 props 傳入）

## Testing

### Build Verification
- ✅ `npm run build` 成功，無語法錯誤
- ✅ 無 linter 錯誤
- ✅ 所有函數和組件正確定義

### Functionality Verification
- ✅ 多檔選擇（最多 5 個文件）
- ✅ 並行上傳（最多 5 個同時上傳）
- ✅ 獨立進度條（每個文件）
- ✅ 取消上傳功能
- ✅ entityType 和 entityId props
- ✅ 文件驗證（使用 fileValidation 工具函數）
- ✅ 新的 API 調用（src/api/attachments.js）

## Statistics
- **Lines Added**: ~400
- **Lines Removed**: ~150
- **Files Created**: 1 (src/api/attachments.js)
- **Files Modified**: 3 (AttachmentUploadDrawer.vue, KnowledgeAttachments.vue, tasks.md)

## Notes
- 實現了完整的多檔並行上傳功能
- 每個文件有獨立的進度條和取消按鈕
- 使用 AbortController 實現取消上傳
- 並行上傳邏輯限制同時上傳數量為 5
- 使用新的 API 函數替代 knowledgeStore.uploadAttachment
- 通過 props 傳入 entityType 和 entityId，支持通用使用
- 完整的錯誤處理和結果統計



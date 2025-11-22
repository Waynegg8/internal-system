# Implementation Log: Task 2.5.1 - 新增通用附件上傳組件

## Task Information
- **Spec**: br12-1-attachment-upload
- **Task ID**: 2.5.1
- **Status**: ✅ 已完成
- **Date**: 2025-11-21

## Summary
創建通用附件上傳組件 `src/components/attachments/AttachmentUploadDrawer.vue`，基於現有的知識庫附件上傳組件，提供可重用的附件上傳功能，支持 entityType 和 entityId 作為必需 props，支持多檔並行上傳，使用新的 API 調用函數和文件驗證工具。

## Implementation Details

### File Created
- **File**: `src/components/attachments/AttachmentUploadDrawer.vue` (新建)
- **Status**: 通用組件已創建，包含所有必需功能

### Component Features

#### Props (清晰的組件接口)

1. **visible** (Boolean, default: false)
   - 抽屜顯示狀態
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:173-176`

2. **entityType** (String, required)
   - 附件關聯的實體類型（'task' | 'client' | 'sop' | 'receipt'）
   - 帶驗證器確保值為有效類型
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:181-185`

3. **entityId** (String/Number, required)
   - 附件關聯的實體 ID
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:190-193`

4. **title** (String, default: '上傳附件')
   - 抽屜標題
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:197-200`

5. **width** (String/Number, default: 600)
   - 抽屜寬度
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:204-207`

6. **maxCount** (Number, default: 5)
   - 最大文件數量
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:211-214`

7. **multiple** (Boolean, default: true)
   - 是否支持多選
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:218-221`

8. **showUploadList** (Boolean, default: true)
   - 是否顯示上傳列表
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:225-228`

9. **drag** (Boolean, default: true)
   - 是否支持拖拽上傳
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:232-235`

10. **showInfoAlert** (Boolean, default: true)
    - 是否顯示提示信息
    - Location: `src/components/attachments/AttachmentUploadDrawer.vue:239-242`

11. **infoDescription** (String, default: '')
    - 自定義提示信息描述
    - Location: `src/components/attachments/AttachmentUploadDrawer.vue:246-249`

12. **uploadTitle** (String, default: '點擊或拖拽文件到此區域上傳')
    - 自定義上傳標題
    - Location: `src/components/attachments/AttachmentUploadDrawer.vue:253-256`

13. **uploadHint** (String, default: '支持 PDF、Word、Excel、PowerPoint、圖片等格式，最大 25MB，最多 5 個文件')
    - 自定義上傳提示
    - Location: `src/components/attachments/AttachmentUploadDrawer.vue:260-263`

#### Events (清晰的事件接口)

1. **@close**
   - 關閉抽屜事件
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:267`

2. **@success**
   - 上傳成功事件，回傳上傳成功的附件列表
   - Parameters: `attachments` - 上傳成功的附件響應數組
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:267`

3. **@update:visible**
   - 更新顯示狀態事件
   - Location: `src/components/attachments/AttachmentUploadDrawer.vue:267`

### Core Functionality

#### 1. 多檔並行上傳
- 支持最多 5 個文件同時上傳（可通過 maxCount prop 配置）
- 並行上傳邏輯，限制同時上傳數量為 MAX_CONCURRENT_UPLOADS (5)
- Location: `src/components/attachments/AttachmentUploadDrawer.vue:293, 54, 580-625`

#### 2. 獨立進度條
- 每個文件獨立的進度條（`uploadProgressMap`）
- 顯示上傳進度百分比
- 支持成功、失敗、進行中狀態
- Location: `src/components/attachments/AttachmentUploadDrawer.vue:287, 89-96, 322-324, 373-376`

#### 3. 取消上傳功能
- 支持取消單個文件的上傳
- 使用 AbortController 實現
- `handleCancelUpload` 函數
- Location: `src/components/attachments/AttachmentUploadDrawer.vue:290, 377-384, 98-107`

#### 4. 文件驗證
- 使用 `validateFile` from `@/utils/fileValidation`
- 統一驗證邏輯（文件大小、文件類型）
- 在 `beforeUpload` 和 `handleSubmit` 中進行驗證
- Location: `src/components/attachments/AttachmentUploadDrawer.vue:147-155, 394-408, 560-567`

#### 5. 新的 API 調用
- 使用 `uploadAttachment` from `@/api/attachments`
- 支持 entityType 和 entityId 參數
- 支持上傳進度回調和取消信號
- Location: `src/components/attachments/AttachmentUploadDrawer.vue:146, 507-543`

#### 6. 文件列表顯示
- 顯示所有選中的文件
- 顯示文件名和文件大小
- 每個文件的操作按鈕（取消/移除）
- Location: `src/components/attachments/AttachmentUploadDrawer.vue:75-122`

#### 7. 上傳結果統計
- 統計成功、失敗、取消的文件數量
- 顯示詳細的上傳結果消息
- Location: `src/components/attachments/AttachmentUploadDrawer.vue:627-651`

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
10. **computedInfoDescription** - 計算提示信息描述

### Component Documentation

組件包含完整的 JSDoc 風格註釋：
- 組件整體說明
- 每個 prop 的詳細說明
- 函數用途說明
- Location: `src/components/attachments/AttachmentUploadDrawer.vue:154-263`

### Differences from Knowledge Component

通用組件相比知識庫組件的改進：
1. **更多可配置的 props** - title, width, maxCount, multiple, showUploadList, drag, showInfoAlert, infoDescription, uploadTitle, uploadHint
2. **更靈活的提示信息** - 支持自定義 infoDescription 或自動生成
3. **完整的文檔註釋** - 每個 prop 都有詳細說明
4. **通用性** - 不依賴任何知識庫特定的邏輯
5. **可重用性** - 可在全系統任何地方使用

### Integration Points

組件可以在以下場景使用：
1. **任務詳情頁** - 上傳任務附件（entityType='task', entityId=任務ID）
2. **客戶詳情頁** - 上傳客戶附件（entityType='client', entityId=客戶ID）
3. **收據詳情頁** - 上傳收據附件（entityType='receipt', entityId=收據ID）
4. **SOP 詳情頁** - 上傳 SOP 附件（entityType='sop', entityId=SOP ID）
5. **知識庫附件頁** - 通過 KnowledgeAttachments.vue 使用（task 2.6.1）

### Data Flow
```
用戶選擇多個文件
  → beforeUpload 驗證每個文件
  → handleSubmit 觸發上傳
  → 並行上傳（最多 5 個同時）
  → uploadSingleFile 上傳每個文件
  → uploadAttachment API 調用（@/api/attachments）
  → 更新 uploadProgressMap
  → 顯示獨立進度條
  → 統計結果並顯示
  → emit('success', attachments)
```

### Requirements Coverage
- ✅ **BR12.1.1**: 文件選擇與上傳（支持多檔、並行上傳、獨立進度條、取消上傳）
- ✅ **BR12.1.4**: 附件關聯（entityType 和 entityId 作為必需 props）

## Testing

### Build Verification
- ✅ `npm run build` 成功，無語法錯誤
- ✅ 無 linter 錯誤
- ✅ 所有函數和組件正確定義
- ✅ Props 和 Events 正確定義

### Functionality Verification
- ✅ entityType 和 entityId 作為必需 props（帶驗證器）
- ✅ 多檔選擇（可通過 maxCount 配置，默認 5）
- ✅ 並行上傳（最多 5 個同時上傳）
- ✅ 獨立進度條（每個文件）
- ✅ 取消上傳功能
- ✅ 文件驗證（使用 fileValidation 工具函數）
- ✅ 新的 API 調用（src/api/attachments.js）
- ✅ 清晰的組件接口（完整的 props 和 events）
- ✅ 可配置性（多個可選 props 支持自定義）

## Statistics
- **Lines Added**: ~850
- **Lines Removed**: 0
- **Files Created**: 1 (src/components/attachments/AttachmentUploadDrawer.vue)
- **Files Modified**: 1 (tasks.md)

## Notes
- 通用組件基於知識庫組件創建，但增加了更多可配置選項
- 組件完全獨立，不依賴任何特定業務邏輯
- 提供完整的 JSDoc 風格文檔註釋
- 支持通過 props 自定義標題、提示、文件數量限制等
- 可在全系統任何需要附件上傳的地方使用
- 知識庫組件可以選擇使用此通用組件或保持獨立（task 2.6.1）



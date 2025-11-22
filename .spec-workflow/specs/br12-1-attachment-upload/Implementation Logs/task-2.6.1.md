# Implementation Log: Task 2.6.1 - 更新知識庫附件上傳組件集成

## Task Information
- **Spec**: br12-1-attachment-upload
- **Task ID**: 2.6.1
- **Status**: ✅ 已完成
- **Date**: 2025-11-21

## Summary
更新知識庫附件上傳組件 `src/components/knowledge/AttachmentUploadDrawer.vue` 以使用新的通用附件上傳組件，同時保持向後兼容性。知識庫特定的邏輯（如根據篩選條件自動設置 entity_type/entity_id）在父組件 `KnowledgeAttachments.vue` 中通過 `computedEntityType` 和 `computedEntityId` 處理。

## Implementation Details

### File Modified
- **File**: `src/components/knowledge/AttachmentUploadDrawer.vue`
- **Status**: 從 667 行減少到 152 行，現在是通用組件的包裝
- **Change**: 將完整的組件實現替換為包裝通用組件的輕量級組件

### Approach: Wrapper Component Pattern

採用包裝組件模式（Wrapper Component Pattern）來保持向後兼容性：

1. **導入通用組件**: 從 `@/components/attachments/AttachmentUploadDrawer.vue` 導入通用組件
2. **定義相同的 Props**: 保持與通用組件完全相同的 props 定義
3. **轉發所有 Props**: 將所有 props 傳遞給通用組件
4. **轉發所有 Events**: 將所有 events 從通用組件轉發到父組件
5. **保持接口一致**: 確保任何使用知識庫組件的代碼無需修改

### Component Structure

#### Template
```vue
<AttachmentUploadDrawerGeneric
  :visible="visible"
  :entity-type="entityType"
  :entity-id="entityId"
  :title="title"
  :width="width"
  :max-count="maxCount"
  :multiple="multiple"
  :show-upload-list="showUploadList"
  :drag="drag"
  :show-info-alert="showInfoAlert"
  :info-description="infoDescription"
  :upload-title="uploadTitle"
  :upload-hint="uploadHint"
  @update:visible="handleUpdateVisible"
  @close="handleClose"
  @success="handleSuccess"
/>
```

- Location: `src/components/knowledge/AttachmentUploadDrawer.vue:7-24`
- 所有 props 明確傳遞給通用組件
- 所有 events 通過事件處理函數轉發

#### Props (與通用組件保持一致)
- **visible** (Boolean, default: false) - 抽屜顯示狀態
- **entityType** (String, required) - 附件關聯的實體類型
- **entityId** (String/Number, required) - 附件關聯的實體 ID
- **title** (String, default: '上傳附件') - 抽屜標題
- **width** (String/Number, default: 600) - 抽屜寬度
- **maxCount** (Number, default: 5) - 最大文件數量
- **multiple** (Boolean, default: true) - 是否支持多選
- **showUploadList** (Boolean, default: true) - 是否顯示上傳列表
- **drag** (Boolean, default: true) - 是否支持拖拽上傳
- **showInfoAlert** (Boolean, default: true) - 是否顯示提示信息
- **infoDescription** (String, default: '') - 自定義提示信息描述
- **uploadTitle** (String) - 自定義上傳標題
- **uploadHint** (String) - 自定義上傳提示

Location: `src/components/knowledge/AttachmentUploadDrawer.vue:42-137`

#### Events (與通用組件保持一致)
- **@close** - 關閉抽屜事件
- **@success** - 上傳成功事件
- **@update:visible** - 更新顯示狀態事件

Location: `src/components/knowledge/AttachmentUploadDrawer.vue:140`

#### Event Handlers
- **handleClose()** - 轉發 close 事件
- **handleSuccess(attachments)** - 轉發 success 事件
- **handleUpdateVisible(value)** - 轉發 update:visible 事件

Location: `src/components/knowledge/AttachmentUploadDrawer.vue:142-153`

### Knowledge-Specific Logic

知識庫特定的邏輯（如根據篩選條件自動設置 entity_type/entity_id）在父組件 `KnowledgeAttachments.vue` 中處理：

#### computedEntityType
- 根據 `safeAttachmentFilters.value` 計算 entityType
- 如果有 `taskId` 篩選，使用 'task' 作為 entityType
- 否則根據 `type` 篩選決定
- 如果都沒有，使用 'sop' 作為默認值（知識庫附件）
- Location: `src/views/knowledge/KnowledgeAttachments.vue:252-262`

#### computedEntityId
- 根據 `safeAttachmentFilters.value` 計算 entityId
- 如果有 `taskId` 篩選，使用該 taskId
- 否則使用 '0' 作為獨立附件的 entity_id
- Location: `src/views/knowledge/KnowledgeAttachments.vue:264-272`

這些 computed 屬性作為 props 傳遞給 AttachmentUploadDrawer：
```vue
<AttachmentUploadDrawer
  v-model:visible="drawerVisible"
  :entity-type="computedEntityType"
  :entity-id="computedEntityId"
  @close="handleDrawerClose"
  @success="handleDrawerSuccess"
/>
```

Location: `src/views/knowledge/KnowledgeAttachments.vue:167-173`

### Backward Compatibility

#### Import Path Unchanged
- 知識庫組件的導入路徑保持不變：`@/components/knowledge/AttachmentUploadDrawer.vue`
- 任何使用此組件的代碼無需修改
- Location: `src/views/knowledge/KnowledgeAttachments.vue:186`

#### Interface Unchanged
- Props 定義完全一致
- Events 定義完全一致
- 行為完全一致（通過包裝通用組件實現）

### Benefits

1. **代碼重用**: 知識庫組件現在重用通用組件的所有功能
2. **減少重複**: 從 667 行減少到 152 行（減少 77%）
3. **維護性**: 通用組件的改進自動應用到知識庫組件
4. **向後兼容**: 現有代碼無需修改
5. **清晰分離**: 知識庫特定邏輯在父組件中處理，組件本身保持通用

### Bundle Size Impact

- **Before**: `components-knowledge` bundle ~49.95 kB
- **After**: `components-knowledge` bundle ~43.67 kB
- **Reduction**: ~6.28 kB (12.6% reduction)

### Integration Points

#### Parent Component Integration
- `KnowledgeAttachments.vue` 繼續使用知識庫組件
- 通過 `computedEntityType` 和 `computedEntityId` 處理知識庫特定的邏輯
- 篩選條件變化時自動更新 entityType 和 entityId
- Location: `src/views/knowledge/KnowledgeAttachments.vue:167-173, 252-272`

#### Event Handling
- `handleDrawerClose()` - 關閉抽屜
- `handleDrawerSuccess()` - 上傳成功後重新載入附件列表
- Location: `src/views/knowledge/KnowledgeAttachments.vue:382-394`

### Requirements Coverage
- ✅ **BR12.1.4**: 附件關聯（entityType 和 entityId 通過 props 傳入，知識庫特定邏輯在父組件中處理）

## Testing

### Build Verification
- ✅ `npm run build` 成功，無語法錯誤
- ✅ 無 linter 錯誤
- ✅ 組件正確導入通用組件
- ✅ 所有 props 和 events 正確傳遞

### Functionality Verification
- ✅ 知識庫組件現在使用通用組件
- ✅ 向後兼容性保持（導入路徑和接口不變）
- ✅ 知識庫特定邏輯（篩選條件自動設置 entity_type/entity_id）在父組件中正常工作
- ✅ computedEntityType 和 computedEntityId 正確計算並傳遞
- ✅ 所有 events 正確轉發
- ✅ Bundle 大小減少

## Statistics
- **Lines Added**: 152
- **Lines Removed**: 667
- **Net Change**: -515 lines (77% reduction)
- **Files Modified**: 2
  - `src/components/knowledge/AttachmentUploadDrawer.vue` (重寫為包裝組件)
  - `.spec-workflow/specs/br12-1-attachment-upload/tasks.md` (更新狀態)
- **Files Created**: 1
  - `.spec-workflow/specs/br12-1-attachment-upload/Implementation Logs/task-2.6.1.md`

## Notes
- 採用包裝組件模式保持向後兼容性
- 知識庫特定邏輯保持在父組件中，組件本身保持通用
- 通用組件的所有功能和改進自動應用到知識庫組件
- 代碼重用性提高，維護成本降低
- 任何未來對通用組件的改進都會自動應用到知識庫組件



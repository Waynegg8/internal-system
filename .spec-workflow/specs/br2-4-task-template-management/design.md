# Design Document: BR2.4: 任務模板管理

## Overview

在設定頁面管理任務模板，包括模板創建、編輯、刪除、階段命名和順序管理，以及模板套用功能

本功能是任務管理系統的核心模組之一，提供任務模板的集中管理功能，支援統一模板和客戶專屬模板，提升任務配置效率。

## Steering Document Alignment

### Technical Standards (tech.md)

遵循以下技術標準：
- 使用 Vue 3 Composition API 開發前端組件
- 使用 Ant Design Vue 作為 UI 組件庫
- 使用 RESTful API 進行前後端通信
- 使用 Cloudflare Workers 作為後端運行環境
- 使用 Cloudflare D1 (SQLite) 作為資料庫
- 遵循統一的錯誤處理和回應格式
- 使用參數化查詢防止 SQL 注入
- 實現模板使用情況檢查和階段同步機制

### Project Structure (structure.md)

遵循以下項目結構：
- 前端組件位於 `src/components/settings/` 或 `src/views/settings/`
- API 調用層位於 `src/api/tasks.js` 或 `src/api/templates.js`
- 後端 Handler 位於 `backend/src/handlers/task-templates/`
- 資料庫 Migration 位於 `backend/migrations/`
- 遵循命名規範：組件使用 PascalCase，Handler 使用 kebab-case

## Code Reuse Analysis

### Existing Components to Leverage

- **TaskTemplateFormNew.vue**: 用於任務模板創建和編輯（已有，需增強）
- **TaskConfiguration.vue**: 用於任務配置（重用於模板配置）
- **TaskGenerationTimeRule.vue**: 用於任務生成時間規則（重用）
- **TaskDueDateRule.vue**: 用於任務到期日規則（重用）
- **TaskSOPSelector.vue**: 用於 SOP 選擇（重用）

### Integration Points

- **handleGetTaskTemplates**: 處理任務模板列表 API 請求
- **handleGetTaskTemplateDetail**: 處理任務模板詳情 API 請求（用於編輯時獲取模板完整資訊）
- **handleCreateTaskTemplate**: 處理任務模板創建 API 請求
- **handleUpdateTaskTemplate**: 處理任務模板更新 API 請求
- **handleDeleteTaskTemplate**: 處理任務模板刪除 API 請求
- **handleGetStages**: 處理階段列表查詢 API 請求（將在 task-template-stages.js 中實現）
- **handleUpdateStageNames**: 處理階段命名和順序更新 API 請求（將在 task-template-stages.js 中實現）
- **TaskTemplates 表**: 存儲任務模板基本資訊
- **TaskTemplateStages 表**: 存儲任務模板的任務配置資訊（每個 stage 代表一個任務配置）
- **ClientServices 表**: 存儲客戶服務資訊，包含 `task_template_id` 字段（用於檢查模板使用情況）

## Architecture

### Component Architecture

前端採用 Vue 3 Composition API，組件結構清晰，職責單一：

```
用戶操作（設定頁面）
  ↓
TaskTemplateManagement.vue（任務模板管理頁面）
  ↓
TaskTemplateList.vue（模板列表）
  ↓
TaskTemplateForm.vue（模板創建/編輯表單）
  ↓
TaskConfiguration.vue（任務配置組件，重用）
  ↓
API 調用層 (src/api/templates.js)
  ↓
REST API (/api/v2/task-templates/*)
  ↓
Handler (backend/src/handlers/task-templates/*)
  ↓
資料庫 (Cloudflare D1)
```

### Modular Design Principles

- **Single File Responsibility**: 每個組件文件只處理一個功能模組
- **Component Isolation**: 組件之間通過 props 和 events 通信，保持獨立
- **Service Layer Separation**: API 調用與業務邏輯分離，使用統一的 API 工具函數
- **Utility Modularity**: 工具函數按功能分組，可在多處重用
- **Component Reuse**: 重用任務配置相關組件，保持一致性

## Components and Interfaces

### TaskTemplateManagement

- **Purpose**: 任務模板管理的主頁面，整合列表和表單
- **Location**: `src/views/settings/TaskTemplateManagement.vue`
- **Props**: 無
- **Events**: 無
- **Dependencies**: 
  - Ant Design Vue 組件庫
  - Vue Router (用於導航)
  - Pinia Store (模板狀態管理)
- **Reuses**: 
  - TaskTemplateList, TaskTemplateForm 子組件
  - API 調用工具函數 (`@/utils/apiHelpers`)

### TaskTemplateList

- **Purpose**: 任務模板列表展示和管理
- **Location**: `src/components/settings/TaskTemplateList.vue`
- **Props**: 
  - `templates` (Array, required): 模板列表
  - `loading` (Boolean, optional): 加載狀態
- **Events**:
  - `@create`: 觸發創建模板
  - `@edit`: 觸發編輯模板
  - `@delete`: 觸發刪除模板
  - `@search`: 觸發搜尋
  - `@filter`: 觸發篩選
- **Dependencies**: Ant Design Vue 組件庫
- **Reuses**: API 調用工具函數

### TaskTemplateForm

- **Purpose**: 任務模板創建和編輯表單
- **Location**: `src/components/settings/TaskTemplateForm.vue`
- **Props**: 
  - `template` (Object, optional): 模板對象（編輯模式）
  - `mode` (String, required): 模式（'create' | 'edit'）
- **Events**:
  - `@submit`: 表單提交
  - `@cancel`: 取消操作
- **Dependencies**: Ant Design Vue 組件庫
- **Reuses**: 
  - TaskConfiguration 組件（重用任務配置界面）
  - API 調用工具函數

### StageManagement

- **Purpose**: 階段命名和順序管理組件（管理任務模板中的階段順序和名稱）
- **Location**: `src/components/settings/StageManagement.vue`
- **Props**: 
  - `templateId` (Integer, required): 任務模板 ID
  - `stages` (Array, required): 階段列表（來自 TaskTemplateStages）
- **Events**:
  - `@update`: 階段更新
  - `@sync-requested`: 請求同步階段變更到使用該模板的服務配置
- **Dependencies**: Ant Design Vue 組件庫
- **Reuses**: API 調用工具函數

## Data Models

### TaskTemplate

```javascript
{
  template_id: Integer (PK),
  template_name: String (required),
  service_id: Integer (FK -> Services.service_id, nullable), // 服務 ID
  client_id: Integer (FK -> Clients.client_id, nullable), // 客戶 ID（null 表示統一模板）
  description: Text, // 模板描述
  sop_id: Integer (FK -> SOPDocuments.sop_id, nullable), // 關聯的 SOP
  is_active: Boolean (default: true), // 是否啟用
  default_due_date_rule: String, // 預設期限規則（end_of_month, specific_day, next_month_day, days_after_start）
  default_due_date_value: Integer, // 預設期限具體數值
  default_due_date_offset_days: Integer, // 預設期限偏移天數
  default_advance_days: Integer (default: 7), // 預設提前生成天數
  created_at: DateTime,
  updated_at: DateTime
}
```

### TaskTemplateStage

```javascript
{
  stage_id: Integer (PK), // 注意：實際資料庫字段名為 stage_id，不是 template_stage_id
  template_id: Integer (FK -> TaskTemplates.template_id),
  stage_name: String (required), // 階段/任務名稱（可命名）
  stage_order: Integer (required), // 階段順序
  description: Text, // 階段描述
  estimated_hours: Real, // 預估工時
  execution_frequency: String (default: 'monthly'), // 執行頻率
  execution_months: String (JSON, default: '[1,2,3,4,5,6,7,8,9,10,11,12]'), // 執行月份（JSON 陣列）
  sop_id: Integer (FK -> SOPDocuments.sop_id, nullable), // 關聯的 SOP
  attachment_id: Integer (nullable), // 附件 ID（已廢棄，保留以兼容）
  document_id: Integer (FK -> InternalDocuments.document_id, nullable), // 資源中心文檔 ID
  created_at: DateTime
}
```

**注意**：
- `TaskTemplateStages` 表實際上存儲的是任務配置（雖然名字叫 "Stages"）
- 每個 `TaskTemplateStage` 記錄代表一個任務配置，`stage_name` 字段存儲的是任務名稱
- 階段順序通過 `stage_order` 字段管理

## Error Handling

### Error Scenarios

1. **模板名稱重複**
   - **Handling**: 驗證模板名稱和服務 ID 的唯一性（同一服務 ID 下，統一模板只能有一個），顯示錯誤提示
   - **User Impact**: 顯示「同一服務下，統一模板只能有一個」或「模板名稱已存在」

2. **模板被使用無法刪除**
   - **Handling**: 檢查模板是否被使用，顯示使用該模板的服務列表
   - **User Impact**: 顯示「模板正在使用中，無法刪除」並列出使用該模板的服務

3. **階段同步失敗**
   - **Handling**: 捕獲同步錯誤，顯示錯誤提示，不更新階段
   - **User Impact**: 顯示「階段同步失敗」並顯示具體錯誤原因

4. **模板配置驗證失敗**
   - **Handling**: 使用 Ant Design Vue Form 的驗證規則，在欄位下方顯示錯誤訊息
   - **User Impact**: 紅色錯誤提示出現在對應欄位下方，阻止表單提交

5. **API 請求失敗**
   - **Handling**: 使用 `extractApiError` 提取錯誤訊息，使用 `message.error` 顯示錯誤提示
   - **User Impact**: 顯示友好的錯誤訊息（例如：「載入模板列表失敗，請稍後再試」）

## Testing Strategy

### Unit Testing

- **組件測試**: 測試組件的 props、events、computed 屬性
- **模板驗證測試**: 測試模板名稱唯一性驗證邏輯
- **階段同步測試**: 測試階段同步邏輯
- **測試框架**: 建議使用 Vitest

### Integration Testing

- **API 整合測試**: 測試 API 調用和回應處理
- **組件整合測試**: 測試組件之間的交互
- **模板套用測試**: 測試模板套用到服務設定的邏輯
- **測試框架**: 建議使用 Vitest + MSW (Mock Service Worker)

### End-to-End Testing

- **E2E 測試**: 使用 Playwright 測試完整用戶流程
- **測試場景**: 
  - 任務模板列表展示、搜尋、篩選
  - 任務模板創建和編輯
  - 任務模板刪除（包括被使用的情況）
  - 階段命名和順序管理
  - 階段同步到模板和服務配置
  - 任務模板套用到服務設定
- **測試數據**: 使用測試工具函數設置測試數據
- **測試帳號**: 使用 `admin`/`111111` 管理員帳號和 `liu`/`111111` 員工帳號



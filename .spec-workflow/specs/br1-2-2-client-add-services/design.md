# Design Document: BR1.2.2: 客戶新增 - 服務設定分頁

## Overview

設定客戶服務項目和任務配置

本功能是客戶管理系統的核心模組之一，提供客戶資訊的完整管理流程。

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
- 實現軟刪除機制保留歷史記錄

### Project Structure (structure.md)

遵循以下項目結構：
- 前端組件位於 `src/components/clients/` 或 `src/views/clients/`
- API 調用層位於 `src/api/clients.js`
- 後端 Handler 位於 `backend/src/handlers/clients/`
- 資料庫 Migration 位於 `backend/migrations/`
- 遵循命名規範：組件使用 PascalCase，Handler 使用 kebab-case

## Code Reuse Analysis

### Existing Components to Leverage
- **AddServiceModal.vue**: 用於新增服務的模態框組件
- **TaskConfiguration.vue**: 用於任務配置，支援模板套用和批量設置
- **TaskGenerationPreview.vue**: 用於任務生成時間和到期日預覽
- **SOPSelector.vue**: 用於 SOP 選擇，支援多選和自動綁定
- **CreateBillingPromptModal.vue**: 用於收費計劃建立提示的模態框組件
- **PageHeader.vue**: 用於頁面標題和操作按鈕區域
- **SearchInput.vue**: 用於搜尋輸入框
- **DataTable.vue**: 用於數據表格展示（如適用）

### Integration Points
- **handleCreateClientService**: 處理創建客戶服務的 API 請求，位於 `backend/src/handlers/clients/client-services.js`
- **handleUpdateClientService**: 處理更新客戶服務的 API 請求，位於 `backend/src/handlers/clients/client-services.js`
- **handleDeleteClientService**: 處理刪除客戶服務的 API 請求，位於 `backend/src/handlers/clients/client-services.js`
- **handleClientServices**: 處理查詢客戶服務列表的 API 請求，位於 `backend/src/handlers/clients/client-services.js`
- **Clients 表**: 存儲客戶基本資訊，主鍵為 `client_id` (TEXT)
- **ClientServices 表**: 存儲客戶服務關聯，包含服務類型、執行頻率等配置
- **Services 表**: 存儲服務主數據，包含預設服務類型、預設執行月份等
- **TaskTemplates 表**: 存儲任務模板，用於自動建立任務配置
- **KnowledgeBase 表**: 存儲 SOP 知識庫，用於 SOP 自動綁定
- **Cache 系統**: 使用 KV 和 D1 Cache 提升查詢性能

## Architecture

### Component Architecture

前端採用 Vue 3 Composition API，組件結構清晰，職責單一：

```
用戶操作
  ↓
Vue 組件 (Component)
  ↓
API 調用層 (src/api/clients.js)
  ↓
REST API (/api/v2/clients/*)
  ↓
Handler (backend/src/handlers/clients/*)
  ↓
資料庫 (Cloudflare D1)
```

### Modular Design Principles

- **Single File Responsibility**: 每個組件文件只處理一個功能模組
- **Component Isolation**: 組件之間通過 props 和 events 通信，保持獨立
- **Service Layer Separation**: API 調用與業務邏輯分離，使用統一的 API 工具函數
- **Utility Modularity**: 工具函數按功能分組，可在多處重用

## Components and Interfaces

### ClientAddServices

- **Purpose**: 設定客戶服務項目和任務配置的主要組件
- **Location**: `src/views/clients/add/ClientAddServices.vue`
- **Props**: 
  - 無（新增流程中不使用 props，直接使用 Pinia Store 管理狀態）
- **Events**:
  - 無（組件內部處理所有操作，通過 Store 與父組件通信）
- **Dependencies**: 
  - Ant Design Vue 組件庫
  - Vue Router (用於導航)
  - Pinia Store (`useClientAddStore` - 用於管理新增流程的臨時狀態)
  - AddServiceModal 組件
  - TaskConfiguration 組件
  - CreateBillingPromptModal 組件
- **Reuses**: 
  - API 調用工具函數 (`@/utils/apiHelpers`)
  - 表單驗證工具 (`@/utils/validation`)
  - 日期格式化工具 (`@/utils/formatters`)
  - 頁面提示工具 (`@/composables/usePageAlert`)
- **Key Features**:
  - 服務列表展示和管理（新增、編輯、刪除）
  - 整合 AddServiceModal 用於新增服務
  - 整合 TaskConfiguration 用於任務配置
  - 整合 CreateBillingPromptModal 用於收費計劃建立提示
  - 獨立保存服務設定（客戶必須已存在）
  - 檢查客戶基本資訊是否已保存

### AddServiceModal

- **Purpose**: 新增服務模態框組件，用於選擇服務並設定服務類型、執行頻率等基本配置
- **Location**: `src/components/clients/AddServiceModal.vue`
- **Props**: 
  - `visible` (Boolean): 控制模態框顯示/隱藏
- **Events**:
  - `@update:visible`: 更新顯示狀態
  - `@service-selected`: 服務選擇完成事件，傳遞新服務對象
- **Dependencies**: 
  - Ant Design Vue 組件庫
- **Reuses**: 
  - API 調用工具函數 (`@/utils/apiHelpers`)
  - 表單驗證工具 (`@/utils/validation`)
- **Key Features**:
  - 服務選擇下拉框
  - 服務類型選擇（定期/一次性）
  - 服務類型預設值自動帶入
  - 執行頻率設定（勾選執行月份）
  - 是否用於自動生成任務設定

### TaskConfiguration

- **Purpose**: 任務配置組件，用於設定任務生成時間、到期日、SOP 綁定等任務相關配置
- **Location**: `src/components/clients/TaskConfiguration.vue`
- **Props**: 
  - `tasks` (Array): 任務配置列表（v-model）
  - `sops` (Array): 服務層級 SOP 列表（v-model）
  - `serviceId` (Integer): 服務 ID
  - `isNewClient` (Boolean): 是否為新增客戶模式
- **Events**:
  - `@update:tasks`: 更新任務配置列表
  - `@update:sops`: 更新 SOP 列表
- **Dependencies**: 
  - Ant Design Vue 組件庫
  - TaskGenerationPreview 組件
  - SOPSelector 組件
- **Reuses**: 
  - API 調用工具函數 (`@/utils/apiHelpers`)
  - 表單驗證工具 (`@/utils/validation`)
  - 日期格式化工具 (`@/utils/formatters`)
- **Key Features**:
  - 任務生成時間和到期日設置（帶即時預覽）
  - SOP 自動綁定（從知識庫讀取，支援多選和取消預設）
  - 固定期限任務設置

### TaskGenerationPreview

- **Purpose**: 任務生成時間和到期日預覽組件，即時顯示不同月份的實際生成時間和到期日
- **Location**: `src/components/clients/TaskGenerationPreview.vue`
- **Props**: 
  - `generationTimeRule` (String): 生成時間規則
  - `generationTimeParams` (Object): 生成時間參數
  - `dueDateRule` (String): 到期日規則
  - `dueDateParams` (Object): 到期日參數
  - `isFixedDeadline` (Boolean): 是否為固定期限任務
- **Dependencies**: 
  - 日期處理工具 (`@/utils/dateHelpers`)
- **Reuses**: 
  - 日期格式化工具 (`@/utils/formatters`)
- **Key Features**:
  - 即時預覽不同月份的任務生成時間和到期日
  - 顯示實際日期效果（例如「3月的任務在3月1日生成，到期日是3月15日」）

### SOPSelector

- **Purpose**: SOP 選擇器組件，從知識庫讀取符合條件的 SOP 並支援多選
- **Location**: `src/components/clients/SOPSelector.vue`
- **Props**: 
  - `serviceType` (String): 服務類型
  - `level` (String): SOP 層級（'service' 或 'task'）
  - `clientId` (String, optional): 客戶 ID（用於篩選客戶專屬 SOP）
  - `value` (Array): 已選中的 SOP IDs（v-model）
- **Events**:
  - `@update:value`: 更新選中的 SOP IDs
- **Dependencies**: 
  - Ant Design Vue 組件庫
  - 知識庫 API (`@/api/knowledge`)
- **Reuses**: 
  - API 調用工具函數 (`@/utils/apiHelpers`)
- **Key Features**:
  - 從知識庫讀取符合條件的 SOP（先篩選服務類型，再篩選層級）
  - 支援多選和取消預設
  - 自動帶入符合條件的 SOP（服務層級或任務層級）

### CreateBillingPromptModal

- **Purpose**: 收費計劃建立提示模態框組件，在保存定期服務後提示用戶是否立即建立收費計劃
- **Location**: `src/components/clients/CreateBillingPromptModal.vue`
- **Props**: 
  - `visible` (Boolean): 控制模態框顯示/隱藏
- **Events**:
  - `@update:visible`: 更新顯示狀態
  - `@confirm`: 確認建立收費計劃事件
  - `@cancel`: 取消/稍後建立事件
- **Dependencies**: 
  - Ant Design Vue 組件庫
- **Key Features**:
  - 提示用戶是否立即建立收費計劃
  - 提供「確認」和「取消」選項
  - 確認後跳轉到帳務設定分頁並預選服務

## Data Models

### Service (服務主數據，部分欄位)

```javascript
{
  id: Integer (PK, AUTOINCREMENT),
  name: String (required),
  // ... 其他欄位 ...
  default_service_type: TEXT, // 預設服務類型（'recurring' 或 'one-time'）
  default_execution_months: TEXT (JSON 格式), // 預設執行月份陣列，例如 [1,2,3,4,5,6,7,8,9,10,11,12]
  default_use_for_auto_generate: INTEGER, // 預設是否用於自動生成任務（0 或 1）
  // ... 其他欄位 ...
}
```

### ClientService (客戶服務)

```javascript
{
  id: Integer (PK, AUTOINCREMENT),
  client_id: String (FK -> Clients.client_id, required),
  service_id: Integer (FK -> Services.id, required),
  service_type: String (required), // 'recurring' 或 'one-time'
  execution_months: TEXT (JSON 格式), // 執行月份陣列，例如 [1,2,3,4,5,6,7,8,9,10,11,12]，定期服務必填，一次性服務為 NULL
  use_for_auto_generate: Integer (0 或 1), // 是否用於自動生成任務，定期服務通常為 1，一次性服務通常為 0
  created_at: DateTime,
  updated_at: DateTime,
  is_deleted: Boolean, // 軟刪除標記
  deleted_at: DateTime, // 刪除時間
  deleted_by: Integer (FK -> Users) // 刪除者
}
```

### TaskConfiguration (任務配置)

```javascript
{
  task_name: String (required), // 從服務類型下的任務類型列表下拉選擇
  stage_order: Integer (required), // 階段編號，從 1 開始
  assignee_user_id: Integer (FK -> Users), // 負責人
  estimated_hours: Decimal, // 預估工時（小時）
  generation_time_rule: String, // 生成時間規則（例如：'service_month_start', 'prev_month_last_x_days', 'prev_month_x_day', 'next_month_start'）
  generation_time_params: JSON, // 生成時間參數（例如：{ days: 3, day: 25 }）
  due_date_rule: String, // 到期日規則（例如：'service_month_end', 'next_month_end', 'n_months_end', 'fixed_date', 'fixed_deadline'）
  due_date_params: JSON, // 到期日參數（例如：{ months: 2, day: 15 }）
  is_fixed_deadline: Boolean, // 是否為固定期限任務（不受前面任務延後影響）
  service_level_sops: Array<Integer>, // 服務層級 SOP IDs（多選）
  task_level_sops: Array<Integer>, // 任務層級 SOP IDs（多選）
  created_at: DateTime,
  updated_at: DateTime
}
```

### Client

```javascript
{
  client_id: String (PK), // 統一編號，企業客戶自動加 00 前綴
  company_name: String (required),
  tax_registration_number: String (10碼，企業=00+8碼，個人=10碼身分證),
  assignee_user_id: Integer (FK -> Users),
  phone: String,
  email: String,
  contact_person_1: String,
  contact_person_2: String,
  company_owner: String,
  company_address: String,
  capital_amount: Integer,
  primary_contact_method: String,
  line_id: String,
  client_notes: Text,
  payment_notes: Text,
  created_at: DateTime,
  updated_at: DateTime,
  is_deleted: Boolean,
  deleted_at: DateTime,
  deleted_by: Integer (FK -> Users)
}
```

### Shareholder (關聯表)

```javascript
{
  id: Integer (PK, AUTOINCREMENT),
  client_id: String (FK -> Clients.client_id),
  name: String (required),
  share_percentage: Decimal,
  share_count: Integer,
  share_amount: Integer,
  share_type: String,
  created_at: DateTime,
  updated_at: DateTime
}
```

### DirectorsSupervisor (關聯表)

```javascript
{
  id: Integer (PK, AUTOINCREMENT),
  client_id: String (FK -> Clients.client_id),
  name: String (required),
  position: String,
  term_start: Date,
  term_end: Date,
  is_current: Boolean,
  created_at: DateTime,
  updated_at: DateTime
}
```

## Error Handling

### Error Scenarios

1. **API 請求失敗**
   - **Handling**: 使用 `extractApiError` 提取錯誤訊息，使用 `message.error` 顯示錯誤提示
   - **User Impact**: 顯示友好的錯誤訊息（例如：「載入客戶列表失敗，請稍後再試」）

2. **表單驗證失敗**
   - **Handling**: 使用 Ant Design Vue Form 的驗證規則，在欄位下方顯示錯誤訊息
   - **User Impact**: 紅色錯誤提示出現在對應欄位下方，阻止表單提交

3. **權限不足**
   - **Handling**: API 返回 403 錯誤，前端檢查並顯示權限提示
   - **User Impact**: 顯示「您沒有權限執行此操作」並隱藏相關功能按鈕

4. **數據不存在**
   - **Handling**: API 返回 404 錯誤，前端跳轉到 404 頁面或顯示空狀態
   - **User Impact**: 顯示「客戶不存在」或空狀態提示

5. **網路錯誤**
   - **Handling**: 捕獲網路異常，顯示網路錯誤提示，提供重試選項
   - **User Impact**: 顯示「網路連線失敗，請檢查網路後重試」

6. **任務生成時間和到期日配置錯誤**
   - **Handling**: 驗證生成時間和到期日規則的參數有效性，顯示錯誤提示
   - **User Impact**: 在對應欄位下方顯示錯誤訊息，阻止表單提交

7. **SOP 讀取失敗**
   - **Handling**: 從知識庫讀取 SOP 失敗時，顯示警告訊息，允許手動選擇
   - **User Impact**: 顯示「無法自動載入 SOP，請手動選擇」警告，SOP 選擇器仍可正常使用

8. **服務驗證失敗**
   - **Handling**: 驗證服務必須存在且為啟用狀態，如果服務不存在或未啟用，顯示錯誤提示
   - **User Impact**: 顯示「服務不存在或未啟用，請選擇其他服務」錯誤訊息，阻止表單提交

9. **重複新增相同服務**
   - **Handling**: 檢查同一客戶是否已存在相同服務（未刪除），如果存在則顯示錯誤提示
   - **User Impact**: 顯示「該服務已存在，無法重複新增」錯誤訊息，阻止表單提交

10. **定期服務未設定執行頻率**
    - **Handling**: 驗證定期服務必須至少勾選一個月份，如果未勾選則顯示錯誤提示
    - **User Impact**: 顯示「定期服務必須至少勾選一個月份」錯誤訊息，阻止表單提交

11. **服務設定保存失敗**
    - **Handling**: 保存失敗時回滾所有變更，顯示錯誤提示，保留用戶輸入的數據
    - **User Impact**: 顯示「保存失敗，請稍後再試」錯誤訊息，用戶可以重新嘗試保存

12. **任務配置批量保存失敗**
    - **Handling**: 批量保存時保證原子性，如果部分失敗則全部回滾，顯示錯誤提示
    - **User Impact**: 顯示「任務配置保存失敗，所有變更已回滾」錯誤訊息，用戶可以重新配置

13. **客戶基本資訊未保存**
    - **Handling**: 檢查客戶是否已存在（已保存基本資訊），如果不存在則提示先保存基本資訊
    - **User Impact**: 顯示「請先保存客戶基本資訊」提示，阻止進入服務設定分頁或阻止保存服務設定

## Testing Strategy

### Unit Testing

- **組件測試**: 測試組件的 props、events、computed 屬性
- **工具函數測試**: 測試格式化、驗證等工具函數
- **測試框架**: 建議使用 Vitest

### Integration Testing

- **API 整合測試**: 測試 API 調用和回應處理
- **組件整合測試**: 測試組件之間的交互
- **測試框架**: 建議使用 Vitest + MSW (Mock Service Worker)

### End-to-End Testing

- **E2E 測試**: 使用 Playwright 測試完整用戶流程
- **測試場景**: 
  - 新增客戶服務流程（選擇服務、設定服務類型、執行頻率等）
  - 編輯客戶服務（修改服務類型、執行頻率等）
  - 刪除客戶服務
  - 服務類型預設值自動帶入驗證
  - 定期服務執行頻率設定（勾選執行月份）
  - 一次性服務不需要執行頻率驗證
  - 是否用於自動生成任務設定
  - 任務配置自動建立（使用任務模板）
  - 任務生成時間和到期日配置（包括即時預覽）
  - 固定期限任務設置
  - SOP 自動綁定和多選功能（服務層級和任務層級）
  - 批量保存任務配置
  - 獨立保存服務設定
  - 收費計劃建立提示（保存定期服務後）
  - 未保存基本資訊就進入服務設定分頁的提示
  - 新增客戶的完整流程（基本資訊 → 服務設定 → 帳務設定）
- **測試數據**: 使用 `setupBR1_1TestData` 等工具函數設置測試數據
- **測試帳號**: 使用 `admin`/`111111` 管理員帳號和 `liu`/`111111` 員工帳號


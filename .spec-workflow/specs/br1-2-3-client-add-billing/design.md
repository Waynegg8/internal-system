# Design Document: BR1.2.3: 客戶新增 - 帳務設定分頁

## Overview

設定收費計劃和帳務資訊

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
- **PageHeader.vue**: 用於頁面標題和操作按鈕區域
- **SearchInput.vue**: 用於搜尋輸入框
- **DataTable.vue**: 用於數據表格展示（如適用）

### Integration Points
- **client-billing.js Handler**: 處理收費計劃相關的 API 請求，位於 `backend/src/handlers/clients/client-billing.js`
  - `handleCreateBillingPlan`: 創建收費計劃（支援定期和一次性服務）
  - `handleGetBillingPlans`: 查詢收費計劃列表
  - `handleUpdateBillingPlan`: 更新收費計劃
  - `handleDeleteBillingPlan`: 刪除單筆收費計劃
  - `handleBatchDeleteBillingPlans`: 批量刪除收費計劃
- **Clients 表**: 存儲客戶基本資訊，主鍵為 `client_id` (TEXT)
- **ClientServices 表**: 存儲客戶服務關聯，用於關聯收費計劃到服務
- **ServiceBillingSchedule 表**: 存儲收費計劃明細，支援定期服務和一次性服務
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

### ClientAddBilling

- **Purpose**: 設定收費計劃和帳務資訊的主要組件
- **Location**: `src/components/clients/ClientAddBilling.vue` 或 `src/views/clients/add/ClientAddBilling.vue`
- **Props**: 
  - `clientId` (String, optional): 客戶 ID（用於詳情頁和編輯）
  - `mode` (String, optional): 模式（'add' | 'edit' | 'view'）
- **Events**:
  - `@submit`: 表單提交事件
  - `@cancel`: 取消操作事件
- **Dependencies**: 
  - Ant Design Vue 組件庫
  - Vue Router (用於導航)
  - Pinia Store (clientAdd store)
- **Reuses**: 
  - API 調用工具函數 (`@/utils/apiHelpers`)
  - 表單驗證工具 (`@/utils/validation`)
  - 日期格式化工具 (`@/utils/formatters`)
  - RecurringBillingPlanModal 組件
  - BillingModal 組件

### RecurringBillingPlanModal

- **Purpose**: 提供定期服務收費計劃建立/編輯的模組組件
- **Location**: `src/components/clients/RecurringBillingPlanModal.vue`
- **Props**:
  - `visible` (Boolean): 控制模組顯示/隱藏
  - `editingPlan` (Object, optional): 編輯模式下的收費計劃數據
- **Events**:
  - `@update:visible`: 更新模組顯示狀態
  - `@success`: 保存成功事件
- **Dependencies**:
  - Ant Design Vue Modal 和 Form 組件
  - clientAdd Store (用於獲取服務列表)
- **Reuses**:
  - 表單驗證工具 (`@/utils/validation`)
  - 金額格式化工具 (`@/utils/formatters`)

### BillingModal

- **Purpose**: 提供一次性服務收費計劃建立/編輯的模組組件
- **Location**: `src/components/clients/BillingModal.vue`
- **Props**:
  - `visible` (Boolean): 控制模組顯示/隱藏
  - `editingBilling` (Object, optional): 編輯模式下的收費計劃數據
- **Events**:
  - `@update:visible`: 更新模組顯示狀態
  - `@success`: 保存成功事件
- **Dependencies**:
  - Ant Design Vue Modal 和 Form 組件
  - clientAdd Store (用於獲取服務列表)
- **Reuses**:
  - 表單驗證工具 (`@/utils/validation`)
  - 日期格式化工具 (`@/utils/formatters`)

## Data Models

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

### ServiceBillingSchedule (收費計劃表)

```javascript
{
  schedule_id: Integer (PK, AUTOINCREMENT),
  client_service_id: Integer (FK -> ClientServices.client_service_id, required),
  billing_type: String (required, CHECK: 'monthly' | 'one-time' | 'recurring'),
  billing_year: Integer (nullable, 定期服務收費計劃必填，一次性服務可為 NULL),
  billing_month: Integer (required, DEFAULT: 0, CHECK: 0-12),
  billing_amount: Real (required, CHECK: >= 0),
  payment_due_days: Integer (required, DEFAULT: 30, CHECK: > 0),
  billing_date: String (nullable, YYYY-MM-DD 格式，一次性服務使用),
  description: String (nullable, 一次性服務項目名稱),
  notes: Text (nullable),
  created_at: DateTime (DEFAULT: now),
  updated_at: DateTime (DEFAULT: now)
}
```

**說明**:
- **定期服務收費計劃** (`billing_type = 'recurring'` 或 `'monthly'`): 
  - 業務邏輯層使用 `'recurring'` 表示定期服務收費計劃
  - 資料庫層可能存儲為 `'monthly'`（根據 migration 0039，資料庫 CHECK 約束只允許 `'monthly'` 和 `'one-time'`）
  - 必須設定 `billing_year` 和 `billing_month` (1-12)
  - 每個關聯的服務和每個月份創建一條記錄
  - 例如：關聯 3 個服務，每個服務 12 個月，共創建 36 條記錄
- **一次性服務收費計劃** (`billing_type = 'one-time'`):
  - `billing_year` 可為 NULL
  - `billing_month` 通常為 0
  - 使用 `billing_date` 和 `description` 標識一次性收費項目
- **唯一性約束**:
  - 定期服務：`(client_service_id, billing_year, billing_month)` 唯一（當 `billing_type = 'monthly'` 時）
  - 一次性服務：`(client_service_id, billing_date, description)` 唯一（當 `billing_type = 'one-time'` 時）

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
  - 付款方式設定流程
  - 定期服務收費計劃建立流程（年度選擇、月份勾選、金額輸入、服務關聯）
  - 一次性服務收費計劃建立流程
  - 收費計劃編輯流程（修改月份金額、新增/刪除月份、新增/刪除關聯服務）
  - 收費計劃刪除流程（單筆和批量）
  - 獨立保存功能
  - 表單驗證（必填欄位、金額驗證）
  - 未保存基本資訊時的提示
- **測試數據**: 使用測試數據工具函數設置測試數據
- **測試帳號**: 使用 `admin`/`111111` 管理員帳號和 `liu`/`111111` 員工帳號


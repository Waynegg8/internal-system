# Design Document

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Vue 3)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Views   │  │Components│  │  Stores  │  │   API    │   │
│  │          │  │          │  │  (Pinia) │  │  Layer   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            │
┌─────────────────────────────────────────────────────────────┐
│              Backend (Cloudflare Workers)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Router  │  │ Handlers │  │Middleware│  │  Utils   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  D1 Database │ │  R2 Storage  │ │  KV Cache    │ │  Cron Jobs   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Component Architecture

#### Frontend Architecture
- **Views**: 頁面級組件，負責路由和頁面佈局
- **Components**: 可重用組件，按功能模組組織
- **Stores**: Pinia 狀態管理，按功能模組劃分
- **API Layer**: Axios 封裝，統一 API 調用接口

#### Backend Architecture
- **Router**: 路由匹配和分發
- **Handlers**: 業務邏輯處理，按功能模組組織
- **Middleware**: 中間件處理（CORS、認證等）
- **Utils**: 共用工具函數

---

## Data Model

### Core Entities

#### User (用戶)
```javascript
{
  user_id: Integer (PK),
  username: String (UNIQUE),
  password_hash: String,
  name: String,
  email: String,
  is_admin: Boolean,
  gender: String,
  birth_date: Date,
  start_date: Date,
  phone: String,
  address: String,
  emergency_contact_name: String,
  emergency_contact_phone: String,
  login_attempts: Integer,
  last_failed_login: DateTime,
  last_login: DateTime,
  created_at: DateTime,
  updated_at: DateTime,
  is_deleted: Boolean,
  deleted_at: DateTime,
  deleted_by: Integer (FK -> Users)
}
```

#### Client (客戶)
```javascript
{
  client_id: String (PK),
  company_name: String,
  tax_registration_number: String,
  business_status: String,
  assignee_user_id: Integer (FK -> Users),
  phone: String,
  email: String,
  client_notes: Text,
  payment_notes: Text,
  created_at: DateTime,
  updated_at: DateTime,
  is_deleted: Boolean,
  deleted_at: DateTime,
  deleted_by: Integer (FK -> Users)
}
```

#### Task (任務)
```javascript
{
  task_id: String (PK),
  task_template_id: String (FK -> TaskTemplates),
  client_id: String (FK -> Clients),
  client_service_id: String (FK -> ClientServices),
  title: String,
  description: Text,
  assignee_user_id: Integer (FK -> Users),
  status: String, // pending, in_progress, completed, cancelled
  priority: String, // low, medium, high
  due_date: Date,
  completed_at: DateTime,
  created_at: DateTime,
  updated_at: DateTime,
  created_by: Integer (FK -> Users)
}
```

#### Timesheet (工時記錄)
```javascript
{
  timesheet_id: String (PK),
  user_id: Integer (FK -> Users),
  task_id: String (FK -> Tasks),
  date: Date,
  hours: Decimal,
  work_type: String,
  description: Text,
  created_at: DateTime,
  updated_at: DateTime
}
```

#### Receipt (收據)
```javascript
{
  receipt_id: String (PK),
  client_id: String (FK -> Clients),
  receipt_number: String,
  receipt_date: Date,
  amount_cents: Integer,
  tax_amount_cents: Integer,
  total_amount_cents: Integer,
  status: String, // draft, issued, paid, cancelled
  payment_method: String,
  notes: Text,
  created_at: DateTime,
  updated_at: DateTime,
  created_by: Integer (FK -> Users)
}
```

#### PayrollCalculation (薪資計算)
```javascript
{
  calculation_id: String (PK),
  user_id: Integer (FK -> Users),
  year_month: String, // YYYY-MM
  base_salary_cents: Integer,
  total_items_cents: Integer,
  total_deductions_cents: Integer,
  net_pay_cents: Integer,
  status: String, // draft, confirmed, paid
  calculated_at: DateTime,
  created_at: DateTime,
  updated_at: DateTime
}
```

### Relationships

```
Users 1───N Clients (assignee)
Users 1───N Tasks (assignee)
Users 1───N Timesheets
Users 1───N Leaves
Users 1───N PayrollCalculations

Clients 1───N ClientServices
Clients 1───N Tasks
Clients 1───N Receipts

Tasks N───1 TaskTemplates
Tasks 1───N Timesheets
Tasks 1───N TaskDocuments
Tasks N───N SOPs (TaskSOPs)

ClientServices N───1 Services
ClientServices 1───N Tasks
```

---

## API Design

### API Conventions

#### Base URL
- Production: `https://v2.horgoscpa.com/api/v2`
- Development: `http://localhost:8787/api/v2`

#### Request Format
- Method: GET, POST, PUT, DELETE
- Headers: `Content-Type: application/json`
- Authentication: Cookie-based Session

#### Response Format
```javascript
{
  ok: Boolean,
  data: Object | Array,
  code: String, // Error code (if error)
  message: String, // Error message (if error)
  meta: {
    requestId: String,
    timestamp: DateTime,
    pagination: { // If paginated
      page: Integer,
      perPage: Integer,
      total: Integer,
      totalPages: Integer
    }
  }
}
```

#### Error Response
```javascript
{
  ok: false,
  code: "ERROR_CODE",
  message: "Error message",
  meta: {
    requestId: String,
    timestamp: DateTime
  }
}
```

### API Endpoints

#### Authentication
- `POST /auth/login` - 登入
- `POST /auth/logout` - 登出
- `GET /auth/session` - 檢查 Session
- `GET /auth/me` - 獲取當前用戶

#### Clients
- `GET /clients` - 客戶列表
- `GET /clients/:id` - 客戶詳情
- `POST /clients` - 創建客戶
- `PUT /clients/:id` - 更新客戶
- `DELETE /clients/:id` - 刪除客戶
- `PUT /clients/:id/tags` - 更新客戶標籤
- `GET /clients/:id/services` - 客戶服務列表
- `POST /clients/:id/services` - 創建客戶服務
- `PUT /clients/:id/services/:serviceId` - 更新客戶服務
- `DELETE /clients/:id/services/:serviceId` - 刪除客戶服務

#### Tasks
- `GET /tasks` - 任務列表
- `GET /tasks/:id` - 任務詳情
- `POST /tasks` - 創建任務
- `PUT /tasks/:id` - 更新任務
- `PUT /tasks/:id/status` - 更新任務狀態
- `PUT /tasks/:id/assignee` - 更新負責人
- `PUT /tasks/:id/due-date` - 調整到期日
- `GET /tasks/:id/history` - 任務歷史
- `GET /tasks/:id/documents` - 任務文件
- `POST /tasks/:id/documents` - 上傳任務文件

#### Timesheets
- `GET /timesheets` - 工時記錄列表
- `POST /timesheets` - 創建工時記錄
- `PUT /timesheets/:id` - 更新工時記錄
- `DELETE /timesheets/:id` - 刪除工時記錄
- `GET /timesheets/stats` - 工時統計

#### Payroll
- `GET /payroll/preview/:month` - 薪資預覽
- `POST /payroll/calculate` - 計算薪資
- `GET /payroll/items` - 薪資項目列表
- `POST /payroll/items` - 創建薪資項目
- `PUT /payroll/items/:id` - 更新薪資項目
- `GET /payroll/bonuses` - 獎金列表
- `POST /payroll/bonuses` - 創建獎金

#### Reports
- `GET /reports/monthly/revenue` - 月營收報表
- `GET /reports/monthly/payroll` - 月薪資報表
- `GET /reports/monthly/client-profitability` - 月客戶獲利分析
- `GET /reports/monthly/employee-performance` - 月員工績效報表
- `GET /reports/annual/revenue` - 年營收報表
- `GET /reports/annual/payroll` - 年薪資報表

#### Dashboard
- `GET /dashboard` - 儀表板數據（員工視角）
- `GET /dashboard/admin` - 儀表板數據（管理員視角）
- `GET /dashboard/alerts` - 警告列表
- `GET /dashboard/daily-summary` - 每日摘要

---

## User Interface Design

### Design Principles
- **簡潔性**: 界面簡潔，避免不必要的元素
- **一致性**: 保持設計風格和交互方式一致
- **易用性**: 操作流程直觀，減少學習成本
- **響應式**: 適配不同螢幕尺寸

### UI Components (Ant Design Vue)
- **Layout**: Layout, Menu, Breadcrumb
- **Form**: Form, Input, Select, DatePicker, Upload
- **Data Display**: Table, Card, List, Tag, Badge
- **Feedback**: Message, Notification, Modal, Drawer
- **Navigation**: Menu, Tabs, Pagination
- **Other**: Button, Icon, Tooltip, Popconfirm

### Page Layout

#### Main Layout
```
┌─────────────────────────────────────────────────┐
│  Header (Logo, User Menu, Notifications)        │
├─────────────────────────────────────────────────┤
│  Sidebar Menu  │  Main Content Area             │
│                │                                 │
│  - Dashboard   │  [Page Content]                │
│  - Clients     │                                 │
│  - Tasks       │                                 │
│  - Timesheets  │                                 │
│  - Payroll     │                                 │
│  - Reports     │                                 │
│  - Settings    │                                 │
│                │                                 │
└─────────────────────────────────────────────────┘
```

### Color Scheme
- **Primary**: Ant Design Vue 預設藍色
- **Success**: 綠色（成功狀態）
- **Warning**: 橙色（警告狀態）
- **Error**: 紅色（錯誤狀態）
- **Info**: 藍色（資訊狀態）

### Typography
- **Font Family**: Ant Design Vue 預設字體
- **Font Sizes**: 使用 Ant Design Vue 預設字體大小
- **Line Height**: 1.5

### 用戶反饋規範 (User Feedback Standards)

**⚠️ 重要：嚴禁使用瀏覽器原生彈窗**

#### 禁止使用的交互方式

以下瀏覽器原生 API **嚴禁使用**：
- ❌ `alert()` - 瀏覽器原生警告彈窗
- ❌ `confirm()` - 瀏覽器原生確認框
- ❌ `prompt()` - 瀏覽器原生輸入框

**原因**：
- 破壞用戶體驗一致性
- 無法自定義樣式和位置
- 不符合現代 Web 應用設計規範

#### 必須使用的交互方式

**1. 成功提示 (Success Messages)**
- 使用：`message.success()`
- 位置：頁面右上角
- 顯示時間：3 秒（預設）
- 使用場景：操作成功後的提示
- 範例：
  ```javascript
  import { message } from 'ant-design-vue'
  message.success('客戶資料已儲存')
  ```

**2. 錯誤提示 (Error Messages)**
- 使用：`message.error()`
- 位置：頁面右上角
- 顯示時間：4.5 秒（預設，錯誤訊息需要更長時間閱讀）
- 使用場景：操作失敗、驗證錯誤、API 錯誤
- 範例：
  ```javascript
  import { message } from 'ant-design-vue'
  message.error('儲存失敗，請檢查網路連線後重試')
  ```

**3. 警告提示 (Warning Messages)**
- 使用：`message.warning()`
- 位置：頁面右上角
- 顯示時間：3 秒（預設）
- 使用場景：需要用戶注意但不影響操作的情況
- 範例：
  ```javascript
  import { message } from 'ant-design-vue'
  message.warning('部分資料尚未儲存')
  ```

**4. 資訊提示 (Info Messages)**
- 使用：`message.info()`
- 位置：頁面右上角
- 顯示時間：3 秒（預設）
- 使用場景：一般性資訊提示
- 範例：
  ```javascript
  import { message } from 'ant-design-vue'
  message.info('資料已自動儲存')
  ```

**5. 確認操作 (Confirmation)**
- 使用：`<a-popconfirm>` 組件
- 位置：按鈕或操作元素附近（懸浮顯示）
- 使用場景：刪除、重要操作前的確認
- 範例：
  ```vue
  <template>
    <a-popconfirm
      title="確定要刪除這個客戶嗎？"
      ok-text="確定"
      cancel-text="取消"
      @confirm="handleDelete"
    >
      <a-button danger>刪除</a-button>
    </a-popconfirm>
  </template>
  ```

**6. 重要通知 (Important Notifications)**
- 使用：`notification`
- 位置：頁面右上角
- 特點：可手動關閉，可顯示更多內容
- 使用場景：重要系統通知、長時間運行的任務完成通知
- 範例：
  ```javascript
  import { notification } from 'ant-design-vue'
  notification.success({
    message: '任務完成',
    description: '所有客戶資料已成功匯出',
    duration: 0 // 不自動關閉，需手動關閉
  })
  ```

#### 提示訊息內容規範

**語言**：
- 使用繁體中文
- 技術術語可使用英文（如 API、URL 等）

**內容要求**：
- **簡潔明確**：一句話說明問題或結果
- **可操作性**：錯誤訊息需包含可操作的建議
- **友善語氣**：使用友善、專業的語氣

**好的範例**：
- ✅ `客戶資料已儲存`
- ✅ `儲存失敗，請檢查網路連線後重試`
- ✅ `確定要刪除這個客戶嗎？刪除後無法復原。`
- ✅ `表單驗證失敗，請檢查紅色標記的欄位`

**不好的範例**：
- ❌ `錯誤`（太簡短，沒有說明）
- ❌ `操作失敗`（沒有說明原因或解決方法）
- ❌ `Error: 500 Internal Server Error`（技術術語，用戶無法理解）
- ❌ `你確定嗎？`（沒有說明要確認什麼操作）

#### 錯誤訊息分類處理

**API 錯誤**：
- 網路錯誤：`網路連線失敗，請檢查網路後重試`
- 認證錯誤：`登入已過期，請重新登入`
- 權限錯誤：`您沒有權限執行此操作`
- 驗證錯誤：顯示具體的驗證錯誤訊息（從 API 回應中提取）
- 伺服器錯誤：`伺服器發生錯誤，請稍後再試或聯繫管理員`

**表單驗證錯誤**：
- 使用 Ant Design Vue Form 的內建驗證提示
- 在欄位下方顯示紅色錯誤訊息
- 提交時統一顯示所有驗證錯誤

**業務邏輯錯誤**：
- 顯示具體的業務規則違反原因
- 例如：`此客戶已有進行中的服務，無法刪除`

#### 加載狀態規範 (Loading States)

**1. 頁面/區塊加載 (Page/Section Loading)**
- 使用：`<a-spin>` 組件包裹整個內容區域
- 使用場景：頁面初始化、區塊數據載入
- 範例：
  ```vue
  <template>
    <a-spin :spinning="loading" tip="載入中...">
      <div class="content">
        <!-- 內容 -->
      </div>
    </a-spin>
  </template>
  ```

**2. 按鈕加載狀態 (Button Loading)**
- 使用：按鈕的 `:loading` 屬性
- 使用場景：表單提交、操作執行中
- 範例：
  ```vue
  <template>
    <a-button type="primary" :loading="saving" @click="handleSave">
      儲存
    </a-button>
  </template>
  ```

**3. 表格加載狀態 (Table Loading)**
- 使用：`<a-spin>` 包裹表格，或表格的 `:loading` 屬性
- 使用場景：表格數據載入、刷新
- 範例：
  ```vue
  <template>
    <a-spin :spinning="loading">
      <a-table :columns="columns" :data-source="data" />
    </a-spin>
  </template>
  ```

**4. 狀態標籤 (Status Tags)**
- 使用：`<a-tag>` 顯示載入狀態
- 使用場景：報表區塊、長時間運行的任務
- 範例：
  ```vue
  <template>
    <a-tag v-if="status === 'loading'" color="processing">載入中</a-tag>
    <a-tag v-else-if="status === 'success'" color="success">已載入</a-tag>
    <a-tag v-else-if="status === 'error'" color="error">載入失敗</a-tag>
  </template>
  ```

**加載狀態最佳實踐**：
- 加載時間 < 1 秒：不需要顯示加載狀態
- 加載時間 1-3 秒：顯示按鈕 loading 或輕量級提示
- 加載時間 > 3 秒：顯示 Spin 組件和提示文字
- 長時間加載（> 10 秒）：考慮使用進度條或通知

#### 撤銷操作規範 (Undo Functionality)

**使用場景**：
- 刪除操作後提供撤銷功能
- 批量操作後提供撤銷功能
- 重要操作後提供撤銷功能

**實現方式**：
- 使用 `notification` 顯示操作成功訊息，並提供「撤銷」按鈕
- 撤銷操作的有效時間：30 秒（可配置）
- 撤銷後恢復原狀態，並顯示確認訊息

**範例**：
```javascript
import { notification } from 'ant-design-vue'

// 刪除操作
const handleDelete = async (id) => {
  await deleteItem(id)
  
  // 顯示撤銷通知
  const key = `delete-${id}`
  notification.success({
    message: '已刪除',
    description: '項目已成功刪除',
    key,
    duration: 0, // 不自動關閉
    btn: h('a-button', {
      type: 'primary',
      size: 'small',
      onClick: async () => {
        await restoreItem(id) // 恢復操作
        notification.close(key)
        message.success('已恢復')
      }
    }, '撤銷')
  })
  
  // 30 秒後自動關閉通知（撤銷功能失效）
  setTimeout(() => {
    notification.close(key)
  }, 30000)
}
```

**撤銷操作限制**：
- 僅適用於可逆操作（刪除、狀態變更等）
- 不適用於不可逆操作（永久刪除、資料覆蓋等）
- 撤銷操作必須在有效時間內執行

#### 空狀態處理規範 (Empty States)

**使用場景**：
- 列表為空時
- 搜尋無結果時
- 資料載入失敗時

**實現方式**：
- 使用 `<a-empty>` 組件
- 提供明確的說明文字和可選的操作按鈕

**範例**：
```vue
<template>
  <!-- 列表為空 -->
  <a-empty v-if="items.length === 0" description="暫無資料">
    <a-button type="primary" @click="handleAdd">新增項目</a-button>
  </a-empty>
  
  <!-- 搜尋無結果 -->
  <a-empty v-else-if="searchNoResult" description="搜尋無結果，請嘗試其他關鍵字" />
  
  <!-- 載入失敗 -->
  <a-empty v-else-if="error" description="載入失敗，請重試">
    <a-button type="primary" @click="handleRetry">重試</a-button>
  </a-empty>
</template>
```

**空狀態訊息規範**：
- 說明清楚為什麼是空的（例如：「暫無客戶資料」而非「無資料」）
- 提供可操作建議（例如：「點擊新增按鈕建立第一個客戶」）
- 使用友善、鼓勵的語氣

---

## Security Design

### Authentication Flow
```
1. User submits login form
2. Frontend sends POST /auth/login
3. Backend validates credentials
4. Backend creates session and sets cookie
5. Frontend stores user info in Pinia store
6. Frontend redirects to dashboard
```

### Authorization
- **Route Guards**: 前端路由守衛檢查認證狀態
- **API Middleware**: 後端中間件檢查 Session
- **Role-based Access**: 基於用戶角色的權限控制

### Data Security
- **Password Hashing**: 使用安全的密碼雜湊算法
- **SQL Injection Prevention**: 使用參數化查詢
- **XSS Prevention**: Vue 自動轉義，避免 XSS 攻擊
- **CSRF Protection**: 使用 SameSite Cookie

---

## Performance Design

### Frontend Optimization
- **Code Splitting**: 路由級代碼分割
- **Lazy Loading**: 組件懶加載
- **Tree Shaking**: 移除未使用代碼
- **Asset Optimization**: 圖片、字體等資源優化
- **Caching**: 瀏覽器快取策略

### Backend Optimization
- **Edge Computing**: 利用 Cloudflare 邊緣節點
- **Database Indexing**: 針對查詢建立索引
- **Caching Strategy**: 
  - KV 快取常用數據
  - 資料庫快取表（ReportCache, PayrollCache 等）
- **Query Optimization**: 優化 SQL 查詢
- **Batch Operations**: 批量處理減少請求

### Database Optimization
- **Indexes**: 針對常用查詢建立索引
- **Query Optimization**: 避免 N+1 查詢
- **Connection Pooling**: Cloudflare D1 自動管理

---

## Error Handling

### Frontend Error Handling
- **API Errors**: 統一錯誤處理，顯示友好錯誤訊息
- **Form Validation**: 表單驗證錯誤提示
- **Network Errors**: 網路錯誤處理和重試機制
- **Global Error Handler**: 全局錯誤處理

### Backend Error Handling
- **Error Response Format**: 統一的錯誤響應格式
- **Error Logging**: 錯誤日誌記錄
- **Error Codes**: 標準化錯誤代碼
- **Exception Handling**: 異常捕獲和處理

### Error Codes
- `AUTH_REQUIRED`: 需要認證
- `AUTH_FAILED`: 認證失敗
- `PERMISSION_DENIED`: 權限不足
- `NOT_FOUND`: 資源不存在
- `VALIDATION_ERROR`: 驗證錯誤
- `INTERNAL_ERROR`: 內部錯誤

---

## 錯誤診斷與修復規範 (Error Diagnosis & Fix Standards)

**⚠️ 重要：遇到錯誤時必須系統化分析，找到根本原因，避免重複調試**

**⚠️ 關鍵原則：AI 必須主動使用 MCP 工具查看錯誤，不需要用戶提供錯誤信息**

### 錯誤診斷流程（必須嚴格執行）

當遇到任何錯誤時（無論是用戶報告還是測試發現），**必須**按以下步驟執行：

#### 步驟 1：主動收集錯誤資訊（使用 MCP 工具）

**⚠️ 重要：AI 必須主動使用 MCP 工具查看錯誤，不要等待用戶提供錯誤信息**

**必須執行的操作**（按順序）：

1. **查看後端日誌**（優先執行）
   - 使用 `get_worker_logs` MCP 工具
   - 查看最近的錯誤日誌（至少 50 行）
   - 過濾錯誤級別的日誌（status: 500, 400 等）
   - 如果錯誤持續發生，使用 `tail_worker_logs` 即時監控

2. **查看瀏覽器控制台錯誤**（如果涉及前端）
   - 使用 Browser MCP 工具的 `browser_console_messages` 方法
   - 查看所有控制台錯誤和警告
   - 截圖保存錯誤信息（使用 `browser_take_screenshot`）

3. **查看網路請求錯誤**（如果涉及 API）
   - 使用 Browser MCP 工具的 `browser_network_requests` 方法
   - 查看失敗的 API 請求（status >= 400）
   - 查看請求詳情（URL、方法、請求體、回應體）

4. **查看 Linter 錯誤**（如果是代碼錯誤）
   - 使用 `read_lints` 工具查看相關文件的 linter 錯誤
   - 檢查語法錯誤、類型錯誤等

5. **查看部署狀態**（如果是部署相關錯誤）
   - 使用 `get_deployment_status` MCP 工具
   - 確認部署是否成功
   - 查看部署日誌

**MCP 工具使用檢查清單**：
- [ ] 已使用 `get_worker_logs` 查看後端日誌（至少 50 行，過濾錯誤）
- [ ] 已使用 `browser_console_messages` 查看瀏覽器控制台錯誤
- [ ] 已使用 `browser_network_requests` 查看失敗的 API 請求
- [ ] 已使用 `read_lints` 查看相關文件的 linter 錯誤（如適用）
- [ ] 已使用 `get_deployment_status` 查看部署狀態（如適用）
- [ ] 已截圖保存關鍵錯誤信息（如適用）

**收集到的資訊**：
1. **錯誤訊息**：從日誌、控制台、網路請求中提取的完整錯誤訊息
2. **錯誤發生位置**：從堆疊追蹤中提取的文件路徑、函數名稱、行號
3. **錯誤發生時機**：從日誌時間戳和用戶操作推斷
4. **相關日誌**：完整的後端日誌上下文
5. **前端錯誤**：瀏覽器控制台的所有錯誤和警告
6. **API 錯誤**：失敗請求的完整詳情（請求/回應）

#### 步驟 2：分析錯誤原因

**必須分析的內容**：
1. **錯誤類型**：
   - 語法錯誤（Syntax Error）
   - 運行時錯誤（Runtime Error）
   - 邏輯錯誤（Logic Error）
   - API 錯誤（API Error）
   - 資料庫錯誤（Database Error）

2. **錯誤根本原因**：
   - 是否缺少必要的欄位或參數？
   - 是否資料庫欄位名稱不一致？
   - 是否 API 路徑或方法錯誤？
   - 是否缺少必要的依賴或導入？
   - 是否資料驗證失敗？

3. **相關代碼檢查**：
   - 查看相關文件的完整代碼
   - 檢查是否有類似的實現可以參考
   - 檢查命名規範是否一致
   - 檢查資料庫結構是否正確

**檢查清單**：
- [ ] 已確定錯誤類型
- [ ] 已分析錯誤根本原因
- [ ] 已查看相關文件的完整代碼
- [ ] 已檢查命名規範一致性
- [ ] 已檢查資料庫結構（如涉及資料庫操作）

#### 步驟 3：查找類似錯誤

**必須執行的檢查**：
1. **搜索類似錯誤**：在代碼庫中搜索類似的錯誤模式
2. **檢查歷史修復**：查看是否有類似的錯誤已經修復過
3. **檢查規範文件**：查看 `design.md` 中是否有相關規範或常見錯誤示例

**檢查清單**：
- [ ] 已在代碼庫中搜索類似錯誤
- [ ] 已檢查是否有歷史修復記錄
- [ ] 已查看規範文件中的常見錯誤示例

#### 步驟 4：制定修復方案

**必須考慮的因素**：
1. **修復範圍**：是否只修復當前錯誤，還是需要全面檢查相關代碼？
2. **影響範圍**：修復是否會影響其他功能？
3. **規範遵循**：修復方案是否符合命名規範、代碼組織規範等？
4. **測試計劃**：修復後如何驗證？

**檢查清單**：
- [ ] 已確定修復範圍
- [ ] 已評估影響範圍
- [ ] 已確認修復方案符合規範
- [ ] 已制定測試計劃

#### 步驟 5：執行修復

**修復原則**：
1. **一次性修復**：不要只修復表面問題，要修復根本原因
2. **全面檢查**：修復後檢查所有相關代碼，確保一致性
3. **遵循規範**：嚴格遵循命名規範、代碼組織規範等
4. **添加註解**：如果是複雜修復，添加註解說明原因

**檢查清單**：
- [ ] 已修復根本原因（而非表面問題）
- [ ] 已檢查所有相關代碼的一致性
- [ ] 已確認修復符合所有規範
- [ ] 已添加必要的註解

#### 步驟 6：驗證修復

**必須執行的驗證**：
1. **功能測試**：使用 Browser MCP 工具測試修復後的功能
2. **回歸測試**：測試相關功能是否正常
3. **日誌檢查**：確認沒有新的錯誤日誌
4. **部署驗證**：部署後再次驗證

**檢查清單**：
- [ ] 已使用 Browser MCP 工具測試修復後的功能
- [ ] 已測試相關功能（回歸測試）
- [ ] 已檢查日誌確認沒有新錯誤
- [ ] 已部署並驗證

#### 步驟 7：清理調試信息（必須執行）

**⚠️ 重要：修復完成後必須清除所有調試信息，保持代碼乾淨簡潔**

**必須清理的內容**：

1. **Console 語句**
   - 移除所有 `console.log()`、`console.error()`、`console.warn()`、`console.debug()` 等調試語句
   - 除非是必要的錯誤日誌（應使用正規的日誌系統）

2. **調試註解**
   - 移除臨時添加的調試註解（例如：`// TODO: 調試用`、`// DEBUG: ...`）
   - 保留必要的業務邏輯註解

3. **臨時變數**
   - 移除僅用於調試的臨時變數
   - 移除未使用的變數

4. **測試代碼**
   - 移除臨時添加的測試代碼
   - 移除硬編碼的測試數據

5. **調試標記**
   - 移除 `debugger` 語句
   - 移除臨時的條件判斷（例如：`if (false) { ... }`）

**清理檢查清單**：
- [ ] 已移除所有 `console.log()` 等調試語句
- [ ] 已移除臨時調試註解
- [ ] 已移除僅用於調試的臨時變數
- [ ] 已移除臨時測試代碼和硬編碼數據
- [ ] 已移除 `debugger` 語句
- [ ] 已檢查代碼是否乾淨簡潔

**清理範例**：

```javascript
// ❌ 修復過程中的調試代碼（必須移除）
console.log('DEBUG: clientData =', clientData)
console.log('DEBUG: formData =', formData)
const debugValue = 'test' // 臨時變數
if (false) { // 臨時測試代碼
  console.log('This is a test')
}

// ✅ 修復完成後的乾淨代碼
// 只保留必要的業務邏輯和註解
const clientData = await fetchClient(clientId)
```

**例外情況**：
- 如果是必要的錯誤日誌，應使用正規的日誌系統（例如：後端使用 `get_worker_logs` 記錄的日誌）
- 如果是重要的業務邏輯註解，應保留並使用繁體中文說明

### 硬編碼規範 (Hardcoding Standards)

**⚠️ 重要：所有硬編碼內容必須先與用戶確認，未經確認不得硬編碼**

#### 禁止硬編碼的情況

以下內容**嚴禁**硬編碼，必須先與用戶確認：

1. **業務數據**
   - 客戶 ID、用戶 ID、任務 ID 等業務實體 ID
   - 固定的業務規則值（例如：預設金額、預設期限等）
   - 業務配置參數

2. **測試數據**
   - 用於測試的假數據
   - 測試用的客戶、任務、用戶等

3. **配置值**
   - API 端點 URL（除非是環境變數）
   - 系統配置參數
   - 預設值（如果可能變動）

4. **臨時值**
   - 臨時用於測試或調試的值
   - 臨時的工作區值

#### 硬編碼前必須執行的步驟

**如果必須使用硬編碼，必須先執行以下步驟**：

1. **說明硬編碼的原因**
   - 為什麼需要硬編碼？
   - 是否有其他替代方案？

2. **說明硬編碼的內容**
   - 具體要硬編碼什麼值？
   - 這個值的來源是什麼？

3. **說明硬編碼的影響**
   - 硬編碼會影響哪些功能？
   - 未來是否需要修改？

4. **請求用戶確認**
   - 明確詢問用戶是否同意硬編碼
   - 等待用戶確認後再執行

**範例**：

```
❌ 錯誤做法：直接硬編碼
const clientId = '12345678' // 直接硬編碼客戶 ID

✅ 正確做法：先詢問用戶
// 需要硬編碼客戶 ID '12345678' 用於測試，是否同意？
// 等待用戶確認後再執行
```

#### 允許硬編碼的情況（仍需說明）

以下情況可以硬編碼，但仍需在代碼中說明原因：

1. **常數值**（不會變動的固定值）
   - 數學常數（例如：`Math.PI`）
   - 標準格式（例如：日期格式 `'YYYY-MM-DD'`）
   - 系統預設值（例如：`DEFAULT_PAGE_SIZE = 50`）

2. **環境變數的預設值**
   - 如果環境變數未設置時的預設值
   - 必須在代碼中說明這是預設值

3. **業務規則的固定值**（已確認的業務規則）
   - 例如：統一編號長度（8 碼或 10 碼）
   - 必須在代碼中添加註解說明這是業務規則

**範例**：

```javascript
// ✅ 允許的硬編碼（常數值，有說明）
const DATE_FORMAT = 'YYYY-MM-DD' // 標準日期格式

// ✅ 允許的硬編碼（預設值，有說明）
const DEFAULT_PAGE_SIZE = 50 // 預設每頁顯示 50 筆（可通過環境變數覆蓋）

// ✅ 允許的硬編碼（業務規則，有說明）
const COMPANY_TAX_ID_LENGTH = 8 // 企業統一編號固定為 8 碼（業務規則）
```

#### 硬編碼檢查清單

在提交代碼前，必須確認：
- [ ] 沒有未經用戶確認的硬編碼業務數據
- [ ] 沒有未經用戶確認的硬編碼測試數據
- [ ] 所有硬編碼的常數值都有註解說明
- [ ] 所有硬編碼的預設值都有註解說明
- [ ] 已移除所有臨時硬編碼的調試值

### 常見錯誤類型與診斷方法

#### 1. 資料庫欄位名稱不一致

**症狀**：
- 錯誤訊息包含 "no such column" 或 "column not found"
- API 返回 500 錯誤
- 資料無法正確讀取或寫入

**診斷步驟**：
1. 查看錯誤訊息中的欄位名稱
2. 使用 `get_database_schema` MCP 工具查詢實際的資料庫結構
3. 檢查 Migration 文件確認正確的欄位名稱
4. 搜索代碼庫中其他地方如何使用該欄位

**修復方法**：
- 統一使用正確的欄位名稱（遵循 `snake_case` 規範）
- 檢查所有相關代碼，確保一致性
- 如果多處使用錯誤名稱，全部修正

**預防措施**：
- 開發前必須先查詢資料庫結構
- 遵循資料庫命名規範

#### 2. API 路徑或方法錯誤

**症狀**：
- 404 錯誤（路徑不存在）
- 405 錯誤（方法不允許）
- API 請求失敗

**診斷步驟**：
1. 查看瀏覽器網路請求詳情（使用 Browser MCP）
2. 檢查後端路由配置
3. 確認 API 路徑和方法是否正確
4. 檢查是否有類似的 API 實現可以參考

**修復方法**：
- 修正 API 路徑或方法
- 確認後端 Handler 函數是否正確導出
- 檢查路由配置是否正確

#### 3. 缺少必要的導入或依賴

**症狀**：
- "is not defined" 錯誤
- "Cannot find module" 錯誤
- 組件或函數無法使用

**診斷步驟**：
1. 查看錯誤訊息中缺少的模組或變數
2. 檢查文件頂部的 Import 語句
3. 確認模組路徑是否正確
4. 檢查是否有類似的文件可以參考 Import 方式

**修復方法**：
- 添加缺少的 Import 語句
- 確認 Import 路徑正確（使用絕對路徑 `@/`）
- 遵循 Import 語句規範（正確的順序和分組）

#### 4. 資料驗證失敗

**症狀**：
- 表單提交失敗
- API 返回驗證錯誤
- 資料無法保存

**診斷步驟**：
1. 查看 API 回應中的驗證錯誤訊息
2. 檢查前端表單驗證規則
3. 檢查後端資料驗證邏輯
4. 確認資料格式是否符合要求

**修復方法**：
- 修正資料格式
- 更新驗證規則
- 確保前後端驗證邏輯一致

#### 5. 邏輯錯誤

**症狀**：
- 功能執行結果不符合預期
- 資料計算錯誤
- 條件判斷錯誤

**診斷步驟**：
1. 查看相關業務邏輯代碼
2. 檢查計算公式或條件判斷
3. 查看 `requirements.md` 確認業務規則
4. 使用 Browser MCP 工具逐步測試

**修復方法**：
- 修正邏輯錯誤
- 添加註解說明複雜邏輯
- 確保符合業務規則

### 避免重複調試的原則

**1. 記錄錯誤和解決方案**：
- 修復錯誤後，在代碼註解中記錄錯誤原因和解決方案
- 如果是常見錯誤，更新 `design.md` 中的常見錯誤示例

**2. 全面檢查而非局部修復**：
- 不要只修復錯誤發生的地方
- 檢查所有相關代碼，確保一致性
- 例如：如果發現欄位名稱錯誤，檢查所有使用該欄位的地方

**3. 遵循規範而非臨時解決**：
- 不要使用臨時方案（HACK）
- 必須遵循命名規範、代碼組織規範等
- 如果發現規範不完善，更新規範文件

**4. 驗證修復效果**：
- 修復後必須完整測試
- 確認沒有引入新問題
- 確認相關功能正常

**5. 學習和改進**：
- 分析錯誤的根本原因
- 思考如何避免類似錯誤
- 更新開發流程規範（如需要）

---

## Testing Strategy

### Frontend Testing
- **Unit Tests**: 組件單元測試（建議使用 Vitest）
- **Integration Tests**: 組件整合測試
- **E2E Tests**: 端到端測試（使用 Playwright）

### Backend Testing
- **Unit Tests**: Handler 單元測試
- **Integration Tests**: API 整合測試
- **Database Tests**: 資料庫操作測試

### Test Coverage Goals
- **Unit Tests**: > 70%
- **Integration Tests**: > 50%
- **E2E Tests**: 關鍵流程 100%

---

## 測試開發規範 (Test Development Standards)

### ⚠️ 關鍵原則：測試前必須考慮的問題

**在編寫任何測試之前，AI 必須主動考慮並解決以下問題，不得等待用戶提出：**

1. **測試數據設置**：測試需要哪些數據？如何設置？
2. **帳號信息**：需要哪些帳號（管理員、員工）？如何獲取或創建？
3. **環境依賴**：測試依賴哪些環境變數或配置？
4. **數據清理**：測試後是否需要清理數據？
5. **測試隔離**：測試之間是否會互相影響？

### E2E 測試開發強制流程

#### 步驟 1: 分析測試需求（必須執行）

在編寫測試代碼前，必須先分析：

1. **測試範圍**：
   - 需要測試哪些功能點？
   - 需要測試哪些驗收標準？
   - 需要測試哪些邊界情況？

2. **測試數據需求**：
   - 需要哪些測試客戶？（企業客戶、個人客戶、未分配負責人的客戶等）
   - 需要哪些測試標籤？
   - 需要哪些測試用戶？（管理員、一般員工）
   - 需要哪些測試服務、任務、收費計劃等？

3. **帳號需求**：
   - 需要管理員帳號嗎？（用於測試管理員專屬功能）
   - 需要一般員工帳號嗎？（用於測試權限控制）
   - 如何獲取或創建這些帳號？

4. **環境依賴**：
   - 需要哪些環境變數？（如 `PLAYWRIGHT_BASE_URL`）
   - 需要哪些 API 端點可用？
   - 需要哪些資料庫表存在？

#### 步驟 2: 設置測試數據（必須執行）

**必須在 `test.beforeAll` 或 `test.beforeEach` 中設置所有必要的測試數據。**

1. **使用測試數據工具**：
   - 使用 `tests/e2e/utils/test-data.ts` 中的工具函數
   - 或創建新的測試數據設置函數（如果需要）

2. **測試數據設置清單**：
   ```typescript
   test.beforeAll(async ({ browser }) => {
     const context = await browser.newContext()
     const page = await context.newPage()
     try {
       // 1. 登入管理員帳號
       await login(page, { username: 'admin', password: '111111' })
       
       // 2. 設置測試數據（使用測試數據工具）
       testData = await setupBR1_1TestData(page)
       
       // 3. 驗證測試數據設置成功
       if (!testData.testClients.length) {
         throw new Error('測試數據設置失敗：沒有創建測試客戶')
       }
       
       console.log('測試數據設置完成:', testData)
     } catch (error) {
       console.error('設置測試數據失敗:', error)
       throw error // 如果測試數據設置失敗，測試應該失敗
     } finally {
       await context.close()
     }
   })
   ```

3. **測試數據要求**：
   - **必須覆蓋所有測試場景**：例如，測試客戶列表時，必須有企業客戶、個人客戶、未分配負責人的客戶等
   - **必須使用真實格式**：統一編號必須符合格式（企業客戶8碼，個人客戶10碼）
   - **必須設置關聯數據**：例如，測試標籤顯示時，必須為客戶添加標籤

#### 步驟 3: 帳號信息管理（必須執行）

1. **默認帳號信息（系統預設）**：
   
   **管理員帳號**：
   - **帳號**: `admin`
   - **密碼**: `111111`
   - **權限**: 管理員 (`is_admin = 1`)
   - **來源**: `backend/migrations/0011_initial_data.sql`
   - **使用方式**: 
     ```typescript
     await login(page, { username: 'admin', password: '111111' })
     // 或使用默認值（已在 auth.ts 中設置）
     await login(page) // 自動使用 admin/111111
     ```

   **其他預設測試帳號**（系統現有帳號）：
   - **`manager`** (經理一) - 密碼: `111111` - 員工角色
   - **`liu`** (劉會計) - 密碼: `111111` - 員工角色
   - **使用方式**:
     ```typescript
     await login(page, { username: 'liu', password: '111111' })
     await login(page, { username: 'manager', password: '111111' })
     ```

   **測試員工帳號**（測試時自動創建）：
   - **帳號**: `test_employee`
   - **密碼**: `111111`
   - **權限**: 非管理員
   - **創建方式**: 使用 `createTestUser` 函數（如果不存在）

2. **環境變數支持**：
   - `TEST_ADMIN_USER` - 可覆蓋管理員帳號（默認: `admin`）
   - `TEST_ADMIN_PASSWORD` - 可覆蓋管理員密碼（默認: `111111`）
   - **使用方式**:
     ```typescript
     // 環境變數會自動被 auth.ts 讀取
     // 或在測試中明確指定
     await login(page, { 
       username: process.env.TEST_ADMIN_USER || 'admin',
       password: process.env.TEST_ADMIN_PASSWORD || '111111'
     })
     ```

3. **帳號獲取流程**：
   ```typescript
   // 在設置測試數據時，必須獲取或創建所需帳號
   const usersResponse = await callAPI(page, 'GET', '/settings/users')
   const adminUser = usersResponse?.data?.find((u: any) => u.is_admin || u.username === 'admin')
   const adminUserId = adminUser?.user_id || adminUser?.id
   
   // 如果測試需要員工帳號，必須創建
   const employeeUser = usersResponse?.data?.find((u: any) => u.username === 'test_employee' && !u.is_admin)
   if (!employeeUser) {
     const employeeUserId = await createTestUser(page, {
       username: 'test_employee',
       name: '測試員工',
       password: '111111',
       isAdmin: false
     })
   }
   ```

4. **權限測試**：
   - 如果測試涉及權限控制（如管理員專屬功能），必須使用對應的帳號登入
   - 必須測試兩種情況：有權限和無權限
   - **範例**:
     ```typescript
     // 測試管理員功能
     test('管理員應該能看到刪除按鈕', async ({ page }) => {
       await login(page, { username: 'admin', password: '111111' })
       await page.goto('/clients')
       const deleteButton = page.locator('button:has-text("刪除")')
       await expect(deleteButton).toBeVisible()
     })
     
     // 測試非管理員功能
     test('一般員工不應該看到刪除按鈕', async ({ page }) => {
       await login(page, { username: 'liu', password: '111111' })
       // 或使用 manager 帳號
       // await login(page, { username: 'manager', password: '111111' })
       await page.goto('/clients')
       const deleteButton = page.locator('button:has-text("刪除")')
       await expect(deleteButton).not.toBeVisible()
     })
     ```

#### 步驟 4: 測試數據驗證（必須執行）

在測試中使用測試數據時，必須：

1. **檢查測試數據是否存在**：
   ```typescript
   // ✅ 正確：檢查測試數據是否存在
   if (testData.testClients.length > 0) {
     const testClient = testData.testClients[0]
     // 使用測試數據進行測試
   } else {
     // 如果沒有測試數據，至少驗證功能存在
     test.skip('測試數據未設置，跳過此測試')
   }
   ```

2. **使用測試數據進行斷言**：
   ```typescript
   // ✅ 正確：使用測試數據進行精確驗證
   const companyClient = testData.testClients.find(c => c.taxId.startsWith('00'))
   if (companyClient) {
     const companyRow = page.locator(`tbody tr`).filter({ hasText: companyClient.companyName }).first()
     const taxIdCell = companyRow.locator('td').nth(headerIndex)
     const displayedText = await taxIdCell.textContent()
     // 驗證企業客戶顯示8碼（去掉00前綴）
     expect(displayedText?.trim()).toMatch(/^\d{8}$/)
   }
   ```

#### 步驟 5: 測試數據清理（可選）

根據測試環境決定是否需要清理：

- **測試環境**：可以保留測試數據（方便調試和重複測試）
- **生產環境**：必須清理測試數據（使用軟刪除或直接刪除）

### 測試數據工具使用規範

#### 必須使用的工具函數

1. **`setupBR1_1TestData(page)`**：設置 BR1.1 測試所需的測試數據
   - 創建測試客戶（企業、個人、未分配）
   - 創建測試標籤
   - 獲取或創建測試用戶

2. **`createTestClient(page, clientData)`**：創建測試客戶
   - 自動處理統一編號格式（8碼自動加00前綴）
   - 自動獲取負責人 ID（如果未指定）

3. **`createTestTag(page, tagData)`**：創建測試標籤

4. **`createTestUser(page, userData)`**：創建測試用戶

5. **`addTagToClient(page, clientId, tagId)`**：為客戶添加標籤

#### 創建新的測試數據設置函數

如果需要為新的測試模組創建測試數據設置函數：

1. **命名規範**：`setup{模組名稱}TestData`，例如 `setupBR1_2TestData`
2. **位置**：`tests/e2e/utils/test-data.ts`
3. **返回值**：必須返回包含所有測試數據的對象
4. **錯誤處理**：必須處理錯誤，並返回部分設置的數據（如果可能）

### 測試編寫檢查清單

在提交測試代碼前，必須確認：

- [ ] **已分析測試需求**：明確需要測試的功能點和驗收標準
- [ ] **已設置測試數據**：在 `beforeAll` 或 `beforeEach` 中設置所有必要的測試數據
- [ ] **已獲取帳號信息**：已獲取或創建所需的管理員/員工帳號
- [ ] **已驗證測試數據**：測試中使用測試數據前已檢查數據是否存在
- [ ] **已使用測試數據**：測試斷言使用具體的測試數據，而非依賴現有數據
- [ ] **已處理邊界情況**：測試包含「沒有測試數據」時的處理邏輯
- [ ] **已設置環境變數**：已確認所需的環境變數（如 `PLAYWRIGHT_BASE_URL`）
- [ ] **已測試權限控制**：如果涉及權限，已測試有權限和無權限兩種情況

### 常見錯誤示例

#### ❌ 錯誤 1: 未設置測試數據，直接使用現有數據

```typescript
// ❌ 錯誤：假設現有數據存在
test('應該顯示客戶列表', async ({ page }) => {
  await page.goto('/clients')
  const firstClient = page.locator('tbody tr').first()
  await expect(firstClient).toBeVisible() // 如果沒有客戶，測試會失敗
})
```

```typescript
// ✅ 正確：先設置測試數據
test.beforeAll(async ({ browser }) => {
  // 設置測試數據
  testData = await setupBR1_1TestData(page)
})

test('應該顯示客戶列表', async ({ page }) => {
  await page.goto('/clients')
  // 使用測試數據驗證
  if (testData.testClients.length > 0) {
    const testClient = testData.testClients[0]
    const clientRow = page.locator(`tbody tr`).filter({ hasText: testClient.companyName }).first()
    await expect(clientRow).toBeVisible()
  }
})
```

#### ❌ 錯誤 2: 未獲取帳號信息，假設帳號存在

```typescript
// ❌ 錯誤：假設管理員帳號存在且可用
test('管理員應該能看到刪除按鈕', async ({ page }) => {
  await login(page) // 假設這是管理員帳號
  await page.goto('/clients')
  const deleteButton = page.locator('button:has-text("刪除")')
  await expect(deleteButton).toBeVisible()
})
```

```typescript
// ✅ 正確：先獲取或創建管理員帳號
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, { username: 'admin', password: '111111' })
  
  // 驗證是管理員帳號
  const usersResponse = await callAPI(page, 'GET', '/settings/users')
  const adminUser = usersResponse?.data?.find((u: any) => u.is_admin)
  if (!adminUser) {
    throw new Error('無法獲取管理員帳號')
  }
  adminUserId = adminUser.user_id
  await context.close()
})

test('管理員應該能看到刪除按鈕', async ({ page }) => {
  await login(page, { username: 'admin', password: '111111' })
  await page.goto('/clients')
  const deleteButton = page.locator('button:has-text("刪除")')
  await expect(deleteButton).toBeVisible()
})
```

#### ❌ 錯誤 3: 未檢查測試數據是否存在

```typescript
// ❌ 錯誤：直接使用測試數據，未檢查是否存在
test('應該顯示統一編號', async ({ page }) => {
  const testClient = testData.testClients[0] // 如果 testClients 為空，會出錯
  const clientRow = page.locator(`tbody tr`).filter({ hasText: testClient.companyName })
  await expect(clientRow).toBeVisible()
})
```

```typescript
// ✅ 正確：先檢查測試數據是否存在
test('應該顯示統一編號', async ({ page }) => {
  if (testData.testClients.length > 0) {
    const testClient = testData.testClients[0]
    const clientRow = page.locator(`tbody tr`).filter({ hasText: testClient.companyName })
    await expect(clientRow).toBeVisible()
  } else {
    test.skip('測試數據未設置')
  }
})
```

### 測試帳號信息快速參考

**系統預設帳號**（可直接使用，無需創建）：
- **管理員**: `admin` / `111111` (ID: 50)
- **一般員工**: `manager` / `111111` (經理一, ID: 51)
- **一般員工**: `liu` / `111111` (劉會計, ID: 52)

**測試時自動創建的帳號**：
- **測試員工**: `test_employee` / `111111` (由 `setupBR1_1TestData` 自動創建)

**環境變數**：
- `TEST_ADMIN_USER` (默認: `admin`)
- `TEST_ADMIN_PASSWORD` (默認: `111111`)

**使用範例**：
```typescript
// 使用默認管理員帳號
await login(page) // 自動使用 admin/111111

// 明確指定帳號
await login(page, { username: 'admin', password: '111111' })

// 使用一般員工帳號
await login(page, { username: 'liu', password: '111111' })
```

### 測試數據工具 API 參考

詳細的測試數據工具 API 請查看 `tests/e2e/utils/test-data.ts`。

**主要函數**：
- `setupBR1_1TestData(page)`: 設置 BR1.1 測試數據（包括創建測試員工帳號）
- `createTestClient(page, clientData)`: 創建測試客戶
- `createTestTag(page, tagData)`: 創建測試標籤
- `createTestUser(page, userData)`: 創建測試用戶
- `addTagToClient(page, clientId, tagId)`: 為客戶添加標籤

**使用範例**：
```typescript
import { setupBR1_1TestData, createTestClient } from './utils/test-data'

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page)
  
  // 使用預設的測試數據設置函數
  testData = await setupBR1_1TestData(page)
  
  // 或創建自定義測試數據
  const customClient = await createTestClient(page, {
    companyName: '自定義測試客戶',
    taxId: '99999999',
    contactPerson1: '測試聯絡人'
  })
  
  await context.close()
})
```

---

## Deployment Design

### Deployment Flow
```
1. Code Commit to Git
2. Build Frontend (npm run build)
3. Deploy Frontend to Cloudflare Pages
4. Deploy Backend to Cloudflare Workers
5. Run Database Migrations (if needed)
6. Verify Deployment
7. Monitor Logs
```

### Environment Configuration
- **Development**: 本地開發環境
- **Staging**: 測試環境（可選）
- **Production**: 生產環境

### Rollback Strategy
- **Frontend**: Cloudflare Pages 支援版本回滾
- **Backend**: Cloudflare Workers 支援版本回滾
- **Database**: 使用資料庫遷移回滾

---

## Monitoring & Logging

### Logging Strategy
- **Frontend Logging**: Console 日誌（開發環境）
- **Backend Logging**: Cloudflare Workers 日誌
- **Error Logging**: 錯誤日誌記錄到資料庫或外部服務

### Monitoring Metrics
- **API Response Time**: API 響應時間監控
- **Error Rate**: 錯誤率監控
- **User Activity**: 用戶活動監控
- **System Health**: 系統健康狀態監控

---

## Future Design Considerations

### Scalability
- **Horizontal Scaling**: Cloudflare Workers 自動擴展
- **Database Scaling**: Cloudflare D1 自動擴展
- **Caching Layer**: 增強快取策略

### Extensibility
- **Plugin System**: 考慮插件系統（未來）
- **API Versioning**: API 版本管理
- **Microservices**: 考慮微服務架構（未來）

### Technology Evolution
- **TypeScript Migration**: 逐步遷移到 TypeScript
- **GraphQL**: 考慮使用 GraphQL（未來）
- **WebSocket**: 實現即時通知（未來）

---

## Design Decisions

### Decision 1: Vue 3 over React
**Rationale**: 
- 團隊熟悉 Vue
- Vue 3 Composition API 更靈活
- Ant Design Vue 提供完整的組件庫

### Decision 2: Cloudflare Workers over Traditional Server
**Rationale**:
- 全球邊緣節點，低延遲
- 自動擴展，無需管理伺服器
- 成本效益高

### Decision 3: D1 (SQLite) over PostgreSQL
**Rationale**:
- Cloudflare 原生支援
- 簡單易用
- 滿足當前業務需求

### Decision 4: RESTful API over GraphQL
**Rationale**:
- 簡單直接
- 團隊熟悉
- 滿足當前需求
- 未來可考慮 GraphQL

---

## Appendix

### Design Tools
- **UI Design**: Ant Design Vue
- **Icons**: @ant-design/icons-vue
- **Charts**: Ant Design Vue Charts（未來）

### Reference Documents
- Ant Design Vue Documentation
- Vue 3 Documentation
- Cloudflare Workers Documentation
- Cloudflare D1 Documentation

---

## Code Standards

> **快速參考**：查看 `.spec-workflow/specs/coding-standards-quick-reference.md` 獲取核心規範摘要和檢查清單。

### 規範導航

- **開發前必讀**：
  - [新功能開發強制流程](#新功能開發強制流程) - 必須先檢查 API 需求
  - [資料庫相關開發強制流程](#資料庫相關開發強制流程) - 必須先查詢現有結構
  - [資料庫表設計規範](#資料庫表設計規範) - 標準欄位清單

- **開發時參考**：
  - [API Handler 開發規範](#api-handler-開發規範) - Handler 結構和錯誤處理
  - [資料庫查詢規範](#資料庫查詢規範) - 參數化查詢和軟刪除處理
  - [前端 API 調用規範](#前端-api-調用規範) - API 調用層結構
  - [輸入驗證規範](#輸入驗證規範) - 前後端驗證要求

- **代碼品質**：
  - [代碼重用規範](#代碼重用規範) - 重用檢查清單
  - [組件設計規範](#組件設計規範可重用性與可擴展性) - 可重用組件設計
  - [性能優化規範](#性能優化規範) - 前端和後端優化

- **代碼風格**：
  - [命名規範](#命名規範-naming-conventions) - 文件、資料庫、代碼命名
  - [代碼註解規範](#代碼註解規範-code-comment-standards) - 何時添加註解
  - [代碼組織規範](#代碼組織規範-code-organization-standards) - 文件結構
  - [文件編碼與代碼風格規範](#文件編碼與代碼風格規範-file-encoding--code-style-standards) - 編碼和格式

- **錯誤處理**：
  - [錯誤診斷與修復規範](#錯誤診斷與修復規範-error-diagnosis--fix-standards) - 7 步驟診斷流程
  - [資料庫遷移規範](#資料庫遷移規範migration-standards) - 外鍵處理策略

---

### 命名規範 (Naming Conventions)

#### 文件命名規範

**前端文件**：
- **Vue 組件**：使用 `PascalCase`，例如 `ClientList.vue`、`TaskDetail.vue`、`PayrollSettingsForm.vue`
- **JavaScript 工具文件**：使用 `camelCase`，例如 `dateUtils.js`、`apiClient.js`、`formatHelpers.js`
- **Store 文件**：使用 `camelCase`，例如 `clientStore.js`、`taskStore.js`、`userStore.js`
- **View 文件**：使用 `PascalCase`，例如 `ClientAdd.vue`、`TaskList.vue`

**後端文件**：
- **Handler 文件**：使用 `kebab-case`，例如 `client-crud.js`、`task-handler.js`、`payroll-calculator.js`
- **工具文件**：使用 `kebab-case`，例如 `payroll-helpers.js`、`date-utils.js`、`validation-helpers.js`
- **Middleware 文件**：使用 `kebab-case`，例如 `auth-middleware.js`、`cors-middleware.js`

**資料庫文件**：
- **Migration 文件**：使用 `數字_描述.sql` 格式，例如 `0001_core_tables.sql`、`0029_update_salary_item_categories.sql`
- 數字部分必須連續且遞增
- 描述部分使用 `snake_case`，清楚說明遷移內容

#### 資料庫命名規範

**⚠️ 重要：開發新功能前必須先查詢現有資料庫結構**

在開發任何涉及資料庫的新功能前，**必須**：
1. 先查詢現有資料庫表結構（使用 `get_database_schema` MCP 工具或查看 `backend/migrations/` 目錄）
2. 確認現有表的欄位命名規範
3. 確認是否有可重用的欄位或表
4. **嚴禁自行編造欄位名稱**，必須遵循現有命名規範

**表名 (Table Names)**：
- 使用 `PascalCase`（首字母大寫，單詞首字母大寫）
- 複數形式，例如 `Users`、`Clients`、`ActiveTasks`、`DashboardAlerts`、`SalaryItemTypes`
- 關聯表使用組合名稱，例如 `ClientTagAssignments`、`ClientServiceTaskConfigs`

**欄位名 (Column Names)**：
- 使用 `snake_case`（全小寫，單詞間用底線分隔）
- 主鍵：`表名_id` 格式，例如 `user_id`、`client_id`、`task_id`
- 外鍵：`關聯表名_id` 格式，例如 `assignee_user_id`、`created_by`（指向 Users 表）
- 布林值：`is_` 前綴，例如 `is_deleted`、`is_admin`、`is_active`
- 時間戳：`created_at`、`updated_at`、`deleted_at`
- 金額：使用 `_cents` 後綴（以分為單位），例如 `amount_cents`、`base_salary_cents`
- 日期：使用 `_date` 後綴，例如 `birth_date`、`start_date`、`due_date`
- 時間：使用 `_at` 後綴，例如 `created_at`、`updated_at`、`completed_at`

**索引名 (Index Names)**：
- 使用 `idx_` 前綴 + 表名（小寫）+ 欄位名
- 例如 `idx_users_username`、`idx_clients_assignee`、`idx_active_tasks_component`
- 複合索引：`idx_表名_欄位1_欄位2`，例如 `idx_tasks_client_status`

**約束名 (Constraint Names)**：
- 外鍵約束：`fk_表名_欄位名`，例如 `fk_clients_assignee_user_id`
- 唯一約束：`uk_表名_欄位名`，例如 `uk_users_username`

#### 代碼命名規範

**變數和函數**：
- 使用 `camelCase`，例如 `getClientList`、`calculatePayroll`、`formatDate`
- 布林值變數使用 `is`、`has`、`can` 前綴，例如 `isLoading`、`hasPermission`、`canEdit`

**常數**：
- 使用 `UPPER_SNAKE_CASE`，例如 `MAX_RETRY_COUNT`、`DEFAULT_PAGE_SIZE`、`API_BASE_URL`

**類別**：
- 使用 `PascalCase`，例如 `ApiClient`、`DateFormatter`、`PayrollCalculator`

**組件 Props**：
- 使用 `camelCase`，例如 `clientId`、`isEditable`、`onSubmit`

---

### 開發流程規範

#### 新功能開發強制流程

**⚠️ 重要：開發新功能前必須先檢查 API 需求，前端和後端必須同步開發**

**在開發任何新功能前，必須執行以下步驟**：

1. **分析功能需求**
   - 列出所有需要實現的功能點
   - 確定哪些功能需要前端實現
   - 確定哪些功能需要後端 API 支持

2. **檢查現有 API**
   - 使用 `get_database_schema` MCP 工具查詢現有 API 端點（如有 API 文檔）
   - 查看 `backend/src/handlers/` 目錄，確認是否有現有的 API 可以重用
   - 查看 `src/api/` 目錄，確認前端 API 調用層是否已有相關函數

3. **列出所需 API 端點**
   - 列出所有需要的新 API 端點（方法、路徑、請求格式、回應格式）
   - 列出所有需要修改的現有 API 端點
   - 確認每個前端功能都有對應的 API 支持

4. **制定開發計劃**
   - **必須先實現後端 API，再實現前端功能**
   - 或前端和後端同步開發（但必須確保 API 先完成）
   - 列出開發順序和依賴關係

**開發前檢查清單**：

- [ ] **已分析功能需求**
  - 已列出所有需要實現的功能點
  - 已確定前端和後端的分工

- [ ] **已檢查現有 API**
  - 已查看 `backend/src/handlers/` 目錄，確認是否有現有 API
  - 已查看 `src/api/` 目錄，確認前端 API 調用層
  - 已確認哪些 API 可以重用，哪些需要新建

- [ ] **已列出所需 API 端點**
  - 已列出所有需要的新 API 端點（方法、路徑、請求格式、回應格式）
  - 已列出所有需要修改的現有 API 端點
  - 已確認每個前端功能都有對應的 API 支持

- [ ] **已制定開發計劃**
  - 已確定開發順序（後端 API 優先）
  - 已確認前端和後端的依賴關係

**開發順序要求**：

1. **第一步：實現後端 API**
   - 創建或修改 Handler 文件
   - 實現 API 邏輯
   - 測試 API（使用 MCP 工具或測試腳本）

2. **第二步：實現前端 API 調用層**
   - 在 `src/api/` 目錄中創建或修改 API 調用函數
   - 確保 API 調用函數的參數和返回值格式正確

3. **第三步：實現前端功能**
   - 在組件中調用 API 函數
   - 實現 UI 和交互邏輯
   - 處理 API 回應和錯誤

**常見錯誤示例（嚴禁重複）**：

1. **錯誤**：先實現前端功能，後發現缺少 API
   - 前端按鈕已實現，但點擊後報錯「API not found」
   - 需要用戶貼錯誤信息，AI 才發現缺少 API

2. **錯誤**：前端和後端不同步
   - 前端調用的 API 路徑與後端實際路徑不一致
   - 前端請求格式與後端期望格式不一致
   - 前端期望的回應格式與後端實際回應格式不一致

3. **錯誤**：未檢查現有 API
   - 重複實現已存在的 API
   - 使用錯誤的 API 路徑或方法

**違反此流程的後果**：
- 前端功能無法正常工作，需要用戶報告錯誤
- 需要額外的時間修復 API 問題
- 影響開發效率和用戶體驗

#### API Handler 開發規範

**⚠️ 重要：所有 API Handler 必須遵循統一的開發規範**

**必須使用的工具函數**：
- **成功回應**：使用 `successResponse(data, message, requestId, extraMeta)`
- **錯誤回應**：使用 `errorResponse(status, code, message, errors, requestId)`
- **請求 ID**：使用 `generateRequestId()` 生成唯一的請求 ID

**Handler 函數結構**（必須按此格式）：

```javascript
export async function handleFunctionName(request, env, ctx, requestId, match, url) {
  try {
    // 1. 驗證用戶身份
    const user = ctx?.user
    if (!user || !user.user_id) {
      return errorResponse(401, "AUTH_REQUIRED", "未登入或身份驗證失敗", null, requestId)
    }
    
    // 2. 驗證權限（如需要）
    if (需要管理員權限 && !user.is_admin) {
      return errorResponse(403, "PERMISSION_DENIED", "需要管理員權限", null, requestId)
    }
    
    // 3. 解析請求參數
    const params = url.searchParams
    const body = await request.json().catch(() => ({}))
    
    // 4. 驗證輸入數據
    if (!body.requiredField) {
      return errorResponse(422, "VALIDATION_ERROR", "缺少必要欄位", null, requestId)
    }
    
    // 5. 執行業務邏輯
    // ... 資料庫操作等
    
    // 6. 返回成功回應
    return successResponse(data, "操作成功", requestId)
    
  } catch (err) {
    // 7. 錯誤處理
    console.error(`[ModuleName] Error:`, err)
    return errorResponse(500, "INTERNAL_ERROR", `伺服器錯誤: ${err.message}`, null, requestId)
  }
}
```

**錯誤處理要求**：
- 所有 Handler 必須使用 `try-catch` 包裹
- 必須記錄錯誤日誌（使用 `console.error`）
- 必須返回統一的錯誤回應格式
- 生產環境不應返回詳細錯誤堆疊（僅開發環境）

**認證和權限檢查**：
- 所有需要認證的 API 必須檢查 `ctx?.user`
- 管理員專用功能必須檢查 `user.is_admin`
- 必須返回適當的錯誤碼（401、403）

#### 資料庫查詢規範

**⚠️ 重要：所有資料庫查詢必須使用參數化查詢，防止 SQL 注入**

**必須使用參數化查詢**：
- **嚴禁**直接拼接用戶輸入到 SQL 語句中
- **必須**使用 `.bind()` 方法綁定參數
- 使用 `where` 數組和 `binds` 數組構建動態查詢

**正確範例**：
```javascript
// ✅ 正確：使用參數化查詢
const where = ["c.is_deleted = 0"]
const binds = []

if (searchQuery) {
  where.push("(c.company_name LIKE ? OR c.tax_registration_number LIKE ?)")
  binds.push(`%${searchQuery}%`, `%${searchQuery}%`)
}

const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
const rows = await env.DATABASE.prepare(
  `SELECT * FROM Clients c ${whereSql}`
).bind(...binds).all()
```

**錯誤範例**：
```javascript
// ❌ 錯誤：直接拼接用戶輸入（SQL 注入風險）
const query = `SELECT * FROM Clients WHERE company_name LIKE '%${searchQuery}%'`
const rows = await env.DATABASE.prepare(query).all()
```

**軟刪除處理**：
- **所有查詢必須過濾已刪除的記錄**（`is_deleted = 0`）
- 除非明確需要查詢已刪除的記錄（例如：恢復功能）
- 範例：
  ```javascript
  const where = ["c.is_deleted = 0"] // 必須包含軟刪除過濾
  ```

**查詢優化**：
- 避免 N+1 查詢問題（使用批量查詢）
- 使用適當的索引欄位進行查詢
- 限制查詢結果數量（使用 `LIMIT`）

#### 前端 API 調用規範

**⚠️ 重要：所有前端 API 調用必須使用統一的工具函數處理回應**

**必須使用的工具函數**：
- **提取數據**：使用 `extractApiData(response, defaultValue)`
- **提取數組**：使用 `extractApiArray(response, defaultValue)`
- **提取對象**：使用 `extractApiObject(response, defaultValue)`
- **檢查成功**：使用 `isApiSuccess(response)`
- **提取錯誤**：使用 `extractApiError(response, defaultMessage)`

**API 調用層結構**（`src/api/` 目錄）：

```javascript
// src/api/clients.js
import { apiClient } from './client'
import { extractApiData, extractApiArray, extractApiError } from '@/utils/apiHelpers'

export function useClientsApi() {
  return {
    // 獲取客戶列表
    async getClientList(params = {}) {
      try {
        const response = await apiClient.get('/clients', { params })
        if (response.ok) {
          return response
        } else {
          throw new Error(extractApiError(response, '獲取客戶列表失敗'))
        }
      } catch (error) {
        console.error('API Error:', error)
        throw error
      }
    },
    
    // 創建客戶
    async createClient(data) {
      try {
        const response = await apiClient.post('/clients', data)
        if (response.ok) {
          return response
        } else {
          throw new Error(extractApiError(response, '創建客戶失敗'))
        }
      } catch (error) {
        console.error('API Error:', error)
        throw error
      }
    }
  }
}
```

**組件中使用 API**：

```javascript
// 在組件中使用
import { useClientsApi } from '@/api/clients'
import { extractApiData, extractApiArray, showError } from '@/utils'

const api = useClientsApi()

async function loadClients() {
  loading.value = true
  try {
    const response = await api.getClientList({ page: 1, perPage: 50 })
    const data = extractApiArray(response, [])
    clients.value = data
  } catch (error) {
    showError(extractApiError(error, '載入客戶列表失敗'))
  } finally {
    loading.value = false
  }
}
```

**錯誤處理要求**：
- 必須使用 `try-catch` 包裹所有 API 調用
- 必須使用 `extractApiError` 提取錯誤訊息
- 必須使用 `showError` 顯示錯誤提示（遵循用戶反饋規範）
- 必須處理 loading 狀態

#### 輸入驗證規範

**⚠️ 重要：前端和後端都必須進行輸入驗證，確保數據安全**

**前端驗證要求**：
- 所有表單必須使用 Ant Design Vue Form 的驗證規則
- 必須在提交前驗證所有必填欄位
- 必須驗證數據格式（例如：郵箱格式、電話格式、日期格式等）
- 必須提供清晰的驗證錯誤提示

**後端驗證要求**：
- 所有 API 必須驗證輸入數據
- 必須驗證必填欄位
- 必須驗證數據格式和類型
- 必須驗證數據範圍（例如：金額不能為負數）
- 必須驗證業務規則（例如：統一編號格式、日期邏輯等）

**驗證規則一致性**：
- 前端和後端的驗證規則必須一致
- 前端驗證用於提升用戶體驗（即時反饋）
- 後端驗證用於確保數據安全（防止繞過前端驗證）

**範例**：
```javascript
// 前端驗證（Vue 組件）
const rules = {
  company_name: [
    { required: true, message: '請輸入公司名稱', trigger: 'blur' },
    { min: 2, max: 100, message: '公司名稱長度應在 2-100 個字符之間', trigger: 'blur' }
  ],
  tax_registration_number: [
    { required: true, message: '請輸入統一編號', trigger: 'blur' },
    { pattern: /^\d{8}$/, message: '統一編號必須是 8 碼數字', trigger: 'blur' }
  ]
}

// 後端驗證（Handler）
if (!body.company_name || body.company_name.trim().length < 2) {
  return errorResponse(422, "VALIDATION_ERROR", "公司名稱不能為空且長度至少 2 個字符", null, requestId)
}
if (!body.tax_registration_number || !/^\d{8}$/.test(body.tax_registration_number)) {
  return errorResponse(422, "VALIDATION_ERROR", "統一編號必須是 8 碼數字", null, requestId)
}
```

#### 狀態管理規範（Pinia Store）

**⚠️ 重要：合理使用 Store，避免過度使用或使用不足**

**何時使用 Store**：
- ✅ 多個組件需要共享的狀態
- ✅ 需要持久化的狀態（例如：用戶信息、登入狀態）
- ✅ 複雜的業務邏輯狀態（例如：客戶列表、任務列表）
- ✅ 需要跨頁面共享的數據

**何時不使用 Store**：
- ❌ 僅在單個組件內使用的狀態（使用 `ref` 或 `reactive`）
- ❌ 表單的臨時狀態（使用組件內的 `ref`）
- ❌ UI 狀態（例如：modal 顯示/隱藏，使用組件內的 `ref`）

**Store 結構規範**：

```javascript
// src/stores/clients.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useClientsApi } from '@/api/clients'
import { extractApiArray } from '@/utils/apiHelpers'

export const useClientStore = defineStore('clients', () => {
  // 1. 狀態定義
  const clients = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // 2. 計算屬性
  const clientCount = computed(() => clients.value.length)
  const activeClients = computed(() => clients.value.filter(c => !c.is_deleted))
  
  // 3. Actions（異步操作）
  async function loadClients(params = {}) {
    loading.value = true
    error.value = null
    try {
      const api = useClientsApi()
      const response = await api.getClientList(params)
      clients.value = extractApiArray(response, [])
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  async function createClient(data) {
    // 創建邏輯
  }
  
  // 4. Getters（同步計算）
  function getClientById(id) {
    return clients.value.find(c => c.client_id === id)
  }
  
  return {
    // 狀態
    clients,
    loading,
    error,
    // 計算屬性
    clientCount,
    activeClients,
    // Actions
    loadClients,
    createClient,
    // Getters
    getClientById
  }
})
```

**Store 使用規範**：
- Store 必須使用 Composition API 風格（`defineStore` 的第二個參數是函數）
- 狀態使用 `ref` 或 `reactive`
- 計算屬性使用 `computed`
- Actions 必須是 `async` 函數
- 必須處理 loading 和 error 狀態

#### 資料庫表設計規範

**⚠️ 重要：所有資料庫表必須包含標準欄位，確保一致性和可擴展性**

**標準欄位清單（所有表必須包含）**：

1. **時間戳欄位**（必須）：
   - `created_at TEXT DEFAULT (datetime('now'))` - 記錄創建時間
   - `updated_at TEXT DEFAULT (datetime('now'))` - 記錄最後更新時間

2. **軟刪除欄位**（必須，除非是系統表或日誌表）：
   - `is_deleted BOOLEAN DEFAULT 0` - 軟刪除標記（0=未刪除，1=已刪除）
   - `deleted_at TEXT` - 刪除時間（可選，但建議包含）
   - `deleted_by INTEGER` - 刪除人 ID（可選，但建議包含，外鍵關聯 Users）

3. **主鍵欄位**（必須）：
   - 主鍵必須明確定義（`PRIMARY KEY`）
   - 主鍵命名：`表名_id`（例如：`client_id`、`user_id`、`task_id`）
   - 主鍵類型：`INTEGER PRIMARY KEY AUTOINCREMENT`（自增）或 `TEXT PRIMARY KEY`（自定義）

**標準欄位使用規範**：

```sql
-- ✅ 正確：包含所有標準欄位
CREATE TABLE IF NOT EXISTS ExampleTable (
  example_id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 業務欄位
  name TEXT NOT NULL,
  -- 標準欄位
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);

-- ❌ 錯誤：缺少標準欄位
CREATE TABLE IF NOT EXISTS ExampleTable (
  example_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
  -- 缺少 created_at, updated_at, is_deleted
);
```

**特殊情況說明**：

1. **系統表**（例如：`sessions`、`CacheData`）：
   - 可以不包含 `is_deleted`（使用過期時間或直接刪除）
   - 但必須包含 `created_at`

2. **日誌表**（例如：`TaskEventLogs`）：
   - 可以不包含 `is_deleted`（日誌通常不刪除）
   - 但必須包含 `created_at`

3. **關聯表**（例如：`ClientTagAssignments`）：
   - 必須包含所有標準欄位
   - 必須包含 `is_deleted`（支持軟刪除）

**索引設計規範**：

1. **必須創建的索引**：
   - 主鍵索引（自動創建）
   - 外鍵索引（所有外鍵欄位）
   - 軟刪除索引（`is_deleted`，用於過濾查詢）
   - 時間戳索引（`created_at`、`updated_at`，用於排序和篩選）

2. **索引命名規範**：
   - 單欄位索引：`idx_表名_欄位名`
   - 複合索引：`idx_表名_欄位1_欄位2`
   - 條件索引：`idx_表名_欄位名_條件`（例如：`idx_tasks_due_date_deleted`）

3. **索引範例**：
```sql
-- 外鍵索引
CREATE INDEX IF NOT EXISTS idx_example_user_id ON ExampleTable(user_id);

-- 軟刪除索引（條件索引）
CREATE INDEX IF NOT EXISTS idx_example_deleted ON ExampleTable(is_deleted) WHERE is_deleted = 0;

-- 時間戳索引
CREATE INDEX IF NOT EXISTS idx_example_created ON ExampleTable(created_at DESC);

-- 複合索引（用於常見查詢）
CREATE INDEX IF NOT EXISTS idx_example_user_created ON ExampleTable(user_id, created_at DESC) WHERE is_deleted = 0;
```

**外鍵設計規範**：

1. **外鍵命名規範**：
   - 外鍵欄位命名：`關聯表名_id`（例如：`user_id`、`client_id`）
   - 外鍵約束命名：`fk_表名_欄位名`（例如：`fk_example_user_id`）

2. **外鍵約束**：
   - 必須定義外鍵約束（`FOREIGN KEY`）
   - 必須指定關聯表和欄位
   - 建議使用 `ON DELETE SET NULL` 或 `ON DELETE CASCADE`（根據業務需求）

3. **外鍵範例**：
```sql
CREATE TABLE IF NOT EXISTS ExampleTable (
  example_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_id TEXT,
  -- 外鍵約束
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE SET NULL
);
```

**資料庫表設計檢查清單**：

在創建新表或修改現有表前，必須檢查以下項目：

- [ ] **標準欄位檢查**
  - [ ] 已包含 `created_at TEXT DEFAULT (datetime('now'))`
  - [ ] 已包含 `updated_at TEXT DEFAULT (datetime('now'))`
  - [ ] 已包含 `is_deleted BOOLEAN DEFAULT 0`（如適用）
  - [ ] 已包含 `deleted_at TEXT`（如適用）
  - [ ] 已包含 `deleted_by INTEGER`（如適用）

- [ ] **主鍵檢查**
  - [ ] 主鍵已定義
  - [ ] 主鍵命名符合規範（`表名_id`）
  - [ ] 主鍵類型正確（`INTEGER AUTOINCREMENT` 或 `TEXT`）

- [ ] **外鍵檢查**
  - [ ] 所有外鍵欄位已定義外鍵約束
  - [ ] 外鍵欄位命名符合規範（`關聯表名_id`）
  - [ ] 已指定 `ON DELETE` 行為

- [ ] **索引檢查**
  - [ ] 所有外鍵欄位已創建索引
  - [ ] `is_deleted` 欄位已創建條件索引（如適用）
  - [ ] `created_at`、`updated_at` 已創建索引（如需要排序）
  - [ ] 常用查詢欄位已創建索引

- [ ] **命名規範檢查**
  - [ ] 表名使用 `PascalCase`（複數形式）
  - [ ] 欄位名使用 `snake_case`
  - [ ] 索引名使用 `idx_` 前綴
  - [ ] 外鍵約束名使用 `fk_` 前綴

**常見錯誤示例（嚴禁重複）**：

1. **錯誤**：創建表時忘記包含標準欄位
   - 後續需要添加 `created_at`、`updated_at`、`is_deleted` 時需要遷移
   - 導致查詢時需要額外處理缺失欄位

2. **錯誤**：忘記創建外鍵索引
   - 導致關聯查詢性能差
   - 需要後續添加索引

3. **錯誤**：忘記創建軟刪除索引
   - 導致查詢時過濾 `is_deleted = 0` 性能差
   - 需要後續添加條件索引

#### 資料庫相關開發強制流程

**在開發任何涉及資料庫的新功能前，必須執行以下步驟**：

1. **查詢現有資料庫結構**
   - 使用 MCP 工具 `get_database_schema` 查詢現有表結構
   - 或查看 `backend/migrations/` 目錄中的遷移文件
   - 確認相關表的現有欄位和命名規範

2. **確認命名一致性**
   - 檢查是否有相同語義的欄位已存在（例如：`name` vs `user_name` vs `username`）
   - 確認外鍵命名是否符合規範（`表名_id` 格式）
   - 確認時間戳欄位是否使用 `created_at`、`updated_at`

3. **檢查可重用性**
   - 確認是否有現有表可以擴展，而非創建新表
   - 確認是否有現有欄位可以重用，而非新增欄位

4. **遵循現有規範**
   - **嚴禁自行編造欄位名稱**
   - 必須遵循現有的命名規範（表名 `PascalCase`，欄位名 `snake_case`）
   - 必須遵循現有的資料類型約定（金額使用 `_cents`，時間使用 `_at`，布林值使用 `is_` 前綴）

5. **記錄變更**
   - 所有資料庫變更必須通過 Migration 文件記錄
   - Migration 文件名必須遵循 `數字_描述.sql` 格式
   - 在 Migration 文件中註明變更原因和影響範圍

**開發前檢查清單（必須逐項確認）**：

在開始編寫任何涉及資料庫的代碼前，必須完成以下檢查：

- [ ] **已查詢相關表的完整結構**
  - 使用 `get_database_schema` MCP 工具查詢
  - 或查看 `backend/migrations/` 目錄中所有相關遷移文件
  - 確認表的所有欄位名稱、類型、約束

- [ ] **已確認欄位命名一致性**
  - 檢查是否有相同語義的欄位已存在（例如：`name` vs `user_name` vs `username`）
  - 確認外鍵命名是否符合 `表名_id` 格式
  - 確認時間戳欄位是否使用 `created_at`、`updated_at`、`deleted_at`
  - 確認布林值欄位是否使用 `is_` 前綴（例如 `is_deleted`、`is_active`）
  - 確認金額欄位是否使用 `_cents` 後綴（例如 `amount_cents`、`base_salary_cents`）

- [ ] **已檢查可重用性**
  - 確認是否有現有表可以擴展，而非創建新表
  - 確認是否有現有欄位可以重用，而非新增欄位
  - 確認是否有現有索引可以重用

- [ ] **已確認資料類型一致性**
  - 主鍵類型：`INTEGER PRIMARY KEY AUTOINCREMENT` 或 `TEXT PRIMARY KEY`
  - 外鍵類型：必須與被引用表的主鍵類型一致
  - 時間戳類型：使用 `TEXT` 存儲 ISO 8601 格式字符串
  - 布林值類型：使用 `BOOLEAN` 或 `INTEGER`（0/1）
  - 金額類型：使用 `INTEGER` 存儲分（cents）

- [ ] **已確認索引需求**
  - 檢查是否需要為新欄位創建索引
  - 確認索引命名是否符合 `idx_表名_欄位名` 格式
  - 確認是否已有類似索引可以重用

**常見錯誤示例（嚴禁重複）**：

1. **錯誤**：自行編造欄位名稱，例如：
   - 使用 `userName` 而不是 `username`
   - 使用 `createTime` 而不是 `created_at`
   - 使用 `isDelete` 而不是 `is_deleted`
   - 使用 `amount` 而不是 `amount_cents`（金額欄位）

2. **錯誤**：不檢查現有表結構就新增欄位，導致：
   - 欄位已存在但名稱不同（例如：`name` vs `user_name`）
   - 缺少必要的外鍵欄位（例如：`component_id`、`assignee_user_id`）
   - 缺少必要的時間戳欄位（例如：`created_at`、`updated_at`）

3. **錯誤**：不遵循命名規範，導致：
   - 表名使用 `snake_case` 而不是 `PascalCase`（例如：`active_tasks` 應該是 `ActiveTasks`）
   - 欄位名使用 `camelCase` 而不是 `snake_case`（例如：`userId` 應該是 `user_id`）
   - 索引名不符合 `idx_` 前綴規範

**違反此流程的後果**：
- 導致欄位名稱不一致，需要大量調試時間找出問題
- 造成資料庫結構混亂，影響系統穩定性
- 增加後續維護成本
- 需要額外的 Migration 文件修復錯誤（例如：`0012_fix_component_id.sql`）

#### 資料庫遷移規範（Migration Standards）

**⚠️ 重要：創建遷移文件前必須檢查外鍵依賴，避免遷移失敗**

**在創建任何資料庫遷移文件前，必須執行以下步驟**：

1. **檢查外鍵依賴關係**
   - 使用 `get_database_schema` MCP 工具查詢所有表的外鍵關係
   - 或查看 `backend/migrations/` 目錄中所有遷移文件，找出所有 `FOREIGN KEY` 定義
   - 確認哪些表引用了要修改的表
   - 確認哪些表被要修改的表引用

2. **檢查表之間的關聯**
   - 列出所有直接引用目標表的表（子表）
   - 列出所有被目標表引用的表（父表）
   - 確認外鍵的 `ON DELETE` 和 `ON UPDATE` 行為

3. **制定遷移計劃**
   - 確定遷移順序（先處理被引用的表，再處理引用的表）
   - 確定是否需要暫時關閉外鍵檢查（使用 `PRAGMA foreign_keys=OFF`）
   - 確定是否需要重建表（如果外鍵引用需要修改）
   - 確定是否需要遷移數據（如果重建表）

4. **處理外鍵的策略**

   **策略 A：暫時關閉外鍵檢查**（適用於修改欄位、添加欄位等）
   ```sql
   PRAGMA foreign_keys=OFF;
   
   -- 執行遷移操作
   ALTER TABLE TableName ADD COLUMN new_column TEXT;
   
   PRAGMA foreign_keys=ON;
   ```

   **策略 B：重建表**（適用於修改外鍵引用、刪除欄位等）
   ```sql
   PRAGMA foreign_keys=OFF;
   
   -- 1. 暫存舊表
   ALTER TABLE TableName RENAME TO TableName_old;
   
   -- 2. 創建新表（包含正確的外鍵引用）
   CREATE TABLE IF NOT EXISTS TableName (
     -- 新表結構
     FOREIGN KEY (column_id) REFERENCES OtherTable(id) ON DELETE CASCADE
   );
   
   -- 3. 遷移數據
   INSERT INTO TableName SELECT * FROM TableName_old;
   
   -- 4. 刪除舊表
   DROP TABLE TableName_old;
   
   PRAGMA foreign_keys=ON;
   ```

   **策略 C：分步驟遷移**（適用於複雜的遷移）
   - 第一步：創建新表（不包含外鍵）
   - 第二步：遷移數據
   - 第三步：添加外鍵約束
   - 第四步：刪除舊表

**遷移前檢查清單**：

- [ ] **已檢查所有外鍵依賴關係**
  - 已使用 `get_database_schema` MCP 工具查詢所有表的外鍵關係
  - 已列出所有直接引用目標表的表（子表）
  - 已列出所有被目標表引用的表（父表）

- [ ] **已確認外鍵行為**
  - 已確認所有外鍵的 `ON DELETE` 行為（CASCADE、SET NULL、RESTRICT 等）
  - 已確認所有外鍵的 `ON UPDATE` 行為

- [ ] **已制定遷移計劃**
  - 已確定遷移順序
  - 已確定是否需要暫時關閉外鍵檢查
  - 已確定是否需要重建表
  - 已確定是否需要遷移數據

- [ ] **已選擇適當的遷移策略**
  - 已確認使用策略 A、B 或 C
  - 已確認遷移步驟的完整性

**常見遷移場景處理**：

#### 代碼重用規範

**⚠️ 重要：優先重用現有代碼，避免重複實現相同功能**

**重用檢查清單**（開發新功能前必須檢查）：

1. **工具函數重用**：
   - [ ] 檢查 `src/utils/` 目錄是否有可重用的工具函數
   - [ ] 檢查 `backend/src/utils/` 目錄是否有可重用的工具函數
   - [ ] 避免重複實現格式化、驗證、計算等通用功能

2. **組件重用**：
   - [ ] 檢查 `src/components/` 目錄是否有可重用的組件
   - [ ] 檢查 `src/components/common/` 目錄是否有通用組件
   - [ ] 優先使用現有組件，通過 props 和 slots 實現靈活性

3. **API 函數重用**：
   - [ ] 檢查 `src/api/` 目錄是否有可重用的 API 函數
   - [ ] 檢查現有 API 是否支持所需功能（可能需要擴展參數）
   - [ ] 避免重複實現相同的 API 調用邏輯

4. **Store 重用**：
   - [ ] 檢查 `src/stores/` 目錄是否有可重用的 Store
   - [ ] 檢查現有 Store 是否包含所需狀態和方法
   - [ ] 避免重複管理相同的狀態

5. **後端 Handler 重用**：
   - [ ] 檢查 `backend/src/handlers/` 目錄是否有可重用的 Handler
   - [ ] 檢查現有 Handler 是否支持所需功能（可能需要擴展）
   - [ ] 避免重複實現相同的業務邏輯

**重用原則**：

1. **DRY 原則**（Don't Repeat Yourself）：
   - 相同的邏輯只實現一次
   - 通過參數化和配置實現靈活性
   - 通過組合和繼承實現擴展

2. **單一職責原則**：
   - 每個函數、組件、類只負責一個功能
   - 通過組合多個小功能實現複雜功能

3. **開放封閉原則**：
   - 對擴展開放，對修改封閉
   - 通過擴展參數、props、配置實現新功能
   - 避免修改現有代碼的核心邏輯

**重用範例**：

```javascript
// ✅ 正確：重用現有工具函數
import { formatDateDisplay } from '@/utils/formatters'
import { extractApiArray } from '@/utils/apiHelpers'

// ❌ 錯誤：重複實現格式化函數
const formatDate = (date) => {
  // 重複實現格式化邏輯
}

// ✅ 正確：重用現有組件
<SearchInput 
  :placeholder="'請輸入關鍵字'"
  @search="handleSearch"
/>

// ❌ 錯誤：重複實現搜索輸入框
<input 
  type="text"
  v-model="searchValue"
  @input="handleInput"
/>

// ✅ 正確：擴展現有 API 函數
const response = await api.getClientList({ 
  page: 1, 
  perPage: 50,
  newFilter: filterValue // 擴展參數
})

// ❌ 錯誤：重複實現 API 調用
const response = await fetch('/api/v2/clients', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
```

#### 組件設計規範（可重用性與可擴展性）

**⚠️ 重要：組件設計必須考慮可重用性和可擴展性**

**組件設計原則**：

1. **單一職責原則**：
   - 每個組件只負責一個功能
   - 避免組件過於複雜（超過 500 行應考慮拆分）

2. **Props 設計**：
   - 使用明確的 props 類型定義
   - 提供合理的預設值
   - 使用 `required` 標記必填 props
   - 使用 `validator` 驗證 props 值

3. **Events 設計**：
   - 使用明確的事件名稱（動詞形式，例如：`update`、`submit`、`cancel`）
   - 傳遞必要的數據（避免傳遞整個對象，只傳遞需要的欄位）
   - 使用 `v-model` 實現雙向綁定（如適用）

4. **Slots 設計**：
   - 使用具名 slots 實現靈活性
   - 提供預設內容（使用 `<slot>` 的預設內容）
   - 使用作用域 slots 傳遞數據給父組件

**組件設計範例**：

```vue
<!-- ✅ 正確：可重用、可擴展的組件 -->
<template>
  <div class="data-table">
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="paginationConfig"
      @change="handleTableChange"
    >
      <!-- 使用作用域 slots 實現靈活性 -->
      <template #action="{ record }">
        <slot name="action" :record="record">
          <!-- 預設操作按鈕 -->
          <a-button @click="handleEdit(record)">編輯</a-button>
        </slot>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true,
    validator: (value) => Array.isArray(value) && value.length > 0
  },
  dataSource: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: [Object, Boolean],
    default: () => ({ current: 1, pageSize: 20 })
  }
})

const emit = defineEmits(['change', 'edit'])

const paginationConfig = computed(() => {
  if (props.pagination === false) return false
  return {
    current: 1,
    pageSize: 20,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 條`,
    ...props.pagination
  }
})

function handleTableChange(pagination, filters, sorter) {
  emit('change', { pagination, filters, sorter })
}

function handleEdit(record) {
  emit('edit', record)
}
</script>
```

**組件重用檢查清單**：

- [ ] **職責單一**
  - [ ] 組件只負責一個功能
  - [ ] 組件不超過 500 行（如超過，考慮拆分）

- [ ] **Props 設計**
  - [ ] 所有 props 都有明確的類型定義
  - [ ] 必填 props 使用 `required: true`
  - [ ] 可選 props 提供合理的預設值
  - [ ] 複雜 props 使用 `validator` 驗證

- [ ] **Events 設計**
  - [ ] 事件名稱使用動詞形式
  - [ ] 事件只傳遞必要的數據
  - [ ] 支持 `v-model`（如適用）

- [ ] **Slots 設計**
  - [ ] 使用具名 slots 實現靈活性
  - [ ] 提供預設內容
  - [ ] 使用作用域 slots 傳遞數據

- [ ] **可擴展性**
  - [ ] 組件可以通過 props 和 slots 擴展功能
  - [ ] 組件不依賴特定的業務邏輯
  - [ ] 組件可以在多個場景中重用

**常見錯誤示例（嚴禁重複）**：

1. **錯誤**：組件包含特定業務邏輯
   - 組件無法在其他場景重用
   - 需要修改組件才能適應新需求

2. **錯誤**：組件 props 設計不合理
   - 缺少必要的 props，導致組件不夠靈活
   - props 過多，導致組件使用複雜

3. **錯誤**：組件不提供 slots
   - 無法自定義組件內容
   - 需要修改組件才能適應新需求

#### 性能優化規範

**⚠️ 重要：確保代碼性能，避免不必要的重渲染和查詢**

**前端性能優化**：

1. **避免不必要的重渲染**：
   - 使用 `computed` 而非 `methods` 計算衍生數據
   - 使用 `v-memo` 緩存列表項渲染（Vue 3.2+）
   - 使用 `shallowRef` 和 `shallowReactive` 減少深度響應式開銷
   - 避免在模板中使用複雜計算

2. **列表渲染優化**：
   - 使用 `v-for` 的 `key` 屬性（必須是唯一且穩定的值）
   - 使用虛擬滾動處理大量數據（Ant Design Vue Table 已支持）
   - 使用分頁而非一次性載入所有數據

3. **組件懶加載**：
   - 使用 `defineAsyncComponent` 懶加載大型組件
   - 使用路由懶加載（`() => import('@/views/...')`）

**後端性能優化**：

1. **資料庫查詢優化**：
   - 避免 N+1 查詢問題（使用批量查詢）
   - 使用適當的索引
   - 限制查詢結果數量（使用 `LIMIT`）
   - 使用條件索引（`WHERE` 子句索引）

2. **緩存策略**：
   - 使用 KV 緩存頻繁查詢的數據
   - 使用適當的緩存過期時間
   - 在數據更新時清除相關緩存

**性能優化檢查清單**：

- [ ] **前端優化**
  - [ ] 使用 `computed` 計算衍生數據
  - [ ] 列表渲染使用 `key` 屬性
  - [ ] 大型組件使用懶加載
  - [ ] 避免在模板中使用複雜計算

- [ ] **後端優化**
  - [ ] 避免 N+1 查詢問題
  - [ ] 使用適當的索引
  - [ ] 限制查詢結果數量
  - [ ] 使用緩存策略（如適用）

**常見錯誤示例（嚴禁重複）**：

1. **錯誤**：在模板中使用複雜計算
   - 導致每次渲染都重新計算
   - 影響性能

2. **錯誤**：N+1 查詢問題
   - 導致大量資料庫查詢
   - 影響性能

3. **錯誤**：忘記使用索引
   - 導致全表掃描
   - 影響查詢性能

**常見遷移場景處理**：

1. **添加欄位**：
   - 通常不需要處理外鍵（除非新欄位是外鍵）
   - 可以直接使用 `ALTER TABLE ADD COLUMN`

2. **修改欄位類型**：
   - 如果欄位被外鍵引用，需要重建表
   - 使用策略 B（重建表）

3. **刪除欄位**：
   - 如果欄位是外鍵或被外鍵引用，需要重建表
   - 使用策略 B（重建表）

4. **修改外鍵引用**：
   - 必須重建表
   - 使用策略 B（重建表）

5. **重命名表**：
   - 必須檢查所有引用該表的表
   - 需要更新所有外鍵引用
   - 使用策略 B（重建表）或策略 C（分步驟遷移）

6. **刪除表**：
   - 必須先刪除所有引用該表的表
   - 或先刪除所有外鍵約束
   - 按依賴順序執行

**遷移文件格式要求**：

```sql
-- ============================================
-- 0034_描述.sql
-- 變更說明：簡要說明變更內容
-- 影響範圍：列出受影響的表和功能
-- 外鍵處理：說明如何處理外鍵（策略 A/B/C）
-- ============================================

-- 外鍵依賴檢查：
-- - 被引用的表：Table1, Table2
-- - 引用此表的表：Table3, Table4

PRAGMA foreign_keys=OFF;

-- 遷移操作...

PRAGMA foreign_keys=ON;
```

**違反此規範的後果**：
- 遷移執行失敗，需要回滾
- 需要創建額外的修復遷移文件（例如：`0021_fix_sop_foreign_keys.sql`）
- 可能導致資料庫結構不一致
- 影響系統穩定性和數據完整性

---

### 代碼註解規範 (Code Comment Standards)

**⚠️ 重要：註解是為了說明「為什麼」而不是「是什麼」**

#### 必須添加註解的情況

以下情況**必須**添加註解：

1. **複雜業務邏輯**
   - 計算公式、複雜的條件判斷
   - 非直觀的業務規則實現
   - 範例：
     ```javascript
     // 統一編號：企業客戶自動加前綴 00，個人客戶直接使用身分證號
     const clientId = isCompany 
       ? `00${taxId}` 
       : idNumber
     
     // 計算定期服務收入分攤：總金額按執行次數比例分配
     const totalAmount = billingPlan.total_amount_cents
     const totalExecutions = recurringServices.reduce((sum, s) => sum + s.execution_count, 0)
     const allocatedAmount = (service.execution_count / totalExecutions) * totalAmount
     ```

2. **非直觀的代碼邏輯**
   - 為什麼這樣實現（而不是其他方式）
   - 特殊處理的原因
   - 範例：
     ```javascript
     // 使用軟刪除而非物理刪除，保留歷史記錄供審計使用
     await db.update('Clients')
       .set({ is_deleted: 1, deleted_at: new Date() })
       .where('client_id', '=', clientId)
     ```

3. **臨時解決方案或待辦事項**
   - 使用標準標籤：`TODO`、`FIXME`、`HACK`、`NOTE`
   - 必須說明原因和後續計劃
   - 範例：
     ```javascript
     // TODO: 未來需要改為使用標準工時計算，目前使用執行次數作為臨時方案
     // FIXME: 這裡的計算邏輯在跨年時可能有問題，需要重新檢查（預計 2025-02 修復）
     // HACK: 由於 D1 不支援某些 SQL 語法，使用 JavaScript 實現分組統計
     // NOTE: 此處使用 setTimeout 而非 Promise，因為需要確保執行順序
     ```

4. **公共 API 函數**
   - 函數用途、參數說明、返回值說明
   - 使用 JSDoc 格式（可選，但建議）
   - 範例：
     ```javascript
     /**
      * 計算客戶服務的應計收入
      * @param {Object} service - 客戶服務對象
      * @param {Object} billingPlan - 收費計劃對象
      * @param {Array} allServices - 所有相關服務列表
      * @returns {number} 應計收入（單位：分）
      */
     function calculateAccruedRevenue(service, billingPlan, allServices) {
       // 實現邏輯...
     }
     ```

5. **資料庫查詢的特殊處理**
   - 複雜的 SQL 查詢邏輯
   - 效能優化的原因
   - 範例：
     ```javascript
     // 使用 LEFT JOIN 而非 INNER JOIN，因為需要包含沒有服務的客戶
     const query = db.select('Clients.*', 'ClientServices.service_type')
       .from('Clients')
       .leftJoin('ClientServices', 'Clients.client_id', 'ClientServices.client_id')
     ```

#### 不需要註解的情況

以下情況**不需要**添加註解（代碼本身已足夠清晰）：

1. **自解釋的代碼**
   - 變數名、函數名已清楚說明用途
   - 範例：
     ```javascript
     // ❌ 不需要：說明顯而易見的內容
     // 設定變數為 true
     const isActive = true
     
     // ❌ 不需要：函數名已說明用途
     // 獲取客戶列表
     function getClientList() { ... }
     ```

2. **簡單的 CRUD 操作**
   - 除非有特殊邏輯或需要注意的事項
   - 範例：
     ```javascript
     // ❌ 不需要：標準的 CRUD 操作
     // 創建客戶
     await db.insert('Clients').values(clientData)
     
     // ✅ 需要：有特殊邏輯
     // 創建客戶前先檢查統一編號是否已存在（包括已刪除的客戶）
     const existing = await db.select('*')
       .from('Clients')
       .where('tax_registration_number', '=', taxId)
       .where('is_deleted', '=', 0)
     ```

#### 註解語言規範

**語言**：
- **主要語言**：繁體中文
- **技術術語**：可使用英文（如 API、URL、SQL、HTTP、JSON 等）
- **函數/變數名**：保持英文，在註解中說明

**範例**：
```javascript
// ✅ 好的註解：繁體中文 + 英文技術術語
// 從 API 獲取客戶資料，並轉換為前端需要的格式
const clientData = await fetchClientFromAPI(clientId)

// ✅ 好的註解：說明英文變數名的含義
// isRecurring: 是否為定期服務（true=定期，false=一次性）
if (service.isRecurring) {
  // 定期服務邏輯
}

// ❌ 不好的註解：混用語言
// Get client data from API and convert to frontend format
// 獲取客戶資料並轉換格式
```

#### 註解格式規範

**單行註解**：
- 使用 `//` 開頭
- 註解與代碼之間保留一個空格
- 範例：
  ```javascript
  // 這是單行註解
  const value = 100
  ```

**多行註解**：
- 使用 `/* */` 包裹
- 用於較長的說明或文檔
- 範例：
  ```javascript
  /*
   * 這是一個多行註解
   * 用於說明複雜的邏輯或算法
   * 可以包含多個段落
   */
  function complexFunction() { ... }
  ```

**函數註解（JSDoc）**：
- 使用 `/** */` 格式
- 包含 `@param`、`@returns`、`@throws` 等標籤
- 範例：
  ```javascript
  /**
   * 計算客戶的總應計收入
   * @param {string} clientId - 客戶 ID
   * @param {string} yearMonth - 年月（格式：YYYY-MM）
   * @returns {Promise<number>} 總應計收入（單位：分）
   * @throws {Error} 當客戶不存在時拋出錯誤
   */
  async function calculateTotalAccruedRevenue(clientId, yearMonth) {
    // 實現邏輯...
  }
  ```

#### 註解內容規範

**好的註解特點**：
- ✅ 說明「為什麼」而不是「是什麼」
- ✅ 簡潔明確，避免冗長
- ✅ 與代碼同步更新（代碼變更時同步更新註解）
- ✅ 提供上下文資訊（業務背景、特殊情況等）

**不好的註解特點**：
- ❌ 重複代碼內容（例如：`// 設定變數為 true`）
- ❌ 過時或錯誤的註解（代碼已變更但註解未更新）
- ❌ 過於冗長，影響代碼可讀性
- ❌ 使用技術術語但未解釋（對非技術人員不友善）

**範例對比**：
```javascript
// ✅ 好的註解：說明為什麼
// 使用軟刪除而非物理刪除，因為需要保留歷史記錄供審計和報表使用
await db.update('Clients').set({ is_deleted: 1 })

// ❌ 不好的註解：重複代碼內容
// 更新 Clients 表，設定 is_deleted 為 1
await db.update('Clients').set({ is_deleted: 1 })

// ✅ 好的註解：提供業務背景
// 統一編號驗證：企業客戶必須是 8 碼數字，個人客戶必須是 10 碼（第一碼為英文字母）
const isValid = isCompany 
  ? /^\d{8}$/.test(taxId)
  : /^[A-Z]\d{9}$/.test(idNumber)

// ❌ 不好的註解：未提供背景
// 驗證統一編號格式
const isValid = isCompany 
  ? /^\d{8}$/.test(taxId)
  : /^[A-Z]\d{9}$/.test(idNumber)
```

---

### 代碼組織規範 (Code Organization Standards)

**⚠️ 重要：統一的代碼組織方式能大幅提升可讀性和維護性**

#### Vue 組件文件結構

**文件整體結構**（必須按此順序）：
1. `<template>` - HTML 模板
2. `<script setup>` - JavaScript 邏輯
3. `<style>` - CSS 樣式

**`<script setup>` 內部結構**（必須按此順序）：

```vue
<script setup>
// 1. Import 語句（按順序分組）
// 1.1 Vue 核心 API
import { ref, computed, watch, onMounted } from 'vue'

// 1.2 第三方庫
import { message, Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'

// 1.3 內部模組（API、Store、Utils）
import { fetchClient, updateClient } from '@/api/clients'
import { useClientStore } from '@/stores/client'
import { formatDate, formatCurrency } from '@/utils/formatters'

// 1.4 組件
import ClientForm from './ClientForm.vue'
import PageHeader from '@/components/shared/PageHeader.vue'

// 1.5 類型定義（如有 TypeScript）
// import type { Client } from '@/types/client'

// 2. Props 定義
const props = defineProps({
  clientId: {
    type: String,
    required: true
  },
  editable: {
    type: Boolean,
    default: false
  }
})

// 3. Emits 定義
const emit = defineEmits(['update', 'delete', 'cancel'])

// 4. 響應式數據（ref、reactive）
const loading = ref(false)
const clientData = ref(null)
const formData = reactive({
  company_name: '',
  tax_registration_number: ''
})

// 5. 計算屬性（computed）
const displayName = computed(() => {
  return clientData.value?.company_name || '未知'
})

const isFormValid = computed(() => {
  return formData.company_name && formData.tax_registration_number
})

// 6. 生命週期鉤子（onMounted、onUnmounted 等）
onMounted(() => {
  loadClient()
})

onUnmounted(() => {
  // 清理工作
})

// 7. 監聽器（watch）
watch(() => props.clientId, (newId) => {
  if (newId) {
    loadClient()
  }
})

// 8. 方法函數（按功能分組，使用註解分隔）
// ===== 數據載入相關 =====
async function loadClient() {
  loading.value = true
  try {
    const response = await fetchClient(props.clientId)
    clientData.value = response.data
  } catch (error) {
    message.error('載入客戶資料失敗')
  } finally {
    loading.value = false
  }
}

// ===== 表單處理相關 =====
function handleSubmit() {
  // 提交邏輯
}

function handleReset() {
  // 重置邏輯
}

// ===== 事件處理相關 =====
function handleDelete() {
  // 刪除邏輯
}

function handleCancel() {
  emit('cancel')
}
</script>
```

**Import 語句分組順序**：
1. Vue 核心 API（`vue`）
2. 第三方庫（`ant-design-vue`、`vue-router` 等）
3. 內部 API 模組（`@/api/*`）
4. 內部 Store（`@/stores/*`）
5. 內部工具函數（`@/utils/*`）
6. 內部組件（`@/components/*` 或相對路徑）
7. 類型定義（`@/types/*`，如有 TypeScript）

**Import 語句規範**：
- 每個分組之間保留一個空行
- 同一分組內按字母順序排列
- 使用絕對路徑（`@/`）而非相對路徑（`../`），除非是同一目錄下的文件

#### 後端 Handler 文件結構

**文件整體結構**（必須按此順序）：

```javascript
// 1. 文件頭部註解（說明文件用途）
/**
 * 客戶基本 CRUD 操作
 * 提供客戶的增刪改查功能
 */

// 2. Import 語句（按順序分組）
// 2.1 工具函數
import { successResponse, errorResponse } from '../../utils/response.js'
import { getKVCache, saveKVCache } from '../../utils/cache.js'

// 2.2 業務邏輯工具
import { isValidTaxId, generateClientId } from './utils.js'

// 2.3 資料庫操作（如有）
// import { db } from '../../utils/db.js'

// 3. 常數定義
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

// 4. 主要處理函數（按功能分組）
// ===== 查詢相關 =====
export async function handleClientList(request, env, ctx, requestId, url) {
  // 實現邏輯
}

export async function handleClientDetail(request, env, ctx, requestId, match) {
  // 實現邏輯
}

// ===== 創建相關 =====
export async function handleClientCreate(request, env, ctx, requestId) {
  // 實現邏輯
}

// ===== 更新相關 =====
export async function handleClientUpdate(request, env, ctx, requestId, match) {
  // 實現邏輯
}

// ===== 刪除相關 =====
export async function handleClientDelete(request, env, ctx, requestId, match) {
  // 實現邏輯
}

// 5. 輔助函數（私有函數，不 export）
function validateClientData(data) {
  // 驗證邏輯
}

function formatClientResponse(client) {
  // 格式化邏輯
}
```

#### JavaScript 工具文件結構

**文件整體結構**（必須按此順序）：

```javascript
// 1. 文件頭部註解
/**
 * 日期格式化工具函數
 */

// 2. Import 語句
import dayjs from 'dayjs'

// 3. 常數定義
const DATE_FORMAT = 'YYYY-MM-DD'
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

// 4. 主要函數（按功能分組）
// ===== 日期格式化 =====
export function formatDate(date, format = DATE_FORMAT) {
  // 實現邏輯
}

export function formatDateTime(date, format = DATETIME_FORMAT) {
  // 實現邏輯
}

// ===== 日期計算 =====
export function addDays(date, days) {
  // 實現邏輯
}

export function getMonthStart(date) {
  // 實現邏輯
}

// 5. 輔助函數（私有函數，不 export）
function isValidDate(date) {
  // 驗證邏輯
}
```

#### 文件大小限制

**建議限制**：
- **Vue 組件文件**：不超過 500 行
- **JavaScript 工具文件**：不超過 300 行
- **Handler 文件**：不超過 800 行
- **單一函數**：不超過 100 行

**超過限制時的處理**：
- 將組件拆分為多個子組件
- 將工具函數拆分為多個模組
- 將 Handler 函數拆分為多個文件
- 將長函數拆分為多個小函數

#### 組件重用規範

**優先使用現有組件**：
- 在開發新功能前，先檢查是否有可重用的組件
- 查看 `src/components/shared/` 目錄中的共用組件
- 查看 `src/components/common/` 目錄中的通用組件

**組件重用檢查清單**：
- [ ] 是否已有類似的組件？
- [ ] 現有組件是否可以通過 props 配置滿足需求？
- [ ] 是否可以通過組合現有組件實現需求？
- [ ] 如果必須新建組件，是否可以設計為可重用組件？

**組件設計原則**：
- **單一職責**：每個組件只負責一個功能
- **可配置性**：通過 props 實現靈活配置
- **可擴展性**：通過 slots 支持內容擴展
- **文檔完善**：組件必須有清晰的 props 說明和使用範例

**範例**：
```vue
<!-- ✅ 好的組件設計：可重用、可配置 -->
<template>
  <a-card :title="title" :loading="loading">
    <slot name="content" :data="data">
      <!-- 預設內容 -->
    </slot>
    <template #actions>
      <slot name="actions"></slot>
    </template>
  </a-card>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  data: {
    type: Object,
    default: null
  }
})
</script>
```

#### Import 語句規範

**Import 順序**（必須嚴格遵循）：
1. **Vue 核心 API**：`vue`、`vue-router`、`pinia`
2. **第三方 UI 庫**：`ant-design-vue`、`@ant-design/icons-vue`
3. **第三方工具庫**：`dayjs`、`axios`、`lodash`
4. **內部 API**：`@/api/*`
5. **內部 Store**：`@/stores/*`
6. **內部工具**：`@/utils/*`
7. **內部組件**：`@/components/*`
8. **類型定義**：`@/types/*`（如有 TypeScript）

**Import 格式**：
- 每個分組之間保留一個空行
- 同一分組內按字母順序排列
- 使用絕對路徑（`@/`）而非相對路徑（`../`）
- 避免使用 `*` 導入（除非必要）

**範例**：
```javascript
// ✅ 好的 Import 順序
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { message, Modal } from 'ant-design-vue'
import { UserOutlined } from '@ant-design/icons-vue'

import dayjs from 'dayjs'

import { fetchClient } from '@/api/clients'
import { useClientStore } from '@/stores/client'
import { formatDate } from '@/utils/formatters'
import PageHeader from '@/components/shared/PageHeader.vue'

// ❌ 不好的 Import：順序混亂、使用相對路徑
import { formatDate } from '../../../utils/formatters'
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { fetchClient } from '@/api/clients'
```

---

### 文件編碼與代碼風格規範 (File Encoding & Code Style Standards)

**⚠️ 重要：統一的編碼和風格確保代碼一致性和可讀性**

#### 文件編碼規範

**編碼格式**：
- **所有文件必須使用 UTF-8 編碼**
- 確保中文顯示正常，避免亂碼問題
- 編輯器必須設置為 UTF-8 編碼

**檢查方法**：
- 文件保存時確認編碼為 UTF-8
- 如果發現中文亂碼，檢查文件編碼設置

#### 代碼風格規範

**縮排**：
- **使用 2 個空格**進行縮排
- **嚴禁使用 Tab**（必須轉換為空格）
- 保持一致的縮排層級

**換行符**：
- **使用 Unix 風格（LF）**，不使用 Windows 風格（CRLF）
- 確保跨平台兼容性

**行尾空格**：
- **移除所有行尾空格**
- 保持代碼整潔

**文件結尾**：
- **文件末尾保留一個空行**
- 符合 POSIX 標準

**大括號風格**：
- JavaScript/TypeScript 使用 `{` 在同一行
- 範例：
  ```javascript
  // ✅ 正確
  if (condition) {
    // 代碼
  }
  
  // ❌ 錯誤
  if (condition)
  {
    // 代碼
  }
  ```

**語句結尾**：
- **必須使用分號**（JavaScript）
- 保持一致性

**字串引號**：
- **統一使用單引號**（`'`）
- 如果字串內包含單引號，使用雙引號（`"`）
- 範例：
  ```javascript
  // ✅ 正確
  const message = 'Hello World'
  const message2 = "It's a beautiful day"
  
  // ❌ 錯誤（不一致）
  const message = "Hello World"
  const message2 = 'It\'s a beautiful day'
  ```

**空格使用**：
- 運算符前後保留空格：`a + b`、`a === b`
- 函數參數之間保留空格：`function(a, b, c)`
- 對象屬性後保留空格：`{ key: value }`
- 範例：
  ```javascript
  // ✅ 正確
  const sum = a + b
  if (a === b) { ... }
  function test(a, b, c) { ... }
  const obj = { key: value }
  
  // ❌ 錯誤
  const sum = a+b
  if (a===b) { ... }
  function test(a,b,c) { ... }
  const obj = {key:value}
  ```

**行長度**：
- **建議每行不超過 120 個字符**
- 超過時應換行，保持可讀性
- 範例：
  ```javascript
  // ✅ 正確（換行）
  const result = await fetchClientData(
    clientId,
    { includeServices: true, includeTasks: true }
  )
  
  // ❌ 錯誤（過長）
  const result = await fetchClientData(clientId, { includeServices: true, includeTasks: true })
  ```

#### 代碼風格檢查清單

在提交代碼前，必須確認：
- [ ] 文件編碼為 UTF-8
- [ ] 使用 2 個空格縮排（不使用 Tab）
- [ ] 使用 LF 換行符（不使用 CRLF）
- [ ] 已移除所有行尾空格
- [ ] 文件末尾有一個空行
- [ ] 大括號風格一致（`{` 在同一行）
- [ ] 語句結尾有分號
- [ ] 字串引號統一（優先使用單引號）
- [ ] 運算符前後有空格
- [ ] 行長度不超過 120 字符（如超過已換行）



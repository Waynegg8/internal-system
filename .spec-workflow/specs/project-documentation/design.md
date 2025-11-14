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


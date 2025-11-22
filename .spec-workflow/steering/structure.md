# Project Structure

## Directory Organization

```
project-root/
├── src/                          # 前端 Vue 應用
│   ├── api/                      # API 調用層（按功能模組組織）
│   ├── components/               # Vue 組件（按功能模組組織）
│   │   ├── clients/             # 客戶相關組件
│   │   ├── tasks/               # 任務相關組件
│   │   ├── receipts/            # 收據相關組件
│   │   ├── payroll/             # 薪資相關組件
│   │   ├── costs/               # 成本相關組件
│   │   ├── timesheets/          # 工時相關組件
│   │   ├── leaves/              # 假期相關組件
│   │   ├── trips/               # 外出相關組件
│   │   ├── knowledge/           # 知識庫相關組件（SOP、FAQ、資源）
│   │   ├── reports/             # 報表相關組件
│   │   ├── dashboard/           # 儀表板相關組件
│   │   ├── settings/            # 設定相關組件
│   │   ├── common/              # 通用組件
│   │   ├── layout/              # 布局組件
│   │   └── shared/              # 共享組件
│   ├── views/                    # 頁面組件（路由對應的頁面）
│   │   ├── clients/             # 客戶相關頁面
│   │   ├── tasks/               # 任務相關頁面
│   │   ├── receipts/            # 收據相關頁面
│   │   ├── payroll/             # 薪資相關頁面
│   │   ├── costs/               # 成本相關頁面
│   │   ├── knowledge/           # 知識庫相關頁面
│   │   ├── reports/             # 報表相關頁面
│   │   └── settings/            # 設定相關頁面
│   ├── stores/                   # Pinia 狀態管理（按功能模組組織）
│   ├── router/                   # Vue Router 路由配置
│   ├── utils/                    # 工具函數
│   ├── composables/              # Vue Composition API 可組合函數
│   ├── constants/                # 常量定義
│   ├── assets/                   # 靜態資源（CSS、圖片等）
│   ├── App.vue                   # 根組件
│   └── main.js                   # 應用入口
├── backend/                      # Cloudflare Workers 後端
│   ├── src/
│   │   ├── handlers/             # API Handlers（按功能模組組織）
│   │   │   ├── clients/         # 客戶相關 handlers
│   │   │   ├── tasks/           # 任務相關 handlers
│   │   │   ├── receipts/        # 收據相關 handlers
│   │   │   ├── payroll/         # 薪資相關 handlers
│   │   │   ├── costs/           # 成本相關 handlers
│   │   │   ├── timesheets/      # 工時相關 handlers
│   │   │   ├── leaves/          # 假期相關 handlers
│   │   │   ├── trips/           # 外出相關 handlers
│   │   │   ├── knowledge/       # 知識庫相關 handlers
│   │   │   ├── reports/         # 報表相關 handlers
│   │   │   ├── dashboard/       # 儀表板相關 handlers
│   │   │   ├── settings/        # 設定相關 handlers
│   │   │   └── attachments/     # 附件相關 handlers
│   │   ├── router/               # 路由配置（按功能模組組織）
│   │   ├── utils/                # 工具函數
│   │   ├── middleware/           # 中間件（認證、CORS 等）
│   │   ├── mcp/                  # MCP 協議支援
│   │   └── index.js              # Worker 入口
│   ├── migrations/               # 資料庫遷移文件
│   └── wrangler.toml             # Wrangler 配置
├── .spec-workflow/               # Spec 工作流程文檔
│   ├── specs/                    # 功能規格文檔（按業務模組組織）
│   ├── steering/                 # Steering 文檔（product.md, tech.md, structure.md）
│   └── templates/                # 文檔模板
├── scripts/                      # 建置和工具腳本
├── dist/                         # 前端建置輸出（部署到 Cloudflare Pages）
├── package.json                  # 前端依賴配置
└── backend/package.json          # 後端依賴配置
```

### 組織原則

- **按功能模組組織**：前端組件、後端 handlers、API 調用層都按業務功能模組組織（clients、tasks、receipts 等）
- **層級分離**：UI 層（components/views）→ API 層（api/）→ Handler 層（handlers/）→ 資料庫層（migrations/）
- **職責單一**：每個目錄和文件都有明確的職責，避免職責混雜

## Naming Conventions

### Files

- **Vue 組件**: `PascalCase.vue`（如 `ClientList.vue`、`TaskDetail.vue`）
- **API Handlers**: `kebab-case.js`（如 `client-crud.js`、`task-crud.js`）
- **工具函數**: `camelCase.js`（如 `dateUtils.js`、`formatters.js`）
- **路由文件**: `kebab-case.js`（如 `clients.js`、`task-configs.js`）
- **Store 文件**: `camelCase.js`（如 `auth.js`、`clients.js`）
- **測試文件**: `[filename].test.js` 或 `[filename].spec.js`

### Code

- **Vue 組件名稱**: `PascalCase`（如 `ClientList`、`TaskDetail`）
- **函數/方法**: `camelCase`（如 `getClients`、`handleSubmit`）
- **常量**: `UPPER_SNAKE_CASE`（如 `API_BASE_URL`、`MAX_FILE_SIZE`）
- **變數**: `camelCase`（如 `clientList`、`isLoading`）
- **類別**: `PascalCase`（如 `PayrollCalculator`、`ReportCache`）
- **API 路由**: RESTful 風格，使用 kebab-case（如 `/api/v2/clients`、`/api/v2/task-configs`）

## Import Patterns

### Import Order

1. **外部依賴**：Vue、Ant Design Vue、第三方庫
2. **內部模組**：API 調用、Store、工具函數
3. **相對導入**：同目錄或子目錄的文件
4. **樣式導入**：CSS 文件（如適用）

### Module/Package Organization

- **絕對導入**：使用 `@/` 別名指向 `src/` 目錄（如 `@/api/clients.js`、`@/components/clients/ClientList.vue`）
- **相對導入**：用於同目錄或子目錄的文件（如 `./utils.js`、`../components/CommonButton.vue`）
- **模組化組織**：按功能模組組織，避免循環依賴

### 範例

```javascript
// 前端組件導入範例
import { ref, computed } from 'vue'
import { Button, Table } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useClientsStore } from '@/stores/clients'
import { getClients } from '@/api/clients'
import { formatDate } from '@/utils/date'
import './ClientList.css'
```

```javascript
// 後端 Handler 導入範例
import { errorResponse, successResponse } from '../utils/response.js'
import { getClientById } from './client-utils.js'
import { validateClientData } from './client-validation.js'
```

## Code Structure Patterns

### Module/Class Organization

1. **導入語句**：外部依賴 → 內部模組 → 相對導入
2. **常量定義**：模組級常量
3. **類型/介面定義**：TypeScript 類型定義（如適用）
4. **主要實現**：核心業務邏輯
5. **輔助函數**：私有工具函數
6. **導出**：公開 API

### Function/Method Organization

- **輸入驗證**：首先驗證輸入參數
- **核心邏輯**：中間部分實現主要功能
- **錯誤處理**：貫穿整個函數，及時處理錯誤
- **明確返回點**：使用清晰的 return 語句

### File Organization Principles

- **一個組件一個文件**：每個 Vue 組件單獨一個文件
- **相關功能分組**：相關的 handlers 放在同一個目錄下
- **公開 API 明確**：明確導出哪些函數和類別
- **實現細節隱藏**：私有函數和內部邏輯不導出

## Code Organization Principles

1. **單一職責（Single Responsibility）**：每個文件應該有單一、明確的職責
2. **模組化（Modularity）**：代碼應該組織成可重用的模組
3. **可測試性（Testability）**：結構代碼以便於測試
4. **一致性（Consistency）**：遵循代碼庫中已建立的模式

## Module Boundaries

### 前端/後端分離

- **前端**：負責 UI 渲染、用戶交互、狀態管理
- **後端**：負責業務邏輯、資料庫操作、API 提供
- **通信方式**：通過 RESTful API 進行通信，使用 JSON 格式

### API 層抽象

- **前端 API 層**：`src/api/` 目錄下的文件封裝所有 API 調用
- **後端 Handler 層**：`backend/src/handlers/` 目錄下的文件處理所有 API 請求
- **統一介面**：API 調用使用統一的錯誤處理和回應格式

### 資料庫層抽象

- **Migration 文件**：`backend/migrations/` 目錄下的文件定義資料庫結構
- **Handler 層直接操作資料庫**：Handlers 直接使用 D1 API 進行資料庫操作
- **工具函數封裝**：複雜的資料庫操作封裝為工具函數（如 `backend/src/utils/`）

### 組件邊界

- **組件獨立性**：組件之間通過 props 和 events 通信，保持獨立
- **Store 狀態管理**：共享狀態通過 Pinia Store 管理
- **工具函數重用**：通用邏輯封裝為工具函數，可在多處重用

### 依賴方向

- **單向依賴**：UI 層 → API 層 → Handler 層 → 資料庫層
- **避免循環依賴**：模組之間不應有循環依賴
- **依賴注入**：通過參數傳遞依賴，而非全局變數

## Code Size Guidelines

- **文件大小**：建議單個文件不超過 500 行，超過時考慮拆分
- **函數/方法大小**：建議單個函數不超過 100 行，超過時考慮拆分
- **組件複雜度**：建議單個組件不超過 300 行，超過時考慮拆分為子組件
- **嵌套深度**：建議嵌套深度不超過 4 層，超過時考慮重構

## Dashboard/Monitoring Structure

### 儀表板組件組織

```
src/components/dashboard/
├── AdminDashboard.vue          # 管理員儀表板主組件
├── EmployeeDashboard.vue       # 員工儀表板主組件
├── DashboardAlertsPanel.vue    # 即時提醒面板
├── DashboardNotices.vue        # 通知組件
├── FinancialStatus.vue         # 財務狀況組件
├── EmployeeTasks.vue           # 員工任務組件
├── EmployeeHours.vue           # 員工工時組件
├── MyTasks.vue                 # 我的任務組件
├── MyHours.vue                 # 我的工時組件
├── MyLeaves.vue                # 我的假期組件
├── ReceiptsPending.vue         # 待處理收據組件
└── RecentActivities.vue        # 近期活動組件
```

### 分離關注點

- **儀表板組件獨立**：儀表板組件與核心業務邏輯分離
- **數據獲取**：通過 API 層獲取數據，不直接操作資料庫
- **狀態管理**：使用 Pinia Store 管理儀表板狀態
- **可重用性**：儀表板組件可在不同頁面重用

## Documentation Standards

- **公開 API 文檔**：所有公開的 API 函數和組件必須有文檔註釋
- **複雜邏輯註釋**：複雜的業務邏輯應該包含行內註釋
- **README 文件**：主要模組應該有 README 文件說明用途和使用方法
- **遵循語言規範**：遵循 JavaScript/Vue 的文檔註釋規範（JSDoc）

### 文檔註釋範例

```javascript
/**
 * 獲取客戶列表
 * @param {Object} params - 查詢參數
 * @param {string} params.keyword - 關鍵詞搜尋
 * @param {number} params.page - 頁碼
 * @param {number} params.perPage - 每頁數量
 * @returns {Promise<Object>} 客戶列表數據
 */
export async function getClients(params) {
  // 實現...
}
```

```vue
<!--
  客戶列表組件
  @component ClientList
  @description 顯示客戶列表，支援搜尋、篩選和分頁
  @props {Array} clients - 客戶列表數據
  @events {Function} select - 選擇客戶時觸發
-->
<template>
  <!-- 模板內容 -->
</template>
```

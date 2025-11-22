# Tasks Document: BR1.1: 客戶列表管理

## 1.0 後端 API 實現

### 1.1 客戶列表 API 端點
- [x] 1.1.1 實現客戶列表查詢 Handler
  - File: backend/src/handlers/clients/client-crud.js
  - Function: handleClientList
  - 實現分頁查詢（page, pageSize 參數）
  - 支援搜尋功能（公司名稱、統一編號、標籤關鍵字）
  - 實現標籤篩選（tag_ids 參數）
  - 實現權限過濾邏輯（管理員 vs 員工權限）
  - 計算服務數量（services_count）和全年收費（year_total）
  - 實現統一編號格式處理（企業客戶 00 前綴，個人客戶 10 碼）
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js, backend/src/utils/database.js_
  - _Requirements: BR1.1.1, BR1.1.2, BR1.1.3_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in Cloudflare Workers and D1 database queries | Task: Implement handleClientList function that supports pagination, search by company name/tax ID/tags, tag filtering, permission-based access control (admin sees all, employees see assigned/collaborated/timesheet clients), calculates services_count from ClientServices table and year_total from ServiceBillingSchedule table, formats tax_registration_number in 10-digit format (enterprise: 00+8digits, individual: 10 digits), and returns properly structured response | Restrictions: Must use parameterized queries for SQL injection prevention, must implement proper permission filtering with OR conditions for employee access, must calculate aggregated fields efficiently, must format tax_registration_number correctly, must follow existing response format patterns | Success: Function returns paginated client list with all required fields, permission filtering works correctly, search and filter parameters are properly handled, calculated fields are accurate, tax_registration_number is formatted correctly_

- [x] 1.1.2 實現快取機制整合
  - File: backend/src/handlers/clients/client-crud.js
  - 修改 handleClientList 函數
  - 整合 KV 快取和 D1 Cache
  - 實現快取鍵生成邏輯（包含用戶權限、查詢參數）
  - 實現快取失效策略（客戶資料更新時清除）
  - _Leverage: backend/src/utils/cache.js, backend/src/utils/database.js_
  - _Requirements: BR1.1.1, BR1.1.2, BR1.1.3_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in caching strategies and performance optimization | Task: Integrate KV and D1 Cache into handleClientList function with proper cache key generation (including user permissions and query parameters), implement cache invalidation strategy, and ensure cache consistency when client data is updated | Restrictions: Must generate unique cache keys for different query combinations, must handle cache misses gracefully, must implement proper cache TTL, must invalidate cache on data updates | Success: Caching is properly integrated, cache keys are unique and comprehensive, cache invalidation works correctly, performance is improved for repeated queries_

- [x] 1.1.3 配置客戶列表路由
  - File: backend/src/router/clients.js
  - 確認 GET /api/v2/clients 路由配置
  - 確保路由中間件正確（認證、權限檢查）
  - 驗證路由參數處理
  - _Leverage: backend/src/middleware/auth.js, backend/src/middleware/validation.js_
  - _Requirements: BR1.1.1_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in API routing and middleware configuration | Task: Ensure GET /api/v2/clients route is properly configured in clients.js router with correct middleware chain (authentication, validation), proper parameter handling, and connection to handleClientList handler | Restrictions: Must follow existing router patterns, must include necessary middleware, must handle route parameters correctly | Success: Route is properly configured, middleware chain is correct, route connects to handler properly_

### 1.2 批量移轉負責人 API 端點
- [x] 1.2.1 實現批量移轉 Handler
  - File: backend/src/handlers/clients/client-utils.js
  - Function: handleBatchAssign
  - 支援多種選擇方式（直接 client_ids、條件篩選）
  - 實現篩選條件（from_assignee_user_id, tag_ids, q, include_unassigned）
  - 支援預覽模式（dry_run 參數）
  - 實現驗證邏輯（新負責人不能與目前負責人相同）
  - 執行批量更新操作
  - 清除相關快取
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js, backend/src/utils/database.js_
  - _Requirements: BR1.1.5_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in batch operations and complex SQL queries | Task: Implement handleBatchAssign function supporting direct client selection (client_ids) and conditional filtering (from_assignee_user_id, tag_ids, q, include_unassigned), dry_run mode for preview (returns match_count and sample list), validation to prevent assigning to same assignee, atomic batch update, and cache invalidation | Restrictions: Must validate all input parameters, must support both selection methods, must implement preview mode without actual updates, must use transactions for batch updates, must clear all related caches | Success: Function supports all selection methods, preview mode works correctly, validation prevents invalid assignments, batch updates are atomic, cache is properly invalidated_

- [x] 1.2.2 配置批量移轉路由
  - File: backend/src/router/clients.js
  - 新增 POST /api/v2/clients/batch-assign 路由
  - 確保中間件配置正確
  - 驗證請求參數處理
  - _Leverage: backend/src/middleware/auth.js, backend/src/middleware/validation.js_
  - _Requirements: BR1.1.5_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in REST API design and route configuration | Task: Add POST /api/v2/clients/batch-assign route to clients.js router with proper middleware and parameter validation, connecting to handleBatchAssign handler | Restrictions: Must follow REST conventions, must include authentication middleware, must validate batch transfer parameters | Success: Route is properly configured, middleware is correct, route connects to handler properly_

### 1.3 客戶刪除 API 端點
- [x] 1.3.1 實現軟刪除 Handler
  - File: backend/src/handlers/clients/client-crud.js
  - Function: handleDeleteClient
  - 實現軟刪除邏輯（設置 is_deleted, deleted_at, deleted_by）
  - 驗證管理員權限
  - 處理統一編號重複檢查（恢復已刪除客戶）
  - 清除相關快取
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js, backend/src/utils/database.js_
  - _Requirements: BR1.1.6_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in soft delete patterns and data recovery | Task: Implement handleDeleteClient function with soft delete logic (set is_deleted=1, deleted_at, deleted_by), admin permission check, tax_registration_number uniqueness handling (restore deleted clients if same tax ID), and cache invalidation | Restrictions: Must implement soft delete not physical delete, must check admin permissions, must handle tax ID conflicts by restoring deleted records, must clear all related caches | Success: Soft delete works correctly, admin permission is enforced, tax ID conflicts are handled properly, cache is invalidated_

- [x] 1.3.2 確認刪除路由配置
  - File: backend/src/router/clients.js
  - 確認 DELETE /api/v2/clients/:id 路由
  - 確保中間件和參數處理正確
  - _Leverage: backend/src/middleware/auth.js, backend/src/middleware/validation.js_
  - _Requirements: BR1.1.6_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in API security and parameter validation | Task: Ensure DELETE /api/v2/clients/:id route is properly configured with admin-only access control and parameter validation | Restrictions: Must restrict to admin users only, must validate client ID parameter, must follow existing route patterns | Success: Route has proper admin restriction, parameter validation works, connects to handler correctly_

## 2.0 前端 API 調用層

### 2.1 客戶列表 API 服務
- [x] 2.1.1 實現客戶列表 API 調用
  - File: src/api/clients.js
  - Function: getClients
  - 支援分頁參數（page, pageSize）
  - 支援搜尋參數（q）
  - 支援篩選參數（tag_ids）
  - 使用統一錯誤處理
  - _Leverage: @/utils/apiHelpers, axios_
  - _Requirements: BR1.1.1, BR1.1.2, BR1.1.3_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in HTTP client libraries and API integration | Task: Create getClients function in src/api/clients.js supporting pagination (page, pageSize), search (q parameter), tag filtering (tag_ids array), using axios with unified error handling from @/utils/apiHelpers | Restrictions: Must use axios for HTTP requests, must handle errors with extractApiError, must support all query parameters, must return properly formatted response data | Success: Function supports all required parameters, error handling works correctly, response data is properly formatted_

### 2.2 批量操作 API 服務
- [x] 2.2.1 實現批量移轉 API 調用
  - File: src/api/clients.js
  - Function: batchTransferAssignee
  - 支援所有批量移轉參數
  - 支援預覽模式（dry_run）
  - 使用統一錯誤處理
  - _Leverage: @/utils/apiHelpers, axios_
  - _Requirements: BR1.1.5_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in complex API calls and error handling | Task: Create batchTransferAssignee function supporting all batch transfer parameters (client_ids, from_assignee_user_id, tag_ids, q, include_unassigned, assignee_user_id, dry_run) with unified error handling | Restrictions: Must support all parameter combinations, must handle dry_run mode properly, must use axios and apiHelpers utilities | Success: Function supports all batch transfer scenarios, error handling is comprehensive, dry_run mode works correctly_

- [x] 2.2.2 實現客戶刪除 API 調用
  - File: src/api/clients.js
  - Function: deleteClient
  - 支援客戶 ID 參數
  - 使用統一錯誤處理
  - _Leverage: @/utils/apiHelpers, axios_
  - _Requirements: BR1.1.6_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in REST API DELETE operations | Task: Create deleteClient function that calls DELETE /api/v2/clients/:id with proper error handling and response processing | Restrictions: Must use axios DELETE method, must handle errors properly, must validate client ID parameter | Success: Function properly deletes clients, error handling works, response is correctly processed_

## 3.0 前端組件實現

### 3.1 客戶列表主組件
- [x] 3.1.1 實現客戶列表展示
  - File: src/views/clients/ClientsList.vue
  - 顯示所有必要欄位（統一編號、公司名稱、聯絡人、電話、負責人、標籤、服務數量、全年收費）
  - 實現統一編號格式顯示（等寬字體，10碼格式）
  - 實現公司名稱點擊跳轉
  - 實現負責人顯示（未分配顯示「未分配」）
  - 實現標籤顯示（最多2個，超過+N）
  - 實現服務數量（藍色標籤）和全年收費（綠色顯示）
  - _Leverage: src/api/clients.js, Ant Design Vue Table, Vue Router_
  - _Requirements: BR1.1.1_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in Vue 3 Composition API and data table components | Task: Create ClientsList.vue component displaying all required columns with proper formatting: tax_registration_number in monospace font, clickable company_name links, assignee with "未分配" for unassigned, tags with +N indicator, services_count as blue badge, year_total in green currency format | Restrictions: Must use Ant Design Vue Table component, must format all fields correctly, must handle navigation to detail pages, must display unassigned status properly | Success: All required fields are displayed correctly with proper formatting, navigation works, UI is clean and responsive_

- [x] 3.1.2 實現搜尋和篩選功能
  - File: src/views/clients/ClientsList.vue
  - 實現搜尋輸入框（公司名稱、統一編號、標籤）
  - 實現標籤篩選下拉選單
  - 整合搜尋和篩選參數到 API 調用
  - 實現搜尋結果更新
  - _Leverage: src/api/clients.js, Ant Design Vue Input/Select_
  - _Requirements: BR1.1.2, BR1.1.3_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in search interfaces and filter components | Task: Add search input and tag filter dropdown to ClientsList.vue, integrate parameters with getClients API call, update results dynamically | Restrictions: Must support search by multiple fields, must handle tag filtering as multi-select, must debounce search requests, must show loading states | Success: Search works across company name/tax ID/tags, tag filtering works properly, results update smoothly, UI provides good user feedback_

- [x] 3.1.3 實現分頁功能
  - File: src/views/clients/ClientsList.vue
  - 實現分頁組件（預設每頁50筆）
  - 整合分頁參數到 API 調用
  - 顯示總筆數和當前頁面資訊
  - _Leverage: Ant Design Vue Pagination, src/api/clients.js_
  - _Requirements: BR1.1.1_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in pagination components and data loading | Task: Implement pagination in ClientsList.vue with default 50 items per page, integrate page/pageSize with API calls, display total count and current page info | Restrictions: Must handle page size changes, must maintain search/filter state across pages, must show proper loading states | Success: Pagination works correctly, page size is configurable, total count is displayed, navigation is smooth_

- [x] 3.1.4 實現載入狀態和錯誤處理
  - File: src/views/clients/ClientsList.vue
  - 實現載入中狀態顯示
  - 實現錯誤狀態處理和顯示
  - 實現空狀態顯示
  - _Leverage: Ant Design Vue Spin/Alert/Empty, src/stores/clients.js_
  - _Requirements: BR1.1.1, BR1.1.2, BR1.1.3_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in loading states and error boundaries | Task: Add loading states, error handling, and empty states to ClientsList.vue component | Restrictions: Must handle all error scenarios gracefully, must show appropriate loading indicators, must provide retry options for failed requests | Success: Loading states are clear, errors are handled gracefully, empty states are informative, user experience is smooth_

### 3.2 標籤管理整合
- [x] 3.2.1 整合標籤管理功能
  - File: src/views/clients/ClientsList.vue
  - 整合 TagsModal.vue 組件
  - 實現標籤點擊開啟管理對話框
  - 實現標籤更新後列表刷新
  - _Leverage: src/components/shared/TagsModal.vue, src/api/tags.js_
  - _Requirements: BR1.1.4_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in component integration and modal dialogs | Task: Integrate TagsModal component into ClientsList.vue for tag management, handle tag clicks to open modal, refresh list after tag updates | Restrictions: Must reuse existing TagsModal without modification, must handle tag update events properly, must refresh data after changes | Success: Tag management modal opens correctly, tag updates are reflected in list, integration is seamless_

### 3.3 批量移轉功能
- [x] 3.3.1 實現批量移轉模態框 ✅ 已實現
  - File: src/components/clients/BatchAssignModal.vue
  - 實現多種選擇方式 UI
  - 支援直接選擇客戶
  - 支援條件篩選（負責人、標籤、關鍵字、包含未分配）
  - 實現預覽功能 UI
  - 實現表單驗證
  - _Leverage: src/api/clients.js, src/api/users.js, Ant Design Vue Modal/Form_
  - _Requirements: BR1.1.5_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in complex forms and modal dialogs | Task: Create BatchAssignModal.vue with support for direct client selection and conditional filtering, preview functionality, form validation, and user feedback | Restrictions: Must support all selection methods, must implement preview UI, must validate inputs, must provide clear user feedback | Success: Modal supports all batch transfer methods, preview shows correct information, validation works properly, user experience is intuitive_

- [x] 3.3.2 整合批量移轉到列表
  - File: src/views/clients/ClientsList.vue
  - 添加批量選擇功能
  - 整合 BatchAssignModal
  - 實現批量移轉成功後刷新
  - _Leverage: src/components/clients/BatchAssignModal.vue_
  - _Requirements: BR1.1.5_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in table selection and bulk operations | Task: Add batch selection to ClientsList.vue table, integrate BatchAssignModal, refresh list after successful batch operations | Restrictions: Must handle selection state properly, must integrate modal correctly, must refresh data after operations | Success: Batch selection works, modal integration is smooth, list refreshes after operations_

### 3.4 刪除功能實現
- [x] 3.4.1 實現刪除按鈕和確認
  - File: src/views/clients/ClientsList.vue
  - 添加刪除按鈕（僅管理員可見）
  - 實現刪除確認對話框
  - 整合權限檢查
  - _Leverage: src/stores/auth.js, Ant Design Vue Modal_
  - _Requirements: BR1.1.6_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in permission-based UI and confirmation dialogs | Task: Add delete button to ClientsList.vue with admin-only visibility, implement confirmation dialog, integrate permission checks | Restrictions: Must check admin permissions, must use confirmation dialog, must handle errors properly | Success: Delete button shows only for admins, confirmation works, permission checks are correct_

## 4.0 狀態管理和資料流

### 4.1 Pinia Store 整合
- [x] 4.1.1 實現客戶列表 Store
  - File: src/stores/clients.js
  - 整合客戶列表狀態管理
  - 實現載入狀態管理
  - 整合搜尋和篩選狀態
  - _Leverage: Pinia, src/api/clients.js_
  - _Requirements: BR1.1.1, BR1.1.2, BR1.1.3_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in Pinia state management | Task: Create clients store with state management for client list, loading states, search/filter parameters | Restrictions: Must follow Pinia patterns, must handle async operations properly, must manage state consistency | Success: Store manages client list state correctly, loading states work, search/filter integration is smooth_

## 5.0 測試實現

### 5.1 端到端測試
- [x] 5.1.1 實現客戶列表 E2E 測試
  - File: tests/e2e/clients-list-br1.1.spec.ts
  - 測試列表展示和欄位格式
  - 測試搜尋功能
  - 測試篩選功能
  - 測試分頁功能
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: 所有 BR1.1 驗收標準_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in Playwright and E2E testing | Task: Create comprehensive E2E tests covering all acceptance criteria for client list functionality including display, search, filter, and pagination | Restrictions: Must test all acceptance criteria, must use test data utilities, must test both admin and employee roles, must verify all field formats | Success: All acceptance criteria are tested, tests pass consistently, both user roles are covered_

- [x] 5.1.2 實現批量操作 E2E 測試
  - File: tests/e2e/clients-list-br1.1.spec.ts
  - 測試批量移轉功能
  - 測試預覽功能
  - 測試權限驗證
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR1.1.5_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in complex user flow testing | Task: Add E2E tests for batch transfer functionality including all selection methods, preview mode, and permission validation | Restrictions: Must test all batch transfer scenarios, must verify permission restrictions, must test error cases | Success: Batch transfer flows are fully tested, permission checks work, error scenarios are covered_

- [x] 5.1.3 實現管理功能 E2E 測試
  - File: tests/e2e/clients-list-br1.1.spec.ts
  - 測試標籤管理功能
  - 測試刪除功能（管理員權限）
  - 測試軟刪除驗證
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR1.1.4, BR1.1.6_
  - _Prompt: Implement the task for spec br1-1-client-list, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in admin functionality testing | Task: Add E2E tests for tag management and delete functionality with proper permission checks and soft delete verification | Restrictions: Must test admin-only features, must verify soft delete behavior, must test tag management flows | Success: Admin features are properly tested, soft delete works correctly, tag management is verified_

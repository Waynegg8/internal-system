# Tasks Document: BR5.6: 客戶任務成本分析

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 已實現
   - `handleGetClientCosts` - 處理客戶成本分析 API 請求
   - `handleGetTaskCosts` - 處理任務成本分析 API 請求
   - 計算客戶和任務的成本、收入、利潤

2. **路由配置** ✅ 已實現
   - GET /api/v2/costs/client-summary/:year/:month
   - GET /api/v2/costs/task/:year/:month

3. **前端 API 調用函數** ✅ 已實現
   - `fetchClientCostsSummary` - 獲取客戶成本總結
   - `fetchTaskCosts` - 獲取任務成本

4. **前端組件** ✅ 已實現
   - `CostClient.vue` - 客戶任務成本分析主頁面
   - `ClientCostsSummaryTable.vue` - 客戶成本表格組件（支援展開功能）
   - `TaskCostsTable.vue` - 任務成本表格組件
   - `ClientCostsSummaryRow.vue` - 客戶成本總結行組件

### 未實現或部分實現功能

1. **分攤管理費明細** ⚠️ 需要確認
   - 需求：顯示每個成本項目的分攤金額
   - 現狀：需要確認後端是否返回分攤明細，前端是否顯示

2. **員工明細** ⚠️ 需要確認
   - 需求：展開客戶明細時顯示員工明細
   - 現狀：需要確認 `ClientCostsSummaryTable.vue` 的展開功能是否顯示員工明細

3. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 客戶成本分析 API Handler

- [x] 1.1.1 驗證客戶成本分析 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/task-costs.js
  - Function: handleGetClientCosts
  - 驗證整合 BR5.4 的分攤計算結果已實現（使用員工實際時薪計算客戶任務成本）
  - 驗證整合 BR4 的工時數據已實現（從 Timesheets 表查詢）
  - 驗證計算客戶總成本、收入、利潤、利潤率已實現
  - 驗證返回客戶成本分析數據已實現（包含客戶名稱、總工時、總成本、收入、利潤、利潤率）
  - 確認路由配置（backend/src/router/costs.js 中的 GET /api/v2/costs/client-summary/:year/:month 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援客戶成本分析
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.6.1_
  - _Status: 已完成_

- [ ] 1.1.2 補完客戶成本分析分攤管理費明細返回
  - File: backend/src/handlers/costs/task-costs.js
  - 修改 `handleGetClientCosts` 函數，返回每個成本項目的分攤金額明細
  - 為每個客戶計算並返回分攤管理費明細（包含成本項目類型 ID、成本項目名稱、分攤金額）
  - 計算每個成本項目分攤給每個客戶的金額：從 MonthlyOverheadCosts 表查詢每個成本項目的金額，根據 BR5.4 的分攤比例計算每個成本項目分攤給每個客戶的金額
  - Purpose: 確保後端返回完整的分攤管理費明細，支援前端明細展示
  - _Leverage: backend/src/handlers/costs/task-costs.js, MonthlyOverheadCosts 表, OverheadCostTypes 表_
  - _Requirements: BR5.6.1_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update handleGetClientCosts function to return allocation details for each cost item type per client, including cost_type_id, cost_name, and allocated_amount. Calculate allocation for each cost item based on BR5.4 allocation method (per_employee, per_hour, per_revenue) and distribute to clients based on their share, following requirement BR5.6.1 | Restrictions: Must use parameterized queries, calculate allocation correctly based on BR5.4 logic, return properly structured data, maintain existing response format | Success: Function returns allocation details array for each client, includes all cost item types with their allocation amounts, calculation is accurate based on BR5.4 allocation methods_

- [ ] 1.1.3 補完客戶成本分析員工明細返回
  - File: backend/src/handlers/costs/task-costs.js
  - 修改 `handleGetClientCosts` 函數，返回每個客戶的員工明細
  - 為每個客戶計算並返回員工明細（包含員工 ID、員工名稱、工時、成本）
  - Purpose: 確保後端返回完整的員工明細，支援前端明細展示
  - _Leverage: backend/src/handlers/costs/task-costs.js, Timesheets 表, Users 表_
  - _Requirements: BR5.6.1_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update handleGetClientCosts function to return employee details for each client, including user_id, user_name, hours, and cost. Calculate employee details based on timesheet records and actual hourly rates, following requirement BR5.6.1 | Restrictions: Must use parameterized queries, calculate employee costs correctly, return properly structured data, maintain existing response format | Success: Function returns employee details array for each client, includes all employees with their hours and costs, calculation is accurate_

### 1.2 任務成本分析 API Handler

- [x] 1.2.1 驗證任務成本分析 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/task-costs.js
  - Function: handleGetTaskCosts
  - 驗證整合 BR5.4 的分攤計算結果已實現（使用員工實際時薪計算任務成本）
  - 驗證整合 BR4 的工時數據已實現（從 Timesheets 表查詢）
  - 驗證計算任務成本、收入、利潤已實現
  - 驗證返回任務成本分析數據已實現（包含任務名稱、客戶名稱、工時、成本、收入、利潤）
  - 驗證按任務名稱排序已實現
  - 確認路由配置（backend/src/router/costs.js 中的 GET /api/v2/costs/task/:year/:month 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援任務成本分析
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.6.2_
  - _Status: 已完成_

---

## 2. 前端 API 調用層

### 2.1 客戶任務成本分析 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/costs.js
  - Functions: fetchClientCostsSummary, fetchTaskCosts
  - 驗證獲取客戶成本總結功能正確
  - 驗證獲取任務成本功能正確
  - 驗證處理年份月份參數正確
  - 驗證錯誤處理和數據轉換正確
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/costs.js_
  - _Requirements: BR5.6.1, BR5.6.2_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 客戶任務成本分析前端頁面

- [x] 3.1.1 驗證客戶任務成本分析前端頁面已實現 ✅ 已實現
  - File: src/views/costs/CostClient.vue
  - 頁面佈局和路由已實現
  - 整合 ClientCostsSummaryTable 組件
  - 整合 TaskCostsTable 組件
  - 年份月份選擇器已實現
  - 視圖切換功能已實現（按客戶/按任務）
  - 數據載入和錯誤處理已實現
  - Purpose: 確認客戶任務成本分析頁面已完整實現
  - _Leverage: src/views/costs/CostClient.vue, src/components/costs/ClientCostsSummaryTable.vue, src/components/costs/TaskCostsTable.vue, src/api/costs.js_
  - _Requirements: BR5.6.1, BR5.6.2_
  - _Status: 已完成_

### 3.2 客戶成本表格組件

- [x] 3.2.1 驗證客戶成本表格組件已實現 ✅ 已實現（基本功能）
  - File: src/components/costs/ClientCostsSummaryTable.vue
  - 客戶成本列表展示已實現（顯示客戶名稱、總工時、總成本、收入、利潤、利潤率）
  - 展開功能已實現（需要確認是否顯示員工明細和分攤管理費明細）
  - Purpose: 確認客戶成本表格組件已基本實現
  - _Leverage: Ant Design Vue Table component, src/components/costs/ClientCostsSummaryTable.vue_
  - _Requirements: BR5.6.1_
  - _Status: 基本實現 - 需要確認展開功能是否顯示員工明細和分攤管理費明細_

- [ ] 3.2.2 補完客戶成本表格展開明細功能
  - File: src/components/costs/ClientCostsSummaryTable.vue
  - 確認展開功能是否顯示員工明細（員工 ID、員工名稱、工時、成本）
  - 確認展開功能是否顯示分攤管理費明細（成本項目類型 ID、成本項目名稱、分攤金額）
  - 如果未實現，則實現展開明細功能，整合 CostDetail 組件或直接在展開區域顯示明細
  - Purpose: 提供完整的客戶成本明細展示，讓用戶查看詳細的成本組成
  - _Leverage: Ant Design Vue Table expandable feature, src/components/costs/CostDetail.vue (如果存在)_
  - _Requirements: BR5.6.1_
  - _Prompt: Role: Vue 3 Developer with expertise in Ant Design Vue and table components | Task: Verify and complete expandable rows feature in ClientCostsSummaryTable.vue to display employee details and allocation details when expanding a client row, following requirement BR5.6.1. If not implemented, add expandable rows using Ant Design Vue Table expandable feature, display employee details (user_id, user_name, hours, cost) and allocation details (cost_type_id, cost_name, allocated_amount) | Restrictions: Must use Ant Design Vue Table expandable feature, display all required detail items, format numbers properly, follow existing component patterns | Success: Table supports expandable rows, employee details and allocation details are displayed clearly when expanding, numbers are properly formatted_

### 3.3 任務成本表格組件

- [x] 3.3.1 驗證任務成本表格組件已實現 ✅ 已實現
  - File: src/components/costs/TaskCostsTable.vue
  - 任務成本列表展示已實現（顯示任務名稱、客戶名稱、工時、成本、收入、利潤）
  - 按任務名稱排序已實現（需要確認）
  - Purpose: 確認任務成本表格組件已完整實現
  - _Leverage: Ant Design Vue Table component, src/components/costs/TaskCostsTable.vue_
  - _Requirements: BR5.6.2_
  - _Status: 已完成_

### 3.4 成本明細組件

- [ ] 3.4.1 實現成本明細組件（如果需要）
  - File: src/components/costs/CostDetail.vue
  - 顯示員工明細（員工 ID、員工名稱、工時、成本）
  - 顯示分攤管理費明細（成本項目類型 ID、成本項目名稱、分攤金額）
  - 格式化數字顯示（使用貨幣格式）
  - Purpose: 提供成本明細展示組件，讓用戶查看詳細的成本組成
  - _Leverage: Ant Design Vue List or Descriptions component, @/utils/formatters_
  - _Requirements: BR5.6.1_
  - _Prompt: Role: Vue 3 Developer with expertise in data presentation and Ant Design Vue | Task: Create CostDetail.vue component that displays employee details and allocation details in a clear format, following requirement BR5.6.1. Use Ant Design Vue List or Descriptions component, format numbers with proper currency formatting, display employee details (user_id, user_name, hours, cost) and allocation details (cost_type_id, cost_name, allocated_amount) | Restrictions: Must format numbers with proper currency formatting, display details clearly, follow existing component patterns | Success: Component clearly displays all detail items, numbers are properly formatted, details are easy to read_

---

## 4. 路由配置

### 4.1 後端路由配置

- [x] 4.1.1 驗證後端路由配置已實現 ✅ 已實現
  - File: backend/src/router/costs.js
  - 驗證客戶成本分析 API 路由已配置（GET /api/v2/costs/client-summary/:year/:month）
  - 驗證任務成本分析 API 路由已配置（GET /api/v2/costs/task/:year/:month）
  - 驗證管理員權限檢查已實現
  - Purpose: 確認後端路由已正確配置並受保護
  - _Leverage: backend/src/router/costs.js, backend/src/middleware/auth.js_
  - _Requirements: BR5.6.1, BR5.6.2_
  - _Status: 已完成_

### 4.2 前端路由配置

- [x] 4.2.1 驗證前端路由配置已實現 ✅ 已實現
  - File: src/router/index.js
  - 驗證客戶任務成本分析頁面路由已配置（需要確認路由路徑）
  - 驗證管理員權限要求已設置（需要確認）
  - Purpose: 確認前端路由已正確配置
  - _Leverage: src/router/index.js_
  - _Requirements: BR5.6.1, BR5.6.2_
  - _Status: 需要確認路由路徑和權限設置_

---

## 5. 測試

### 5.1 E2E 測試

- [ ] 5.1.1 實現客戶任務成本分析 E2E 測試
  - File: tests/e2e/costs/client-cost-analysis.spec.ts
  - 測試客戶成本分析（驗證所有欄位顯示、展開功能、員工明細、分攤管理費明細）
  - 測試任務成本分析（驗證所有欄位顯示、按任務名稱排序）
  - 測試視圖切換（驗證按客戶/按任務視圖切換）
  - 測試權限控制（驗證非管理員無法訪問）
  - Purpose: 確保客戶任務成本分析功能的端到端正確性
  - _Leverage: Playwright testing framework, tests/helpers/testUtils.ts_
  - _Requirements: BR5.6.1, BR5.6.2_
  - _Prompt: Role: QA Automation Engineer with expertise in Playwright and E2E testing | Task: Create comprehensive E2E tests for client cost analysis feature covering client view (list display, expandable rows, employee details, allocation details), task view (list display, sorting by task name), view switching, and permission control, following requirements BR5.6.1 and BR5.6.2 | Restrictions: Must test real user workflows, ensure tests are maintainable, use existing test utilities, test both success and failure scenarios | Success: E2E tests cover all critical user journeys, tests verify data accuracy, permission control is tested, tests run reliably_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本實現 - 客戶成本分析、任務成本分析、成本收入利潤計算）
- ✅ 路由配置（完整實現）
- ✅ 前端 API 調用函數（完整實現）
- ✅ 客戶任務成本分析前端頁面（完整實現）
- ✅ 客戶成本表格組件（基本實現 - 需要確認展開功能是否完整）
- ✅ 任務成本表格組件（完整實現）

### 待完成功能
- ⚠️ 分攤管理費明細返回（需要補完後端返回分攤明細）
- ⚠️ 員工明細返回（需要補完後端返回員工明細）
- ⚠️ 客戶成本表格展開明細功能（需要確認並補完）
- ⚠️ 成本明細組件（可能需要創建新組件）
- ⚠️ 前端路由配置確認（需要確認路由路徑和權限設置）
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已基本實現，包括：
  - 客戶成本分析（顯示客戶名稱、總工時、總成本、收入、利潤、利潤率）
  - 任務成本分析（顯示任務名稱、客戶名稱、工時、成本、收入、利潤）
  - 視圖切換（按客戶/按任務）
- 需要補完的功能：
  - 分攤管理費明細返回（後端需要返回每個成本項目的分攤金額）
  - 員工明細返回（後端需要返回每個客戶的員工明細）
  - 客戶成本表格展開明細功能（需要確認並補完展開功能，顯示員工明細和分攤管理費明細）
  - 成本明細組件（可能需要創建新組件顯示明細）

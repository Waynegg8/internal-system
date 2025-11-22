# Tasks Document: BR5.5: 員工成本分析

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 已實現
   - `handleGetEmployeeCosts` - 獲取員工成本明細（包含薪資成本和管理費分攤）
   - 計算實際時薪和總成本
   - 整合 PayrollCache、Timesheets、MonthlyOverheadCosts、Users 表

2. **路由配置** ✅ 已實現
   - GET /api/v2/costs/employee/:year/:month

3. **前端 API 調用函數** ✅ 已實現
   - `fetchEmployeeCosts` - 獲取員工成本

4. **前端組件** ✅ 已實現
   - `CostEmployee.vue` - 員工成本分析頁面
   - `EmployeeCostsTable.vue` - 員工成本表格組件
   - `EmployeeHourlySummaryCompact.vue` - 員工時薪摘要組件

### 未實現或部分實現功能

1. **明細展開功能** ⚠️ 需要確認
   - 需求：支援展開查看明細（底薪、津貼/獎金、補休轉加班費、請假扣款、分攤管理費明細）
   - 現狀：需要確認 `EmployeeCostsTable.vue` 是否支援展開功能

2. **分攤管理費明細** ⚠️ 需要確認
   - 需求：顯示每個成本項目的分攤金額
   - 現狀：需要確認後端是否返回分攤明細，前端是否顯示

3. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 員工成本分析 API Handler

- [x] 1.1.1 驗證員工成本分析 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-allocation.js
  - Function: handleGetEmployeeCosts
  - 驗證整合 BR5.4 的分攤計算結果已實現（計算管理費分攤）
  - 驗證整合 BR4 的薪資數據已實現（從 PayrollCache 表查詢）
  - 驗證整合 BR4 的工時數據已實現（從 Timesheets 表查詢）
  - 驗證計算實際時薪和總成本已實現
  - 驗證返回員工成本分析數據已實現（包含員工姓名、底薪、本月工時、薪資成本、分攤管理費、本月總成本、實際時薪）
  - 確認路由配置（backend/src/router/costs.js 中的 GET /api/v2/costs/employee/:year/:month 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援員工成本分析
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.5.1_
  - _Status: 已完成_

- [ ] 1.1.2 補完分攤管理費明細返回
  - File: backend/src/handlers/costs/cost-allocation.js
  - 修改 `handleGetEmployeeCosts` 函數，返回每個成本項目的分攤金額明細
  - 為每個員工計算並返回分攤管理費明細（包含成本項目類型 ID、成本項目名稱、分攤金額）
  - Purpose: 確保後端返回完整的分攤管理費明細，支援前端明細展示
  - _Leverage: backend/src/handlers/costs/cost-allocation.js_
  - _Requirements: BR5.5.2_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update handleGetEmployeeCosts function to return allocation details for each cost item type, including cost_type_id, cost_name, and allocated_amount for each employee, following requirement BR5.5.2 | Restrictions: Must use parameterized queries, calculate allocation for each cost type separately, return properly structured data, maintain existing response format | Success: Function returns allocation details array for each employee, includes all cost item types with their allocation amounts, data structure is clear and easy to use_

---

## 2. 前端 API 調用層

### 2.1 員工成本分析 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/costs.js
  - Function: fetchEmployeeCosts
  - 驗證獲取員工成本分析功能正確
  - 驗證處理年份月份參數正確
  - 驗證錯誤處理和數據轉換正確
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/costs.js_
  - _Requirements: BR5.5.1_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 員工成本分析前端頁面

- [x] 3.1.1 驗證員工成本分析前端頁面已實現 ✅ 已實現
  - File: src/views/costs/CostEmployee.vue
  - 頁面佈局和路由已實現
  - 整合 EmployeeCostsTable 組件
  - 整合 EmployeeHourlySummaryCompact 組件
  - 年份月份選擇器已實現
  - 數據載入和錯誤處理已實現
  - Purpose: 確認員工成本分析頁面已完整實現
  - _Leverage: src/views/costs/CostEmployee.vue, src/components/costs/EmployeeCostsTable.vue, src/components/costs/EmployeeHourlySummaryCompact.vue, src/api/costs.js_
  - _Requirements: BR5.5.1, BR5.5.2_
  - _Status: 已完成_

### 3.2 員工成本表格組件

- [x] 3.2.1 驗證員工成本表格組件已實現 ✅ 已實現（基本功能）
  - File: src/components/costs/EmployeeCostsTable.vue
  - 員工成本列表展示已實現（顯示員工姓名、底薪、本月工時、薪資成本、分攤管理費、本月總成本、實際時薪）
  - 按員工姓名排序已實現（需要確認）
  - Purpose: 確認員工成本表格組件已基本實現
  - _Leverage: Ant Design Vue Table component, src/components/costs/EmployeeCostsTable.vue_
  - _Requirements: BR5.5.1_
  - _Status: 基本實現 - 需要確認是否支援明細展開功能_

- [ ] 3.2.2 補完明細展開功能
  - File: src/components/costs/EmployeeCostsTable.vue
  - 實現表格展開功能（使用 Ant Design Vue Table 的 expandable 功能）
  - 整合 EmployeeCostDetail 組件顯示明細
  - 顯示底薪、津貼/獎金、補休轉加班費、請假扣款、分攤管理費明細
  - Purpose: 提供明細展開功能，讓用戶查看詳細的成本組成
  - _Leverage: Ant Design Vue Table expandable feature, src/components/costs/EmployeeCostDetail.vue_
  - _Requirements: BR5.5.2_
  - _Prompt: Role: Vue 3 Developer with expertise in Ant Design Vue and table components | Task: Add expandable rows feature to EmployeeCostsTable.vue using Ant Design Vue Table expandable functionality, integrate EmployeeCostDetail component to display cost breakdown details (base salary, allowances, overtime pay, leave deduction, allocation details), following requirement BR5.5.2 | Restrictions: Must use Ant Design Vue Table expandable feature, display all required detail items, format numbers properly, follow existing component patterns | Success: Table supports expandable rows, EmployeeCostDetail component displays all cost breakdown items clearly, numbers are properly formatted_

### 3.3 員工成本明細組件

- [ ] 3.3.1 實現員工成本明細組件
  - File: src/components/costs/EmployeeCostDetail.vue
  - 顯示底薪、津貼/獎金、補休轉加班費、請假扣款、分攤管理費明細
  - 格式化數字顯示（使用貨幣格式）
  - 顯示每個成本項目的分攤金額（分攤管理費明細）
  - Purpose: 提供員工成本明細展示，讓用戶了解成本的組成
  - _Leverage: Ant Design Vue Descriptions or List component, @/utils/formatters_
  - _Requirements: BR5.5.2_
  - _Prompt: Role: Vue 3 Developer with expertise in data presentation and Ant Design Vue | Task: Create EmployeeCostDetail.vue component that displays base salary, allowances, overtime pay, leave deduction, and allocation details in a clear format, following requirement BR5.5.2. Use Ant Design Vue Descriptions or List component, format numbers with proper currency formatting, display allocation details as a list showing each cost item type and its allocated amount | Restrictions: Must format numbers with proper currency formatting, display allocation details as a list, follow existing component patterns | Success: Component clearly displays all cost breakdown items, numbers are properly formatted, allocation details are easy to read_

---

## 4. 路由配置

### 4.1 後端路由配置

- [x] 4.1.1 驗證後端路由配置已實現 ✅ 已實現
  - File: backend/src/router/costs.js
  - 驗證員工成本分析 API 路由已配置（GET /api/v2/costs/employee/:year/:month）
  - 驗證管理員權限檢查已實現
  - Purpose: 確認後端路由已正確配置並受保護
  - _Leverage: backend/src/router/costs.js, backend/src/middleware/auth.js_
  - _Requirements: BR5.5.1_
  - _Status: 已完成_

### 4.2 前端路由配置

- [x] 4.2.1 驗證前端路由配置已實現 ✅ 已實現
  - File: src/router/index.js
  - 驗證員工成本分析頁面路由已配置（需要確認路由路徑）
  - 驗證管理員權限要求已設置（需要確認）
  - Purpose: 確認前端路由已正確配置
  - _Leverage: src/router/index.js_
  - _Requirements: BR5.5.1_
  - _Status: 需要確認路由路徑和權限設置_

---

## 5. 測試

### 5.1 E2E 測試

- [ ] 5.1.1 實現員工成本分析 E2E 測試
  - File: tests/e2e/costs/employee-cost-analysis.spec.ts
  - 測試員工成本列表展示（驗證所有欄位顯示、按員工姓名排序）
  - 測試明細展開功能（驗證展開後顯示底薪、津貼/獎金、補休轉加班費、請假扣款、分攤管理費明細）
  - 測試分攤管理費明細（驗證每個成本項目的分攤金額顯示）
  - 測試權限控制（驗證非管理員無法訪問）
  - Purpose: 確保員工成本分析功能的端到端正確性
  - _Leverage: Playwright testing framework, tests/helpers/testUtils.ts_
  - _Requirements: BR5.5.1, BR5.5.2_
  - _Prompt: Role: QA Automation Engineer with expertise in Playwright and E2E testing | Task: Create comprehensive E2E tests for employee cost analysis feature covering list display, sorting by employee name, detail expansion, allocation details display, and permission control, following requirements BR5.5.1 and BR5.5.2 | Restrictions: Must test real user workflows, ensure tests are maintainable, use existing test utilities, test both success and failure scenarios | Success: E2E tests cover all critical user journeys, tests verify data accuracy, permission control is tested, tests run reliably_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（完整實現 - 員工成本明細、實際時薪計算、管理費分攤）
- ✅ 路由配置（完整實現）
- ✅ 前端 API 調用函數（完整實現）
- ✅ 員工成本分析前端頁面（完整實現）
- ✅ 員工成本表格組件（基本實現 - 缺少明細展開功能）

### 待完成功能
- ⚠️ 分攤管理費明細返回（需要補完後端返回分攤明細）
- ⚠️ 明細展開功能（需要補完表格展開功能和明細組件）
- ⚠️ 員工成本明細組件（完全未實現）
- ⚠️ 前端路由配置確認（需要確認路由路徑和權限設置）
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已基本實現，包括：
  - 員工成本列表展示（顯示所有必要欄位）
  - 實際時薪計算（月薪 + 分攤管理費）÷ 實際工時
  - 管理費分攤計算（整合三種分攤方式）
- 需要補完的功能：
  - 分攤管理費明細返回（後端需要返回每個成本項目的分攤金額）
  - 明細展開功能（表格需要支援展開，顯示詳細的成本組成）
  - 員工成本明細組件（需要創建新組件顯示明細）

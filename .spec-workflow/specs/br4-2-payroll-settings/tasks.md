# Tasks Document: BR4.2: 員工底薪與加給設定

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler（基本功能）** ✅
   - `handleGetUserSalary` - 獲取員工薪資設定（包含底薪和薪資項目）
   - `handleUpdateUserSalary` - 更新員工薪資設定（包含底薪和薪資項目）
   - 但路由是 `/api/v2/users/:id/salary`，不是設計規範要求的 `/api/v2/payroll/employees/:employeeId/base-salary` 和 `/api/v2/payroll/employees/:employeeId/salary-items`
   - 薪資項目通過 `items` 參數批量更新，沒有獨立的 CRUD API

2. **薪資項目類型 CRUD API Handler** ✅
   - `handleGetSalaryItemTypes` - 獲取薪資項目類型列表
   - `handleCreateSalaryItemType` - 創建薪資項目類型
   - `handleUpdateSalaryItemType` - 更新薪資項目類型
   - `handleDeleteSalaryItemType` - 刪除薪資項目類型（含引用檢查）
   - `handleToggleSalaryItemType` - 切換啟用狀態

3. **路由配置（基本功能）** ✅
   - GET/PUT /api/v2/users/:id/salary
   - GET/POST/PUT/DELETE /api/v2/payroll/salary-item-types

4. **前端 API 調用函數（基本功能）** ✅
   - `loadUserSalary` - 獲取員工薪資設定
   - `updateUserSalary` - 更新員工薪資設定
   - `loadSalaryItemTypes`, `createSalaryItemType`, `updateSalaryItemType`, `deleteSalaryItemType` - 薪資項目類型管理

5. **前端組件（基本功能）** ✅
   - `EmployeeSalaryForm.vue` - 員工底薪設定表單（包含底薪和薪資項目管理）
   - `EmployeeSalaryItemsList.vue` - 薪資項目列表組件（支援發放週期和生效日期）

### 未實現或部分實現功能

1. **員工底薪設定 API Handler（設計規範）** ⚠️ 部分實現
   - 需求：獨立的 `handleSetEmployeeBaseSalary` 函數，路由 `/api/v2/payroll/employees/:employeeId/base-salary`
   - 現狀：功能已實現但合併在 `handleUpdateUserSalary` 中，路由不符合設計規範

2. **薪資項目 CRUD API Handler（設計規範）** ⚠️ 部分實現
   - 需求：獨立的 `handleGetSalaryItems`, `handleCreateSalaryItem`, `handleUpdateSalaryItem`, `handleDeleteSalaryItem` 函數
   - 現狀：功能已實現但通過 `handleUpdateUserSalary` 的 `items` 參數批量更新，沒有獨立的 CRUD API

3. **前端 API 調用函數（設計規範）** ⚠️ 部分實現
   - 需求：`setEmployeeBaseSalary`, `getSalaryItems`, `createSalaryItem`, `updateSalaryItem`, `deleteSalaryItem`
   - 現狀：使用 `loadUserSalary` 和 `updateUserSalary`，沒有獨立的函數

4. **薪資項目類型列表和表單組件** ❌
   - 需求：`SalaryItemTypeList.vue` 和 `SalaryItemTypeForm.vue`
   - 現狀：未實現

5. **薪資設定前端頁面重構** ⚠️ 部分實現
   - 需求：員工薪資管理頁面（從系統設定改為員工管理）
   - 現狀：`PayrollSettings.vue` 目前是系統設定頁面，不是員工薪資管理頁面

---

## 1. 後端 API 實現

### 1.1 員工底薪設定 API Handler

- [x] 1.1.1 驗證員工底薪設定功能已實現 ✅ 已實現（基本功能）
  - File: backend/src/handlers/payroll/user-salary.js
  - Functions: handleGetUserSalary, handleUpdateUserSalary
  - 驗證底薪設定邏輯已實現（通過 updateUserSalary）
  - 驗證底薪金額驗證已實現（>= 0）
  - 驗證員工 ID 存在性驗證已實現
  - 驗證自動觸發薪資重新計算已實現
  - Purpose: 確認現有後端業務邏輯處理正確支援員工底薪設定
  - _Leverage: backend/src/handlers/payroll/user-salary.js, backend/src/router/payroll.js_
  - _Requirements: BR4.2.1_
  - _Status: 已完成（但路由不符合設計規範）_

- [ ] 1.1.2 實現員工底薪設定 API Handler（符合設計規範）
  - File: backend/src/handlers/payroll/payroll-settings.js
  - Function: handleSetEmployeeBaseSalary
  - 實現員工底薪設定邏輯，驗證底薪金額必須大於等於 0
  - 實現員工 ID 存在性驗證
  - 實現自動觸發薪資重新計算
  - 確認路由配置（backend/src/router/payroll.js 中的 PUT /api/v2/payroll/employees/:employeeId/base-salary 路由）
  - Purpose: 提供符合設計規範的員工底薪設定 API 端點
  - _Leverage: backend/src/utils/response.js, backend/src/utils/payroll-recalculate.js, backend/src/router/payroll.js_
  - _Requirements: BR4.2.1_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Implement handleSetEmployeeBaseSalary function in payroll-settings.js that sets employee base salary with validation (amount >= 0, employee exists) and automatically triggers payroll recalculation. Ensure the route is properly configured in backend/src/router/payroll.js as PUT /api/v2/payroll/employees/:employeeId/base-salary | Restrictions: Must use parameterized queries, must validate input (amount >= 0, employee exists), must trigger payroll recalculation, must follow existing response format patterns | Success: Function sets base salary correctly with validation, triggers payroll recalculation, response format is correct, route is properly configured_

### 1.2 薪資項目 CRUD API Handler

- [x] 1.2.1 驗證薪資項目管理功能已實現 ✅ 已實現（基本功能）
  - File: backend/src/handlers/payroll/user-salary.js
  - Functions: handleGetUserSalary, handleUpdateUserSalary
  - 驗證薪資項目 CRUD 操作已實現（通過 items 參數批量更新）
  - 驗證發放週期設定已實現（monthly, once, yearly）
  - 驗證生效日期和過期日期設定已實現
  - Purpose: 確認現有後端業務邏輯處理正確支援薪資項目管理
  - _Leverage: backend/src/handlers/payroll/user-salary.js_
  - _Requirements: BR4.2.2, BR4.2.3, BR4.2.4_
  - _Status: 已完成（但沒有獨立的 CRUD API）_

- [ ] 1.2.2 實現薪資項目 CRUD API Handler（符合設計規範）
  - File: backend/src/handlers/payroll/payroll-settings.js
  - Functions: handleGetSalaryItems, handleCreateSalaryItem, handleUpdateSalaryItem, handleDeleteSalaryItem
  - 實現薪資項目的完整 CRUD 操作（軟刪除）
  - 支援發放週期設定（monthly, once, yearly）和指定月份選擇
  - 支援生效日期和過期日期設定
  - 驗證金額必須大於 0，生效日期格式正確，過期日期必須晚於生效日期
  - 實現自動觸發薪資重新計算
  - 確認路由配置（backend/src/router/payroll.js 中的 GET/POST/PUT/DELETE /api/v2/payroll/employees/:employeeId/salary-items 路由）
  - Purpose: 提供符合設計規範的薪資項目 CRUD API 端點
  - _Leverage: backend/src/utils/response.js, backend/src/utils/payroll-recalculate.js, backend/src/router/payroll.js_
  - _Requirements: BR4.2.2, BR4.2.3, BR4.2.4_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Implement CRUD functions for salary items in payroll-settings.js that support creating, reading, updating, and soft deleting salary items with recurring type (monthly/once/yearly) and effective date handling. Include validation for amount > 0, date formats, and expiry date after effective date. Ensure the routes are properly configured in backend/src/router/payroll.js as GET/POST/PUT/DELETE /api/v2/payroll/employees/:employeeId/salary-items | Restrictions: Must use parameterized queries, must validate all input parameters, must handle recurring types and monthly selections correctly, must use soft delete, must trigger payroll recalculation, must follow existing response format patterns | Success: All CRUD operations work correctly with proper validation, recurring types are handled correctly, payroll recalculation is triggered, response format is correct, routes are properly configured_

### 1.3 薪資項目類型 CRUD API Handler

- [x] 1.3.1 驗證薪資項目類型 CRUD API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/payroll/salary-item-types.js
  - Functions: handleGetSalaryItemTypes, handleCreateSalaryItemType, handleUpdateSalaryItemType, handleDeleteSalaryItemType, handleToggleSalaryItemType
  - 驗證名稱驗證、重複檢查、引用檢查、搜尋功能已實現
  - 確認路由配置已存在（backend/src/router/payroll.js 中的 GET/POST/PUT/DELETE /api/v2/payroll/salary-item-types 路由）
  - Purpose: 確認薪資項目類型管理功能已完整實現
  - _Leverage: backend/src/handlers/payroll/salary-item-types.js, backend/src/router/payroll.js_
  - _Requirements: BR4.2.5_
  - _Status: 已完成_

### 1.4 路由配置

- [x] 1.4.1 驗證基本路由配置已實現 ✅ 已實現
  - File: backend/src/router/payroll.js
  - 驗證 GET/PUT /api/v2/users/:id/salary 路由已配置
  - 驗證 GET/POST/PUT/DELETE /api/v2/payroll/salary-item-types 路由已配置
  - Purpose: 確認基本 API 端點已建立
  - _Leverage: backend/src/router/payroll.js_
  - _Requirements: BR4.2.1, BR4.2.2, BR4.2.5_
  - _Status: 已完成（但路由不符合設計規範）_

- [ ] 1.4.2 配置設計規範路由（如實現獨立 API）
  - File: backend/src/router/payroll.js
  - 配置 PUT /api/v2/payroll/employees/:employeeId/base-salary 路由（如實現獨立 API）
  - 配置 GET/POST/PUT/DELETE /api/v2/payroll/employees/:employeeId/salary-items 路由（如實現獨立 API）
  - Purpose: 建立符合設計規範的 API 端點（可選，如果保留現有批量更新方式則不需要）
  - _Leverage: backend/src/router/payroll.js_
  - _Requirements: BR4.2.1, BR4.2.2_
  - _Prompt: Role: Backend Developer with expertise in routing configuration | Task: Add routes for employee base salary and salary items APIs in backend/src/router/payroll.js if implementing separate APIs: PUT /api/v2/payroll/employees/:employeeId/base-salary and GET/POST/PUT/DELETE /api/v2/payroll/employees/:employeeId/salary-items. Both routes should use withAdmin middleware and call handlePayroll handler | Restrictions: Must follow existing route patterns, must use withAdmin middleware, must match route patterns correctly | Success: Routes are properly configured, middleware is applied, routes match handler patterns_

---

## 2. 前端 API 調用層

### 2.1 員工底薪和薪資項目 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現（基本功能）
  - File: src/api/payroll.js
  - Functions: loadUserSalary, updateUserSalary
  - 驗證獲取員工薪資設定功能正確
  - 驗證更新員工薪資設定功能正確（包含底薪和薪資項目）
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/payroll.js_
  - _Requirements: BR4.2.1, BR4.2.2_
  - _Status: 已完成（但沒有獨立的函數）_

- [ ] 2.1.2 補充前端 API 調用函數（符合設計規範，可選）
  - File: src/api/payroll.js
  - 新增 setEmployeeBaseSalary, getSalaryItems, createSalaryItem, updateSalaryItem, deleteSalaryItem 函數（如後端實現獨立 API）
  - 或保持現有 loadUserSalary 和 updateUserSalary 函數（如保留批量更新方式）
  - 使用統一的錯誤處理和回應格式處理
  - Purpose: 提供符合設計規範的 API 調用函數（可選）
  - _Leverage: @/utils/apiHelpers, axios_
  - _Requirements: BR4.2.1, BR4.2.2, BR4.2.3, BR4.2.4_
  - _Prompt: Role: Frontend Developer with expertise in API integration and Axios | Task: Add missing API functions to src/api/payroll.js for employee base salary and salary items management (setEmployeeBaseSalary, getSalaryItems, createSalaryItem, updateSalaryItem, deleteSalaryItem) if backend implements separate APIs, or keep existing loadUserSalary and updateUserSalary if using batch update approach. All functions should use unified error handling and response format processing from @/utils/apiHelpers | Restrictions: Must use axios for HTTP requests, must handle errors properly, must use extractApiData/extractApiArray utilities, must follow existing API patterns | Success: All API functions are implemented correctly, error handling works, response format is processed correctly_

### 2.2 薪資項目類型 API 調用函數

- [x] 2.2.1 驗證薪資項目類型 API 調用函數已實現 ✅ 已實現
  - File: src/api/payroll.js
  - Functions: loadSalaryItemTypes, createSalaryItemType, updateSalaryItemType, deleteSalaryItemType
  - 驗證所有薪資項目類型管理功能正確
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/payroll.js_
  - _Requirements: BR4.2.5_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 員工底薪設定表單組件

- [x] 3.1.1 驗證員工底薪設定表單組件已實現 ✅ 已實現
  - File: src/components/payroll/EmployeeSalaryForm.vue
  - 包含底薪設定表單和薪資項目管理
  - 實現表單驗證和提交處理
  - Purpose: 確認員工底薪設定表單組件已實現
  - _Leverage: src/components/payroll/EmployeeSalaryForm.vue, src/components/payroll/EmployeeSalaryItemsList.vue_
  - _Requirements: BR4.2.1_
  - _Status: 已完成_

### 3.2 薪資項目列表和表單組件

- [x] 3.2.1 驗證薪資項目列表和表單組件已實現 ✅ 已實現
  - File: src/components/payroll/EmployeeSalaryItemsList.vue
  - 支援薪資項目列表展示和編輯
  - 支援發放週期（monthly, once, yearly）和生效日期設定
  - 實現完整的 CRUD 操作和驗證
  - Purpose: 確認薪資項目管理組件已實現
  - _Leverage: src/components/payroll/EmployeeSalaryItemsList.vue_
  - _Requirements: BR4.2.2, BR4.2.3, BR4.2.4_
  - _Status: 已完成_

### 3.3 薪資項目類型列表和表單組件

- [ ] 3.3.1 實現薪資項目類型列表和表單組件
  - Files: src/components/payroll/SalaryItemTypeList.vue, src/components/payroll/SalaryItemTypeForm.vue
  - 實現薪資項目類型列表展示（支援搜尋）
  - 實現薪資項目類型表單（支援分類選擇：regular_allowance, irregular_allowance, bonus, deduction, year_end_bonus）
  - 實現完整的 CRUD 操作和驗證
  - Purpose: 提供薪資項目類型的列表展示和表單編輯功能，支援搜尋和完整的 CRUD 操作
  - _Leverage: Ant Design Vue Table and Form components, src/api/payroll.js_
  - _Requirements: BR4.2.5_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Create SalaryItemTypeList.vue and SalaryItemTypeForm.vue components for managing salary item types with search functionality and category selection (regular_allowance, irregular_allowance, bonus, deduction, year_end_bonus). The list component should display types in a table with search, edit, and delete actions. The form component should support creating and editing types with name and category validation | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue components, must support search, must validate category selection, must follow existing component patterns | Success: Components are implemented correctly, search works, category selection works, form validation works, CRUD operations work_

### 3.4 薪資設定前端頁面

- [x] 3.4.1 驗證薪資設定前端頁面已實現 ✅ 已實現（系統設定頁面）
  - File: src/views/payroll/PayrollSettings.vue
  - 目前是系統薪資設定頁面（PayrollSettingsForm）
  - Purpose: 確認現有頁面實現
  - _Leverage: src/views/payroll/PayrollSettings.vue_
  - _Status: 基本實現 - 但不符合需求（應為員工薪資管理頁面）_

- [ ] 3.4.2 重構薪資設定前端頁面為員工薪資管理頁面
  - File: src/views/payroll/PayrollSettings.vue（重構）
  - 修改為員工薪資設定頁面（從系統設定改為員工管理）
  - 整合 EmployeeSalaryForm 和 EmployeeSalaryItemsList 組件
  - 新增薪資項目類型管理區域（整合 SalaryItemTypeList 和 SalaryItemTypeForm）
  - 實現員工選擇和數據載入邏輯
  - Purpose: 重構頁面從系統薪資設定改為員工薪資管理，整合底薪設定、薪資項目管理和類型管理功能
  - _Leverage: src/components/payroll/EmployeeSalaryForm.vue, src/components/payroll/EmployeeSalaryItemsList.vue, src/components/payroll/SalaryItemTypeList.vue, src/components/payroll/SalaryItemTypeForm.vue_
  - _Requirements: BR4.2.1, BR4.2.2, BR4.2.3, BR4.2.4, BR4.2.5_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API | Task: Refactor PayrollSettings.vue from system settings to employee salary management page that integrates EmployeeSalaryForm, EmployeeSalaryItemsList, SalaryItemTypeList, and SalaryItemTypeForm components. Include employee selection and data loading logic. The page should have tabs or sections for employee salary management and salary item type management | Restrictions: Must use Vue 3 Composition API, must handle errors properly, must integrate existing components, must follow existing component patterns, must support employee selection | Success: Page component is refactored correctly, all components are integrated, employee selection works, data loading and error handling work, tabs/sections are properly organized_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 實現薪資設定 E2E 測試
  - File: tests/e2e/payroll/payroll-settings.spec.ts
  - 測試員工選擇和底薪設定流程
  - 測試薪資項目 CRUD 操作（包含發放週期和生效日期）
  - 測試薪資項目類型 CRUD 操作
  - Purpose: 確保所有薪資設定功能從用戶角度完整運作，驗證完整的業務流程
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR4.2.1, BR4.2.2, BR4.2.3, BR4.2.4, BR4.2.5_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create E2E tests for payroll settings functionality including employee selection, base salary setting, salary items CRUD with recurring types and effective dates, and salary item types CRUD. Use Playwright framework and test data utilities from tests/e2e/utils/test-data.ts | Restrictions: Must use Playwright, must test all functionality including validation rules, must use test data utilities, must cover complete business workflows | Success: All E2E tests pass, all functionality including validation and business rules is tested_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本功能 - 通過 user-salary.js 實現）
- ✅ 路由配置（基本功能 - 但不符合設計規範）
- ✅ 前端 API 調用函數（基本功能 - loadUserSalary, updateUserSalary）
- ✅ 員工底薪設定表單組件（完整實現）
- ✅ 薪資項目列表和表單組件（完整實現）
- ✅ 薪資項目類型 CRUD API Handler（完整實現）
- ✅ 薪資項目類型 API 調用函數（完整實現）

### 待完成功能
- ⚠️ 員工底薪設定 API Handler（符合設計規範 - 可選，如保留現有方式則不需要）
- ⚠️ 薪資項目 CRUD API Handler（符合設計規範 - 可選，如保留現有方式則不需要）
- ⚠️ 前端 API 調用函數（符合設計規範 - 可選）
- ❌ 薪資項目類型列表和表單組件（完全未實現）
- ❌ 薪資設定前端頁面重構（需要從系統設定改為員工管理）
- ❌ E2E 測試（完全未實現）

### 備註
- 現有實現通過 `/api/v2/users/:id/salary` 批量更新底薪和薪資項目，功能完整但不符合設計規範的獨立 API 要求
- 可以選擇：
  1. 保留現有批量更新方式，不實現獨立 API（但需要重構前端頁面和新增類型管理組件）
  2. 實現符合設計規範的獨立 API（需要新增後端 Handler 和前端 API 函數）

# Tasks Document: BR4.1: 每月薪資結算

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler（基本功能）** ✅
   - `handlePayrollPreview` - 獲取薪資預覽（所有員工）
   - `handleCalculatePayroll` - 計算單個員工薪資
   - 薪資計算邏輯完整（底薪、加給、津貼、全勤獎金、加班費、誤餐費、交通補貼、績效獎金、年終獎金、請假扣款、固定扣款）
   - 快取機制已實現（使用 PayrollCache 表）

2. **路由配置（基本功能）** ✅
   - GET /api/v2/payroll/preview/:month
   - POST /api/v2/payroll/calculate

3. **前端 API 調用函數（基本功能）** ✅
   - `loadPayrollPreview` - 獲取薪資預覽
   - `calculateEmployeePayroll` - 計算單個員工薪資

4. **前端組件（基本功能）** ✅
   - `PayrollCalc.vue` - 主頁面組件
   - `PayrollCalcTable.vue` - 薪資表格組件（包含月份選擇、表格展示、展開明細、列印按鈕）
   - `PayrollDetailRow.vue` - 詳細明細組件（使用 Collapse 展示）
   - `PayslipPrint.vue` - 列印組件（但沒有使用 API，而是直接使用本地數據）

### 未實現或部分實現功能

1. **薪資明細 API Handler** ❌
   - 需求：獨立的 `handleGetPayrollDetail` 函數，返回詳細計算明細
   - 現狀：前端直接使用 `calculateEmployeePayroll` 的完整數據，沒有獨立的明細 API

2. **薪資單列印 API Handler** ❌
   - 需求：獨立的 `handlePrintPayroll` 函數，生成 PDF 或 HTML 格式
   - 現狀：前端 `PayslipPrint.vue` 直接使用本地數據生成列印內容，沒有後端 API

3. **前端 API 調用函數（明細和列印）** ❌
   - 需求：`getPayrollDetail` 和 `printPayroll` 函數
   - 現狀：未實現

4. **前端組件（設計規範）** ⚠️ 部分實現
   - 需求：獨立的 `MonthSelector`、`PayrollTable`、`PayrollDetailModal`、`PayrollPrintModal` 組件
   - 現狀：功能已實現但組件結構不符合設計規範（月份選擇和表格合併在 `PayrollCalcTable.vue`，明細使用展開行而非彈窗，列印使用 `PayslipPrint.vue` 但沒有使用 API）

5. **總計行顯示** ❌
   - 需求：表格底部顯示總計行（總應發金額、總實發金額、總扣款、各項目總計）
   - 現狀：未實現

6. **路由配置（明細和列印）** ❌
   - 需求：GET /api/v2/payroll/calculate/:employeeId/detail 和 GET /api/v2/payroll/print/:employeeId
   - 現狀：未配置

---

## 1. 後端 API 實現

### 1.1 薪資計算 API Handlers

- [x] 1.1.1 驗證薪資計算 API Handler 實現 ✅ 已實現
  - File: backend/src/handlers/payroll/payroll-calculation.js
  - Functions: handlePayrollPreview, handleCalculatePayroll
  - 驗證薪資計算邏輯已正確實現（根據月份計算所有員工的薪資）
  - 驗證薪資計算規則已實現（底薪、加給、津貼、全勤獎金、加班費、誤餐費、交通補貼、績效獎金、年終獎金、請假扣款、固定扣款）
  - 驗證快取機制已實現（使用 PayrollCache 表）
  - 確認路由配置（backend/src/router/payroll.js 中的 GET /api/v2/payroll/preview/:month 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援薪資計算
  - _Leverage: backend/src/utils/payroll-calculator.js, backend/src/utils/payroll-cache.js, backend/src/router/payroll.js_
  - _Requirements: BR4.1.1, BR4.1.2_
  - _Status: 已完成_

- [ ] 1.1.2 實現薪資明細 API Handler
  - File: backend/src/handlers/payroll/payroll-calculation.js
  - Function: handleGetPayrollDetail
  - 實現薪資明細查詢（加班費明細、時薪資訊、交通補貼明細、請假扣款明細、年終獎金資訊）
  - 可以重用 `calculateEmployeePayroll` 的結果，但返回格式化的明細數據
  - 確認路由配置（backend/src/router/payroll.js 中的 GET /api/v2/payroll/calculate/:employeeId/detail 路由）
  - Purpose: 提供獨立的薪資明細查詢 API，支援前端明細彈窗組件
  - _Leverage: backend/src/utils/payroll-calculator.js, backend/src/utils/response.js, backend/src/router/payroll.js_
  - _Requirements: BR4.1.3_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Implement handleGetPayrollDetail function in payroll-calculation.js that queries detailed payroll information for a specific employee including overtime details (work type, hours, rate, amount), hourly rate info (base salary, hourly rate, full attendance status), transport allowance details (outing records, distance, intervals, amount), leave deduction details (leave type, days, deduction rate, amount), and year-end bonus info (amount, payment month). The function can reuse calculateEmployeePayroll result but should format the data for detail view. Ensure the route is properly configured in backend/src/router/payroll.js | Restrictions: Must use parameterized queries to prevent SQL injection, must return all required detail information, must follow existing response format patterns, must verify route configuration | Success: Function returns all required detail information correctly, response format is correct, route is properly configured_

- [ ] 1.1.3 實現薪資單列印 API Handler
  - File: backend/src/handlers/payroll/payroll-print.js
  - Function: handlePrintPayroll
  - 實現薪資單列印邏輯（生成 PDF 或 HTML 格式）
  - 包含所有薪資項目和明細
  - 包含公司資訊和員工資訊
  - 確認路由配置（backend/src/router/payroll.js 中的 GET /api/v2/payroll/print/:employeeId 路由）
  - Purpose: 提供後端薪資單列印功能，生成適合列印的格式
  - _Leverage: backend/src/utils/payroll-calculator.js, backend/src/utils/response.js, backend/src/router/payroll.js_
  - _Requirements: BR4.1.4_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and PDF/HTML generation | Task: Implement handlePrintPayroll function in payroll-print.js that generates payroll slip in PDF or HTML format for a specific employee. The function should include all payroll items and details, company information, and employee information. Ensure the route is properly configured in backend/src/router/payroll.js. Consider using HTML format for easier implementation in Cloudflare Workers environment | Restrictions: Must generate print-friendly format, must include all payroll items and details, must include company and employee information, must follow existing response format patterns, must verify route configuration | Success: Function generates payroll slip correctly in print-friendly format, all required information is included, response format is correct, route is properly configured_

### 1.2 路由配置

- [x] 1.2.1 驗證薪資計算 API 路由已配置 ✅ 已實現
  - File: backend/src/router/payroll.js
  - 驗證 GET /api/v2/payroll/preview/:month 路由已配置
  - 驗證 POST /api/v2/payroll/calculate 路由已配置
  - Purpose: 確認 API 端點已建立並連接前端請求與後端 Handler
  - _Leverage: backend/src/router/payroll.js_
  - _Requirements: BR4.1.1, BR4.1.2_
  - _Status: 已完成_

- [ ] 1.2.2 配置薪資明細和列印 API 路由
  - File: backend/src/router/payroll.js
  - 配置 GET /api/v2/payroll/calculate/:employeeId/detail 路由
  - 配置 GET /api/v2/payroll/print/:employeeId 路由
  - Purpose: 建立明細和列印 API 端點
  - _Leverage: backend/src/router/payroll.js_
  - _Requirements: BR4.1.3, BR4.1.4_
  - _Prompt: Role: Backend Developer with expertise in routing configuration | Task: Add routes for payroll detail and print APIs in backend/src/router/payroll.js: GET /api/v2/payroll/calculate/:employeeId/detail and GET /api/v2/payroll/print/:employeeId. Both routes should use withAdmin middleware and call handlePayroll handler | Restrictions: Must follow existing route patterns, must use withAdmin middleware, must match route patterns correctly | Success: Routes are properly configured, middleware is applied, routes match handler patterns_

---

## 2. 前端 API 調用層

### 2.1 薪資計算 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/payroll.js
  - Function: loadPayrollPreview, calculateEmployeePayroll
  - 驗證獲取薪資預覽功能正確
  - 驗證計算單個員工薪資功能正確
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/payroll.js_
  - _Requirements: BR4.1.1, BR4.1.2_
  - _Status: 已完成_

- [ ] 2.1.2 補充前端 API 調用函數（明細和列印）
  - File: src/api/payroll.js
  - 實現 getPayrollDetail 函數（調用 GET /api/v2/payroll/calculate/:employeeId/detail?month=YYYY-MM）
  - 實現 printPayroll 函數（調用 GET /api/v2/payroll/print/:employeeId?month=YYYY-MM）
  - 使用統一的錯誤處理和回應格式處理
  - Purpose: 提供明細和列印 API 調用封裝
  - _Leverage: @/utils/apiHelpers, axios_
  - _Requirements: BR4.1.3, BR4.1.4_
  - _Prompt: Role: Frontend Developer with expertise in API integration and Axios | Task: Supplement API functions in src/api/payroll.js: implement getPayrollDetail (calls GET /api/v2/payroll/calculate/:employeeId/detail?month=YYYY-MM), implement printPayroll (calls GET /api/v2/payroll/print/:employeeId?month=YYYY-MM). All functions should use unified error handling and response format processing from @/utils/apiHelpers | Restrictions: Must use axios for HTTP requests, must handle errors properly, must use extractApiData/extractApiArray utilities, must follow existing API patterns | Success: All API functions are implemented correctly, error handling works, response format is processed correctly_

---

## 3. 前端組件實現

### 3.1 薪資結算主頁面組件

- [x] 3.1.1 驗證薪資結算前端頁面已實現 ✅ 已實現（基本功能）
  - File: src/views/payroll/PayrollCalc.vue
  - 頁面佈局和路由
  - 數據載入和錯誤處理
  - 整合 PayrollCalcTable 組件
  - Purpose: 確認主頁面組件已實現
  - _Leverage: src/views/payroll/PayrollCalc.vue, src/components/payroll/PayrollCalcTable.vue_
  - _Requirements: BR4.1.1, BR4.1.2_
  - _Status: 基本實現 - 功能已實現但組件結構不符合設計規範_

- [ ] 3.1.2 重構薪資結算前端頁面為設計規範
  - File: src/views/payroll/PayrollCalculation.vue（重構 PayrollCalc.vue）
  - 重構現有 PayrollCalc.vue 為符合設計規範的 PayrollCalculation.vue
  - 實現頁面佈局和路由
  - 整合所有設計規範子組件（MonthSelector, PayrollTable, PayrollDetailModal, PayrollPrintModal）
  - 實現數據載入和錯誤處理
  - 實現月份選擇管理
  - Purpose: 重構頁面組件以符合設計規範，提升組件可重用性和維護性
  - _Leverage: src/components/payroll/MonthSelector.vue, src/components/payroll/PayrollTable.vue, src/components/payroll/PayrollDetailModal.vue, src/components/payroll/PayrollPrintModal.vue, src/api/payroll.js, @/utils/apiHelpers_
  - _Requirements: BR4.1.1, BR4.1.2_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API | Task: Refactor existing PayrollCalc.vue to PayrollCalculation.vue following design specifications, integrate MonthSelector, PayrollTable, PayrollDetailModal, and PayrollPrintModal components, manage month selection, handle data loading and error handling. The component should use Vue 3 Composition API, handle month changes from MonthSelector, handle detail click events from PayrollTable to show PayrollDetailModal, handle print click events from PayrollTable to show PayrollPrintModal | Restrictions: Must use Vue 3 Composition API, must handle errors properly, must follow existing component patterns, must use router for navigation | Success: Page component is implemented correctly, all sub-components are integrated, data loading and error handling work, month selection management works_

### 3.2 月份選擇組件

- [ ] 3.2.1 實現月份選擇組件
  - File: src/components/payroll/MonthSelector.vue
  - 實現月份選擇器（使用 DatePicker 組件）
  - 實現月份變更事件
  - 預設顯示當前月份（YYYY-MM 格式）
  - 支援選擇歷史月份和未來月份
  - Purpose: 提供獨立的月份選擇組件，符合設計規範
  - _Leverage: Ant Design Vue DatePicker component_
  - _Requirements: BR4.1.1_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Create MonthSelector.vue component that provides month selection using Ant Design Vue DatePicker component. The component should accept value prop (YYYY-MM format) and emit @change event when month changes. Default to current month, support selecting historical and future months | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue DatePicker component, must emit events properly, must handle props correctly, must follow existing component patterns | Success: Component is implemented correctly, month selection works, events are emitted correctly, props are handled correctly_

### 3.3 薪資表格組件

- [x] 3.3.1 驗證薪資表格組件已實現 ✅ 已實現（基本功能）
  - File: src/components/payroll/PayrollCalcTable.vue
  - 薪資列表表格展示
  - 月份選擇（合併在表格組件中）
  - 展開明細功能（使用展開行）
  - 列印按鈕
  - 加載狀態顯示
  - 空數據提示
  - Purpose: 確認薪資表格組件已實現
  - _Leverage: src/components/payroll/PayrollCalcTable.vue_
  - _Requirements: BR4.1.2_
  - _Status: 基本實現 - 功能已實現但組件結構不符合設計規範（月份選擇合併在表格中，明細使用展開行而非彈窗）_

- [ ] 3.3.2 重構薪資表格組件為設計規範
  - File: src/components/payroll/PayrollTable.vue（重構 PayrollCalcTable.vue）
  - 重構現有 PayrollCalcTable.vue 為符合設計規範的 PayrollTable.vue
  - 實現薪資列表表格展示（移除月份選擇，由父組件管理）
  - 實現明細查看按鈕（發送事件而非展開行）
  - 實現列印按鈕（發送事件）
  - 實現加載狀態顯示
  - 實現空數據提示
  - Purpose: 重構表格組件以符合設計規範，提升組件可重用性
  - _Leverage: Ant Design Vue Table component, @/utils/formatters_
  - _Requirements: BR4.1.2_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Refactor existing PayrollCalcTable.vue to PayrollTable.vue following design specifications, displays payroll list in a table format using Ant Design Vue Table component, removes month selector (managed by parent), shows detail view button (emits event), shows print button (emits event), shows loading state, and shows empty data message. The component should accept payrolls prop and loading prop from parent, and emit @detail-click and @print-click events | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue components, must handle props and events correctly, must format currency properly, must follow existing component patterns | Success: Component is implemented correctly, table displays all required fields, events are emitted correctly, loading and empty states are handled_

- [ ] 3.3.3 實現總計行顯示功能
  - File: src/components/payroll/PayrollTable.vue（擴展）
  - 實現表格底部總計行顯示
  - 包含總應發金額、總實發金額、總扣款等統計
  - 各項目的總計（底薪總計、加給總計、津貼總計、全勤獎金總計、加班費總計、誤餐費總計、交通補貼總計、績效獎金總計、年終獎金總計、請假扣款總計、固定扣款總計）
  - 總計行樣式與數據行區分
  - Purpose: 實現總計行顯示功能，符合需求 BR4.1.5
  - _Leverage: Ant Design Vue Table component, @/utils/formatters_
  - _Requirements: BR4.1.5_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Implement total row display functionality in PayrollTable.vue component, showing summary statistics at the bottom of the table including total gross earnings, total net pay, total deductions, and totals for each salary item category. The total row should be visually distinguished from data rows | Restrictions: Must use Vue 3 Composition API, must calculate totals correctly from payroll data, must format currency properly, must handle empty data gracefully | Success: Total row displays all required statistics correctly, calculations are accurate, formatting is consistent with data rows_

### 3.4 明細彈窗組件

- [x] 3.4.1 驗證明細展示功能已實現 ✅ 已實現（基本功能）
  - File: src/components/payroll/PayrollDetailRow.vue
  - 詳細計算明細展示（使用 Collapse 展開行）
  - 加班費計算規則與明細
  - 時薪計算基礎與全勤
  - 交通補貼明細
  - 請假扣款明細
  - 年終獎金明細
  - Purpose: 確認明細展示功能已實現
  - _Leverage: src/components/payroll/PayrollDetailRow.vue_
  - _Requirements: BR4.1.3_
  - _Status: 基本實現 - 功能已實現但使用展開行而非彈窗組件_

- [ ] 3.4.2 實現明細彈窗組件
  - File: src/components/payroll/PayrollDetailModal.vue
  - 實現詳細計算明細展示（使用 Modal 而非展開行）
  - 實現明細數據載入（調用 getPayrollDetail API）
  - 實現關閉彈窗功能
  - 顯示加班費明細、時薪資訊、交通補貼明細、請假扣款明細、年終獎金資訊
  - Purpose: 提供獨立的明細彈窗組件，符合設計規範
  - _Leverage: Ant Design Vue Modal component, src/api/payroll.js, @/utils/formatters_
  - _Requirements: BR4.1.3_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Create PayrollDetailModal.vue component that displays detailed payroll calculation information including overtime details, hourly rate info, transport allowance details, leave deduction details, and year-end bonus info. The component should accept visible prop, employeeId prop, and month prop from parent, load detail data when opened using getPayrollDetail API, and emit @close event when closed | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue Modal component, must handle props and events correctly, must format data properly, must follow existing component patterns | Success: Component is implemented correctly, all detail information is displayed correctly, data loading works, events are emitted correctly_

### 3.5 列印彈窗組件

- [x] 3.5.1 驗證列印功能已實現 ✅ 已實現（基本功能）
  - File: src/components/payroll/PayslipPrint.vue
  - 薪資單列印功能
  - 列印預覽
  - 關閉彈窗功能
  - Purpose: 確認列印功能已實現
  - _Leverage: src/components/payroll/PayslipPrint.vue_
  - _Requirements: BR4.1.4_
  - _Status: 基本實現 - 功能已實現但沒有使用後端 API，直接使用本地數據_

- [ ] 3.5.2 重構列印彈窗組件為設計規範
  - File: src/components/payroll/PayrollPrintModal.vue（重構 PayslipPrint.vue）
  - 重構現有 PayslipPrint.vue 為符合設計規範的 PayrollPrintModal.vue
  - 實現薪資單列印功能（調用 printPayroll API 或使用本地數據生成）
  - 實現列印預覽
  - 實現關閉彈窗功能
  - Purpose: 重構列印組件以符合設計規範，整合後端 API（如已實現）
  - _Leverage: Ant Design Vue Modal component, src/api/payroll.js_
  - _Requirements: BR4.1.4_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Refactor existing PayslipPrint.vue to PayrollPrintModal.vue following design specifications, provides payroll slip printing functionality with print preview. The component should accept visible prop, employeeId prop, and month prop from parent, load print data when opened (use printPayroll API if available, otherwise use local data), and emit @close event when closed | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue Modal component, must handle props and events correctly, must support print functionality, must follow existing component patterns | Success: Component is implemented correctly, print functionality works, print preview is displayed correctly, events are emitted correctly_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 實現薪資結算 E2E 測試
  - File: tests/e2e/payroll/payroll-calculation.spec.ts
  - 測試薪資結算載入
  - 測試月份選擇
  - 測試薪資表格顯示
  - 測試明細查看
  - 測試列印功能
  - 測試總計行顯示
  - Purpose: 確保薪資結算功能的完整流程正確運作
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR4.1.1, BR4.1.2, BR4.1.3, BR4.1.4, BR4.1.5_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create E2E tests for payroll calculation functionality including loading, month selection, payroll table display, detail view, print functionality, and total row display. Use Playwright framework and test data utilities from tests/e2e/utils/test-data.ts | Restrictions: Must use Playwright, must test all functionality, must use test data utilities, must handle async operations correctly | Success: All E2E tests pass, all functionality is tested_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本功能 - 薪資計算和預覽）
- ✅ 路由配置（基本功能 - 預覽和計算）
- ✅ 前端 API 調用函數（基本功能 - 預覽和計算）
- ✅ 薪資結算主頁面組件（基本功能）
- ✅ 薪資表格組件（基本功能 - 但結構不符合設計規範）
- ✅ 明細展示功能（基本功能 - 但使用展開行而非彈窗）
- ✅ 列印功能（基本功能 - 但沒有使用後端 API）

### 待完成功能
- ❌ 薪資明細 API Handler（獨立 API）
- ❌ 薪資單列印 API Handler（後端生成）
- ❌ 前端 API 調用函數（明細和列印）
- ❌ 月份選擇組件（獨立組件）
- ❌ 薪資表格組件重構（符合設計規範）
- ❌ 明細彈窗組件（符合設計規範）
- ❌ 列印彈窗組件重構（符合設計規範並整合 API）
- ❌ 總計行顯示功能（完全未實現）
- ❌ 路由配置（明細和列印）
- ❌ E2E 測試（完全未實現）

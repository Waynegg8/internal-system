# Tasks Document: BR5.4: 成本分攤計算

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 已實現
   - `handleGetEmployeeCosts` - 獲取員工成本明細（包含分攤計算）
   - `handleCalculateAllocation` - 處理成本分攤計算請求（支援三種分攤方式）
   - `calculateAllEmployeesActualHourlyRate` - 計算所有員工的實際時薪（包含分攤計算）
   - `calculateMonthlyRevenueDistribution` - 計算月度收入分配（用於按收入分攤）
   - `calculateClientCostsForAllocation` - 計算客戶成本總結

2. **路由配置** ✅ 已實現
   - GET /api/v2/costs/employee/:year/:month
   - POST /api/v2/costs/allocation/calculate

3. **前端 API 調用函數** ✅ 已實現
   - `fetchEmployeeCosts` - 獲取員工成本
   - `fetchClientCostsSummary` - 獲取客戶成本總結
   - `fetchTaskCosts` - 獲取任務成本
   - `calculateAllocation` - 成本分攤計算

4. **前端組件** ✅ 已實現
   - `CostAllocation.vue` - 成本分攤計算主頁面
   - `AllocationCalculator.vue` - 分攤計算組件
   - `AllocationResult.vue` - 分攤結果展示組件

5. **計算邏輯** ✅ 已實現
   - 按員工數分攤（`per_employee`）
   - 按工時分攤（`per_hour`）
   - 按收入分攤（`per_revenue`）
   - 員工時薪計算（月薪 + 分攤管理費）÷ 實際工時
   - 客戶任務成本計算（工時 × 分攤後時薪）

### 未實現或部分實現功能

1. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 成本分攤計算 API Handler

- [x] 1.1.1 驗證成本分攤計算 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-allocation.js
  - Function: handleCalculateAllocation
  - 驗證成本分攤計算邏輯已實現（支援三種分攤方式：按員工數、按工時、按收入）
  - 驗證參數驗證已實現（年份、月份、分攤方式）
  - 驗證返回完整的分攤結果（員工成本、時薪、管理費分攤、客戶任務成本）
  - 確認路由配置（backend/src/router/costs.js 中的 POST /api/v2/costs/allocation/calculate 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援成本分攤計算
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.4.0, BR5.4.1, BR5.4.2, BR5.4.3, BR5.4.4, BR5.4.5_
  - _Status: 已完成_

### 1.2 按員工數分攤計算邏輯

- [x] 1.2.1 驗證按員工數分攤計算邏輯已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-allocation.js
  - Function: calculateAllEmployeesActualHourlyRate, handleCalculateAllocation
  - 驗證使用公式：`總成本 ÷ 員工總數` 已實現
  - 驗證每個員工平均分攤相同金額已實現
  - 驗證統計在指定月份有工時記錄的員工總數已實現
  - Purpose: 確認按員工數分攤計算邏輯正確
  - _Leverage: backend/src/handlers/costs/cost-allocation.js_
  - _Requirements: BR5.4.1_
  - _Status: 已完成_

### 1.3 按工時分攤計算邏輯

- [x] 1.3.1 驗證按工時分攤計算邏輯已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-allocation.js
  - Function: calculateAllEmployeesActualHourlyRate, handleCalculateAllocation
  - 驗證使用公式：`總成本 × (員工實際工時 ÷ 總實際工時)` 已實現
  - 驗證從 Timesheets 表查詢實際工時已實現（直接 `SUM(hours)`，不考慮工時類型的加權係數，也不扣除請假時數）
  - Purpose: 確認按工時分攤計算邏輯正確
  - _Leverage: backend/src/handlers/costs/cost-allocation.js_
  - _Requirements: BR5.4.2_
  - _Status: 已完成_

### 1.4 按收入分攤計算邏輯

- [x] 1.4.1 驗證按收入分攤計算邏輯已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-allocation.js
  - Function: calculateMonthlyRevenueDistribution, handleCalculateAllocation
  - 驗證使用公式：`總成本 × (員工收入 ÷ 總收入)` 已實現
  - 驗證使用 BR1 的應計收入邏輯已實現（從 ClientServices 和 BillingPlans 表計算）
  - 驗證只計算該月的應計收入已實現
  - 驗證按員工在該客戶的工時比例分配給員工已實現
  - Purpose: 確認按收入分攤計算邏輯正確
  - _Leverage: backend/src/handlers/costs/cost-allocation.js_
  - _Requirements: BR5.4.3_
  - _Status: 已完成_

### 1.5 員工時薪計算邏輯

- [x] 1.5.1 驗證員工時薪計算邏輯已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-allocation.js
  - Function: calculateAllEmployeesActualHourlyRate
  - 驗證使用公式：`(月薪 + 分攤的管理費用) ÷ 實際工時` 已實現
  - 驗證從薪資系統取得月薪已實現（從 PayrollCache 表查詢）
  - 驗證從 Timesheets 表查詢實際工時已實現（直接 `SUM(hours)`，不考慮工時類型的加權係數，也不扣除請假時數）
  - 驗證使用根據選擇的分攤方式計算出的該員工分攤金額已實現
  - 驗證處理實際工時為 0 的情況已實現（返回 0，不執行除零運算）
  - Purpose: 確認員工時薪計算邏輯正確
  - _Leverage: backend/src/handlers/costs/cost-allocation.js_
  - _Requirements: BR5.4.4_
  - _Status: 已完成_

### 1.6 客戶任務成本計算邏輯

- [x] 1.6.1 驗證客戶任務成本計算邏輯已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-allocation.js, backend/src/handlers/costs/task-costs.js
  - Function: calculateClientCostsForAllocation, handleGetTaskCosts
  - 驗證使用公式：`工時 × 分攤後的時薪` 已實現
  - 驗證使用計算出的員工實際時薪已實現
  - 驗證從 Timesheets 表查詢指定月份、指定員工、指定客戶任務的工時已實現
  - 驗證為每個客戶任務計算成本並按客戶和任務分組展示已實現
  - Purpose: 確認客戶任務成本計算邏輯正確
  - _Leverage: backend/src/handlers/costs/cost-allocation.js, backend/src/handlers/costs/task-costs.js_
  - _Requirements: BR5.4.5_
  - _Status: 已完成_

### 1.7 成本分攤計算流程

- [x] 1.7.1 驗證成本分攤計算流程已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-allocation.js
  - Function: handleCalculateAllocation
  - 驗證允許選擇三種分攤方式之一（按員工數/按工時/按收入）已實現
  - 驗證按順序執行計算流程已實現：
    1. 根據選擇的分攤方式計算每個員工的分攤金額
    2. 計算每個員工的實際時薪
    3. 計算客戶任務成本
  - 驗證從 MonthlyCostRecords 表查詢指定年份和月份的管理費用總額已實現（從 MonthlyOverheadCosts 表查詢）
  - 驗證只計算在指定月份有工時記錄的員工已實現（從 Timesheets 表查詢）
  - Purpose: 確認成本分攤計算流程完整且正確
  - _Leverage: backend/src/handlers/costs/cost-allocation.js_
  - _Requirements: BR5.4.0_
  - _Status: 已完成_

---

## 2. 前端 API 調用層

### 2.1 成本分攤計算 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/costs.js
  - Functions: fetchEmployeeCosts, fetchClientCostsSummary, fetchTaskCosts, calculateAllocation
  - 驗證獲取員工成本功能正確
  - 驗證獲取客戶成本總結功能正確
  - 驗證獲取任務成本功能正確
  - 驗證成本分攤計算功能正確
  - 驗證使用統一的錯誤處理和回應格式處理
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/costs.js_
  - _Requirements: BR5.4.0, BR5.4.1, BR5.4.2, BR5.4.3, BR5.4.4, BR5.4.5_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 成本分攤計算前端頁面

- [x] 3.1.1 驗證成本分攤計算前端頁面已實現 ✅ 已實現
  - File: src/views/costs/CostAllocation.vue
  - 頁面佈局和路由已實現
  - 整合 AllocationCalculator 組件
  - 整合 AllocationResult 組件
  - 數據載入和錯誤處理已實現
  - 計算觸發和結果展示已實現
  - Purpose: 確認成本分攤計算頁面已完整實現
  - _Leverage: src/views/costs/CostAllocation.vue, src/components/costs/AllocationCalculator.vue, src/components/costs/AllocationResult.vue, src/api/costs.js_
  - _Requirements: BR5.4.0, BR5.4.1, BR5.4.2, BR5.4.3, BR5.4.4, BR5.4.5_
  - _Status: 已完成_

### 3.2 分攤計算組件

- [x] 3.2.1 驗證分攤計算組件已實現 ✅ 已實現
  - File: src/components/costs/AllocationCalculator.vue
  - 年份月份選擇已實現
  - 分攤方式選擇已實現（按員工數/按工時/按收入）
  - 計算觸發已實現
  - Purpose: 確認分攤計算組件已完整實現
  - _Leverage: Ant Design Vue DatePicker, Select, Button 組件, src/components/costs/AllocationCalculator.vue_
  - _Requirements: BR5.4.0, BR5.4.1, BR5.4.2, BR5.4.3_
  - _Status: 已完成_

### 3.3 分攤結果展示組件

- [x] 3.3.1 驗證分攤結果展示組件已實現 ✅ 已實現
  - File: src/components/costs/AllocationResult.vue
  - 分攤結果展示已實現（員工分攤明細、時薪、管理費分攤）
  - 客戶任務成本展示已實現
  - Purpose: 確認分攤結果展示組件已完整實現
  - _Leverage: Ant Design Vue Table component, src/components/costs/AllocationResult.vue_
  - _Requirements: BR5.4.1, BR5.4.2, BR5.4.3, BR5.4.4, BR5.4.5_
  - _Status: 已完成_

---

## 4. 路由配置

### 4.1 後端路由配置

- [x] 4.1.1 驗證後端路由配置已實現 ✅ 已實現
  - File: backend/src/router/costs.js
  - 驗證成本分攤計算 API 路由已配置（POST /api/v2/costs/allocation/calculate）
  - 驗證員工成本 API 路由已配置（GET /api/v2/costs/employee/:year/:month）
  - 驗證管理員權限檢查已實現
  - Purpose: 確認後端路由已正確配置並受保護
  - _Leverage: backend/src/router/costs.js, backend/src/middleware/auth.js_
  - _Requirements: BR5.4.0, BR5.4.1, BR5.4.2, BR5.4.3, BR5.4.4, BR5.4.5_
  - _Status: 已完成_

---

## 5. 測試

### 5.1 E2E 測試

- [ ] 5.1.1 實現成本分攤計算 E2E 測試
  - File: tests/e2e/costs/cost-allocation.spec.ts
  - 測試所有分攤方式（按員工數、按工時、按收入）
  - 測試成本分攤計算流程（選擇參數 → 計算 → 顯示結果）
  - 測試員工時薪計算（驗證計算結果正確性）
  - 測試客戶任務成本計算（驗證計算結果正確性）
  - 測試錯誤處理流程（數據缺失、計算失敗、除零錯誤等）
  - Purpose: 確保成本分攤計算功能的端到端正確性
  - _Leverage: Playwright testing framework, tests/helpers/testUtils.ts_
  - _Requirements: BR5.4.0, BR5.4.1, BR5.4.2, BR5.4.3, BR5.4.4, BR5.4.5_
  - _Prompt: Role: QA Automation Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for cost allocation feature, testing all allocation methods (by employee count, hours, revenue) and calculation logic. Test complete workflow (select parameters → calculate → display results), verify calculation results correctness, test error scenarios (missing data, calculation failure, division by zero). Use Playwright framework and test utilities from tests/helpers/testUtils.ts | Restrictions: Must test real user workflows, ensure tests are maintainable, do not test implementation details, validate calculation results | Success: E2E tests cover all allocation methods, verify calculation results, test error scenarios, run reliably_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（完整實現 - 三種分攤方式、員工時薪計算、客戶任務成本計算）
- ✅ 路由配置（完整實現）
- ✅ 前端 API 調用函數（完整實現）
- ✅ 成本分攤計算前端頁面（完整實現）
- ✅ 分攤計算組件（完整實現）
- ✅ 分攤結果展示組件（完整實現）
- ✅ 計算邏輯（完整實現 - 按員工數、按工時、按收入分攤，員工時薪計算，客戶任務成本計算）

### 待完成功能
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已完整實現，包括：
  - 成本分攤計算流程（選擇分攤方式 → 計算員工分攤 → 計算員工時薪 → 計算客戶任務成本）
  - 三種分攤方式（按員工數、按工時、按收入）
  - 員工時薪計算（月薪 + 分攤管理費）÷ 實際工時
  - 客戶任務成本計算（工時 × 分攤後時薪）
- 計算邏輯在後端實現，確保計算準確性
- 前端提供直觀的操作界面和結果展示
- 僅缺少 E2E 測試以確保完整流程的正確運作

# Tasks Document: BR4.3: 績效獎金與年終獎金

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 已實現
   - `handleGetYearlyBonus` - 獲取年度績效獎金（查詢預設值和調整值，合併顯示）
   - `handleUpdateYearlyBonus` - 更新年度績效獎金（批量更新到 MonthlyBonusAdjustments 表，自動觸發薪資重新計算）
   - `handleGetYearEndBonus` - 獲取年終獎金
   - `handleUpdateYearEndBonus` - 更新年終獎金（先刪除再插入，支援跨年發放，自動觸發薪資重新計算）

2. **路由配置** ✅ 已實現
   - GET/PUT /api/v2/payroll/yearly-bonus/:year
   - GET/PUT /api/v2/payroll/year-end-bonus/:year

3. **前端 API 調用函數** ✅ 已實現
   - `loadYearlyBonus` - 獲取年度績效獎金
   - `updateYearlyBonus` - 更新年度績效獎金
   - `loadYearEndBonus` - 獲取年終獎金
   - `updateYearEndBonus` - 更新年終獎金

4. **前端組件** ✅ 已實現
   - `PayrollBonus.vue` - 績效獎金管理頁面
   - `PayrollYearend.vue` - 年終獎金管理頁面
   - `PerformanceBonusTable.vue` - 績效獎金表格（支援直接在表格中編輯，調整標記藍色背景）
   - `YearEndBonusTable.vue` - 年終獎金表格（支援直接在表格中編輯金額和發放月份，跨年發放支援）

5. **路由配置（前端）** ✅ 已實現
   - `/payroll/bonus` (PayrollBonus)
   - `/payroll/yearend` (PayrollYearend)

### 未實現功能

1. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 績效獎金調整 API Handler

- [x] 1.1.1 驗證績效獎金調整 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/payroll/bonuses.js
  - Functions: handleGetYearlyBonus, handleUpdateYearlyBonus
  - 驗證績效獎金查詢邏輯已實現（查詢預設值和調整值，合併顯示）
  - 驗證績效獎金更新邏輯已實現（批量更新到 MonthlyBonusAdjustments 表）
  - 驗證自動觸發薪資重新計算已實現（使用 enqueuePayrollRecalc 和 recalculateEmployeePayroll）
  - 確認路由配置（backend/src/router/payroll.js 中的 GET/PUT /api/v2/payroll/yearly-bonus/:year 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援績效獎金調整
  - _Leverage: backend/src/utils/response.js, backend/src/utils/payroll-recalculate.js, backend/src/utils/payroll-cache.js, backend/src/router/payroll.js_
  - _Requirements: BR4.3.1_
  - _Status: 已完成_

### 1.2 年終獎金 CRUD API Handler

- [x] 1.2.1 驗證年終獎金 CRUD API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/payroll/bonuses.js
  - Functions: handleGetYearEndBonus, handleUpdateYearEndBonus
  - 驗證年終獎金的查詢和更新操作已實現（採用先刪除再插入的策略）
  - 驗證跨年發放支援已實現（payment_month 支援 YYYY-MM 格式，可跨年）
  - 驗證自動觸發薪資重新計算已實現（使用 triggerPayrollRecalculation）
  - 確認路由配置（backend/src/router/payroll.js 中的 GET/PUT /api/v2/payroll/year-end-bonus/:year 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援年終獎金設定
  - _Leverage: backend/src/utils/response.js, backend/src/utils/payroll-recalculate.js, backend/src/router/payroll.js_
  - _Requirements: BR4.3.2_
  - _Status: 已完成_

### 1.3 路由配置

- [x] 1.3.1 驗證路由配置已實現 ✅ 已實現
  - File: backend/src/router/payroll.js
  - 驗證 GET/PUT /api/v2/payroll/yearly-bonus/:year 路由已配置
  - 驗證 GET/PUT /api/v2/payroll/year-end-bonus/:year 路由已配置
  - Purpose: 確認 API 端點已建立並連接前端請求與後端 Handler
  - _Leverage: backend/src/router/payroll.js_
  - _Requirements: BR4.3.1, BR4.3.2_
  - _Status: 已完成_

---

## 2. 前端 API 調用層

### 2.1 績效獎金和年終獎金 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/payroll.js
  - Functions: loadYearlyBonus, updateYearlyBonus, loadYearEndBonus, updateYearEndBonus
  - 驗證所有 API 函數已實現並正確導出
  - 驗證使用統一的錯誤處理和回應格式處理
  - 驗證 API 路由配置正確（績效獎金 `/api/v2/payroll/yearly-bonus/:year`，年終獎金 `/api/v2/payroll/year-end-bonus/:year`）
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/payroll.js, @/utils/apiHelpers_
  - _Requirements: BR4.3.1, BR4.3.2_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 績效獎金管理頁面

- [x] 3.1.1 驗證績效獎金管理前端頁面已實現 ✅ 已實現
  - File: src/views/payroll/PayrollBonus.vue
  - 頁面佈局和路由已實現
  - 年度選擇功能已實現
  - 數據載入和錯誤處理已實現
  - 整合 PerformanceBonusTable 組件
  - 確認路由配置（src/router/index.js 中的 PayrollBonus 路由）
  - Purpose: 確認績效獎金管理頁面已完整實現
  - _Leverage: src/views/payroll/PayrollBonus.vue, src/components/payroll/PerformanceBonusTable.vue, src/api/payroll.js_
  - _Requirements: BR4.3.1_
  - _Status: 已完成_

### 3.2 年終獎金管理頁面

- [x] 3.2.1 驗證年終獎金管理前端頁面已實現 ✅ 已實現
  - File: src/views/payroll/PayrollYearend.vue
  - 頁面佈局和路由已實現
  - 年度選擇功能已實現
  - 數據載入和錯誤處理已實現
  - 整合 YearEndBonusTable 組件
  - 確認路由配置（src/router/index.js 中的 PayrollYearend 路由）
  - Purpose: 確認年終獎金管理頁面已完整實現
  - _Leverage: src/views/payroll/PayrollYearend.vue, src/components/payroll/YearEndBonusTable.vue, src/api/payroll.js_
  - _Requirements: BR4.3.2_
  - _Status: 已完成_

### 3.3 績效獎金表格組件

- [x] 3.3.1 驗證績效獎金表格組件已實現 ✅ 已實現
  - File: src/components/payroll/PerformanceBonusTable.vue
  - 績效獎金表格已實現（支援直接在表格中編輯）
  - 調整標記已實現（藍色背景 - `adjusted-cell` class）
  - 月份列顯示已實現（1-12 月）
  - 員工姓名顯示已實現
  - 預設值和調整值合併顯示已實現
  - Purpose: 確認績效獎金表格組件已完整實現
  - _Leverage: Ant Design Vue Table component, src/components/payroll/PerformanceBonusTable.vue_
  - _Requirements: BR4.3.1_
  - _Status: 已完成_

### 3.4 年終獎金表格組件

- [x] 3.4.1 驗證年終獎金表格組件已實現 ✅ 已實現
  - File: src/components/payroll/YearEndBonusTable.vue
  - 年終獎金設定表格已實現（支援直接在表格中編輯金額和發放月份）
  - 跨年發放支援已實現（發放月份選擇器支援跨年選擇，使用 DatePicker picker="month"）
  - 表單驗證已實現（金額必須為非負數，發放月份格式驗證）
  - 員工姓名和底薪顯示已實現
  - 備註欄位已實現
  - Purpose: 確認年終獎金表格組件已完整實現
  - _Leverage: Ant Design Vue Table component, Ant Design Vue DatePicker component, src/components/payroll/YearEndBonusTable.vue_
  - _Requirements: BR4.3.2_
  - _Status: 已完成_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 實現獎金管理 E2E 測試
  - File: tests/e2e/payroll/payroll-bonus.spec.ts
  - 測試績效獎金調整功能（年度選擇、表格編輯、調整標記、批量保存）
  - 測試年終獎金設定功能（年度選擇、金額和發放月份編輯、跨年發放、批量保存）
  - 驗證表格編輯和保存操作
  - 驗證跨年發放邏輯
  - 驗證薪資重新計算觸發（檢查 PayrollCache 表或相關標記）
  - 驗證錯誤處理和驗證邏輯
  - Purpose: 確保所有獎金管理功能從用戶角度完整運作，驗證完整的業務流程
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR4.3.1, BR4.3.2_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for payroll bonus management functionality covering performance bonus adjustments and year-end bonus settings. Test year selection, table editing, adjustment marking (blue background), batch saving, cross-year payment month selection, payroll recalculation triggering, error handling, and validation logic. Use Playwright framework and test data utilities from tests/e2e/utils/test-data.ts | Restrictions: Must use Playwright, must test all user acceptance criteria, must validate backend data persistence (check MonthlyBonusAdjustments and YearEndBonus tables), must test error scenarios, must use test data utilities, must verify payroll recalculation triggering | Success: All E2E tests pass covering complete bonus management workflow including data persistence, adjustment marking, cross-year payment, and payroll recalculation_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（完整實現）
- ✅ 路由配置（完整實現）
- ✅ 前端 API 調用函數（完整實現）
- ✅ 績效獎金管理頁面（完整實現）
- ✅ 年終獎金管理頁面（完整實現）
- ✅ 績效獎金表格組件（完整實現 - 包含調整標記）
- ✅ 年終獎金表格組件（完整實現 - 包含跨年發放支援）

### 待完成功能
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已完整實現，包括：
  - 績效獎金調整（表格內聯編輯、調整標記、批量保存、自動觸發薪資重新計算）
  - 年終獎金設定（表格內聯編輯、跨年發放支援、批量保存、自動觸發薪資重新計算）
- 僅缺少 E2E 測試以確保完整流程的正確運作

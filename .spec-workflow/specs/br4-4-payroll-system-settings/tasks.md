# Tasks Document: BR4.4: 系統設定調整

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 已實現
   - `handleGetPayrollSettings` - 獲取系統設定（按類別分組）
   - `handleUpdatePayrollSettings` - 更新系統設定（自動觸發所有員工的薪資重新計算）

2. **路由配置** ✅ 已實現
   - GET/PUT /api/v2/payroll/settings

3. **前端 API 調用函數** ✅ 已實現
   - `loadPayrollSettings` - 獲取系統設定
   - `updatePayrollSettings` - 更新系統設定

4. **前端組件** ✅ 已實現
   - `PayrollSettings.vue` - 系統設定頁面
   - `PayrollSettingsForm.vue` - 系統設定表單組件（包含誤餐費、交通補貼、請假扣款、時薪計算設定）

5. **自動觸發薪資重新計算** ✅ 已實現
   - 在 `handleUpdatePayrollSettings` 中，會查詢所有員工並觸發薪資重新計算

6. **交通補貼計算邏輯** ✅ 已實現（區間制）
   - 後端計算邏輯使用 `transport_km_per_interval` 和 `transport_amount_per_interval`（區間制）
   - 前端表單使用 `transport_km_per_interval` 和 `transport_amount_per_interval`（區間制）

### 未實現或部分實現功能

1. **交通補貼設定欄位（資料庫）** ✅ 已實現
   - 需求：`transport_km_per_interval` 和 `transport_amount_per_interval`（區間制）
   - 現狀：資料庫 migration 中已有更新 migration（`2025-11-03T070000Z_update_transport_settings.sql`）將交通補貼設定更新為區間制，後端計算邏輯和前端表單都使用區間制欄位
   - 結論：交通補貼設定欄位已一致（區間制）

2. **表單驗證（加強）** ⚠️ 部分實現
   - 需求：完整的表單驗證規則（負數、零、超出範圍等）
   - 現狀：有基本的 min/max 限制，但缺少 Ant Design Vue Form 的 rules 驗證

3. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 系統設定 API Handler

- [x] 1.1.1 驗證系統設定 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/payroll/payroll-settings.js
  - Functions: handleGetPayrollSettings, handleUpdatePayrollSettings
  - 驗證系統設定查詢邏輯已實現（按類別分組）
  - 驗證系統設定更新邏輯已實現（批量更新）
  - 驗證自動觸發所有員工的薪資重新計算已實現（查詢所有員工並觸發）
  - 確認路由配置（backend/src/router/payroll.js 中的 GET/PUT /api/v2/payroll/settings 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援系統設定管理
  - _Leverage: backend/src/utils/response.js, backend/src/utils/payroll-recalculate.js, backend/src/router/payroll.js_
  - _Requirements: BR4.4.1, BR4.4.2, BR4.4.3, BR4.4.4_
  - _Status: 已完成_

- [x] 1.1.2 驗證交通補貼設定欄位已實現 ✅ 已實現
  - File: backend/migrations/0004_payroll.sql (包含 2025-11-03T070000Z_update_transport_settings.sql)
  - 驗證 PayrollSettings 表中存在 `transport_km_per_interval` 和 `transport_amount_per_interval` 欄位
  - 驗證資料庫 migration 已將舊的 `transport_rate_per_km` 更新為區間制欄位
  - 驗證資料庫欄位與後端計算邏輯和前端表單一致（都使用區間制）
  - Purpose: 確認交通補貼設定欄位與需求一致（區間制）
  - _Leverage: backend/migrations/0004_payroll.sql, backend/src/utils/payroll-helpers.js_
  - _Requirements: BR4.4.2_
  - _Status: 已完成 - 資料庫 migration 已更新為區間制，與後端計算邏輯和前端表單一致_

---

## 2. 前端 API 調用層

### 2.1 系統設定 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/payroll.js
  - Functions: loadPayrollSettings, updatePayrollSettings
  - 驗證獲取系統設定功能正確
  - 驗證更新系統設定功能正確
  - 驗證使用統一的錯誤處理和回應格式處理
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/payroll.js_
  - _Requirements: BR4.4.1, BR4.4.2, BR4.4.3, BR4.4.4_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 系統設定前端頁面

- [x] 3.1.1 驗證系統設定前端頁面已實現 ✅ 已實現
  - File: src/views/payroll/PayrollSettings.vue
  - 頁面佈局和路由已實現
  - 整合 PayrollSettingsForm 組件
  - 數據載入和錯誤處理已實現
  - 本地設定數據管理已實現
  - Purpose: 確認系統設定頁面已完整實現
  - _Leverage: src/views/payroll/PayrollSettings.vue, src/components/payroll/PayrollSettingsForm.vue, src/api/payroll.js_
  - _Requirements: BR4.4.1, BR4.4.2, BR4.4.3, BR4.4.4_
  - _Status: 已完成_

### 3.2 系統設定表單組件

- [x] 3.2.1 驗證系統設定表單組件已實現 ✅ 已實現（基本功能）
  - File: src/components/payroll/PayrollSettingsForm.vue
  - 誤餐費設定表單已實現（單價、最低加班時數）
  - 交通補貼設定表單已實現（每個區間公里數、每個區間金額）
  - 請假扣款設定表單已實現（病假扣款比例、事假扣款比例、日薪計算除數）
  - 時薪計算設定表單已實現（時薪計算除數）
  - 基本表單驗證已實現（min/max 限制）
  - Purpose: 確認系統設定表單組件已實現
  - _Leverage: Ant Design Vue Form component, src/components/payroll/PayrollSettingsForm.vue_
  - _Requirements: BR4.4.1, BR4.4.2, BR4.4.3, BR4.4.4_
  - _Status: 基本實現 - 表單已實現但可能需要加強驗證規則_

- [ ] 3.2.2 加強表單驗證規則
  - File: src/components/payroll/PayrollSettingsForm.vue
  - 實現完整的表單驗證規則（使用 Ant Design Vue Form 的 rules）
  - 驗證誤餐費單價必須大於等於 0（非負數）
  - 驗證誤餐費最低加班時數必須大於等於 0（非負數）
  - 驗證交通補貼每個區間公里數必須大於 0（不能為零）
  - 驗證交通補貼每個區間金額必須大於等於 0（非負數）
  - 驗證病假扣款比例必須在 0-1 之間
  - 驗證事假扣款比例必須在 0-1 之間
  - 驗證日薪計算除數必須大於 0（不能為零）
  - 驗證時薪計算除數必須大於 0（不能為零）
  - Purpose: 加強表單驗證，確保所有輸入符合需求規範
  - _Leverage: Ant Design Vue Form component, Ant Design Vue Form rules_
  - _Requirements: BR4.4.1, BR4.4.2, BR4.4.3, BR4.4.4_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Enhance form validation in PayrollSettingsForm.vue by adding comprehensive validation rules using Ant Design Vue Form rules. Validate meal allowance price >= 0, meal allowance min hours >= 0, transport km per interval > 0, transport amount per interval >= 0, sick leave deduction rate between 0-1, personal leave deduction rate between 0-1, daily salary divisor > 0, hourly salary divisor > 0. Display validation error messages clearly | Restrictions: Must use Ant Design Vue Form rules, must validate all fields according to requirements, must display clear error messages, must prevent form submission on validation errors | Success: All validation rules are implemented correctly, error messages are clear, form submission is blocked on validation errors_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 實現系統設定 E2E 測試
  - File: tests/e2e/payroll/payroll-system-settings.spec.ts
  - 測試誤餐費設定調整（驗證單價和最低加班時數設定、驗證自動觸發薪資重新計算）
  - 測試交通補貼設定調整（驗證每個區間公里數和每個區間金額設定、驗證自動觸發薪資重新計算）
  - 測試請假扣款設定調整（驗證病假扣款比例、事假扣款比例、日薪計算除數設定、驗證自動觸發薪資重新計算）
  - 測試時薪計算設定調整（驗證時薪計算除數設定、驗證自動觸發薪資重新計算）
  - 測試表單驗證（驗證負數、零、超出範圍等錯誤情況）
  - 測試錯誤處理（驗證網路錯誤、權限不足等情況）
  - Purpose: 確保所有系統設定功能從用戶角度完整運作，驗證完整的業務流程
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR4.4.1, BR4.4.2, BR4.4.3, BR4.4.4_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for payroll system settings functionality covering meal allowance settings, transport allowance settings, leave deduction settings, and hourly rate calculation settings. Test form validation (negative numbers, zero, out of range), error handling (network errors, permission denied), and automatic payroll recalculation triggering. Use Playwright framework and test data utilities from tests/e2e/utils/test-data.ts | Restrictions: Must use Playwright, must test all user acceptance criteria, must validate backend data persistence, must test error scenarios, must use test data utilities, must verify payroll recalculation triggering | Success: All E2E tests pass covering complete system settings workflow including data persistence, form validation, error handling, and payroll recalculation_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（完整實現）
- ✅ 路由配置（完整實現）
- ✅ 前端 API 調用函數（完整實現）
- ✅ 系統設定前端頁面（完整實現）
- ✅ 系統設定表單組件（基本實現 - 包含所有設定項目）
- ✅ 自動觸發所有員工的薪資重新計算（完整實現）
- ✅ 交通補貼計算邏輯（區間制 - 後端和前端已實現）

### 待完成功能
- ⚠️ 表單驗證規則加強（需要添加完整的 Ant Design Vue Form rules）
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已基本實現，包括：
  - 誤餐費設定（單價、最低加班時數）
  - 交通補貼設定（資料庫、後端計算邏輯和前端表單都已實現區間制）
  - 請假扣款設定（病假扣款比例、事假扣款比例、日薪計算除數）
  - 時薪計算設定（時薪計算除數）
  - 自動觸發所有員工的薪資重新計算
- 需要加強表單驗證規則以符合所有需求規範（使用 Ant Design Vue Form rules）

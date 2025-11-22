# Tasks Document: BR6.3: 工時顯示功能

## 三方差異分析結果

### 已實現功能

1. **請假記錄顯示** ✅ 已實現
   - `TimesheetTable.vue` - 在表格底部顯示請假記錄行
   - `formatLeaveRecord` 方法格式化請假記錄（格式：`{請假類型} {時數}h`）
   - 處理無請假記錄時顯示 `-`

2. **工時完整性檢查** ✅ 已實現
   - `TimesheetTable.vue` - 在表格底部顯示工時完整性行
   - `dailyCompleteness` computed 計算工時完整性
   - 判斷是否為工作日（非休息日/例假日/國定假日）
   - 計算正常工時 + 請假時數，判斷是否 >= 8 小時
   - 顯示 ✓ 或 ✗缺X.Xh

3. **本週統計計算邏輯** ✅ 已實現
   - `timesheets.js` store - `calculateWeeklySummary()` 方法
   - 計算本週總工時、加班工時、加權工時、請假時數
   - 根據工時類型的 `multiplier` 計算加權工時
   - 結果顯示到小數點後 1 位

4. **TimesheetSummary 組件** ✅ 已實現
   - 使用計算好的 `weeklySummary` 和 `monthlySummary`
   - 使用 Ant Design Vue Card 和 Statistic 組件展示數據

### 未實現或部分實現功能

1. **本月統計計算邏輯** ⚠️ 需要確認
   - 需求：計算本月總工時、加班工時、加權工時、請假時數
   - 現狀：需要確認 `calculateMonthlySummary()` 方法是否已實現

2. **E2E 測試** ❌ 完全未實現

---

## 1. 請假記錄顯示

### 1.1 請假記錄顯示功能

- [x] 1.1.1 驗證請假記錄顯示功能已實現 ✅ 已實現
  - File: src/components/timesheets/TimesheetTable.vue
  - 驗證在表格底部顯示請假記錄行已實現
  - 驗證 `formatLeaveRecord(date)` 方法格式化請假記錄已實現
  - 驗證處理無請假記錄時顯示 `-` 已實現
  - 驗證格式為 `{請假類型} {時數}h`，多筆請假用逗號分隔已實現
  - Purpose: 顯示每日請假記錄，格式為 `{請假類型} {時數}h`
  - _Leverage: src/stores/timesheets.js (leaves Map), getLeaveTypeText 工具函數_
  - _Requirements: BR6.3.1_
  - _Status: 已完成_

---

## 2. 工時完整性檢查

### 2.1 工時完整性檢查功能

- [x] 2.1.1 驗證工時完整性檢查功能已實現 ✅ 已實現
  - File: src/components/timesheets/TimesheetTable.vue
  - 驗證在表格底部顯示工時完整性行已實現
  - 驗證 `dailyCompleteness` computed 計算工時完整性已實現
  - 驗證判斷是否為工作日（非休息日/例假日/國定假日）已實現
  - 驗證計算正常工時 + 請假時數，判斷是否 >= 8 小時已實現
  - 驗證顯示 ✓ 或 ✗缺X.Xh 已實現
  - 驗證非工作日顯示 `-` 已實現
  - Purpose: 顯示工作日是否已滿 8 小時正常工時，顯示 ✓ 或 ✗缺X.Xh
  - _Leverage: src/stores/timesheets.js (timesheets, leaves), 工作日判斷邏輯_
  - _Requirements: BR6.3.2_
  - _Status: 已完成_

---

## 3. 本週統計

### 3.1 本週統計計算邏輯

- [x] 3.1.1 驗證本週統計計算邏輯已實現 ✅ 已實現
  - File: src/stores/timesheets.js
  - 驗證 `calculateWeeklySummary()` 方法已實現
  - 驗證計算本週總工時已實現
  - 驗證計算本週加班工時已實現
  - 驗證計算本週加權工時已實現（根據工時類型的 `multiplier`）
  - 驗證計算本週請假時數已實現
  - 驗證結果顯示到小數點後 1 位已實現
  - Purpose: 計算本週統計數據供 TimesheetSummary 組件使用
  - _Leverage: src/stores/timesheets.js (timesheets, leaves, 工時類型配置)_
  - _Requirements: BR6.3.3_
  - _Status: 已完成_

---

## 4. 本月統計

### 4.1 本月統計計算邏輯

- [x] 4.1.1 驗證本月統計計算邏輯已實現 ✅ 已實現
  - File: src/stores/timesheets.js
  - 驗證 `calculateMonthlySummary()` 方法已實現（在 `loadTimesheets` 和 `loadTimesheetsForUser` 中調用）
  - 驗證計算本月總工時已實現
  - 驗證計算本月加班工時已實現
  - 驗證計算本月加權工時已實現（根據工時類型的 `multiplier`）
  - 驗證計算本月請假時數已實現
  - 驗證結果顯示到小數點後 1 位已實現
  - Purpose: 計算本月統計數據供 TimesheetSummary 組件使用
  - _Leverage: src/stores/timesheets.js (timesheets, leaves, 工時類型配置)_
  - _Requirements: BR6.3.4_
  - _Status: 已完成_

---

## 5. 統計組件顯示

### 5.1 TimesheetSummary 組件顯示統計數據

- [x] 5.1.1 驗證 TimesheetSummary 組件顯示統計數據已實現 ✅ 已實現
  - File: src/components/timesheets/TimesheetSummary.vue
  - 驗證使用計算好的 `weeklySummary` 和 `monthlySummary` 已實現
  - 驗證使用 Ant Design Vue Card 和 Statistic 組件展示數據已實現
  - 驗證顯示本週統計卡片已實現
  - 驗證顯示本月統計卡片已實現
  - Purpose: 顯示本週和本月統計卡片
  - _Leverage: src/stores/timesheets.js (weeklySummary, monthlySummary), Ant Design Vue Card/Statistic_
  - _Requirements: BR6.3.3, BR6.3.4_
  - _Status: 已完成_

---

## 6. 測試

### 6.1 E2E 測試

- [ ] 6.1.1 實現工時顯示功能 E2E 測試
  - File: tests/e2e/timesheets/timesheet-display.spec.ts
  - 測試請假記錄顯示（格式正確、無請假時顯示 `-`）
  - 測試工時完整性檢查（工作日顯示 ✓ 或 ✗缺X.Xh，非工作日顯示 `-`）
  - 測試本週統計顯示（總工時、加班工時、加權工時、請假時數）
  - 測試本月統計顯示（總工時、加班工時、加權工時、請假時數）
  - 測試統計數據計算準確性
  - Purpose: 確保工時顯示功能的端到端正確性
  - _Leverage: Playwright testing framework, tests/helpers/testUtils.ts_
  - _Requirements: BR6.3.1, BR6.3.2, BR6.3.3, BR6.3.4_
  - _Prompt: Role: QA Automation Engineer with expertise in Playwright and E2E testing | Task: Create comprehensive E2E tests for timesheet display feature covering leave record display, timesheet completeness check, weekly statistics display, and monthly statistics display, following requirements BR6.3.1, BR6.3.2, BR6.3.3, BR6.3.4 | Restrictions: Must test real user workflows, ensure tests are maintainable, use existing test utilities, test both success and failure scenarios, verify statistics calculation accuracy | Success: E2E tests cover all display features, tests verify calculation accuracy, tests run reliably_

---

## 總結

### 已完成功能
- ✅ 請假記錄顯示（完整實現 - 格式正確、無請假時顯示 `-`）
- ✅ 工時完整性檢查（完整實現 - 工作日顯示 ✓ 或 ✗缺X.Xh，非工作日顯示 `-`）
- ✅ 本週統計計算邏輯（完整實現 - 總工時、加班工時、加權工時、請假時數）
- ✅ TimesheetSummary 組件顯示統計數據（完整實現 - 使用 Card 和 Statistic 組件）

### 待完成功能
- ⚠️ 本月統計計算邏輯（需要確認是否已實現）
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已基本實現，包括：
  - 請假記錄顯示（格式：`{請假類型} {時數}h`，多筆請假用逗號分隔）
  - 工時完整性檢查（工作日顯示 ✓ 或 ✗缺X.Xh，非工作日顯示 `-`）
  - 本週統計計算邏輯（總工時、加班工時、加權工時、請假時數）
  - TimesheetSummary 組件顯示統計數據
- 需要確認的功能：
  - 本月統計計算邏輯：需要確認 `calculateMonthlySummary()` 方法是否已實現，如果未實現則需要實現

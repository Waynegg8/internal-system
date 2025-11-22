# Tasks Document: BR6.2: 工時規則校驗

## 三方差異分析結果

### 已實現功能

1. **前端驗證邏輯** ✅ 已實現
   - `useTimesheetValidation.js` - 工時驗證 Composable
   - 日期類型與工時類型一致性驗證
   - 正常工時規則驗證
   - 加班前置條件驗證
   - 加班類型前置條件驗證
   - 工時類型時數上限驗證
   - 每日總工時上限驗證

2. **前端組件整合** ✅ 已實現
   - `TimesheetTable.vue` - 整合驗證邏輯，提供即時反饋

3. **後端驗證邏輯** ✅ 已實現
   - `handleCreateOrUpdateTimesheet` - 包含所有驗證規則
   - 日期類型一致性驗證
   - 正常工時規則驗證
   - 加班前置條件驗證
   - 加班類型前置條件驗證
   - 工時類型時數上限驗證
   - 每日總工時上限驗證（目前為 12 小時，需要確認是否符合需求）

4. **驗證工具函數** ✅ 已實現
   - `backend/src/handlers/timesheets/utils.js` - 包含 `validateWorkTypeForDateType`、`getDateType` 等工具函數

### 未實現或部分實現功能

1. **每日總工時上限驗證** ⚠️ 需要確認
   - 需求：驗證當日總工時 <= 12 小時
   - 現狀：後端驗證為 12 小時上限，但根據 BR6.1.6 需求，單日工時上限應為 24 小時
   - 需要確認：BR6.2.6 要求 12 小時上限，但 BR6.1.6 要求 24 小時上限，需要確認正確的需求

2. **E2E 測試** ❌ 完全未實現

---

## 1. 前端驗證實現

### 1.1 前端驗證邏輯

- [x] 1.1.1 驗證前端驗證邏輯已實現 ✅ 已實現
  - File: src/composables/useTimesheetValidation.js
  - 驗證日期類型與工時類型一致性驗證已實現
  - 驗證正常工時規則驗證已實現（正常工時 + 請假時數 <= 8 小時）
  - 驗證加班前置條件驗證已實現（工作日加班需要先填滿正常工時）
  - 驗證加班類型前置條件驗證已實現（如「平日OT後2h」需要先有「平日OT前2h」）
  - 驗證工時類型時數上限驗證已實現
  - 驗證每日總工時上限驗證已實現（12 小時上限）
  - 驗證 `getAllowedWorkTypesForDate` 函數已實現
  - 驗證 `isWorkTypeAllowed` 函數已實現
  - 驗證 `validateNormalHours` 函數已實現
  - 驗證 `validateOvertimePrerequisites` 函數已實現
  - 驗證 `validateWorkTypeHoursLimit` 函數已實現
  - 驗證 `validateDailyTotalHours` 函數已實現
  - Purpose: 提供即時驗證反饋，減少錯誤提交
  - _Leverage: src/stores/timesheets.js（工時類型定義）_
  - _Requirements: BR6.2.1, BR6.2.2, BR6.2.3, BR6.2.4, BR6.2.5, BR6.2.6_
  - _Status: 已完成_

### 1.2 前端組件整合

- [x] 1.2.1 驗證前端組件整合已實現 ✅ 已實現
  - File: src/components/timesheets/TimesheetTable.vue
  - 驗證在組件中導入並使用 `useTimesheetValidation` 已實現
  - 驗證在用戶選擇工時類型時，根據日期類型過濾可用的工時類型選項已實現
  - 驗證在用戶輸入工時時，即時驗證並顯示錯誤提示已實現
  - 驗證在提交前進行完整驗證，阻止不符合規則的提交已實現
  - Purpose: 提供即時驗證反饋，改善用戶體驗
  - _Leverage: src/composables/useTimesheetValidation.js_
  - _Requirements: BR6.2.1, BR6.2.2, BR6.2.3, BR6.2.4, BR6.2.5, BR6.2.6_
  - _Status: 已完成_

---

## 2. 後端驗證實現

### 2.1 後端驗證邏輯

- [x] 2.1.1 驗證後端驗證邏輯已實現 ✅ 已實現
  - File: backend/src/handlers/timesheets/timesheet-crud.js
  - Function: handleCreateOrUpdateTimesheet
  - 驗證日期類型一致性驗證已實現（使用 `validateWorkTypeForDateType`）
  - 驗證正常工時規則驗證已實現（正常工時 + 請假時數 <= 8 小時）
  - 驗證加班前置條件驗證已實現（工作日加班需要先填滿正常工時）
  - 驗證加班類型前置條件驗證已實現（如「平日OT後2h」需要先有「平日OT前2h」）
  - 驗證工時類型時數上限驗證已實現（使用 `workType.maxHours`）
  - 驗證每日總工時上限驗證已實現（12 小時上限，需要確認是否符合需求）
  - 驗證查詢當天已保存的工時記錄，用於驗證每日總工時上限已實現
  - 驗證驗證失敗時返回清晰的錯誤訊息已實現
  - Purpose: 作為最終防線，確保數據準確性
  - _Leverage: backend/src/handlers/timesheets/utils.js（工時類型定義和工具函數）_
  - _Requirements: BR6.2.1, BR6.2.2, BR6.2.3, BR6.2.4, BR6.2.5, BR6.2.6_
  - _Status: 已完成_

### 2.2 驗證工具函數

- [x] 2.2.1 驗證驗證工具函數已實現 ✅ 已實現
  - File: backend/src/handlers/timesheets/utils.js
  - 驗證提取可重用的驗證邏輯已實現
  - 驗證定義工時類型與日期類型的映射關係（`validateWorkTypeForDateType`）已實現
  - 驗證定義各工時類型的時數上限已實現（`WORK_TYPES` 中的 `maxHours`）
  - 驗證定義加班類型的前置條件關係已實現（`WORK_TYPES` 中的 `requiresTypes`）
  - Purpose: 確保前後端驗證邏輯一致，減少重複代碼
  - _Leverage: backend/src/handlers/timesheets/utils.js_
  - _Requirements: BR6.2.1, BR6.2.4, BR6.2.5_
  - _Status: 已完成_

---

## 3. 測試

### 3.1 E2E 測試

- [ ] 3.1.1 實現工時規則校驗 E2E 測試
  - File: tests/e2e/timesheets/timesheet-validation.spec.ts
  - 測試日期類型與工時類型一致性驗證（工作日、休息日、例假日、國定假日）
  - 測試工作日正常工時規則驗證（正常工時 + 請假時數 <= 8 小時）
  - 測試工作日加班前置條件驗證（需要先填滿正常工時）
  - 測試加班類型前置條件驗證（如「平日OT後2h」需要先有「平日OT前2h」）
  - 測試工時類型時數上限驗證（各工時類型的上限）
  - 測試每日總工時上限驗證（12 小時上限）
  - 測試錯誤提示清晰準確
  - Purpose: 確保工時規則校驗功能的端到端正確性
  - _Leverage: Playwright testing framework, tests/helpers/testUtils.ts_
  - _Requirements: BR6.2.1, BR6.2.2, BR6.2.3, BR6.2.4, BR6.2.5, BR6.2.6_
  - _Prompt: Role: QA Automation Engineer with expertise in Playwright and E2E testing | Task: Create comprehensive E2E tests for timesheet validation feature covering date type consistency validation, normal hours rule validation, overtime prerequisites validation, work type hours limit validation, and daily total hours limit validation, following requirements BR6.2.1, BR6.2.2, BR6.2.3, BR6.2.4, BR6.2.5, BR6.2.6 | Restrictions: Must test real user workflows, ensure tests are maintainable, use existing test utilities, test both success and failure scenarios, verify error messages are clear and accurate | Success: E2E tests cover all validation rules, tests verify error messages are clear, tests run reliably_

---

## 總結

### 已完成功能
- ✅ 前端驗證邏輯（完整實現 - 所有驗證規則）
- ✅ 前端組件整合（完整實現 - 即時驗證反饋）
- ✅ 後端驗證邏輯（完整實現 - 所有驗證規則）
- ✅ 驗證工具函數（完整實現 - 可重用驗證邏輯）

### 待完成功能
- ⚠️ 每日總工時上限驗證確認（需要確認 BR6.2.6 的 12 小時上限與 BR6.1.6 的 24 小時上限是否衝突）
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已完整實現，包括：
  - 日期類型與工時類型一致性驗證（工作日、休息日、例假日、國定假日）
  - 工作日正常工時規則驗證（正常工時 + 請假時數 <= 8 小時）
  - 工作日加班前置條件驗證（需要先填滿正常工時）
  - 加班類型前置條件驗證（如「平日OT後2h」需要先有「平日OT前2h」）
  - 工時類型時數上限驗證（各工時類型的上限）
  - 每日總工時上限驗證（12 小時上限）
- 需要確認的功能：
  - 每日總工時上限驗證：BR6.2.6 要求 12 小時上限，但 BR6.1.6 要求 24 小時上限，需要確認正確的需求
- 驗證邏輯在前端和後端都已完整實現，確保數據準確性

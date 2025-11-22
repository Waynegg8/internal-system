# Tasks Document: BR3.5: 對帳提示

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅
   - `handleGetReceiptReminders` - 獲取提醒列表
   - `handlePostponeReminder` - 暫緩提醒

2. **路由配置** ✅
   - GET /api/v2/receipts/reminders
   - POST /api/v2/receipts/reminders/postpone

3. **前端 API 調用函數** ✅
   - `fetchReceiptReminders` - 獲取提醒列表
   - `postponeReminder` - 暫緩提醒

4. **前端組件（基本功能）** ✅
   - `ReceiptReminderBanner.vue` - 對帳提醒橫幅（已整合到收據列表頁面）
   - 顯示提醒列表、快速開收據、暫緩功能

### 未實現或部分實現功能

1. **提醒操作彈窗組件** ❌
   - 需求：獨立的 `ReminderActionModal.vue` 組件，支援多服務選擇和建議金額計算
   - 現狀：`ReceiptReminderBanner` 中的「立即開收據」直接發送事件，沒有多服務選擇功能

2. **多服務選擇功能** ❌
   - 需求：允許選擇該客戶不同月份的多個服務一起開收據
   - 現狀：僅支援單個提醒的快速開收據，沒有多服務選擇

3. **建議金額計算** ❌
   - 需求：選擇多個服務時計算建議金額為所有選中服務的收費計劃金額總和
   - 現狀：未實現多服務選擇，因此沒有建議金額計算

4. **開立收據後自動標記提醒完成** ❌
   - 需求：開立收據後自動標記相關提醒為已完成
   - 現狀：`handleCreateReceipt` 中沒有調用標記提醒完成的邏輯

5. **暫緩提醒自動重新顯示** ❌
   - 需求：等待的服務完成後自動重新顯示暫緩的提醒
   - 現狀：沒有在任務完成時檢查暫緩提醒的邏輯

6. **暫緩提醒等待服務選擇** ❌
   - 需求：暫緩提醒時允許選擇等待哪些服務完成
   - 現狀：僅有暫緩原因輸入，沒有等待服務選擇功能

---

## 1. 後端 API 實現

### 1.1 對帳提醒 API Handlers

- [x] 1.1.1 驗證對帳提醒 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/receipts/receipt-utils.js
  - Function: handleGetReceiptReminders, handlePostponeReminder
  - 驗證獲取提醒列表功能正確
  - 驗證暫緩提醒功能正確
  - Purpose: 確認現有後端業務邏輯處理正確支援對帳提醒的查詢和暫緩
  - _Leverage: backend/src/handlers/receipts/receipt-utils.js_
  - _Requirements: BR3.5.1, BR3.5.3_
  - _Status: 已完成_

- [ ] 1.1.2 實現開立收據後自動標記提醒完成
  - File: backend/src/handlers/receipts/receipt-crud.js
  - Function: handleCreateReceipt
  - 在收據建立成功後，調用 `markRemindersCompleted` 函數
  - 根據 `reminder_ids`（從提醒開立時傳入）或根據 `client_id`、`service_type_ids` 和服務期間匹配相關的 `pending` 狀態提醒
  - 更新提醒狀態為 `completed`，關聯收據 ID（`completed_receipt_id`），記錄完成時間（`completed_at`）
  - Purpose: 實現開立收據後自動標記提醒為已完成的業務邏輯
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js, backend/src/handlers/receipts/receipt-utils.js_
  - _Requirements: BR3.5.2_
  - _Prompt: Role: Backend Developer with expertise in database transactions and business logic | Task: Add automatic reminder completion logic to handleCreateReceipt function following requirement BR3.5.2. After receipt is successfully created, mark related reminders as completed by either using reminder_ids from request (if from reminder creation) or matching pending reminders by client_id, service_type_ids, and service period (if manual creation). Update reminder status to 'completed', set completed_receipt_id to new receipt ID, and record completed_at timestamp. Create markRemindersCompleted helper function if needed | Restrictions: Must maintain transaction integrity, handle errors gracefully, ensure data consistency, use parameterized queries | Success: Reminders are automatically marked as completed after receipt creation, transaction is atomic, error handling is proper, both reminder_ids and manual matching modes work correctly_

- [ ] 1.1.3 實現暫緩提醒自動重新顯示邏輯
  - File: backend/src/handlers/tasks/task-updates.js 或相關任務完成 Handler
  - Function: 在任務完成時檢查暫緩提醒
  - 在任務狀態更新為 `completed` 時，查詢是否有等待該任務的暫緩提醒
  - 實現自動將暫緩提醒狀態從 `postponed` 改為 `pending` 的邏輯
  - 需要檢查 BillingReminders 表中是否有 `waiting_service_id` 或類似欄位（如無則需新增 migration）
  - Purpose: 實現暫緩提醒在等待服務完成後自動重新顯示
  - _Leverage: backend/src/handlers/tasks/task-updates.js, BillingReminders 表_
  - _Requirements: BR3.5.3_
  - _Prompt: Role: Backend Developer with expertise in event-driven logic and database queries | Task: Implement automatic reminder reactivation when awaited services are completed following requirement BR3.5.3. When task status is updated to 'completed', query for postponed reminders waiting for that service, and automatically change their status from 'postponed' to 'pending'. Add waiting_service_id field to BillingReminders table if needed (create migration). Integrate with existing task completion logic | Restrictions: Must efficiently query postponed reminders, handle edge cases, maintain data consistency, use parameterized queries, add migration if field doesn't exist | Success: Postponed reminders are automatically reactivated when awaited services complete, query is efficient, edge cases are handled, migration is added if needed_

### 1.2 路由配置

- [x] 1.2.1 驗證對帳提醒 API 路由已配置 ✅ 已實現
  - File: backend/src/router/receipts.js
  - 驗證 GET /api/v2/receipts/reminders 路由已配置
  - 驗證 POST /api/v2/receipts/reminders/postpone 路由已配置
  - Purpose: 確認 API 端點已建立並連接前端請求與後端 Handler
  - _Leverage: backend/src/router/receipts.js_
  - _Requirements: BR3.5.1, BR3.5.3_
  - _Status: 已完成_

---

## 2. 前端 API 調用層

### 2.1 對帳提醒 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/receipts.js
  - Function: fetchReceiptReminders, postponeReminder
  - 驗證獲取提醒列表功能正確
  - 驗證暫緩提醒功能正確
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/receipts.js_
  - _Requirements: BR3.5.1, BR3.5.3_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 對帳提醒列表組件

- [x] 3.1.1 調整對帳提醒列表組件實現 ✅ 已實現（基本功能）
  - File: src/components/receipts/ReceiptReminderBanner.vue
  - 提醒列表展示（使用 Ant Design Vue List）
  - 開立收據操作（發送事件）
  - 暫緩操作（發送事件）
  - Purpose: 優化現有對帳提醒列表組件，提升用戶交互體驗
  - _Leverage: src/components/receipts/ReceiptReminderBanner.vue_
  - _Requirements: BR3.5.1, BR3.5.2, BR3.5.3_
  - _Status: 基本實現 - 基本功能已實現，但缺少多服務選擇功能_

- [x] 3.1.2 驗證對帳提醒已在收據列表頁面整合 ✅ 已實現
  - File: src/views/receipts/ReceiptsList.vue
  - 驗證 ReceiptReminderBanner 組件已整合到收據列表頁面
  - 確認組件顯示位置和樣式正確
  - Purpose: 確認對帳提醒功能已整合到適當的頁面
  - _Leverage: src/views/receipts/ReceiptsList.vue_
  - _Requirements: BR3.5.1_
  - _Status: 已完成_

### 3.2 提醒操作彈窗組件

- [ ] 3.2.1 實現提醒操作彈窗組件
  - File: src/components/receipts/ReminderActionModal.vue
  - 實現服務選擇功能（多選，顯示服務名稱和建議金額）
  - 支援選擇該客戶不同月份的多個服務
  - 實現建議金額計算（所有選中服務的收費計劃金額總和）
  - 實現表單驗證（至少選擇一個服務）
  - 整合暫緩原因輸入功能
  - 支援兩種模式：開立收據模式、暫緩模式
  - Purpose: 提供統一的開立收據和暫緩提醒操作界面
  - _Leverage: Ant Design Vue Modal/Form/Checkbox/Input 組件, src/api/receipts.js_
  - _Requirements: BR3.5.2, BR3.5.3_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 forms and validation | Task: Create ReminderActionModal.vue component following requirements BR3.5.2 and BR3.5.3, supporting both receipt creation and reminder postponement modes. Implement multiple service selection (from same client, different months), suggested amount calculation (sum of all selected services' billing schedule amounts), form validation (at least one service must be selected), and postpone reason input. Use Ant Design Vue Modal, Form, Checkbox, and Input components | Restrictions: Must use Vue 3 Composition API, must validate user input, calculate suggested amount correctly, handle form submission properly, support both modes | Success: Modal displays correctly in both modes, form validation works, calculations are accurate, multiple service selection works, user experience is smooth_

- [ ] 3.2.2 整合提醒操作彈窗到對帳提醒列表組件
  - File: src/components/receipts/ReceiptReminderBanner.vue
  - 將「立即開收據」和「暫緩」按鈕改為打開 `ReminderActionModal` 組件
  - 傳遞提醒數據和操作模式給彈窗
  - 處理彈窗的提交事件（開立收據或暫緩）
  - Purpose: 整合提醒操作彈窗到現有組件
  - _Leverage: src/components/receipts/ReceiptReminderBanner.vue, src/components/receipts/ReminderActionModal.vue_
  - _Requirements: BR3.5.2, BR3.5.3_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 component integration | Task: Integrate ReminderActionModal component into ReceiptReminderBanner.vue, replacing direct event emission with modal opening. Pass reminder data and action mode (create receipt or postpone) to modal, handle modal submission events (create receipt or postpone), and update reminder list after successful operations | Restrictions: Must maintain existing component structure, must handle modal state correctly, must update reminder list reactively, must maintain user experience | Success: Modal is integrated correctly, both create receipt and postpone modes work, reminder list updates after operations, user experience is smooth_

---

## 4. 資料庫 Migration（如需要）

### 4.1 暫緩提醒等待服務欄位

- [ ] 4.1.1 新增等待服務欄位（如資料庫無此欄位）
  - File: backend/migrations/XXXX_add_waiting_service_to_billing_reminders.sql
  - 為 BillingReminders 表新增 `waiting_service_id` 欄位（INTEGER, nullable, 外鍵關聯 ClientServices）
  - 或新增 `waiting_service_ids` 欄位（TEXT, JSON 格式，存儲多個服務 ID）
  - 建立相關索引
  - Purpose: 存儲暫緩提醒等待的服務 ID
  - _Leverage: backend/migrations/_
  - _Requirements: BR3.5.3_
  - _Prompt: Role: Database Developer with expertise in SQLite schema design | Task: Add waiting service field(s) to BillingReminders table following requirement BR3.5.3, either as waiting_service_id (INTEGER, nullable, foreign key to ClientServices) or waiting_service_ids (TEXT, JSON format for multiple service IDs). Add appropriate indexes. Follow existing migration patterns | Restrictions: Must check if field exists before adding, must follow existing migration patterns, must use proper SQLite syntax, must add indexes | Success: Migration file is created correctly, field is added if it doesn't exist, migration runs without errors, indexes are added_

---

## 5. 測試

### 5.1 E2E 測試

- [ ] 5.1.1 實現對帳提示 E2E 測試
  - File: tests/e2e/receipts/receipt-reconciliation.spec.ts
  - 測試對帳提醒顯示（驗證提醒列表正確顯示客戶名稱、服務名稱、月份、建議金額）
  - 測試從提醒開立收據（驗證多服務選擇、金額計算、自動標記完成）
  - 測試暫緩提醒（驗證等待服務選擇、暫緩原因輸入、自動重新顯示）
  - Purpose: 確保對帳提示功能的完整流程正確運作
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR3.5.1, BR3.5.2, BR3.5.3_
  - _Prompt: Role: QA Automation Engineer with expertise in Playwright and E2E testing | Task: Create comprehensive E2E tests for receipt reconciliation reminders covering all requirements BR3.5.1, BR3.5.2, BR3.5.3, including reminder display verification, multi-service selection for receipt creation, suggested amount calculation, automatic reminder completion, waiting service selection for postponement, postpone reason input, and automatic reminder reactivation. Use Playwright framework and test data utilities from tests/e2e/utils/test-data.ts | Restrictions: Must test real user workflows, ensure tests are maintainable and reliable, do not test implementation details, clean up test data | Success: E2E tests cover all critical user journeys, tests run reliably, user experience is validated from end-to-end, all acceptance criteria are tested_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本功能）
- ✅ 路由配置（完整實現）
- ✅ 前端 API 調用函數（完整實現）
- ✅ 對帳提醒列表組件（基本功能）
- ✅ 對帳提醒頁面整合（完整實現）

### 待完成功能
- ❌ 提醒操作彈窗組件（ReminderActionModal.vue）
- ❌ 多服務選擇功能（前端）
- ❌ 建議金額計算（前端）
- ❌ 開立收據後自動標記提醒完成（後端）
- ❌ 暫緩提醒自動重新顯示邏輯（後端）
- ❌ 暫緩提醒等待服務選擇（前端和後端）
- ❌ 資料庫 Migration（如需要）
- ❌ E2E 測試（完全未實現）

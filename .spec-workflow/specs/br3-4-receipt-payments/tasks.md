# Tasks Document: BR3.4: 付款記錄管理

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅
   - `handleGetReceiptPayments` - 獲取付款記錄列表
   - `handleCreateReceiptPayment` - 新增付款記錄（包含自動更新收據狀態）
   - `handleUpdateReceiptPayment` - 更新付款記錄（包含自動更新收據狀態）
   - `handleDeleteReceiptPayment` - 刪除付款記錄（軟刪除，包含自動更新收據狀態）
   - 自動更新收據狀態邏輯（未付款/部分付款/已付款）

2. **路由配置** ✅
   - 所有付款記錄相關路由已配置

3. **前端組件（基本功能）** ✅
   - `PaymentFormModal.vue` - 付款記錄表單（新增模式）
   - `ReceiptPaymentsTable.vue` - 付款記錄表格（顯示功能）

### 未實現或部分實現功能

1. **前端 API 調用函數** ❌
   - `updatePayment` - 未實現
   - `deletePayment` - 未實現
   - `getPayments` - 未實現（但收據詳情 API 已包含付款記錄）

2. **付款記錄表單組件（編輯模式）** ❌
   - 需求：支援編輯模式
   - 現狀：僅支援新增模式

3. **付款記錄表格組件（操作按鈕）** ❌
   - 需求：編輯和刪除操作按鈕
   - 現狀：僅有顯示功能，無操作按鈕

4. **累計金額顯示** ❌
   - 需求：顯示每筆付款金額和累計金額
   - 現狀：僅顯示單筆付款金額，無累計金額

5. **付款總額超過收據金額的警告** ❓
   - 需求：允許但提示「付款總額超過收據金額，超出部分可用於抵扣其他收據」
   - 現狀：後端驗證阻止超過未收金額，不符合需求（需求要求允許但提示）

6. **編輯歷史記錄** ❌
   - PaymentEditHistory 表不存在
   - 編輯歷史記錄邏輯未實現

---

## 1. 後端 API 實現

### 1.1 付款記錄 API Handlers

- [x] 1.1.1 實現付款記錄 API Handlers ✅ 已實現
  - File: backend/src/handlers/receipts/receipt-payments.js
  - Function: handleGetReceiptPayments, handleCreateReceiptPayment, handleUpdateReceiptPayment, handleDeleteReceiptPayment
  - 實現新增、編輯、刪除付款記錄
  - 實現自動更新收據狀態邏輯（未付款/部分付款/已付款）
  - 實現軟刪除
  - Purpose: 提供付款記錄的後端 CRUD 操作和業務邏輯
  - _Leverage: backend/src/handlers/receipts/receipt-payments.js_
  - _Requirements: BR3.4.1, BR3.4.2, BR3.4.3_
  - _Status: 已完成_

- [ ] 1.1.2 修正付款總額超過收據金額的處理邏輯
  - File: backend/src/handlers/receipts/receipt-payments.js
  - Function: handleCreateReceiptPayment
  - 修改驗證邏輯：允許付款總額超過收據金額，但返回警告提示而非錯誤
  - 提示訊息：「付款總額超過收據金額，超出部分可用於抵扣其他收據」
  - Purpose: 允許超額付款但提示用戶
  - _Leverage: backend/src/handlers/receipts/receipt-payments.js_
  - _Requirements: BR3.4.1_
  - _Prompt: Role: Backend Developer with expertise in business logic validation | Task: Modify handleCreateReceiptPayment to allow payment amounts exceeding receipt total amount, but return a warning message instead of error. The warning should state "付款總額超過收據金額，超出部分可用於抵扣其他收據" following requirement BR3.4.1 | Restrictions: Must still update receipt status correctly, must return warning in response, must not break existing functionality | Success: Overpayment is allowed with warning message, receipt status updates correctly, warning is clearly communicated to frontend_

### 1.2 路由配置

- [x] 1.2.1 配置付款記錄路由 ✅ 已實現
  - File: backend/src/router/receipts.js
  - 配置 POST /api/v2/receipts/:id/payments（新增付款記錄）
  - 配置 PUT /api/v2/receipts/:id/payments/:paymentId（編輯付款記錄）
  - 配置 DELETE /api/v2/receipts/:id/payments/:paymentId（刪除付款記錄）
  - Purpose: 設置付款記錄相關的 API 路由
  - _Leverage: backend/src/router/receipts.js_
  - _Requirements: BR3.4.1, BR3.4.2, BR3.4.3_
  - _Status: 已完成_

---

## 2. 前端 API 調用層

### 2.1 付款記錄 API 調用函數

- [x] 2.1.1 實現新增付款記錄 API ✅ 已實現
  - File: src/api/receipts.js
  - Function: createPayment
  - 實現新增付款記錄 API 調用
  - Purpose: 提供新增付款記錄 API 調用
  - _Leverage: src/api/receipts.js_
  - _Requirements: BR3.4.1_
  - _Status: 已完成_

- [ ] 2.1.2 實現更新付款記錄 API
  - File: src/api/receipts.js
  - Function: updatePayment
  - 實現更新付款記錄 API 調用
  - Purpose: 提供更新付款記錄 API 調用
  - _Leverage: src/api/receipts.js_
  - _Requirements: BR3.4.2_
  - _Prompt: Role: Frontend Developer with expertise in API integration | Task: Add updatePayment function to src/api/receipts.js for updating receipt payment records following requirement BR3.4.2, using existing API patterns and error handling utilities | Restrictions: Must handle errors properly, maintain consistent API interface, follow existing code style | Success: updatePayment function works correctly, error handling is robust, responses are properly parsed_

- [ ] 2.1.3 實現刪除付款記錄 API
  - File: src/api/receipts.js
  - Function: deletePayment
  - 實現刪除付款記錄 API 調用
  - Purpose: 提供刪除付款記錄 API 調用
  - _Leverage: src/api/receipts.js_
  - _Requirements: BR3.4.3_
  - _Prompt: Role: Frontend Developer with expertise in API integration | Task: Add deletePayment function to src/api/receipts.js for deleting receipt payment records following requirement BR3.4.3, using existing API patterns and error handling utilities | Restrictions: Must handle errors properly, maintain consistent API interface, follow existing code style | Success: deletePayment function works correctly, error handling is robust, responses are properly parsed_

- [ ] 2.1.4 實現獲取付款記錄列表 API（可選）
  - File: src/api/receipts.js
  - Function: getPayments
  - 實現獲取付款記錄列表 API 調用
  - 注意：如果收據詳情 API 已包含付款記錄，此函數可選
  - Purpose: 提供獲取付款記錄列表 API 調用
  - _Leverage: src/api/receipts.js_
  - _Requirements: BR3.4.4_
  - _Prompt: Role: Frontend Developer with expertise in API integration | Task: Add getPayments function to src/api/receipts.js for fetching receipt payment records list following requirement BR3.4.4, using existing API patterns. Note: This function is optional if receipt detail API already includes payment records | Restrictions: Must handle errors properly, maintain consistent API interface, follow existing code style | Success: getPayments function works correctly, error handling is robust, responses are properly parsed_

---

## 3. 前端組件實現

### 3.1 付款記錄表單組件（增強）

- [x] 3.1.1 實現付款記錄表單組件（新增模式） ✅ 已實現
  - File: src/components/receipts/PaymentFormModal.vue
  - 實現付款記錄表單（付款日期、金額、付款方式、參考號碼、備註）
  - 實現表單驗證（必填欄位、金額驗證、日期驗證）
  - Purpose: 提供付款記錄的新增界面
  - _Leverage: src/components/receipts/PaymentFormModal.vue_
  - _Requirements: BR3.4.1_
  - _Status: 部分完成 - 新增模式已實現_

- [ ] 3.1.2 實現編輯模式支持
  - File: src/components/receipts/PaymentFormModal.vue
  - 新增 `payment` prop（編輯時傳入付款記錄數據）
  - 根據是否有 `payment` prop 判斷是新增還是編輯模式
  - 編輯模式時預填充表單數據
  - 修改標題（新增/編輯）
  - Purpose: 支援編輯付款記錄
  - _Leverage: src/components/receipts/PaymentFormModal.vue_
  - _Requirements: BR3.4.2_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Add edit mode support to PaymentFormModal.vue component following requirement BR3.4.2. Add payment prop for editing, pre-fill form data in edit mode, change modal title based on mode (add/edit), and handle both add and edit modes correctly | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue components, must maintain component reusability, must handle loading and error states | Success: Form works correctly in both add and edit modes, form data is pre-filled in edit mode, modal title changes appropriately, user experience is smooth_

- [ ] 3.1.3 實現付款總額超過收據金額的警告提示
  - File: src/components/receipts/PaymentFormModal.vue
  - 當付款總額超過收據金額時，顯示警告提示（而非阻止提交）
  - 警告訊息：「付款總額超過收據金額，超出部分可用於抵扣其他收據」
  - 使用 Ant Design Vue 的 Alert 組件顯示警告
  - Purpose: 提示用戶付款總額超過收據金額
  - _Leverage: src/components/receipts/PaymentFormModal.vue_
  - _Requirements: BR3.4.1_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Add warning alert to PaymentFormModal.vue when total payment amount exceeds receipt total amount following requirement BR3.4.1. Display warning message "付款總額超過收據金額，超出部分可用於抵扣其他收據" using Ant Design Vue Alert component, but allow submission to proceed | Restrictions: Must use Ant Design Vue Alert, must calculate total payment correctly, must show warning at appropriate time, must not prevent submission | Success: Warning alert displays correctly when overpayment occurs, message is clear, submission is allowed, user experience is good_

- [ ] 3.1.4 實現編輯歷史記錄顯示（可選）
  - File: src/components/receipts/PaymentFormModal.vue
  - 在編輯模式下顯示編輯歷史記錄
  - 顯示修改前後的值、修改人、修改時間
  - Purpose: 顯示付款記錄的編輯歷史
  - _Leverage: src/components/receipts/PaymentFormModal.vue_
  - _Requirements: BR3.4.2_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Add edit history display to PaymentFormModal.vue in edit mode following requirement BR3.4.2, showing old/new values, editor, and timestamp. This is optional if edit history is displayed elsewhere | Restrictions: Must use Ant Design Vue components, must fetch edit history data, must display clearly, must handle empty history | Success: Edit history is displayed correctly, all information is shown clearly, empty state is handled_

### 3.2 付款記錄表格組件（增強）

- [x] 3.2.1 實現付款記錄表格組件（顯示功能） ✅ 已實現
  - File: src/components/receipts/ReceiptPaymentsTable.vue
  - 實現付款記錄列表展示（按付款日期降序）
  - 實現完整資訊顯示（付款日期、金額、付款方式、參考號碼、備註等）
  - 實現空狀態提示（當沒有付款記錄時）
  - 實現軟刪除記錄的過濾（不顯示已刪除記錄）
  - Purpose: 顯示付款記錄列表
  - _Leverage: src/components/receipts/ReceiptPaymentsTable.vue_
  - _Requirements: BR3.4.4_
  - _Status: 部分完成 - 顯示功能已實現_

- [ ] 3.2.2 實現累計金額顯示
  - File: src/components/receipts/ReceiptPaymentsTable.vue
  - 在表格中新增「累計金額」欄位
  - 計算每筆付款的累計金額（從第一筆開始累加）
  - 顯示累計金額列
  - Purpose: 顯示每筆付款的累計金額
  - _Leverage: src/components/receipts/ReceiptPaymentsTable.vue_
  - _Requirements: BR3.4.4_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and table components | Task: Add cumulative amount column to ReceiptPaymentsTable.vue following requirement BR3.4.4, calculating and displaying cumulative payment amount for each row (accumulated from first payment) | Restrictions: Must use Ant Design Vue Table, must calculate cumulative amounts correctly, must display clearly, must handle edge cases | Success: Cumulative amount column is added, amounts are calculated correctly, displayed clearly, edge cases handled_

- [ ] 3.2.3 實現編輯和刪除操作按鈕
  - File: src/components/receipts/ReceiptPaymentsTable.vue
  - 在表格中新增「操作」欄位
  - 新增「編輯」按鈕，點擊後打開編輯表單
  - 新增「刪除」按鈕，點擊後確認刪除
  - 發送 `@edit` 和 `@delete` 事件給父組件
  - Purpose: 提供編輯和刪除付款記錄的操作入口
  - _Leverage: src/components/receipts/ReceiptPaymentsTable.vue_
  - _Requirements: BR3.4.2, BR3.4.3_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and table components | Task: Add edit and delete action buttons to ReceiptPaymentsTable.vue following requirements BR3.4.2 and BR3.4.3, with edit button opening edit form and delete button confirming deletion, emitting @edit and @delete events to parent component | Restrictions: Must use Ant Design Vue Table and Button components, must emit events correctly, must handle confirmations, must maintain table performance | Success: Edit and delete buttons are added, events are emitted correctly, confirmations work, user experience is smooth_

---

## 4. 資料庫 Migration

### 4.1 編輯歷史記錄表

- [ ] 4.1.1 建立編輯歷史記錄表
  - File: backend/migrations/XXXX_add_payment_edit_history.sql
  - 建立 PaymentEditHistory 表結構
  - 包含 payment_id, old_values (JSON), new_values (JSON), edited_by, edited_at 等欄位
  - 建立相關索引
  - Purpose: 記錄付款記錄的編輯歷史
  - _Leverage: backend/migrations/_
  - _Requirements: BR3.4.2_
  - _Prompt: Role: Database Developer with expertise in SQLite schema design | Task: Create PaymentEditHistory table to track payment record edits following requirement BR3.4.2, including payment_id, old_values (JSON), new_values (JSON), edited_by, edited_at fields, and appropriate indexes | Restrictions: Must follow existing table naming and structure patterns, ensure proper foreign key relationships, use JSON for old/new values | Success: Table created successfully, properly indexed, and ready for use_

---

## 5. 編輯歷史記錄功能

### 5.1 後端編輯歷史記錄邏輯

- [ ] 5.1.1 實現編輯歷史記錄功能
  - File: backend/src/handlers/receipts/receipt-payments.js
  - Function: handleUpdateReceiptPayment
  - 在更新付款記錄時記錄編輯歷史
  - 記錄修改前的值和修改後的值、修改人、修改時間到 PaymentEditHistory 表
  - Purpose: 記錄付款記錄編輯的歷史軌跡
  - _Leverage: backend/src/handlers/receipts/receipt-payments.js, PaymentEditHistory 表_
  - _Requirements: BR3.4.2_
  - _Prompt: Role: Backend Developer with expertise in audit logging | Task: Implement edit history logging in handleUpdateReceiptPayment following requirement BR3.4.2, recording old/new values (as JSON), editor, and timestamp to PaymentEditHistory table | Restrictions: Must maintain transaction integrity, follow existing audit patterns, use JSON for old/new values, handle errors gracefully | Success: Edit history is properly recorded for all payment updates, JSON values are stored correctly, errors are handled gracefully_

---

## 6. 測試

### 6.1 E2E 測試

- [ ] 6.1.1 實現付款記錄 E2E 測試
  - File: tests/e2e/receipts/receipt-payments.spec.ts
  - 測試新增付款記錄流程
  - 測試編輯付款記錄流程（包括歷史記錄）
  - 測試刪除付款記錄流程（軟刪除和狀態更新）
  - 測試付款總額計算和收據狀態自動更新（未付款/部分付款/已付款）
  - 測試付款總額超過收據金額的警告提示
  - 測試累計金額顯示
  - 測試空狀態顯示（無付款記錄時）
  - 測試付款記錄完整資訊顯示
  - Purpose: 確保付款記錄功能的完整性和正確性
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR3.4.1, BR3.4.2, BR3.4.3, BR3.4.4_
  - _Prompt: Role: QA Automation Engineer with expertise in Playwright and E2E testing | Task: Create comprehensive E2E tests for receipt payments following all requirements BR3.4.1, BR3.4.2, BR3.4.3, BR3.4.4, covering add/edit/delete flows, status updates (unpaid/partial/paid), overpayment warnings, cumulative amounts, empty states, and complete information display | Restrictions: Must test real user workflows, ensure test reliability, clean up test data, maintain test isolation | Success: All E2E tests pass, cover all critical flows including edge cases (zero payments, overpayment, empty state), tests are maintainable and reliable, all status transitions are properly tested_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（完整實現）
- ✅ 路由配置（完整實現）
- ✅ 付款記錄表單組件（新增模式）
- ✅ 付款記錄表格組件（顯示功能）

### 待完成功能
- ❌ 前端 API 調用函數（updatePayment, deletePayment, getPayments）
- ❌ 付款記錄表單組件（編輯模式、警告提示、編輯歷史顯示）
- ❌ 付款記錄表格組件（累計金額顯示、編輯和刪除按鈕）
- ❌ 付款總額超過收據金額的處理邏輯修正（後端和前端）
- ❌ 編輯歷史記錄表（Migration）
- ❌ 編輯歷史記錄功能（後端邏輯）
- ❌ E2E 測試（完全未實現）

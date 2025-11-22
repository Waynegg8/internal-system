# Tasks Document: BR3.2: 收據詳情

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅
   - `handleGetReceiptDetail` - 收據詳情查詢（包含基本信息、明細項目、付款記錄、編輯歷史）
   - `handleUpdateReceipt` - 收據更新（部分實現，需要增強）
   - `handleCancelReceipt` - 收據作廢（部分實現，需要修正）

2. **前端組件** ✅
   - `ReceiptDetail.vue` - 收據詳情主頁面
   - `ReceiptInfo.vue` - 收據基本信息展示
   - `ReceiptItemsTable.vue` - 收據明細表格
   - `ReceiptPaymentsTable.vue` - 付款記錄表格
   - `ReceiptEditHistory.vue` - 編輯歷史展示
   - `EditReceiptModal.vue` - 編輯收據彈窗（部分實現，需要增強）
   - `ReceiptCancelModal.vue` - 作廢收據彈窗
   - `ReceiptPrintModal.vue` - 列印選擇彈窗

3. **資料庫表** ✅
   - `ReceiptEditHistory` 表已存在（migration 0043）

4. **列印功能** ✅
   - `receiptPrint.js` - 列印工具函數

### 未實現或部分實現功能

1. **收據編輯限制** ❌
   - 需求：不允許修改客戶（`client_id`）
   - 現狀：後端允許修改 client_id，前端未禁用客戶欄位

2. **收據狀態限制** ❌
   - 需求：不允許手動修改收據狀態（`status`），狀態由系統根據付款記錄自動計算
   - 現狀：後端允許修改 status

3. **收據號碼唯一性檢查** ❌
   - 需求：修改收據號碼時需檢查是否與現有收據號碼重複（除當前收據外）
   - 現狀：未實現收據號碼唯一性檢查

4. **總金額驗證** ❌
   - 需求：新總金額不能小於已付款金額總和
   - 現狀：未實現此驗證

5. **作廢收據保留** ❌
   - 需求：作廢後保留收據（`is_deleted = 0`），僅標記 `status = 'cancelled'`
   - 現狀：作廢時將 `is_deleted` 設為 1，不符合需求

6. **列印功能增強** ❓
   - 需求：列印前選擇公司資料，支援選擇不同公司資料
   - 現狀：需要檢查列印功能是否支援公司資料選擇

---

## 1. 後端 API 實現

### 1.1 收據詳情查詢 API

- [x] 1.1.1 實現收據詳情查詢 Handler ✅ 已實現
  - File: backend/src/handlers/receipts/receipt-crud.js
  - 實現 `handleGetReceiptDetail` 函數
  - 返回收據基本信息、明細項目、付款記錄、編輯歷史
  - Purpose: 提供收據詳情查詢功能
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js_
  - _Requirements: BR3.2.1_
  - _Status: 已完成_

### 1.2 收據更新 API（增強）

- [x] 1.2.1 實現收據更新 Handler ✅ 已實現（部分）
  - File: backend/src/handlers/receipts/receipt-crud.js
  - 實現 `handleUpdateReceipt` 函數
  - 支援編輯收據基本信息、明細項目
  - 記錄編輯歷史
  - Purpose: 提供收據更新功能
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js_
  - _Requirements: BR3.2.2_
  - _Status: 部分實現_

- [ ] 1.2.2 禁止修改客戶 ID
  - File: backend/src/handlers/receipts/receipt-crud.js
  - 在 `handleUpdateReceipt` 中移除 client_id 的更新邏輯
  - 驗證請求中的 client_id 與現有收據的 client_id 一致，如果不一致則拒絕請求
  - Purpose: 確保收據客戶不可修改
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js_
  - _Requirements: BR3.2.2_
  - _Prompt: Role: Backend Developer specializing in data validation | Task: Modify handleUpdateReceipt to prevent client_id modification by removing client_id from update logic and validating that request client_id matches existing receipt client_id, rejecting request if mismatch following requirement BR3.2.2 | Restrictions: Must maintain backward compatibility, must provide clear error messages, must not break existing functionality | Success: Client ID modification is prevented, validation works correctly, error messages are clear_

- [ ] 1.2.3 禁止手動修改收據狀態
  - File: backend/src/handlers/receipts/receipt-crud.js
  - 在 `handleUpdateReceipt` 中移除 status 的更新邏輯
  - 狀態由系統根據付款記錄自動計算（在更新後重新計算狀態）
  - Purpose: 確保收據狀態由系統自動計算，不可手動修改
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js_
  - _Requirements: BR3.2.2_
  - _Prompt: Role: Backend Developer specializing in business logic | Task: Modify handleUpdateReceipt to prevent manual status modification by removing status from update logic and automatically recalculating status based on payment records after update following requirement BR3.2.2 | Restrictions: Must maintain status calculation logic, must handle all status transitions correctly, must not break existing functionality | Success: Status modification is prevented, status is automatically recalculated, all status transitions work correctly_

- [ ] 1.2.4 實現收據號碼唯一性檢查
  - File: backend/src/handlers/receipts/receipt-crud.js
  - 在 `handleUpdateReceipt` 中，如果收據號碼被修改，檢查新號碼是否與其他收據重複（排除當前收據）
  - 如果重複則返回錯誤
  - Purpose: 確保收據號碼唯一性
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js_
  - _Requirements: BR3.2.2_
  - _Prompt: Role: Backend Developer specializing in data validation | Task: Add receipt ID uniqueness check to handleUpdateReceipt, checking if new receipt ID conflicts with existing receipts (excluding current receipt) when receipt ID is modified, returning error if duplicate following requirement BR3.2.2 | Restrictions: Must use parameterized queries, must exclude current receipt from check, must provide clear error messages | Success: Uniqueness check works correctly, duplicates are prevented, error messages are clear_

- [ ] 1.2.5 實現總金額驗證
  - File: backend/src/handlers/receipts/receipt-crud.js
  - 在 `handleUpdateReceipt` 中，當修改總金額時，檢查新總金額是否小於已付款金額總和
  - 如果小於則返回錯誤
  - Purpose: 確保總金額不小於已付款金額
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js_
  - _Requirements: BR3.2.2_
  - _Prompt: Role: Backend Developer specializing in business logic validation | Task: Add total amount validation to handleUpdateReceipt, checking if new total amount is less than sum of paid amounts, returning error if validation fails following requirement BR3.2.2 | Restrictions: Must query payment records correctly, must handle edge cases, must provide clear error messages | Success: Validation works correctly, prevents invalid total amounts, error messages are clear_

- [x] 1.2.6 實現編輯歷史記錄 ✅ 已實現
  - File: backend/src/handlers/receipts/receipt-crud.js
  - 在 `handleUpdateReceipt` 中實現 `recordEditHistory` 函數
  - 記錄修改前後的值、修改人、修改時間到 ReceiptEditHistory 表
  - Purpose: 記錄收據編輯歷史
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js, backend/migrations/0043_receipt_edit_history.sql_
  - _Requirements: BR3.2.2_
  - _Status: 已完成_

### 1.3 收據作廢 API（修正）

- [x] 1.3.1 實現收據作廢 Handler ✅ 已實現（部分）
  - File: backend/src/handlers/receipts/receipt-cancel.js
  - 實現 `handleCancelReceipt` 函數
  - 要求填寫作廢原因
  - 記錄編輯歷史
  - Purpose: 提供收據作廢功能
  - _Leverage: backend/src/handlers/receipts/receipt-cancel.js_
  - _Requirements: BR3.2.3_
  - _Status: 部分實現_

- [ ] 1.3.2 修正作廢後保留收據邏輯
  - File: backend/src/handlers/receipts/receipt-cancel.js
  - 修改 `handleCancelReceipt` 函數，作廢後保留收據（`is_deleted = 0`），僅標記 `status = 'cancelled'`
  - 移除 `is_deleted = 1` 的邏輯
  - Purpose: 確保作廢後收據仍保留在系統中
  - _Leverage: backend/src/handlers/receipts/receipt-cancel.js_
  - _Requirements: BR3.2.3_
  - _Prompt: Role: Backend Developer specializing in soft delete logic | Task: Modify handleCancelReceipt to keep receipt in system (is_deleted = 0) and only mark status as 'cancelled', removing is_deleted = 1 logic following requirement BR3.2.3 | Restrictions: Must maintain cancellation reason recording, must maintain payment record marking, must not break existing functionality | Success: Receipts are retained after cancellation, status is correctly set, cancellation reason is recorded_

- [x] 1.3.3 實現付款記錄標記 ✅ 已實現
  - File: backend/src/handlers/receipts/receipt-cancel.js
  - 在 `handleCancelReceipt` 中標記付款記錄為「已作廢收據的付款」
  - Purpose: 標記已作廢收據的付款記錄
  - _Leverage: backend/src/handlers/receipts/receipt-cancel.js_
  - _Requirements: BR3.2.3_
  - _Status: 已完成_

---

## 2. 前端 API 調用層

### 2.1 收據詳情 API 調用

- [x] 2.1.1 實現收據詳情查詢 API ✅ 已實現
  - File: src/api/receipts.js
  - 實現 `fetchReceiptDetail` 函數
  - Purpose: 提供收據詳情查詢 API 調用
  - _Leverage: src/api/receipts.js_
  - _Requirements: BR3.2.1_
  - _Status: 已完成_

- [x] 2.1.2 實現收據更新 API ✅ 已實現
  - File: src/api/receipts.js
  - 實現 `updateReceipt` 函數
  - Purpose: 提供收據更新 API 調用
  - _Leverage: src/api/receipts.js_
  - _Requirements: BR3.2.2_
  - _Status: 已完成_

- [x] 2.1.3 實現收據作廢 API ✅ 已實現
  - File: src/api/receipts.js
  - 實現 `cancelReceipt` 函數
  - Purpose: 提供收據作廢 API 調用
  - _Leverage: src/api/receipts.js_
  - _Requirements: BR3.2.3_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 收據詳情主頁面

- [x] 3.1.1 實現收據詳情主頁面 ✅ 已實現
  - File: src/views/receipts/ReceiptDetail.vue
  - 整合所有子組件（ReceiptInfo, ReceiptItemsTable, ReceiptPaymentsTable, ReceiptEditHistory）
  - 處理編輯、作廢、列印操作
  - Purpose: 提供收據詳情展示和管理界面
  - _Leverage: src/views/receipts/ReceiptDetail.vue_
  - _Requirements: BR3.2.1_
  - _Status: 已完成_

### 3.2 收據編輯組件（增強）

- [x] 3.2.1 實現收據編輯彈窗組件 ✅ 已實現（部分）
  - File: src/components/receipts/EditReceiptModal.vue
  - 實現編輯表單、驗證、提交功能
  - Purpose: 提供收據編輯界面
  - _Leverage: src/components/receipts/EditReceiptModal.vue_
  - _Requirements: BR3.2.2_
  - _Status: 部分實現_

- [ ] 3.2.2 禁用客戶欄位
  - File: src/components/receipts/EditReceiptModal.vue
  - 在編輯表單中將客戶選擇器設為 `disabled` 或 `readonly`
  - 顯示當前客戶資訊，但不允許修改
  - Purpose: 防止用戶修改收據客戶
  - _Leverage: src/components/receipts/EditReceiptModal.vue_
  - _Requirements: BR3.2.2_
  - _Prompt: Role: Frontend Developer specializing in Vue 3 and form controls | Task: Disable client selection field in EditReceiptModal.vue by setting disabled or readonly attribute, displaying current client information but preventing modification following requirement BR3.2.2 | Restrictions: Must use Ant Design Vue components, must maintain form validation, must provide clear visual indication that field is disabled | Success: Client field is disabled, current client is displayed, form validation works correctly_

- [ ] 3.2.3 移除狀態欄位
  - File: src/components/receipts/EditReceiptModal.vue
  - 從編輯表單中移除狀態選擇器（如果存在）
  - 狀態由系統自動計算，不在編輯界面顯示
  - Purpose: 防止用戶手動修改收據狀態
  - _Leverage: src/components/receipts/EditReceiptModal.vue_
  - _Requirements: BR3.2.2_
  - _Prompt: Role: Frontend Developer specializing in Vue 3 and form design | Task: Remove status selection field from EditReceiptModal.vue form (if exists), as status is automatically calculated by system and should not be manually modified following requirement BR3.2.2 | Restrictions: Must maintain form layout, must not break form validation, must ensure form still works correctly | Success: Status field is removed, form layout is maintained, form validation works correctly_

- [ ] 3.2.4 增加收據號碼編輯和唯一性驗證
  - File: src/components/receipts/EditReceiptModal.vue
  - 在編輯表單中增加收據號碼輸入欄位（如果尚未存在）
  - 實現前端唯一性驗證（可選，後端也會驗證）
  - Purpose: 允許編輯收據號碼並確保唯一性
  - _Leverage: src/components/receipts/EditReceiptModal.vue_
  - _Requirements: BR3.2.2_
  - _Prompt: Role: Frontend Developer specializing in Vue 3 and form validation | Task: Add receipt ID input field to EditReceiptModal.vue form (if not exists), implement frontend uniqueness validation (optional, backend also validates) following requirement BR3.2.2 | Restrictions: Must use Ant Design Vue components, must provide clear validation messages, must handle async validation if needed | Success: Receipt ID field is added, validation works correctly, error messages are clear_

- [ ] 3.2.5 增加總金額驗證
  - File: src/components/receipts/EditReceiptModal.vue
  - 在編輯表單中增加總金額驗證，檢查新總金額是否小於已付款金額
  - 如果驗證失敗則顯示錯誤提示並阻止提交
  - Purpose: 確保總金額不小於已付款金額
  - _Leverage: src/components/receipts/EditReceiptModal.vue_
  - _Requirements: BR3.2.2_
  - _Prompt: Role: Frontend Developer specializing in Vue 3 and form validation | Task: Add total amount validation to EditReceiptModal.vue form, checking if new total amount is less than paid amount, displaying error and preventing submission if validation fails following requirement BR3.2.2 | Restrictions: Must use Ant Design Vue form validation, must provide clear error messages, must handle edge cases | Success: Validation works correctly, prevents invalid total amounts, error messages are clear_

### 3.3 收據作廢組件

- [x] 3.3.1 實現收據作廢彈窗組件 ✅ 已實現
  - File: src/components/receipts/ReceiptCancelModal.vue
  - 實現作廢原因輸入、驗證、提交功能
  - Purpose: 提供收據作廢界面
  - _Leverage: src/components/receipts/ReceiptCancelModal.vue_
  - _Requirements: BR3.2.3_
  - _Status: 已完成_

### 3.4 收據列印組件（檢查）

- [x] 3.4.1 實現收據列印選擇彈窗 ✅ 已實現
  - File: src/components/receipts/ReceiptPrintModal.vue
  - 實現列印類型選擇（請款單/收據）
  - 實現已作廢收據的列印限制
  - Purpose: 提供收據列印選擇界面
  - _Leverage: src/components/receipts/ReceiptPrintModal.vue_
  - _Requirements: BR3.2.4_
  - _Status: 已完成_

- [ ] 3.4.2 檢查列印功能是否支援公司資料選擇
  - File: src/utils/receiptPrint.js
  - 檢查列印函數是否支援選擇公司資料
  - 如果未支援，需要實現公司資料選擇功能
  - Purpose: 確保列印前可以選擇公司資料
  - _Leverage: src/utils/receiptPrint.js_
  - _Requirements: BR3.2.4_
  - _Prompt: Role: Frontend Developer specializing in print functionality | Task: Check if receiptPrint.js supports company data selection, implement company data selection if not supported, allowing users to choose different company data before printing following requirement BR3.2.4 | Restrictions: Must support multiple company data, must validate company data exists, must provide clear UI for selection | Success: Company data selection works correctly, multiple companies supported, validation works correctly_

### 3.5 收據詳情展示組件

- [x] 3.5.1 實現收據基本信息展示組件 ✅ 已實現
  - File: src/components/receipts/ReceiptInfo.vue
  - 顯示收據基本信息
  - Purpose: 提供收據基本信息展示
  - _Leverage: src/components/receipts/ReceiptInfo.vue_
  - _Requirements: BR3.2.1_
  - _Status: 已完成_

- [x] 3.5.2 實現收據明細表格組件 ✅ 已實現
  - File: src/components/receipts/ReceiptItemsTable.vue
  - 顯示收據明細項目
  - Purpose: 提供收據明細展示
  - _Leverage: src/components/receipts/ReceiptItemsTable.vue_
  - _Requirements: BR3.2.1_
  - _Status: 已完成_

- [x] 3.5.3 實現付款記錄表格組件 ✅ 已實現
  - File: src/components/receipts/ReceiptPaymentsTable.vue
  - 顯示付款記錄
  - Purpose: 提供付款記錄展示
  - _Leverage: src/components/receipts/ReceiptPaymentsTable.vue_
  - _Requirements: BR3.2.1_
  - _Status: 已完成_

- [x] 3.5.4 實現編輯歷史展示組件 ✅ 已實現
  - File: src/components/receipts/ReceiptEditHistory.vue
  - 顯示編輯歷史記錄
  - Purpose: 提供編輯歷史展示
  - _Leverage: src/components/receipts/ReceiptEditHistory.vue_
  - _Requirements: BR3.2.1_
  - _Status: 已完成_

---

## 4. 狀態管理

### 4.1 收據狀態管理

- [x] 4.1.1 實現收據狀態管理 ✅ 已實現
  - File: src/stores/receipts.js
  - 管理收據詳情、加載狀態等
  - Purpose: 提供收據狀態管理
  - _Leverage: src/stores/receipts.js_
  - _Requirements: BR3.2.1_
  - _Status: 已完成_

---

## 5. 測試

### 5.1 E2E 測試

- [ ] 5.1.1 實現收據詳情 E2E 測試
  - File: tests/e2e/receipts/receipt-detail.spec.ts
  - 測試收據詳情查看
  - 測試收據編輯（包括客戶欄位禁用、狀態欄位移除、收據號碼唯一性、總金額驗證）
  - 測試收據作廢（包括作廢原因必填、作廢後保留收據）
  - 測試收據列印（包括公司資料選擇、已作廢收據限制）
  - Purpose: 確保收據詳情功能完整可用
  - _Leverage: tests/e2e/utils/test-data.ts, Playwright_
  - _Requirements: BR3.2.1, BR3.2.2, BR3.2.3, BR3.2.4_
  - _Prompt: Role: QA Automation Engineer specializing in E2E testing | Task: Create comprehensive E2E tests for receipt detail functionality including viewing, editing (with client field disabled, status field removed, receipt ID uniqueness, total amount validation), cancellation (with required reason, receipt retention), and printing (with company data selection, cancelled receipt restrictions) following requirements BR3.2.1, BR3.2.2, BR3.2.3, BR3.2.4 | Restrictions: Must use Playwright, must test all functionality, must use test data utilities, must handle async operations correctly | Success: All E2E tests pass, all functionality is tested, tests are reliable and maintainable_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本功能）
- ✅ 前端組件（基本功能）
- ✅ API 調用層
- ✅ 狀態管理
- ✅ 編輯歷史記錄
- ✅ 列印功能（基本功能）

### 待完成功能
- ❌ 禁止修改客戶 ID（後端和前端）
- ❌ 禁止手動修改收據狀態（後端和前端）
- ❌ 收據號碼唯一性檢查（後端和前端）
- ❌ 總金額驗證（後端和前端）
- ❌ 作廢後保留收據邏輯（後端修正）
- ❌ 列印功能公司資料選擇（需要檢查和實現）
- ❌ E2E 測試（完全未實現）

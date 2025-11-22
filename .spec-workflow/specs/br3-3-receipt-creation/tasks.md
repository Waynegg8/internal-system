# Tasks Document: BR3.3: 收據建立

## 三方差異分析結果

### 已實現功能

1. **收據編號生成邏輯** ✅
   - 已實現於 `handleCreateReceipt` 中
   - 支援 YYYYMM-XXX 格式
   - 支援每月獨立計數
   - 支援 4 位數序號（>999）
   - 不重用作廢收據編號（查詢時包含 cancelled 狀態）

2. **後端 API Handler（基本功能）** ✅
   - `handleCreateReceipt` - 收據建立邏輯
   - 收據項目處理（ReceiptItems）
   - 服務類型關聯（ReceiptServiceTypes）
   - 路由配置已存在

3. **前端 API 調用函數** ✅
   - `createReceipt` - 收據建立 API
   - `fetchReceiptReminders` - 獲取對帳提醒列表
   - `postponeReminder` - 暫緩提醒

4. **前端組件（基本功能）** ✅
   - `ReceiptFormModal.vue` - 收據建立表單
   - `ReceiptReminderBanner.vue` - 對帳提醒橫幅
   - 支援從對帳提醒快速開立收據

### 未實現或部分實現功能

1. **金額調整原因處理** ❌
   - 需求：修改建議金額時需填寫修改原因（`amount_adjustment_reason`）
   - 現狀：後端和前端均未實現

2. **對帳提醒狀態更新** ❌
   - 需求：收據建立後自動標記相關提醒為已完成，關聯收據 ID
   - 現狀：後端未實現對帳提醒狀態更新邏輯

3. **服務選擇組件** ❓
   - 需求：獨立的服務選擇組件（ServiceSelection.vue）
   - 現狀：服務選擇功能整合在 ReceiptFormModal 中，但未實現多服務選擇和建議金額計算

4. **建議金額計算** ❌
   - 需求：選擇多個服務時計算建議金額為所有選中服務的收費計劃金額總和
   - 現狀：未實現多服務選擇和建議金額計算

---

## 1. 後端 API 實現

### 1.1 收據編號生成工具

- [x] 1.1.1 實現收據編號生成邏輯 ✅ 已實現
  - File: backend/src/handlers/receipts/receipt-crud.js
  - Function: handleCreateReceipt（內嵌邏輯）
  - 實現收據編號生成（格式：YYYYMM-XXX）
  - 實現每月獨立計數
  - 實現 4 位數序號支援（>999）
  - 實現作廢收據編號處理（不重用，查詢時包含 cancelled 狀態）
  - Purpose: 自動生成唯一收據編號
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js_
  - _Requirements: BR3.3.2_
  - _Status: 已完成 - 收據編號生成邏輯已實現於 handleCreateReceipt 中，支援所有需求功能_

### 1.2 收據建立 API Handler（增強）

- [x] 1.2.1 實現收據建立 Handler（基本功能） ✅ 已實現
  - File: backend/src/handlers/receipts/receipt-crud.js
  - Function: handleCreateReceipt
  - 實現收據建立邏輯
  - 實現收據項目處理（ReceiptItems）
  - 實現服務類型關聯（ReceiptServiceTypes）
  - 確認路由配置（backend/src/router/receipts.js 中的 POST /api/v2/receipts 路由）
  - Purpose: 提供收據建立 API
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js_
  - _Requirements: BR3.3.2_
  - _Status: 部分完成 - 基本收據建立邏輯已實現_

- [ ] 1.2.2 實現金額調整原因處理
  - File: backend/src/handlers/receipts/receipt-crud.js
  - Function: handleCreateReceipt
  - 在收據建立時接收 `amount_adjustment_reason` 字段
  - 將金額調整原因存儲到 Receipts 表（需要先確認資料庫是否有此欄位，如無則需新增 migration）
  - 如果總金額與建議金額不同，要求提供調整原因（可選驗證）
  - Purpose: 記錄金額調整原因
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js_
  - _Requirements: BR3.3.2_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Add amount adjustment reason handling to handleCreateReceipt function. Receive amount_adjustment_reason field in request body, store it in Receipts table (add migration if field doesn't exist), and optionally validate that reason is provided when total amount differs from suggested amount following requirement BR3.3.2 | Restrictions: Must use parameterized queries, must handle optional field correctly, must add database migration if field doesn't exist | Success: Amount adjustment reason is stored correctly, validation works if implemented, migration is added if needed_

- [ ] 1.2.3 實現對帳提醒狀態更新邏輯
  - File: backend/src/handlers/receipts/receipt-crud.js
  - Function: handleCreateReceipt
  - 在收據建立成功後，更新相關對帳提醒狀態為 `completed`
  - 支援兩種方式：
    - 從提醒開立：如果請求中包含 `reminder_ids`，直接更新這些提醒
    - 手動建立：根據 `client_id`、`service_type_ids` 和服務期間匹配相關的 `pending` 狀態提醒
  - 更新字段：`status = 'completed'`、`completed_receipt_id = 新收據ID`、`completed_at = 當前時間`
  - Purpose: 自動標記對帳提醒為已完成
  - _Leverage: backend/src/handlers/receipts/receipt-crud.js, BillingReminders 表_
  - _Requirements: BR3.3.1_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Add billing reminder status update logic to handleCreateReceipt function. After receipt is successfully created, update related billing reminders to 'completed' status with receipt ID association. Support two modes: 1) From reminder creation: if request contains reminder_ids, update those reminders directly; 2) Manual creation: match pending reminders by client_id, service_type_ids, and service period. Update fields: status='completed', completed_receipt_id=new receipt ID, completed_at=current time following requirement BR3.3.1 | Restrictions: Must use parameterized queries, must handle both modes correctly, must update reminders atomically, must not fail receipt creation if reminder update fails (log error instead) | Success: Reminder status is updated correctly for both modes, receipt creation succeeds even if reminder update fails, errors are logged appropriately_

---

## 2. 前端 API 調用層

### 2.1 收據建立 API 調用

- [x] 2.1.1 實現收據建立 API 調用函數 ✅ 已實現
  - File: src/api/receipts.js
  - Function: createReceipt
  - 實現收據建立 API 調用
  - 使用統一的錯誤處理和回應格式處理
  - Purpose: 提供收據建立 API 調用
  - _Leverage: src/api/receipts.js, @/utils/apiHelpers_
  - _Requirements: BR3.3.2_
  - _Status: 已完成_

- [x] 2.1.2 實現對帳提醒相關 API 調用函數 ✅ 已實現
  - File: src/api/receipts.js
  - Function: fetchReceiptReminders, postponeReminder
  - 實現獲取對帳提醒列表 API
  - 實現暫緩提醒 API
  - Purpose: 提供對帳提醒相關 API 調用
  - _Leverage: src/api/receipts.js_
  - _Requirements: BR3.3.1_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 收據建立表單組件（增強）

- [x] 3.1.1 實現收據建立表單組件（基本功能） ✅ 已實現
  - File: src/components/receipts/ReceiptFormModal.vue
  - 實現收據建立表單
  - 實現基本表單驗證
  - 支援從對帳提醒傳入初始數據
  - Purpose: 提供收據建立界面
  - _Leverage: src/components/receipts/ReceiptFormModal.vue_
  - _Requirements: BR3.3.2_
  - _Status: 部分完成 - 基本表單已實現_

- [ ] 3.1.2 實現金額調整原因輸入字段
  - File: src/components/receipts/ReceiptFormModal.vue
  - 在表單中增加金額調整原因輸入欄位（`amount_adjustment_reason`）
  - 當總金額與建議金額不同時，要求填寫調整原因（條件驗證）
  - 如果總金額等於建議金額，則不需要填寫調整原因
  - Purpose: 允許用戶填寫金額調整原因
  - _Leverage: src/components/receipts/ReceiptFormModal.vue_
  - _Requirements: BR3.3.2_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Add amount adjustment reason input field to ReceiptFormModal.vue component. When total amount differs from suggested amount, require user to input adjustment reason with conditional validation. If total amount equals suggested amount, reason is not required. Include validation to ensure reason is provided when amount is adjusted following requirement BR3.3.2 | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue Form components, must implement conditional validation correctly, must handle amount comparisons properly | Success: Component includes amount adjustment reason field with proper conditional validation, validation works correctly when amount is adjusted_

- [ ] 3.1.3 實現多服務選擇和建議金額計算
  - File: src/components/receipts/ReceiptFormModal.vue
  - 實現多服務選擇功能（支援選擇多個服務類型）
  - 實現建議金額計算（所有選中服務的收費計劃金額總和）
  - 支援不同月份的多個服務一起選擇
  - 當選擇服務時，自動計算並顯示建議金額
  - Purpose: 支援多服務選擇和建議金額計算
  - _Leverage: src/components/receipts/ReceiptFormModal.vue, src/api/receipts.js_
  - _Requirements: BR3.3.1, BR3.3.2_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Enhance ReceiptFormModal.vue to support multiple service selection and suggested amount calculation. Allow selecting multiple services from different months, calculate suggested amount as sum of all selected services' billing schedule amounts, and automatically display suggested amount when services are selected following requirements BR3.3.1 and BR3.3.2 | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue components, must calculate amounts correctly, must handle multiple services and months, must update UI reactively | Success: Multiple service selection works, suggested amount is calculated correctly, UI updates reactively when services are selected_

### 3.2 服務選擇組件（可選）

- [ ] 3.2.1 實現獨立服務選擇組件（可選）
  - File: src/components/receipts/ServiceSelection.vue
  - 實現多服務選擇功能
  - 實現建議金額計算（所有選中服務的收費計劃金額總和）
  - 支援不同月份的多個服務一起選擇
  - 注意：如果功能已整合在 ReceiptFormModal 中，此組件可選
  - Purpose: 提供獨立的服務選擇組件（可重用）
  - _Leverage: Ant Design Vue Select/Checkbox components, src/api/receipts.js_
  - _Requirements: BR3.3.1_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Create ServiceSelection.vue component that provides multiple service selection functionality with suggested amount calculation (sum of all selected services' billing schedule amounts). The component should support selecting multiple services from different months and use Ant Design Vue Select/Checkbox components. Note: This component is optional if functionality is already integrated in ReceiptFormModal following requirement BR3.3.1 | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue components, must calculate suggested amounts correctly, must emit change events properly | Success: Component is implemented correctly, multiple service selection works, suggested amount calculation is correct, events are emitted correctly_

### 3.3 對帳提醒橫幅組件

- [x] 3.3.1 實現對帳提醒橫幅組件 ✅ 已實現
  - File: src/components/receipts/ReceiptReminderBanner.vue
  - 實現對帳提醒列表展示
  - 實現快速開收據功能
  - 實現暫緩提醒功能
  - Purpose: 提供對帳提醒展示和快速操作
  - _Leverage: src/components/receipts/ReceiptReminderBanner.vue_
  - _Requirements: BR3.3.1_
  - _Status: 已完成_

---

## 4. 資料庫 Migration（如需要）

### 4.1 金額調整原因欄位

- [ ] 4.1.1 新增金額調整原因欄位（如資料庫無此欄位）
  - File: backend/migrations/XXXX_add_amount_adjustment_reason.sql
  - 為 Receipts 表新增 `amount_adjustment_reason` 欄位（TEXT, nullable）
  - Purpose: 存儲金額調整原因
  - _Leverage: backend/migrations/_
  - _Requirements: BR3.3.2_
  - _Prompt: Role: Database Developer with expertise in SQLite schema design | Task: Create migration file to add amount_adjustment_reason field (TEXT, nullable) to Receipts table if field doesn't exist. Follow existing migration patterns and naming conventions following requirement BR3.3.2 | Restrictions: Must check if field exists before adding, must follow existing migration patterns, must use proper SQLite syntax | Success: Migration file is created correctly, field is added if it doesn't exist, migration runs without errors_

---

## 5. 測試

### 5.1 E2E 測試

- [ ] 5.1.1 實現收據建立 E2E 測試
  - File: tests/e2e/receipts/receipt-creation.spec.ts
  - 測試從對帳提醒開立收據
  - 測試手動建立收據
  - 測試收據建立後提醒狀態更新為已完成
  - 測試收據編號自動生成和唯一性
  - 測試金額調整原因驗證
  - 測試多服務選擇和建議金額計算
  - Purpose: 確保收據建立功能完整可用
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR3.3.1, BR3.3.2_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for receipt creation from reminders and manual creation, including reminder status update verification, receipt ID uniqueness validation, amount adjustment reason validation, and multiple service selection with suggested amount calculation. Use Playwright framework and test data utilities from tests/e2e/utils/test-data.ts following requirements BR3.3.1 and BR3.3.2 | Restrictions: Must use Playwright, must test all operations, must use test data utilities, must handle async operations correctly | Success: All E2E tests pass, all operations are tested, reminder status update is verified, receipt ID uniqueness is validated, amount adjustment reason validation works, multiple service selection works correctly_

---

## 總結

### 已完成功能
- ✅ 收據編號生成邏輯（完整實現）
- ✅ 後端 API Handler（基本功能）
- ✅ 前端 API 調用函數
- ✅ 收據建立表單組件（基本功能）
- ✅ 對帳提醒橫幅組件

### 待完成功能
- ❌ 金額調整原因處理（後端和前端）
- ❌ 對帳提醒狀態更新邏輯（後端）
- ❌ 多服務選擇和建議金額計算（前端）
- ❌ 獨立服務選擇組件（可選）
- ❌ 資料庫 Migration（如需要）
- ❌ E2E 測試（完全未實現）

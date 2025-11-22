# Tasks Document: BR6.1: 工時填報

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 基本實現
   - `handleCreateOrUpdateTimesheet` - 處理工時記錄保存（支援 UPSERT）
   - `handleGetTimesheets` - 處理工時記錄查詢
   - 基本驗證邏輯（日期格式、客戶、服務項目、工時類型、時數範圍、0.5 倍數驗證）

2. **路由配置** ✅ 已實現
   - POST /api/v2/timesheets
   - GET /api/v2/timesheets

3. **前端組件** ✅ 已實現
   - `Timesheets.vue` - 工時記錄主頁面
   - `TimesheetTable.vue` - 工時表格組件
   - `WeekNavigation.vue` - 週導航組件
   - `TimesheetSummary.vue` - 統計顯示組件

4. **前端 Store** ✅ 已實現
   - `timesheets.js` - 工時狀態管理
   - `buildRows` - 工時記錄合併邏輯

5. **前端驗證** ✅ 已實現
   - 時數四捨五入邏輯（0.5 倍數）
   - 時數範圍驗證（0.5 - 12 小時）

6. **任務類型動態載入** ✅ 已實現
   - 根據客戶和服務項目動態載入任務類型列表

### 未實現或部分實現功能

1. **後端數據轉換邏輯** ⚠️ 需要補完
   - 需求：接收 `service_item_id`，查詢 `ServiceItems` 表取得 `item_name`，存儲到 `task_type` 欄位
   - 現狀：目前接收 `task_type` 或 `service_item_name`，沒有實現 `service_item_id` 到 `task_type` 的轉換

2. **後端返回時數據轉換** ⚠️ 需要補完
   - 需求：根據 `task_type` 查詢 `ServiceItems` 表取得對應的 `item_id`，返回 `service_item_id`
   - 現狀：目前返回 `task_type`，沒有返回 `service_item_id`

3. **後端去重邏輯** ⚠️ 需要確認
   - 需求：去重檢查包含 `task_type` 欄位：`user_id + work_date + client_id + service_id + task_type + work_type`
   - 現狀：需要確認去重邏輯是否包含 `task_type`

4. **後端單日工時超限驗證** ⚠️ 需要補完
   - 需求：驗證累加後的單日總工時不超過 24 小時
   - 現狀：需要確認是否已實現

5. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 後端數據轉換邏輯（service_item_id → task_type）

- [ ] 1.1.1 實現後端數據轉換邏輯（service_item_id → task_type）
  - File: backend/src/handlers/timesheets/timesheet-crud.js
  - Function: handleCreateOrUpdateTimesheet
  - 接收 `service_item_id`，查詢 `ServiceItems` 表取得 `item_name`，存儲到 `task_type` 欄位
  - 驗證 `service_item_id` 是否存在，如果不存在返回錯誤
  - 保持向後兼容性（如果直接提供 `task_type`，則直接使用）
  - 確認路由配置（backend/src/router/timesheets.js 中的 POST /api/v2/timesheets 路由）
  - Purpose: 確保任務類型數據轉換準確
  - _Leverage: backend/src/utils/response.js, backend/src/router/timesheets.js, ServiceItems 表_
  - _Requirements: BR6.1.2_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Modify handleCreateOrUpdateTimesheet function to receive service_item_id parameter, validate it exists in ServiceItems table, convert to item_name for task_type field storage, and handle conversion errors properly. Ensure backward compatibility with existing task_type direct input. | Restrictions: Must use parameterized queries, must handle errors properly, must follow existing response format, must verify route configuration, must maintain backward compatibility | Success: Data conversion works correctly for both service_item_id input and direct task_type input, validation works, error handling is proper, route is properly configured_

### 1.2 後端返回時數據轉換（task_type → service_item_id）

- [ ] 1.2.1 實現後端返回時數據轉換（task_type → service_item_id）
  - File: backend/src/handlers/timesheets/timesheet-crud.js
  - Function: handleGetTimesheets, handleGetTimesheetDetail
  - 根據 `task_type` 查詢 `ServiceItems` 表取得對應的 `item_id`，返回 `service_item_id`
  - 處理無法匹配的情況，返回 null 或默認值
  - 確認路由配置（backend/src/router/timesheets.js 中的 GET /api/v2/timesheets 和 GET /api/v2/timesheets/:id 路由）
  - Purpose: 確保前端能正確顯示任務類型選擇
  - _Leverage: backend/src/utils/response.js, backend/src/router/timesheets.js, ServiceItems 表_
  - _Requirements: BR6.1.2_
  - _Prompt: Role: Backend Developer | Task: Modify handleGetTimesheets and handleGetTimesheetDetail functions to convert task_type back to service_item_id by querying ServiceItems table. Handle cases where task_type doesn't match any ServiceItems gracefully. Ensure the routes are properly configured in backend/src/router/timesheets.js | Restrictions: Must handle cases where task_type doesn't match any ServiceItems, must use efficient JOIN queries, must verify route configuration, must maintain backward compatibility | Success: service_item_id is correctly returned in response for valid task_types, handles missing matches gracefully, routes are properly configured_

### 1.3 後端去重邏輯

- [x] 1.3.1 驗證後端去重邏輯包含 task_type 字段 ✅ 已實現
  - File: backend/src/handlers/timesheets/timesheet-crud.js
  - Function: handleCreateOrUpdateTimesheet
  - 驗證去重檢查邏輯已包含完整的唯一性組合：`user_id + work_date + client_id + service_id + task_type + work_type`
  - 驗證去重邏輯與前端行合併邏輯保持一致
  - 確認路由配置（backend/src/router/timesheets.js 中的 POST /api/v2/timesheets 路由）
  - Purpose: 防止重複記錄，確保數據完整性
  - _Leverage: backend/src/utils/response.js, backend/src/router/timesheets.js_
  - _Requirements: BR6.1.6_
  - _Status: 已完成_

### 1.4 後端單日工時超限驗證

- [ ] 1.4.1 修復後端單日工時超限驗證（24 小時上限）
  - File: backend/src/handlers/timesheets/timesheet-crud.js
  - Function: handleCreateOrUpdateTimesheet
  - 修復單日工時上限驗證，從 12 小時改為 24 小時
  - 驗證累加後的單日總工時不超過 24 小時
  - 區分不同工時類型，檢查每種類型的上限
  - 如果超過則返回清晰的錯誤訊息
  - Purpose: 確保數據合理性，符合勞基法規定（單日工時上限為 24 小時）
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR6.1.6_
  - _Prompt: Role: Backend Developer | Task: Fix daily hours limit validation in handleCreateOrUpdateTimesheet to check if accumulated daily hours exceed 24 hours total (currently set to 12 hours, needs to be changed to 24 hours) and individual work type limits. Return clear error messages when limits are exceeded. | Restrictions: Must check total daily hours across all work types, must validate individual work type limits, must handle rounding correctly, must return clear error message with current vs limit details, must change limit from 12 to 24 hours | Success: Validation works correctly for 24 hours total daily limit and work type limits, error messages are clear and informative, handles edge cases properly_

---

## 2. 前端組件實現

### 2.1 前端任務類型動態載入

- [x] 2.1.1 驗證前端任務類型動態載入已實現 ✅ 已實現
  - File: src/components/timesheets/TimesheetTable.vue, src/stores/timesheets.js
  - 當選擇客戶和服務項目時，動態載入任務類型列表
  - 從 `/api/v2/clients/{clientId}/services/{serviceId}/items` 獲取已配置的任務類型
  - 如果任務類型列表為空，顯示提示「該客戶該服務項目尚未配置任務類型」
  - Purpose: 確保只顯示已配置的任務類型
  - _Leverage: src/api/timesheets.js, src/stores/timesheets.js_
  - _Requirements: BR6.1.2_
  - _Status: 已完成_

### 2.2 前端工時記錄合併邏輯

- [x] 2.2.1 驗證前端工時記錄合併邏輯已實現 ✅ 已實現
  - File: src/stores/timesheets.js
  - Function: buildRows
  - 使用唯一性判斷：`user_id + client_id + service_id + service_item_id + work_type_id`
  - 同一任務、同一工時類型、同一天的工時自動合併為同一行，累加時數
  - Purpose: 在表格中正確顯示合併後的工時記錄
  - _Leverage: src/utils/date.js_
  - _Requirements: BR6.1.5_
  - _Status: 已完成_

### 2.3 前端時數四捨五入邏輯

- [x] 2.3.1 驗證前端時數四捨五入邏輯已實現 ✅ 已實現
  - File: src/components/timesheets/TimesheetTable.vue
  - 輸入時自動四捨五入到 0.5 小時
  - 失焦時再次四捨五入確保精度
  - 驗證時數範圍 0.5 - 12 小時
  - Purpose: 確保時數精度一致
  - _Leverage: src/composables/useTimesheetValidation.js_
  - _Requirements: BR6.1.4_
  - _Status: 已完成_

---

## 3. 路由配置

### 3.1 後端路由配置

- [x] 3.1.1 驗證後端路由配置已實現 ✅ 已實現
  - File: backend/src/router/timesheets.js
  - 驗證工時記錄保存 API 路由已配置（POST /api/v2/timesheets）
  - 驗證工時記錄查詢 API 路由已配置（GET /api/v2/timesheets）
  - 驗證權限檢查已實現
  - Purpose: 確認後端路由已正確配置並受保護
  - _Leverage: backend/src/router/timesheets.js, backend/src/middleware/auth.js_
  - _Requirements: BR6.1.1, BR6.1.2, BR6.1.3, BR6.1.4, BR6.1.5, BR6.1.6_
  - _Status: 已完成_

### 3.2 前端路由配置

- [x] 3.2.1 驗證前端路由配置已實現 ✅ 已實現
  - File: src/router/index.js
  - 驗證工時填報頁面路由已配置（/timesheets）
  - Purpose: 確認前端路由已正確配置
  - _Leverage: src/router/index.js_
  - _Requirements: BR6.1.1_
  - _Status: 已完成_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 實現工時填報 E2E 測試
  - File: tests/e2e/timesheets/timesheet-entry.spec.ts
  - 測試完整的工時填寫流程（選擇客戶 → 選擇服務項目 → 選擇任務類型 → 選擇工時類型 → 輸入時數 → 保存）
  - 測試任務類型動態載入和空狀態提示
  - 測試工時記錄合併邏輯
  - 測試後端去重保護
  - 測試單日工時超限驗證
  - 測試時數範圍驗證和四捨五入邏輯
  - Purpose: 確保工時填報功能的端到端正確性
  - _Leverage: Playwright testing framework, tests/helpers/testUtils.ts_
  - _Requirements: BR6.1.1, BR6.1.2, BR6.1.3, BR6.1.4, BR6.1.5, BR6.1.6_
  - _Prompt: Role: QA Automation Engineer with expertise in Playwright and E2E testing | Task: Create comprehensive E2E tests for timesheet entry feature covering complete workflow (select client → select service → select task type → select work type → input hours → save), dynamic task type loading, row merging logic, backend duplicate protection, daily hours limit validation, and hours range validation with rounding logic, following requirements BR6.1.1, BR6.1.2, BR6.1.3, BR6.1.4, BR6.1.5, BR6.1.6 | Restrictions: Must test real user workflows, ensure tests are maintainable, use existing test utilities, test both success and failure scenarios | Success: E2E tests cover all critical user journeys, tests verify data accuracy, validation logic is tested, tests run reliably_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本實現 - 工時記錄保存、查詢、基本驗證）
- ✅ 路由配置（完整實現）
- ✅ 前端組件（完整實現 - 工時表格、週導航、統計顯示）
- ✅ 前端 Store（完整實現 - 工時狀態管理、合併邏輯）
- ✅ 前端驗證（完整實現 - 時數四捨五入、範圍驗證）
- ✅ 任務類型動態載入（完整實現）

### 待完成功能
- ⚠️ 後端數據轉換邏輯（service_item_id → task_type）（需要補完）
- ⚠️ 後端返回時數據轉換（task_type → service_item_id）（需要補完）
- ⚠️ 後端去重邏輯（需要確認並修復，確保包含 task_type）
- ⚠️ 後端單日工時超限驗證（需要確認並補完）
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已基本實現，包括：
  - 工時填報欄位（日期、客戶、服務項目、任務類型、工時類型、時數）
  - 任務類型動態載入（根據客戶和服務項目）
  - 工時記錄合併邏輯（前端）
  - 時數四捨五入邏輯（前端）
- 需要補完的功能：
  - 後端數據轉換邏輯（service_item_id → task_type）：確保前端發送的 `service_item_id` 能正確轉換為 `task_type` 存儲
  - 後端返回時數據轉換（task_type → service_item_id）：確保前端能正確顯示任務類型選擇
  - 後端去重邏輯：確保包含 `task_type` 欄位，與前端合併邏輯保持一致
  - 後端單日工時超限驗證：確保累加後的單日總工時不超過 24 小時

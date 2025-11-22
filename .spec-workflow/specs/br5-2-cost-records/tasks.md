# Tasks Document: BR5.2: 月度管理費用記錄

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 已實現（基本功能）
   - `handleGetCosts` - 獲取月度管理費用記錄列表（支援按年份和月份篩選）
   - `handleCreateCost` - 新增月度管理費用記錄（檢查唯一性、驗證金額、年份、月份、成本項目類型）
   - `handleUpdateCost` - 更新月度管理費用記錄（但只允許更新金額和備註）
   - `handleDeleteCost` - 刪除月度管理費用記錄（使用軟刪除）

2. **路由配置** ✅ 已實現
   - GET/POST /api/v2/costs/records
   - PUT/DELETE /api/v2/costs/records/:id
   - 還有別名路由 /api/v2/costs/overhead

3. **前端 API 調用函數** ✅ 已實現
   - `fetchCostRecords` - 獲取月度管理費用記錄列表
   - `createCostRecord` - 新增月度管理費用記錄
   - `updateCostRecord` - 更新月度管理費用記錄
   - `deleteCostRecord` - 刪除月度管理費用記錄

4. **前端組件** ✅ 已實現
   - `CostRecordsList.vue` - 月度管理費用記錄列表頁面
   - `CostRecordTable.vue` - 月度管理費用記錄表格組件
   - `CostRecordForm.vue` - 月度管理費用記錄表單組件（新增/編輯）

5. **資料庫 Migration** ✅ 已實現
   - `MonthlyOverheadCosts` 表已創建（包含唯一約束 `UNIQUE(cost_type_id, year, month)`）

### 未實現或部分實現功能

1. **排序功能** ⚠️ 部分實現
   - 需求：按年份降序、月份降序、成本項目類型名稱排序
   - 現狀：按 `display_order` 和 `cost_code` 排序（`ORDER BY ot.display_order ASC, ot.cost_code ASC`）

2. **更新功能** ⚠️ 部分實現
   - 需求：允許修改成本項目類型、年份、月份、金額、備註
   - 現狀：只允許更新金額和備註，不允許更新成本項目類型、年份、月份

3. **刪除功能** ⚠️ 部分實現
   - 需求：硬刪除（從資料庫中完全刪除）
   - 現狀：軟刪除（`is_deleted = 1`）

4. **列表查詢** ⚠️ 部分實現
   - 需求：顯示所有月度管理費用記錄（不限制年份和月份）
   - 現狀：預設只查詢當前年份，需要指定年份和月份參數

5. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 月度管理費用記錄列表查詢 API Handler

- [x] 1.1.1 驗證月度管理費用記錄列表查詢 API Handler 已實現 ✅ 已實現（基本功能）
  - File: backend/src/handlers/costs/cost-records-crud.js
  - Function: handleGetCosts
  - 驗證月度管理費用記錄列表查詢邏輯已實現
  - 驗證顯示所有必要欄位（成本項目類型、年份、月份、金額、備註、錄入人、錄入時間）已實現
  - 驗證支援按年份和月份篩選已實現
  - 驗證支援搜尋功能已實現（按關鍵字搜尋）
  - 確認路由配置（backend/src/router/costs.js 中的 GET /api/v2/costs/records 和 GET /api/v2/costs/overhead/:year/:month 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援月度管理費用記錄列表查詢
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.2.1_
  - _Status: 基本實現 - 需要調整排序邏輯和支援查詢所有記錄_

- [ ] 1.1.2 調整排序邏輯為需求規範
  - File: backend/src/handlers/costs/cost-records-crud.js
  - 修改 `handleGetCosts` 函數的排序邏輯
  - 改為按年份降序、月份降序、成本項目類型名稱排序（`ORDER BY oc.year DESC, oc.month DESC, ot.cost_name ASC`）
  - Purpose: 確保列表按需求規範排序
  - _Leverage: backend/src/handlers/costs/cost-records-crud.js_
  - _Requirements: BR5.2.1_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update sorting logic in handleGetCosts function to sort by year DESC, month DESC, cost type name ASC (ORDER BY oc.year DESC, oc.month DESC, ot.cost_name ASC) instead of current display_order and cost_code sorting | Restrictions: Must use parameterized queries, must maintain existing filtering and search functionality, must follow existing response format patterns | Success: Sorting logic is updated correctly, list is sorted by year DESC, month DESC, cost type name ASC_

- [ ] 1.1.3 調整列表查詢支援查詢所有記錄
  - File: backend/src/handlers/costs/cost-records-crud.js
  - 修改 `handleGetCosts` 函數，使年份和月份參數為可選
  - 如果不提供年份參數，查詢所有年份的記錄
  - 如果不提供月份參數，查詢該年份所有月份的記錄
  - Purpose: 支援查詢所有月度管理費用記錄，不限制年份和月份
  - _Leverage: backend/src/handlers/costs/cost-records-crud.js_
  - _Requirements: BR5.2.1_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update handleGetCosts function to make year and month parameters optional. If year is not provided, query all years. If month is not provided (but year is provided), query all months for that year. Remove the default year filter (currently defaults to current year) | Restrictions: Must use parameterized queries, must maintain existing filtering and search functionality, must follow existing response format patterns | Success: Function supports querying all records when year/month are not provided, filtering works correctly when parameters are provided_

### 1.2 月度管理費用記錄新增 API Handler

- [x] 1.2.1 驗證月度管理費用記錄新增 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-records-crud.js
  - Function: handleCreateCost
  - 驗證月度管理費用記錄新增邏輯已實現
  - 驗證必填欄位驗證已實現（成本項目類型、年份、月份、金額）
  - 驗證金額必須為正數已實現（`amount < 0` 檢查）
  - 驗證年份為有效年份已實現（`year < 2000` 檢查，但需求是 1900-2100）
  - 驗證月份為有效月份已實現（`month < 1 || month > 12` 檢查）
  - 驗證成本項目類型存在且為啟用狀態已實現
  - 驗證同一成本項目類型在同一月只能有一筆記錄已實現（檢查唯一性）
  - 驗證記錄錄入時間和錄入人已實現
  - 確認路由配置（backend/src/router/costs.js 中的 POST /api/v2/costs/records 和 POST /api/v2/costs/overhead 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援月度管理費用記錄新增
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.2.2_
  - _Status: 已完成 - 年份驗證範圍可能需要調整（需求是 1900-2100，現狀是 year < 2000）_

- [ ] 1.2.2 調整年份驗證範圍
  - File: backend/src/handlers/costs/cost-records-crud.js
  - 修改 `handleCreateCost` 函數的年份驗證邏輯
  - 改為驗證年份在 1900-2100 範圍內（`year < 1900 || year > 2100`）
  - Purpose: 確保年份驗證符合需求規範
  - _Leverage: backend/src/handlers/costs/cost-records-crud.js_
  - _Requirements: BR5.2.2_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update year validation in handleCreateCost function to check if year is between 1900 and 2100 (year < 1900 || year > 2100) instead of current year < 2000 check | Restrictions: Must use parameterized queries, must maintain existing validation logic, must follow existing response format patterns | Success: Year validation checks range 1900-2100 correctly_

### 1.3 月度管理費用記錄更新 API Handler

- [x] 1.3.1 驗證月度管理費用記錄更新 API Handler 已實現 ✅ 已實現（部分功能）
  - File: backend/src/handlers/costs/cost-records-crud.js
  - Function: handleUpdateCost
  - 驗證月度管理費用記錄更新邏輯已實現
  - 驗證允許更新金額和備註已實現
  - 驗證金額必須為正數已實現（`amount < 0` 檢查）
  - 驗證記錄更新時間已實現
  - 確認路由配置（backend/src/router/costs.js 中的 PUT /api/v2/costs/records/:id 和 PUT /api/v2/costs/overhead/:id 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援月度管理費用記錄更新
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.2.3_
  - _Status: 部分實現 - 只允許更新金額和備註，不允許更新成本項目類型、年份、月份_

- [ ] 1.3.2 補完更新功能以支援修改成本項目類型、年份、月份
  - File: backend/src/handlers/costs/cost-records-crud.js
  - 修改 `handleUpdateCost` 函數，允許更新成本項目類型、年份、月份
  - 驗證成本項目類型存在且為啟用狀態
  - 驗證年份為有效年份（1900-2100）
  - 驗證月份為有效月份（1-12）
  - 檢查同一成本項目類型在同一月只能有一筆記錄（排除當前記錄）
  - 如果修改後的成本項目類型和月份組合與其他記錄衝突，返回錯誤並阻止修改
  - Purpose: 確保更新功能符合需求規範，允許修改所有必要欄位
  - _Leverage: backend/src/handlers/costs/cost-records-crud.js_
  - _Requirements: BR5.2.3_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update handleUpdateCost function to support updating cost_type_id, year, and month fields in addition to amount and notes. Validate cost type exists and is active, validate year is between 1900-2100, validate month is 1-12, check uniqueness constraint (cost_type_id, year, month) excluding current record. If conflict exists, return error and prevent update | Restrictions: Must use parameterized queries, must check uniqueness excluding current record, must validate all fields, must follow existing response format patterns | Success: Function supports updating all fields, uniqueness check works correctly excluding current record, all validations are implemented_

### 1.4 月度管理費用記錄刪除 API Handler

- [x] 1.4.1 驗證月度管理費用記錄刪除 API Handler 已實現 ✅ 已實現（部分功能）
  - File: backend/src/handlers/costs/cost-records-crud.js
  - Function: handleDeleteCost
  - 驗證月度管理費用記錄刪除邏輯已實現
  - 驗證記錄存在檢查已實現（在查詢時過濾 `is_deleted = 0`）
  - 確認路由配置（backend/src/router/costs.js 中的 DELETE /api/v2/costs/records/:id 和 DELETE /api/v2/costs/overhead/:id 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援月度管理費用記錄刪除
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.2.4_
  - _Status: 部分實現 - 使用軟刪除，需求是硬刪除_

- [ ] 1.4.2 調整刪除功能為硬刪除
  - File: backend/src/handlers/costs/cost-records-crud.js
  - 修改 `handleDeleteCost` 函數，改為硬刪除（`DELETE FROM MonthlyOverheadCosts WHERE overhead_id = ?`）
  - 移除軟刪除邏輯（`UPDATE ... SET is_deleted = 1`）
  - Purpose: 確保刪除功能符合需求規範（硬刪除）
  - _Leverage: backend/src/handlers/costs/cost-records-crud.js_
  - _Requirements: BR5.2.4_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update handleDeleteCost function to use hard delete (DELETE FROM MonthlyOverheadCosts WHERE overhead_id = ?) instead of soft delete (UPDATE ... SET is_deleted = 1). Remove soft delete logic | Restrictions: Must use parameterized queries, must verify record exists before deletion, must follow existing response format patterns | Success: Function uses hard delete correctly, record is completely removed from database_

### 1.5 資料庫 Migration

- [x] 1.5.1 驗證資料庫 Migration 已實現 ✅ 已實現
  - File: backend/migrations/0006_costs.sql
  - 驗證 MonthlyOverheadCosts 表結構已創建
  - 驗證唯一約束 `UNIQUE(cost_type_id, year, month)` 已定義
  - 驗證外鍵約束（`cost_type_id` 引用 `OverheadCostTypes` 表）已定義
  - 驗證表結構符合 Data Models 定義
  - Purpose: 確認資料庫結構支援月度管理費用記錄功能
  - _Leverage: backend/migrations/0006_costs.sql_
  - _Requirements: BR5.2.1, BR5.2.2, BR5.2.3, BR5.2.4_
  - _Status: 已完成_

---

## 2. 前端 API 調用層

### 2.1 月度管理費用記錄 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/costs.js
  - Functions: fetchCostRecords, createCostRecord, updateCostRecord, deleteCostRecord
  - 驗證獲取月度管理費用記錄列表功能正確
  - 驗證新增月度管理費用記錄功能正確
  - 驗證更新月度管理費用記錄功能正確
  - 驗證刪除月度管理費用記錄功能正確
  - 驗證使用統一的錯誤處理和回應格式處理
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/costs.js_
  - _Requirements: BR5.2.1, BR5.2.2, BR5.2.3, BR5.2.4_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 月度管理費用記錄列表前端頁面

- [x] 3.1.1 驗證月度管理費用記錄列表前端頁面已實現 ✅ 已實現
  - File: src/views/costs/CostRecordsList.vue
  - 頁面佈局和路由已實現
  - 整合 CostRecordTable 組件
  - 整合 CostRecordForm 組件
  - 數據載入和錯誤處理已實現
  - 新增、編輯、刪除操作處理已實現
  - Purpose: 確認月度管理費用記錄列表頁面已完整實現
  - _Leverage: src/views/costs/CostRecordsList.vue, src/components/costs/CostRecordTable.vue, src/components/costs/CostRecordForm.vue, src/api/costs.js_
  - _Requirements: BR5.2.1, BR5.2.2, BR5.2.3, BR5.2.4_
  - _Status: 已完成_

### 3.2 月度管理費用記錄列表表格組件

- [x] 3.2.1 驗證月度管理費用記錄列表表格組件已實現 ✅ 已實現
  - File: src/components/costs/CostRecordTable.vue
  - 月度管理費用記錄列表展示已實現（顯示項目名稱、金額、備註、錄入人）
  - 編輯按鈕已實現
  - 刪除按鈕已實現
  - Purpose: 確認月度管理費用記錄列表表格組件已完整實現
  - _Leverage: Ant Design Vue Table component, src/components/costs/CostRecordTable.vue_
  - _Requirements: BR5.2.1, BR5.2.3, BR5.2.4_
  - _Status: 已完成_

### 3.3 月度管理費用記錄表單組件

- [x] 3.3.1 驗證月度管理費用記錄表單組件已實現 ✅ 已實現
  - File: src/components/costs/CostRecordForm.vue
  - 月度管理費用記錄表單已實現（成本項目類型、年份、月份、金額、備註）
  - 表單驗證已實現（必填欄位驗證、金額必須為正數、年份範圍 1900-2100、月份範圍 1-12）
  - 新增和編輯模式支援已實現
  - 成本項目類型選擇已實現（只顯示啟用的成本項目類型）
  - Purpose: 確認月度管理費用記錄表單組件已完整實現
  - _Leverage: Ant Design Vue Form component, Ant Design Vue Modal component, src/components/costs/CostRecordForm.vue_
  - _Requirements: BR5.2.2, BR5.2.3_
  - _Status: 已完成_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 實現月度管理費用記錄 E2E 測試
  - File: tests/e2e/costs/cost-records.spec.ts
  - 測試月度管理費用記錄列表展示（驗證所有欄位顯示、排序）
  - 測試新增月度管理費用記錄（驗證必填欄位驗證、金額必須為正數、年份和月份驗證、成本項目類型驗證、唯一性檢查）
  - 測試編輯月度管理費用記錄（驗證必填欄位驗證、金額必須為正數、年份和月份驗證、成本項目類型驗證、唯一性檢查、排除當前記錄）
  - 測試刪除月度管理費用記錄（驗證硬刪除、確認對話框）
  - 測試錯誤處理（驗證唯一性衝突錯誤、必填欄位錯誤、金額錯誤、年份和月份錯誤）
  - Purpose: 確保所有月度管理費用記錄功能從用戶角度完整運作，驗證完整的業務流程
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR5.2.1, BR5.2.2, BR5.2.3, BR5.2.4_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for monthly cost records management functionality covering list display, create, edit, delete operations. Test form validation, uniqueness check, year/month validation, cost type validation, hard delete, error handling. Use Playwright framework and test data utilities from tests/e2e/utils/test-data.ts | Restrictions: Must use Playwright, must test all user acceptance criteria, must validate backend data persistence, must test error scenarios, must use test data utilities | Success: All E2E tests pass covering complete monthly cost records management workflow including data persistence, validation, uniqueness check, and error handling_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本實現 - 列表查詢、新增、更新、刪除）
- ✅ 路由配置（完整實現）
- ✅ 前端 API 調用函數（完整實現）
- ✅ 月度管理費用記錄列表前端頁面（完整實現）
- ✅ 月度管理費用記錄列表表格組件（完整實現）
- ✅ 月度管理費用記錄表單組件（完整實現）
- ✅ 資料庫 Migration（完整實現）

### 待完成功能
- ⚠️ 排序邏輯調整（需要改為按年份降序、月份降序、成本項目類型名稱排序）
- ⚠️ 列表查詢調整（需要支援查詢所有記錄，不限制年份和月份）
- ⚠️ 更新功能補完（需要支援修改成本項目類型、年份、月份）
- ⚠️ 刪除功能調整（需要改為硬刪除）
- ⚠️ 年份驗證範圍調整（需要改為 1900-2100）
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已基本實現，包括：
  - 月度管理費用記錄列表展示（顯示所有必要欄位）
  - 新增月度管理費用記錄（完整驗證邏輯、唯一性檢查）
  - 編輯月度管理費用記錄（部分功能 - 只允許更新金額和備註）
  - 刪除月度管理費用記錄（軟刪除，需要改為硬刪除）
- 需要調整的功能：
  - 排序邏輯（改為按年份降序、月份降序、成本項目類型名稱排序）
  - 列表查詢（支援查詢所有記錄）
  - 更新功能（支援修改成本項目類型、年份、月份）
  - 刪除功能（改為硬刪除）
  - 年份驗證範圍（改為 1900-2100）

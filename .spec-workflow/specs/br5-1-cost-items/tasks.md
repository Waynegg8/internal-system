# Tasks Document: BR5.1: 成本項目類型管理

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 已實現
   - `handleGetCostTypes` - 獲取成本項目類型列表（按成本名稱排序）
   - `handleCreateCostType` - 新增成本項目類型（檢查成本代碼唯一性）
   - `handleUpdateCostType` - 更新成本項目類型（檢查成本代碼唯一性，排除當前項目）
   - `handleDeleteCostType` - 刪除成本項目類型（檢查使用情況）

2. **路由配置** ✅ 已實現
   - GET/POST /api/v2/costs/items
   - PUT/DELETE /api/v2/costs/items/:id
   - GET/POST /api/v2/admin/cost-types（別名路由）
   - PUT/DELETE /api/v2/admin/cost-types/:id（別名路由）

3. **前端 API 調用函數** ✅ 已實現
   - `fetchCostTypes` - 獲取成本項目類型列表
   - `createCostType` - 新增成本項目類型
   - `updateCostType` - 更新成本項目類型
   - `deleteCostType` - 刪除成本項目類型

4. **前端組件** ✅ 已實現
   - `CostItems.vue` - 成本項目類型列表頁面
   - `CostTypesTable.vue` - 成本項目類型列表表格組件
   - `CostTypeFormModal.vue` - 成本項目類型表單組件（新增/編輯）

5. **資料庫 Migration** ✅ 已實現
   - `OverheadCostTypes` 表已創建（包含所有必要欄位和索引）

### 未實現或部分實現功能

1. **刪除時的使用檢查** ✅ 已實現
   - 需求：檢查 `MonthlyOverheadCosts` 和 `OverheadRecurringTemplates` 表中是否有對應的 `cost_type_id`
   - 現狀：`handleDeleteCostType` 已實現完整的使用檢查邏輯（檢查兩個表，如果已被使用則返回錯誤並阻止刪除）

2. **成本代碼自動生成** ✅ 已實現
   - 需求：新增時系統自動生成成本代碼（根據成本名稱）
   - 現狀：前端表單有自動生成邏輯，後端也有 `generateCostTypeCode` 函數支援

3. **排序功能** ✅ 已實現
   - 需求：按成本名稱（`cost_name`）排序
   - 現狀：後端查詢已按成本名稱排序（`ORDER BY cost_name ASC`）

4. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 成本項目類型列表查詢 API Handler

- [x] 1.1.1 驗證成本項目類型列表查詢 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-types.js
  - Function: handleGetCostTypes
  - 驗證成本項目類型列表查詢邏輯已實現
  - 驗證按成本名稱排序已實現（`ORDER BY cost_name ASC`）
  - 驗證顯示所有必要欄位（成本代碼、成本名稱、類別、分攤方式、描述）已實現
  - 驗證支援搜尋和篩選功能（按關鍵字、類別、啟用狀態）
  - 確認路由配置（backend/src/router/costs.js 中的 GET /api/v2/costs/items 和 GET /api/v2/admin/cost-types 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援成本項目類型列表查詢
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.1.1_
  - _Status: 已完成_

### 1.2 成本項目類型新增 API Handler

- [x] 1.2.1 驗證成本項目類型新增 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-types.js
  - Function: handleCreateCostType
  - 驗證成本項目類型新增邏輯已實現
  - 驗證成本代碼唯一性檢查已實現
  - 驗證必填欄位驗證已實現（成本代碼、成本名稱、類別、分攤方式）
  - 驗證記錄建立時間已實現
  - 確認路由配置（backend/src/router/costs.js 中的 POST /api/v2/costs/items 和 POST /api/v2/admin/cost-types 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援成本項目類型新增
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.1.2_
  - _Status: 已完成_

### 1.3 成本項目類型更新 API Handler

- [x] 1.3.1 驗證成本項目類型更新 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-types.js
  - Function: handleUpdateCostType
  - 驗證成本項目類型更新邏輯已實現
  - 驗證成本代碼唯一性檢查已實現（排除當前項目）
  - 驗證必填欄位驗證已實現（成本代碼、成本名稱、類別、分攤方式）
  - 驗證記錄更新時間已實現
  - 確認路由配置（backend/src/router/costs.js 中的 PUT /api/v2/costs/items/:id 和 PUT /api/v2/admin/cost-types/:id 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援成本項目類型更新
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.1.3_
  - _Status: 已完成_

### 1.4 成本項目類型刪除 API Handler

- [x] 1.4.1 驗證成本項目類型刪除 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/cost-types.js
  - Function: handleDeleteCostType
  - 驗證成本項目類型刪除邏輯已實現（硬刪除）
  - 驗證使用情況檢查已實現（檢查 `MonthlyOverheadCosts` 表（`is_deleted = 0`）和 `OverheadRecurringTemplates` 表）
  - 驗證如果已被使用則返回錯誤並阻止刪除已實現
  - 驗證如果未被使用則執行硬刪除已實現（先刪除相關的 `OverheadRecurringTemplates` 記錄，並軟刪除 `MonthlyOverheadCosts` 記錄）
  - 確認路由配置（backend/src/router/costs.js 中的 DELETE /api/v2/costs/items/:id 和 DELETE /api/v2/admin/cost-types/:id 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援成本項目類型刪除
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.1.4_
  - _Status: 已完成 - 使用情況檢查邏輯已完整實現_

### 1.5 資料庫 Migration

- [x] 1.5.1 驗證資料庫 Migration 已實現 ✅ 已實現
  - File: backend/migrations/0006_costs.sql
  - 驗證 OverheadCostTypes 表結構已創建
  - 驗證必要的索引（cost_code 唯一索引、is_active 索引、category 索引）已定義
  - 驗證表結構符合 Data Models 定義
  - Purpose: 確認資料庫結構支援成本項目類型功能
  - _Leverage: backend/migrations/0006_costs.sql_
  - _Requirements: BR5.1.1, BR5.1.2, BR5.1.3, BR5.1.4_
  - _Status: 已完成_

---

## 2. 前端 API 調用層

### 2.1 成本項目類型 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/costs.js
  - Functions: fetchCostTypes, createCostType, updateCostType, deleteCostType
  - 驗證獲取成本項目類型列表功能正確
  - 驗證新增成本項目類型功能正確
  - 驗證更新成本項目類型功能正確
  - 驗證刪除成本項目類型功能正確
  - 驗證使用統一的錯誤處理和回應格式處理
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/costs.js_
  - _Requirements: BR5.1.1, BR5.1.2, BR5.1.3, BR5.1.4_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 成本項目類型列表前端頁面

- [x] 3.1.1 驗證成本項目類型列表前端頁面已實現 ✅ 已實現
  - File: src/views/costs/CostItems.vue
  - 頁面佈局和路由已實現
  - 整合 CostTypesTable 組件
  - 整合 CostTypeFormModal 組件
  - 數據載入和錯誤處理已實現
  - 新增、編輯、刪除操作處理已實現
  - Purpose: 確認成本項目類型列表頁面已完整實現
  - _Leverage: src/views/costs/CostItems.vue, src/components/costs/CostTypesTable.vue, src/components/costs/CostTypeFormModal.vue, src/api/costs.js_
  - _Requirements: BR5.1.1, BR5.1.2, BR5.1.3, BR5.1.4_
  - _Status: 已完成_

### 3.2 成本項目類型列表表格組件

- [x] 3.2.1 驗證成本項目類型列表表格組件已實現 ✅ 已實現
  - File: src/components/costs/CostTypesTable.vue
  - 成本項目類型列表展示已實現（顯示成本代碼、成本名稱、類別、分攤方式、描述）
  - 編輯按鈕已實現
  - 刪除按鈕已實現（帶確認提示）
  - 自動生成按鈕已實現（額外功能）
  - Purpose: 確認成本項目類型列表表格組件已完整實現
  - _Leverage: Ant Design Vue Table component, src/components/costs/CostTypesTable.vue_
  - _Requirements: BR5.1.1, BR5.1.3, BR5.1.4_
  - _Status: 已完成_

### 3.3 成本項目類型表單組件

- [x] 3.3.1 驗證成本項目類型表單組件已實現 ✅ 已實現
  - File: src/components/costs/CostTypeFormModal.vue
  - 成本項目類型表單已實現（成本代碼、成本名稱、類別、分攤方式、描述）
  - 表單驗證已實現（必填欄位驗證）
  - 成本代碼自動生成已實現（新增模式下根據成本名稱自動生成）
  - 新增和編輯模式支援已實現
  - 啟用狀態欄位已實現（額外功能，對應 `is_active` 欄位）
  - Purpose: 確認成本項目類型表單組件已完整實現
  - _Leverage: Ant Design Vue Form component, Ant Design Vue Modal component, src/components/costs/CostTypeFormModal.vue_
  - _Requirements: BR5.1.2, BR5.1.3_
  - _Status: 已完成_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 實現成本項目類型管理 E2E 測試
  - File: tests/e2e/costs/cost-items.spec.ts
  - 測試成本項目類型列表展示（驗證所有欄位顯示、按成本名稱排序）
  - 測試新增成本項目類型（驗證必填欄位驗證、成本代碼唯一性檢查、成本代碼自動生成）
  - 測試編輯成本項目類型（驗證必填欄位驗證、成本代碼唯一性檢查、排除當前項目）
  - 測試刪除成本項目類型（驗證使用情況檢查、阻止刪除已被使用的項目、允許刪除未被使用的項目）
  - 測試錯誤處理（驗證成本代碼重複錯誤、必填欄位錯誤、使用情況錯誤）
  - Purpose: 確保所有成本項目類型管理功能從用戶角度完整運作，驗證完整的業務流程
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR5.1.1, BR5.1.2, BR5.1.3, BR5.1.4_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for cost item type management functionality covering list display, create, edit, delete operations. Test form validation, cost code uniqueness check, automatic cost code generation, usage check before deletion, error handling. Use Playwright framework and test data utilities from tests/e2e/utils/test-data.ts | Restrictions: Must use Playwright, must test all user acceptance criteria, must validate backend data persistence, must test error scenarios, must use test data utilities | Success: All E2E tests pass covering complete cost item type management workflow including data persistence, validation, usage check, and error handling_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本實現 - 列表查詢、新增、更新、刪除）
- ✅ 路由配置（完整實現）
- ✅ 前端 API 調用函數（完整實現）
- ✅ 成本項目類型列表前端頁面（完整實現）
- ✅ 成本項目類型列表表格組件（完整實現）
- ✅ 成本項目類型表單組件（完整實現 - 包含成本代碼自動生成）
- ✅ 資料庫 Migration（完整實現）

### 待完成功能
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已完整實現，包括：
  - 成本項目類型列表展示（顯示所有必要欄位、按成本名稱排序、支援搜尋和篩選）
  - 新增成本項目類型（成本代碼唯一性檢查、成本代碼自動生成）
  - 編輯成本項目類型（成本代碼唯一性檢查、排除當前項目、成本代碼自動重新生成）
  - 刪除成本項目類型（硬刪除、完整的使用情況檢查、阻止刪除已被使用的項目）
- 僅缺少 E2E 測試以確保完整流程的正確運作

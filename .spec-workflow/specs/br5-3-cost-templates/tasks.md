# Tasks Document: BR5.3: 自動生成模板

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 已實現（使用 OverheadRecurringTemplates）
   - `handleGetOverheadTemplate` - 獲取模板（按成本項目類型）
   - `handleUpdateOverheadTemplate` - 更新模板
   - `handlePreviewOverheadGeneration` - 預覽自動生成
   - `handleGenerateOverheadCosts` - 自動生成月度記錄

2. **路由配置** ✅ 已實現
   - GET/PUT /api/v2/costs/overhead-templates/:cost_type_id
   - GET /api/v2/costs/overhead/preview/:year/:month
   - POST /api/v2/costs/overhead/generate

3. **前端組件** ✅ 已實現
   - `OverheadTemplateModal.vue` - 模板設定表單組件
   - `GenerateOverheadCostsModal.vue` - 自動生成預覽組件
   - `CostItems.vue` - 已整合模板管理功能

4. **資料庫 Migration** ✅ 已實現
   - `OverheadRecurringTemplates` 表已創建（支援複雜的循環邏輯）

### 未實現或部分實現功能

1. **資料庫表結構差異** ⚠️ 需要確認
   - 需求：簡化的 `CostTemplates` 表（固定金額模板）
   - 現狀：使用 `OverheadRecurringTemplates` 表（支援循環邏輯：monthly/yearly/once）
   - 注意：現有系統功能更複雜，但可能不符合簡化需求

2. **模板唯一性約束** ⚠️ 需要確認
   - 需求：每個成本項目類型只能有一個模板（`cost_item_type_id` 唯一）
   - 現狀：需要確認 `OverheadRecurringTemplates` 表是否有唯一約束

3. **模板 CRUD 功能** ⚠️ 部分實現
   - 需求：完整的模板 CRUD（新增、編輯、刪除、列表）
   - 現狀：只有獲取和更新功能，缺少新增和刪除功能

4. **前端模板管理頁面** ⚠️ 部分實現
   - 需求：獨立的模板管理頁面
   - 現狀：模板功能整合在 `CostItems.vue` 中，沒有獨立的模板管理頁面

5. **E2E 測試** ❌ 完全未實現

---

## 1. 資料庫 Migration

### 1.1 分析現有系統與需求差異

- [x] 1.1.1 分析現有系統架構與設計差異 ✅ 已完成
  - 分析 OverheadRecurringTemplates 與 CostTemplates 的功能差異
  - 確認現有系統使用 OverheadRecurringTemplates（支援循環邏輯：monthly/yearly/once）
  - 確認設計需要簡化的 CostTemplates（固定金額模板）
  - Purpose: 確定開發方向，避免與現有複雜的循環邏輯衝突
  - _Leverage: 現有 overhead-templates.js, design.md, requirements.md_
  - _Requirements: BR5.3.1, BR5.3.2_
  - _Status: 已完成 - 現有系統使用 OverheadRecurringTemplates（支援循環邏輯），設計需要簡化的 CostTemplates（固定金額模板）_

- [ ] 1.1.2 確認是否需要建立新的 CostTemplates 表
  - File: backend/migrations/XXXX_cost_templates.sql（如果需要）
  - 評估現有 `OverheadRecurringTemplates` 表是否滿足需求
  - 如果現有表結構過於複雜，考慮建立簡化的 `CostTemplates` 表
  - 如果現有表可以滿足需求，確認唯一性約束是否已實現
  - Purpose: 確定是否需要建立新的資料表或調整現有表結構
  - _Leverage: backend/migrations/0006_costs.sql, requirements.md, design.md_
  - _Requirements: BR5.3.1_
  - _Prompt: Role: Database Architect with expertise in schema design | Task: Evaluate if existing OverheadRecurringTemplates table meets simplified CostTemplates requirements, or if a new CostTemplates table is needed. Consider uniqueness constraint on cost_type_id, fixed amount requirement, and simplicity of design | Restrictions: Must maintain data integrity, avoid breaking existing functionality, ensure uniqueness constraint | Success: Decision made on whether to create new table or use existing, uniqueness constraint is confirmed or implemented_

### 1.2 建立或調整資料庫表結構

- [ ] 1.2.1 建立 CostTemplates 資料庫表與遷移（如果需要）
  - File: backend/migrations/XXXX_cost_templates.sql
  - 建立 CostTemplates 表：id, cost_item_type_id, fixed_amount, created_at, created_by, updated_at, updated_by
  - 新增唯一約束：cost_item_type_id 唯一索引
  - 新增外鍵約束：cost_item_type_id 引用 OverheadCostTypes 表
  - Purpose: 建立專門的成本模板資料表，支援設計文檔規定的資料模型
  - _Leverage: backend/migrations/0006_costs.sql (參考 OverheadCostTypes 表結構)_
  - _Requirements: BR5.3.1_
  - _Prompt: Role: Database Administrator with expertise in SQLite schema design | Task: Create CostTemplates table with proper constraints and indexes following design specifications | Restrictions: Must maintain referential integrity with OverheadCostTypes table, implement uniqueness constraint on cost_item_type_id | Success: Table created with correct schema, indexes optimized for query performance_

---

## 2. 後端 API 實現

### 2.1 模板列表查詢 API Handler

- [x] 2.1.1 驗證模板列表查詢 API Handler 已實現 ✅ 已實現（基本功能）
  - File: backend/src/handlers/costs/overhead-templates.js
  - Function: handleGetOverheadTemplate
  - 驗證模板查詢邏輯已實現（按成本項目類型查詢）
  - 驗證包含成本項目類型關聯資訊已實現
  - 確認路由配置（backend/src/router/costs.js 中的 GET /api/v2/costs/overhead-templates/:cost_type_id 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援模板查詢
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.3.1_
  - _Status: 基本實現 - 只支援按成本項目類型查詢單個模板，不支援列表查詢_

- [ ] 2.1.2 實現模板列表查詢 API Handler（如果需要）
  - File: backend/src/handlers/costs/cost-templates-crud.js（新文件）或 overhead-templates.js
  - Function: handleGetCostTemplates
  - 實現模板列表查詢，包含所有模板和成本項目類型關聯資訊
  - 支援分頁和搜尋功能（可選）
  - Purpose: 提供模板列表查詢功能，支援前端展示所有模板
  - _Leverage: backend/src/utils/response.js, backend/src/utils/db.js_
  - _Requirements: BR5.3.1_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Implement handleGetCostTemplates function to query all cost templates list with cost item type information, using existing response utilities and database helpers | Restrictions: Must use parameterized queries, handle errors gracefully, return consistent response format | Success: Function returns template list with proper error handling, response time < 500ms_

### 2.2 模板新增 API Handler

- [ ] 2.2.1 實現模板新增 API Handler
  - File: backend/src/handlers/costs/cost-templates-crud.js（新文件）或 overhead-templates.js
  - Function: handleCreateCostTemplate
  - 實現模板新增邏輯，必填欄位驗證，金額正數驗證，成本項目類型唯一性檢查
  - 確認路由配置（backend/src/router/costs.js 中的 POST /api/v2/costs/templates 路由）
  - Purpose: 提供模板新增功能，確保數據完整性和唯一性
  - _Leverage: backend/src/utils/response.js, backend/src/utils/validation.js, backend/src/utils/db.js_
  - _Requirements: BR5.3.1_
  - _Prompt: Role: Backend Developer with expertise in data validation and database operations | Task: Implement handleCreateCostTemplate function with field validation, positive amount check, and uniqueness constraint validation for cost item type, using existing validation and database utilities | Restrictions: Must validate all required fields, check uniqueness before insert, use transactions for data integrity | Success: Function validates input correctly, prevents duplicate templates, returns appropriate error messages, handles edge cases_

### 2.3 模板更新 API Handler

- [x] 2.3.1 驗證模板更新 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/overhead-templates.js
  - Function: handleUpdateOverheadTemplate
  - 驗證模板更新邏輯已實現
  - 驗證包含驗證和唯一性檢查已實現
  - 確認路由配置（backend/src/router/costs.js 中的 PUT /api/v2/costs/overhead-templates/:cost_type_id 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援模板更新
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.3.1_
  - _Status: 已完成_

### 2.4 模板刪除 API Handler

- [ ] 2.4.1 實現模板刪除 API Handler
  - File: backend/src/handlers/costs/cost-templates-crud.js（新文件）或 overhead-templates.js
  - Function: handleDeleteCostTemplate
  - 實現模板刪除邏輯，包含存在性檢查
  - 確認路由配置（backend/src/router/costs.js 中的 DELETE /api/v2/costs/templates/:id 路由）
  - Purpose: 提供模板刪除功能，允許移除不需要的模板
  - _Leverage: backend/src/utils/response.js, backend/src/utils/db.js_
  - _Requirements: BR5.3.1_
  - _Prompt: Role: Backend Developer with expertise in delete operations | Task: Implement handleDeleteCostTemplate function with existence check, using existing database utilities | Restrictions: Must check template exists before deletion, handle foreign key constraints if any, return appropriate error messages | Success: Function deletes template correctly, handles not found cases, maintains data integrity_

### 2.5 自動生成預覽 API Handler

- [x] 2.5.1 驗證自動生成預覽 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/overhead-templates.js
  - Function: handlePreviewOverheadGeneration
  - 驗證預覽邏輯已實現
  - 驗證標記已存在的記錄已實現
  - 驗證返回將要生成的記錄列表已實現
  - 確認路由配置（backend/src/router/costs.js 中的 GET /api/v2/costs/overhead/preview/:year/:month 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援自動生成預覽
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.3.2_
  - _Status: 已完成_

### 2.6 自動生成 API Handler

- [x] 2.6.1 驗證自動生成 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/costs/overhead-templates.js
  - Function: handleGenerateOverheadCosts
  - 驗證自動生成邏輯已實現
  - 驗證支援覆蓋選擇已實現
  - 驗證使用事務確保數據一致性已實現
  - 確認路由配置（backend/src/router/costs.js 中的 POST /api/v2/costs/overhead/generate 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援自動生成月度記錄
  - _Leverage: backend/src/utils/response.js, backend/src/router/costs.js_
  - _Requirements: BR5.3.2_
  - _Status: 已完成_

---

## 3. 前端 API 調用層

### 3.1 模板管理 API 調用函數

- [x] 3.1.1 驗證前端 API 調用函數已實現 ✅ 已實現（部分功能）
  - File: src/api/costs.js
  - Functions: 需要確認是否有 getOverheadTemplate, updateOverheadTemplate, previewOverheadGeneration, generateOverheadCosts
  - 驗證獲取模板功能正確
  - 驗證更新模板功能正確
  - 驗證預覽生成功能正確
  - 驗證自動生成功能正確
  - 驗證使用統一的錯誤處理和回應格式處理
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/costs.js_
  - _Requirements: BR5.3.1, BR5.3.2_
  - _Status: 部分實現 - 需要確認是否有新增和刪除模板的 API 函數_

- [ ] 3.1.2 補完前端 API 調用函數（如果需要）
  - File: src/api/costs.js
  - 實現 getCostTemplates 函數（調用 GET /api/v2/costs/templates）
  - 實現 createCostTemplate 函數（調用 POST /api/v2/costs/templates）
  - 實現 deleteCostTemplate 函數（調用 DELETE /api/v2/costs/templates/:id）
  - Purpose: 封裝後端 API 調用，提供統一的錯誤處理和數據格式
  - _Leverage: src/api/base.js, src/utils/request.js_
  - _Requirements: BR5.3.1_
  - _Prompt: Role: Frontend Developer with expertise in API integration and error handling | Task: Implement API functions for cost templates CRUD operations, using existing API base utilities and request helpers | Restrictions: Must handle errors consistently, use proper HTTP methods, format request/response data correctly | Success: All API functions work correctly, error handling is consistent, request/response format matches backend expectations_

---

## 4. 前端組件實現

### 4.1 自動生成模板前端頁面

- [x] 4.1.1 驗證自動生成模板功能已整合到 CostItems.vue ✅ 已實現（部分功能）
  - File: src/views/costs/CostItems.vue
  - 驗證模板管理功能已整合
  - 驗證自動生成功能已整合
  - 驗證整合 OverheadTemplateModal 和 GenerateOverheadCostsModal 組件
  - Purpose: 確認模板功能已整合到成本管理頁面
  - _Leverage: src/views/costs/CostItems.vue, src/components/costs/OverheadTemplateModal.vue, src/components/costs/GenerateOverheadCostsModal.vue_
  - _Requirements: BR5.3.1, BR5.3.2_
  - _Status: 部分實現 - 功能已整合，但可能需要獨立的模板管理頁面_

- [ ] 4.1.2 實現獨立的自動生成模板前端頁面（如果需要）
  - File: src/views/costs/CostTemplates.vue
  - 整合 CostTemplateTable, CostTemplateForm, CostGeneratePreview 組件，實現頁面邏輯
  - Purpose: 提供自動生成模板功能的主頁面，整合所有子組件
  - _Leverage: src/components/costs/CostTemplateTable.vue, src/components/costs/CostTemplateForm.vue, src/components/costs/CostGeneratePreview.vue, src/api/costs.js_
  - _Requirements: BR5.3.1, BR5.3.2_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API and component composition | Task: Implement CostTemplates page component integrating table, form, and preview components, managing state and user interactions | Restrictions: Must use Composition API, handle loading and error states, maintain component communication properly | Success: Page integrates all components correctly, state management works, user interactions are smooth, error handling is proper_

### 4.2 模板列表組件

- [x] 4.2.1 驗證模板功能已整合到 CostTypesTable ✅ 已實現（部分功能）
  - File: src/components/costs/CostTypesTable.vue
  - 驗證模板操作按鈕已實現（「自動生成」按鈕）
  - Purpose: 確認模板功能已整合到成本項目類型表格
  - _Leverage: src/components/costs/CostTypesTable.vue_
  - _Requirements: BR5.3.1_
  - _Status: 部分實現 - 只有操作入口，沒有獨立的模板列表組件_

- [ ] 4.2.2 實現模板列表組件（如果需要）
  - File: src/components/costs/CostTemplateTable.vue
  - 顯示模板列表，處理編輯、刪除操作，使用 Ant Design Table
  - Purpose: 展示模板列表，提供編輯和刪除操作入口
  - _Leverage: Ant Design Vue Table component, src/api/costs.js_
  - _Requirements: BR5.3.1_
  - _Prompt: Role: Frontend Developer with expertise in Vue components and Ant Design | Task: Implement CostTemplateTable component to display template list with edit and delete actions, using Ant Design Table | Restrictions: Must use Ant Design components, handle table operations correctly, emit events for parent component | Success: Component displays templates correctly, edit and delete actions work, table is responsive and user-friendly_

### 4.3 模板表單組件

- [x] 4.3.1 驗證模板表單組件已實現 ✅ 已實現
  - File: src/components/costs/OverheadTemplateModal.vue
  - 驗證模板表單已實現（成本項目類型、固定金額）
  - 驗證表單驗證已實現（必填欄位驗證、金額必須為正數）
  - 驗證成本項目類型唯一性檢查已實現（前端提示）
  - Purpose: 確認模板表單組件已完整實現
  - _Leverage: Ant Design Vue Form component, src/components/costs/OverheadTemplateModal.vue_
  - _Requirements: BR5.3.1_
  - _Status: 已完成_

### 4.4 自動生成預覽組件

- [x] 4.4.1 驗證自動生成預覽組件已實現 ✅ 已實現
  - File: src/components/costs/GenerateOverheadCostsModal.vue
  - 驗證預覽列表顯示已實現
  - 驗證標記已存在的記錄已實現
  - 驗證覆蓋選擇已實現
  - Purpose: 確認自動生成預覽組件已完整實現
  - _Leverage: Ant Design Vue Modal and Table components, src/components/costs/GenerateOverheadCostsModal.vue_
  - _Requirements: BR5.3.2_
  - _Status: 已完成_

---

## 5. 路由配置

### 5.1 後端路由配置

- [x] 5.1.1 驗證後端路由配置已實現 ✅ 已實現（部分功能）
  - File: backend/src/router/costs.js
  - 驗證模板相關 API 路由已配置
  - 驗證自動生成相關 API 路由已配置
  - Purpose: 確認後端路由已正確配置
  - _Leverage: backend/src/router/costs.js_
  - _Requirements: BR5.3.1, BR5.3.2_
  - _Status: 部分實現 - 需要確認是否有新增和刪除模板的路由_

- [ ] 5.1.2 補完後端路由配置（如果需要）
  - File: backend/src/router/costs.js
  - 新增 CostTemplates 相關 API 路由（GET /api/v2/costs/templates, POST /api/v2/costs/templates, DELETE /api/v2/costs/templates/:id）
  - Purpose: 將新開發的 Handler 接入系統路由
  - _Leverage: backend/src/router/costs.js_
  - _Requirements: BR5.3.1_
  - _Prompt: Role: Backend Developer with expertise in routing and API design | Task: Add routing configuration for CostTemplates CRUD endpoints | Restrictions: Must follow existing routing patterns, ensure proper admin authentication, avoid route conflicts | Success: All endpoints properly routed with correct HTTP methods and authentication_

### 5.2 前端路由配置

- [ ] 5.2.1 新增前端路由配置（如果需要）
  - File: src/router/index.js
  - 新增 CostTemplates 頁面路由（如果需要獨立的模板管理頁面）
  - Purpose: 將模板管理頁面接入系統路由
  - _Leverage: src/router/index.js_
  - _Requirements: BR5.3.1, BR5.3.2_
  - _Prompt: Role: Frontend Developer with expertise in Vue Router | Task: Add routing configuration for CostTemplates page if independent page is needed | Restrictions: Must follow existing routing patterns, ensure proper route guards and permissions | Success: Route is properly configured with correct path and component_

---

## 6. 測試

### 6.1 E2E 測試

- [ ] 6.1.1 實現自動生成模板 E2E 測試
  - File: tests/e2e/costs/cost-templates.spec.ts
  - 測試模板管理功能（新增、編輯、刪除、列表）
  - 測試自動生成功能（預覽、生成、覆蓋選擇）
  - 測試完整用戶流程（設定模板 → 自動生成記錄）
  - Purpose: 確保功能完整性和用戶體驗質量
  - _Leverage: Playwright testing framework, tests/helpers/testUtils.ts_
  - _Requirements: All_
  - _Prompt: Role: QA Automation Engineer with expertise in E2E testing and Playwright | Task: Implement comprehensive E2E tests for cost templates management and auto-generation features, covering complete user workflows | Restrictions: Must test real user scenarios, ensure tests are maintainable, handle async operations correctly | Success: E2E tests cover all critical user journeys, tests run reliably, validate complete functionality from user perspective_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本實現 - 獲取、更新、預覽、生成）
- ✅ 路由配置（部分實現 - 缺少新增和刪除路由）
- ✅ 前端組件（基本實現 - 模板表單、生成預覽）
- ✅ 資料庫 Migration（已實現 - 使用 OverheadRecurringTemplates 表）

### 待完成功能
- ⚠️ 資料庫表結構確認（需要確認是否使用現有表或建立新表）
- ⚠️ 模板唯一性約束確認（需要確認是否已實現）
- ⚠️ 模板新增功能（完全未實現）
- ⚠️ 模板刪除功能（完全未實現）
- ⚠️ 模板列表查詢功能（只支援按成本項目類型查詢單個模板）
- ⚠️ 前端 API 調用函數補完（需要確認是否有新增和刪除的 API 函數）
- ⚠️ 獨立模板管理頁面（功能已整合到 CostItems.vue，可能需要獨立頁面）
- ❌ E2E 測試（完全未實現）

### 備註
- 現有系統已經實現了大部分功能，但使用的是 `OverheadRecurringTemplates` 表（支援複雜的循環邏輯），而需求是簡化的固定金額模板
- 需要確認：
  1. 是否使用現有的 `OverheadRecurringTemplates` 表（設定為 monthly 類型）來滿足簡化需求
  2. 還是需要建立新的 `CostTemplates` 表來實現簡化需求
- 現有功能缺少：
  - 模板新增功能（只有更新功能）
  - 模板刪除功能
  - 模板列表查詢功能（只支援按成本項目類型查詢）
- 自動生成功能已完整實現（預覽、生成、覆蓋選擇）

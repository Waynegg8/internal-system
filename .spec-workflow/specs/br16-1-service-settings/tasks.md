# Tasks Document: BR16.1: 服務設定

## 三方差異分析結果

### 已實現功能
- ✅ 服務列表展示基本功能
- ✅ 新增服務項目功能（表單欄位、驗證、自動生成服務代碼）
- ✅ 編輯服務項目功能（表單預填充、驗證、更新）
- ✅ 刪除服務項目功能（確認對話框，目前為軟刪除）
- ✅ 服務層級 SOP 選擇功能（下拉框、過濾 scope='service'、可選）
- ✅ 表單欄位符合需求（service_type, service_name, service_sop_id，不顯示服務代碼）

### 待實現/修正功能
- ❌ 服務列表表格顯示欄位（目前顯示 ID 和服務層級 SOP，需要移除）
- ❌ 後端刪除 API 改為硬刪除（目前為軟刪除 `UPDATE is_active = 0`）
- ❌ E2E 測試

---

- [ ] 1. 修改後端服務刪除 API 為硬刪除
  - File: backend/src/handlers/services.js
  - Function: handleServices (DELETE 方法)
  - 將軟刪除（UPDATE is_active = 0）改為硬刪除（DELETE FROM Services）
  - Purpose: 實現服務項目的硬刪除功能，符合需求規範
  - 移除 `UPDATE Services SET is_active = 0` 邏輯
  - 改為 `DELETE FROM Services WHERE service_id = ?`
  - 移除關聯資料檢查邏輯（不檢查是否有客戶使用此服務）
  - 保持快取清除邏輯（`deleteKVCacheByPrefix`）
  - 確保錯誤處理正確
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js_
  - _Requirements: BR16.1.4_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Modify the DELETE handler in services.js to perform hard delete (DELETE FROM Services WHERE service_id = ?) instead of soft delete (UPDATE is_active = 0). Remove any association checking logic. Ensure proper error handling and cache invalidation | Restrictions: Must use parameterized queries, must handle errors properly, must invalidate cache after deletion, must follow existing response format, must not check for associated data | Success: Service deletion performs hard delete correctly, no association checking, cache is invalidated, response format is correct, errors are handled properly_

- [ ] 2. 修改前端服務列表表格顯示欄位
  - File: src/components/settings/ServicesTable.vue
  - 移除 ID 欄位顯示
  - 移除服務層級 SOP 欄位顯示
  - Purpose: 簡化服務列表表格，只顯示必要欄位，符合需求規範
  - 保留：服務名稱、服務類型、操作（編輯、刪除）
  - 修改 `columns` 數組，移除 `service_id` 和 `service_sop` 欄位定義
  - 移除 `getSOPName` 函數的使用（如果不再需要）
  - 移除 `service_sop` 相關的 template slot（第13-18行）
  - 確保表格仍然正常顯示和操作
  - _Leverage: Ant Design Vue Table component_
  - _Requirements: BR16.1.1_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Modify ServicesTable.vue to remove ID and service_sop columns from the table display. Keep only service_name, service_type, and actions (edit, delete) columns. Remove related template slots and helper functions if no longer needed | Restrictions: Must maintain existing functionality for edit and delete actions, must follow Ant Design Vue table patterns, must preserve responsive design, must not break table functionality | Success: Table displays only required columns, edit and delete actions work correctly, table is responsive, no errors in console_

- [x] 3. 驗證服務表單欄位
  - File: src/components/settings/ServiceForm.vue
  - 確認表單欄位：服務類型（必填）、服務名稱（必填，最多 100 字符）、服務層級 SOP（可選）
  - 確認不包含描述欄位
  - 確認不顯示服務代碼
  - 確認表單驗證規則正確（必填欄位、長度限制）
  - Purpose: 確保表單符合需求規範
  - _Leverage: Ant Design Vue Form component_
  - _Requirements: BR16.1.2, BR16.1.3_
  - _Status: 已完成 - 表單欄位和驗證邏輯已正確實現（service_type, service_name, service_sop_id），不包含描述欄位，不顯示服務代碼_

- [x] 4. 驗證服務層級 SOP 選擇功能
  - File: src/components/settings/ServiceForm.vue
  - 確認 SOP 下拉框只顯示 scope = 'service' 的 SOP
  - 確認可以選擇「無」選項（設為 NULL）
  - 確認選擇的 SOP 在提交時正確保存
  - Purpose: 確保服務層級 SOP 選擇功能符合需求
  - _Leverage: Ant Design Vue Select component, useSettingsStore_
  - _Requirements: BR16.1.5_
  - _Status: 已完成 - SOP 選擇功能已正確實現，後端 API 已支援 scope = 'service' 過濾，可以選擇「無」選項_

- [ ] 5. 實現 E2E 測試
  - File: tests/e2e/settings/service-settings.spec.ts
  - 測試服務項目完整流程
  - Purpose: 確保所有功能正常運作，符合需求規範
  - 測試新增服務項目流程（包括成功和失敗情況）
  - 測試編輯服務項目流程（包括成功和失敗情況）
  - 測試刪除服務項目流程（硬刪除，包括確認和取消操作）
  - 測試服務列表顯示（驗證只顯示必要欄位：服務名稱、服務類型、操作）
  - 測試服務層級 SOP 選擇和綁定功能
  - 測試未登入用戶訪問服務設定頁面的權限控制（應要求登入）
  - 測試表單驗證（必填欄位、長度限制）
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR16.1.1, BR16.1.2, BR16.1.3, BR16.1.4, BR16.1.5_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive end-to-end tests for service management: add service, edit service, delete service (hard delete), verify table displays only required columns (service_name, service_type, actions), test service-level SOP selection, test form validation, test permission control for unauthenticated users. Use Playwright framework and test data utilities | Restrictions: Must test real user workflows, ensure tests are maintainable and reliable, test all validation rules and error handling, verify hard delete behavior | Success: All E2E tests pass, all workflows work correctly, error handling is verified, table displays only required columns, hard delete works correctly_

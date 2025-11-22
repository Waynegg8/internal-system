# Tasks Document: BR16.2: 任務模板設定

## 三方差異分析結果

### 已實現功能
- ✅ 任務模板列表展示（顯示模板名稱、服務名稱、客戶名稱、操作）
- ✅ 查看任務模板功能（只讀模式，顯示基本信息、服務層級 SOP、任務配置）
- ✅ 新增任務模板功能（表單、驗證、提交）
- ✅ 編輯任務模板功能（表單預填充、驗證、更新）
- ✅ 刪除任務模板功能（硬刪除，確認對話框）
- ✅ 後端 API 返回服務名稱和客戶名稱（使用 JOIN 查詢）
- ✅ 前端表格顯示服務名稱和客戶名稱（null 時顯示「通用」）
- ✅ 查看模式和編輯模式切換

### 待實現/修正功能
- ❌ 修正後端刪除 API 註釋（註釋說「軟刪除」，實際是硬刪除）
- ✅ 查看模式任務按階段分組顯示（已實現 `tasksByStage` computed 屬性）
- ✅ 服務層級 SOP 顯示功能（已實現 `serviceLevelSOP` computed 屬性和點擊跳轉）
- ❌ 模板套用策略邏輯（任務自動生成時的模板選擇邏輯）
- ❌ E2E 測試

---

- [ ] 1. 修正後端任務模板刪除 API 註釋
  - File: backend/src/handlers/task-templates/template-crud.js
  - Function: handleDeleteTaskTemplate
  - 確認硬刪除邏輯正確實現（DELETE FROM TaskTemplates）
  - Purpose: 確保註釋準確反映實際實現
  - 修正註釋（當前註釋為「軟刪除」，應改為「硬刪除」）
  - 確認已移除關聯資料檢查邏輯
  - 確認硬刪除邏輯正確（先刪除階段，再刪除模板）
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR16.2.5_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update comments in template-crud.js DELETE handler to correctly reflect hard delete implementation instead of incorrect "soft delete" comments. Verify hard delete logic is properly implemented (DELETE FROM TaskTemplateStages, then DELETE FROM TaskTemplates) | Restrictions: Must use parameterized queries, must handle errors properly, must follow existing response format | Success: Template deletion performs hard delete correctly, comments are accurate, no association checking, response format is correct_

- [x] 2. 驗證後端任務模板列表 API 實現
  - File: backend/src/handlers/task-templates/template-crud.js
  - Function: handleGetTaskTemplates
  - 驗證查詢語句已使用 JOIN 查詢關聯 Services 和 Clients 表
  - 驗證返回結果包含 service_name 和 client_name 欄位
  - 驗證 null 值處理正確（service_id 或 client_id 為 null 時）
  - Purpose: 確認後端 API 返回完整的模板資訊，包含服務名稱和客戶名稱
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR16.2.1_
  - _Status: 已完成 - 後端 API 已正確實現 JOIN 查詢，返回 service_name 和 client_name_

- [x] 3. 驗證前端任務模板列表表格顯示
  - File: src/components/settings/TemplatesTable.vue
  - 驗證「服務名稱」欄位顯示（使用後端返回的 service_name）
  - 驗證「客戶名稱」欄位顯示（使用後端返回的 client_name，如為 null 則顯示「通用」）
  - 驗證模板名稱、操作欄位正常顯示
  - Purpose: 確認表格中正確顯示服務名稱和客戶名稱
  - _Leverage: Ant Design Vue Table component_
  - _Requirements: BR16.2.1_
  - _Status: 已完成 - 表格已正確實現顯示服務名稱和客戶名稱，null 時顯示「通用」_

- [x] 4. 驗證查看模式和編輯模式切換
  - File: src/views/settings/SettingsTemplates.vue
  - 驗證查看模式（只讀）功能正常
  - 驗證編輯模式功能正常
  - 驗證查看模式和編輯模式切換流暢
  - Purpose: 確保查看模式和編輯模式符合需求
  - _Leverage: 現有 SettingsTemplates.vue 組件_
  - _Requirements: BR16.2.2, BR16.2.3, BR16.2.4_
  - _Status: 已完成 - 查看模式和編輯模式已正確實現，可以流暢切換_

- [x] 5. 驗證任務模板新增功能
  - File: src/components/settings/TaskTemplateFormNew.vue, src/views/settings/SettingsTemplates.vue
  - 驗證新增模板表單的完整驗證邏輯
  - 驗證模板名稱必填驗證
  - 驗證表單提交和成功提示
  - Purpose: 確認新增功能完整可用
  - _Leverage: TaskConfiguration 組件, useSettingsStore_
  - _Requirements: BR16.2.3_
  - _Status: 已完成 - 新增功能已正確實現，包含表單驗證和提交邏輯_

- [x] 6. 驗證任務模板編輯功能
  - File: src/views/settings/SettingsTemplates.vue, src/components/settings/TaskTemplateFormNew.vue
  - 驗證編輯模板時預填充現有資料
  - 驗證編輯後的數據驗證和提交
  - 驗證編輯成功後的刷新和提示
  - 驗證編輯模式與新增模式區分
  - Purpose: 確認編輯功能完整可用
  - _Leverage: useSettingsStore, TaskConfiguration 組件_
  - _Requirements: BR16.2.4_
  - _Status: 已完成 - 編輯功能已正確實現，表單預填充和更新邏輯正確_

- [x] 7. 驗證任務模板刪除確認功能
  - File: src/views/settings/SettingsTemplates.vue
  - 驗證刪除按鈕點擊後的確認對話框
  - 驗證確認刪除後的真正刪除邏輯（硬刪除）
  - 驗證刪除成功後的列表刷新和提示
  - 驗證不檢查關聯資料（硬刪除）
  - Purpose: 確認刪除功能完整可用
  - _Leverage: Ant Design Vue Modal, useSettingsStore_
  - _Requirements: BR16.2.5_
  - _Status: 已完成 - 刪除功能已正確實現，包含確認對話框和硬刪除邏輯_

- [x] 8. 驗證查看模式任務按階段分組顯示
  - File: src/views/settings/SettingsTemplates.vue
  - 驗證任務按階段順序分組顯示邏輯
  - Purpose: 確認任務模板查看體驗，按階段清晰展示任務配置
  - 驗證 `tasksByStage` computed 屬性正確實現（第277-296行）
  - 驗證按 `stage_order` 分組的邏輯正確
  - 驗證每個階段的任務列表展示正確
  - 驗證階段統計資訊（階段數量、任務數量）顯示正確
  - 驗證查看模式為只讀狀態
  - 驗證階段按 `stage_order` 排序顯示
  - _Leverage: 現有任務配置顯示邏輯, computed 屬性_
  - _Requirements: BR16.2.2_
  - _Status: 已完成 - `tasksByStage` computed 屬性已正確實現，任務按階段分組顯示，階段按 `stage_order` 排序_

- [x] 9. 驗證服務層級 SOP 顯示功能
  - File: src/views/settings/SettingsTemplates.vue
  - 驗證服務層級 SOP 的獲取邏輯
  - Purpose: 確認模板查看中正確顯示相關的服務層級 SOP
  - 驗證服務層級 SOP 顯示邏輯（第78-86行）
  - 驗證邏輯正確（從服務的 `service_sop_id` 獲取 SOP，第367-376行）
  - 驗證 SOP 點擊跳轉到知識庫功能（`handleSOPClick` 函數）
  - 驗證 SOP 顯示邏輯正確處理 null 值
  - 驗證從 `serviceSOPs` store 獲取 SOP
  - _Leverage: serviceSOPs store, router.push, Services 表的 service_sop_id_
  - _Requirements: BR16.2.2_
  - _Status: 已完成 - 服務層級 SOP 顯示功能已正確實現，包含點擊跳轉功能_

- [ ] 10. 實現模板套用策略邏輯
  - File: backend/src/handlers/task-generator/generator-new.js 或相關文件
  - 實現客戶專屬模板優先選擇邏輯
  - Purpose: 實現任務自動生成時的模板套用策略
  - 實現通用模板備用選擇邏輯
  - 實現任務生成時套用模板但不回寫的邏輯
  - 實現模板資料的複製和修改功能
  - 檢查當前任務自動生成邏輯是否已實現模板套用策略
  - 如果未實現，需要實現：
    - 優先查詢客戶專屬模板（`client_id = ?`）
    - 如果沒有客戶專屬模板，查詢通用模板（`client_id IS NULL`）
    - 套用模板時複製模板數據，但不修改原始模板
  - _Leverage: 現有任務生成邏輯, TaskTemplates 表_
  - _Requirements: BR16.2.6_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Implement template application strategy logic in task auto-generation. Prioritize client-specific templates (client_id = ?) over general templates (client_id IS NULL) when auto-generating tasks. Ensure template data is copied but not modified back to template. Query TaskTemplates table with proper JOINs to get template and stages | Restrictions: Must query TaskTemplates table with proper JOINs, must handle null client_id for general templates, must not modify original template data, must copy template stages correctly | Success: Tasks are auto-generated using correct template priority (client-specific first, then general), template data is properly copied and modifiable, template stages are correctly applied_

- [ ] 11. 實現 E2E 測試
  - File: tests/e2e/settings/template-settings.spec.ts
  - 測試任務模板完整流程
  - Purpose: 確保所有功能正常運作，符合需求規範
  - 測試新增任務模板的完整流程（包括成功和失敗情況）
  - 測試查看任務模板的完整流程（驗證只讀模式、階段分組顯示、服務層級 SOP 顯示）
  - 測試編輯任務模板的完整流程（包括成功和失敗情況）
  - 測試刪除任務模板的完整流程（硬刪除，包括確認和取消操作）
  - 測試服務列表顯示（驗證顯示服務名稱和客戶名稱）
  - 測試模板套用策略（驗證客戶專屬模板優先，通用模板備用）
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR16.2.1, BR16.2.2, BR16.2.3, BR16.2.4, BR16.2.5, BR16.2.6_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive end-to-end tests for task template management: add template, view template (verify read-only mode, stage grouping, service-level SOP display), edit template, delete template (hard delete), verify table displays service_name and client_name, test template application strategy (client-specific priority, general template fallback). Use Playwright framework and test data utilities | Restrictions: Must test real user workflows, ensure tests are maintainable and reliable, test all validation rules and error handling, verify hard delete behavior, verify template application strategy | Success: All E2E tests pass, all workflows work correctly, error handling is verified, table displays correctly, template application strategy works as expected_

# Tasks Document: BR16.5: 自動化規則

## 三方差異分析結果

### 已實現功能
- ✅ 自動化組件列表展示（後端 `handleGetAutomationComponents`，前端 `SettingsAutomation.vue` 和 `AutomationOverviewTable.vue`）
- ✅ 查看組件任務配置功能（後端 `handleGetComponentTasks`，前端 `ComponentTasksModal.vue`）
- ✅ 預覽下月任務功能（後端 `handleTaskGenerationPreview`，前端 `PreviewTasksModal.vue`）
- ✅ 搜尋和篩選功能（前端 `filteredComponents` computed 屬性，按客戶名稱搜尋）

### 待實現/修正功能
- ❌ 修正權限控制（需求要求「所有用戶可訪問」，但後端 API 僅管理員可訪問）
- ❌ E2E 測試

---

- [x] 1. 驗證自動化組件列表展示功能
  - File: backend/src/handlers/automation/index.js, src/views/settings/SettingsAutomation.vue, src/components/settings/AutomationOverviewTable.vue
  - 驗證後端 API 返回所有已設定自動生成任務的組件
  - 驗證前端表格正確顯示組件基本資訊（組件名稱、客戶名稱、服務名稱等）
  - 驗證操作按鈕顯示正確（查看任務配置等）
  - 驗證載入狀態指示器顯示正確
  - Purpose: 確認自動化組件列表展示功能正常運作
  - _Leverage: Ant Design Vue Table component_
  - _Requirements: BR16.5.1_
  - _Status: 已完成 - 自動化組件列表展示功能已正確實現_

- [x] 2. 驗證查看組件任務配置功能
  - File: backend/src/handlers/automation/index.js, src/components/settings/ComponentTasksModal.vue
  - 驗證後端 API 返回組件的任務配置詳情
  - 驗證前端彈窗正確顯示任務的詳細資訊（任務名稱、執行頻率等）
  - 驗證任務配置載入失敗時顯示錯誤訊息
  - Purpose: 確認查看組件任務配置功能正常運作
  - _Leverage: Ant Design Vue Modal component_
  - _Requirements: BR16.5.2_
  - _Status: 已完成 - 查看組件任務配置功能已正確實現_

- [x] 3. 驗證預覽下月任務功能
  - File: backend/src/handlers/task-generator/index.js, src/components/settings/PreviewTasksModal.vue
  - 驗證後端 API 返回下月將生成的任務列表
  - 驗證前端彈窗正確顯示任務的詳細資訊（任務名稱、預定執行日期等）
  - 驗證基於當前日期計算下月日期
  - 驗證預覽任務載入失敗時顯示錯誤訊息
  - Purpose: 確認預覽下月任務功能正常運作
  - _Leverage: Ant Design Vue Modal component, dayjs_
  - _Requirements: BR16.5.3_
  - _Status: 已完成 - 預覽下月任務功能已正確實現_

- [x] 4. 驗證搜尋和篩選功能
  - File: src/views/settings/SettingsAutomation.vue
  - 驗證搜尋功能支援按客戶名稱搜尋組件
  - 驗證搜尋結果即時顯示
  - 驗證搜尋無結果時顯示「無結果」提示訊息
  - 驗證清空搜尋條件時顯示完整的組件列表
  - Purpose: 確認搜尋和篩選功能正常運作
  - _Leverage: computed 屬性, Ant Design Vue Input component_
  - _Requirements: BR16.5.4_
  - _Status: 已完成 - 搜尋和篩選功能已正確實現_

- [ ] 5. 修正權限控制
  - File: backend/src/handlers/automation/index.js
  - 修正後端 API 權限檢查，允許所有已登入用戶訪問（而非僅管理員）
  - Purpose: 符合需求規範（所有用戶可訪問自動化規則頁面）
  - 當前實現：後端 API 檢查 `user.is_admin`，僅管理員可訪問（第96-98行）
  - 需要改為：檢查用戶是否已登入（`user` 存在），允許所有已登入用戶訪問
  - 移除 `handleAutomation` 函數中的管理員權限檢查
  - 保留身份驗證檢查（確保用戶已登入）
  - 注意：`handleGetAutomationComponents` 和 `handleGetComponentTasks` 不需要額外的權限檢查，因為它們已經在 `handleAutomation` 中處理
  - _Leverage: backend/src/middleware/auth.js (withAuth)_
  - _Requirements: BR16.5.1, BR16.5.2, BR16.5.3, BR16.5.4_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and authentication | Task: Modify handleAutomation function in automation/index.js to allow all authenticated users to access automation rules pages, not just admins. Remove the admin-only check (user.is_admin), but keep the authentication check (user exists). Ensure all users can access GET /api/v2/settings/automation/components and GET /api/v2/settings/automation/components/:id/tasks | Restrictions: Must maintain authentication check, must follow existing response format, must not break existing functionality | Success: All authenticated users can access automation rules pages, authentication is still enforced, response format is correct_

- [ ] 6. 實現 E2E 測試
  - File: tests/e2e/settings/automation-rules.spec.ts
  - 測試自動化規則完整流程
  - Purpose: 確保所有功能正常運作，符合需求規範
  - 測試用戶查看自動化組件列表的完整流程（登入 → 打開自動化規則頁面 → 查看組件列表）
  - 測試用戶查看任務配置的完整流程（從組件列表 → 點擊查看任務配置 → 查看任務配置詳情）
  - 測試用戶預覽下月任務的完整流程（點擊預覽下月任務按鈕 → 查看預覽結果）
  - 測試搜尋和篩選功能（輸入搜尋關鍵字 → 驗證搜尋結果 → 清空搜尋條件 → 驗證完整列表顯示）
  - 測試權限控制（驗證所有已登入用戶可訪問，未登入用戶無法訪問）
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR16.5.1, BR16.5.2, BR16.5.3, BR16.5.4_
  - _Prompt: Role: QA Automation Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive end-to-end tests for automation rules: view component list, view task configuration, preview next month tasks, search and filter, permission control. Use Playwright framework and test data utilities | Restrictions: Must test real user workflows, ensure tests are maintainable and reliable, test all validation rules and error handling, verify permission control | Success: All E2E tests pass, all workflows work correctly, search and filter work, permission control works as expected_

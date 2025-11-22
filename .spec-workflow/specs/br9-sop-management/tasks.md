# Tasks Document: BR9: SOP 管理

## 三方差異分析結果

### 已實現功能

1. **後端 API 客戶專屬 SOP 過濾** ✅ 已實現
   - `handleGetSOPList` - 已實現正確的過濾邏輯
   - 當提供 `client_id` 參數時，正確過濾 SOP（顯示通用 SOP 和該客戶專屬 SOP）
   - 過濾邏輯：`client_id IS NULL OR client_id = ?`

2. **後端 API 版本號更新邏輯** ✅ 已實現
   - `handleUpdateSOP` - 已實現正確的版本號更新邏輯
   - 任何欄位更新時，版本號都會自動 +1
   - SQL 語句：`version = version + 1`

3. **SOP 基本 CRUD 功能** ✅ 已實現
   - `handleCreateSOP` - 創建 SOP API 已實現
   - `handleUpdateSOP` - 更新 SOP API 已實現
   - `handleGetSOPList` - 列表查詢 API 已實現
   - `handleGetSOPDetail` - 詳情查詢 API 已實現

4. **前端基本組件** ✅ 已實現
   - `KnowledgeSOP.vue` - SOP 列表頁面已實現
   - `SOPEditDrawer.vue` - SOP 編輯抽屜組件已實現
   - `ManageSOPModal.vue` - 任務中選擇 SOP 的彈窗已實現
   - `TaskSOPList.vue` - 任務中顯示 SOP 列表組件已實現

### 未實現或部分實現功能

1. **ManageSOPModal 客戶過濾** ⚠️ 需要補完
   - 需求：新增 `clientId` prop，過濾邏輯只顯示通用 SOP 和該任務客戶的專屬 SOP
   - 現狀：需要確認是否已實現 clientId prop 和過濾邏輯

2. **TaskSOPList 客戶 ID 傳遞** ⚠️ 需要補完
   - 需求：新增 `clientId` prop 並傳給 `ManageSOPModal`
   - 現狀：需要確認是否已實現

3. **服務層級 SOP 自動勾選** ❌ 完全未實現
   - 需求：在 `TasksNew` 組件的 `handleServiceChange` 中實現自動勾選邏輯
   - 現狀：需要確認是否已實現

4. **任務層級 SOP 自動勾選** ❌ 完全未實現
   - 需求：在 `TasksNew` 組件的 `addTask` 中實現自動勾選邏輯
   - 現狀：需要確認是否已實現

5. **任務詳情頁客戶 ID 傳遞** ⚠️ 需要補完
   - 需求：在 `TaskDetail.vue` 中傳入 clientId 給 TaskSOPList
   - 現狀：需要確認是否已實現

6. **SOP 詳情頁直接編輯** ❌ 完全未實現
   - 需求：創建 SOP 詳情頁組件，支援直接編輯（參考 BR10 FAQ 詳情）
   - 現狀：需要確認是否已實現

7. **SOP 編輯表單驗證** ⚠️ 需要補完
   - 需求：添加前端表單驗證（標題、層級、服務類型、內容為必填）
   - 現狀：需要確認是否已實現完整驗證

8. **SOP 刪除功能** ⚠️ 需要補完
   - 需求：實現 SOP 刪除功能（確認對話框、軟刪除）
   - 現狀：需要確認後端 API 和前端組件是否已實現

9. **E2E 測試** ❌ 完全未實現

---

## 1. 前端組件實現

### 1.1 ManageSOPModal 客戶過濾

- [ ] 1.1.1 修改 ManageSOPModal 組件，新增 clientId prop 和過濾邏輯
  - File: src/components/tasks/ManageSOPModal.vue
  - 新增 `clientId` prop（String/Number，可選）
  - 修改 `filteredSOPs` computed，過濾邏輯：只顯示通用 SOP（client_id 為 null）和該任務客戶的專屬 SOP（client_id = clientId）
  - 確保層級過濾邏輯正確（服務層級和任務層級分開顯示）
  - _Leverage: src/components/tasks/ManageSOPModal.vue（現有組件）_
  - _Requirements: BR9.5_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API | Task: Modify ManageSOPModal component to add clientId prop and implement filtering logic that only shows generic SOPs (client_id is null) and client-specific SOPs (client_id matches clientId). Ensure scope filtering (service/task) still works correctly | Restrictions: Must maintain backward compatibility, must not break existing functionality, must follow Vue 3 Composition API patterns | Success: Component accepts clientId prop, filtering logic works correctly, only shows appropriate SOPs based on client and scope_

### 1.2 TaskSOPList 客戶 ID 傳遞

- [ ] 1.2.1 修改 TaskSOPList 組件，新增 clientId prop 並傳給 ManageSOPModal
  - File: src/components/tasks/TaskSOPList.vue
  - 新增 `clientId` prop（String/Number，可選）
  - 將 `clientId` prop 傳給 `ManageSOPModal` 組件
  - _Leverage: src/components/tasks/TaskSOPList.vue（現有組件）_
  - _Requirements: BR9.5_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API | Task: Modify TaskSOPList component to add clientId prop and pass it to ManageSOPModal component | Restrictions: Must maintain backward compatibility, must follow Vue 3 prop patterns | Success: Component accepts clientId prop and passes it correctly to ManageSOPModal_

### 1.3 服務層級 SOP 自動勾選

- [ ] 1.3.1 修改 TasksNew 組件，實現服務層級 SOP 自動勾選
  - File: src/views/tasks/TasksNew.vue
  - 修改 `handleServiceChange` 函數
  - 在載入服務層級 SOP 後，自動勾選符合條件的 SOP
  - 條件：`scope = 'service'` 且 `category = 服務類型` 且（`client_id = 任務客戶` 或 `client_id IS NULL`）
  - 將符合條件的 SOP 自動添加到 `serviceLevelSOPs`，避免重複
  - 確保用戶可以取消勾選自動勾選的 SOP
  - _Leverage: src/views/tasks/TasksNew.vue（現有組件）_
  - _Requirements: BR9.3_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API | Task: Modify handleServiceChange function in TasksNew component to automatically select service-level SOPs that match the conditions: scope = 'service', category matches service type, and (client_id matches task client or client_id is null). Add matched SOPs to serviceLevelSOPs array, avoiding duplicates. Ensure users can uncheck auto-selected SOPs | Restrictions: Must not break existing functionality, must handle edge cases (no matching SOPs, client not selected), must maintain user ability to manually select/unselect SOPs | Success: Service-level SOPs are automatically selected when service is chosen, filtering logic works correctly, users can uncheck auto-selected SOPs_

### 1.4 任務層級 SOP 自動勾選

- [ ] 1.4.1 修改 TasksNew 組件，實現任務層級 SOP 自動勾選
  - File: src/views/tasks/TasksNew.vue
  - 修改 `addTask` 函數
  - 在新增任務時，自動勾選符合條件的任務層級 SOP
  - 條件：`scope = 'task'` 且 `category = 服務類型` 且（`client_id = 任務客戶` 或 `client_id IS NULL`）
  - 將符合條件的 SOP ID 自動添加到任務的 `sopIds` 陣列
  - 確保載入任務層級 SOP（如果還沒載入）
  - 確保用戶可以取消勾選自動勾選的 SOP
  - _Leverage: src/views/tasks/TasksNew.vue（現有組件）_
  - _Requirements: BR9.4_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API | Task: Modify addTask function in TasksNew component to automatically select task-level SOPs that match the conditions: scope = 'task', category matches service type, and (client_id matches task client or client_id is null). Add matched SOP IDs to task's sopIds array. Ensure task-level SOPs are loaded if not already loaded. Ensure users can uncheck auto-selected SOPs | Restrictions: Must not break existing functionality, must handle edge cases (no matching SOPs, client not selected, service not selected), must maintain user ability to manually select/unselect SOPs | Success: Task-level SOPs are automatically selected when task is added, filtering logic works correctly, users can uncheck auto-selected SOPs_

### 1.5 任務詳情頁客戶 ID 傳遞

- [ ] 1.5.1 更新任務詳情頁，確保傳入 clientId 給 TaskSOPList
  - File: src/views/tasks/TaskDetail.vue
  - 檢查 TaskSOPList 組件的使用
  - 確保從任務數據中獲取客戶 ID 並傳給 TaskSOPList
  - 如果任務沒有客戶 ID，傳入 null
  - _Leverage: src/views/tasks/TaskDetail.vue（現有組件）_
  - _Requirements: BR9.5_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API | Task: Update TaskDetail component to pass clientId prop to TaskSOPList component. Get client ID from task data, pass null if task has no client ID | Restrictions: Must handle cases where task has no client ID, must maintain backward compatibility | Success: TaskSOPList receives clientId prop correctly, handles null client ID case_

### 1.6 SOP 詳情頁直接編輯

- [ ] 1.6.1 實現 SOP 詳情頁直接編輯功能（參考 BR10 FAQ 編輯）
  - File: src/views/knowledge/KnowledgeSOPDetail.vue 或 src/components/knowledge/SOPDetail.vue
  - 創建 SOP 詳情頁組件，顯示 SOP 完整資訊
  - 在詳情頁提供編輯按鈕
  - 點擊編輯按鈕時打開 SOPEditDrawer 進行編輯
  - _Leverage: src/components/knowledge/SOPEditDrawer.vue（現有組件），參考 BR10 FAQ 詳情頁實現_
  - _Requirements: BR9.1.1_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API | Task: Create SOP detail page component with direct editing functionality, similar to BR10 FAQ detail page. Display SOP information, show edit button, open SOPEditDrawer when edit button is clicked | Restrictions: Must follow existing component patterns, must reuse SOPEditDrawer component | Success: SOP detail page displays correctly, edit button works, editing works correctly_

### 1.7 SOP 編輯表單驗證

- [ ] 1.7.1 實現 SOP 編輯表單驗證
  - File: src/components/knowledge/SOPEditDrawer.vue
  - 添加前端表單驗證：標題、層級、服務類型、內容為必填
  - 驗證標題不能為空或只包含空白字符
  - 驗證內容不能為空或只包含空白字符/空 HTML 標籤
  - 添加即時驗證反饋，顯示錯誤訊息
  - 確保後端也進行相同的驗證
  - _Leverage: src/components/knowledge/SOPEditDrawer.vue（現有組件），參考 BR10 FAQ 編輯表單驗證_
  - _Requirements: BR9.1.2_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API and form validation | Task: Add form validation to SOPEditDrawer component. Validate required fields (title, scope, category, content), check for empty or whitespace-only values, validate content is not empty HTML. Add real-time validation feedback. Ensure backend also validates | Restrictions: Must validate all required fields, must provide clear error messages, must prevent submission of invalid data | Success: Form validation works correctly, error messages are clear, invalid data cannot be submitted_

### 1.8 SOP 刪除功能

- [ ] 1.8.1 實現 SOP 刪除功能
  - File: src/views/knowledge/KnowledgeSOP.vue 或 SOP 詳情頁組件
  - 在 SOP 列表或詳情頁添加刪除按鈕
  - 點擊刪除按鈕時顯示確認對話框，顯示 SOP 標題
  - 確認後調用刪除 API，執行軟刪除
  - 刪除成功後顯示成功訊息並刷新列表
  - _Leverage: src/api/knowledge.js（現有 API），參考 BR10 FAQ 刪除功能實現_
  - _Requirements: BR9.1.4, BR9.1.5_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 Composition API | Task: Implement SOP delete functionality. Add delete button, show confirmation dialog with SOP title, call delete API for soft delete, show success message and refresh list after deletion. Reference BR10 FAQ delete implementation | Restrictions: Must show confirmation dialog, must handle errors gracefully | Success: Delete functionality works correctly, confirmation dialog shows, soft delete executes properly, list refreshes after deletion_

---

## 2. 後端 API 實現

### 2.1 後端 API 客戶專屬 SOP 過濾

- [x] 2.1.1 驗證後端 API 正確過濾客戶專屬 SOP ✅ 已實現
  - File: backend/src/handlers/knowledge/sop.js
  - 檢查 `handleGetSOPList` 函數已經實現正確的過濾邏輯
  - 驗證當提供 `client_id` 參數時，正確過濾 SOP（顯示通用 SOP 和該客戶專屬 SOP）
  - 驗證過濾邏輯正確：`client_id IS NULL OR client_id = ?`
  - _Leverage: backend/src/handlers/knowledge/sop.js（現有 Handler）_
  - _Requirements: BR9.5_
  - _Status: 已完成_

### 2.2 後端 API 版本號更新邏輯

- [x] 2.2.1 驗證後端 API 版本號更新邏輯正確 ✅ 已實現
  - File: backend/src/handlers/knowledge/sop.js
  - 檢查 `handleUpdateSOP` 函數已經實現正確的版本號更新邏輯
  - 驗證任何欄位更新時，版本號都會自動 +1
  - 驗證 SQL 語句：`version = version + 1`
  - _Leverage: backend/src/handlers/knowledge/sop.js（現有 Handler）_
  - _Requirements: BR9.1_
  - _Status: 已完成_

### 2.3 後端 API 刪除功能

- [ ] 2.3.1 驗證後端 API 刪除功能已實現
  - File: backend/src/handlers/knowledge/sop.js
  - 檢查 `handleDeleteSOP` 函數是否已實現
  - 驗證軟刪除邏輯（設置 `is_deleted = 1`）
  - 驗證更新 `updated_at` 時間戳
  - _Leverage: backend/src/handlers/knowledge/sop.js（現有 Handler）_
  - _Requirements: BR9.1.4_
  - _Status: 需要確認_

---

## 3. 測試

### 3.1 E2E 測試：SOP 自動勾選功能

- [ ] 3.1.1 創建 E2E 測試：SOP 自動勾選功能
  - File: tests/e2e/tasks/task-sop-auto-select.spec.ts
  - 測試服務層級 SOP 自動勾選：選擇服務後，符合條件的 SOP 自動勾選
  - 測試任務層級 SOP 自動勾選：新增任務後，符合條件的 SOP 自動勾選
  - 測試取消勾選：用戶可以取消勾選自動勾選的 SOP
  - 測試客戶專屬 SOP 過濾：只顯示通用 SOP 和該客戶的專屬 SOP
  - _Leverage: tests/e2e/tasks/（現有測試結構）_
  - _Requirements: BR9.3, BR9.4, BR9.5_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create E2E tests for SOP auto-selection functionality: test service-level SOP auto-selection when service is selected, test task-level SOP auto-selection when task is added, test unchecking auto-selected SOPs, test client-specific SOP filtering. Use Playwright framework | Restrictions: Must test all scenarios, must use proper test data, must clean up after tests | Success: All E2E tests pass, cover all auto-selection scenarios, verify filtering logic works correctly_

### 3.2 E2E 測試：SOP 可見性過濾

- [ ] 3.2.1 創建 E2E 測試：SOP 可見性過濾
  - File: tests/e2e/knowledge/sop-visibility.spec.ts
  - 測試列表頁顯示：顯示所有 SOP（通用 + 所有客戶專屬）
  - 測試任務中選擇 SOP：只顯示通用 SOP 和該任務客戶的專屬 SOP
  - 測試層級區分：服務層級 SOP 不出現在任務層級 SOP 選項中
  - _Leverage: tests/e2e/knowledge/（現有測試結構）_
  - _Requirements: BR9.5, BR9.2_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create E2E tests for SOP visibility filtering: test list page shows all SOPs, test task SOP selection shows only generic and task client's SOPs, test scope separation (service-level SOPs don't appear in task-level options). Use Playwright framework | Restrictions: Must test all visibility scenarios, must use proper test data, must clean up after tests | Success: All E2E tests pass, verify visibility filtering works correctly, verify scope separation_

### 3.3 E2E 測試：版本號更新功能

- [ ] 3.3.1 驗證版本號更新功能
  - File: tests/e2e/knowledge/sop-version.spec.ts
  - 測試建立 SOP：版本號為 1
  - 測試更新 SOP：任何欄位更新時版本號 +1
  - 測試多次更新：版本號正確遞增
  - _Leverage: tests/e2e/knowledge/（現有測試結構）_
  - _Requirements: BR9.1_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create E2E tests for SOP version management: test creating SOP has version 1, test updating SOP increments version by 1 for any field update, test multiple updates increment version correctly. Use Playwright framework | Restrictions: Must test all version scenarios, must use proper test data, must clean up after tests | Success: All E2E tests pass, verify version number increments correctly for any update_

### 3.4 E2E 測試：SOP 編輯和刪除功能

- [ ] 3.4.1 創建 E2E 測試：SOP 編輯和刪除功能
  - File: tests/e2e/knowledge/sop-edit-delete.spec.ts
  - 測試 SOP 編輯表單：預填現有資訊，修改欄位，提交更新
  - 測試編輯驗證：必填欄位驗證，錯誤訊息顯示
  - 測試 SOP 刪除：確認對話框，軟刪除執行
  - _Leverage: tests/e2e/knowledge/（現有測試結構），參考 BR10 FAQ 編輯測試_
  - _Requirements: BR9.1.1, BR9.1.2, BR9.1.3, BR9.1.4, BR9.1.5_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create E2E tests for SOP edit and delete functionality: test edit form pre-fills data, test form validation, test delete confirmation and execution. Reference BR10 FAQ edit tests. Use Playwright framework | Restrictions: Must test all scenarios, must use proper test data, must clean up after tests | Success: All E2E tests pass, verify edit and delete functionality works correctly_

---

## 總結

### 已完成功能
- ✅ 後端 API 客戶專屬 SOP 過濾（完整實現 - 正確過濾通用 SOP 和客戶專屬 SOP）
- ✅ 後端 API 版本號更新邏輯（完整實現 - 任何欄位更新時版本號自動 +1）
- ✅ SOP 基本 CRUD 功能（完整實現 - 創建、更新、列表查詢、詳情查詢）
- ✅ 前端基本組件（完整實現 - 列表頁、編輯抽屜、選擇彈窗、列表組件）

### 待完成功能
- ⚠️ ManageSOPModal 客戶過濾（需要確認並補完 clientId prop 和過濾邏輯）
- ⚠️ TaskSOPList 客戶 ID 傳遞（需要確認並補完 clientId prop 傳遞）
- ❌ 服務層級 SOP 自動勾選（完全未實現 - 需要在 TasksNew 組件中實現）
- ❌ 任務層級 SOP 自動勾選（完全未實現 - 需要在 TasksNew 組件中實現）
- ⚠️ 任務詳情頁客戶 ID 傳遞（需要確認並補完）
- ❌ SOP 詳情頁直接編輯（完全未實現 - 需要創建詳情頁組件）
- ⚠️ SOP 編輯表單驗證（需要確認並補完完整驗證邏輯）
- ⚠️ SOP 刪除功能（需要確認後端 API 和前端組件是否已實現）
- ❌ E2E 測試（完全未實現）

### 備註
- 大部分核心功能已基本實現，包括：
  - 後端 API CRUD 操作（創建、更新、列表查詢、詳情查詢）
  - 後端 API 客戶專屬 SOP 過濾邏輯
  - 後端 API 版本號更新邏輯
  - 前端基本組件（列表頁、編輯抽屜、選擇彈窗、列表組件）
- 需要補完的功能：
  - 前端客戶過濾：需要在 ManageSOPModal 和 TaskSOPList 中實現 clientId prop 和過濾邏輯
  - 自動勾選邏輯：需要在 TasksNew 組件中實現服務層級和任務層級 SOP 的自動勾選邏輯
  - SOP 詳情頁：需要創建 SOP 詳情頁組件，支援直接編輯
  - SOP 編輯表單驗證：需要確認並補完完整的表單驗證邏輯
  - SOP 刪除功能：需要確認後端 API 和前端組件是否已實現，如果未實現則需要補完
  - E2E 測試：需要實現完整的 E2E 測試套件

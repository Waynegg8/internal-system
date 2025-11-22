# Tasks Document: BR2.3: 任務創建

## 1.0 後端 API 基礎設施模組 (Backend API Infrastructure Module)

### 1.1 任務配置 CRUD API 實現
- [x] 1.1.1 實現任務配置創建 API Handler ✅ 已實現
  - File: backend/src/handlers/task-configs/task-config-crud.js
  - Function: handleCreateTaskConfig
  - Purpose: 實現任務配置創建邏輯，包括驗證和 SOP 關聯保存
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR2.3.1_
  - _Prompt: Role: Backend Developer with expertise in task configuration and SOP associations | Task: Implement handleCreateTaskConfig function in task-config-crud.js that creates task configuration for a service, validates all required fields (task_name, generation_time_rule, due_date_rule, estimated_hours, assignee, etc.), saves task configuration to ClientServiceTaskConfigs table, and associates SOPs to TaskConfigSOPs table. The function should support both service-level and task-level SOP associations | Restrictions: Must validate all required fields, must check task_name exists in ServiceItems, must validate generation_time_rule and due_date_rule formats, must save SOP associations correctly, must follow existing response format patterns | Success: Task configuration is created correctly, all validations pass, SOP associations are saved, response format is consistent_

- [x] 1.1.2 實現任務配置更新 API Handler ✅ 已實現
  - File: backend/src/handlers/task-configs/task-config-crud.js
  - Function: handleUpdateTaskConfig
  - Purpose: 實現任務配置更新邏輯，包括 SOP 關聯更新
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR2.3.1_
  - _Prompt: Role: Backend Developer with expertise in task configuration updates | Task: Implement handleUpdateTaskConfig function in task-config-crud.js that updates existing task configuration, validates all fields, updates SOP associations (adds new ones, removes deselected ones), and handles partial updates. The function should validate task configuration exists and user has permission | Restrictions: Must validate task configuration exists, must validate all fields, must handle SOP association updates correctly (add/remove), must follow existing response format patterns | Success: Task configuration is updated correctly, SOP associations are updated properly, validation works, response format is consistent_

- [x] 1.1.3 實現任務配置刪除 API Handler ✅ 已實現
  - File: backend/src/handlers/task-configs/task-config-crud.js
  - Function: handleDeleteTaskConfig
  - Purpose: 實現任務配置刪除邏輯，包括檢查是否已有生成的任務並提示影響
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR2.3.1_
  - _Prompt: Role: Backend Developer with expertise in task configuration deletion | Task: Implement handleDeleteTaskConfig function in task-config-crud.js that deletes task configuration, checks if there are any generated tasks from this configuration, and provides appropriate warnings. The function should validate task configuration exists and user has permission, handle soft delete or hard delete based on whether tasks exist | Restrictions: Must validate task configuration exists, must check for existing tasks, must provide clear warnings, must follow existing response format patterns | Success: Task configuration is deleted correctly, warnings are provided when tasks exist, validation works, response format is consistent_

- [x] 1.1.4 實現任務配置查詢 API Handler ✅ 已實現
  - File: backend/src/handlers/task-configs/task-config-crud.js
  - Function: handleGetTaskConfigs
  - Purpose: 實現任務配置列表查詢邏輯，支援根據 client_service_id 篩選
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR2.3.1_
  - _Prompt: Role: Backend Developer with expertise in task configuration queries | Task: Implement handleGetTaskConfigs function in task-config-crud.js that retrieves task configurations for a service, supports filtering by client_service_id, and returns task configurations with associated SOPs. The function should validate user permissions and return data in consistent format | Restrictions: Must validate user permissions, must support filtering by client_service_id, must return associated SOPs, must follow existing response format patterns | Success: Task configurations are retrieved correctly, filtering works, SOP associations are included, response format is consistent_

### 1.2 任務生成邏輯 API 實現
- [x] 1.2.1 實現一次性服務任務生成 API Handler ✅ 已實現
  - File: backend/src/handlers/task-generator/generator-new.js
  - Function: handleGenerateTasksForOneTimeService
  - Purpose: 實現一次性服務任務生成邏輯，包括任務生成時間和到期日計算、任務階段創建和 SOP 關聯
  - _Leverage: backend/src/utils/response.js, backend/src/utils/dateCalculators.js_
  - _Requirements: BR2.3.7_
  - _Prompt: Role: Backend Developer with expertise in task generation and service management | Task: Implement handleGenerateTasksForOneTimeService function in task-generator.js that generates tasks immediately after one-time service is created. The function should read task configurations from ClientServiceTaskConfigs table, calculate generation time and due date using dateCalculators, create tasks in ActiveTasks table, create task stages in ActiveTaskStages table, and associate SOPs. The function should handle all task configurations for the service | Restrictions: Must generate tasks for all task configurations, must calculate dates correctly, must create stages properly, must associate SOPs, must handle errors gracefully, must follow existing response format patterns | Success: Tasks are generated correctly for one-time service, dates are calculated properly, stages are created, SOPs are associated, error handling works_

- [x] 1.2.2 實現固定期限任務處理邏輯 ✅ 已實現
  - File: backend/src/handlers/task-generator/generator-new.js
  - Function: handleFixedDeadlineTaskLogic
  - Purpose: 實現固定期限任務標記、前置任務延誤處理、中間任務到期日調整和通知發送邏輯
  - _Leverage: backend/src/utils/dateCalculators.js_
  - _Requirements: BR2.3.4_
  - _Prompt: Role: Backend Developer with expertise in fixed deadline task logic and dependency management | Task: Implement handleFixedDeadlineTaskLogic function in task-generator.js that handles fixed deadline tasks. The function should check if preceding tasks are delayed, calculate if intermediate tasks can be completed before fixed deadline (considering estimated_hours converted to days), adjust intermediate task due dates if needed (set to fixed deadline minus estimated_hours in days), and send notifications to relevant personnel (task assignee, stage owner, client owner) if conflicts are detected | Restrictions: Must check preceding task delays, must consider estimated_hours for intermediate tasks, must adjust due dates correctly, must send notifications when conflicts occur, must handle extreme delay scenarios | Success: Fixed deadline logic works correctly, intermediate task due dates are adjusted properly, notifications are sent when needed, extreme scenarios are handled_

### 1.3 日期計算工具實現
- [x] 1.3.1 實現任務生成時間規則計算工具 ✅ 已實現
  - File: backend/src/utils/dateCalculators.js
  - Function: calculateGenerationTime
  - Purpose: 實現各種生成時間規則的計算邏輯，處理月份天數不足的情況
  - _Leverage: 無_
  - _Requirements: BR2.3.2_
  - _Prompt: Role: Backend Developer with expertise in date calculations and business rules | Task: Implement calculateGenerationTime function in dateCalculators.js that calculates task generation time based on generation_time_rule. The function should support rules like "服務月份開始時", "服務月份前一個月的最後X天", "每月X日（如果該月沒有X日，則為該月最後一天）", etc. The function should handle edge cases like months with fewer days (e.g., February, months with 30 days) | Restrictions: Must handle all rule types mentioned in requirements, must handle month edge cases correctly, must return proper date format, must be consistent with frontend calculation | Success: All rule types are calculated correctly, edge cases are handled, date format is consistent, calculation matches frontend logic_

- [x] 1.3.2 實現任務到期日規則計算工具 ✅ 已實現
  - File: backend/src/utils/dateCalculators.js
  - Function: calculateDueDate
  - Purpose: 實現各種到期日規則的計算邏輯，處理固定日期和固定期限任務，處理月份天數不足的情況
  - _Leverage: 無_
  - _Requirements: BR2.3.3_
  - _Prompt: Role: Backend Developer with expertise in date calculations and fixed deadline logic | Task: Implement calculateDueDate function in dateCalculators.js that calculates task due date based on due_date_rule. The function should support rules like "服務月份開始時", "服務月份前一個月的最後X天", "每月X日（如果該月沒有X日，則為該月最後一天）", handle fixed deadline tasks (is_fixed_deadline = true), and consider estimated_hours for fixed deadline task logic. The function should handle month edge cases | Restrictions: Must handle all rule types, must handle fixed deadline tasks correctly, must consider estimated_hours for fixed deadline logic, must handle month edge cases, must be consistent with frontend calculation | Success: All rule types are calculated correctly, fixed deadline logic works, edge cases are handled, calculation matches frontend logic_

## 2.0 前端組件架構模組 (Frontend Component Architecture Module)

### 2.1 任務配置管理組件
- [x] 2.1.1 實現任務配置前端主組件 ✅ 已實現（基礎功能）
  - File: src/components/clients/TaskConfiguration.vue
  - Purpose: 實現任務配置列表展示、任務添加、編輯、刪除、批量設置負責人，整合所有子組件
  - _Leverage: src/api/tasks.js, src/stores/clientAdd.js_
  - _Requirements: BR2.3.1_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and complex form management | Task: Create TaskConfiguration.vue component that displays task configuration list, allows adding/editing/deleting task configurations, supports batch assignee setting, and integrates all child components (TaskGenerationTimeRule, TaskDueDateRule, TaskPreviewPanel, TaskSOPSelector). The component should use task name selector from ServiceItems filtered by service type | Restrictions: Must use Ant Design Vue components, must integrate all child components, must handle task configuration CRUD operations, must support batch operations, must follow existing component patterns | Success: Task configuration list is displayed, CRUD operations work, batch operations function, all child components are integrated_

- [x] 2.1.2 實現任務名稱選擇器 ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue
  - Purpose: 實現從 ServiceItems 下拉選擇任務名稱、根據服務類型篩選任務類型和任務名稱驗證
  - _Leverage: src/api/services.js_
  - _Requirements: BR2.3.1_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and form components | Task: Implement task name selector in TaskConfiguration.vue that fetches ServiceItems from API, filters by service_id (from ClientServices.service_id), displays as dropdown select, and validates selected task name. The selector should only show task names (item_name from ServiceItems) that match the current service's service_id | Restrictions: Must use Ant Design Vue Select component, must filter by service_id, must validate selection, must fetch from ServiceItems API, must follow existing component patterns | Success: Task name selector works, filtering by service_id is correct, validation works, user experience is smooth_

### 2.2 規則設定組件
- [x] 2.2.1 實現任務生成時間規則組件
  - File: src/components/clients/TaskGenerationTimeRule.vue ✅ 已創建
  - File: src/utils/dateCalculators.js ✅ 已創建
  - Purpose: 實現規則選擇界面、參數輸入界面和即時預覽顯示 ✅ 已實現
  - 規則選擇界面 ✅ 已實現
  - 參數輸入欄位 ✅ 已實現
  - 即時預覽顯示 ✅ 已實現
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.2_
  - _Status: 已完成 - 創建了 TaskGenerationTimeRule.vue 組件和 dateCalculators.js 工具文件。組件支持所有規則類型（服務月份開始時、前一個月最後X天、前一個月第X天、後一個月開始時、每月X日），提供直觀的規則描述、參數輸入和即時預覽功能。_

- [x] 2.2.2 實現任務到期日規則組件
  - File: src/components/clients/TaskDueDateRule.vue ✅ 已創建
  - Purpose: 實現規則選擇界面、參數輸入界面、固定期限任務選項和即時預覽顯示 ✅ 已實現
  - 規則選擇界面 ✅ 已實現
  - 參數輸入欄位 ✅ 已實現
  - 固定期限任務選項（checkbox） ✅ 已實現
  - 即時預覽顯示 ✅ 已實現
  - 支持新規則（days_due）和舊規則 ✅ 已實現
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.3_
  - _Status: 已完成 - 創建了 TaskDueDateRule.vue 組件，支持所有到期日規則類型（服務月份結束時、下個月結束時、N個月後結束、固定日期、固定期限、服務月份開始後N天），提供新規則（days_due）和舊規則選擇，支持固定期限任務選項，並提供即時預覽功能。_
  - Purpose: 實現規則選擇界面、參數輸入界面、固定期限任務選項和即時預覽顯示
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.3_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and date rule UI | Task: Create TaskDueDateRule.vue component that provides rule selection interface, parameter input fields, fixed deadline task option (checkbox), and real-time preview showing actual due date. The component should use dateCalculators for calculations and show preview like "到期日是3月15日" | Restrictions: Must use Ant Design Vue components, must provide fixed deadline option, must show real-time preview, must use dateCalculators for consistency, must handle all rule types | Success: Rule selection works, fixed deadline option functions, real-time preview is accurate, all rule types are supported_

### 2.3 預覽和驗證組件
- [x] 2.3.1 實現任務預覽面板組件 ✅ 已實現
  - File: src/components/clients/TaskPreviewPanel.vue ✅ 已創建
  - File: src/views/clients/ClientServiceConfig.vue ✅ 已集成
  - Purpose: 實現整個當月服務的完整情況展示、任務生成時間和到期日預覽、即時更新邏輯 ✅ 已實現
  - 完整月份視圖 ✅ 已實現
  - 顯示所有任務的生成時間和到期日 ✅ 已實現
  - 實時更新（當規則變更時，使用 computed 實現響應式） ✅ 已實現
  - 使用 dateCalculators 進行計算 ✅ 已實現
  - 統計摘要（任務總數、最早生成時間、最晚到期日、固定期限任務數） ✅ 已實現
  - 集成到任務配置頁面 ✅ 已實現
  - 數據格式轉換邏輯（previewTasks computed） ✅ 已實現
  - 錯誤處理和驗證 ✅ 已實現
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.5_
  - _Status: 已完成 - 創建了 TaskPreviewPanel.vue 組件，顯示整個當月服務的完整情況，包括所有任務的生成時間和到期日。組件使用 dateCalculators 進行計算，在規則變更時實時更新，並提供統計摘要信息。在 ClientServiceConfig.vue 中集成了 TaskPreviewPanel，添加了數據格式轉換邏輯（previewTasks computed），確保任務配置數據能夠正確轉換為 TaskPreviewPanel 所需的格式。使用 computed 屬性實現響應式更新，當任務規則（generation_time_rule, generation_time_params, due_date_rule, due_date_params, days_due）變化時，previewData 會自動重新計算並更新 UI。組件包含完善的錯誤處理機制，能夠處理計算錯誤和無效日期，並在 UI 中顯示相應的錯誤提示。_

## 3.0 業務邏輯引擎模組 (Business Logic Engine Module)

### 3.1 任務生成時間規則邏輯
- [x] 3.1.1 實現前端日期計算工具
  - File: src/utils/dateCalculators.js ✅ 已創建
  - Purpose: 實現任務生成時間計算（與後端邏輯一致）、任務到期日計算（與後端邏輯一致）和預覽計算邏輯 ✅ 已實現
  - 與後端邏輯完全一致 ✅ 已實現
  - 支持所有規則類型 ✅ 已實現
  - 處理月份邊緣情況 ✅ 已實現
  - 返回一致的日期格式 ✅ 已實現
  - 可在多個組件中重用 ✅ 已實現
  - _Leverage: 無_
  - _Requirements: BR2.3.2, BR2.3.3, BR2.3.5_
  - _Status: 已完成 - 創建了 dateCalculators.js 工具文件，實現了 calculateGenerationTime 和 calculateDueDate 函數，與後端 generator-new.js 中的邏輯完全一致。支持所有規則類型（包括後端規則名稱映射），處理月份邊緣情況（如2月沒有31日），並返回一致的 Date 對象格式。已被 TaskGenerationTimeRule.vue、TaskDueDateRule.vue 和 TaskPreviewPanel.vue 組件使用。_

### 3.2 一次性服務任務生成邏輯
- [x] 3.2.1 實現一次性服務任務生成前端邏輯
  - File: src/views/clients/ClientServiceConfig.vue ✅ 已實現
  - Purpose: 實現一次性服務保存時觸發任務生成、生成進度顯示和生成結果處理 ✅ 已實現
  - 保存後觸發任務生成 ✅ 已實現
  - 顯示生成進度（Modal + Progress） ✅ 已實現
  - 處理成功/錯誤狀態 ✅ 已實現
  - 提供用戶反饋（成功/警告/錯誤消息） ✅ 已實現
  - 完成後導航到適當頁面 ✅ 已實現
  - _Leverage: src/api/tasks.js_
  - _Requirements: BR2.3.7_
  - _Status: 已完成 - 在 ClientServiceConfig.vue 中實現了一次性服務保存後立即觸發任務生成的邏輯。創建了後端 API handler (generator-one-time.js) 和路由 (/api/v2/tasks/generate/one-time)。前端顯示生成進度 Modal，處理成功/錯誤狀態，並在完成後導航回服務列表頁面。_

### 3.3 定期服務任務配置邏輯
- [x] 3.3.1 實現定期服務任務配置保存邏輯 ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue, src/views/clients/ClientServiceConfig.vue ✅ 已實現
  - Purpose: 實現任務配置保存、「用於自動生成任務」選項處理和新增任務的三種選項（僅當前月份、保存為模板、保留設定） ✅ 已實現
  - 保存任務配置 ✅ 已實現
  - 「用於自動生成任務」選項（一次性服務隱藏） ✅ 已實現
  - 新增任務的三種選項 Modal ✅ 已實現
  - 處理每個選項的邏輯 ✅ 已實現
  - _Leverage: src/api/tasks.js_
  - _Requirements: BR2.3.8_
  - _Status: 已完成 - 在 TaskConfiguration.vue 中實現了「用於自動生成任務」選項（一次性服務隱藏），添加了新增任務選項 Modal（僅定期服務顯示），實現了三個選項的處理邏輯。在 ClientServiceConfig.vue 中實現了任務配置保存邏輯，包括分離需要立即生成的任務和需要保存的任務，以及處理「僅當前月份生成」選項的任務生成。_

## 4.0 數據整合和綁定模組 (Data Integration & Binding Module)

### 4.1 SOP 自動綁定實現
- [x] 4.1.1 實現 SOP 自動綁定邏輯 ✅ 已實現
  - File: src/components/clients/TaskSOPSelector.vue ✅ 已創建
  - Purpose: 實現服務層級 SOP 自動讀取、客戶專屬 SOP 優先使用、任務層級 SOP 選擇（內嵌形式）、多選和取消選擇 ✅ 已實現
  - 服務層級 SOP 自動讀取 ✅ 已實現
  - 客戶專屬 SOP 優先顯示 ✅ 已實現
  - 任務層級 SOP 內聯選擇 ✅ 已實現
  - 多選和取消選擇 ✅ 已實現
  - 根據服務類型和級別過濾 ✅ 已實現
  - _Leverage: src/api/sop.js_
  - _Requirements: BR2.3.6_
  - _Status: 已完成 - 創建了 TaskSOPSelector.vue 組件，實現了服務層級 SOP 自動讀取和顯示（客戶專屬優先），任務層級 SOP 內聯選擇（支持多選、搜索、取消選擇），並根據服務類型和級別（service/task）過濾 SOP。已集成到 TaskConfiguration.vue 中，替換了原有的 Modal 選擇方式。_

## 5.0 用戶體驗優化模組 (User Experience Optimization Module)

### 5.1 表單驗證和錯誤處理
- [x] 5.1.1 實現表單驗證邏輯 ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue, src/utils/validation.js, src/views/clients/ClientServiceConfig.vue
  - Purpose: 實現任務配置表單的完整驗證邏輯，包括必填欄位檢查、數據格式驗證和錯誤提示
  - 必填欄位驗證（任務名稱、階段編號、執行頻率） ✅ 已實現
  - 數據格式驗證（預估工時、提前生成、到期天數） ✅ 已實現
  - 唯一性驗證（階段編號在同一服務內不重複） ✅ 已實現
  - 條件驗證（自訂執行頻率必須選擇月份） ✅ 已實現
  - 清晰的錯誤消息顯示（中文字段標籤） ✅ 已實現
  - 驗證失敗時阻止表單提交 ✅ 已實現
  - 自動滾動到第一個錯誤位置 ✅ 已實現
  - _Leverage: src/utils/validation.js_
  - _Requirements: BR2.3.1_
  - _Status: 已完成 - 在 validation.js 中創建了 createTaskConfigRules 函數，實現了完整的驗證規則。在 TaskConfiguration.vue 中實現了 validateAllTasks 方法，支持驗證所有任務表單並返回詳細結果。在 ClientServiceConfig.vue 中集成了驗證邏輯，在保存前調用驗證，驗證失敗時顯示格式化的錯誤消息並阻止提交。所有字段都已正確綁定驗證規則（包括 days_due），錯誤消息清晰易讀，用戶體驗良好。_

### 5.2 即時預覽功能
- [x] 5.2.1 實現即時預覽更新機制 ✅ 已實現
  - File: src/components/clients/TaskPreviewPanel.vue
  - Purpose: 實現任務規則變更時的即時預覽更新，確保用戶能及時看到配置效果
  - 使用 Vue 3 computed 屬性實現響應式計算 ✅ 已實現
  - 自動響應任務規則變化（generation_time_rule, generation_time_params, due_date_rule, due_date_params, days_due） ✅ 已實現
  - 完善的錯誤處理機制（try-catch、結果驗證） ✅ 已實現
  - 清晰的錯誤提示顯示 ✅ 已實現
  - 性能優化（利用 Vue 3 響應式系統自動追蹤依賴） ✅ 已實現
  - 統計摘要自動更新（最早生成時間、最晚到期日、固定期限任務數） ✅ 已實現
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.5_
  - _Status: 已完成 - 將 previewData 從 ref + watch 改為 computed 屬性，充分利用 Vue 3 的響應式系統。當任務規則變化時，previewData 會自動重新計算並更新 UI。添加了完善的錯誤處理機制，包括 try-catch 包裹計算邏輯、結果驗證（檢查 Date 對象有效性）、錯誤信息記錄和顯示。移除了手動 watch，依賴 Vue 3 的自動依賴追蹤，提升了性能。所有統計摘要（最早生成時間、最晚到期日、固定期限任務數）都使用 computed 屬性，自動依賴 previewData，確保實時更新。_

## 6.0 服務類型支援模組 (Service Type Support Module)

### 6.1 一次性服務支援
- [x] 6.1.1 實現一次性服務任務生成流程 ✅ 已實現
  - File: src/components/clients/AddServiceModal.vue, src/views/clients/add/ClientAddServices.vue
  - Purpose: 實現一次性服務創建後的完整任務生成流程，包括進度顯示和結果處理
  - 服務保存後立即觸發任務生成 ✅ 已實現
  - 生成進度顯示（Modal + Progress + Spin） ✅ 已實現
  - 結果處理（成功/警告/錯誤） ✅ 已實現
  - 錯誤處理機制 ✅ 已實現
  - 導航處理 ✅ 已實現
  - _Leverage: src/api/tasks.js, src/stores/clientAdd.js_
  - _Requirements: BR2.3.7_
  - _Status: 已完成 - 在 AddServiceModal.vue 中實現了任務生成功能，當用戶選擇一次性服務且服務已保存且有任務配置時，立即觸發任務生成。添加了生成進度 Modal，顯示進度條和狀態信息。在 ClientAddServices.vue 中集成了任務生成邏輯，當一次性服務保存後自動檢查並觸發任務生成。所有結果狀態（成功、警告、錯誤）都有清晰的用戶反饋，錯誤處理機制完善。_

### 6.2 定期服務支援
- [x] 6.2.1 實現定期服務任務配置選項 ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue, src/views/clients/ClientServiceConfig.vue
  - Purpose: 實現定期服務的三種任務配置選項：僅當前月份生成、保存為模板用於未來自動生成、保留設定供未來手動加入
  - 三種選項 Modal UI（清晰的視覺設計和說明） ✅ 已實現
  - 選項驗證邏輯 ✅ 已實現
  - 每個選項的正確處理邏輯 ✅ 已實現
  - 任務列表中的配置類型標籤顯示 ✅ 已實現
  - 保存邏輯正確處理三種選項 ✅ 已實現
  - _Leverage: src/api/tasks.js, src/stores/clientAdd.js_
  - _Requirements: BR2.3.8_
  - _Status: 已完成 - 在 TaskConfiguration.vue 中實現了三種任務配置選項的 Modal UI，包括清晰的視覺設計、顏色標籤和詳細說明。添加了選項驗證邏輯，確保用戶必須選擇一個選項。每個選項都正確設置了相應的標記（use_for_auto_generate, _generateCurrentMonth, _optionType）。在任務列表中添加了配置類型標籤，讓用戶清楚看到每個任務的配置方式。保存邏輯在 ClientServiceConfig.vue 中正確處理了三種選項：僅當前月份生成（臨時保存後立即生成）、保存為模板（正常保存且自動生成）、保留設定（正常保存但不自動生成）。_

## 7.0 規則計算系統模組 (Rule Calculation System Module)

### 7.1 生成時間規則實現
- [x] 7.1.1 實現生成時間規則計算邏輯 ✅ 已實現
  - File: src/utils/dateCalculators.js
  - Function: calculateGenerationTime
  - Purpose: 前端生成時間規則計算，與後端完全一致
  - 支持所有生成時間規則類型 ✅ 已實現
  - 正確處理邊緣情況（跨年、月份天數不足、閏年） ✅ 已實現
  - 返回一致的日期格式 ✅ 已實現
  - 詳細的 JSDoc 註釋和示例 ✅ 已實現
  - _Leverage: 無_
  - _Requirements: BR2.3.2_
  - _Status: 已完成 - 完善了 calculateGenerationTime 函數的實現，確保與後端邏輯完全一致。函數支持所有生成時間規則類型（service_month_start, prev_month_last_x_days, prev_month_x_day, next_month_start, monthly_x_day），並正確處理所有邊緣情況（跨年處理、月份天數不足的情況、閏年處理）。添加了詳細的 JSDoc 註釋和示例，確保函數的使用和維護更加清晰。函數被 TaskGenerationTimeRule.vue 和 TaskPreviewPanel.vue 組件使用，用於實時預覽任務生成時間。_

### 7.2 到期日規則實現
- [x] 7.2.1 實現到期日規則計算邏輯 ✅ 已實現
  - File: src/utils/dateCalculators.js
  - Function: calculateDueDate
  - Purpose: 前端到期日規則計算，與後端完全一致，包括固定期限任務處理
  - 支持新規則（days_due：月份起始日 + days_due）✅ 已實現
  - 支持所有舊規則（end_of_month, specific_day, next_month_day, days_after_start）✅ 已實現
  - 支持固定期限任務（fixed_deadline）✅ 已實現
  - 正確處理邊緣情況（跨年、月份天數不足、閏年）✅ 已實現
  - 返回一致的日期格式 ✅ 已實現
  - 詳細的 JSDoc 註釋和示例 ✅ 已實現
  - _Leverage: 無_
  - _Requirements: BR2.3.3_
  - _Status: 已完成 - 完善了 calculateDueDate 函數的實現，確保與後端邏輯完全一致。函數支持新規則（days_due：月份起始日 + days_due，優先使用）和所有舊規則（end_of_month, specific_day, next_month_day, days_after_start）。支持固定期限任務（fixed_deadline：指定年月日）。正確處理所有邊緣情況（跨年處理、月份天數不足的情況、閏年處理）。添加了詳細的 JSDoc 註釋和示例，區分了後端規則和前端規則的實現差異。函數被 TaskDueDateRule.vue 和 TaskPreviewPanel.vue 組件使用，用於實時預覽任務到期日。_

## 8.0 預覽和驗證模組 (Preview & Validation Module)

### 8.1 預覽功能實現
- [x] 8.1.1 實現完整月份預覽 ✅ 已實現
  - File: src/components/clients/TaskPreviewPanel.vue ✅ 已創建
  - File: src/views/clients/ClientServiceConfig.vue ✅ 已集成
  - Purpose: 顯示整個月份的完整任務情況，包括所有任務的生成時間和到期日 ✅ 已實現
  - 完整月份視圖 ✅ 已實現
  - 顯示所有任務的生成時間和到期日 ✅ 已實現
  - 實時更新（當規則變更時，使用 computed 實現響應式） ✅ 已實現
  - 使用 dateCalculators 進行計算 ✅ 已實現
  - 統計摘要（任務總數、最早生成時間、最晚到期日、固定期限任務數） ✅ 已實現
  - 集成到任務配置頁面 ✅ 已實現
  - 數據格式轉換邏輯（previewTasks computed） ✅ 已實現
  - 錯誤處理和驗證 ✅ 已實現
  - 清晰的顯示（顏色編碼、圖標、狀態標籤） ✅ 已實現
  - 所有規則變化都會觸發更新 ✅ 已實現
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.5_
  - _Status: 已完成 - 創建了 TaskPreviewPanel.vue 組件，顯示整個當月服務的完整情況，包括所有任務的生成時間和到期日。組件使用 dateCalculators 進行計算，在規則變更時實時更新，並提供統計摘要信息。在 ClientServiceConfig.vue 中集成了 TaskPreviewPanel，添加了數據格式轉換邏輯（previewTasks computed），確保任務配置數據能夠正確轉換為 TaskPreviewPanel 所需的格式。使用 computed 屬性實現響應式更新，當任務規則（generation_time_rule, generation_time_params, due_date_rule, due_date_params, days_due）變化時，previewData 會自動重新計算並更新 UI。組件包含完善的錯誤處理機制，能夠處理計算錯誤和無效日期，並在 UI 中顯示相應的錯誤提示。所有任務規則變化（任務名稱、階段、預估工時、提前生成天數、到期規則、執行頻率等）都會觸發 emitTasks()，確保預覽實時更新。_

### 8.2 驗證功能實現
- [x] 8.2.1 實現規則設定驗證 ✅ 已實現
  - File: src/components/clients/TaskGenerationTimeRule.vue ✅ 已更新
  - File: src/components/clients/TaskDueDateRule.vue ✅ 已更新
  - File: src/utils/validation.js ✅ 已更新
  - Purpose: 驗證規則設定參數的有效性，提供即時反饋 ✅ 已實現
  - 生成時間規則驗證（規則必填、參數範圍驗證） ✅ 已實現
  - 到期日規則驗證（新規則 days_due、舊規則、參數驗證、固定期限日期驗證） ✅ 已實現
  - 使用 Ant Design Vue 表單驗證系統 ✅ 已實現
  - 即時驗證反饋（錯誤狀態顯示、錯誤訊息提示） ✅ 已實現
  - 防止無效配置（必填驗證、範圍驗證、類型驗證） ✅ 已實現
  - 暴露驗證方法供父組件調用 ✅ 已實現
  - 驗證事件觸發（validate 事件） ✅ 已實現
  - _Leverage: src/utils/validation.js_
  - _Requirements: BR2.3.2, BR2.3.3_
  - _Status: 已完成 - 為 TaskGenerationTimeRule.vue 和 TaskDueDateRule.vue 組件添加了完整的表單驗證功能。使用 Ant Design Vue 的表單驗證系統，實現了所有規則參數的驗證（規則必填、參數範圍、參數類型等）。添加了 createGenerationTimeRuleRules 和 createDueDateRuleRules 驗證規則函數到 validation.js。組件在用戶輸入時即時驗證並顯示錯誤狀態和錯誤訊息，防止無效配置。驗證邏輯考慮了規則之間的依賴關係（如新規則 days_due 優先於舊規則）。組件暴露了 validate 方法供父組件調用，並觸發 validate 事件通知父組件驗證狀態。_

## 9.0 批量操作支援模組 (Batch Operations Support Module)

### 9.1 批量負責人設定
- [x] 9.1.1 實現批量設置負責人功能 ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue ✅ 已更新
  - Purpose: 支援批量選擇多個任務配置並設置相同的負責人 ✅ 已實現
  - 任務多選功能（checkbox） ✅ 已實現
  - 全選/取消全選功能（支持半選狀態） ✅ 已實現
  - 批量設置邏輯（只應用到選中的任務） ✅ 已實現
  - 清晰的UI反饋（選中數量顯示、成功/失敗消息） ✅ 已實現
  - 錯誤處理（API錯誤、異常情況） ✅ 已實現
  - 按鈕狀態管理（禁用、加載狀態） ✅ 已實現
  - 任務刪除時自動調整選中索引 ✅ 已實現
  - _Leverage: src/api/tasks.js_
  - _Requirements: BR2.3.1_
  - _Status: 已完成 - 實現了完整的批量設置負責人功能。添加了任務多選功能（每個任務前有checkbox），支持全選/取消全選（帶半選狀態），批量設置邏輯只應用到選中的任務。添加了清晰的UI反饋：顯示選中數量、成功消息顯示更新的任務數和負責人姓名、失敗時顯示錯誤消息。實現了完善的錯誤處理機制，包括API錯誤和異常情況的處理。按鈕在沒有選中任務或未選擇負責人時自動禁用，操作時顯示加載狀態。當任務被刪除時，自動調整選中索引以保持一致性。_

## 10.0 錯誤處理機制模組 (Error Handling Mechanism Module)

### 10.1 錯誤處理和用戶反饋
- [x] 10.1.1 實現錯誤處理和顯示邏輯 ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue ✅ 已更新
  - File: src/utils/errorHandler.js ✅ 已創建
  - Purpose: 實現統一的錯誤處理和用戶友好的錯誤顯示 ✅ 已實現
  - 統一的錯誤處理工具（errorHandler.js） ✅ 已實現
  - 錯誤類型識別（網絡、API、驗證、權限、服務器等） ✅ 已實現
  - 用戶友好的錯誤消息提取 ✅ 已實現
  - 數據加載錯誤處理（使用 Promise.allSettled） ✅ 已實現
  - 模板加載錯誤處理 ✅ 已實現
  - 批量操作錯誤處理 ✅ 已實現
  - 表單驗證錯誤處理 ✅ 已實現
  - 任務操作錯誤處理（添加、刪除、SOP更新） ✅ 已實現
  - 不暴露技術細節 ✅ 已實現
  - 遵循現有錯誤處理模式（usePageAlert、message） ✅ 已實現
  - _Leverage: src/utils/errorHandler.js_
  - _Requirements: 所有 BR2.3 需求_
  - _Status: 已完成 - 創建了統一的錯誤處理工具 errorHandler.js，提供錯誤類型識別、用戶友好消息提取和結構化錯誤處理。在 TaskConfiguration 組件中應用了全面的錯誤處理，覆蓋所有操作：數據加載（使用 Promise.allSettled 處理部分失敗）、模板加載、批量設置負責人、表單驗證、任務添加/刪除、SOP更新等。所有錯誤都通過 handleError 函數處理，提取用戶友好的錯誤消息，不暴露技術細節。錯誤消息通過 usePageAlert 和 message 顯示，遵循現有的錯誤處理模式。_

## 12.0 E2E 測試模組 (E2E Testing Module)

### 12.1 任務創建 E2E 測試
- [x] 12.1.1 實現任務創建功能 E2E 測試 ✅ 已實現
  - File: tests/e2e/tasks/task-creation-br2.3.spec.ts ✅ 已創建
  - File: tests/e2e/utils/test-data.ts ✅ 已更新
  - Purpose: 創建全面的 E2E 測試覆蓋所有驗收標準 ✅ 已實現
  - 測試數據設置函數（setupBR2_3TestData） ✅ 已實現
  - 測試數據清理函數（cleanupBR2_3TestData） ✅ 已實現
  - BR2.3.1 任務配置創建流程測試 ✅ 已實現
  - BR2.3.2 任務生成時間規則測試 ✅ 已實現
  - BR2.3.3 任務到期日規則測試 ✅ 已實現
  - BR2.3.5 任務預覽功能測試 ✅ 已實現
  - BR2.3.6 SOP 自動綁定測試 ✅ 已實現
  - BR2.3.7 一次性服務任務生成測試 ✅ 已實現
  - BR2.3.8 定期服務任務配置測試 ✅ 已實現
  - 權限測試（管理員和員工帳號） ✅ 已實現
  - 錯誤場景測試 ✅ 已實現
  - 使用測試數據設置工具 ✅ 已實現
  - 測試後清理測試數據 ✅ 已實現
  - _Leverage: tests/e2e/utils/test-data.ts, tests/e2e/utils/auth.ts_
  - _Requirements: 所有 BR2.3 驗收標準_
  - _Status: 已完成 - 創建了全面的 E2E 測試套件，覆蓋所有 BR2.3 驗收標準。測試包括任務配置創建流程、生成時間和到期日規則設置、SOP 自動綁定、任務預覽功能、一次性服務任務生成、定期服務任務配置保存等。測試使用管理員和員工帳號進行，包含權限測試和錯誤場景測試。所有測試都使用測試數據設置工具進行數據準備，並在測試後清理測試數據。_

## 11.0 權限和安全模組 (Permissions & Security Module)

### 11.1 權限檢查實現
- [x] 11.1.1 實現任務配置權限檢查 ✅ 已實現
  - File: backend/src/handlers/task-configs/task-config-crud.js ✅ 已更新
  - File: backend/src/handlers/task-generator/index.js ✅ 已更新
  - Purpose: 確保用戶只能操作自己有權限的任務配置 ✅ 已實現
  - 所有操作都檢查用戶身份驗證 ✅ 已實現
  - GET 操作添加權限檢查（管理員或客戶負責人） ✅ 已實現
  - POST 操作添加權限檢查（管理員或客戶負責人） ✅ 已實現
  - PUT 操作添加權限檢查（管理員或客戶負責人） ✅ 已實現
  - DELETE 操作添加權限檢查（管理員或客戶負責人） ✅ 已實現
  - 批量保存操作添加權限檢查（管理員或客戶負責人） ✅ 已實現
  - 一次性服務任務生成添加權限檢查（管理員或客戶負責人） ✅ 已實現
  - 任務生成預覽添加用戶身份驗證 ✅ 已實現
  - 手動任務生成添加用戶身份驗證 ✅ 已實現
  - 權限檢查邏輯一致（使用 Number() 比較） ✅ 已實現
  - 錯誤響應格式一致（401 UNAUTHORIZED, 403 FORBIDDEN） ✅ 已實現
  - 請求格式錯誤處理（400 BAD_REQUEST） ✅ 已實現
  - _Leverage: backend/src/middleware/auth.js_
  - _Requirements: BR2.3.1_
  - _Prompt: Role: Backend Developer with expertise in authorization | Task: Implement permission checks for all task configuration operations, ensuring users can only access configurations they have permission to | Restrictions: Must check permissions for all operations, must return appropriate error responses, must follow existing authorization patterns | Success: All operations are properly authorized, unauthorized access is prevented, error responses are appropriate_

## 12.0 測試覆蓋模組 (Testing Coverage Module)

### 12.1 E2E 測試實現
- [x] 12.1.1 編寫 E2E 測試 ✅ 已實現
  - File: tests/e2e/tasks/task-creation-br2.3.spec.ts ✅ 已創建
  - File: tests/e2e/utils/test-data.ts ✅ 已更新
  - Purpose: 編寫完整的 E2E 測試，覆蓋任務配置創建流程、任務生成時間和到期日規則設定、SOP 自動綁定、任務預覽功能、一次性服務任務生成、定期服務任務配置保存，使用測試數據工具設置測試數據 ✅ 已實現
  - 測試數據設置函數（setupBR2_3TestData） ✅ 已實現
  - 測試數據清理函數（cleanupBR2_3TestData） ✅ 已實現
  - 創建測試客戶服務函數（createTestClientService） ✅ 已實現
  - 創建測試 SOP 函數（createTestSOP） ✅ 已實現
  - 創建測試服務項目函數（createTestServiceItem） ✅ 已實現
  - BR2.3.1 任務配置創建流程測試 ✅ 已實現
  - BR2.3.2 任務生成時間規則測試 ✅ 已實現
  - BR2.3.3 任務到期日規則測試 ✅ 已實現
  - BR2.3.5 任務預覽功能測試 ✅ 已實現
  - BR2.3.6 SOP 自動綁定測試 ✅ 已實現
  - BR2.3.7 一次性服務任務生成測試 ✅ 已實現
  - BR2.3.8 定期服務任務配置測試 ✅ 已實現
  - 權限測試（管理員和員工帳號） ✅ 已實現
  - 錯誤場景測試（必填欄位驗證、階段編號驗證） ✅ 已實現
  - 使用測試數據設置工具 ✅ 已實現
  - 測試後清理測試數據 ✅ 已實現
  - _Leverage: tests/e2e/utils/test-data.ts_
  - _Requirements: 所有 BR2.3 驗收標準_
  - _Status: 已完成 - 創建了全面的 E2E 測試套件，覆蓋所有 BR2.3 驗收標準。測試包括任務配置創建流程、生成時間和到期日規則設置、SOP 自動綁定、任務預覽功能、一次性服務任務生成、定期服務任務配置保存等。測試使用管理員和員工帳號進行，包含權限測試和錯誤場景測試。所有測試都使用測試數據設置工具進行數據準備，並在測試後清理測試數據。測試文件位於 tests/e2e/tasks/task-creation-br2.3.spec.ts，測試數據工具函數位於 tests/e2e/utils/test-data.ts。_

## 13.0 性能優化模組 (Performance Optimization Module)

### 13.1 性能優化實現
- [x] 13.1.1 實現預覽計算性能優化 ✅ 已實現
  - File: src/utils/dateCalculators.js ✅ 已更新
  - File: src/components/clients/TaskPreviewPanel.vue ✅ 已更新
  - Purpose: 優化日期計算性能，避免不必要的重複計算 ✅ 已實現
  - 記憶化緩存系統（generationTimeCache 和 dueDateCache） ✅ 已實現
  - 緩存鍵生成函數（generateCacheKey） ✅ 已實現
  - 緩存清理機制（cleanupCache，防止內存泄漏） ✅ 已實現
  - 緩存大小限制（MAX_CACHE_SIZE = 1000） ✅ 已實現
  - 清除緩存函數（clearDateCalculationCache，用於測試） ✅ 已實現
  - 在 calculateGenerationTime 中集成緩存 ✅ 已實現
  - 在 calculateDueDate 中集成緩存 ✅ 已實現
  - 返回深拷貝避免外部修改影響緩存 ✅ 已實現
  - 優化 earliestGenerationTime 計算（從 O(n log n) 到 O(n)） ✅ 已實現
  - 優化 latestDueDate 計算（從 O(n log n) 到 O(n)） ✅ 已實現
  - 保持計算準確性 ✅ 已實現
  - 保持響應式功能 ✅ 已實現
  - 保持錯誤處理邏輯 ✅ 已實現
  - _Leverage: Vue 3 reactivity, memoization_
  - _Requirements: BR2.3.2, BR2.3.3, BR2.3.5_
  - _Status: 已完成 - 實現了全面的日期計算性能優化。在 dateCalculators.js 中添加了記憶化緩存系統，使用 Map 數據結構實現 O(1) 查找性能。緩存基於輸入參數生成穩定的緩存鍵，確保相同輸入返回相同結果。實現了自動緩存清理機制，當緩存超過 1000 項時自動清理最舊的 50%，防止內存泄漏。在 TaskPreviewPanel.vue 中優化了統計計算，將最早生成時間和最晚到期日的計算從 O(n log n) 優化到 O(n)，使用單次遍歷找最值，避免排序開銷。所有優化都保持了計算準確性、響應式功能和錯誤處理邏輯。性能提升明顯，特別是在重複計算相同參數和大量任務的場景下。_

## 14.0 文檔完善模組 (Documentation Enhancement Module)

### 14.1 API 文檔
- [x] 14.1.1 更新任務配置 API 文檔 ✅ 已實現
  - File: .spec-workflow/specs/br2-3-task-creation/api-documentation.md ✅ 已創建
  - Purpose: 更新所有任務配置端點的 API 文檔，包含請求/響應格式、參數和示例 ✅ 已實現
  - 文檔化 GET 端點（獲取任務配置列表） ✅ 已實現
  - 文檔化 POST 端點（創建任務配置） ✅ 已實現
  - 文檔化 PUT 端點（更新任務配置） ✅ 已實現
  - 文檔化 DELETE 端點（刪除任務配置） ✅ 已實現
  - 文檔化批量保存端點（batch） ✅ 已實現
  - 包含請求/響應格式說明 ✅ 已實現
  - 包含參數和字段詳細說明 ✅ 已實現
  - 包含完整的請求/響應示例 ✅ 已實現
  - 包含到期日規則說明 ✅ 已實現
  - 包含生成時間規則說明 ✅ 已實現
  - 包含權限要求說明 ✅ 已實現
  - 包含錯誤響應說明 ✅ 已實現
  - 包含注意事項和版本歷史 ✅ 已實現
  - _Leverage: backend/src/handlers/task-configs/task-config-crud.js, backend/src/router/task-configs.js_
  - _Requirements: 所有任務配置 API 端點_
  - _Status: 已完成 - 創建了完整的任務配置 API 文檔，涵蓋所有 5 個端點（GET、POST、PUT、DELETE、batch）。文檔包含詳細的請求/響應格式、參數說明、字段描述、完整的示例、到期日規則和生成時間規則說明、權限要求、錯誤響應說明、注意事項和版本歷史。文檔遵循標準的 API 文檔格式，易於理解和使用。_

## 14.0 文檔完善模組 (Documentation Enhancement Module)

### 14.1 文檔更新
- [x] 14.1.1 更新 API 文檔 ✅ 已實現
  - File: .spec-workflow/specs/br2-3-task-creation/api-documentation.md ✅ 已創建
  - Purpose: 更新任務配置相關 API 的文檔 ✅ 已實現
  - 文檔化 GET 端點（獲取任務配置列表） ✅ 已實現
  - 文檔化 POST 端點（創建任務配置） ✅ 已實現
  - 文檔化 PUT 端點（更新任務配置） ✅ 已實現
  - 文檔化 DELETE 端點（刪除任務配置） ✅ 已實現
  - 文檔化批量保存端點（batch） ✅ 已實現
  - 包含請求/響應格式說明 ✅ 已實現
  - 包含參數和字段詳細說明 ✅ 已實現
  - 包含完整的請求/響應示例 ✅ 已實現
  - 包含到期日規則說明 ✅ 已實現
  - 包含生成時間規則說明 ✅ 已實現
  - 包含權限要求說明 ✅ 已實現
  - 包含錯誤響應說明 ✅ 已實現
  - 包含注意事項和版本歷史 ✅ 已實現
  - _Leverage: backend/src/handlers/task-configs/task-config-crud.js, backend/src/router/task-configs.js_
  - _Requirements: 所有 API endpoints_
  - _Status: 已完成 - 創建了完整的任務配置 API 文檔，涵蓋所有 5 個端點（GET、POST、PUT、DELETE、batch）。文檔包含詳細的請求/響應格式、參數說明、字段描述、完整的示例、到期日規則和生成時間規則說明、權限要求、錯誤響應說明、注意事項和版本歷史。文檔遵循標準的 API 文檔格式，易於理解和使用。_

- [x] 14.1.2 更新用戶文檔 ✅ 已實現
  - File: .spec-workflow/specs/br2-3-task-creation/user-guide.md ✅ 已創建
  - Purpose: 創建任務配置功能的使用者指南 ✅ 已實現
  - 概述和主要功能說明 ✅ 已實現
  - 開始使用指南 ✅ 已實現
  - 基本操作說明（添加、編輯、刪除） ✅ 已實現
  - 任務配置詳解（必填欄位和可選欄位） ✅ 已實現
  - 生成時間規則詳細說明 ✅ 已實現
  - 到期日規則詳細說明（新規則和舊規則） ✅ 已實現
  - SOP 自動綁定說明 ✅ 已實現
  - 任務預覽功能說明 ✅ 已實現
  - 一次性服務任務生成說明 ✅ 已實現
  - 定期服務任務配置說明 ✅ 已實現
  - 批量操作說明 ✅ 已實現
  - 使用任務模板說明 ✅ 已實現
  - 常見問題解答 ✅ 已實現
  - 最佳實踐建議 ✅ 已實現
  - 附錄（規則對照表、字段說明對照表） ✅ 已實現
  - _Leverage: requirements.md, design.md, 實際組件實現_
  - _Requirements: BR2.3 所有功能_
  - _Status: 已完成 - 創建了完整的任務配置功能使用指南，涵蓋所有功能和工作流程。文檔包含概述、開始使用、基本操作、任務配置詳解、生成時間規則、到期日規則、SOP 自動綁定、任務預覽、一次性服務任務生成、定期服務任務配置、批量操作、使用任務模板、常見問題、最佳實踐和附錄。文檔用戶友好，包含詳細的操作步驟、示例和注意事項，易於理解和使用。_

## 15.0 部署配置模組 (Deployment Configuration Module)

### 15.1 部署配置更新
- [x] 15.1.1 更新部署腳本 ✅ 已實現
  - File: scripts/deploy-full.ps1 ✅ 已更新
  - File: scripts/auto-deploy-and-test.ps1 ✅ 已更新
  - File: backend/scripts/deploy.ps1 ✅ 已更新
  - 包含任務配置功能驗證 ✅ 已實現
  - 檢查任務配置組件存在性 ✅ 已實現
  - 檢查任務配置 handlers 存在性 ✅ 已實現
  - 檢查任務配置數據庫遷移文件 ✅ 已實現
  - 驗證任務配置 API 端點 ✅ 已實現
  - 添加回滾功能 ✅ 已實現
  - 部署狀態追蹤 ✅ 已實現
  - 部署後驗證步驟 ✅ 已實現
  - 錯誤處理和回滾建議 ✅ 已實現
  - _Leverage: 現有部署腳本結構_
  - _Requirements: 包含所有新組件、正確部署順序、回滾支持_
  - _Status: 已完成 - 更新了所有部署腳本以包含任務配置功能驗證。腳本現在會檢查任務配置相關組件、handlers 和數據庫遷移文件的存在性，驗證 API 端點，並提供回滾功能。部署流程保持不變，但增加了任務配置功能的驗證步驟。_
  - Purpose: 更新部署腳本以包含新的任務配置功能
  - _Leverage: 現有部署腳本_
  - _Requirements: 所有新功能_
  - _Prompt: Role: DevOps Engineer with expertise in deployment automation | Task: Update deployment scripts to include new task configuration functionality and ensure proper deployment order | Restrictions: Must maintain existing deployment processes, must include all new components, must test deployments, must handle rollbacks | Success: Deployment scripts work correctly, all components are deployed, rollback works, processes are maintained_

## 16.0 維護和監控模組 (Maintenance & Monitoring Module)

### 16.1 監控和維護
- [x] 16.1.1 實現任務生成監控 ✅ 已實現
  - File: backend/src/utils/monitoring.js ✅ 已創建
  - File: backend/migrations/0046_task_generation_monitoring.sql ✅ 已創建
  - Purpose: 監控任務生成過程，提供指標和告警 ✅ 已實現
  - 監控工具函數（記錄開始、完成、錯誤） ✅ 已實現
  - 告警機制（成功率、錯誤數、性能、完全失敗） ✅ 已實現
  - 統計查詢函數（獲取統計、告警、記錄） ✅ 已實現
  - 數據庫遷移（TaskGenerationMonitoring, TaskGenerationErrors, TaskGenerationAlerts） ✅ 已實現
  - 集成到 generator-new.js（自動生成） ✅ 已實現
  - 集成到 generator-one-time.js（一次性服務生成） ✅ 已實現
  - 集成到 index.js（手動生成） ✅ 已實現
  - 性能優化（異步、輕量級、不影響主流程） ✅ 已實現
  - _Leverage: 現有錯誤處理和日誌模式_
  - _Requirements: BR2.3.7_
  - _Status: 已完成 - 實現了完整的任務生成監控系統，包括成功率、性能指標和告警機制。監控工具已集成到所有任務生成流程中，使用異步方式記錄，不影響主流程性能。提供了統計查詢和告警查詢功能，方便管理員查看監控數據。_

## 17.0 待實現前端功能模組 (Pending Frontend Features Module)

### 17.1 前端日期計算工具
- [x] 17.1.1 創建前端日期計算工具
  - File: src/utils/dateCalculators.js ✅ 已創建
  - Function: calculateGenerationTime, calculateDueDate ✅ 已實現
  - Purpose: 前端任務生成時間和到期日規則計算，與後端完全一致 ✅ 已實現
  - 與後端邏輯完全一致 ✅ 已實現
  - 支持所有規則類型 ✅ 已實現
  - 處理月份邊緣情況 ✅ 已實現
  - 返回一致的日期格式 ✅ 已實現
  - 支持後端規則名稱映射 ✅ 已實現
  - _Leverage: 無_
  - _Requirements: BR2.3.2, BR2.3.3_
  - _Status: 已完成 - 創建了 dateCalculators.js 工具文件，實現了 calculateGenerationTime 和 calculateDueDate 函數，與後端 generator-new.js 中的邏輯完全一致。支持所有規則類型（包括後端規則名稱映射），處理月份邊緣情況（如2月沒有31日），並返回一致的 Date 對象格式。_
  - _Prompt: Role: Frontend Developer with expertise in date calculations | Task: Create dateCalculators.js utility file that implements calculateGenerationTime and calculateDueDate functions matching backend logic exactly. The functions should support all rule types, handle month edge cases, and be used by preview components for real-time calculations | Restrictions: Must match backend logic exactly, must handle all rule types, must handle month edge cases, must return consistent date format, must be reusable across components | Success: Calculations match backend logic, all rule types work, edge cases are handled, date format is consistent_

### 17.2 任務預覽面板組件
- [x] 17.2.1 實現任務預覽面板組件 ✅ 已實現
  - File: src/components/clients/TaskPreviewPanel.vue ✅ 已創建
  - Purpose: 實現整個當月服務的完整情況展示、任務生成時間和到期日預覽、即時更新邏輯 ✅ 已實現
  - 完整的月份視圖（顯示所有任務） ✅ 已實現
  - 任務列表表格（階段、任務名稱、生成時間、到期日、預估工時、狀態） ✅ 已實現
  - 統計摘要（任務總數、最早生成時間、最晚到期日、固定期限任務） ✅ 已實現
  - 響應式更新（使用 computed 自動響應規則變化） ✅ 已實現
  - 使用 dateCalculators 進行計算 ✅ 已實現
  - 錯誤處理和提示 ✅ 已實現
  - 清晰的顯示（使用 Ant Design Vue 組件） ✅ 已實現
  - 按階段編號排序顯示 ✅ 已實現
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.5_
  - _Status: 已完成 - 實現了完整的任務預覽面板組件，顯示整個當月服務的完整情況。組件使用 Ant Design Vue 組件（a-card, a-table, a-tag, a-statistic, a-alert），使用 computed 實現響應式更新，當任務規則變化時自動重新計算並更新預覽。組件使用 dateCalculators 進行日期計算，確保與後端邏輯一致。顯示清晰，包含任務列表、統計摘要和錯誤提示。_

### 17.3 規則設定組件
- [x] 17.3.1 實現任務生成時間規則組件 ✅ 已實現
  - File: src/components/clients/TaskGenerationTimeRule.vue ✅ 已創建
  - Purpose: 實現規則選擇界面、參數輸入界面和即時預覽顯示 ✅ 已實現
  - 規則選擇界面（使用 a-select，包含清晰的標籤和描述） ✅ 已實現
  - 參數輸入字段（使用 a-input-number，根據規則類型動態顯示） ✅ 已實現
  - 即時預覽（顯示預覽文本和實際生成日期） ✅ 已實現
  - 使用 dateCalculators 進行計算 ✅ 已實現
  - 支持所有規則類型（5種規則類型） ✅ 已實現
  - 表單驗證和錯誤處理 ✅ 已實現
  - 響應式更新（監聽規則和參數變化） ✅ 已實現
  - 使用 Ant Design Vue 組件 ✅ 已實現
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.2_
  - _Status: 已完成 - 實現了完整的任務生成時間規則組件，提供直觀的規則選擇界面、參數輸入字段和即時預覽功能。組件使用 Ant Design Vue 組件（a-form, a-form-item, a-select, a-input-number, a-alert），使用 dateCalculators 進行日期計算確保一致性，支持所有5種規則類型。規則選擇直觀，參數輸入正常工作，即時預覽準確，所有規則類型都得到支持。_

- [x] 17.3.2 實現任務到期日規則組件 ✅ 已實現
  - File: src/components/clients/TaskDueDateRule.vue ✅ 已創建
  - Purpose: 實現規則選擇界面、參數輸入界面、固定期限任務選項和即時預覽顯示 ✅ 已實現
  - 新規則優先（days_due：當月1日 + N天） ✅ 已實現
  - 舊規則支持（6種規則類型） ✅ 已實現
  - 規則選擇界面（使用 a-select，包含清晰的標籤和描述） ✅ 已實現
  - 參數輸入字段（使用 a-input-number 和 a-date-picker，根據規則類型動態顯示） ✅ 已實現
  - 固定期限任務選項（使用 a-checkbox） ✅ 已實現
  - 即時預覽（顯示預覽文本和實際到期日期，例如："到期日是3月15日"） ✅ 已實現
  - 使用 dateCalculators 進行計算 ✅ 已實現
  - 支持所有規則類型（新規則 + 6種舊規則） ✅ 已實現
  - 表單驗證和錯誤處理 ✅ 已實現
  - 響應式更新（監聽規則和參數變化） ✅ 已實現
  - 使用 Ant Design Vue 組件 ✅ 已實現
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.3_
  - _Status: 已完成 - 實現了完整的任務到期日規則組件，提供直觀的規則選擇界面、參數輸入字段、固定期限任務選項和即時預覽功能。組件優先使用新規則（days_due），同時支持所有舊規則類型。組件使用 Ant Design Vue 組件（a-form, a-form-item, a-select, a-input-number, a-date-picker, a-checkbox, a-alert），使用 dateCalculators 進行日期計算確保一致性。規則選擇正常工作，固定期限選項功能正常，即時預覽準確，所有規則類型都得到支持。_

### 17.4 SOP 選擇組件
- [x] 17.4.1 實現任務 SOP 選擇組件 ✅ 已實現
  - File: src/components/clients/TaskSOPSelector.vue ✅ 已創建
  - Purpose: 實現服務層級 SOP 自動讀取、客戶專屬 SOP 優先使用、任務層級 SOP 選擇（內嵌形式）、多選和取消選擇 ✅ 已實現
  - 自動讀取服務層級 SOPs（從知識庫，按服務類型和客戶過濾） ✅ 已實現
  - 優先客戶專屬 SOPs（排序時客戶專屬優先顯示） ✅ 已實現
  - 內聯任務層級 SOP 選擇（非模态框，使用內嵌表單） ✅ 已實現
  - 支持多選和取消選擇（使用 checkbox，支持標籤移除） ✅ 已實現
  - 按服務類型和級別過濾（service/task） ✅ 已實現
  - 搜索功能（任務層級 SOP 支持關鍵字搜索） ✅ 已實現
  - 使用 Ant Design Vue 組件（a-form-item, a-tag, a-checkbox, a-input-search） ✅ 已實現
  - 響應式更新（監聽 serviceId 和 clientId 變化） ✅ 已實現
  - 已集成到 TaskConfiguration.vue ✅ 已實現
  - _Leverage: src/api/sop.js_
  - _Requirements: BR2.3.6_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and SOP selection UI | Task: Create TaskSOPSelector.vue component that automatically reads service-level SOPs from knowledge base (filtered by service type and client), prioritizes client-specific SOPs, provides inline task-level SOP selection (not modal), supports multi-select and deselection, and filters SOPs by service type and level (service/task). The component should use embedded form similar to task creation SOP selection | Restrictions: Must automatically read service-level SOPs, must prioritize client-specific SOPs, must use inline form (not modal), must support multi-select, must filter by service type and level, must follow existing component patterns | Success: Service-level SOPs are auto-loaded, client-specific SOPs are prioritized, inline selection works, multi-select functions, filtering is correct_

### 17.5 任務配置組件增強
- [x] 17.5.1 添加固定期限任務選項 ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue ✅ 已更新
  - Purpose: 在任務配置中添加固定期限任務選項 ✅ 已實現
  - 固定期限任務選項（使用 a-checkbox） ✅ 已實現
  - 當選中時設置 is_fixed_deadline = true ✅ 已實現
  - UI 反饋（當選中時顯示警告提示） ✅ 已實現
  - 在所有任務創建路徑中初始化 is_fixed_deadline 字段 ✅ 已實現
  - 集成到現有表單 ✅ 已實現
  - 使用 Ant Design Vue 組件（a-checkbox, a-alert） ✅ 已實現
  - _Leverage: 現有組件_
  - _Requirements: BR2.3.4_
  - _Status: 已完成 - 在 TaskConfiguration.vue 中添加了固定期限任務選項（checkbox）。當選中時，設置 is_fixed_deadline = true 並顯示適當的 UI 反饋（警告提示）。選項已集成到現有表單中，在所有任務創建路徑（新增任務、從模板加載、待添加任務）中都正確初始化了 is_fixed_deadline 字段。固定期限選項可用，驗證正常工作，UI 反饋清晰。_

- [x] 17.5.2 整合所有子組件 ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue ✅ 已更新
  - Purpose: 整合 TaskGenerationTimeRule, TaskDueDateRule, TaskPreviewPanel, TaskSOPSelector 子組件 ✅ 已實現
  - TaskGenerationTimeRule 組件集成 ✅ 已實現
  - TaskDueDateRule 組件集成 ✅ 已實現
  - TaskSOPSelector 組件集成（服務層級和任務層級） ✅ 已實現
  - TaskPreviewPanel 組件集成（在父組件 ClientServiceConfig.vue 中） ✅ 已實現
  - 正確的 props 傳遞（serviceYear, serviceMonth） ✅ 已實現
  - 正確的事件處理（update:modelValue, change） ✅ 已實現
  - 數據同步（規則數據格式轉換和初始化） ✅ 已實現
  - 向後兼容（保留舊字段） ✅ 已實現
  - 使用 Vue 3 Composition API 模式 ✅ 已實現
  - _Leverage: 所有子組件_
  - _Requirements: BR2.3.1-BR2.3.6_
  - _Status: 已完成 - 已成功整合所有子組件到 TaskConfiguration.vue。TaskGenerationTimeRule 和 TaskDueDateRule 已替換原有的簡單輸入字段，提供完整的規則選擇和預覽功能。TaskSOPSelector 已在服務層級和任務層級集成。TaskPreviewPanel 在父組件 ClientServiceConfig.vue 中集成，顯示所有任務的預覽。所有組件都正確接收 props（serviceYear, serviceMonth），正確處理事件（update:modelValue, change），並保持數據一致性。數據流正確，UI 協調一致。_

### 17.6 一次性服務任務生成邏輯
- [x] 17.6.1 實現一次性服務任務生成前端邏輯 ✅ 已實現
  - File: src/views/clients/ClientServiceConfig.vue ✅ 已更新
  - Purpose: 實現一次性服務保存時觸發任務生成、生成進度顯示和生成結果處理 ✅ 已實現
  - 在一次性服務保存後立即觸發任務生成 ✅ 已實現
  - 調用任務生成 API（generateTasksForOneTimeService） ✅ 已實現
  - 顯示生成進度 Modal（帶進度條和狀態文字） ✅ 已實現
  - 處理生成結果（成功/錯誤/部分失敗） ✅ 已實現
  - 提供用戶反饋（成功消息、警告、錯誤提示） ✅ 已實現
  - 完成後導航到服務列表頁面 ✅ 已實現
  - 錯誤處理（提取錯誤訊息、顯示友好提示） ✅ 已實現
  - 使用現有組件模式（a-modal, a-progress, a-spin） ✅ 已實現
  - _Leverage: src/api/tasks.js_
  - _Requirements: BR2.3.7_
  - _Status: 已完成 - 在 ClientServiceConfig.vue 中實現了一次性服務保存後立即觸發任務生成的邏輯。當用戶保存一次性服務的任務配置後，系統會自動調用任務生成 API，顯示生成進度 Modal（包含進度條和狀態文字），處理生成結果（成功、錯誤、部分失敗），提供清晰的用戶反饋，並在完成後導航到服務列表頁面。任務生成正確觸發，進度顯示清晰，結果處理完善，用戶反饋明確。_

### 17.7 定期服務任務配置選項
- [x] 17.7.1 實現定期服務任務配置選項 ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue ✅ 已更新
  - Purpose: 實現定期服務的三種任務配置選項：僅為當前月份生成、保存為模板用於未來自動生成、保留設定供未來手動加入 ✅ 已實現
  - 三個任務配置選項（使用 a-radio-group） ✅ 已實現
  - 選項 1：僅為當前月份生成（current_month） ✅ 已實現
  - 選項 2：保存為模板用於未來自動生成（save_template） ✅ 已實現
  - 選項 3：保留設定供未來手動加入（retain_settings） ✅ 已實現
  - 正確設置 use_for_auto_generate 標誌 ✅ 已實現
  - 正確處理保存邏輯（根據選項分類任務） ✅ 已實現
  - 清晰的 UI（使用 radio group，帶有標籤和描述） ✅ 已實現
  - 選項變更處理（handleTaskOptionChange） ✅ 已實現
  - 數據初始化（在所有任務創建路徑中） ✅ 已實現
  - 驗證邏輯 ✅ 已實現
  - 使用現有組件模式（Ant Design Vue） ✅ 已實現
  - _Leverage: src/api/tasks.js_
  - _Requirements: BR2.3.8_
  - _Status: 已完成 - 在 TaskConfiguration.vue 中實現了定期服務的三種任務配置選項。每個任務都可以選擇：1) 僅為當前月份生成（立即生成但不保存為模板）；2) 保存為模板用於未來自動生成（use_for_auto_generate = true）；3) 保留設定供未來手動加入（use_for_auto_generate = false）。選項使用 a-radio-group 顯示，帶有清晰的標籤、描述和視覺反饋。選項變更時正確設置 use_for_auto_generate 和 _generateCurrentMonth 標誌。保存邏輯根據選項正確分類和處理任務。所有三個選項都正常工作，配置保存正確，用戶界面清晰，驗證邏輯正確。_

### 17.8 任務預覽功能實現
- [x] 17.8.1 實現任務預覽功能 ✅ 已實現
  - File: src/components/clients/TaskPreviewPanel.vue ✅ 已更新
  - Purpose: 實現任務規則變更時的即時預覽更新，確保用戶能及時看到配置效果 ✅ 已實現
  - 使用 Vue 3 computed 實現響應式預覽數據 ✅ 已實現
  - 明確訪問所有嵌套屬性以確保深度響應式追蹤 ✅ 已實現
  - 實時計算生成時間和到期日 ✅ 已實現
  - 錯誤處理（計算失敗時顯示友好錯誤訊息） ✅ 已實現
  - 性能優化（使用 dateCalculators 的記憶化緩存） ✅ 已實現
  - 改進 previewTasks computed 屬性以正確傳遞所有規則屬性 ✅ 已實現
  - _Leverage: src/utils/dateCalculators.js_
  - _Requirements: BR2.3.5_
  - _Status: 已完成 - 在 TaskPreviewPanel.vue 中實現了實時預覽更新功能。通過明確訪問所有嵌套屬性（generation_time_rule, generation_time_params, due_date_rule, due_date_params, days_due）來確保 Vue 3 的深度響應式追蹤正常工作。當用戶修改任務規則時，previewData computed 屬性會自動檢測到變化並重新計算所有任務的生成時間和到期日，實現實時預覽更新。錯誤處理確保計算失敗時不會崩潰，而是顯示友好的錯誤訊息。使用 dateCalculators 的記憶化緩存來優化性能，避免重複計算相同參數的日期。在 ClientServiceConfig.vue 中改進了 previewTasks computed 屬性，確保所有規則相關的屬性都被正確傳遞。預覽更新實時，所有計算準確，錯誤處理正常，性能得到維護。_


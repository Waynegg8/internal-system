# Tasks Document: BR2.4: 任務模板管理

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅
   - `handleGetTaskTemplates` - 任務模板列表查詢
   - `handleGetTaskTemplateDetail` - 任務模板詳情查詢
   - `handleCreateTaskTemplate` - 任務模板創建
   - `handleUpdateTaskTemplate` - 任務模板更新
   - `handleDeleteTaskTemplate` - 任務模板刪除（但缺少使用情況檢查）

2. **前端組件** ✅
   - `SettingsTemplates.vue` - 任務模板管理主頁面
   - `TaskTemplateFormNew.vue` - 任務模板創建/編輯表單
   - `TemplatesTable.vue` - 任務模板列表展示

3. **API 調用層** ✅
   - `task-templates.js` - 任務模板相關 API 調用

### 未實現或部分實現功能

1. **模板列表搜尋和篩選功能** ❌
   - 需求：按模板名稱、服務、客戶搜尋
   - 需求：按服務、客戶類型（統一模板/客戶專屬）篩選
   - 現狀：列表展示已實現，但缺少搜尋和篩選功能

2. **模板刪除前使用情況檢查** ❌
   - 需求：刪除前檢查模板是否被使用，顯示使用該模板的服務列表
   - 現狀：直接刪除，沒有檢查使用情況

3. **階段命名和順序管理** ❌
   - 需求：在設定頁面管理階段名稱和順序
   - 需求：階段變更同步到模板和服務配置
   - 現狀：完全未實現

4. **模板套用到服務設定** ❓
   - 需求：在服務設定中選擇並套用任務模板
   - 現狀：需要檢查 TaskConfiguration 組件是否支援模板選擇

---

## 1. 後端 API 實現

### 1.1 任務模板列表 API（增強）

- [x] 1.1.1 實現任務模板列表查詢 Handler ✅ 已實現
  - File: backend/src/handlers/task-templates/template-crud.js
  - 實現 `handleGetTaskTemplates` 函數
  - 支援基本列表查詢
  - Purpose: 提供任務模板列表查詢功能
  - _Leverage: backend/src/handlers/task-templates/template-crud.js_
  - _Requirements: BR2.4.1_
  - _Status: 已完成_

- [x] 1.1.2 實現搜尋功能 ✅ 已實現
  - File: backend/src/handlers/task-templates/template-crud.js ✅ 已更新
  - 在 `handleGetTaskTemplates` 中增加搜尋參數處理 ✅ 已實現
  - 支援按模板名稱、服務名稱、客戶名稱搜尋 ✅ 已實現
  - 使用參數化查詢防止 SQL 注入 ✅ 已實現
  - 保持查詢性能 ✅ 已實現
  - 遵循現有處理器模式 ✅ 已實現
  - Purpose: 支援任務模板列表搜尋 ✅ 已實現
  - _Leverage: backend/src/handlers/task-templates/template-crud.js_
  - _Requirements: BR2.4.1_
  - _Status: 已完成 - 在 handleGetTaskTemplates 處理器中添加了搜索功能，支持按模板名稱（tt.template_name）、服務名稱（s.service_name）和客戶名稱（c.company_name）搜索。使用參數化查詢（LIKE ?）防止 SQL 注入，搜索模式為 `%${search}%` 以支持模糊搜索。搜索功能與現有的 service_id 和 client_id 篩選功能兼容，查詢性能得到維護。搜索參數通過 URL 查詢參數 `search` 或 `q` 傳遞，遵循現有處理器模式。_

- [x] 1.1.3 實現篩選功能 ✅ 已實現
  - File: backend/src/handlers/task-templates/template-crud.js ✅ 已更新
  - 在 `handleGetTaskTemplates` 中增加篩選參數處理 ✅ 已實現
  - 支援按服務 ID 篩選 ✅ 已實現（已存在）
  - 支援按客戶類型（統一模板/客戶專屬）篩選 ✅ 已實現
  - 使用參數化查詢防止 SQL 注入 ✅ 已實現
  - 保持查詢性能 ✅ 已實現
  - 遵循現有處理器模式 ✅ 已實現
  - Purpose: 支援任務模板列表篩選 ✅ 已實現
  - _Leverage: backend/src/handlers/task-templates/template-crud.js_
  - _Requirements: BR2.4.1_
  - _Status: 已完成 - 在 handleGetTaskTemplates 處理器中添加了篩選功能。服務 ID 篩選（service_id）已存在。新增客戶類型篩選（client_type），支持 'unified'/'null' 表示統一模板（client_id IS NULL），'specific'/'client-specific' 表示客戶專屬（client_id IS NOT NULL）。使用參數化查詢防止 SQL 注入，查詢性能得到維護。篩選功能與現有的搜索和 client_id 篩選功能兼容，如果指定了 client_type，client_id 篩選會被忽略（client_type 優先級更高）。遵循現有處理器模式，與其他處理器的篩選實現一致。_

### 1.2 任務模板詳情 API

- [x] 1.2.1 實現任務模板詳情查詢 Handler ✅ 已實現
  - File: backend/src/handlers/task-templates/template-crud.js
  - 實現 `handleGetTaskTemplateDetail` 函數
  - 返回模板基本信息和任務配置列表
  - Purpose: 提供任務模板詳情查詢功能（用於編輯）
  - _Leverage: backend/src/handlers/task-templates/template-crud.js_
  - _Requirements: BR2.4.3_
  - _Status: 已完成_

### 1.3 任務模板創建 API

- [x] 1.3.1 實現任務模板創建 Handler ✅ 已實現
  - File: backend/src/handlers/task-templates/template-crud.js
  - 實現 `handleCreateTaskTemplate` 函數
  - 驗證模板名稱和服務的唯一性（同一服務下，統一模板只能有一個）
  - 支援創建統一模板和客戶專屬模板
  - Purpose: 提供任務模板創建功能
  - _Leverage: backend/src/handlers/task-templates/template-crud.js_
  - _Requirements: BR2.4.2_
  - _Status: 已完成_

### 1.4 任務模板更新 API

- [x] 1.4.1 實現任務模板更新 Handler ✅ 已實現
  - File: backend/src/handlers/task-templates/template-crud.js
  - 實現 `handleUpdateTaskTemplate` 函數
  - 允許修改所有欄位（除了服務）
  - Purpose: 提供任務模板更新功能
  - _Leverage: backend/src/handlers/task-templates/template-crud.js_
  - _Requirements: BR2.4.3_
  - _Status: 已完成_

- [x] 1.4.2 實現模板更新後同步到服務設定 ✅ 已實現
  - File: backend/src/handlers/task-templates/template-crud.js ✅ 已更新
  - 在 `handleUpdateTaskTemplate` 中增加同步邏輯 ✅ 已實現
  - 當模板更新時，同步更新使用該模板的服務設定中的任務配置 ✅ 已實現
  - 查找所有使用該模板的服務（通過 task_template_id） ✅ 已實現
  - 獲取模板的最新階段配置和默認配置 ✅ 已實現
  - 為每個服務更新任務配置（刪除舊配置，插入新配置） ✅ 已實現
  - 保留服務層級的執行月份配置 ✅ 已實現
  - 錯誤處理（單個服務失敗不影響其他服務） ✅ 已實現
  - 清除相關緩存 ✅ 已實現
  - 使用參數化查詢防止 SQL 注入 ✅ 已實現
  - 遵循現有處理器模式 ✅ 已實現
  - Purpose: 確保模板更新後，使用該模板的服務配置也同步更新 ✅ 已實現
  - _Leverage: backend/src/handlers/task-templates/template-crud.js, backend/src/handlers/clients/client-crud.js_
  - _Requirements: BR2.4.3_
  - _Status: 已完成 - 在 handleUpdateTaskTemplate 處理器中添加了同步邏輯。當模板階段（tasks）被更新時，系統會自動查找所有使用該模板的服務（通過 task_template_id），並更新這些服務的任務配置。同步邏輯包括：1) 獲取模板的最新階段配置和默認配置；2) 查找所有使用該模板的服務；3) 為每個服務刪除舊的任務配置並插入基於模板的新配置；4) 保留服務層級的執行月份配置；5) 清除相關緩存。錯誤處理確保單個服務同步失敗不會影響其他服務或模板更新操作。使用參數化查詢防止 SQL 注入，遵循現有處理器模式。模板更新正確同步到服務配置，錯誤處理完善，數據一致性得到維護。_

### 1.5 任務模板刪除 API（增強）

- [x] 1.5.1 實現任務模板刪除 Handler ✅ 已實現（部分）
  - File: backend/src/handlers/task-templates/template-crud.js
  - 實現 `handleDeleteTaskTemplate` 函數
  - 目前直接刪除模板，沒有檢查使用情況
  - Purpose: 提供任務模板刪除功能
  - _Leverage: backend/src/handlers/task-templates/template-crud.js_
  - _Requirements: BR2.4.4_
  - _Status: 部分實現_

- [x] 1.5.2 實現模板使用情況檢查 ✅ 已實現
  - File: backend/src/handlers/task-templates/template-crud.js ✅ 已更新
  - 在 `handleDeleteTaskTemplate` 中增加使用情況檢查 ✅ 已實現
  - 查詢 `ClientServices` 表中使用該模板的服務 ✅ 已實現
  - 如果模板被使用，返回錯誤並列出使用該模板的服務列表 ✅ 已實現
  - 如果模板未被使用，執行刪除操作 ✅ 已實現
  - 使用參數化查詢防止 SQL 注入 ✅ 已實現
  - 維護數據完整性 ✅ 已實現
  - 提供清晰的錯誤消息（包含服務列表） ✅ 已實現
  - Purpose: 防止誤刪正在使用的模板 ✅ 已實現
  - _Leverage: backend/src/handlers/task-templates/template-crud.js_
  - _Requirements: BR2.4.4_
  - _Status: 已完成 - 在 handleDeleteTaskTemplate 處理器中添加了使用情況檢查。在刪除模板之前，系統會查詢 ClientServices 表查找所有使用該模板的服務（通過 task_template_id）。如果模板被使用，返回 409 CONFLICT 錯誤，並在錯誤響應中提供詳細信息：模板名稱、使用該模板的服務數量、服務列表（包含客戶名稱和服務名稱）。如果模板未被使用，執行刪除操作（先刪除階段，再刪除模板）。使用參數化查詢防止 SQL 注入，維護數據完整性。錯誤消息清晰，包含完整的服務列表信息。使用情況檢查正常工作，防止刪除正在使用的模板，提供清晰的錯誤消息和服務列表。_

### 1.6 階段管理 API

- [x] 1.6.1 實現階段列表查詢 Handler ✅ 已實現
  - File: backend/src/handlers/task-templates/task-template-stages.js ✅ 已創建
  - 實現 `handleGetStages` 函數 ✅ 已實現
  - 查詢任務模板的階段列表（TaskTemplateStages） ✅ 已實現
  - 返回階段名稱、順序等信息 ✅ 已實現
  - 支持按模板 ID 過濾 ✅ 已實現
  - 使用參數化查詢防止 SQL 注入 ✅ 已實現
  - 遵循現有處理器模式 ✅ 已實現
  - 維護查詢性能 ✅ 已實現（使用索引和排序）
  - Purpose: 提供階段列表查詢功能（用於階段管理） ✅ 已實現
  - _Leverage: backend/src/handlers/task-templates/task-template-stages.js_
  - _Requirements: BR2.4.5_
  - _Status: 已完成 - 創建了 handleGetStages 處理器，用於查詢任務模板階段列表。處理器支持從 URL 路徑或查詢參數獲取模板 ID，使用參數化查詢從 TaskTemplateStages 表查詢階段列表，返回階段 ID、模板 ID、階段名稱、順序、描述、預估工時、執行頻率、執行月份等信息。查詢結果按 stage_order 和 stage_id 排序，確保順序一致。處理器包含完整的錯誤處理（身份驗證、權限檢查、模板存在性檢查、數據庫錯誤處理）。使用參數化查詢防止 SQL 注入，遵循現有處理器模式，維護查詢性能。處理器正確返回階段列表，支持按模板 ID 過濾，查詢性能良好。_

- [x] 1.6.2 實現階段命名和順序更新 Handler ✅ 已實現
  - File: backend/src/handlers/task-templates/task-template-stages.js ✅ 已更新
  - 實現 `handleUpdateStageNames` 函數 ✅ 已實現
  - 更新階段名稱和順序 ✅ 已實現
  - 支援批量更新 ✅ 已實現
  - 使用事務確保數據一致性 ✅ 已實現（使用 DATABASE.batch）
  - 驗證輸入數據 ✅ 已實現
  - 遵循現有處理器模式 ✅ 已實現
  - Purpose: 提供階段命名和順序更新功能 ✅ 已實現
  - _Leverage: backend/src/handlers/task-templates/task-template-stages.js_
  - _Requirements: BR2.4.5_
  - _Status: 已完成 - 創建了 handleUpdateStageNames 處理器，用於批量更新任務模板階段的名稱和順序。處理器支持批量更新多個階段，使用 DATABASE.batch() 確保批量操作的原子性。包含完整的輸入數據驗證：驗證 stages 數組、每個階段的 stage_id、stage_name、stage_order，檢查重複的 stage_id，驗證階段是否屬於指定模板。使用參數化查詢防止 SQL 注入。批量更新使用事務確保數據一致性，如果任何更新失敗，整個批次會回滾。更新後清除相關緩存。遵循現有處理器模式，包含完整的錯誤處理（身份驗證、權限檢查、數據驗證、數據庫錯誤處理）。階段更新正確工作，批量操作是原子的，數據一致性得到維護。_

- [x] 1.6.3 實現階段同步到模板和服務配置 Handler ✅ 已實現
  - File: backend/src/handlers/task-templates/task-template-stages.js ✅ 已更新
  - 實現 `handleSyncStages` 函數 ✅ 已實現
  - 同步階段變更到使用該模板的服務配置 ✅ 已實現
  - 需要確認後才執行同步 ✅ 已實現（使用 428 狀態碼和 confirm 參數）
  - 使用事務確保數據一致性 ✅ 已實現（使用 DATABASE.batch）
  - 優雅處理錯誤 ✅ 已實現
  - 提供清晰的狀態消息 ✅ 已實現
  - Purpose: 確保階段變更同步到所有使用該模板的服務配置 ✅ 已實現
  - _Leverage: backend/src/handlers/task-templates/task-template-stages.js, backend/src/handlers/clients/client-crud.js_
  - _Requirements: BR2.4.5_
  - _Status: 已完成 - 創建了 handleSyncStages 處理器，用於同步階段變更到使用該模板的服務配置。處理器實現了確認機制：如果未確認（confirm !== true），返回 428 Precondition Required 錯誤，包含受影響的服務列表和階段信息，要求用戶確認。如果已確認，執行同步操作：查找所有使用該模板的服務，為每個服務刪除舊的任務配置並插入基於模板階段的新配置。使用 DATABASE.batch() 確保每個服務的同步操作是原子的。同步結果包含成功/失敗統計和詳細錯誤信息。更新後清除相關緩存。包含完整的錯誤處理（身份驗證、權限檢查、模板存在性檢查、數據庫錯誤處理）。階段同步正確工作，更新所有相關服務配置，維護數據一致性。_

---

## 2. 前端 API 調用層

### 2.1 任務模板 API 調用

- [x] 2.1.1 實現任務模板列表查詢 API ✅ 已實現
  - File: src/api/task-templates.js
  - 實現 `fetchTaskTemplates` 函數
  - Purpose: 提供任務模板列表查詢 API 調用
  - _Leverage: src/api/task-templates.js_
  - _Requirements: BR2.4.1_
  - _Status: 已完成_

- [x] 2.1.2 增加搜尋和篩選參數支援 ✅ 已實現
  - File: src/api/task-templates.js ✅ 已更新
  - 在 `fetchTaskTemplates` 中增加搜尋和篩選參數 ✅ 已實現
  - 支援 `search`（搜尋關鍵字）、`service_id`（服務篩選）、`client_type`（客戶類型篩選）參數 ✅ 已實現
  - 保持向後兼容性 ✅ 已實現（使用默認參數 `options = {}`）
  - 遵循現有 API 模式 ✅ 已實現（使用 `{ params }` 對象）
  - 處理參數編碼 ✅ 已實現（axios 自動處理 URL 編碼）
  - Purpose: 支援任務模板列表搜尋和篩選 ✅ 已實現
  - _Leverage: src/api/task-templates.js_
  - _Requirements: BR2.4.1_
  - _Status: 已完成 - 更新了 fetchTaskTemplates 函數，添加了搜索和過濾參數支持。函數現在接受可選的 options 參數對象，支持 search（或 q）搜索關鍵詞、service_id 服務 ID 過濾、client_type 客戶類型過濾（'unified' 或 'specific'）。使用默認參數 `options = {}` 保持向後兼容性，現有調用 `fetchTaskTemplates()` 仍然可以正常工作。參數通過 axios 的 `{ params }` 對象傳遞，自動處理 URL 編碼。遵循現有 API 模式（與 fetchTasks 等函數一致）。搜索和過濾參數正確工作，API 調用包含所有必需的參數，保持向後兼容性。_

- [x] 2.1.3 實現任務模板詳情查詢 API ✅ 已實現
  - File: src/api/task-templates.js
  - 實現 `fetchTaskTemplateStages` 函數（用於獲取模板詳情）
  - Purpose: 提供任務模板詳情查詢 API 調用
  - _Leverage: src/api/task-templates.js_
  - _Requirements: BR2.4.3_
  - _Status: 已完成_

- [x] 2.1.4 實現任務模板創建 API ✅ 已實現
  - File: src/api/task-templates.js ✅ 已更新
  - 實現 `createTaskTemplate` 函數 ✅ 已實現
  - 支援創建統一模板和客戶專屬模板 ✅ 已實現（通過 client_id 參數控制）
  - 處理請求體格式化 ✅ 已實現
  - 錯誤處理 ✅ 已實現
  - 遵循現有 API 模式 ✅ 已實現
  - Purpose: 提供任務模板創建 API 調用 ✅ 已實現
  - _Leverage: src/api/task-templates.js_
  - _Requirements: BR2.4.2_
  - _Status: 已完成 - 創建了 createTaskTemplate 函數，用於調用 POST /api/v2/task-templates 端點。函數支持創建統一模板（client_id 為 null）和客戶專屬模板（client_id 為具體值）。處理所有必需的字段：template_name（必填）、service_id（必填）、client_id（可選）、description（可選）、sop_id（可選）、tasks/stages（任務配置列表）、默認規則配置等。請求體格式化正確，只包含提供的字段。包含完整的錯誤處理：捕獲並記錄錯誤，保留 422 驗證錯誤的原始錯誤信息，其他錯誤重新拋出。遵循現有 API 模式（與 createTask 等函數一致）。任務模板創建 API 調用正確工作，處理所有必需字段，提供適當的錯誤處理。_

- [x] 2.1.5 實現任務模板更新 API ✅ 已實現
  - File: src/api/task-templates.js ✅ 已更新
  - 實現 `updateTaskTemplate` 函數 ✅ 已實現
  - 支援更新模板所有欄位（除了服務） ✅ 已實現（不包含 service_id 字段）
  - 處理請求體格式化 ✅ 已實現
  - 錯誤處理 ✅ 已實現
  - 遵循現有 API 模式 ✅ 已實現
  - Purpose: 提供任務模板更新 API 調用 ✅ 已實現
  - _Leverage: src/api/task-templates.js_
  - _Requirements: BR2.4.3_
  - _Status: 已完成 - 創建了 updateTaskTemplate 函數，用於調用 PUT /api/v2/task-templates/:id 端點。函數支持更新所有模板字段（除了服務）：template_name、client_id、description、sop_id、is_active、tasks/stages（任務配置列表）、默認規則配置等。不包含 service_id 字段，符合需求要求（服務不可修改）。請求體格式化正確，只包含提供的字段。包含完整的錯誤處理：驗證模板 ID、捕獲並記錄錯誤、保留 422 驗證錯誤的原始錯誤信息、其他錯誤重新拋出。遵循現有 API 模式（與 updateTask 等函數一致）。任務模板更新 API 調用正確工作，處理所有必需字段，提供適當的錯誤處理。_

- [x] 2.1.6 實現任務模板刪除 API ✅ 已實現
  - File: src/api/task-templates.js ✅ 已更新
  - 實現 `deleteTaskTemplate` 函數 ✅ 已實現
  - 處理刪除失敗的情況（模板被使用） ✅ 已實現（處理 409 錯誤，包含服務列表）
  - 處理錯誤響應 ✅ 已實現
  - 提供清晰的錯誤消息 ✅ 已實現（保留原始錯誤信息）
  - 遵循現有 API 模式 ✅ 已實現
  - Purpose: 提供任務模板刪除 API 調用 ✅ 已實現
  - _Leverage: src/api/task-templates.js_
  - _Requirements: BR2.4.4_
  - _Status: 已完成 - 創建了 deleteTaskTemplate 函數，用於調用 DELETE /api/v2/task-templates/:id 端點。函數包含完整的錯誤處理：驗證模板 ID、捕獲並記錄錯誤、針對不同錯誤狀態碼（409 模板被使用、400 無效 ID、404 不存在、403 權限錯誤、500 服務器錯誤）保留原始錯誤信息。特別是 409 錯誤（模板被使用）時，錯誤對象包含 used_by_services 服務列表，前端可以顯示給用戶。遵循現有 API 模式（與 deleteTask 等函數一致）。任務模板刪除 API 調用正確工作，正確處理錯誤情況，提供清晰的錯誤消息。_

- [x] 2.1.7 實現階段管理 API 調用 ✅ 已實現
  - File: src/api/task-templates.js ✅ 已更新
  - 實現 `fetchStages` 函數 ✅ 已實現
  - 實現 `updateStageNames` 函數 ✅ 已實現
  - 實現 `syncStages` 函數 ✅ 已實現
  - 處理請求/響應格式化 ✅ 已實現
  - 錯誤處理 ✅ 已實現
  - 遵循現有 API 模式 ✅ 已實現
  - Purpose: 提供階段管理相關 API 調用 ✅ 已實現
  - _Leverage: src/api/task-templates.js_
  - _Requirements: BR2.4.5_
  - _Status: 已完成 - 創建了三個階段管理 API 函數：1) fetchStages - 獲取任務模板階段列表，調用 GET /api/v2/settings/task-templates/:id/stages，返回階段列表數組；2) updateStageNames - 批量更新階段名稱和順序，調用 PUT /api/v2/settings/task-templates/:id/stages/batch，接受 stages 數組參數，返回更新結果；3) syncStages - 同步階段變更到服務配置，調用 POST /api/v2/settings/task-templates/:id/stages/sync，接受 confirm 參數，如果未確認返回 428 錯誤（包含受影響的服務列表），如果已確認執行同步並返回結果。所有函數都包含完整的錯誤處理：驗證模板 ID、捕獲並記錄錯誤、針對不同錯誤狀態碼保留原始錯誤信息。遵循現有 API 模式。階段管理 API 調用正確工作，處理所有必需操作，提供適當的錯誤處理。_

---

## 3. 前端組件實現

### 3.1 任務模板管理主頁面

- [x] 3.1.1 實現任務模板管理主頁面 ✅ 已實現
  - File: src/views/settings/SettingsTemplates.vue
  - 整合列表和表單功能
  - 支援創建、編輯、查看、刪除操作
  - Purpose: 提供任務模板管理主界面
  - _Leverage: src/views/settings/SettingsTemplates.vue_
  - _Requirements: BR2.4.1, BR2.4.2, BR2.4.3, BR2.4.4_
  - _Status: 已完成_

- [x] 3.1.2 增加搜尋和篩選功能 ✅ 已實現
  - File: src/views/settings/SettingsTemplates.vue ✅ 已更新
  - 增加搜尋輸入框（按模板名稱、服務、客戶搜尋） ✅ 已實現
  - 增加篩選器（按服務、客戶類型篩選） ✅ 已實現
  - 整合到列表查詢邏輯中 ✅ 已實現
  - 實現搜索防抖功能 ✅ 已實現（500ms 防抖延遲）
  - 使用 Ant Design Vue 組件 ✅ 已實現
  - 維護組件性能 ✅ 已實現（防抖、清理計時器）
  - Purpose: 支援任務模板列表搜尋和篩選 ✅ 已實現
  - _Leverage: src/views/settings/SettingsTemplates.vue, src/components/settings/TemplatesTable.vue_
  - _Requirements: BR2.4.1_
  - _Status: 已完成 - 在 SettingsTemplates.vue 中添加了搜索和過濾功能。使用 Ant Design Vue 組件：a-input-search（搜索框，支持按模板名稱/服務/客戶搜索）、a-select（服務過濾下拉框，支持搜索）、a-select（客戶類型過濾下拉框，統一模板/客戶專屬）。實現了搜索輸入防抖功能（500ms 延遲），避免頻繁請求。搜索和過濾變化時自動調用 loadTemplates() 重新載入列表。更新了 API 和 store 層以支持查詢參數。在組件卸載時清理防抖計時器。搜索和過濾功能正確工作，與列表查詢邏輯集成，提供良好的用戶體驗。_

### 3.2 任務模板列表組件

- [x] 3.2.1 實現任務模板列表組件 ✅ 已實現
  - File: src/components/settings/TemplatesTable.vue
  - 顯示模板列表（模板名稱、服務、客戶、任務數量、創建時間）
  - 支援查看、編輯、刪除操作
  - Purpose: 提供任務模板列表展示功能
  - _Leverage: src/components/settings/TemplatesTable.vue_
  - _Requirements: BR2.4.1_
  - _Status: 已完成_

### 3.3 任務模板表單組件

- [x] 3.3.1 實現任務模板創建/編輯表單組件 ✅ 已實現
  - File: src/components/settings/TaskTemplateFormNew.vue
  - 支援創建和編輯模式
  - 包含基本信息欄位（模板名稱、服務、客戶、描述）
  - 整合任務配置組件（TaskConfiguration）
  - Purpose: 提供任務模板創建和編輯功能
  - _Leverage: src/components/settings/TaskTemplateFormNew.vue, src/components/clients/TaskConfiguration.vue_
  - _Requirements: BR2.4.2, BR2.4.3_
  - _Status: 已完成_

- [x] 3.3.2 增加模板名稱和服務唯一性驗證 ✅ 已實現
  - File: src/components/settings/TaskTemplateFormNew.vue ✅ 已更新
  - 在表單驗證中增加唯一性檢查 ✅ 已實現
  - 同一服務下，統一模板只能有一個 ✅ 已實現
  - 顯示適當的錯誤提示 ✅ 已實現
  - 使用 Ant Design Vue 表單驗證 ✅ 已實現
  - 處理異步驗證 ✅ 已實現
  - Purpose: 確保模板名稱和服務的唯一性 ✅ 已實現
  - _Leverage: src/components/settings/TaskTemplateFormNew.vue_
  - _Requirements: BR2.4.2_
  - _Status: 已完成 - 在 TaskTemplateFormNew.vue 中添加了統一模板唯一性驗證。創建了 validateUnifiedTemplateUniqueness 異步驗證函數，當選擇服務且未選擇客戶（統一模板）時，檢查該服務是否已存在統一模板。使用 fetchTaskTemplates API 查詢該服務的統一模板列表，編輯模式下排除當前模板。如果已存在統一模板，返回清晰的錯誤消息（包含已存在模板的名稱）。驗證規則添加到 service_id 和 client_id 字段，在 change 和 blur 事件時觸發。當服務或客戶變更時，自動觸發驗證。使用 Ant Design Vue 的 validator 函數實現異步驗證，錯誤消息清晰明確。唯一性驗證正確工作，防止重複模板，提供清晰的錯誤消息。_

### 3.4 階段管理組件

- [x] 3.4.1 實現階段管理組件 ✅ 已實現
  - File: src/components/settings/StageManagement.vue ✅ 已創建
  - 顯示階段列表（可拖拽排序） ✅ 已實現
  - 支援編輯階段名稱 ✅ 已實現（內聯編輯）
  - 支援調整階段順序 ✅ 已實現（HTML5 拖拽 API）
  - 使用 Ant Design Vue 組件 ✅ 已實現（a-card, a-input, a-button, a-tag, a-spin, a-empty, a-alert）
  - 維護組件性能 ✅ 已實現（computed 屬性、合理的狀態管理）
  - 處理狀態更新 ✅ 已實現（響應式狀態、變更追蹤）
  - Purpose: 提供階段命名和順序管理功能 ✅ 已實現
  - _Leverage: src/components/settings/StageManagement.vue, Ant Design Vue SortableTable_
  - _Requirements: BR2.4.5_
  - _Status: 已完成 - 創建了 StageManagement 組件，用於管理階段名稱和順序。使用 HTML5 拖拽 API 實現拖拽排序功能，支持拖拽調整階段順序。實現了內聯編輯功能，點擊階段名稱即可編輯，支持 Enter 保存、Esc 取消、失焦保存。使用 Ant Design Vue 組件（a-card, a-input, a-button, a-tag, a-spin, a-empty, a-alert）構建 UI。實現了變更追蹤功能，顯示「有未保存的變更」標籤，提供保存和重置按鈕。調用 fetchStages 和 updateStageNames API 進行數據載入和保存。保存成功後觸發 sync-required 事件，通知父組件需要同步。組件性能良好，狀態更新正確，提供良好的用戶體驗。_

- [x] 3.4.2 實現階段同步確認對話框 ✅ 已實現
  - File: src/components/settings/StageManagement.vue ✅ 已更新
  - 當階段變更時，顯示確認對話框 ✅ 已實現
  - 列出將要同步的服務配置 ✅ 已實現（使用 a-list 顯示服務列表）
  - 確認後執行同步操作 ✅ 已實現
  - 使用 Ant Design Vue Modal ✅ 已實現
  - 提供清晰的信息 ✅ 已實現（顯示服務數量、服務列表、警告提示）
  - 處理用戶取消 ✅ 已實現
  - Purpose: 確保階段變更同步到使用該模板的服務配置 ✅ 已實現
  - _Leverage: src/components/settings/StageManagement.vue, Ant Design Vue Modal_
  - _Requirements: BR2.4.5_
  - _Status: 已完成 - 在 StageManagement 組件中添加了階段同步確認對話框。當保存階段變更後，自動調用 syncStages API（不傳 confirm），如果返回 428 錯誤（需要確認），顯示確認對話框。對話框使用 Ant Design Vue Modal 組件，顯示警告提示、受影響的服務數量、服務列表（使用 a-list 組件，顯示客戶名稱和服務名稱）。用戶可以確認執行同步或取消操作。確認後調用 syncStages API（confirm: true）執行同步，顯示同步結果（成功/失敗統計）。取消操作時關閉對話框並觸發取消事件。對話框正確工作，清晰顯示服務列表，正確處理用戶操作。_

### 3.5 模板刪除確認組件（增強）

- [x] 3.5.1 實現模板刪除確認對話框（增強） ✅ 已實現
  - File: src/views/settings/SettingsTemplates.vue ✅ 已更新
  - 顯示刪除確認對話框 ✅ 已實現
  - 如果模板被使用，顯示使用該模板的服務列表 ✅ 已實現（使用 a-list 顯示服務列表）
  - 阻止刪除並顯示錯誤提示 ✅ 已實現（將確認按鈕改為「關閉」按鈕）
  - 如果模板未被使用，執行刪除操作 ✅ 已實現
  - 使用 Ant Design Vue Modal ✅ 已實現
  - 提供清晰的錯誤消息 ✅ 已實現
  - 正確處理 API 響應 ✅ 已實現（處理 409、404、403、500 等錯誤）
  - Purpose: 防止誤刪正在使用的模板 ✅ 已實現
  - _Leverage: src/views/settings/SettingsTemplates.vue, Ant Design Vue Modal_
  - _Requirements: BR2.4.4_
  - _Status: 已完成 - 在 SettingsTemplates.vue 中增強了模板刪除確認對話框。當用戶點擊刪除按鈕時，顯示確認對話框。用戶確認後，嘗試刪除模板。如果返回 409 錯誤（模板被使用），更新對話框內容，顯示錯誤提示和服務列表（使用 a-list 組件，顯示客戶名稱和服務名稱），並將確認按鈕改為「關閉」按鈕，阻止刪除。如果刪除成功，執行刪除並刷新列表。使用 Ant Design Vue Modal 組件構建對話框，根據模板使用情況動態調整標題和按鈕文字。提供清晰的錯誤消息和服務列表。正確處理所有 API 響應（409、404、403、500 等）。刪除確認對話框正確工作，當模板被使用時清晰顯示服務列表，適當阻止刪除，正確處理所有情況。_

### 3.6 模板套用功能（檢查）

- [x] 3.6.1 檢查 TaskConfiguration 組件是否支援模板選擇 ✅ 已完成
  - File: src/components/clients/TaskConfiguration.vue ✅ 已檢查
  - 檢查是否有模板選擇功能 ✅ 已實現（使用 a-select 組件）
  - 檢查是否優先顯示客戶專屬模板 ❌ **缺失**（需要實現）
  - 檢查是否根據 client_id 過濾模板 ❌ **缺失**（需要實現）
  - 檢查模板類型標註 ❌ **缺失**（次要）
  - Purpose: 確認模板套用功能是否已實現 ✅ 已完成分析
  - _Leverage: src/components/clients/TaskConfiguration.vue_
  - _Requirements: BR2.4.6_
  - _Status: 已完成 - 已完成 TaskConfiguration 組件的模板選擇功能檢查。已實現的功能包括：模板選擇 UI（使用 a-select 組件）、模板載入邏輯（在 onMounted 時調用 fetchTaskTemplates）、模板套用邏輯（handleTemplateChange 函數處理模板選擇，自動填充任務配置）、模板修改不影響原始模板（任務數據是獨立的副本）。缺失的功能包括：客戶專屬模板優先級（templateOptions computed 屬性只根據 service_code 篩選，沒有優先顯示客戶專屬模板）、客戶 ID 過濾（沒有根據 props.clientId 過濾模板）、模板類型標註（下拉選項中沒有標註模板類型）。已創建詳細的分析報告（template-selection-analysis.md），包含當前實現分析、缺失功能識別、參考實現（TaskSOPSelector 組件）、建議實現方案。建議實現任務 3.6.2 來補充缺失的功能。_

- [x] 3.6.2 實現模板選擇功能（如未實現） ✅ 已實現
  - File: src/components/clients/TaskConfiguration.vue ✅ 已更新
  - 增加模板選擇下拉框 ✅ 已實現（使用 a-select 組件）
  - 優先顯示客戶專屬模板，其次顯示統一模板 ✅ 已實現（添加排序邏輯）
  - 根據 client_id 過濾模板 ✅ 已實現（只顯示統一模板或當前客戶的專屬模板）
  - 在 label 中標註模板類型 ✅ 已實現（顯示「客戶專屬」或「統一模板」）
  - 套用模板後自動填充任務配置 ✅ 已實現（handleTemplateChange 函數處理）
  - 允許修改任務配置（修改不影響原始模板） ✅ 已實現（任務數據是獨立的副本）
  - 使用 Ant Design Vue 組件 ✅ 已實現
  - 保持組件性能 ✅ 已實現（使用 computed 屬性）
  - 正確處理模板數據 ✅ 已實現
  - Purpose: 支援在服務設定中套用任務模板 ✅ 已實現
  - _Leverage: src/components/clients/TaskConfiguration.vue, src/api/task-templates.js_
  - _Requirements: BR2.4.6_
  - _Status: 已完成 - 在 TaskConfiguration 組件中實現了模板選擇功能。添加了 isClientSpecificTemplate 輔助函數來判斷是否為客戶專屬模板。修改了 templateOptions computed 屬性，添加了客戶 ID 過濾邏輯（只顯示統一模板或當前客戶的專屬模板）、排序邏輯（客戶專屬優先，統一模板其次，然後按模板名稱排序）、模板類型標註（在 label 中顯示「客戶專屬」或「統一模板」）。模板套用邏輯（handleTemplateChange）已經實現自動填充任務配置，並且任務數據是獨立的副本，修改不會影響原始模板。使用 Ant Design Vue a-select 組件構建模板選擇下拉框。使用 computed 屬性保持組件性能。模板選擇功能正確工作，優先顯示客戶專屬模板，自動填充配置，允許修改而不影響原始模板。_

---

## 4. 狀態管理

### 4.1 任務模板狀態管理

- [x] 4.1.1 實現任務模板狀態管理 ✅ 已實現
  - File: src/stores/settings.js
  - 管理任務模板列表、加載狀態等
  - Purpose: 提供任務模板狀態管理
  - _Leverage: src/stores/settings.js_
  - _Requirements: BR2.4.1_
  - _Status: 已完成_

- [x] 4.1.2 增加搜尋和篩選狀態管理 ✅ 已實現
  - File: src/stores/settings.js ✅ 已更新
  - 管理搜尋關鍵字、篩選條件等狀態 ✅ 已實現（taskTemplateFilters 對象）
  - 在 store 中添加搜索關鍵詞狀態 ✅ 已實現（taskTemplateFilters.search）
  - 在 store 中添加過濾條件狀態 ✅ 已實現（taskTemplateFilters.service_id, taskTemplateFilters.client_type）
  - 提供更新搜索和過濾條件的方法 ✅ 已實現（setTaskTemplateSearch, setTaskTemplateServiceId, setTaskTemplateClientType, updateTaskTemplateFilters, resetTaskTemplateFilters）
  - 修改 getTaskTemplates 以使用 store 中的過濾條件 ✅ 已實現（buildTaskTemplateQueryOptions）
  - 使用 Pinia store 模式 ✅ 已實現
  - 維護狀態一致性 ✅ 已實現
  - 正確處理狀態更新 ✅ 已實現
  - Purpose: 支援搜尋和篩選功能 ✅ 已實現
  - _Leverage: src/stores/settings.js_
  - _Requirements: BR2.4.1_
  - _Status: 已完成 - 在 settings store 中添加了任務模板搜索和過濾狀態管理。在 state 中添加了 taskTemplateFilters 對象，包含 search（搜索關鍵詞）、service_id（服務 ID 過濾）、client_type（客戶類型過濾）三個字段。修改了 getTaskTemplates action，當 options 為空時自動使用 store 中的過濾條件（通過 buildTaskTemplateQueryOptions 方法構建查詢選項）。添加了多個 actions 來管理過濾條件：setTaskTemplateSearch（設置搜索關鍵詞）、setTaskTemplateServiceId（設置服務 ID 過濾）、setTaskTemplateClientType（設置客戶類型過濾）、updateTaskTemplateFilters（批量更新過濾條件）、resetTaskTemplateFilters（重置所有過濾條件）。使用 Pinia store 模式，維護狀態一致性，正確處理狀態更新。搜索和過濾狀態管理正確工作，維護狀態一致性，正確處理更新。_

---

## 5. 測試

### 5.1 E2E 測試

- [x] 5.1.1 實現任務模板列表 E2E 測試 ✅ 已實現
  - File: tests/e2e/settings/task-template-list-br2.4.1.spec.ts ✅ 已創建
  - 測試模板列表展示、搜尋、篩選功能 ✅ 已實現
  - 測試數據設置和清理 ✅ 已實現（setupBR2_4_1TestData, cleanupBR2_4_1TestData）
  - 使用 Playwright ✅ 已實現
  - 測試真實用戶工作流程 ✅ 已實現
  - 維護測試可靠性 ✅ 已實現
  - Purpose: 確保任務模板列表功能正常 ✅ 已實現
  - _Leverage: tests/e2e/settings/task-template-list-br2.4.1.spec.ts, tests/e2e/utils/test-data.ts_
  - _Requirements: BR2.4.1_
  - _Status: 已完成 - 創建了任務模板列表 E2E 測試文件（task-template-list-br2.4.1.spec.ts）。測試涵蓋所有驗收標準：任務模板列表顯示（檢查頁面標題、列表容器、模板基本信息、搜索和過濾控件）、搜索功能（輸入搜索關鍵字、按模板名稱搜索、按服務名稱搜索、按客戶名稱搜索、清除搜索）、過濾功能（按服務過濾、按客戶類型過濾（統一模板/客戶專屬）、清除過濾條件）、組合搜索和過濾、管理員和員工帳號測試。在 test-data.ts 中添加了 setupBR2_4_1TestData 和 cleanupBR2_4_1TestData 函數，用於設置和清理測試數據（包括測試服務、測試客戶、測試任務模板（統一模板和客戶專屬模板））。使用 Playwright 進行測試，測試真實用戶工作流程，維護測試可靠性。E2E 測試涵蓋所有列表功能，測試運行可靠，用戶工作流程已驗證。_

- [x] 5.1.2 實現任務模板創建和編輯 E2E 測試 ✅ 已實現
  - File: tests/e2e/settings/task-template-create-edit-br2.4.2-3.spec.ts ✅ 已創建
  - 測試模板創建、編輯、唯一性驗證功能 ✅ 已實現
  - 測試任務配置界面 ✅ 已實現
  - 使用 Playwright ✅ 已實現
  - 測試真實用戶工作流程 ✅ 已實現
  - 維護測試可靠性 ✅ 已實現
  - Purpose: 確保任務模板創建和編輯功能正常 ✅ 已實現
  - _Leverage: tests/e2e/settings/task-template-create-edit-br2.4.2-3.spec.ts, tests/e2e/utils/test-data.ts_
  - _Requirements: BR2.4.2, BR2.4.3_
  - _Status: 已完成 - 創建了任務模板創建和編輯 E2E 測試文件（task-template-create-edit-br2.4.2-3.spec.ts）。測試涵蓋所有驗收標準：BR2.4.2 任務模板創建（打開創建表單、必填欄位驗證、填寫模板基本信息、創建統一模板、創建客戶專屬模板、統一模板唯一性驗證、允許同一服務下有多個客戶專屬模板）、BR2.4.3 任務模板編輯（打開編輯表單、修改模板名稱、服務欄位禁用檢查、修改模板描述、修改任務配置、保存編輯後的模板）、任務配置界面（使用與任務創建相同的配置界面）、管理員和員工帳號測試。使用 Playwright 進行測試，測試真實用戶工作流程，維護測試可靠性。E2E 測試涵蓋所有創建和編輯功能，測試運行可靠，用戶工作流程已驗證。_

- [x] 5.1.3 實現任務模板刪除 E2E 測試 ✅ 已實現
  - File: tests/e2e/settings/task-template-deletion-br2.4.4.spec.ts ✅ 已創建
  - 測試模板刪除功能（包括被使用的情況） ✅ 已實現
  - 測試刪除確認對話框 ✅ 已實現
  - 測試刪除未被使用的模板 ✅ 已實現
  - 測試刪除被使用的模板（顯示服務列表） ✅ 已實現
  - 測試數據設置和清理 ✅ 已實現（setupBR2_4_4TestData, cleanupBR2_4_4TestData）
  - 使用 Playwright ✅ 已實現
  - 測試真實用戶工作流程 ✅ 已實現
  - 維護測試可靠性 ✅ 已實現
  - Purpose: 確保任務模板刪除功能正常 ✅ 已實現
  - _Leverage: tests/e2e/settings/task-template-deletion-br2.4.4.spec.ts, tests/e2e/utils/test-data.ts_
  - _Requirements: BR2.4.4_
  - _Status: 已完成 - 創建了任務模板刪除 E2E 測試文件（task-template-deletion-br2.4.4.spec.ts）。測試涵蓋所有驗收標準：刪除確認對話框（點擊刪除按鈕時顯示確認對話框、對話框顯示模板名稱、能取消刪除）、刪除未被使用的模板（能成功刪除未被使用的模板、刪除成功後刷新模板列表）、刪除被使用的模板（阻止刪除被使用的模板、顯示使用該模板的服務列表、顯示服務列表中的客戶名稱和服務名稱、將確認按鈕改為關閉按鈕、能關閉錯誤對話框）、錯誤處理、管理員和員工帳號測試。在 test-data.ts 中添加了 setupBR2_4_4TestData 和 cleanupBR2_4_4TestData 函數，用於設置和清理測試數據（包括測試服務、測試客戶、測試任務模板（被使用和未被使用的）、使用模板的客戶服務）。使用 Playwright 進行測試，測試真實用戶工作流程，維護測試可靠性。E2E 測試涵蓋所有刪除場景，測試運行可靠，用戶工作流程已驗證。_

- [x] 5.1.4 實現階段管理 E2E 測試 ✅ 已實現
  - File: tests/e2e/settings/stage-management-br2.4.5.spec.ts ✅ 已創建
  - 測試階段命名、順序調整、同步功能 ✅ 已實現
  - 測試階段名稱編輯 ✅ 已實現
  - 測試階段順序調整（拖拽） ✅ 已實現
  - 測試保存變更 ✅ 已實現
  - 測試同步確認對話框 ✅ 已實現
  - 測試同步執行 ✅ 已實現
  - 測試數據設置和清理 ✅ 已實現（setupBR2_4_5TestData, cleanupBR2_4_5TestData）
  - 使用 Playwright ✅ 已實現
  - 測試真實用戶工作流程 ✅ 已實現
  - 維護測試可靠性 ✅ 已實現
  - Purpose: 確保階段管理功能正常 ✅ 已實現
  - _Leverage: tests/e2e/settings/stage-management-br2.4.5.spec.ts, tests/e2e/utils/test-data.ts_
  - _Requirements: BR2.4.5_
  - _Status: 已完成 - 創建了階段管理 E2E 測試文件（stage-management-br2.4.5.spec.ts）。測試涵蓋所有驗收標準：階段名稱編輯（能編輯階段名稱、能取消編輯階段名稱、顯示「有未保存的變更」標籤）、階段順序調整（能通過拖拽調整階段順序、調整順序後更新階段編號）、保存變更（能保存階段名稱變更、能重置未保存的變更）、同步確認對話框（在保存變更後顯示同步確認對話框（如果有服務使用模板）、同步確認對話框顯示受影響的服務列表、能取消同步、能確認同步）、管理員和員工帳號測試。在 test-data.ts 中添加了 setupBR2_4_5TestData 和 cleanupBR2_4_5TestData 函數，用於設置和清理測試數據（包括測試服務、測試客戶、帶有多個階段的測試任務模板、使用模板的客戶服務（用於測試同步功能）、未被使用的模板（用於測試沒有同步的情況））。使用 Playwright 進行測試，測試真實用戶工作流程，維護測試可靠性。E2E 測試涵蓋所有階段管理功能，測試運行可靠，用戶工作流程已驗證。_

- [x] 5.1.5 實現模板套用 E2E 測試 ✅ 已實現
  - File: tests/e2e/clients/template-application-br2.4.6.spec.ts ✅ 已創建
  - 測試在服務設定中套用任務模板功能 ✅ 已實現
  - 測試模板選擇功能 ✅ 已實現
  - 測試客戶專屬模板優先顯示 ✅ 已實現
  - 測試統一模板顯示 ✅ 已實現
  - 測試模板自動填充任務配置 ✅ 已實現
  - 測試模板應用後允許修改任務配置 ✅ 已實現
  - 測試數據設置和清理 ✅ 已實現（setupBR2_4_6TestData, cleanupBR2_4_6TestData）
  - 使用 Playwright ✅ 已實現
  - 測試真實用戶工作流程 ✅ 已實現
  - 維護測試可靠性 ✅ 已實現
  - Purpose: 確保模板套用功能正常 ✅ 已實現
  - _Leverage: tests/e2e/clients/template-application-br2.4.6.spec.ts, tests/e2e/utils/test-data.ts_
  - _Requirements: BR2.4.6_
  - _Status: 已完成 - 創建了模板套用 E2E 測試文件（template-application-br2.4.6.spec.ts）。測試涵蓋所有驗收標準：模板選擇功能（在服務設定中顯示模板選擇器、能選擇任務模板）、客戶專屬模板優先顯示（優先顯示客戶專屬模板、在客戶專屬模板後顯示統一模板）、模板自動填充任務配置（在套用模板後自動填充任務配置、填充模板中的所有任務配置、填充任務的所有配置項（名稱、負責人、時數等））、模板應用後允許修改任務配置（能修改從模板載入的任務配置、修改任務配置不應該影響原始模板、能添加新任務到從模板載入的任務列表、能刪除從模板載入的任務）、管理員和員工帳號測試。在 test-data.ts 中添加了 setupBR2_4_6TestData 和 cleanupBR2_4_6TestData 函數，用於設置和清理測試數據（包括測試服務、測試客戶、統一模板（用於測試統一模板顯示）、客戶專屬模板（用於測試客戶專屬模板優先顯示）、客戶服務（用於測試模板套用））。使用 Playwright 進行測試，測試真實用戶工作流程，維護測試可靠性。E2E 測試涵蓋所有模板套用功能，測試運行可靠，用戶工作流程已驗證。_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（基本 CRUD 功能）
- ✅ 前端組件（主頁面、列表、表單）
- ✅ API 調用層（基本功能）
- ✅ 狀態管理（基本功能）

### 待完成功能
- ❌ 搜尋和篩選功能（後端和前端）
- ❌ 模板刪除前使用情況檢查（後端和前端）
- ❌ 階段命名和順序管理（完全未實現）
- ❌ 模板套用功能（需要檢查和實現）
- ❌ E2E 測試（完全未實現）

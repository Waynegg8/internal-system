# Tasks Document: BR2.1: 任務列表

## 1.0 後端 API 開發

### 1.1 任務列表 API Handler 增強

#### 1.1.1 增強任務列表查詢邏輯（可開始狀態和逾期計算）
- [x] 已實現：handleGetTasks 基本查詢邏輯已存在（backend/src/handlers/tasks/task-crud.js）
- [x] 1.1.1.1 實現任務可開始狀態計算邏輯
  - 實現任務可開始判斷邏輯（所有前置階段的所有任務都必須是「已完成」狀態，已取消不計入已完成） ✅ 已實現
  - 實現逾期任務判斷邏輯（到期日小於當前日期，且狀態不是「已完成」或「已取消」） ✅ 已實現
  - 實現總階段數計算（用於顯示「階段X/Y」） ✅ 已實現
  - _Leverage: backend/src/handlers/tasks/task-crud.js, backend/src/utils/response.js_
  - _Requirements: BR2.1.1, BR2.1.2_
  - _Status: 已完成 - 已增強 handleGetTasks 函數，實現 can_start、is_overdue 和 total_stages 計算_

#### 1.1.2 增強任務篩選邏輯（可開始篩選）
- [x] 1.1.2.1 實現可開始篩選參數
  - 在 handleGetTasks 中添加 can_start 篩選支持 ✅ 已實現
  - 支援篩選「可開始」或「不可開始」的任務 ✅ 已實現
  - _Requirements: BR2.1.2_
  - _Leverage: backend/src/handlers/tasks/task-crud.js_
  - _Status: 已完成 - 已添加 can_start 參數支持，使用與 SELECT 相同的邏輯在 WHERE 條件中篩選_

### 1.2 統計摘要 API Handler

#### 1.2.1 實現統計摘要 API
- [x] 1.2.1.1 創建 task-stats.js Handler
  - File: backend/src/handlers/tasks/task-stats.js ✅ 已創建
  - Function: handleGetTasksStats ✅ 已實現
  - 實現統計摘要計算（總任務數、進行中、已完成、逾期、可開始） ✅ 已實現
  - 實現按篩選條件計算統計（支援與任務列表相同的篩選參數） ✅ 已實現
  - 實現逾期任務統計（到期日小於當前日期，且狀態不是「已完成」或「已取消」） ✅ 已實現
  - 實現快取機制（KV Cache） ✅ 已實現
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js_
  - _Requirements: BR2.1.3_
  - _Status: 已完成 - 已創建 task-stats.js，實現 handleGetTasksStats 函數，使用單個 SQL 查詢計算所有統計，支持所有篩選參數，實現 KV 緩存_

#### 1.2.2 配置統計 API 路由
- [x] 1.2.2.1 添加統計路由配置
  - 在 backend/src/router/tasks.js 中新增統計摘要路由 GET /api/v2/tasks/stats ✅ 已添加
  - 在 backend/src/handlers/tasks/index.js 中添加路由處理 ✅ 已添加
  - _Leverage: backend/src/router/tasks.js, backend/src/handlers/tasks/task-stats.js_
  - _Requirements: BR2.1.3_
  - _Status: 已完成 - 已配置統計 API 路由_

### 1.3 批量操作 API Handler

#### 1.3.1 實現批量操作 API
- [x] 1.3.1.1 創建 task-batch.js Handler
  - File: backend/src/handlers/tasks/task-batch.js ✅ 已創建
  - Function: handleBatchUpdateTasks ✅ 已實現
  - 實現批量分配負責人邏輯 ✅ 已實現
  - 實現批量更新狀態邏輯 ✅ 已實現
  - 實現批量調整到期日邏輯 ✅ 已實現
  - 實現操作確認和錯誤處理（支援部分成功場景） ✅ 已實現
  - 實現事務處理確保數據一致性 ✅ 已實現（使用 D1 batch 操作）
  - 實現快取清理 ✅ 已實現
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js_
  - _Requirements: BR2.1.4_
  - _Status: 已完成 - 已創建 task-batch.js，實現 handleBatchUpdateTasks 函數，支持三種批量操作，使用 D1 batch 操作提高效率，處理部分成功場景，清除緩存_

#### 1.3.2 配置批量操作路由
- [x] 1.3.2.1 添加批量操作路由配置
  - 在 backend/src/router/tasks.js 中新增批量操作路由 POST /api/v2/tasks/batch ✅ 已添加
  - 在 backend/src/handlers/tasks/index.js 中添加路由處理 ✅ 已添加
  - _Leverage: backend/src/router/tasks.js, backend/src/handlers/tasks/task-batch.js_
  - _Requirements: BR2.1.4_
  - _Status: 已完成 - 已配置批量操作 API 路由_

## 2.0 前端組件開發

### 2.1 API 調用層增強

#### 2.1.1 增強任務 API 函數
- [x] 已實現：基本任務 API 函數已存在（src/api/tasks.js）
- [x] 2.1.1.1 添加統計和批量操作 API 函數
  - 添加 getTasksStats 函數（調用 GET /api/v2/tasks/stats，支援篩選參數） ✅ 已實現
  - 添加 batchUpdateTasks 函數（調用 POST /api/v2/tasks/batch） ✅ 已實現
  - 添加 getDefaultDateRange 函數（調用 GET /api/v2/tasks/default-date-range） ✅ 已實現
  - 使用統一的錯誤處理和回應格式處理 ✅ 已實現（使用 extractApiObject）
  - _Leverage: src/api/tasks.js, @/utils/apiHelpers_
  - _Requirements: BR2.1.3, BR2.1.4_
  - _Status: 已完成 - 已添加三個新 API 函數，使用 extractApiObject 處理響應格式，實現統一錯誤處理，支持所有篩選參數_

### 2.2 主頁面組件增強

#### 2.2.1 增強任務列表頁面
- [x] 已實現：TasksList.vue 基本佈局已存在（src/views/tasks/TasksList.vue）
- [x] 2.2.1.1 添加統計摘要組件整合
  - 整合 TaskOverviewStats 組件到 TasksList.vue ✅ 已實現
  - 實現統計數據載入和即時更新 ✅ 已實現
  - _Leverage: src/views/tasks/TasksList.vue, src/components/tasks/TaskOverviewStats.vue_
  - _Requirements: BR2.1.3_
  - _Status: 已完成 - 已更新 TaskOverviewStats 組件以符合 BR2.1.3 要求（總任務數、進行中、已完成、逾期、可開始），已整合到 TasksList.vue，實現統計數據載入和即時更新邏輯_

#### 2.2.2 實現預設載入範圍邏輯
- [x] 2.2.2.1 實現預設日期範圍計算和設置
  - 實現「還有未完成任務的月份」到「本月」的預設範圍計算 ✅ 已實現
  - 在頁面載入時自動設置預設篩選條件 ✅ 已實現
  - 實現篩選條件與統計摘要的即時同步 ✅ 已實現（已在任務 2.2.1.1 中實現）
  - _Leverage: src/views/tasks/TasksList.vue, src/api/tasks.js_
  - _Requirements: BR2.1.2, BR2.1.3_
  - _Status: 已完成 - 已實現預設日期範圍計算邏輯（先嘗試調用 API，失敗則使用客戶端計算），在頁面載入時自動設置初始篩選條件，處理邊緣情況（無未完成任務時返回當前月份），統計數據在篩選條件變更時即時更新_

### 2.3 篩選組件增強

#### 2.3.1 增強篩選組件
- [x] 已實現：TaskFilters.vue 基本篩選功能已存在（src/components/tasks/TaskFilters.vue）
- [x] 2.3.1.1 添加服務月份區間篩選
  - 實現兩個年月選擇器設定區間（開始月份和結束月份） ✅ 已實現
  - 實現月份範圍驗證邏輯 ✅ 已實現
  - _Leverage: src/components/tasks/TaskFilters.vue_
  - _Requirements: BR2.1.2_
  - _Status: 已完成 - 已將年份和月份下拉改為兩個月份選擇器（使用 a-date-picker 的 picker="month" 模式），實現月份範圍驗證邏輯（結束月份必須 >= 開始月份，自動調整無效範圍），更新 filters 結構以支持 service_month_start 和 service_month_end，更新 API 調用以將月份區間轉換為後端支持的格式_

#### 2.3.2 添加高級篩選功能
- [x] 2.3.2.1 實現可展開高級篩選面板
  - 實現服務類型篩選（多選） ✅ 已實現
  - 實現標籤篩選（多選） ✅ 已實現
  - 實現是否可開始篩選 ✅ 已實現
  - 實現「我的任務」篩選 ✅ 已實現
  - _Leverage: src/components/tasks/TaskFilters.vue_
  - _Requirements: BR2.1.2_
  - _Status: 已完成 - 已使用 Ant Design Collapse 組件實現可展開高級篩選面板，包含服務類型多選、標籤多選、是否可開始篩選和「我的任務」篩選，實現自動展開邏輯（當有高級篩選條件時自動展開），處理「我的任務」篩選時自動設置 assignee 為當前用戶，更新 store 和 API 調用以支持新的篩選條件_

### 2.4 列表展示組件增強

#### 2.4.1 增強任務分組展示
- [x] 已實現：TaskGroupList.vue 基本分組展示已存在（src/components/tasks/TaskGroupList.vue）
- [x] 2.4.1.1 實現任務可開始狀態高亮顯示
  - 實現任務可開始時的背景色高亮顯示 ✅ 已實現
  - 實現階段顯示格式「階段X/Y」 ✅ 已實現
  - _Leverage: src/components/tasks/TaskGroupList.vue_
  - _Requirements: BR2.1.1_
  - _Status: 已完成 - 已實現任務可開始狀態高亮顯示（可開始時使用綠色背景和左側邊框，不可開始時使用灰色背景），已實現階段顯示格式「階段X/Y」（X為當前階段，Y為總階段數）_

#### 2.4.2 增強「我的任務」篩選邏輯
- [x] 2.4.2.1 實現「我的任務」高亮顯示
  - 實現負責人是自己的任務高亮顯示 ✅ 已實現
  - 保持分組結構完整 ✅ 已實現
  - _Leverage: src/components/tasks/TaskGroupList.vue_
  - _Requirements: BR2.1.2_
  - _Status: 已完成 - 當啟用「我的任務」篩選時，顯示整個服務的任務，但高亮顯示負責人是自己的任務（藍色背景和邊框），如果同時可開始則使用組合樣式（藍色背景 + 綠色邊框）_

### 2.5 統計摘要組件

#### 2.5.1 實現統計摘要組件
- [x] 已實現：TaskOverviewStats.vue 組件已存在（src/components/tasks/TaskOverviewStats.vue）
- [x] 2.5.1.1 增強統計展示和更新邏輯
  - 確保統計數據即時更新（篩選條件變更時） ✅ 已實現
  - 優化載入狀態處理 ✅ 已實現
  - _Leverage: src/components/tasks/TaskOverviewStats.vue_
  - _Requirements: BR2.1.3_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and data visualization | Task: Enhance TaskOverviewStats.vue component to ensure statistics update in real-time when filters change, optimize loading state handling, and improve visual presentation of statistics | Restrictions: Must use Ant Design Vue components, must handle loading states properly, must update statistics reactively | Success: Statistics update in real-time, loading states are handled properly, UI is clear and informative_
  - _Status: 已完成 - 已增強 TaskOverviewStats 組件：添加圖標和卡片樣式、實現數字動畫效果、優化加載狀態處理（骨架屏）、確保統計數據實時更新（watch props）、改善視覺呈現（懸停效果、顏色區分、工具提示）_

#### 2.5.2 更新統計摘要顯示格式
- [x] 2.5.2.1 修改統計摘要顯示符合 BR2.1 需求
  - 將統計格式從「總任務數、未完成數、已完成數、逾期數、自動生成數、手動建立數」
  - 改為「總任務數、進行中任務數、已完成任務數、逾期任務數、可開始任務數」 ✅ 已實現
  - _Leverage: src/components/tasks/TaskOverviewStats.vue_
  - _Requirements: BR2.1.3_
  - _Status: 已完成 - TaskOverviewStats 組件已完全符合 BR2.1.3 需求，顯示的統計項包括：總任務數、進行中任務數、已完成任務數、逾期任務數、可開始任務數（已在任務 2.2.1.1 和 2.5.1.1 中實現）_

### 2.6 批量操作組件增強

#### 2.6.1 增強批量操作工具欄
- [x] 已實現：BatchActionsBar.vue 組件已存在（src/components/tasks/BatchActionsBar.vue）
- [x] 2.6.1.1 實現批量操作按鈕和確認對話框
  - 確保批量操作按鈕正確顯示和禁用邏輯 ✅ 已實現
  - 實現操作確認對話框 ✅ 已實現
  - _Leverage: src/components/tasks/BatchActionsBar.vue_
  - _Requirements: BR2.1.4_
  - _Status: 已完成 - 在 TasksList.vue 中集成 BatchActionsBar 組件，添加批量更新狀態和批量調整到期日的彈窗，實現批量操作的 API 調用和結果處理，確保按鈕在沒有選擇任務時禁用_

#### 2.6.2 增強批量分配負責人彈窗
- [x] 已實現：BatchAssignTaskModal.vue 組件已存在（src/components/tasks/BatchAssignTaskModal.vue）
- [x] 2.6.2.1 實現操作確認和結果處理
  - 實現批量操作確認對話框（顯示任務數量） ✅ 已實現
  - 實現操作結果處理和錯誤處理 ✅ 已實現
  - _Leverage: src/components/tasks/BatchAssignTaskModal.vue_
  - _Requirements: BR2.1.4_
  - _Status: 已完成 - 增強確認對話框顯示（使用 Alert 組件），實現操作結果處理（成功/失敗統計），實現錯誤處理和詳細錯誤信息顯示（支持部分成功場景），全部失敗時不關閉彈窗以便重試_

#### 2.6.3 增強批量更新狀態彈窗
- [x] 已實現：BatchStatusModal.vue 組件已存在（src/components/tasks/BatchStatusModal.vue）
- [x] 2.6.3.1 實現操作確認和結果處理
  - 實現批量操作確認對話框（顯示任務數量） ✅ 已實現
  - 實現操作結果處理和錯誤處理 ✅ 已實現
  - _Leverage: src/components/tasks/BatchStatusModal.vue_
  - _Requirements: BR2.1.4_
  - _Status: 已完成 - 增強確認對話框顯示（使用 Alert 組件），添加表單驗證，實現操作結果處理（成功/失敗統計），實現錯誤處理和詳細錯誤信息顯示（支持部分成功場景），全部失敗時不關閉彈窗以便重試_

#### 2.6.4 增強批量調整到期日彈窗
- [x] 已實現：BatchDueDateModal.vue 組件已存在（src/components/tasks/BatchDueDateModal.vue）
- [x] 2.6.4.1 實現操作確認和結果處理
  - 實現批量操作確認對話框（顯示任務數量） ✅ 已實現
  - 實現操作結果處理和錯誤處理 ✅ 已實現
  - _Leverage: src/components/tasks/BatchDueDateModal.vue_
  - _Requirements: BR2.1.4_
  - _Status: 已完成 - 增強確認對話框顯示（使用 Alert 組件），添加表單驗證，實現操作結果處理（成功/失敗統計），實現錯誤處理和詳細錯誤信息顯示（支持部分成功場景），全部失敗時不關閉彈窗以便重試_

## 3.0 預設載入範圍邏輯

### 3.1 實現預設日期範圍計算

#### 3.1.1 在後端實現預設日期範圍 API
- [x] 3.1.1.1 添加預設日期範圍端點
  - 在 backend/src/handlers/tasks/task-crud.js 中添加 handleGetDefaultDateRange 函數 ✅ 已實現
  - 實現「還有未完成任務的月份」到「本月」的計算邏輯 ✅ 已實現
  - 添加 GET /api/v2/tasks/default-date-range 路由 ✅ 已實現
  - _Leverage: backend/src/handlers/tasks/task-crud.js, backend/src/router/tasks.js_
  - _Requirements: BR2.1.2_
  - _Prompt: Role: Backend Developer with expertise in data aggregation | Task: Add handleGetDefaultDateRange function to task-crud.js that calculates default date range from earliest month with incomplete tasks to current month. Query ActiveTasks table to find incomplete tasks, determine date range, and return as JSON response. Add route configuration for GET /api/v2/tasks/default-date-range | Restrictions: Must use parameterized queries, must handle edge cases (no incomplete tasks), must return proper date format (YYYY-MM), must consider permission filtering | Success: Default date range is calculated correctly, API returns proper format, route is configured correctly_
  - _Status: 已完成 - 實現 handleGetDefaultDateRange 函數，查詢 ActiveTasks 表找出未完成任務的最早月份，計算從最早月份到當前月份的日期範圍，支持權限過濾（非管理員只能看到自己的任務），處理邊緣情況（無未完成任務時返回當前月份），返回 JSON 格式（YYYY-MM），配置路由 GET /api/v2/tasks/default-date-range_

#### 3.1.2 前端整合預設日期範圍
- [x] 3.1.2.1 前端調用預設日期範圍邏輯
  - 在 TasksList.vue 中調用預設日期範圍 API ✅ 已實現
  - 在頁面載入時設置初始篩選條件 ✅ 已實現
  - _Leverage: src/views/tasks/TasksList.vue, src/api/tasks.js_
  - _Requirements: BR2.1.2_
  - _Status: 已完成 - 增強 getDefaultDateRange 函數以優先使用後端 API，添加日期格式驗證，改進錯誤處理和日誌記錄，確保 initializeDefaultFilters 正確調用 API 並在頁面載入時設置初始篩選條件_

## 4.0 測試與驗證

### 4.1 E2E 測試

#### 4.1.1 實現任務列表展示測試
- [x] 4.1.1.1 創建任務列表 E2E 測試
  - File: tests/e2e/tasks/task-list.spec.ts ✅ 已創建
  - 測試任務列表展示和分組（客戶 → 月份 → 服務 → 階段 → 任務）✅ 已實現
  - 測試任務可開始狀態高亮顯示 ✅ 已實現
  - 測試階段顯示格式「階段X/Y」✅ 已實現
  - 使用測試數據工具設置測試數據 ✅ 已實現
  - _Leverage: tests/e2e/utils/test-data.ts_
  - _Requirements: BR2.1.1_
  - _Status: 已完成 - 創建了完整的 E2E 測試套件，包括任務列表基本展示、分組結構、可開始狀態高亮、階段顯示格式和任務信息顯示等測試組。同時在 test-data.ts 中添加了 createTestTask 和 setupBR2_1TestData 函數用於設置測試數據。_

#### 4.1.2 實現篩選功能測試
- [x] 4.1.2.1 創建篩選功能 E2E 測試
  - 測試服務月份區間篩選 ✅ 已實現
  - 測試客戶搜尋功能 ✅ 已實現
  - 測試狀態快速切換 ✅ 已實現
  - 測試高級篩選（負責人、服務類型、標籤、可開始、「我的任務」）✅ 已實現
  - 測試「隱藏已完成」功能 ✅ 已實現
  - _Requirements: BR2.1.2_
  - _Status: 已完成 - 創建了完整的篩選功能 E2E 測試套件，包括服務月份區間篩選、客戶搜尋、狀態快速切換、高級篩選（負責人、服務類型、標籤、可開始、「我的任務」）、隱藏已完成功能和篩選組合測試等測試組。_

#### 4.1.3 實現統計和批量操作測試
- [x] 4.1.3.1 創建統計和批量操作 E2E 測試
  - 測試統計摘要顯示和即時更新 ✅ 已實現
  - 測試批量分配負責人功能 ✅ 已實現
  - 測試批量更新狀態功能 ✅ 已實現
  - 測試批量調整到期日功能 ✅ 已實現
  - _Requirements: BR2.1.3, BR2.1.4_
  - _Status: 已完成 - 創建了完整的統計摘要和批量操作 E2E 測試套件，包括統計摘要顯示（總任務數、進行中、已完成、逾期、可開始）、統計摘要即時更新（篩選條件變化時更新）、批量操作工具欄（顯示/隱藏、按鈕可用性）、批量分配負責人（打開彈窗、確認信息、選擇負責人）、批量更新狀態（打開彈窗、確認信息、選擇狀態）、批量調整到期日（打開彈窗、確認信息、選擇到期日、輸入調整原因）等測試組。_

#### 4.1.4 實現導航功能測試
- [x] 4.1.4.1 創建導航功能 E2E 測試
  - 測試快速新增任務按鈕跳轉到服務設定頁面 ✅ 已實現
  - 測試客戶名稱點擊跳轉到客戶詳情頁面 ✅ 已實現
  - _Requirements: BR2.1.5_
  - _Status: 已完成 - 創建了導航功能 E2E 測試和綜合測試套件。導航功能測試包括快速新增任務按鈕跳轉和客戶名稱點擊跳轉。綜合測試套件涵蓋所有驗收標準（BR2.1.1-BR2.1.5），使用管理員和員工帳號進行測試，並實現了測試數據清理功能。_

## 5.0 列表和總覽合併修正

### 5.1 移除總覽 Tab，合併為單一頁面

#### 5.1.1 移除任務總覽 Tab
- [ ] 5.1.1.1 移除 TasksManagement.vue 中的視圖切換 Tab
  - 移除 `<a-tabs>` 組件和視圖切換邏輯
  - 移除 `currentView` 狀態和相關的視圖切換處理
  - 移除總覽視圖相關的 computed 屬性和方法
  - 移除 `overviewStore` 的依賴和使用
  - 確保頁面只顯示列表視圖，符合「合併後的任務列表頁面」需求
  - _Leverage: src/views/tasks/TasksManagement.vue_
  - _Requirements: BR2.1 (requirements.md 明確說明「本頁面為合併後的任務列表頁面（原「任務列表」和「任務總覽」已合併為單一頁面）」)_
  - _Status: 待實施_

#### 5.1.2 清理總覽相關代碼
- [ ] 5.1.2.1 移除總覽視圖相關的組件引用
  - 移除 `TaskOverviewFilters`、`TaskOverviewList` 等總覽專用組件
  - 移除 `useTaskOverviewStore` 的導入和使用
  - 清理總覽相關的狀態和方法
  - _Leverage: src/views/tasks/TasksManagement.vue, src/stores/taskOverview.js_
  - _Requirements: BR2.1_
  - _Status: 待實施_

#### 5.1.3 更新路由配置
- [ ] 5.1.3.1 移除或重定向總覽路由
  - 更新 `src/router/index.js` 中的 `/tasks/overview` 路由
  - 確保 `/tasks/overview` 重定向到 `/tasks` 或直接移除
  - 更新頁面標題映射
  - _Leverage: src/router/index.js_
  - _Requirements: BR2.1_
  - _Status: 待實施_

## 6.0 統計邏輯修正

### 6.1 修正統計邏輯，確保統計數字合理

#### 6.1.1 檢視和修正「進行中任務數」統計邏輯
- [ ] 6.1.1.1 檢視「進行中任務數」的定義
  - 確認「進行中任務數」是否應該只包含 `status = 'in_progress'` 的任務
  - 確認是否應該包含 `status = 'pending'` 的任務（待處理但尚未開始）
  - 根據 requirements.md 的任務狀態規則：pending（待處理）、in_progress（進行中）、completed（已完成）、cancelled（已取消）
  - 確認統計邏輯是否符合業務需求
  - _Leverage: backend/src/handlers/tasks/task-stats.js, .spec-workflow/specs/br2-1-task-list/requirements.md_
  - _Requirements: BR2.1.3_
  - _Status: 待實施 - 需要確認「進行中任務數」的定義是否應該包含 pending 狀態的任務_

#### 6.1.2 檢視和修正「可開始任務數」統計邏輯
- [ ] 6.1.2.1 檢視「可開始任務數」的計算邏輯
  - 確認當前的 can_start 計算邏輯是否符合 requirements.md 的「任務可開始判斷規則」
  - 根據 requirements.md：「任務可開始的條件：所有前置階段的所有任務都必須是「已完成」狀態」
  - 確認當前邏輯「如果第一個階段（stage_order = 1）還沒有完成，那麼任務可以開始」是否正確
  - 如果邏輯有誤，修正 can_start 的計算邏輯
  - 確保統計數字合理（例如：可開始任務數不應該等於總任務數，除非所有任務都滿足可開始條件）
  - _Leverage: backend/src/handlers/tasks/task-stats.js, backend/src/handlers/tasks/task-crud.js, .spec-workflow/specs/br2-1-task-list/requirements.md_
  - _Requirements: BR2.1.3, BR2.1.1 (任務可開始判斷規則)_
  - _Status: 待實施 - 需要確認 can_start 邏輯是否符合需求，特別是「所有前置階段的所有任務都必須是已完成」的含義_

#### 6.1.3 確保統計數字的一致性
- [ ] 6.1.3.1 驗證統計數字的一致性
  - 確保「總任務數 = 進行中 + 已完成 + 待處理 + 已取消」
  - 確保「逾期任務數」是「進行中 + 待處理」的子集
  - 確保「可開始任務數」不超過「總任務數 - 已完成 - 已取消」
  - 添加統計邏輯的單元測試
  - _Leverage: backend/src/handlers/tasks/task-stats.js_
  - _Requirements: BR2.1.3_
  - _Status: 待實施_


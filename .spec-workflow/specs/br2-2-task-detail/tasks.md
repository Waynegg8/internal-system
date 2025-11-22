# Tasks Document: BR2.2: 任務詳情

## 1.0 後端 API 實現模組

### 1.1 任務數據查詢模組
- [x] 1.1.1 **驗證**任務詳情 API Handler 已實現
  - File: backend/src/handlers/tasks/task-crud.js
  - Function: handleGetTaskDetail ✅ 已實現
  - 實現任務基本信息查詢 ✅ 已實現
  - 實現任務階段查詢 ✅ 已實現
  - 實現關聯數據查詢（客戶、服務、負責人等） ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.1_

### 1.2 任務更新管理模組
- [x] 1.2.1 **驗證**任務狀態更新 API Handler 已實現
  - File: backend/src/handlers/tasks/task-updates.js
  - Function: handleUpdateTaskStatus ✅ 已實現
  - 實現狀態更新邏輯 ✅ 已實現
  - 實現到期日調整邏輯 ✅ 已實現
  - 實現變更歷史記錄 ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.3_

- [x] 1.2.2 **驗證**任務負責人更新 API Handler 已實現
  - File: backend/src/handlers/tasks/task-updates.js
  - Function: handleUpdateTaskAssignee ✅ 已實現
  - 實現負責人更新邏輯 ✅ 已實現
  - 實現變更歷史記錄 ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.1_

- [x] 1.2.3 **驗證**任務階段自動更新邏輯已實現
  - File: backend/src/handlers/tasks/task-updates.js
  - Function: autoUpdateTaskStages ✅ 已實現
  - 實現階段狀態自動更新邏輯 ✅ 已實現
  - 實現前置階段完成檢查 ✅ 已實現
  - 實現階段同步確認機制 ❌ 缺少確認機制
  - _Status: 大部分完成 - 需要補充階段同步確認機制_
  - _Requirements: BR2.2.2_

### 1.3 SOP 管理模組
- [x] 1.3.1 **驗證**任務 SOP 關聯 API Handler 已實現
  - File: backend/src/handlers/tasks/task-sops.js
  - Function: handleGetTaskSOPs, handleUpdateTaskSOPs ✅ 已實現
  - 實現 SOP 列表查詢 ✅ 已實現
  - 實現 SOP 關聯更新（多選） ✅ 已實現
  - 實現變更歷史記錄 ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.4_

### 1.4 文檔管理模組
- [x] 1.4.1 補充任務文檔下載 API Handler
  - File: backend/src/handlers/tasks/task-documents.js
  - Function: handleDownloadTaskDocument (新增) ✅ 已實現
  - 實現文檔列表查詢 ✅ 已實現 (handleGetTaskDocuments)
  - 實現文檔上傳（R2 存儲） ✅ 已實現 (handleUploadTaskDocument)
  - 實現文檔下載 ✅ 已實現 (handleDownloadTaskDocument)
  - 實現文檔刪除 ✅ 已實現 (handleDeleteTaskDocument)
  - 實現變更歷史記錄 ✅ 已實現
  - _Leverage: backend/src/utils/response.js, backend/src/utils/r2-upload.js_
  - _Requirements: BR2.2.5_
  - _Status: 已完成 - 已實現 handleDownloadTaskDocument 函數，包含權限檢查、R2 文件檢索、正確的 HTTP headers 設置和錯誤處理。同時更新了前端 API、store 和組件以支持文檔下載功能。_

### 1.5 歷史追蹤模組
- [x] 1.5.1 補充完整任務變更歷史 API Handler
  - File: backend/src/handlers/tasks/task-history.js
  - Function: handleGetTaskHistory (修改現有 handleGetTaskAdjustmentHistory) ✅ 已實現
  - 實現變更歷史查詢（狀態、階段、到期日、負責人、SOP、文檔） ✅ 已實現
  - 實現按時間倒序排列 ✅ 已實現
  - _Status: 已完成 - 已增強 handleGetTaskHistory 函數，從所有相關歷史表查詢變更歷史，包括 TaskStatusUpdates、TaskDueDateAdjustments 和 TaskEventLogs（assignee_changed、stage_status_changed、sop_association_changed、document_changed），合併所有歷史條目並按時間倒序排序，返回格式化的響應包含變更類型、內容、時間和用戶信息_
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR2.2.6_

## 2.0 前端界面實現模組

### 2.1 頁面佈局模組
- [x] 2.1.1 **驗證**任務詳情前端頁面已實現
  - File: src/views/tasks/TaskDetail.vue ✅ 已實現
  - 實現頁面佈局和路由 ✅ 已實現
  - 整合所有子組件 ✅ 已實現
  - 實現數據載入和錯誤處理 ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.1_

### 2.2 基本信息組件模組
- [x] 2.2.1 **驗證**任務基本信息組件已實現
  - File: src/components/tasks/TaskBasicInfo.vue ✅ 已實現
  - 實現基本信息展示 ✅ 已實現
  - 實現負責人編輯 ✅ 已實現
  - 實現狀態更新觸發 ✅ 已實現
  - 實現變更歷史查看觸發 ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.1_

### 2.3 階段管理組件模組
- [x] 2.3.1 **驗證**任務階段展示組件已實現
  - File: src/components/tasks/TaskStagesPanel.vue ✅ 已實現
  - 實現階段列表展示 ✅ 已實現
  - 實現階段狀態顯示 ✅ 已實現
  - 實現階段進度和延遲顯示 ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.2_

### 2.4 SOP 管理組件模組
- [x] 2.4.1 **驗證**任務 SOP 列表組件（內嵌形式）已實現
  - File: src/components/tasks/TaskSOPList.vue ✅ 已實現
  - 實現 SOP 列表展示 ✅ 已實現
  - 實現 SOP 選擇界面（內嵌形式，非彈窗） ✅ 已實現
  - 實現多選和取消選擇 ✅ 已實現
  - 實現 SOP 保存 ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.4_

### 2.5 文檔管理組件模組
- [x] 2.5.1 **驗證**任務文檔管理組件已實現
  - File: src/components/tasks/TaskDocuments.vue ✅ 已實現
  - 實現文檔列表展示 ✅ 已實現
  - 實現文檔上傳（進度顯示） ✅ 已實現
  - 實現文檔下載 ✅ 已實現
  - 實現文檔刪除（確認對話框） ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.5_

### 2.6 狀態更新組件模組
- [x] 2.6.1 **驗證**更新狀態說明彈窗已實現
  - File: src/components/tasks/UpdateStatusModal.vue ✅ 已實現
  - 實現狀態選擇 ✅ 已實現
  - 實現狀態說明輸入（必填） ✅ 已實現
  - 實現到期日調整 ✅ 已實現
  - 實現表單驗證 ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.3_

### 2.7 歷史查看組件模組
- [x] 2.7.1 **驗證**變更歷史彈窗已實現
  - File: src/components/tasks/AdjustmentHistoryModal.vue ✅ 已實現
  - 實現變更歷史列表展示 ✅ 已實現
  - 實現按時間倒序排列 ✅ 已實現
  - 實現變更類型分類顯示 ✅ 已實現
  - _Status: 已完成 - 現有原始碼已完整實現所有功能_
  - _Requirements: BR2.2.6_

## 3.0 測試與驗證模組

### 3.1 E2E 測試模組
- [x] 3.1.1 編寫 E2E 測試
  - File: tests/e2e/tasks/task-detail.spec.ts ✅ 已創建
  - 測試任務詳情頁面載入和展示 ✅ 已實現
  - 測試任務狀態更新流程 ✅ 已實現
  - 測試任務階段自動更新邏輯 ✅ 已實現
  - 測試 SOP 關聯管理 ✅ 已實現
  - 測試文檔上傳、下載、刪除 ✅ 已實現
  - 測試變更歷史查看 ✅ 已實現
  - 使用測試數據工具設置測試數據 ✅ 已實現
  - 測試管理員和員工帳號 ✅ 已實現
  - 測試錯誤場景 ✅ 已實現
  - _Leverage: tests/e2e/utils/test-data.ts_
  - _Requirements: 所有 BR2.2 驗收標準_
  - _Status: 已完成 - 已創建全面的 E2E 測試套件，涵蓋所有驗收標準（BR2.2.1-BR2.2.6），包括任務基本信息展示、階段管理、狀態更新、SOP 關聯、文檔管理和變更歷史查看。測試使用測試數據設置工具，測試管理員和員工帳號，並包含錯誤場景測試和數據清理邏輯。_

## 4.0 補充功能模組

### 4.1 階段同步確認機制
- [x] 4.1.1 實現階段同步確認機制
  - File: backend/src/handlers/tasks/task-updates.js (修改 handleUpdateTaskStage) ✅ 已實現
  - File: src/components/tasks/StageSyncConfirmModal.vue (新增) ✅ 已創建
  - File: src/views/tasks/TaskDetail.vue (修改) ✅ 已更新
  - 新增階段同步前確認對話框 ✅ 已實現
  - 實現手動確認後才執行階段同步 ✅ 已實現
  - 實現同步取消功能 ✅ 已實現
  - _Requirements: BR2.2.2 業務規則_
  - _Status: 已完成 - 後端在階段完成時檢查 confirm_sync 參數，如果未確認則返回 428 狀態碼和需要確認的響應。前端檢測到需要確認時顯示確認對話框，用戶可以確認或取消同步操作。_

### 4.2 完整變更歷史整合
- [x] 4.2.1 整合所有變更類型到歷史查看
  - File: src/components/tasks/AdjustmentHistoryModal.vue (修改) ✅ 已更新
  - 顯示所有變更類型（狀態、階段、到期日、負責人、SOP、文檔） ✅ 已實現
  - 為每種變更類型添加適當圖標 ✅ 已實現
  - 格式化變更詳情 ✅ 已實現
  - 保持時間倒序排列 ✅ 已實現
  - _Requirements: BR2.2.6_
  - _Status: 已完成 - 增強了 AdjustmentHistoryModal 組件，支持顯示所有變更類型（狀態變更、階段狀態變更、到期日調整、負責人變更、SOP 關聯變更、文檔變更），每種類型都有對應的圖標和格式化顯示，並保持時間倒序排列。_
  - File: src/components/tasks/AdjustmentHistoryModal.vue (修改)
  - 前端支持顯示所有變更類型（狀態、階段、到期日、負責人、SOP、文檔）
  - 實現變更類型圖標和分類顯示
  - 實現詳細的變更內容展示
  - _Requirements: BR2.2.6_
  - _Prompt: Role: Frontend Developer with expertise in history display and data visualization | Task: Enhance AdjustmentHistoryModal.vue to display all change types including status changes, stage status changes, due date adjustments, assignee changes, SOP association changes, and document changes. Add appropriate icons for each change type and format change details clearly | Restrictions: Must display all change types with proper categorization, must use appropriate icons and formatting, must handle different change type data structures, must maintain chronological sorting | Success: All change types are displayed with proper icons and formatting, history is comprehensive and easy to understand_


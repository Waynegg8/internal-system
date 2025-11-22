# Tasks Document: BR2.6: 任務到期提醒

## 實施狀態總覽

根據對專案現有原始碼的分析，BR2.6 任務通知功能**尚未實現任何部分**。專案中：
- 已有 DashboardAlerts 表可用於存儲通知
- 已有 CronJobExecutions 表用於記錄 cron 任務執行
- 已有基本的儀表板提醒面板組件，但沒有專門的通知功能
- index.js 中已有 scheduled 函數架構，但沒有任務通知邏輯

所有任務都需要從頭實現。

- [x] 1.0 創建 TaskNotificationHistory 表
  - File: backend/migrations/0047_task_notification_history.sql
  - 創建 TaskNotificationHistory 表用於通知頻率控制（history_id, task_id, notification_type, sent_at, recipients JSON, notification_data JSON, created_at）
  - 創建相關索引（task_id, notification_type, sent_at）
  - 使用現有的 DashboardAlerts 表存儲通知，不創建新的 Notifications 表
  - _Leverage: DashboardAlerts 表（migration 0030）_
  - _Requirements: BR2.6.5, BR2.6.6_
  - _Status: 已完成 - migration 文件已創建並驗證_

- [ ] 2.0 實現任務檢查邏輯
  - [x] 2.1 實現任務逾期檢查邏輯
    - File: backend/src/handlers/task-notifications/task-checkers.js
    - Function: checkOverdueTasks
    - 實現逾期任務查詢（due_date < current_date AND status NOT IN ('completed', 'cancelled') AND is_deleted = 0）
    - 實現通知對象計算（任務負責人從 ActiveTasks.assignee_user_id，客戶負責人從 Clients.assignee_user_id）
    - 實現通知數據構建（包含任務名稱、客戶名稱、服務名稱、到期日、逾期天數、任務詳情連結）
    - _Leverage: backend/src/utils/response.js_
    - _Requirements: BR2.6.1_
    - _Status: 已完成 - 已實現 checkOverdueTasks 函數_

  - [x] 2.2 實現任務即將到期檢查邏輯
    - File: backend/src/handlers/task-notifications/task-checkers.js
    - Function: checkUpcomingTasks
    - 實現即將到期任務查詢（due_date = current_date + 1 day AND status NOT IN ('completed', 'cancelled') AND is_deleted = 0）
    - 實現通知對象計算（任務負責人從 ActiveTasks.assignee_user_id，客戶負責人從 Clients.assignee_user_id）
    - 實現通知數據構建（包含任務名稱、客戶名稱、服務名稱、到期日、剩餘天數1天、任務詳情連結）
    - _Leverage: backend/src/utils/response.js_
    - _Requirements: BR2.6.2_
    - _Status: 已完成 - 已實現 checkUpcomingTasks 函數_

  - [x] 2.3 實現前置任務延誤檢查邏輯
    - File: backend/src/handlers/task-notifications/task-checkers.js
    - Function: checkPredecessorTaskDelays
    - 實現前置任務延誤檢查（查詢逾期且未完成的前置任務）
    - 實現後續任務查詢（查詢所有 prerequisite_task_id = 前置任務ID 的任務）
    - 實現後續任務影響分析
    - 實現通知對象計算（後續任務負責人、客戶負責人）
    - 實現通知數據構建
    - _Leverage: backend/src/utils/response.js_
    - _Requirements: BR2.6.3_
    - _Status: 已完成 - 已實現 checkPredecessorTaskDelays 函數_

  - [x] 2.4 實現固定期限任務衝突檢查邏輯
    - File: backend/src/handlers/task-notifications/task-checkers.js
    - Function: checkFixedDeadlineConflicts
    - 實現固定期限任務識別（從 ActiveTasks.is_fixed_deadline 或 ClientServiceTaskConfigs.is_fixed_deadline）
    - 實現固定期限任務衝突檢查（前置任務延誤導致中間任務無法在固定期限前完成）
    - 實現中間任務到期日調整檢查（檢查 due_date_adjusted 和 adjustment_reason 欄位）
    - 實現通知對象計算（中間任務負責人、固定期限任務負責人、客戶負責人）
    - 實現通知數據構建
    - _Leverage: backend/src/utils/response.js, backend/src/handlers/task-generator/generator-new.js_
    - _Requirements: BR2.6.4_
    - _Status: 已完成 - 已實現 checkFixedDeadlineConflicts 函數_

- [ ] 3.0 實現通知發送邏輯
  - [x] 3.1 實現通知頻率控制邏輯
    - File: backend/src/handlers/task-notifications/notification-sender.js
    - Function: shouldSendNotification
    - 實現通知發送時間檢查（每日只發送一次）
    - 實現通知歷史查詢
    - 實現任務狀態檢查（已完成或已取消的任務不再發送）
    - 實現任務刪除檢查（已刪除的任務不再發送）
    - _Requirements: BR2.6.6_
    - _Status: 已完成 - 已實現 shouldSendNotification 函數_

  - [x] 3.2 實現通知發送邏輯
    - File: backend/src/handlers/task-notifications/notification-sender.js
    - Function: sendTaskNotification
    - 實現通知頻率控制（每日只發送一次）
    - 實現通知創建（存儲到 DashboardAlerts 表，is_admin_alert 設為 0）
    - 實現通知歷史記錄（存儲到 TaskNotificationHistory 表）
    - _Leverage: backend/src/utils/response.js, backend/src/handlers/tasks/task-updates.js_
    - _Requirements: BR2.6.5, BR2.6.6_
    - _Status: 已完成 - 已實現 sendTaskNotification 函數_

- [x] 4.0 實現 Cron 任務整合
  - File: backend/src/index.js
  - Function: handleTaskNotifications
  - 實現每日 02:00（台灣時間）執行檢查
  - 整合所有任務檢查邏輯
  - 實現錯誤處理和日誌記錄
  - _Leverage: checkOverdueTasks, checkUpcomingTasks, checkPredecessorTaskDelays, checkFixedDeadlineConflicts, sendTaskNotification_
  - _Requirements: BR2.6.1, BR2.6.2, BR2.6.3, BR2.6.4_
  - _Status: 已完成 - 已實現 handleTaskNotifications 函數並整合到 scheduled 函數中_

- [ ] 5.0 實現後端 API
  - [x] 5.1 實現通知查詢 API
    - File: backend/src/handlers/task-notifications/notification-crud.js
    - Function: handleGetNotifications
    - 實現通知列表查詢（從 DashboardAlerts 表）
    - 實現通知篩選（類型 alert_type、已讀/未讀 is_read）
    - 實現未讀通知數量查詢
    - 實現排序（按 created_at DESC）
    - _Leverage: backend/src/utils/response.js, backend/src/handlers/dashboard/alerts.js_
    - _Requirements: BR2.6.5_
    - _Status: 已完成 - 已實現 handleGetNotifications 函數_

  - [x] 5.2 實現通知標記已讀 API
    - File: backend/src/handlers/task-notifications/notification-crud.js
    - Function: handleMarkNotificationAsRead
    - 實現單個/批量通知標記已讀
    - 實現權限驗證（通知必須屬於當前用戶）
    - 實現更新操作（is_read = 1, read_at = current_time）
    - _Leverage: backend/src/utils/response.js_
    - _Requirements: BR2.6.5_
    - _Status: 已完成 - 已實現 handleMarkNotificationAsRead 函數_

  - [x] 5.3 創建通知路由配置
    - File: backend/src/router/notifications.js
    - 創建通知相關路由配置
    - 配置通知查詢路由（GET /api/v2/notifications）
    - 配置通知標記已讀路由（PUT /api/v2/notifications/:id/read）
    - 在 backend/src/router/index.js 中註冊路由
    - _Leverage: backend/src/middleware/auth.js_
    - _Requirements: BR2.6.5_
    - _Status: 已完成 - 已創建路由配置並註冊_

- [ ] 6.0 實現前端組件
  - [x] 6.1 實現通知列表前端組件
    - File: src/components/notifications/NotificationsList.vue
    - 實現通知列表展示
    - 實現通知類型顯示
    - 實現通知點擊跳轉
    - 實現通知標記已讀
    - _Leverage: src/api/notifications.js_
    - _Requirements: BR2.6.5_
    - _Status: 已完成 - 已實現 NotificationsList.vue 組件和 notifications.js API_

  - [x] 6.2 增強儀表板提醒面板
    - File: src/components/dashboard/DashboardAlertsPanel.vue
    - 實現未讀通知數量顯示
    - 實現通知列表入口
    - _Leverage: src/api/notifications.js_
    - _Requirements: BR2.6.5_
    - _Status: 已完成 - 已增強 DashboardAlertsPanel 組件並創建通知列表頁面_

  - [x] 6.3 實現通知 API 調用函數
    - File: src/api/notifications.js
    - 實現通知列表查詢
    - 實現未讀通知數量查詢
    - 實現通知標記已讀
    - _Leverage: src/utils/apiHelpers.js_
    - _Requirements: BR2.6.5_
    - _Status: 已完成 - 已實現所有通知 API 調用函數，包括 fetchNotifications、fetchUnreadCount、markAsRead 和 markAsReadById_

- [x] 7.0 編寫 E2E 測試
  - File: tests/e2e/notifications/task-notifications.spec.ts
  - 測試通知列表顯示
  - 測試通知點擊跳轉
  - 測試通知標記已讀
  - 測試未讀通知數量顯示
  - 使用測試數據工具設置測試數據
  - _Leverage: tests/e2e/utils/test-data.ts, tests/e2e/utils/test-data-br2-6.ts_
  - _Requirements: 所有 BR2.6 驗收標準_
  - _Status: 已完成 - 已創建完整的 E2E 測試文件，包括通知列表顯示、點擊跳轉、標記已讀、未讀數量顯示等測試場景_

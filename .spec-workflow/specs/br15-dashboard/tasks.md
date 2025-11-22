# Tasks Document: BR15: 儀表板（Dashboard）

## 三方差異分析結果

### 已實現功能
- ✅ 自動刷新功能（每 5 分鐘刷新，頁面獲得焦點時刷新）
- ✅ 員工工時目標計算邏輯（根據月份自動計算目標工時，排除國定假日，只計算週一至週五）
- ✅ 今日摘要計算範圍（管理員計算全公司所有員工的任務）
- ✅ 已完成任務僅顯示選定月份
- ✅ 工時計算排除國定假日
- ✅ 財務狀況本年累計包含到當天為止的數據
- ✅ 權限控制（管理員和員工顯示不同內容）

### 待實現/修正功能
- ❌ DashboardAlertsPanel 組件支持 BR2.6 通知類型顯示（不同圖標、顏色、標籤）
- ❌ DashboardAlertsPanel 組件顯示 `upcoming` 類型的「剩餘 X 天」而非「延遲 X 天」
- ❌ DashboardAlertsPanel 組件顯示 `delay` 和 `conflict` 類型的詳細描述信息
- ❌ AdminDashboard 組件中的提醒顯示格式（根據通知類型顯示不同格式）
- ❌ EmployeeDashboard 組件移除「我的假期」組件
- ❌ handleDashboardAlerts 支持 BR2.6 通知類型映射（確保正確映射 overdue, upcoming, delay, conflict 類型，包含 remainingDays 和 description）
- ❌ E2E 測試

---

- [ ] 1. 增強 DashboardAlertsPanel 組件以支持 BR2.6 通知類型顯示
  - File: src/components/dashboard/DashboardAlertsPanel.vue
  - 實現根據通知類型顯示不同的圖標和顏色（overdue: 紅色, upcoming: 橙色, delay: 黃色, conflict: 紅色）
  - Purpose: 提供視覺化的通知類型區分，提升用戶體驗
  - 實現類型標籤顯示（在標題旁顯示「逾期」「即將到期」「延誤」「衝突」）
  - 實現 `upcoming` 類型顯示「剩餘 X 天」或「即將到期」，而非「延遲 X 天」
  - 實現 `delay` 和 `conflict` 類型顯示詳細描述信息（description 字段）
  - 修改 `renderAlertItem` 函數，根據 `item.type` 顯示不同的圖標、顏色和標籤
  - 使用 Ant Design Vue 的圖標組件（ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined）
  - 根據類型設置不同的 CSS 類名和顏色
  - _Leverage: src/components/dashboard/DashboardAlertsPanel.vue, Ant Design Vue Icons_
  - _Requirements: BR15.4_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and notification UI | Task: Enhance DashboardAlertsPanel component to support BR2.6 notification types with different icons, colors, and labels. Display "remaining X days" for upcoming type instead of "delay X days", and show description for delay and conflict types. Use Ant Design Vue icon components and CSS classes for styling | Restrictions: Must use Ant Design Vue components, maintain existing component structure, ensure accessibility, handle all notification types correctly | Success: Notification types are displayed with correct icons, colors, and labels, text formatting is correct for each type, description is shown for delay and conflict types, remaining days are shown for upcoming type_

- [ ] 2. 增強 AdminDashboard 組件中的提醒顯示格式
  - File: src/components/dashboard/AdminDashboard.vue
  - 實現根據通知類型顯示不同的圖標和顏色
  - Purpose: 確保管理員儀表板中的提醒也使用 BR2.6 通知類型格式
  - 實現類型標籤顯示
  - 實現不同類型提醒的文字顯示格式
  - 檢查 AdminDashboard 中是否有直接顯示提醒的地方，如果有，應用相同的格式
  - 如果 AdminDashboard 使用 DashboardAlertsPanel 組件，則無需修改（task 1 已覆蓋）
  - _Leverage: src/components/dashboard/AdminDashboard.vue, src/components/dashboard/DashboardAlertsPanel.vue_
  - _Requirements: BR15.4_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and notification UI | Task: Enhance AdminDashboard component to display alerts with BR2.6 notification type formatting (icons, colors, labels). If AdminDashboard uses DashboardAlertsPanel component, verify it receives correct data format | Restrictions: Must use Ant Design Vue components, maintain existing component structure, ensure consistency with DashboardAlertsPanel | Success: Alerts are displayed with correct formatting for each notification type in AdminDashboard_

- [x] 3. 驗證員工工時目標計算邏輯
  - File: backend/src/handlers/dashboard/dashboard-employee.js
  - 確認根據月份自動計算目標工時（工作日數 × 8 小時）
  - 確認工作日計算邏輯（排除國定假日，只計算週一至週五）
  - 確認當前月份只計算到今天為止的工作日
  - _Leverage: backend/src/handlers/dashboard/dashboard-admin.js (參考工作日計算邏輯)_
  - _Requirements: BR15.2_
  - _Status: 已完成 - 員工工時目標計算邏輯已正確實現_

- [ ] 4. 移除員工儀表板中的「我的假期」組件
  - Files:
    - src/components/dashboard/EmployeeDashboard.vue
    - backend/src/handlers/dashboard/dashboard-employee.js
  - 移除 MyLeaves 組件的導入和使用
  - Purpose: 符合需求，員工儀表板不顯示「我的假期」組件
  - 前端：移除 `MyLeaves` 組件的導入（第27行）和使用（第7行）
  - 後端：移除 `myLeaves` 相關查詢和返回（如果存在）
  - 確保移除後不會導致錯誤
  - _Leverage: src/components/dashboard/EmployeeDashboard.vue, backend/src/handlers/dashboard/dashboard-employee.js_
  - _Requirements: BR15.2_
  - _Prompt: Role: Full-stack Developer with expertise in Vue 3 and backend data handling | Task: Remove MyLeaves component from EmployeeDashboard (remove import and usage), and remove myLeaves data query and return from dashboard-employee.js if it exists | Restrictions: Must not break other components, ensure clean removal from both frontend and backend, verify no errors after removal | Success: MyLeaves component is removed from frontend, myLeaves data query is removed from backend, no errors in EmployeeDashboard, component renders correctly_

- [ ] 5. 增強 handleDashboardAlerts 以支持 BR2.6 通知類型映射
  - File: backend/src/handlers/dashboard/alerts.js
  - 確保正確映射 BR2.6 通知類型到前端顯示格式
  - Purpose: 確保後端返回的提醒數據包含 BR2.6 通知類型的所有必要字段
  - 確保 `mapDashboardAlertRow` 函數正確映射 `alert_type` 到 `type` 字段（overdue, upcoming, delay, conflict）
  - 確保 `upcoming` 類型包含 `remainingDays` 信息（從 payload 或計算得出）
  - 確保 `delay` 和 `conflict` 類型包含 `description` 信息（從 `row.description` 或 `payload.description`）
  - 確保所有通知類型都包含必要的字段（taskId, clientName, serviceName, assignee, dueDate 等）
  - 驗證 DashboardAlerts 表中的 `alert_type` 字段值是否正確（應為 overdue, upcoming, delay, conflict）
  - _Leverage: backend/src/handlers/dashboard/alerts.js, DashboardAlerts 表_
  - _Requirements: BR15.4_
  - _Prompt: Role: Backend Developer with expertise in API data transformation | Task: Enhance handleDashboardAlerts to properly map BR2.6 notification types to frontend display format, ensure upcoming type includes remainingDays, delay and conflict types include description. Verify alert_type values in DashboardAlerts table are correct (overdue, upcoming, delay, conflict) | Restrictions: Must maintain backward compatibility, ensure all notification types are properly mapped, handle missing fields gracefully | Success: All notification types are correctly mapped, data format is consistent with frontend requirements, remainingDays and description are included when applicable_

- [x] 6. 驗證今日摘要計算範圍
  - File: backend/src/handlers/dashboard/dashboard-admin.js
  - 確認今日摘要計算全公司所有員工的任務
  - 確認統計邏輯的正確性
  - _Leverage: backend/src/handlers/dashboard/dashboard-admin.js_
  - _Requirements: BR15.1, BR15.3_
  - _Status: 已完成 - 今日摘要計算範圍已正確實現_

- [x] 7. 驗證已完成任務僅顯示選定月份
  - File: backend/src/handlers/dashboard/dashboard-admin.js
  - 確認已完成任務僅在選定月份顯示
  - 確認查詢邏輯的正確性
  - _Leverage: backend/src/handlers/dashboard/dashboard-admin.js_
  - _Requirements: BR15.1_
  - _Status: 已完成 - 已完成任務僅顯示選定月份的邏輯已正確實現_

- [x] 8. 驗證工時計算排除國定假日
  - File: backend/src/handlers/dashboard/dashboard-admin.js
  - 確認工時計算正確排除國定假日
  - 確認只計算週一至週五
  - 確認當前月份只計算到今天為止
  - _Leverage: backend/src/handlers/dashboard/dashboard-admin.js_
  - _Requirements: BR15.1_
  - _Status: 已完成 - 工時計算排除國定假日的邏輯已正確實現_

- [x] 9. 驗證財務狀況本年累計包含到當天為止的數據
  - File: backend/src/handlers/dashboard/dashboard-admin.js
  - 確認本年累計模式包含到當天為止的數據
  - 確認查詢邏輯的正確性
  - _Leverage: backend/src/handlers/dashboard/dashboard-admin.js_
  - _Requirements: BR15.1_
  - _Status: 已完成 - 財務狀況本年累計包含到當天為止的數據已正確實現_

- [ ] 10. 編寫 E2E 測試 - 管理員儀表板
  - File: tests/e2e/dashboard/dashboard-admin.spec.ts
  - 測試管理員查看儀表板的所有功能
  - Purpose: 確保管理員儀表板功能完整可用，所有功能正常運作
  - 測試今日摘要、即時提醒、各員工任務狀態、各員工工時、財務狀況等
  - 測試數據篩選和切換功能
  - 測試提醒顯示格式（不同通知類型的圖標、顏色、標籤）
  - 驗證權限控制：管理員應看到全公司所有員工的統計數據和提醒
  - 使用測試數據工具設置測試數據
  - 使用管理員帳號（`admin`/`111111`）進行測試
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR15.1, BR15.3, BR15.4, BR15.6_
  - _Prompt: Role: QA Automation Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for admin dashboard covering all features: daily summary, alerts with BR2.6 notification type formatting, employee tasks, employee hours, financial status, data filtering and switching. Verify permission control: admin should see all employees' statistics and alerts. Use test data setup utilities and admin account (admin/111111) | Restrictions: Must test all admin dashboard features, verify permission control, use test data utilities, test with admin account, verify notification type formatting | Success: All admin dashboard features are tested, permission control verified, tests pass consistently, all data filtering and switching works correctly, notification types are displayed correctly_

- [ ] 11. 編寫 E2E 測試 - 員工儀表板
  - File: tests/e2e/dashboard/dashboard-employee.spec.ts
  - 測試員工查看儀表板的所有功能
  - Purpose: 確保員工儀表板功能完整可用，所有功能正常運作
  - 測試我的工時、我的任務、待開收據提醒
  - 驗證不顯示「我的假期」組件
  - 驗證權限控制：員工應僅看到與自己相關的統計數據和提醒
  - 使用測試數據工具設置測試數據
  - 使用員工帳號（`liu`/`111111`）進行測試
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR15.2, BR15.6_
  - _Prompt: Role: QA Automation Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for employee dashboard covering all features: my hours, my tasks, receipts pending. Verify MyLeaves component is not displayed. Verify permission control: employee should only see their own statistics and alerts. Use test data setup utilities and employee account (liu/111111) | Restrictions: Must test all employee dashboard features, verify MyLeaves is not shown, verify permission control, use test data utilities, test with employee account | Success: All employee dashboard features are tested, MyLeaves is not displayed, permission control verified, tests pass consistently_

- [x] 12. 驗證自動刷新功能
  - File: src/views/Dashboard.vue
  - 確認自動刷新功能（每 5 分鐘）
  - 確認頁面獲得焦點時自動刷新
  - 確認不需要手動刷新按鈕
  - _Leverage: src/views/Dashboard.vue_
  - _Requirements: BR15.5_
  - _Status: 已完成 - 自動刷新功能已正確實現（每 5 分鐘刷新，頁面獲得焦點時刷新，無手動刷新按鈕）_

# Tasks Document: BR7: 假期管理（Leaves）

## 三方差異分析結果

### 已實現功能

1. **假期餘額查詢 API** ✅ 已實現
   - `handleGetLeaveBalances` - 完整實現假期餘額查詢邏輯
   - 特休/病假/事假餘額查詢（從 LeaveBalances 表）
   - 補休餘額查詢（從 CompensatoryLeaveGrants 表，按 generated_date 排序）
   - 生活事件假期餘額查詢（從 LifeEventLeaveGrants 表）
   - 正確過濾掉 days_remaining = 0 的生活事件假期餘額
   - 快取機制（KV + D1 Cache）

2. **假期記錄查詢 API** ✅ 已實現
   - `handleGetLeaves` - 完整實現假期記錄查詢邏輯
   - 依期間（年份、月份）篩選
   - 依人員篩選（管理員可查看所有員工）
   - 依假別篩選
   - 排序、分頁、快取機制

3. **生活事件管理 API** ✅ 已實現
   - `handleCreateLifeEvent` - 生活事件登記邏輯完整實現
   - `handleDeleteLifeEvent` - 生活事件刪除邏輯完整實現
   - `handleGetLifeEvents` - 生活事件記錄查詢邏輯完整實現

4. **假別選單過濾工具** ✅ 已實現
   - `getLeaveTypeOptions` - 假別選單過濾邏輯完整實現
   - 基本假別顯示（特休、病假、事假、補休、公假、颱風假）
   - 生理假僅顯示給女性員工
   - 生活事件相關假別僅在餘額 > 0 時顯示

5. **前端組件** ✅ 已實現
   - `Leaves.vue` - 假期管理主頁面完整實現
   - `ApplyLeaveModal.vue` - 假期申請表單完整實現
   - `LeaveRecords.vue` - 假期記錄列表組件
   - `LifeEventRecords.vue` - 生活事件記錄列表組件
   - `RegisterEventModal.vue` - 登記生活事件彈窗

6. **前端 API 調用函數** ✅ 已實現
   - `src/api/leaves.js` - 所有假期相關 API 調用函數完整實現

7. **颱風假假別支援** ✅ 已實現
   - `src/constants/leaveTypes.js` - 颱風假假別常量定義

### 未實現或部分實現功能

1. **假期申請 API 餘額檢查和補休 FIFO 扣減** ⚠️ 需要補完
   - 需求：實現餘額檢查邏輯（特休/病假/事假、補休、生活事件假期）、補休 FIFO 扣減邏輯、颱風假特殊處理
   - 現狀：需要確認 `handleCreateLeave` 是否已完整實現所有邏輯

2. **假期編輯 API 餘額歸還和重新扣減** ⚠️ 需要補完
   - 需求：實現歸還原來的額度、檢查新額度、重新扣減額度（包含補休 FIFO 邏輯）
   - 現狀：需要確認 `handleUpdateLeave` 是否已完整實現所有邏輯

3. **假期刪除 API 餘額歸還** ⚠️ 需要補完
   - 需求：實現歸還對應的假期餘額（包含補休 FIFO 歸還邏輯）
   - 現狀：需要確認 `handleDeleteLeave` 是否已完整實現所有邏輯

4. **午休時間計算修正** ⚠️ 需要修正
   - 需求：午休時間應為 12:00-13:00
   - 現狀：需要確認 `leaveCalculator.js` 中的午休時間設定是否正確

5. **補休到期自動轉換為加班費功能** ❌ 完全未實現
   - 需求：實現補休到期檢查和轉換邏輯
   - 現狀：需要確認是否已實現

6. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 假期申請 API Handler

- [ ] 1.1.1 實現假期申請 API Handler（包含餘額檢查和補休 FIFO 扣減）
  - File: backend/src/handlers/leaves/leave-crud.js
  - Function: handleCreateLeave
  - 實現假期申請創建邏輯
  - Purpose: 提供假期申請 API，支援餘額檢查、扣減和記錄創建
  - **更新**: 加入餘額檢查邏輯（特休/病假/事假檢查 LeaveBalances，補休檢查 CompensatoryLeaveGrants，生活事件假期檢查 LifeEventLeaveGrants）
  - **更新**: 實現颱風假特殊處理（無餘額檢查，無餘額扣減，無餘額限制）
  - **更新**: 實現餘額不足時阻止提交並返回錯誤（颱風假除外）
  - **更新**: 實現補休 FIFO 扣減邏輯（按 generated_date 排序，先扣最早產生的）
  - **更新**: 實現補休部分使用時更新 `hours_remaining` 和 `hours_used`（`hours_remaining = hours_generated - hours_used`），狀態保持為 'active'
  - **更新**: 實現補休完全使用時更新 CompensatoryLeaveGrants 狀態為 'fully_used'，並更新 `hours_used` 等於 `hours_generated`，`hours_remaining` 等於 0
  - 確認路由配置（backend/src/router/leaves.js 中的 POST /api/v2/leaves 路由）
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js, backend/src/handlers/leaves/leave-balances.js, backend/src/utils/payroll-recalculate.js_
  - _Requirements: BR7.1, BR7.6_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update handleCreateLeave function in leave-crud.js to add balance checking and FIFO comp leave deduction logic. The function should check balances for different leave types (annual/sick/personal from LeaveBalances, comp from CompensatoryLeaveGrants with FIFO logic, life event leaves from LifeEventLeaveGrants), handle typhoon leave specially (no balance check, no balance deduction, no balance limit), prevent submission when balance is insufficient (except for typhoon leave), implement FIFO deduction for comp leaves (by generated_date), handle partial comp leave usage correctly, and handle full comp leave usage. Ensure the route is properly configured in backend/src/router/leaves.js | Restrictions: Must use parameterized queries to prevent SQL injection, must ensure atomic operations for balance deduction, must implement FIFO logic correctly for comp leaves, must handle typhoon leave correctly, must handle all leave types correctly | Success: Function creates leave application with proper balance checking and FIFO comp deduction logic, typhoon leave is handled correctly, balance deduction is atomic and correct, FIFO logic works for comp leaves_

### 1.2 假期編輯 API Handler

- [ ] 1.2.1 實現假期編輯 API Handler（包含餘額歸還和重新扣減 FIFO 邏輯）
  - File: backend/src/handlers/leaves/leave-crud.js
  - Function: handleUpdateLeave
  - 實現假期編輯邏輯
  - Purpose: 提供假期編輯 API，支援餘額歸還和重新扣減
  - **更新**: 實現歸還原來的額度（特休/病假/事假歸還到 LeaveBalances，補休按 FIFO 順序歸還到 CompensatoryLeaveGrants 並更新 hours_remaining 和 hours_used，生活事件假期歸還到 LifeEventLeaveGrants）
  - **更新**: 實現檢查新額度是否超過可用餘額，超過則不允許修改
  - **更新**: 實現扣減新的額度（同創建邏輯，包含 FIFO 補休扣減）
  - 確認路由配置（backend/src/router/leaves.js 中的 PUT /api/v2/leaves/:id 路由）
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js, backend/src/utils/payroll-recalculate.js_
  - _Requirements: BR7.4, BR7.6_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update handleUpdateLeave function in leave-crud.js to implement balance return and re-deduction with FIFO logic. The function should return original balance (annual/sick/personal to LeaveBalances, comp to CompensatoryLeaveGrants using FIFO, life event leaves to LifeEventLeaveGrants), check if new amount exceeds available balance and prevent update if so, deduct new balance (same FIFO logic as creation), update LeaveRequests record, trigger payroll recalculation asynchronously, and clear cache. Ensure the route is properly configured in backend/src/router/leaves.js | Restrictions: Must use parameterized queries to prevent SQL injection, must ensure atomic operations for balance return and deduction, must prevent update when new amount exceeds balance, must implement FIFO logic correctly for comp leaves, must handle all leave types correctly | Success: Function updates leave record correctly with proper balance return and re-deduction FIFO logic, update is prevented when new amount exceeds balance, all leave types are handled correctly_

### 1.3 假期刪除 API Handler

- [ ] 1.3.1 實現假期刪除 API Handler（包含餘額歸還 FIFO 邏輯）
  - File: backend/src/handlers/leaves/leave-crud.js
  - Function: handleDeleteLeave
  - 實現假期刪除邏輯
  - Purpose: 提供假期刪除 API，支援餘額歸還
  - **更新**: 實現歸還對應的假期餘額（特休/病假/事假歸還到 LeaveBalances，補休按 FIFO 順序歸還到 CompensatoryLeaveGrants 並更新 hours_remaining 和 hours_used，生活事件假期歸還到 LifeEventLeaveGrants）
  - 確認路由配置（backend/src/router/leaves.js 中的 DELETE /api/v2/leaves/:id 路由）
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js, backend/src/utils/payroll-recalculate.js_
  - _Requirements: BR7.4, BR7.6_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Update handleDeleteLeave function in leave-crud.js to implement balance return with FIFO logic. The function should return corresponding balance (annual/sick/personal to LeaveBalances, comp to CompensatoryLeaveGrants using FIFO, life event leaves to LifeEventLeaveGrants), soft delete LeaveRequests record (set is_deleted = 1), trigger payroll recalculation asynchronously, and clear cache. Ensure the route is properly configured in backend/src/router/leaves.js | Restrictions: Must use parameterized queries to prevent SQL injection, must ensure atomic operations for balance return, must implement FIFO logic correctly for comp leaves, must handle all leave types correctly | Success: Function deletes leave record correctly with proper balance return FIFO logic, all leave types are handled correctly_

### 1.4 補休到期自動轉換功能

- [ ] 1.4.1 實現補休到期自動轉換為加班費功能
  - File: backend/src/handlers/leaves/leave-recalculate.js
  - Function: handleExpireCompensatoryLeaves
  - 實現補休到期檢查和轉換邏輯
  - Purpose: 自動將到期的補休轉換為加班費
  - 實現查詢到期補休（expiry_date <= 當前日期，status = 'active'）
  - 實現轉換剩餘時數為加班費（入薪資系統）
  - 實現更新 CompensatoryLeaveGrants 狀態為 'expired'
  - 實現觸發薪資重新計算
  - 實現清除快取
  - 確認定時任務配置（可選：使用 Cloudflare Cron Triggers）
  - _Leverage: backend/src/utils/response.js, backend/src/utils/cache.js, backend/src/utils/payroll-recalculate.js_
  - _Requirements: BR7.6, BR7.8_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and scheduled tasks | Task: Implement handleExpireCompensatoryLeaves function that checks for expired compensatory leaves, converts remaining hours to overtime pay (integrate with payroll system), updates CompensatoryLeaveGrants status to 'expired', triggers payroll recalculation, and clears cache. Optionally configure scheduled task using Cloudflare Cron Triggers | Restrictions: Must use parameterized queries, must handle all expired leaves correctly, must integrate with payroll system correctly, must follow existing response format patterns | Success: Function checks expired leaves correctly, converts to overtime pay correctly, updates status correctly, triggers payroll recalculation, cache is cleared, scheduled task is configured (if applicable)_

---

## 2. 前端組件實現

### 2.1 假期申請組件時數計算修正

- [ ] 2.1.1 修正前端假期申請組件時數計算（午休時間修正）
  - File: src/components/leaves/ApplyLeaveModal.vue
  - **已實現**: 假期申請表單完整實現
  - **已實現**: 假別選擇（使用 getLeaveTypeOptions 過濾選項）
  - **已實現**: 日期和時間選擇
  - **更新**: 修正自動計算請假時數（午休時間應為 12:00-13:00，而非 12:30-13:30）
  - **已實現**: 餘額檢查和警告顯示
  - **已實現**: 表單驗證
  - **已實現**: 提交處理
  - _Leverage: src/utils/leaveTypeFilter.js, src/utils/leaveCalculator.js, src/utils/timeOptions.js, Ant Design Vue components_
  - _Requirements: BR7.1, BR7.7_

### 2.2 時數計算邏輯修正

- [ ] 2.2.1 修正時數計算邏輯（午休時間）
  - File: src/utils/leaveCalculator.js
  - Function: calculateHours
  - **問題**: 當前午休時間設定為 12:30-13:30，但需求要求為 12:00-13:00
  - **修正**: 將午休時間從 12:30-13:30 改為 12:00-13:00
  - _Requirements: BR7.1_

---

## 3. 已實現功能驗證

### 3.1 假期餘額查詢 API

- [x] 3.1.1 驗證假期餘額查詢 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/leaves/leave-balances.js
  - Function: handleGetLeaveBalances
  - 驗證假期餘額查詢邏輯完整實現
  - 驗證特休/病假/事假餘額查詢（從 LeaveBalances 表）
  - 驗證補休餘額查詢（從 CompensatoryLeaveGrants 表，按 generated_date 排序）
  - 驗證生活事件假期餘額查詢（從 LifeEventLeaveGrants 表）
  - 驗證正確過濾掉 days_remaining = 0 的生活事件假期餘額
  - 驗證確保基本假期餘額存在（ensureBasicLeaveBalances）
  - 驗證快取機制（KV + D1 Cache）
  - 驗證路由配置正確
  - _Requirements: BR7.2_
  - _Status: 已完成_

### 3.2 假期記錄查詢 API

- [x] 3.2.1 驗證假期記錄查詢 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/leaves/leave-crud.js
  - Function: handleGetLeaves
  - 驗證假期記錄查詢邏輯完整實現
  - 驗證依期間（年份、月份）篩選（前端實現）
  - 驗證依人員篩選（管理員可查看所有員工）
  - 驗證依假別篩選（前端實現）
  - 驗證排序（按 submitted_at 降序）
  - 驗證分頁（預設 20 筆，最多 100 筆）
  - 驗證快取機制（KV + D1 Cache）
  - 驗證路由配置正確
  - _Requirements: BR7.3_
  - _Status: 已完成_

### 3.3 生活事件管理 API

- [x] 3.3.1 驗證生活事件登記 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/leaves/leave-life-events.js
  - Function: handleCreateLifeEvent
  - 驗證生活事件登記邏輯完整實現
  - 驗證根據事件類型確定對應的假別和天數
  - 驗證創建 LifeEventLeaveGrants 記錄
  - 驗證清除快取
  - 驗證路由配置正確
  - _Requirements: BR7.5_
  - _Status: 已完成_

- [x] 3.3.2 驗證生活事件刪除 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/leaves/leave-life-events.js
  - Function: handleDeleteLifeEvent
  - 驗證生活事件刪除邏輯完整實現
  - 驗證刪除 LifeEventLeaveGrants 記錄
  - 驗證清除快取
  - 驗證路由配置正確
  - _Requirements: BR7.5_
  - _Status: 已完成_

- [x] 3.3.3 驗證生活事件記錄查詢 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/leaves/leave-life-events.js
  - Function: handleGetLifeEvents
  - 驗證生活事件記錄查詢邏輯完整實現
  - 驗證查詢用戶的生活事件記錄（從 LifeEventLeaveGrants 表）
  - 驗證排序（按 event_date 降序）
  - 驗證路由配置正確
  - _Requirements: BR7.5_
  - _Status: 已完成_

### 3.4 假別選單過濾工具

- [x] 3.4.1 驗證假別選單過濾工具已實現 ✅ 已實現
  - File: src/utils/leaveTypeFilter.js
  - Function: getLeaveTypeOptions
  - 驗證假別選單過濾邏輯完整實現
  - 驗證基本假別顯示（特休、病假、事假、補休、公假、颱風假）給所有員工
  - 驗證生理假僅顯示給女性員工
  - 驗證生活事件相關假別（產假、產檢假、陪產假、婚假、喪假）僅在餘額 > 0 時顯示
  - 驗證根據性別過濾假別選項
  - _Requirements: BR7.7_
  - _Status: 已完成_

### 3.5 前端組件

- [x] 3.5.1 驗證前端假期列表頁面已實現 ✅ 已實現
  - File: src/views/Leaves.vue
  - 驗證假期管理主頁面完整實現
  - 驗證假期餘額總覽顯示
  - 驗證假期記錄列表顯示（使用 LeaveRecords 組件）
  - 驗證生活事件記錄列表顯示（使用 LifeEventRecords 組件）
  - 驗證篩選功能（年份、月份、假別、員工）
  - 驗證申請假期按鈕和彈窗
  - 驗證登記生活事件按鈕和彈窗
  - 驗證編輯和刪除功能
  - _Requirements: BR7.1, BR7.2, BR7.3, BR7.5_
  - _Status: 已完成_

### 3.6 前端 API 調用函數

- [x] 3.6.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/leaves.js
  - 驗證所有假期相關 API 調用函數完整實現
  - 驗證 fetchLeaveBalances 函數（調用 GET /api/v2/leaves/balances）
  - 驗證 fetchLeaves 函數（調用 GET /api/v2/leaves）
  - 驗證 createLeave 函數（調用 POST /api/v2/leaves）
  - 驗證 updateLeave 函數（調用 PUT /api/v2/leaves/:id）
  - 驗證 deleteLeave 函數（調用 DELETE /api/v2/leaves/:id）
  - 驗證 fetchLifeEvents 函數（調用 GET /api/v2/leaves/life-events）
  - 驗證 createLifeEvent 函數（調用 POST /api/v2/leaves/life-events）
  - 驗證 deleteLifeEvent 函數（調用 DELETE /api/v2/leaves/life-events/:id）
  - 驗證 recalculateLeaveBalances 函數（調用 POST /api/v2/leaves/recalculate-balances/:userId）
  - 驗證統一的錯誤處理和回應格式處理
  - _Requirements: BR7.1, BR7.2, BR7.3, BR7.4, BR7.5_
  - _Status: 已完成_

### 3.7 颱風假假別支援

- [x] 3.7.1 驗證颱風假假別支援已實現 ✅ 已實現
  - File: src/constants/leaveTypes.js
  - 驗證颱風假假別常量定義
  - 驗證颱風假在假別選單中顯示（所有員工可用）
  - 驗證後端颱風假處理（無餘額檢查，無餘額扣減）需要確認
  - _Requirements: BR7.1_
  - _Status: 前端已完成，後端需要確認_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 創建假期管理 E2E 測試套件
  - File: tests/e2e/leaves/leave-application.spec.ts
  - 測試假期申請流程
  - Purpose: 確保假期申請功能完整可用，所有業務邏輯正常運作
  - 測試基本假期申請（特休、病假、事假）
  - 測試補休 FIFO 扣減
  - 測試補休部分使用和完全使用
  - 測試生活事件假期申請
  - 測試颱風假申請（無餘額限制）
  - 測試餘額不足時阻止提交
  - 測試假別選單過濾（根據性別和生活事件餘額）
  - 測試編輯和刪除功能（包含餘額歸還）
  - 測試生活事件登記和刪除
  - 測試補休到期轉換為加班費（可選：模擬測試）
  - _Leverage: Playwright, tests/utils/test-data.ts_
  - _Requirements: BR7.1, BR7.2, BR7.3, BR7.4, BR7.5, BR7.6, BR7.7_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create E2E tests for leave application functionality including basic leave application (annual, sick, personal), comp leave FIFO deduction, comp leave partial and full usage, life event leave application, typhoon leave application (no balance limit), balance insufficient prevention, leave type menu filtering (based on gender and life event balances), edit and delete functionality (including balance return), life event registration and deletion, and optional test for comp leave expiry conversion to overtime pay. Use Playwright framework and test data utilities from tests/utils/test-data.ts | Restrictions: Must use Playwright, must test all leave types, must test FIFO logic, must test filtering logic, must use test data utilities, must handle async operations correctly | Success: All E2E tests pass, all leave types are tested, FIFO logic is tested, filtering logic is tested, edit/delete is tested, life event management is tested, comp leave expiry is tested (if applicable)_

---

## 總結

### 已完成功能
- ✅ 假期餘額查詢 API（完整實現 - 特休/病假/事假、補休、生活事件假期）
- ✅ 假期記錄查詢 API（完整實現 - 篩選、排序、分頁、快取）
- ✅ 生活事件管理 API（完整實現 - 登記、刪除、查詢）
- ✅ 假別選單過濾工具（完整實現 - 根據性別和生活事件餘額過濾）
- ✅ 前端組件（完整實現 - 主頁面、申請彈窗、記錄列表、生活事件列表）
- ✅ 前端 API 調用函數（完整實現 - 所有假期相關 API）
- ✅ 颱風假假別支援（前端已實現，後端需要確認）

### 待完成功能
- ⚠️ 假期申請 API 餘額檢查和補休 FIFO 扣減（需要確認並補完）
- ⚠️ 假期編輯 API 餘額歸還和重新扣減（需要確認並補完）
- ⚠️ 假期刪除 API 餘額歸還（需要確認並補完）
- ⚠️ 午休時間計算修正（需要確認並修正為 12:00-13:00）
- ⚠️ 颱風假特殊處理（後端需要確認）
- ❌ 補休到期自動轉換為加班費功能（完全未實現）
- ❌ E2E 測試（完全未實現）

### 備註
- 大部分核心功能已基本實現，包括：
  - 假期餘額查詢（特休/病假/事假、補休、生活事件假期）
  - 假期記錄查詢（篩選、排序、分頁）
  - 生活事件管理（登記、刪除、查詢）
  - 假別選單過濾（根據性別和生活事件餘額）
  - 前端組件和 API 調用函數
- 需要補完的功能：
  - 假期申請 API：需要確認並補完餘額檢查邏輯、補休 FIFO 扣減邏輯、颱風假特殊處理
  - 假期編輯 API：需要確認並補完餘額歸還和重新扣減邏輯（包含補休 FIFO）
  - 假期刪除 API：需要確認並補完餘額歸還邏輯（包含補休 FIFO）
  - 午休時間計算：需要確認並修正為 12:00-13:00
  - 補休到期轉換：需要實現補休到期自動轉換為加班費的功能

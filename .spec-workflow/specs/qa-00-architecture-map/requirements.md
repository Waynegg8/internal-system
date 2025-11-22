# QA-00: 系統架構映射 (Architecture Map)

## Introduction

本規格旨在建立完整的系統架構映射，包含核心模組清單、跨模組依賴關係圖，以及資料庫狀態流轉分析。此映射將作為後續測試規格（Test Specs）的基礎，確保測試路徑規劃符合系統實際依賴關係，並定義統一的測試資料標準（Golden Data Standard）。

**業務價值**：
- 提供清晰的系統架構視圖，幫助開發團隊理解模組間關係
- 為測試規格提供依賴關係基礎，確保測試順序正確
- 定義統一的測試資料標準，確保測試之間可以共享資料
- 支援系統重構和模組化開發，降低技術債務

## Alignment with Product Vision

本規格支援產品願景中的以下目標：
- **模組化設計**：明確模組邊界和依賴關係，支援模組化開發
- **數據完整性**：理解資料流轉路徑，確保數據一致性
- **可測試性**：建立測試路徑圖，提升系統可測試性
- **可維護性**：清晰的架構映射有助於長期維護和擴展

---

## 核心模組清單 (List of Modules)

### 1. 認證與用戶管理模組 (Auth & User Management)
- **後端 Handlers**: `backend/src/handlers/auth.js`, `backend/src/handlers/settings/user-management.js`
- **前端組件**: `src/components/profile/`, `src/views/Login.vue`
- **資料表**: `Users`, `sessions`
- **功能**: 用戶登入/登出、會話管理、用戶基本資訊管理、權限控制

### 2. 客戶管理模組 (Client Management)
- **後端 Handlers**: `backend/src/handlers/clients/`
- **前端組件**: `src/components/clients/`, `src/views/clients/`
- **資料表**: `Clients`, `ClientTagAssignments`, `CustomerTags`, `ClientCollaborators`
- **功能**: 客戶 CRUD、客戶標籤管理、客戶協作者管理、客戶搜尋與篩選

### 3. 服務管理模組 (Service Management)
- **後端 Handlers**: `backend/src/handlers/services.js`, `backend/src/handlers/clients/client-services.js`
- **前端組件**: `src/components/clients/ServiceConfig.vue`, `src/views/settings/SettingsServices.vue`
- **資料表**: `Services`, `ClientServices`, `ServiceBillingSchedule`
- **功能**: 服務項目定義、客戶服務配置、計費計劃管理、服務生命週期管理

### 4. 任務管理模組 (Task Management)
- **後端 Handlers**: `backend/src/handlers/tasks/`, `backend/src/handlers/task-templates/`, `backend/src/handlers/task-generator/`
- **前端組件**: `src/components/tasks/`, `src/views/tasks/`
- **資料表**: `ActiveTasks`, `ActiveTaskStages`, `TaskTemplates`, `TaskTemplateStages`, `TaskStatusUpdates`, `TaskDueDateAdjustments`, `ClientServiceTaskConfigs`
- **功能**: 任務 CRUD、任務階段管理、任務模板管理、任務自動生成、任務狀態追蹤、任務依賴管理

### 5. 工時管理模組 (Timesheet Management)
- **後端 Handlers**: `backend/src/handlers/timesheets/`
- **前端組件**: `src/components/timesheets/`, `src/views/Timesheets.vue`
- **資料表**: `Timesheets`, `WeeklyTimesheetCache`
- **功能**: 工時填報、工時驗證、工時統計、工時快取管理

### 6. 請假管理模組 (Leave Management)
- **後端 Handlers**: `backend/src/handlers/leaves/`
- **前端組件**: `src/components/leaves/`, `src/views/Leaves.vue`
- **資料表**: `Leaves`, `LeaveBalances`, `LifeEvents`
- **功能**: 請假申請、請假餘額管理、生活事件登記、補休 FIFO 管理

### 7. 外出管理模組 (Trip Management)
- **後端 Handlers**: `backend/src/handlers/trips/`
- **前端組件**: `src/components/trips/`, `src/views/Trips.vue`
- **資料表**: `BusinessTrips`
- **功能**: 外出記錄管理、交通補貼計算

### 8. 薪資管理模組 (Payroll Management)
- **後端 Handlers**: `backend/src/handlers/payroll/`
- **前端組件**: `src/components/payroll/`, `src/views/payroll/`
- **資料表**: `MonthlyPayroll`, `PayrollRuns`, `EmployeeSalaryItems`, `SalaryItemTypes`, `MonthlyBonusAdjustments`, `YearEndBonus`, `PayrollSettings`, `PayrollCache`, `PunchRecords`
- **功能**: 薪資計算、薪資項目管理、績效獎金管理、年終獎金管理、薪資系統設定、打卡記錄管理

### 9. 收據管理模組 (Receipt Management)
- **後端 Handlers**: `backend/src/handlers/receipts/`
- **前端組件**: `src/components/receipts/`, `src/views/receipts/`
- **資料表**: `Receipts`, `ReceiptItems`, `Payments`, `ReceiptServiceTypes`, `BillingReminders`, `ReceiptEditHistory`
- **功能**: 收據 CRUD、收據項目管理、付款記錄管理、開票提醒、收據對帳

### 10. 成本管理模組 (Cost Management)
- **後端 Handlers**: `backend/src/handlers/costs/`
- **前端組件**: `src/components/costs/`, `src/views/costs/`
- **資料表**: `CostRecords`, `CostTypes`, `MonthlyOverheadCosts`, `OverheadCostTypes`, `OverheadTemplates`
- **功能**: 成本記錄管理、成本類型管理、管理費用記錄、成本分攤、成本分析

### 11. 知識庫模組 (Knowledge Base)
- **後端 Handlers**: `backend/src/handlers/knowledge/`
- **前端組件**: `src/components/knowledge/`, `src/views/knowledge/`
- **資料表**: `SOPDocuments`, `SOPRelations`, `FAQs`, `Resources`, `ClientServiceSOPs`, `TaskConfigSOPs`, `ActiveTaskSOPs`
- **功能**: SOP 管理、FAQ 管理、資源管理、SOP 關聯管理

### 12. 報表模組 (Reports)
- **後端 Handlers**: `backend/src/handlers/reports/`
- **前端組件**: `src/components/reports/`, `src/views/reports/`
- **資料表**: `ReportCache`, `CacheData`
- **功能**: 月度報表（營收、薪資、員工績效、客戶毛利）、年度報表、報表快取管理

### 13. 儀表板模組 (Dashboard)
- **後端 Handlers**: `backend/src/handlers/dashboard/`
- **前端組件**: `src/components/dashboard/`, `src/views/Dashboard.vue`
- **資料表**: `DashboardAlerts`, `DashboardDailySummary`
- **功能**: 管理員儀表板、員工儀表板、即時提醒、每日摘要

### 14. 系統設定模組 (Settings)
- **後端 Handlers**: `backend/src/handlers/settings/`
- **前端組件**: `src/components/settings/`, `src/views/settings/`
- **資料表**: `CompanySettings`, `SystemSettings`, `Holidays`
- **功能**: 公司設定、系統設定、假期設定、自動化規則管理

### 15. 附件管理模組 (Attachments)
- **後端 Handlers**: `backend/src/handlers/attachments/`
- **前端組件**: `src/components/knowledge/AttachmentUploadDrawer.vue`
- **資料表**: `Attachments`
- **功能**: 附件上傳、附件列表、附件預覽、附件下載與刪除

### 16. 自動化模組 (Automation)
- **後端 Handlers**: `backend/src/handlers/automation/`
- **前端組件**: `src/views/settings/SettingsAutomation.vue`
- **資料表**: `AutomationRules`, `CronJobExecutions`
- **功能**: 自動化規則管理、定時任務執行、任務自動生成觸發

---

## 關鍵依賴鏈 (Critical Dependencies)

### 依賴鏈 1: 客戶服務 → 任務 → 工時 → 薪資
```
Clients → ClientServices → ActiveTasks → Timesheets → Payroll
```
**說明**：
- 客戶建立後，需要設定客戶服務（ClientServices）
- 客戶服務會自動或手動生成任務（ActiveTasks）
- 員工執行任務時記錄工時（Timesheets）
- 工時資料用於計算薪資（Payroll），包括加班費、誤餐費等

**關鍵資料流**：
- `ClientServices.client_service_id` → `ActiveTasks.client_service_id`
- `ActiveTasks.task_id` → `Timesheets` (透過 task_name/service_name 關聯)
- `Timesheets.user_id` + `Timesheets.work_date` → `Payroll` 計算

### 依賴鏈 2: 任務 → 收據 → 報表
```
ActiveTasks → Receipts → Reports (Revenue)
```
**說明**：
- 任務完成後，系統會產生開票提醒（BillingReminders）
- 根據提醒或手動建立收據（Receipts）
- 收據資料用於計算月度/年度營收報表（Reports）

**關鍵資料流**：
- `ActiveTasks.task_id` → `BillingReminders` (任務完成觸發)
- `BillingReminders` → `Receipts` (手動或自動建立)
- `Receipts.receipt_date` + `Receipts.total_amount` → `Reports` 營收計算

### 依賴鏈 3: 用戶 → 工時 → 請假 → 薪資
```
Users → Timesheets + Leaves → Payroll
```
**說明**：
- 用戶（員工）記錄工時和請假
- 工時影響加班費計算
- 請假影響全勤獎金和扣款計算
- 兩者共同影響最終薪資

**關鍵資料流**：
- `Users.user_id` → `Timesheets.user_id` (工時記錄)
- `Users.user_id` → `Leaves.user_id` (請假記錄)
- `Timesheets` + `Leaves` → `Payroll` 計算（底薪、加班費、全勤獎金、請假扣款）

### 依賴鏈 4: 客戶服務 → 計費計劃 → 收據
```
ClientServices → ServiceBillingSchedule → Receipts
```
**說明**：
- 客戶服務設定計費計劃（ServiceBillingSchedule）
- 計費計劃定義每月或一次性收費金額
- 收據建立時參考計費計劃自動帶入金額

**關鍵資料流**：
- `ClientServices.client_service_id` → `ServiceBillingSchedule.client_service_id`
- `ServiceBillingSchedule.billing_month` + `ServiceBillingSchedule.billing_amount` → `Receipts` 建議金額

### 依賴鏈 5: 任務模板 → 任務配置 → 任務生成
```
TaskTemplates → ClientServiceTaskConfigs → ActiveTasks (Auto-generated)
```
**說明**：
- 系統定義任務模板（TaskTemplates）
- 客戶服務配置任務配置（ClientServiceTaskConfigs），可基於模板
- 定時任務（Cron）根據配置自動生成任務（ActiveTasks）

**關鍵資料流**：
- `TaskTemplates.template_id` → `ClientServiceTaskConfigs` (可選，基於模板建立)
- `ClientServiceTaskConfigs.config_id` → `ActiveTasks` (自動生成時使用)

### 依賴鏈 6: 工時 → 成本分攤 → 報表
```
Timesheets → CostAllocation → Reports (Client Profitability)
```
**說明**：
- 工時記錄包含客戶和服務資訊
- 成本分攤模組根據工時將管理費用分攤到客戶
- 分攤結果用於計算客戶毛利報表

**關鍵資料流**：
- `Timesheets.client_id` + `Timesheets.hours` → 成本分攤計算
- 成本分攤結果 → `Reports` 客戶毛利計算

### 依賴鏈 7: 外出 → 薪資（交通補貼）
```
BusinessTrips → Payroll (Transport Allowance)
```
**說明**：
- 員工記錄外出（BusinessTrips），包含公里數
- 薪資計算時根據外出記錄計算交通補貼

**關鍵資料流**：
- `BusinessTrips.user_id` + `BusinessTrips.month` + `BusinessTrips.distance_km` → `Payroll` 交通補貼計算

### 依賴鏈 8: 任務 → SOP → 知識庫
```
ActiveTasks → ActiveTaskSOPs → SOPDocuments
```
**說明**：
- 任務可以關聯 SOP（標準作業程序）
- SOP 來自知識庫模組
- 任務執行時可以查看相關 SOP

**關鍵資料流**：
- `ActiveTasks.task_id` → `ActiveTaskSOPs.task_id`
- `ActiveTaskSOPs.sop_id` → `SOPDocuments.sop_id`

---

## 資料庫狀態流轉 (Database State Transitions)

### 1. User（用戶/員工）狀態流轉

**初始狀態**：用戶建立
```
Users.created_at = now
Users.is_deleted = 0
Users.base_salary = 40000 (預設值)
```

**狀態變更路徑**：
1. **設定薪資** → `Users.base_salary` 更新
2. **設定薪資項目** → `EmployeeSalaryItems` 建立（allowance, bonus, deduction）
3. **記錄工時** → `Timesheets` 建立（影響薪資計算）
4. **申請請假** → `Leaves` 建立（影響全勤獎金和扣款）
5. **記錄外出** → `BusinessTrips` 建立（影響交通補貼）
6. **計算薪資** → `MonthlyPayroll` 建立（每月結算）
7. **軟刪除** → `Users.is_deleted = 1`, `Users.deleted_at = now`

**關鍵關聯**：
- `Users.user_id` → `Timesheets.user_id` (一對多)
- `Users.user_id` → `Leaves.user_id` (一對多)
- `Users.user_id` → `MonthlyPayroll.user_id` (一對多)
- `Users.user_id` → `EmployeeSalaryItems.user_id` (一對多)

### 2. Client（客戶）狀態流轉

**初始狀態**：客戶建立
```
Clients.client_id = tax_registration_number
Clients.is_deleted = 0
Clients.business_status = '營業中'
```

**狀態變更路徑**：
1. **新增服務** → `ClientServices` 建立
2. **設定計費計劃** → `ServiceBillingSchedule` 建立
3. **自動生成任務** → `ActiveTasks` 建立（根據 ClientServices 配置）
4. **任務完成** → `ActiveTasks.status = 'completed'`
5. **產生開票提醒** → `BillingReminders` 建立（任務完成觸發）
6. **建立收據** → `Receipts` 建立（手動或從提醒建立）
7. **記錄付款** → `Payments` 建立（收據付款）
8. **軟刪除** → `Clients.is_deleted = 1`, `Clients.deleted_at = now`

**關鍵關聯**：
- `Clients.client_id` → `ClientServices.client_id` (一對多)
- `Clients.client_id` → `ActiveTasks.client_id` (一對多，透過 ClientServices)
- `Clients.client_id` → `Receipts.client_id` (一對多)
- `Clients.client_id` → `Timesheets.client_id` (一對多)

### 3. ClientService（客戶服務）狀態流轉

**初始狀態**：客戶服務建立
```
ClientServices.status = 'active'
ClientServices.is_deleted = 0
ClientServices.auto_generate_tasks = 1
```

**狀態變更路徑**：
1. **設定任務配置** → `ClientServiceTaskConfigs` 建立
2. **設定計費計劃** → `ServiceBillingSchedule` 建立
3. **自動生成任務** → `ActiveTasks` 建立（每月定時任務觸發）
4. **暫停服務** → `ClientServices.status = 'suspended'`, `ClientServices.suspended_at = now`
5. **恢復服務** → `ClientServices.status = 'active'`, `ClientServices.resumed_at = now`
6. **取消服務** → `ClientServices.status = 'cancelled'`, `ClientServices.cancelled_at = now`
7. **軟刪除** → `ClientServices.is_deleted = 1`

**關鍵關聯**：
- `ClientServices.client_service_id` → `ActiveTasks.client_service_id` (一對多)
- `ClientServices.client_service_id` → `ServiceBillingSchedule.client_service_id` (一對多)
- `ClientServices.client_service_id` → `ClientServiceTaskConfigs.client_service_id` (一對多)

### 4. ActiveTask（任務）狀態流轉

**初始狀態**：任務建立（自動生成或手動建立）
```
ActiveTasks.status = 'in_progress'
ActiveTasks.is_deleted = 0
ActiveTasks.is_overdue = 0
```

**狀態變更路徑**：
1. **開始執行** → `ActiveTasks.status = 'in_progress'`（預設狀態）
2. **更新階段** → `ActiveTaskStages.status` 更新（pending → in_progress → completed）
3. **記錄狀態更新** → `TaskStatusUpdates` 建立（記錄狀態變更歷史）
4. **調整到期日** → `TaskDueDateAdjustments` 建立（記錄調整歷史）
5. **所有階段完成** → `ActiveTasks.status = 'completed'`, `ActiveTasks.completed_at = now`
6. **產生開票提醒** → `BillingReminders` 建立（任務完成觸發）
7. **取消任務** → `ActiveTasks.status = 'cancelled'`
8. **軟刪除** → `ActiveTasks.is_deleted = 1`

**關鍵關聯**：
- `ActiveTasks.task_id` → `ActiveTaskStages.task_id` (一對多)
- `ActiveTasks.task_id` → `TaskStatusUpdates.task_id` (一對多)
- `ActiveTasks.task_id` → `TaskDueDateAdjustments.task_id` (一對多)
- `ActiveTasks.task_id` → `BillingReminders` (任務完成觸發建立)

### 5. Timesheet（工時）狀態流轉

**初始狀態**：工時記錄建立
```
Timesheets.is_deleted = 0
Timesheets.work_type = 'normal'
```

**狀態變更路徑**：
1. **記錄工時** → `Timesheets` 建立（user_id, work_date, client_id, hours）
2. **清除快取** → `WeeklyTimesheetCache.invalidated = 1`（工時更新時）
3. **觸發薪資重算** → `PayrollCache` 更新（異步觸發）
4. **失效報表快取** → `ReportCache` 失效（年度報表快取）
5. **軟刪除** → `Timesheets.is_deleted = 1`

**關鍵關聯**：
- `Timesheets.user_id` → `Users.user_id` (多對一)
- `Timesheets.client_id` → `Clients.client_id` (多對一，可為空)
- `Timesheets` → `Payroll` 計算（透過 user_id + work_date 聚合）

### 6. Receipt（收據）狀態流轉

**初始狀態**：收據建立
```
Receipts.status = 'unpaid'
Receipts.is_deleted = 0
Receipts.paid_amount = 0
```

**狀態變更路徑**：
1. **建立收據** → `Receipts` 建立（從 BillingReminders 或手動建立）
2. **新增收據項目** → `ReceiptItems` 建立（多個服務項目）
3. **記錄付款** → `Payments` 建立，`Receipts.paid_amount` 更新
4. **更新狀態** → `Receipts.status = 'paid'`（當 paid_amount >= total_amount）
5. **編輯歷史** → `ReceiptEditHistory` 建立（記錄編輯歷史）
6. **取消收據** → `Receipts.status = 'cancelled'`（透過 ReceiptCancel）
7. **軟刪除** → `Receipts.is_deleted = 1`

**關鍵關聯**：
- `Receipts.receipt_id` → `ReceiptItems.receipt_id` (一對多)
- `Receipts.receipt_id` → `Payments.receipt_id` (一對多)
- `Receipts.client_id` → `Clients.client_id` (多對一)
- `Receipts.related_task_id` → `ActiveTasks.task_id` (多對一，可為空)

### 7. Payroll（薪資）狀態流轉

**初始狀態**：薪資計算觸發
```
MonthlyPayroll 建立（每月結算）
PayrollCache 更新（快取計算結果）
```

**狀態變更路徑**：
1. **觸發計算** → 手動觸發或定時任務觸發（Cron）
2. **讀取基礎資料** → `Users.base_salary`, `EmployeeSalaryItems`（有效項目）
3. **讀取工時資料** → `Timesheets`（該月工時統計）
4. **讀取請假資料** → `Leaves`（該月請假統計）
5. **讀取外出資料** → `BusinessTrips`（該月外出統計）
6. **計算各項金額** → 底薪、加給、獎金、加班費、補助、扣款
7. **儲存結果** → `MonthlyPayroll` 建立，`PayrollCache` 更新
8. **產生薪資單** → 前端顯示詳細計算明細

**關鍵關聯**：
- `MonthlyPayroll.user_id` → `Users.user_id` (多對一)
- `MonthlyPayroll.run_id` → `PayrollRuns.run_id` (多對一)
- `PayrollCache.user_id` → `Users.user_id` (多對一，快取表)

### 8. Leave（請假）狀態流轉

**初始狀態**：請假申請
```
Leaves.status = 'pending'
Leaves.is_deleted = 0
```

**狀態變更路徑**：
1. **申請請假** → `Leaves` 建立（status = 'pending'）
2. **審核通過** → `Leaves.status = 'approved'`
3. **更新餘額** → `LeaveBalances` 更新（扣除對應假期餘額）
4. **記錄生活事件** → `LifeEvents` 建立（如結婚、生產等，影響假期餘額）
5. **補休管理** → 補休 FIFO 邏輯（先產生先使用）
6. **影響薪資** → 請假扣款計算（影響全勤獎金和日薪扣款）
7. **軟刪除** → `Leaves.is_deleted = 1`

**關鍵關聯**：
- `Leaves.user_id` → `Users.user_id` (多對一)
- `Leaves.user_id` → `LeaveBalances.user_id` (多對一)
- `Leaves` → `Payroll` 計算（透過 user_id + leave_date 聚合）

---

## 跨模組資料流轉範例

### 範例 1: 完整客戶服務流程
```
1. 建立客戶 (Clients)
   ↓
2. 新增客戶服務 (ClientServices)
   ↓
3. 設定任務配置 (ClientServiceTaskConfigs)
   ↓
4. 設定計費計劃 (ServiceBillingSchedule)
   ↓
5. 自動生成任務 (ActiveTasks) - 定時任務觸發
   ↓
6. 員工記錄工時 (Timesheets) - 關聯任務
   ↓
7. 任務完成 (ActiveTasks.status = 'completed')
   ↓
8. 產生開票提醒 (BillingReminders)
   ↓
9. 建立收據 (Receipts) - 從提醒或手動建立
   ↓
10. 記錄付款 (Payments)
    ↓
11. 更新報表 (Reports) - 營收統計
```

### 範例 2: 完整薪資計算流程
```
1. 員工記錄工時 (Timesheets) - 包含正常工時和加班
   ↓
2. 員工申請請假 (Leaves) - 影響全勤獎金
   ↓
3. 員工記錄外出 (BusinessTrips) - 影響交通補貼
   ↓
4. 觸發薪資計算 (Payroll Calculation) - 手動或定時
   ↓
5. 讀取基礎資料
   - Users.base_salary
   - EmployeeSalaryItems (加給、獎金、扣款)
   ↓
6. 讀取工時資料
   - Timesheets (統計該月工時、加班時數)
   - 計算加班費、誤餐費
   ↓
7. 讀取請假資料
   - Leaves (統計該月請假天數)
   - 計算全勤獎金、請假扣款
   ↓
8. 讀取外出資料
   - BusinessTrips (統計該月外出公里數)
   - 計算交通補貼
   ↓
9. 計算各項金額
   - 底薪 + 加給 + 獎金 + 加班費 + 補助 - 扣款
   ↓
10. 儲存結果
    - MonthlyPayroll 建立
    - PayrollCache 更新
    ↓
11. 產生薪資單 (前端顯示)
```

### 範例 3: 任務自動生成流程
```
1. 定時任務觸發 (Cron: 每日 00:30 UTC)
   ↓
2. 讀取所有啟用的客戶服務 (ClientServices)
   - status = 'active'
   - use_for_auto_generate = 1
   ↓
3. 檢查每個客戶服務的任務配置 (ClientServiceTaskConfigs)
   ↓
4. 判斷是否應該在當月生成
   - 檢查 execution_months
   - 檢查生效日期
   - 檢查是否已存在任務
   ↓
5. 計算到期日 (根據 due_rule 和 due_value)
   ↓
6. 建立任務 (ActiveTasks)
   - 關聯 client_service_id
   - 設定 due_date
   - 建立任務階段 (ActiveTaskStages)
   ↓
7. 記錄生成事件 (TaskEvents)
```

---

## 資料完整性約束

### 外鍵約束關係
根據資料庫遷移文件分析，主要外鍵約束如下：

1. **Users 表**（被引用表）
   - `sessions.user_id` → `Users.user_id`
   - `Leaves.user_id` → `Users.user_id`
   - `Timesheets.user_id` → `Users.user_id`
   - `MonthlyPayroll.user_id` → `Users.user_id`
   - `EmployeeSalaryItems.user_id` → `Users.user_id`
   - `PunchRecords.user_id` → `Users.user_id`
   - `BusinessTrips.user_id` → `Users.user_id`

2. **Clients 表**（被引用表）
   - `ClientServices.client_id` → `Clients.client_id`
   - `ActiveTasks.client_id` → `Clients.client_id`（透過 ClientServices）
   - `Receipts.client_id` → `Clients.client_id`
   - `Timesheets.client_id` → `Clients.client_id`
   - `ClientTagAssignments.client_id` → `Clients.client_id`
   - `ClientCollaborators.client_id` → `Clients.client_id`

3. **ClientServices 表**（被引用表）
   - `ActiveTasks.client_service_id` → `ClientServices.client_service_id`
   - `ServiceBillingSchedule.client_service_id` → `ClientServices.client_service_id`
   - `ClientServiceTaskConfigs.client_service_id` → `ClientServices.client_service_id`
   - `Receipts.client_service_id` → `ClientServices.client_service_id`

4. **ActiveTasks 表**（被引用表）
   - `ActiveTaskStages.task_id` → `ActiveTasks.task_id`
   - `TaskStatusUpdates.task_id` → `ActiveTasks.task_id`
   - `TaskDueDateAdjustments.task_id` → `ActiveTasks.task_id`
   - `Receipts.related_task_id` → `ActiveTasks.task_id`

5. **Receipts 表**（被引用表）
   - `ReceiptItems.receipt_id` → `Receipts.receipt_id`
   - `Payments.receipt_id` → `Receipts.receipt_id`

### 軟刪除策略
系統採用軟刪除策略，主要表都有 `is_deleted` 欄位：
- 軟刪除時設定 `is_deleted = 1`, `deleted_at = now`, `deleted_by = user_id`
- 查詢時預設過濾 `is_deleted = 0`
- 外鍵約束不會因為軟刪除而觸發 CASCADE，關聯資料保留

---

## 非功能性需求

### 資料一致性
- 所有跨模組操作必須保證資料一致性
- 使用資料庫事務確保原子性操作
- 關鍵計算（如薪資、成本分攤）必須可追溯和可驗證

### 性能要求
- 複雜查詢（如報表計算）應使用快取機制
- 大量資料操作（如任務自動生成）應使用批次處理
- 異步操作（如快取清除、薪資重算）不應阻塞主流程

### 可追溯性
- 所有狀態變更應記錄歷史（如 TaskStatusUpdates, ReceiptEditHistory）
- 所有計算結果應可追溯來源資料
- 所有刪除操作應記錄刪除人和刪除時間

### 可測試性
- 所有模組應可獨立測試
- 測試資料應可隔離和清理
- 關鍵業務邏輯應有單元測試覆蓋

---

## 黃金數據命名規範 (Golden Data Naming Convention)

為確保所有測試 Spec 之間可以共享資料並正確串接，本節定義所有測試中必須使用的固定 ID 或前綴。所有測試 Spec 必須嚴格遵循此規範，不得自行定義測試資料 ID。

### 用戶/員工 (Users)

| ID/Username | 名稱 | 角色 | 用途 | 備註 |
|------------|------|------|------|------|
| `TEST_ADMIN_01` | 測試管理員01 | 管理員 | 所有需要管理員權限的測試 | 預設密碼：`111111` |
| `TEST_USER_STD` | 測試員工（標準） | 一般員工 | 標準功能測試，所有新欄位都有值 | 用於測試完整資料流程 |
| `TEST_USER_LEGACY` | 測試員工（舊資料） | 一般員工 | 向後兼容測試，部分欄位為 NULL | 用於測試 NULL 欄位處理 |
| `TEST_USER_ASSIGNEE` | 測試負責人 | 一般員工 | 作為客戶/任務負責人的測試 | 用於測試分配邏輯 |

**資料規範**：
- `TEST_USER_STD`：所有欄位完整（phone, email, address, emergency_contact 等）
- `TEST_USER_LEGACY`：僅基本欄位（username, name, password, email），其他欄位為 NULL
- 所有測試用戶的預設密碼：`111111`
- 所有測試用戶的 `is_deleted = 0`

### 客戶 (Clients)

| ID (client_id) | 公司名稱 | 統一編號 | 類型 | 用途 |
|---------------|----------|----------|------|------|
| `TEST_CLIENT_INC` | 測試企業客戶有限公司 | `0012345678` | 企業（8碼+00前綴） | 標準企業客戶測試 |
| `TEST_CLIENT_IND` | 測試個人客戶 | `A123456789` | 個人（10碼身分證） | 個人客戶測試 |
| `TEST_CLIENT_REC` | 測試定期服務客戶 | `0022222222` | 企業 | 定期服務測試 |
| `TEST_CLIENT_ONETIME` | 測試一次性服務客戶 | `0033333333` | 企業 | 一次性服務測試 |
| `TEST_CLIENT_LEGACY` | 測試舊資料客戶 | `0044444444` | 企業 | 向後兼容測試（部分欄位 NULL） |

**資料規範**：
- 企業客戶統一編號：輸入 8 碼數字，系統自動加前綴 `00` 變成 10 碼
- 個人客戶統一編號：直接使用 10 碼身分證格式
- `TEST_CLIENT_LEGACY`：僅基本欄位（company_name, tax_registration_number），新欄位（contact_person_1, primary_contact_method, line_id 等）為 NULL
- 所有測試客戶的 `is_deleted = 0`

### 服務 (Services)

| ID | 服務名稱 | 服務代碼 | 用途 |
|----|----------|----------|------|
| `TEST_SERVICE_MONTHLY` | 測試月費服務 | `TEST_MONTHLY` | 定期服務測試 |
| `TEST_SERVICE_ONETIME` | 測試一次性服務 | `TEST_ONETIME` | 一次性服務測試 |

**資料規範**：
- 服務必須在系統設定中預先建立
- 服務代碼必須唯一

### 客戶服務 (ClientServices)

| ID | 客戶 ID | 服務 ID | 服務類型 | 用途 |
|----|---------|---------|----------|------|
| `TEST_CS_REC_MONTHLY` | `TEST_CLIENT_REC` | `TEST_SERVICE_MONTHLY` | `recurring` | 定期服務測試 |
| `TEST_CS_ONETIME` | `TEST_CLIENT_ONETIME` | `TEST_SERVICE_ONETIME` | `one-time` | 一次性服務測試 |

**資料規範**：
- 客戶服務的 `status = 'active'`
- 定期服務的 `auto_generate_tasks = 1`
- 所有測試客戶服務的 `is_deleted = 0`

### 任務 (ActiveTasks)

| ID 前綴 | 命名規則 | 用途 |
|---------|----------|------|
| `TEST_TASK_` | `TEST_TASK_{YYYYMM}_{序號}` | 標準任務測試 |
| `TEST_TASK_LEGACY_` | `TEST_TASK_LEGACY_{YYYYMM}_{序號}` | 舊資料任務測試（部分欄位 NULL） |

**資料規範**：
- 任務 ID 由系統自動生成（AUTOINCREMENT）
- 任務名稱使用前綴 + 年月 + 序號
- `TEST_TASK_LEGACY_*`：部分欄位（task_config_id, related_sop_id 等）為 NULL

### 工時 (Timesheets)

| ID 前綴 | 命名規則 | 用途 |
|---------|----------|------|
| `TEST_TS_` | 系統自動生成 | 標準工時測試 |

**資料規範**：
- 工時 ID 由系統自動生成
- 必須關聯 `TEST_USER_STD` 或 `TEST_USER_LEGACY`
- 必須關聯 `TEST_CLIENT_*` 或為 NULL（非客戶工時）

### 收據 (Receipts)

| ID 前綴 | 命名規則 | 用途 |
|---------|----------|------|
| `TEST_RCP_` | `TEST_RCP_{YYYYMMDD}_{序號}` | 標準收據測試 |

**資料規範**：
- 收據 ID 使用前綴 + 日期 + 序號
- 必須關聯 `TEST_CLIENT_*`
- 收據狀態：`unpaid`（初始）、`paid`（付款後）、`cancelled`（取消）

### 薪資 (Payroll)

| 月份格式 | 命名規則 | 用途 |
|---------|----------|------|
| `TEST_PAYROLL_` | `TEST_PAYROLL_{YYYY-MM}` | 薪資測試月份 |

**資料規範**：
- 薪資月份使用 `YYYY-MM` 格式（如 `2025-01`）
- 必須關聯 `TEST_USER_STD` 或 `TEST_USER_LEGACY`
- 用於測試薪資計算邏輯

### 標籤 (Tags)

| ID | 標籤名稱 | 用途 |
|----|----------|------|
| `TEST_TAG_01` | 測試標籤01 | 客戶標籤測試 |
| `TEST_TAG_02` | 測試標籤02 | 客戶標籤測試 |

**資料規範**：
- 標籤 ID 由系統自動生成
- 標籤名稱必須唯一

### 通用規範

1. **ID 格式**：
   - 用戶：使用 `username` 作為識別（如 `TEST_ADMIN_01`）
   - 客戶：使用 `client_id`（統一編號）作為識別（如 `TEST_CLIENT_INC`）
   - 其他實體：使用系統自動生成的 ID，但名稱/標題使用前綴

2. **資料隔離**：
   - 所有測試資料使用 `TEST_` 前綴，便於識別和清理
   - 測試結束後應清理測試資料（可選，視測試策略而定）

3. **資料完整性**：
   - `TEST_USER_STD` 和 `TEST_CLIENT_INC` 等標準資料必須包含所有必要欄位
   - `TEST_USER_LEGACY` 和 `TEST_CLIENT_LEGACY` 等舊資料僅包含基本欄位，用於測試向後兼容性

4. **跨 Spec 共享**：
   - 基礎資料（用戶、客戶、服務）應在 `QA-01` 或 `QA-02` 中建立
   - 後續 Spec 應重用這些基礎資料，而非重新建立

---

## 向後兼容性雷區 (Compatibility Hotspots)

根據代碼庫分析，以下資料表與欄位存在向後兼容性風險，需要特別進行防禦性測試。

### 1. Users 表

**風險欄位**：
- `phone`：可能為 NULL（舊資料）
- `address`：可能為 NULL（舊資料）
- `emergency_contact_name`：可能為 NULL（舊資料）
- `emergency_contact_phone`：可能為 NULL（舊資料）
- `plain_password`：可能為 NULL（僅在創建或重置密碼後才有值）

**測試重點**：
- 驗證所有讀取 `phone` 的地方都有 NULL 檢查或預設值
- 驗證 `plain_password` 為 NULL 時的處理邏輯（管理員查看密碼功能）
- 驗證緊急聯絡人欄位為 NULL 時的顯示邏輯

**相關代碼位置**：
- `backend/src/handlers/settings/user-management.js`：用戶管理 Handler
- `src/components/profile/ProfileInfo.vue`：個人資料顯示組件

### 2. Clients 表

**風險欄位**：
- `phone`：可能為 NULL（舊資料）
- `email`：可能為 NULL（舊資料）
- `contact_person_1`：可能為 NULL（舊資料，新增欄位）
- `contact_person_2`：可能為 NULL（新增欄位）
- `primary_contact_method`：可能為 NULL（新增欄位，選項：'line'、'phone'、'email'、'other'）
- `line_id`：可能為 NULL（新增欄位）
- `company_owner`：可能為 NULL（新增欄位）
- `company_address`：可能為 NULL（新增欄位）
- `capital_amount`：可能為 NULL（新增欄位）
- `shareholders`：可能為 NULL（新增欄位，JSON 格式）
- `directors_supervisors`：可能為 NULL（新增欄位，JSON 格式）

**測試重點**：
- 驗證客戶列表顯示時，NULL 欄位的處理（顯示「-」或空字串）
- 驗證客戶詳情頁面時，NULL 欄位的顯示邏輯
- 驗證 `primary_contact_method` 為 NULL 時的聯絡方式顯示邏輯
- 驗證 JSON 欄位（shareholders, directors_supervisors）為 NULL 時的解析邏輯

**相關代碼位置**：
- `backend/src/handlers/clients/client-crud.js`：客戶 CRUD Handler
- `src/components/clients/ClientListTable.vue`：客戶列表組件
- `src/views/clients/ClientDetail.vue`：客戶詳情頁面

### 3. ClientServices 表

**風險欄位**：
- `task_template_id`：可能為 NULL（舊資料，已改為使用 ClientServiceTaskConfigs）
- `auto_generate_tasks`：預設值為 1，但舊資料可能為 NULL

**測試重點**：
- 驗證 `task_template_id` 為 NULL 時的任務生成邏輯（應使用 ClientServiceTaskConfigs）
- 驗證 `auto_generate_tasks` 為 NULL 時的處理（應視為 1）

**相關代碼位置**：
- `backend/src/handlers/task-generator/generator-new.js`：任務自動生成邏輯
- `backend/src/handlers/clients/client-services.js`：客戶服務管理

### 4. ActiveTasks 表

**風險欄位**：
- `task_config_id`：可能為 NULL（手動建立的任務可能沒有配置）
- `template_id`：可能為 NULL（舊資料）
- `related_sop_id`：可能為 NULL（舊資料）
- `client_specific_sop_id`：可能為 NULL（舊資料）
- `prerequisite_task_id`：可能為 NULL（無前置任務）
- `original_due_date`：可能為 NULL（未調整過到期日）
- `can_start_date`：可能為 NULL（無前置任務）

**測試重點**：
- 驗證 `task_config_id` 為 NULL 時的任務詳情顯示（手動建立的任務）
- 驗證 `prerequisite_task_id` 為 NULL 時的任務狀態計算（可開始狀態）
- 驗證 `original_due_date` 為 NULL 時的到期日調整歷史顯示

**相關代碼位置**：
- `backend/src/handlers/tasks/task-crud.js`：任務 CRUD Handler
- `backend/src/handlers/tasks/task-stats.js`：任務統計邏輯（可開始狀態計算）

### 5. Timesheets 表

**風險欄位**：
- `client_id`：可能為 NULL（非客戶工時）
- `service_name`：可能為 NULL（舊資料，已改為使用 service_id）
- `service_id`：可能為 NULL（舊資料）

**測試重點**：
- 驗證 `client_id` 為 NULL 時的工時顯示（非客戶工時）
- 驗證 `service_id` 為 NULL 時的工時統計邏輯（應使用 service_name 作為後備）
- 驗證工時報表計算時，NULL 值的處理邏輯

**相關代碼位置**：
- `backend/src/handlers/timesheets/timesheet-crud.js`：工時 CRUD Handler
- `backend/src/handlers/reports/monthly-employee-performance.js`：員工績效報表（使用工時資料）

### 6. Receipts 表

**風險欄位**：
- `related_task_id`：可能為 NULL（預收款、訂金等沒有關聯任務）
- `client_service_id`：可能為 NULL（手動建立的收據可能沒有關聯服務）
- `billing_month`：可能為 NULL（非月費收據）
- `service_month`：可能為 NULL（舊資料）
- `service_start_month`：可能為 NULL（舊資料）
- `service_end_month`：可能為 NULL（舊資料）

**測試重點**：
- 驗證 `related_task_id` 為 NULL 時的收據詳情顯示（預收款、訂金）
- 驗證 `billing_month` 為 NULL 時的收據列表篩選邏輯
- 驗證 `service_month` 為 NULL 時的服務期間顯示邏輯

**相關代碼位置**：
- `backend/src/handlers/receipts/receipt-crud.js`：收據 CRUD Handler
- `backend/src/handlers/receipts/receipt-utils.js`：收據工具函數

### 7. Payroll 相關表

**風險欄位**：
- `EmployeeSalaryItems.expiry_date`：可能為 NULL（永久有效）
- `EmployeeSalaryItems.recurring_months`：可能為 NULL（每月發放）
- `YearEndBonus.payment_month`：可能為 NULL（未設定發放月份）

**測試重點**：
- 驗證 `expiry_date` 為 NULL 時的薪資項目有效性判斷（應視為永久有效）
- 驗證 `recurring_months` 為 NULL 時的發放邏輯（應視為每月發放）
- 驗證 `payment_month` 為 NULL 時的年終獎金顯示邏輯

**相關代碼位置**：
- `backend/src/utils/payroll-calculator.js`：薪資計算邏輯
- `backend/src/utils/payroll-helpers.js`：薪資輔助函數

### 8. API 向後兼容

**風險 API**：
- `/api/v2/billing/service/:serviceId`（舊 API，已標記為 `@deprecated`）
- `/api/v2/client-services/:clientServiceId/components`（兼容 API，映射新結構到舊格式）

**測試重點**：
- 驗證舊 API 仍能正常運作（向後兼容）
- 驗證兼容 API 的資料映射正確性（ServiceComponents → ClientServiceTaskConfigs）
- 驗證新舊 API 返回的資料格式一致性

**相關代碼位置**：
- `src/api/billing.js`：舊 API 標記為 `@deprecated`
- `backend/src/handlers/client-services/components.js`：兼容 API Handler

### 9. 任務配置向後兼容

**風險邏輯**：
- `days_due` vs `due_rule/due_value`：新舊兩種到期日計算方式並存
- 任務生成時，若 `days_due` 為空，回退使用 `due_rule/due_value`

**測試重點**：
- 驗證 `days_due` 為 NULL 時，系統正確使用 `due_rule/due_value` 計算到期日
- 驗證兩種計算方式產生的到期日一致性
- 驗證任務配置編輯時，兩種欄位的同步邏輯

**相關代碼位置**：
- `backend/src/handlers/task-generator/generator-one-time.js`：一次性任務生成（包含回退邏輯）
- `backend/src/handlers/task-configs/task-config-crud.js`：任務配置 CRUD

### 10. 資料庫遷移兼容性

**已移除的表**（需確認無殘留引用）：
- `ServiceComponents`（已移除，改用 `ClientServiceTaskConfigs`）
- `ServiceComponentTasks`（已移除）
- `ServiceComponentSOPs`（已移除）

**測試重點**：
- 驗證所有代碼中無殘留對已移除表的引用
- 驗證兼容 API 正確映射新舊結構
- 驗證資料遷移腳本的正確性

**相關代碼位置**：
- `backend/migrations/0013_remove_service_components.sql`：移除服務組件的遷移

### 防禦性測試策略

1. **NULL 值測試**：
   - 所有可能為 NULL 的欄位都應測試 NULL 情況
   - 驗證系統在遇到 NULL 時不會崩潰，而是使用預設值或顯示適當訊息

2. **舊資料兼容測試**：
   - 使用 `TEST_USER_LEGACY` 和 `TEST_CLIENT_LEGACY` 等舊資料進行測試
   - 驗證系統能正確處理缺少新欄位的舊資料

3. **API 兼容測試**：
   - 驗證標記為 `@deprecated` 的 API 仍能正常運作
   - 驗證兼容 API 的資料映射正確性

4. **資料遷移測試**：
   - 驗證資料遷移腳本不會破壞現有資料
   - 驗證遷移後的資料能正常使用新邏輯

---

## 測試 Spec 執行序列表 (Execution Roadmap)

根據系統依賴關係，以下列出所有測試 Spec 的建議執行順序。每個 Spec 必須在前置 Spec 完成後才能執行，確保測試資料的正確串接。

### Phase 1: 基礎設施建立（無依賴）

#### QA-01: 認證與用戶基礎 (Auth Foundation)
**依賴**：無  
**目標**：建立測試用管理員和基礎 Token  
**建立資料**：
- `TEST_ADMIN_01`（管理員帳號）
- `TEST_USER_STD`（標準員工）
- `TEST_USER_LEGACY`（舊資料員工，部分欄位 NULL）
- `TEST_USER_ASSIGNEE`（負責人員工）

**驗證重點**：
- 登入/登出功能
- Session 管理
- 權限控制（管理員 vs 一般員工）
- 用戶基本資訊 CRUD

---

#### QA-02: 組織結構建立 (Organization Structure)
**依賴**：QA-01  
**目標**：建立測試用客戶、服務、標籤等基礎資料  
**建立資料**：
- `TEST_CLIENT_INC`（企業客戶）
- `TEST_CLIENT_IND`（個人客戶）
- `TEST_CLIENT_REC`（定期服務客戶）
- `TEST_CLIENT_ONETIME`（一次性服務客戶）
- `TEST_CLIENT_LEGACY`（舊資料客戶）
- `TEST_SERVICE_MONTHLY`（月費服務）
- `TEST_SERVICE_ONETIME`（一次性服務）
- `TEST_TAG_01`、`TEST_TAG_02`（標籤）

**驗證重點**：
- 客戶 CRUD（企業/個人）
- 服務設定
- 客戶標籤管理
- 向後兼容性（舊資料客戶的 NULL 欄位處理）

---

### Phase 2: 核心業務流程（依賴 Phase 1）

#### QA-03: 客戶服務配置 (Client Service Configuration)
**依賴**：QA-02  
**目標**：建立客戶服務和任務配置  
**建立資料**：
- `TEST_CS_REC_MONTHLY`（定期客戶服務）
- `TEST_CS_ONETIME`（一次性客戶服務）
- 任務配置（ClientServiceTaskConfigs）
- 計費計劃（ServiceBillingSchedule）

**驗證重點**：
- 客戶服務 CRUD
- 任務配置管理
- 計費計劃設定
- 服務生命週期（啟用/暫停/取消）

---

#### QA-04: 任務管理流程 (Task Management Flow)
**依賴**：QA-03  
**目標**：測試任務建立、執行、完成流程  
**建立資料**：
- `TEST_TASK_*`（自動生成和手動建立的任務）
- 任務階段（ActiveTaskStages）
- 任務狀態更新記錄（TaskStatusUpdates）

**驗證重點**：
- 任務自動生成（定時任務觸發）
- 任務手動建立
- 任務階段管理
- 任務狀態流轉（in_progress → completed）
- 任務依賴關係（前置任務）
- 任務到期日調整
- 任務完成後觸發開票提醒

---

#### QA-05: 工時記錄流程 (Timesheet Entry Flow)
**依賴**：QA-04  
**目標**：測試工時填報和驗證  
**建立資料**：
- `TEST_TS_*`（工時記錄）
- 關聯 `TEST_USER_STD` 和 `TEST_TASK_*`

**驗證重點**：
- 工時填報（正常工時、加班）
- 工時驗證（客戶、服務、任務關聯）
- 工時統計（週統計、月統計）
- 非客戶工時（client_id 為 NULL）
- 工時快取機制

---

#### QA-06: 請假管理流程 (Leave Management Flow)
**依賴**：QA-01  
**目標**：測試請假申請和餘額管理  
**建立資料**：
- 請假記錄（Leaves）
- 請假餘額（LeaveBalances）
- 生活事件（LifeEvents）

**驗證重點**：
- 請假申請
- 請假審核
- 請假餘額計算
- 補休 FIFO 管理
- 生活事件登記（結婚、生產等）

---

#### QA-07: 外出管理流程 (Trip Management Flow)
**依賴**：QA-01  
**目標**：測試外出記錄和交通補貼計算  
**建立資料**：
- 外出記錄（BusinessTrips）
- 關聯 `TEST_USER_STD`

**驗證重點**：
- 外出記錄 CRUD
- 交通補貼計算（按公里數）
- 外出記錄統計

---

### Phase 3: 財務流程（依賴 Phase 2）

#### QA-08: 收據管理流程 (Receipt Management Flow)
**依賴**：QA-04（任務完成觸發開票提醒）  
**目標**：測試收據建立、付款、對帳流程  
**建立資料**：
- `TEST_RCP_*`（收據）
- 收據項目（ReceiptItems）
- 付款記錄（Payments）
- 開票提醒（BillingReminders）

**驗證重點**：
- 收據建立（從開票提醒或手動建立）
- 收據項目管理
- 付款記錄
- 收據狀態流轉（unpaid → paid）
- 收據對帳
- 收據取消
- 預收款/訂金（related_task_id 為 NULL）

---

#### QA-09: 薪資計算流程 (Payroll Calculation Flow)
**依賴**：QA-05（工時）、QA-06（請假）、QA-07（外出）  
**目標**：測試完整薪資計算邏輯  
**建立資料**：
- `TEST_PAYROLL_2025-01`（測試月份）
- 薪資項目（EmployeeSalaryItems）
- 績效獎金（MonthlyBonusAdjustments）
- 年終獎金（YearEndBonus）

**驗證重點**：
- 底薪計算
- 加給計算（EmployeeSalaryItems）
- 加班費計算（基於工時）
- 誤餐費計算（平日加班超過 1.5 小時）
- 交通補貼計算（基於外出記錄）
- 全勤獎金計算（基於請假記錄）
- 請假扣款計算
- 績效獎金計算
- 年終獎金計算
- 薪資快取機制（PayrollCache）

---

#### QA-10: 成本管理流程 (Cost Management Flow)
**依賴**：QA-05（工時用於成本分攤）  
**目標**：測試成本記錄和分攤  
**建立資料**：
- 成本記錄（CostRecords）
- 成本類型（CostTypes）
- 管理費用（MonthlyOverheadCosts）

**驗證重點**：
- 成本記錄 CRUD
- 成本類型管理
- 管理費用記錄
- 成本分攤（基於工時）
- 員工成本分析
- 客戶成本分析

---

### Phase 4: 報表與分析（依賴 Phase 3）

#### QA-11: 月度報表流程 (Monthly Reports Flow)
**依賴**：QA-08（收據）、QA-09（薪資）、QA-10（成本）  
**目標**：測試月度報表計算和顯示  
**驗證重點**：
- 月度營收報表（基於收據）
- 月度薪資報表（基於薪資計算）
- 月度員工績效分析（基於工時和營收）
- 月度客戶毛利分析（基於收據和成本分攤）
- 報表快取機制

---

#### QA-12: 年度報表流程 (Annual Reports Flow)
**依賴**：QA-11（月度報表）  
**目標**：測試年度報表計算和顯示  
**驗證重點**：
- 年度營收報表（匯總月度資料）
- 年度薪資報表（匯總月度資料）
- 年度員工績效分析（匯總月度資料）
- 年度客戶毛利分析（匯總月度資料）
- 年度報表快取機制

---

### Phase 5: 知識庫與設定（獨立模組）

#### QA-13: 知識庫管理流程 (Knowledge Base Flow)
**依賴**：QA-01（用戶權限）  
**目標**：測試 SOP、FAQ、資源管理  
**驗證重點**：
- SOP 建立和編輯
- FAQ 管理
- 資源上傳和管理
- SOP 關聯（服務層級、任務層級）
- 附件管理

---

#### QA-14: 系統設定流程 (System Settings Flow)
**依賴**：QA-01（管理員權限）  
**目標**：測試系統設定管理  
**驗證重點**：
- 服務設定
- 任務模板管理
- 用戶管理
- 公司設定
- 自動化規則管理
- 假期設定

---

### Phase 6: 儀表板與整合（依賴所有 Phase）

#### QA-15: 儀表板整合流程 (Dashboard Integration Flow)
**依賴**：QA-04（任務）、QA-05（工時）、QA-08（收據）、QA-09（薪資）  
**目標**：測試儀表板數據整合和顯示  
**驗證重點**：
- 管理員儀表板（全公司統計）
- 員工儀表板（個人統計）
- 即時提醒（DashboardAlerts）
- 每日摘要（DashboardDailySummary）
- 儀表板數據預先計算

---

### 執行順序總結

```
Phase 1: 基礎設施
  QA-01 (Auth) → QA-02 (Org Structure)

Phase 2: 核心業務
  QA-03 (Client Service) → QA-04 (Tasks) → QA-05 (Timesheets)
  QA-06 (Leaves) [並行]
  QA-07 (Trips) [並行]

Phase 3: 財務流程
  QA-08 (Receipts) [依賴 QA-04]
  QA-09 (Payroll) [依賴 QA-05, QA-06, QA-07]
  QA-10 (Costs) [依賴 QA-05]

Phase 4: 報表分析
  QA-11 (Monthly Reports) [依賴 QA-08, QA-09, QA-10]
  QA-12 (Annual Reports) [依賴 QA-11]

Phase 5: 知識庫與設定
  QA-13 (Knowledge Base) [獨立]
  QA-14 (System Settings) [獨立]

Phase 6: 整合測試
  QA-15 (Dashboard) [依賴所有 Phase]
```

### 測試資料清理策略

1. **階段性清理**：每個 Phase 完成後，可選擇清理該 Phase 建立的測試資料
2. **保留基礎資料**：QA-01 和 QA-02 建立的基礎資料應保留至所有測試完成
3. **清理順序**：按 Phase 順序反向清理（Phase 6 → Phase 1）
4. **資料隔離**：所有測試資料使用 `TEST_` 前綴，便於識別和清理


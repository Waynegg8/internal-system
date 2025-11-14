# 功能盤點清單

## 專案概述

**專案名稱**: horgoscpa-system (霍爾果斯會計師事務所內部管理系統)  
**版本**: v2.0.0  
**建立日期**: 2025-01-XX  
**專案類型**: 全端 Web 應用程式（Vue 3 前端 + Cloudflare Workers 後端）

---

## 核心功能模組

### 1. 認證與用戶管理 (Authentication & User Management)

#### 前端功能
- **登入系統** (`/login`)
  - 用戶名/密碼登入
  - Session 管理
  - 自動登入狀態恢復
  - 登入失敗次數限制

- **個人資料** (`/profile`)
  - 查看個人資訊
  - 修改個人資料

#### 後端功能
- **認證 API** (`/api/v2/auth/*`)
  - `POST /auth/login` - 用戶登入
  - `POST /auth/logout` - 用戶登出
  - `GET /auth/session` - 檢查 Session
  - `GET /auth/me` - 獲取當前用戶資訊

- **用戶管理 API** (`/api/v2/settings/users`)
  - 用戶 CRUD 操作
  - 管理員權限管理
  - 用戶狀態管理（啟用/停用/刪除）

#### 資料庫表
- `Users` - 用戶基本資訊
- `sessions` - Session 管理

---

### 2. 客戶管理 (Client Management)

#### 前端功能
- **客戶列表** (`/clients`)
  - 客戶列表展示
  - 搜尋與篩選
  - 客戶標籤管理

- **新增客戶** (`/clients/add`)
  - 基本資訊 (`/clients/add/basic`)
  - 服務設定 (`/clients/add/services`)
  - 帳務設定 (`/clients/add/billing`)

- **客戶詳情** (`/clients/:id`)
  - 基本資訊 (`/clients/:id`)
  - 服務管理 (`/clients/:id/services`)
  - 帳務資訊 (`/clients/:id/billing`)

- **服務配置** (`/clients/:clientId/services/:clientServiceId/config`)
  - 服務詳細配置
  - 服務組件管理

#### 後端功能
- **客戶 API** (`/api/v2/clients/*`)
  - `GET /clients` - 客戶列表
  - `GET /clients/:id` - 客戶詳情
  - `POST /clients` - 創建客戶
  - `PUT /clients/:id` - 更新客戶
  - `DELETE /clients/:id` - 刪除客戶
  - `PUT /clients/:id/tags` - 更新客戶標籤

- **客戶服務 API** (`/api/v2/clients/:id/services/*`)
  - `GET /clients/:id/services` - 服務列表
  - `POST /clients/:id/services` - 創建服務
  - `PUT /clients/:id/services/:serviceId` - 更新服務
  - `DELETE /clients/:id/services/:serviceId` - 刪除服務

- **客戶協作者 API** (`/api/v2/clients/:id/collaborators/*`)
  - 客戶協作者管理

#### 資料庫表
- `Clients` - 客戶基本資訊
- `ClientServices` - 客戶服務
- `ClientTagAssignments` - 客戶標籤關聯
- `CustomerTags` - 客戶標籤
- `ClientCollaborators` - 客戶協作者

---

### 3. 任務管理 (Task Management)

#### 前端功能
- **任務列表** (`/tasks`)
  - 任務列表展示
  - 任務篩選與搜尋
  - 任務狀態管理

- **新增任務** (`/tasks/new`)
  - 創建新任務
  - 任務基本資訊設定

- **任務詳情** (`/tasks/:id`)
  - 任務詳細資訊
  - 任務更新記錄
  - 任務文件管理
  - 任務 SOP 關聯

- **任務總覽** (`/tasks/overview`)
  - 任務統計與分析

#### 後端功能
- **任務 API** (`/api/v2/tasks/*`)
  - `GET /tasks` - 任務列表
  - `GET /tasks/:id` - 任務詳情
  - `POST /tasks` - 創建任務
  - `PUT /tasks/:id` - 更新任務
  - `PUT /tasks/:id/status` - 更新任務狀態
  - `PUT /tasks/:id/assignee` - 更新負責人
  - `PUT /tasks/:id/due-date` - 調整到期日
  - `GET /tasks/:id/history` - 任務歷史記錄
  - `GET /tasks/:id/documents` - 任務文件列表
  - `POST /tasks/:id/documents` - 上傳任務文件

- **任務模板 API** (`/api/v2/task-templates/*`)
  - 任務模板 CRUD 操作

- **任務配置 API** (`/api/v2/task-configs/*`)
  - 任務配置管理

- **任務生成器 API** (`/api/v2/task-generator/*`)
  - 自動生成任務
  - 批量任務生成

#### 資料庫表
- `Tasks` - 任務基本資訊
- `TaskTemplates` - 任務模板
- `TaskConfigs` - 任務配置
- `TaskUpdates` - 任務更新記錄
- `TaskDocuments` - 任務文件關聯
- `TaskSOPs` - 任務 SOP 關聯

---

### 4. 工時記錄 (Timesheets)

#### 前端功能
- **工時記錄** (`/timesheets`)
  - 工時記錄列表
  - 新增/編輯工時記錄
  - 工時統計

#### 後端功能
- **工時 API** (`/api/v2/timesheets/*`)
  - `GET /timesheets` - 工時記錄列表
  - `POST /timesheets` - 創建工時記錄
  - `PUT /timesheets/:id` - 更新工時記錄
  - `DELETE /timesheets/:id` - 刪除工時記錄
  - `GET /timesheets/stats` - 工時統計

#### 資料庫表
- `Timesheets` - 工時記錄
- `TimesheetViolations` - 工時違規記錄

---

### 5. 收據管理 (Receipts)

#### 前端功能
- **收據列表** (`/receipts`)
  - 收據列表展示
  - 收據搜尋與篩選

- **收據詳情** (`/receipts/:id`)
  - 收據詳細資訊
  - 收據付款記錄
  - 收據取消

#### 後端功能
- **收據 API** (`/api/v2/receipts/*`)
  - `GET /receipts` - 收據列表
  - `GET /receipts/:id` - 收據詳情
  - `POST /receipts` - 創建收據
  - `PUT /receipts/:id` - 更新收據
  - `DELETE /receipts/:id` - 刪除收據
  - `POST /receipts/:id/cancel` - 取消收據
  - `GET /receipts/:id/payments` - 付款記錄
  - `POST /receipts/:id/payments` - 新增付款記錄

#### 資料庫表
- `Receipts` - 收據基本資訊
- `ReceiptPayments` - 收據付款記錄

---

### 6. 薪資管理 (Payroll)

#### 前端功能
- **薪資計算** (`/payroll/calc`)
  - 薪資預覽
  - 薪資計算
  - 薪資項目管理

- **薪資項目** (`/payroll/items`)
  - 薪資項目列表
  - 薪資項目設定

- **員工薪資** (`/payroll/emp`)
  - 員工薪資設定
  - 基本薪資管理

- **獎金管理** (`/payroll/bonus`)
  - 獎金發放記錄
  - 獎金計算

- **年終獎金** (`/payroll/yearend`)
  - 年終獎金計算
  - 年終獎金發放

- **薪資設定** (`/payroll/settings`)
  - 薪資計算規則設定
  - 薪資項目類型設定

- **打卡記錄** (`/payroll/punch`)
  - 打卡記錄管理

#### 後端功能
- **薪資 API** (`/api/v2/payroll/*`)
  - `GET /payroll/preview/:month` - 薪資預覽
  - `POST /payroll/calculate` - 計算薪資
  - `GET /payroll/items` - 薪資項目列表
  - `POST /payroll/items` - 創建薪資項目
  - `PUT /payroll/items/:id` - 更新薪資項目
  - `GET /payroll/salary-item-types` - 薪資項目類型
  - `GET /payroll/bonuses` - 獎金列表
  - `POST /payroll/bonuses` - 創建獎金
  - `GET /payroll/settings` - 薪資設定
  - `PUT /payroll/settings` - 更新薪資設定

- **打卡記錄 API** (`/api/v2/punch-records/*`)
  - 打卡記錄 CRUD 操作

#### 資料庫表
- `PayrollCalculations` - 薪資計算記錄
- `PayrollItems` - 薪資項目
- `SalaryItemTypes` - 薪資項目類型
- `UserSalaries` - 員工薪資設定
- `Bonuses` - 獎金記錄
- `CompensatoryLeaveGrants` - 補休授予記錄
- `CompensatoryOvertimePay` - 補休轉加班費
- `PunchRecords` - 打卡記錄
- `PayrollCache` - 薪資快取
- `PayrollRecalcQueue` - 薪資重算佇列

---

### 7. 假期管理 (Leaves)

#### 前端功能
- **假期管理** (`/leaves`)
  - 假期申請
  - 假期列表
  - 假期餘額查詢

#### 後端功能
- **假期 API** (`/api/v2/leaves/*`)
  - `GET /leaves` - 假期列表
  - `POST /leaves` - 申請假期
  - `PUT /leaves/:id` - 更新假期
  - `DELETE /leaves/:id` - 刪除假期
  - `GET /leaves/balances` - 假期餘額
  - `POST /leaves/recalculate` - 重新計算假期餘額
  - `GET /leaves/life-events` - 人生大事假期

#### 資料庫表
- `Leaves` - 假期記錄
- `LeaveBalances` - 假期餘額
- `LeaveLifeEvents` - 人生大事假期

---

### 8. 外出記錄 (Trips)

#### 前端功能
- **外出記錄** (`/trips`)
  - 外出記錄列表
  - 新增/編輯外出記錄

#### 後端功能
- **外出 API** (`/api/v2/trips/*`)
  - `GET /trips` - 外出記錄列表
  - `POST /trips` - 創建外出記錄
  - `PUT /trips/:id` - 更新外出記錄
  - `DELETE /trips/:id` - 刪除外出記錄
  - `GET /trips/stats` - 外出統計

#### 資料庫表
- `Trips` - 外出記錄

---

### 9. 成本管理 (Costs)

#### 前端功能
- **成本項目** (`/costs/items`)
  - 成本項目列表
  - 成本項目管理

- **客戶成本** (`/costs/client`)
  - 客戶成本分配
  - 成本分析

#### 後端功能
- **成本 API** (`/api/v2/costs/*`)
  - `GET /costs/items` - 成本項目列表
  - `POST /costs/items` - 創建成本項目
  - `PUT /costs/items/:id` - 更新成本項目
  - `DELETE /costs/items/:id` - 刪除成本項目
  - `GET /costs/allocation` - 成本分配
  - `GET /costs/analysis` - 成本分析
  - `GET /costs/task-costs` - 任務成本
  - `GET /costs/types` - 成本類型

#### 資料庫表
- `Costs` - 成本記錄
- `CostTypes` - 成本類型
- `OverheadTemplates` - 間接成本模板

---

### 10. 知識庫 (Knowledge Base)

#### 前端功能
- **SOP 管理** (`/knowledge/sop`)
  - SOP 列表
  - 新增/編輯 SOP (`/knowledge/sop/new`, `/knowledge/sop/:id/edit`)

- **FAQ 管理** (`/knowledge/faq`)
  - FAQ 列表
  - 新增/編輯 FAQ (`/knowledge/faq/new`, `/knowledge/faq/:id/edit`)

- **資源管理** (`/knowledge/resources`)
  - 資源列表
  - 新增/編輯資源 (`/knowledge/resources/new`, `/knowledge/resources/:id/edit`)

- **附件管理** (`/knowledge/attachments`)
  - 附件列表
  - 上傳附件 (`/knowledge/attachments/new`)

#### 後端功能
- **知識庫 API** (`/api/v2/knowledge/*`)
  - `GET /knowledge/sops` - SOP 列表
  - `POST /knowledge/sops` - 創建 SOP
  - `PUT /knowledge/sops/:id` - 更新 SOP
  - `DELETE /knowledge/sops/:id` - 刪除 SOP
  - `GET /knowledge/faqs` - FAQ 列表
  - `POST /knowledge/faqs` - 創建 FAQ
  - `PUT /knowledge/faqs/:id` - 更新 FAQ
  - `DELETE /knowledge/faqs/:id` - 刪除 FAQ
  - `GET /knowledge/resources` - 資源列表
  - `POST /knowledge/resources` - 創建資源
  - `PUT /knowledge/resources/:id` - 更新資源
  - `DELETE /knowledge/resources/:id` - 刪除資源
  - `GET /knowledge/attachments` - 附件列表
  - `POST /knowledge/attachments` - 上傳附件
  - `DELETE /knowledge/attachments/:id` - 刪除附件

#### 資料庫表
- `SOPs` - SOP 文件
- `FAQs` - FAQ 文件
- `KnowledgeResources` - 知識資源
- `KnowledgeAttachments` - 知識附件
- `InternalDocuments` - 內部文件

---

### 11. 報表系統 (Reports)

#### 前端功能
- **月報表** (`/reports/monthly`)
  - 月營收報表
  - 月薪資報表
  - 月客戶獲利分析
  - 月員工績效報表

- **年報表** (`/reports/annual`)
  - 年營收報表
  - 年薪資報表
  - 年客戶獲利分析
  - 年員工績效報表

#### 後端功能
- **報表 API** (`/api/v2/reports/*`)
  - `GET /reports/monthly/revenue` - 月營收報表
  - `GET /reports/monthly/payroll` - 月薪資報表
  - `GET /reports/monthly/client-profitability` - 月客戶獲利分析
  - `GET /reports/monthly/employee-performance` - 月員工績效報表
  - `GET /reports/annual/revenue` - 年營收報表
  - `GET /reports/annual/payroll` - 年薪資報表
  - `GET /reports/annual/client-profitability` - 年客戶獲利分析
  - `GET /reports/annual/employee-performance` - 年員工績效報表
  - `GET /reports/work-types` - 工作類型報表
  - `POST /reports/precompute` - 預先計算報表快取

#### 資料庫表
- `ReportCache` - 報表快取
- `CacheData` - 快取數據

---

### 12. 儀表板 (Dashboard)

#### 前端功能
- **儀表板** (`/dashboard`)
  - 總覽統計
  - 待辦事項
  - 近期活動
  - 警告提醒

#### 後端功能
- **儀表板 API** (`/api/v2/dashboard/*`)
  - `GET /dashboard` - 儀表板數據（員工視角）
  - `GET /dashboard/admin` - 儀表板數據（管理員視角）
  - `GET /dashboard/alerts` - 警告列表
  - `GET /dashboard/daily-summary` - 每日摘要
  - `POST /dashboard/precompute` - 預先計算儀表板數據

#### 資料庫表
- `DashboardAlerts` - 儀表板警告
- `DashboardDailySummary` - 每日摘要

---

### 13. 系統設定 (Settings)

#### 前端功能
- **服務設定** (`/settings/services`)
  - 服務項目管理

- **模板設定** (`/settings/templates`)
  - 任務模板管理

- **用戶管理** (`/settings/users`)
  - 用戶管理（需管理員權限）

- **公司設定** (`/settings/company`)
  - 公司基本資訊設定

- **自動化設定** (`/settings/automation`)
  - 自動化規則設定

- **假日設定** (`/settings/holidays`)
  - 假日管理

#### 後端功能
- **設定 API** (`/api/v2/settings/*`)
  - `GET /settings/services` - 服務列表
  - `POST /settings/services` - 創建服務
  - `PUT /settings/services/:id` - 更新服務
  - `DELETE /settings/services/:id` - 刪除服務
  - `GET /settings/users` - 用戶列表
  - `POST /settings/users` - 創建用戶
  - `PUT /settings/users/:id` - 更新用戶
  - `DELETE /settings/users/:id` - 刪除用戶
  - `GET /settings/company` - 公司設定
  - `PUT /settings/company` - 更新公司設定
  - `GET /settings/automation` - 自動化規則列表
  - `POST /settings/automation` - 創建自動化規則
  - `PUT /settings/automation/:id` - 更新自動化規則
  - `DELETE /settings/automation/:id` - 刪除自動化規則

- **假日 API** (`/api/v2/holidays/*`)
  - 假日 CRUD 操作

#### 資料庫表
- `Services` - 服務項目
- `CompanySettings` - 公司設定
- `AutomationRules` - 自動化規則
- `Holidays` - 假日設定

---

### 14. 其他功能

#### 標籤管理
- **標籤 API** (`/api/v2/tags/*`)
  - 標籤 CRUD 操作

#### 帳務管理
- **帳務 API** (`/api/v2/billing/*`)
  - 帳務記錄管理

#### 附件管理
- **附件 API** (`/api/v2/attachments/*`)
  - 附件上傳與管理
  - 使用 R2 Storage 儲存

#### MCP 工具
- **MCP API** (`/api/v2/mcp/*`)
  - Cloudflare 管理工具
  - 部署管理
  - 資料庫管理
  - 日誌查詢

---

## 定時任務 (Cron Jobs)

### 每日 00:30 UTC
- **任務自動生成**: 自動生成當月任務

### 每日 18:00 UTC (台灣時間 02:00)
- **薪資計算**: 自動計算當月薪資
- **補休檢查**: 每月 1 日檢查補休到期並轉為加班費
- **年度薪資計算**: 重新計算年度薪資
- **報表快取預先計算**: 預先計算報表數據
- **儀表板每日摘要重建**: 重建每日摘要數據
- **儀表板數據預先計算**: 預先計算所有用戶的儀表板數據

---

## 資料庫結構

### 核心表
- `Users` - 用戶
- `sessions` - Session 管理
- `Clients` - 客戶
- `ClientServices` - 客戶服務

### 任務相關表
- `Tasks` - 任務
- `TaskTemplates` - 任務模板
- `TaskConfigs` - 任務配置
- `TaskUpdates` - 任務更新記錄
- `TaskDocuments` - 任務文件
- `TaskSOPs` - 任務 SOP 關聯

### 財務相關表
- `Receipts` - 收據
- `ReceiptPayments` - 收據付款
- `PayrollCalculations` - 薪資計算
- `PayrollItems` - 薪資項目
- `UserSalaries` - 員工薪資
- `Bonuses` - 獎金
- `Costs` - 成本

### 人力資源相關表
- `Timesheets` - 工時記錄
- `Leaves` - 假期
- `LeaveBalances` - 假期餘額
- `Trips` - 外出記錄
- `PunchRecords` - 打卡記錄

### 知識庫相關表
- `SOPs` - SOP
- `FAQs` - FAQ
- `KnowledgeResources` - 知識資源
- `KnowledgeAttachments` - 知識附件
- `InternalDocuments` - 內部文件

### 系統設定表
- `Services` - 服務項目
- `CompanySettings` - 公司設定
- `AutomationRules` - 自動化規則
- `Holidays` - 假日
- `CustomerTags` - 客戶標籤

### 快取與報表表
- `ReportCache` - 報表快取
- `CacheData` - 快取數據
- `PayrollCache` - 薪資快取
- `DashboardDailySummary` - 每日摘要
- `DashboardAlerts` - 儀表板警告
- `CronJobExecutions` - Cron 任務執行記錄

---

## 技術架構

### 前端
- **框架**: Vue 3
- **UI 庫**: Ant Design Vue 4.0
- **狀態管理**: Pinia
- **路由**: Vue Router 4
- **HTTP 客戶端**: Axios
- **日期處理**: Day.js
- **富文本編輯**: Quill
- **PDF 處理**: pdfjs-dist
- **OCR**: tesseract.js

### 後端
- **運行環境**: Cloudflare Workers
- **資料庫**: Cloudflare D1 (SQLite)
- **檔案儲存**: Cloudflare R2
- **快取**: Cloudflare KV
- **定時任務**: Cloudflare Cron Triggers

### 部署
- **前端**: Cloudflare Pages
- **後端**: Cloudflare Workers
- **域名**: v2.horgoscpa.com

---

## API 端點總覽

### 認證相關
- `/api/v2/auth/*`

### 客戶相關
- `/api/v2/clients/*`
- `/api/v2/clients/:id/services/*`
- `/api/v2/clients/:id/collaborators/*`

### 任務相關
- `/api/v2/tasks/*`
- `/api/v2/task-templates/*`
- `/api/v2/task-configs/*`
- `/api/v2/task-generator/*`

### 財務相關
- `/api/v2/receipts/*`
- `/api/v2/payroll/*`
- `/api/v2/costs/*`
- `/api/v2/billing/*`

### 人力資源相關
- `/api/v2/timesheets/*`
- `/api/v2/leaves/*`
- `/api/v2/trips/*`
- `/api/v2/punch-records/*`

### 知識庫相關
- `/api/v2/knowledge/*`

### 報表相關
- `/api/v2/reports/*`

### 儀表板相關
- `/api/v2/dashboard/*`

### 設定相關
- `/api/v2/settings/*`
- `/api/v2/holidays/*`
- `/api/v2/tags/*`
- `/api/v2/services/*`

### 其他
- `/api/v2/attachments/*`
- `/api/v2/mcp/*`
- `/api/v2/user-profile/*`

---

## 前端路由總覽

### 公開路由
- `/login` - 登入頁

### 需要認證的路由
- `/` - 根路徑（自動重定向）
- `/dashboard` - 儀表板
- `/clients/*` - 客戶管理
- `/tasks/*` - 任務管理
- `/timesheets` - 工時記錄
- `/receipts/*` - 收據管理
- `/payroll/*` - 薪資管理（需管理員）
- `/leaves` - 假期管理
- `/trips` - 外出記錄
- `/costs/*` - 成本管理（需管理員）
- `/knowledge/*` - 知識庫
- `/reports/*` - 報表（需管理員）
- `/settings/*` - 系統設定（需管理員）
- `/profile` - 個人資料

---

## 狀態管理 (Stores)

- `auth.js` - 認證狀態
- `clients.js` - 客戶狀態
- `clientAdd.js` - 新增客戶狀態
- `tasks.js` - 任務狀態
- `taskOverview.js` - 任務總覽狀態
- `timesheets.js` - 工時狀態
- `receipts.js` - 收據狀態
- `payroll.js` - 薪資狀態
- `leaves.js` - 假期狀態
- `trips.js` - 外出狀態
- `costs.js` - 成本狀態
- `knowledge.js` - 知識庫狀態
- `reports.js` - 報表狀態
- `settings.js` - 設定狀態
- `dashboard.js` - 儀表板狀態

---

## 總結

本系統是一個功能完整的會計師事務所內部管理系統，涵蓋：
- **14 個主要功能模組**
- **100+ API 端點**
- **50+ 資料庫表**
- **30+ 前端頁面**
- **15 個狀態管理 Store**
- **自動化定時任務**
- **完整的權限管理**

系統採用現代化的技術棧，前端使用 Vue 3 + Ant Design Vue，後端使用 Cloudflare Workers，資料庫使用 Cloudflare D1，並整合了 R2 儲存和 KV 快取，實現了高效能、可擴展的全端應用。



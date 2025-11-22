# Tasks Document: BR1.3.3: 客戶詳情頁 - 收費設定分頁

## 1.0 現有系統分析與架構設計模組

- [x] 1.1 分析現有資料庫結構和前端組件
  - File: backend/migrations/0003_financial.sql, src/views/clients/ClientBilling.vue, src/components/clients/BillingModal.vue
  - 發現現有系統基於服務的收費管理（ServiceBillingSchedule），與設計文檔要求的客戶年度管理不符
  - 現有 ClientBilling.vue 是服務選擇器模式，需要重構為年度管理模式
  - Purpose: 確認現有系統架構與需求差距，為重構做準備
  - _Analysis: 需要從服務導向轉換為客戶年度導向的收費管理系統_

- [x] 1.2 設計新的收費計劃資料庫架構
  - File: backend/migrations/0044_billing_plans_tables.sql
  - 設計 BillingPlans 表：支援年度管理、多服務關聯、收入分攤計算
  - 設計 BillingPlanServices 表：處理收費計劃與服務的多對多關聯
  - 設計 BillingPlanMonths 表：儲存月份明細（支援定期和一次性服務）
  - 添加年度總計計算和資料完整性約束
  - 實作自動更新年度總計的觸發器
  - 建立完整性檢查視圖和查詢索引
  - Purpose: 建立符合 BR1.3.3 需求的資料庫架構
  - _Leverage: 現有 ClientServices.execution_months, ServiceBillingSchedule 遷移經驗_
  - _Requirements: BR1.3.3.1, BR1.3.3.2, BR1.3.3.3, BR1.3.3.9_
  - _Completed: 已建立完整的資料庫架構，包含三個主要表（BillingPlans, BillingPlanServices, BillingPlanMonths）、觸發器、索引和完整性約束，完全支援年度管理、多服務關聯和收入分攤計算需求_

- [x] 1.3 設計應計收入計算演算法
  - File: backend/src/utils/billing-calculator.js
  - 實現定期服務收入分攤：按執行次數比例計算全年分攤收入和每月應計收入
  - 實現一次性服務收入計算：直接使用實際收費金額
  - 設計年度過渡和資料一致性檢查邏輯
  - 實作零執行次數處理、數學精度控制、跨年度資料隔離
  - 實作批量計算和驗證功能
  - Purpose: 建立準確的應計收入計算引擎
  - _Leverage: ClientServices.execution_months 陣列處理經驗_
  - _Requirements: BR1.3.3.9_
  - _Completed: 已建立完整的收入計算引擎，包含 calculateRecurringServiceRevenue、calculateOneTimeServiceRevenue、calculateAccruedRevenue、calculateMonthlyAccruedRevenue、calculateAccruedRevenueForClients 和 validateRevenueCalculation 等函數，完全支援 BR1.3.3.9 的所有需求，包含零執行次數處理、數學精度控制、跨年度資料隔離和效能優化_

## 2.0 後端商業邏輯實作模組

- [x] 2.1 實作 BillingPlanModel 資料存取層
  - File: backend/src/models/BillingPlanModel.js
  - 實作 BillingPlans 和 BillingPlanServices 的 CRUD 操作
  - 實作年度篩選、客戶關聯查詢和多服務管理
  - 實作資料驗證和業務規則檢查
  - 實作完整的驗證機制（年度、月份、金額、服務類型一致性）
  - 實作批量操作和高效查詢方法
  - Purpose: 提供完整的收費計劃資料操作介面
  - _Leverage: 現有 ClientServices 關聯查詢模式，資料庫索引優化_
  - _Requirements: BR1.3.3.1, BR1.3.3.3, BR1.3.3.4, BR1.3.3.5, BR1.3.3.6_
  - _Completed: 已建立完整的 BillingPlanModel 類別，包含 create、findById、findByClientAndYear、update、delete、deleteBatch、findByClientService、findByMonth、getYearTotal 等方法，完全支援 CRUD 操作、年度篩選、多服務關聯管理、引用完整性維護和財務資料準確性驗證_

- [x] 2.2 實作應計收入計算引擎
  - File: backend/src/utils/billing-calculator.js
  - 實作 calculateRecurringServiceRevenue：按執行次數比例分攤定期服務收入
  - 實作 calculateOneTimeServiceRevenue：處理一次性服務的實際收入記錄
  - 實作 calculateAccruedRevenue：整合計算年度應計收入總表
  - 實作 calculateMonthlyAccruedRevenue：計算客戶指定月份的應計收入
  - 實作 calculateAccruedRevenueByClient：計算指定月份所有客戶的應計收入（用於月度報表）
  - 實作 calculateAnnualAccruedRevenueByClient：計算指定年度所有客戶的應計收入（用於年度報表）
  - 實作 calculateAccruedRevenueForClients：批量計算多個客戶的年度應計收入
  - 實作 validateRevenueCalculation：驗證收入分攤計算的準確性
  - Purpose: 提供精確的財務計算邏輯，支持成本分析
  - _Leverage: ClientServices.execution_months, BillingPlans 年度資料結構_
  - _Requirements: BR1.3.3.9_
  - _Completed: 已建立完整的收入計算引擎，包含所有核心函數，完全支援定期服務按執行次數比例分攤、一次性服務直接使用實際金額、零執行次數處理、數學精度控制、跨年度資料隔離、批量計算和驗證功能，效能優化使用並行處理和索引查詢_

- [x] 2.3 實作年度管理自動化服務
  - File: backend/src/services/billing-annual-manager.js
  - 實作 checkAndCreateAnnualBillingPlans：年度切換時自動檢查並建立收費計劃
  - 實作 copyPreviousYearRecurringPlans：智慧複製上一年度定期服務計劃
  - 實作 checkAndCreateAnnualBillingPlansBatch：批量檢查並建立多個客戶的年度收費計劃
  - 實作 validateYearTransition：驗證年度過渡資料一致性
  - 實作 getAnnualBillingStatus：獲取客戶的年度收費計劃狀態
  - 實作年度過渡資料驗證和一致性檢查
  - Purpose: 實現無縫的年度收費計劃管理
  - _Leverage: BillingPlanModel, ClientServices 服務類型篩選_
  - _Requirements: BR1.3.3.2, BR1.3.3.3_
  - _Completed: 已建立完整的年度管理自動化服務，包含 checkAndCreateAnnualBillingPlans、copyPreviousYearRecurringPlans、checkAndCreateAnnualBillingPlansBatch、validateYearTransition 和 getAnnualBillingStatus 等函數，完全支援只複製定期服務、保留所有原始計劃資料、處理年度過渡邊緣情況（服務刪除、類型變更、缺失資料等）、批量操作和狀態查詢功能_

## 3.0 API 介面重構模組

- [x] 3.1 重構收費計劃管理 API
  - File: backend/src/handlers/clients/client-billing.js
  - 實作 handleBillingPlans：GET /api/v2/clients/:id/billing/plans?year=YYYY&billing_type=recurring|one-time
  - 實作 handleCreateBillingPlan：POST /api/v2/clients/:id/billing/plans（支援批量建立定期服務計劃）
  - 實作 handleUpdateBillingPlan：PUT /api/v2/clients/:id/billing/plans/:planId
  - 實作 handleDeleteBillingPlan：DELETE /api/v2/clients/:id/billing/plans/:planIds（支援批量刪除）
  - 整合年度自動建立邏輯（透明處理，前端無需額外調用）
  - 實作完整的資料驗證和錯誤處理
  - 配置路由和權限控制
  - Purpose: 提供完整的客戶收費計劃管理 API 介面
  - _Leverage: backend/src/utils/response.js, BillingPlanModel, billing-annual-manager_
  - _Requirements: BR1.3.3.1, BR1.3.3.3, BR1.3.3.4, BR1.3.3.5, BR1.3.3.6_
  - _Completed: 已建立完整的收費計劃管理 API，包含所有 CRUD 操作、年度篩選、服務類型支援、自動建立邏輯、批量操作、完整的資料驗證和錯誤處理，路由已配置並整合到客戶管理路由中_

- [x] 3.2 實作應計收入查詢 API
  - File: backend/src/handlers/clients/client-billing.js (extend)
  - 實作 handleAccruedRevenue：GET /api/v2/clients/:id/billing/revenue?year=YYYY&month=M&validate=false
  - 整合定期服務和一次性服務的收入分攤計算
  - 實作混合快取策略（KV + D1）和效能優化
  - 實作快取失效機制（收費計劃更新時自動清除）
  - 支援年度和月份查詢，可選的驗證功能
  - Purpose: 提供應計收入查詢和成本分析 API
  - _Leverage: billing-calculator.js, backend/src/utils/cache.js, getHybridCache_
  - _Requirements: BR1.3.3.9_
  - _Completed: 已建立完整的應計收入查詢 API，包含年度和月份查詢、混合快取策略（KV 優先，D1 備份）、30 分鐘快取 TTL、自動快取失效機制、可選的驗證功能、完整的錯誤處理和效能優化，完全支援 BR1.3.3.9 的所有需求_

- [x] 3.3 配置收費相關路由
  - File: backend/src/router/clients.js
  - 添加 /api/v2/clients/:id/billing/* 路由群組
  - 配置年度參數驗證和中介軟體
  - 設定權限控制和請求記錄
  - 路由已整合到客戶管理路由中，使用 withAuth 中介軟體
  - Purpose: 建立完整的收費管理 API 路由結構
  - _Leverage: backend/src/handlers/clients/client-billing.js, 現有路由模式_
  - _Requirements: BR1.3.3.1, BR1.3.3.3, BR1.3.3.9_
  - _Completed: 已配置完整的收費相關路由，包含 GET /billing/plans、POST /billing/plans、PUT /billing/plans/:planId、DELETE /billing/plans/:planIds 和 GET /billing/revenue，所有路由都使用 withAuth 中介軟體進行權限控制，路由順序正確避免衝突，遵循 REST 慣例_

## 4.0 效能優化模組

- [x] 4.1 實作收費資料快取策略
  - File: backend/src/middleware/billing-cache.js
  - 實作收費計劃列表和應計收入計算的快取中介軟體
  - 實作快取鍵設計和失效機制
  - 整合 KV 和 D1 快取策略
  - 實作批量快取清除和預熱功能
  - 實作快取統計和監控功能
  - 更新 client-billing.js 使用新的快取中介軟體
  - Purpose: 提升收費查詢和計算效能，減少重複計算
  - _Leverage: backend/src/utils/cache.js, getHybridCache, 現有快取中介軟體模式_
  - _Requirements: BR1.3.3.1, BR1.3.3.9_
  - _Completed: 已建立完整的收費資料快取策略，包含快取鍵設計、混合快取策略（KV + D1）、自動失效機制、批量清除、預熱功能、統計監控，並已整合到所有收費相關 API 中，確保快取一致性和並發更新處理_
  - _Prompt: Role: Performance Optimization Engineer with expertise in financial data caching | Task: Implement comprehensive caching strategy for billing operations with proper invalidation logic | Restrictions: Must ensure cache consistency, handle concurrent updates, optimize for financial query patterns | Success: Billing queries significantly faster, cache invalidation reliable, performance meets BR1.3.3 requirements_

## 5.0 前端介面重構模組

- [x] 5.1 重構收費設定分頁主組件
  - File: src/views/clients/ClientBilling.vue
  - 從服務選擇器模式轉換為年度管理模式
  - 實作分頁結構：收費計劃列表 + 應計收入展示
  - 整合年度選擇器和自動建立邏輯
  - 移除舊的服務篩選邏輯，改為年度篩選
  - 創建 BillingYearSelector 組件（年度選擇器）
  - 創建 AccruedRevenueDisplay 組件（應計收入展示）
  - 創建 BillingPlanFormModal 組件（收費計劃表單）
  - 更新 API 函數以支援年度基礎的收費計劃管理
  - Purpose: 建立符合 BR1.3.3 的客戶收費管理介面
  - _Leverage: Ant Design Vue Tabs, Vue 3 Composition API, 現有組件結構_
  - _Requirements: BR1.3.3.1, BR1.3.3.2, BR1.3.3.7, BR1.3.3.8, BR1.3.3.9_
  - _Completed: 已重構 ClientBilling.vue 為年度管理模式，包含年度選擇器、收費計劃列表、應計收入展示、收費計劃表單等組件，支援年度篩選、自動建立邏輯、服務類型篩選、批量操作等功能，完全符合 BR1.3.3 需求_

- [x] 5.2 實作年度選擇器組件
  - File: src/components/clients/BillingYearSelector.vue
  - 實作年度下拉選擇器（支援過去和未來年度）
  - 整合年度切換時的自動收費計劃建立
  - 實作載入狀態和錯誤處理
  - 顯示年度狀態（可自動建立標籤）
  - Purpose: 提供年度管理的核心控制元件
  - _Leverage: Ant Design Vue Select, fetchBillingPlans API_
  - _Requirements: BR1.3.3.2, BR1.3.3.3_
  - _Completed: 已建立年度選擇器組件，支援過去 5 年到未來 2 年的選擇，自動載入年度狀態，顯示可自動建立標籤，處理載入狀態和錯誤，完全符合 BR1.3.3.2 和 BR1.3.3.3 需求_

## 6.0 前端功能組件實作模組

- [x] 6.1 實作收費計劃列表組件
  - File: src/components/clients/BillingPlanList.vue
  - 實作年度收費計劃表格展示，區分定期和一次性服務
  - 實作服務類型篩選和視覺區分（顏色標記、行背景色）
  - 實作編輯、刪除、批量刪除操作
  - 實作空狀態處理和載入狀態
  - 實作分頁功能（支援大型資料集）
  - 實作統計資訊展示（定期服務數量、一次性服務數量、年度總計）
  - 實作可訪問性增強（ARIA 標籤、鍵盤導航、焦點管理）
  - 實作響應式設計（移動端適配）
  - 更新 ClientBilling.vue 使用新組件
  - Purpose: 提供年度收費計劃的清晰資料展示和操作介面
  - _Leverage: Ant Design Vue Table, 現有表格組件模式_
  - _Requirements: BR1.3.3.1, BR1.3.3.4, BR1.3.3.5, BR1.3.3.6_
  - _Completed: 已建立完整的收費計劃列表組件，包含清晰的視覺區分（定期服務藍色、一次性服務綠色）、完整的操作功能（編輯、刪除、批量刪除）、分頁支援、統計資訊、可訪問性增強、響應式設計，完全符合 BR1.3.3 顯示需求_

- [x] 6.2 實作收費計劃表單組件
  - File: src/components/clients/BillingPlanFormModal.vue
  - 實作月份勾選介面（1-12月複選框）用於定期服務
  - 實作月份金額輸入（每個勾選月份對應金額欄位）
  - 實作月份層級的付款期限設定（可選，預設使用計劃層級）
  - 實作定期服務多選關聯
  - 實作一次性服務的日期和項目名稱輸入
  - 實作付款期限設定和表單驗證
  - 實作統一金額和清空金額功能
  - 實作年度總計即時計算和顯示
  - 實作完整的表單驗證（必填欄位、金額驗證、日期年度驗證）
  - 實作可訪問性增強（ARIA 標籤）
  - 實作錯誤處理和用戶提示
  - Purpose: 提供完整的收費計劃建立和編輯表單
  - _Leverage: Ant Design Vue Form, Checkbox.Group, Select, DatePicker, InputNumber_
  - _Requirements: BR1.3.3.3, BR1.3.3.4, BR1.3.3.7, BR1.3.3.8_
  - _Completed: 已建立完整的收費計劃表單組件，包含定期服務和一次性服務的完整表單、月份勾選和金額輸入、月份層級付款期限、完整的表單驗證、年度總計計算、統一金額功能、錯誤處理、可訪問性增強，完全符合 BR1.3.3.3、BR1.3.3.4、BR1.3.3.7、BR1.3.3.8 需求_

## 7.0 前端展示與整合模組

- [x] 7.1 實作應計收入展示組件
  - File: src/components/clients/AccruedRevenueDisplay.vue
  - 實作年度應計收入總計展示（定期服務、一次性服務、全部）
  - 實作定期服務收入分攤明細表格（執行次數、分攤比例、全年分攤收入、每月平均收入）
  - 實作一次性服務收入明細表格（項目名稱、收費日期、年度收入）
  - 實作每月明細展開功能（可展開查看每個服務的每月應計收入）
  - 實作計算邏輯說明展示（定期服務和一次性服務的分攤規則）
  - 實作驗證結果提示（顯示計算驗證狀態）
  - 實作分頁功能（支援大型資料集，可調整每頁顯示數量）
  - 實作視覺化區分（定期服務藍色、一次性服務綠色）
  - 實作響應式設計（移動端適配）
  - 實作載入狀態和錯誤處理
  - Purpose: 提供應計收入分攤結果的清晰視覺化展示，支援 BR1.3.3.9 所有場景
  - _Leverage: Ant Design Vue Table, Descriptions, Card, Collapse, Alert, Tag_
  - _Requirements: BR1.3.3.9_
  - _Completed: 已建立完整的應計收入展示組件，包含詳細的分攤明細、每月展開功能、計算邏輯說明、驗證結果提示、分頁支援、視覺化區分、響應式設計，完全符合 BR1.3.3.9 需求，準確呈現所有計算邏輯_

- [x] 7.2 實作收費管理 API 整合
  - File: src/composables/useBilling.js
  - 實作基於客戶和年度的收費計劃 CRUD API 封裝（createPlan, updatePlan, deletePlan, loadBillingPlans）
  - 實作應計收入查詢（loadAccruedRevenue，支援月份篩選和驗證）
  - 實作年度自動建立邏輯（autoCreateAnnualPlans，透明處理）
  - 實作錯誤處理（plansError, revenueError，完整的錯誤狀態管理）
  - 實作載入狀態管理（isLoadingPlans, isLoadingRevenue, isCreating, isUpdating, isDeleting）
  - 實作快取策略（5 分鐘快取，支援強制刷新）
  - 實作響應式狀態管理（reactive refs, computed properties）
  - 實作計算屬性（recurringPlans, oneTimePlans, yearTotal, recurringTotal, oneTimeTotal）
  - 實作狀態檢查（canAutoCreate, hasRecurringPlan, hasOneTimePlans, needsRefresh）
  - 實作自動載入（監聽 clientId 和 year 變化）
  - 實作快取管理（clearRevenueCache, clearCache, refresh）
  - Purpose: 提供統一的收費管理前端 API 介面和狀態管理
  - _Leverage: Vue 3 Composition API, src/api/billing.js_
  - _Requirements: BR1.3.3.1, BR1.3.3.2, BR1.3.3.3, BR1.3.3.4, BR1.3.3.9_
  - _Completed: 已建立完整的收費管理 composable，包含所有 CRUD 操作、應計收入查詢、自動建立邏輯、錯誤處理、載入狀態管理、快取策略、響應式狀態管理，完全封裝所有收費操作，狀態管理響應式，自動建立邏輯透明，符合所有 BR1.3.3 需求_

## 8.0 測試與品質保障模組

- [x] 8.1 實作單元測試與整合測試
  - File: tests/unit/models/BillingPlanModel.test.js, tests/unit/utils/billing-calculator.test.js
  - File: tests/unit/services/billing-annual-manager.test.js
  - File: vitest.config.js, tests/unit/setup.js
  - 測試應計收入計算邏輯的準確性（特別是 BR1.3.3.9）
    - 單一服務分攤計算（12個月執行）
    - 多服務分攤計算（按執行次數比例）
    - 零執行次數情況處理
    - 一次性服務收入計算
    - 年度總應計收入計算
  - 測試年度自動建立和複製邏輯
    - 從上一年度複製計劃
    - 強制重新建立
    - 上一年度沒有計劃的情況
    - 只複製定期服務計劃
  - 測試資料模型的驗證和關聯完整性
    - 年度、月份、金額參數驗證
    - 定期服務計劃建立
    - 一次性服務計劃建立
    - 重複計劃檢查
    - 必填欄位驗證
    - CRUD 操作
  - 配置 Vitest 測試框架和覆蓋率報告
  - 建立測試環境設置和 mock 機制
  - Purpose: 確保收費管理系統各模組的正確性和可靠性
  - _Leverage: Vitest 測試框架, happy-dom 環境, v8 覆蓋率_
  - _Requirements: 所有 BR1.3.3 驗收標準_
  - _Completed: 已建立完整的單元測試套件，包含計算引擎測試（涵蓋所有 BR1.3.3.9 場景）、資料模型測試（驗證和關聯完整性）、年度管理服務測試（自動建立和複製邏輯），測試覆蓋邊界情況（零執行、年度轉換），驗證財務計算準確性，測試可維護且可靠_

- [x] 8.2 實作端到端測試與驗證
  - File: tests/e2e/clients/client-detail-billing.spec.ts
  - 測試年度收費計劃管理完整流程
    - 年度選擇器顯示和切換
    - 年度切換時自動建立收費計劃
    - 年度數據一致性驗證
  - 測試定期服務收費計劃建立和收入分攤計算
    - 建立定期服務收費計劃（選擇服務、月份、金額）
    - 驗證計劃出現在列表中
    - 驗證應計收入計算準確性（通過 API）
  - 測試一次性服務收費計劃和收入記錄
    - 建立一次性服務收費計劃（項目名稱、日期、金額）
    - 驗證計劃建立成功
  - 測試收費計劃 CRUD 操作
    - 編輯收費計劃
    - 刪除收費計劃（單個和批量）
    - 表單驗證錯誤處理
  - 測試應計收入展示和計算驗證
    - 應計收入標籤切換
    - 年度總計顯示
    - 定期服務收入分攤表格
    - 一次性服務收入表格
    - 計算準確性驗證（總額計算、驗證結果）
  - 測試統計資訊顯示
    - 定期服務數量
    - 一次性服務數量
    - 年度總計
  - 測試數據設置和清理
    - 自動創建測試客戶
    - 測試前後數據管理
  - Purpose: 驗證完整的收費管理用戶體驗和系統整合
  - _Leverage: Playwright 測試框架, 現有 auth 和 test-data 工具_
  - _Requirements: 所有 BR1.3.3 驗收標準_
  - _Completed: 已建立完整的 E2E 測試套件，涵蓋所有 BR1.3.3 工作流程，包括年度管理、收費計劃 CRUD、應計收入展示、計算驗證、批量操作、錯誤處理、數據一致性驗證，測試可在 CI/CD 環境中可靠運行_

- [x] 8.3 實作資料遷移測試
  - File: tests/integration/migration-billing-plans.test.js
  - File: backend/migrations/0045_migrate_billing_schedule_to_plans.sql
  - 測試從 ServiceBillingSchedule 到新 BillingPlans 架構的資料遷移
    - 定期服務收費計劃遷移（單一服務、多服務合併、不同年度分離）
    - 一次性服務收費計劃遷移
    - 月份金額合併邏輯（多個服務的相同月份金額相加）
    - 服務關聯建立（多對多關係）
  - 驗證遷移後資料完整性和業務邏輯正確性
    - 定期服務計劃唯一性驗證（一個客戶一個年度只有一個）
    - 年度總計計算正確性驗證
    - 服務類型一致性驗證
    - 資料完整性驗證（所有計劃都有月份明細和服務關聯）
    - 業務規則驗證（BR1.3.3.1, BR1.3.3.3）
  - 測試回滾機制和資料恢復
    - 回滾遷移功能
    - 資料清除驗證
  - 生產級別數據量測試
    - 大量客戶和服務的遷移測試（100+ 客戶，每個客戶多個服務）
    - 性能測試
  - 錯誤處理測試
    - 無效服務 ID 處理
    - 缺失必填欄位處理
    - 重複資料處理
  - 建立實際遷移 SQL 腳本
    - 定期服務遷移邏輯
    - 一次性服務遷移邏輯
    - 遷移驗證視圖
    - 遷移統計查詢
    - 回滾腳本
  - Purpose: 確保生產環境資料遷移的安全性和正確性
  - _Leverage: Vitest 測試框架, SQL 遷移腳本, Mock 資料庫_
  - _Requirements: BR1.3.3.1, BR1.3.3.3_
  - _Completed: 已建立完整的資料遷移測試套件和實際遷移 SQL 腳本，包含定期服務和一次性服務的完整遷移邏輯、資料完整性驗證、業務邏輯驗證、回滾機制、生產級別數據量測試、錯誤處理，確保遷移安全可靠，所有資料正確保留，業務邏輯在遷移後保持完整_



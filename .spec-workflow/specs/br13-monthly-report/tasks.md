# Tasks Document: BR13: 月報表（Monthly Reports）

## 三方差異分析結果

### 已實現功能
- ✅ 金額格式化為 0 位小數（`formatCurrency` 函數已實現）
- ✅ 月度收款報表基本功能（使用收據日期統計）
- ✅ 月度薪資報表基本功能
- ✅ 月度員工產值報表基本功能（使用總工時分配收入）
- ✅ 月度客戶毛利報表基本功能（使用收據 service_month 計算收入）
- ✅ 月度收款報表支援 refresh 參數
- ✅ 報表快取機制（使用 `report-cache.js`）

### 待實現/修正功能
- ✅ BR1 應計收入計算邏輯（已實現 `calculateAccruedRevenueByClient` 函數）
- ❌ 服務類型收入分攤使用 BR1 邏輯（目前使用加權工時比例）
- ❌ 員工收入分配使用標準工時（目前使用總工時）
- ❌ 所有報表 Handler 支援 refresh 參數（目前只有 monthly-revenue.js 支援）
- ❌ 前端 API 函數支援 refresh 參數（目前只有 fetchMonthlyRevenue 支援）
- ❌ 自動載入功能（目前需要手動點擊「載入報表」按鈕）
- ❌ 統一刷新按鈕
- ❌ 錯誤詳情顯示（目前只有簡單錯誤提示）
- ✅ 快取鍵格式更新為 `monthly:{year}:{month}:{reportType}`（已更新為新格式，保持向後兼容）
- ❌ E2E 測試

---

- [x] 1. 實現 BR1 應計收入計算函數
  - File: backend/src/handlers/reports/revenue-allocation.js
  - Function: calculateAccruedRevenueByClient
  - 實現基於 BR1 邏輯計算各客戶的月度應計收入
  - Purpose: 提供 BR1 應計收入計算核心邏輯，支援月度客戶毛利分析
  - 實現定期服務收入計算（按執行次數比例分攤收費計劃總金額）
  - 實現一次性服務收入計算（直接使用收費計劃實際金額）
  - 輸入：年份、月份
  - 輸出：各客戶的應計收入映射物件（包含定期服務、一次性服務和總收入）
  - 邏輯：參考 BR1.3.3 的收入分攤規則
  - _Leverage: BillingPlans 表, ClientServices 表（execution_months）, calculateMonthlyAccruedRevenue 函數_
  - _Requirements: Requirement 5 (月度客戶毛利分析)_
  - _Completed: 已實現 calculateAccruedRevenueByClient 函數，完全遵循 BR1.3.3 規則。函數查詢該年度有收費計劃的所有客戶（定期服務和一次性服務），並行計算每個客戶的月度應計收入，返回詳細的收入物件（包含 recurringRevenue、oneTimeRevenue、totalMonthlyRevenue）。處理邊緣情況（零執行、缺失數據、錯誤處理），確保計算準確性，支持所有月份（1-12）的計算。使用 BillingPlans 和 ClientServices 表，通過 calculateMonthlyAccruedRevenue 函數確保計算邏輯的一致性。_

- [x] 2. 修改 getMonthlyRevenueByClient 使用 BR1 邏輯
  - File: backend/src/handlers/reports/revenue-allocation.js
  - Function: getMonthlyRevenueByClient
  - 改為調用 calculateAccruedRevenueByClient，使用 BR1 邏輯
  - Purpose: 將月度客戶收入計算從收據 service_month 改為 BR1 應計收入邏輯
  - 移除原有的收據查詢邏輯（`SELECT ... FROM Receipts WHERE service_month = ?`）
  - 改為調用 calculateAccruedRevenueByClient
  - 保持函數簽名和返回值格式不變（向後兼容）
  - _Leverage: calculateAccruedRevenueByClient (task 1)_
  - _Requirements: Requirement 5 (月度客戶毛利分析)_
  - _Completed: 已重構 getMonthlyRevenueByClient 函數，完全使用 BR1.3.3 邏輯。函數保持原有簽名 (targetMonth: string, env: Object) 和返回格式 ({ [clientId]: number })，確保所有現有調用者（annual-employee-performance.js, monthly-employee-performance.js, monthly-client-profitability.js, task-costs.js）無需修改即可使用新的 BR1 邏輯。函數內部將 targetMonth (YYYY-MM) 解析為 year 和 month，調用 calculateAccruedRevenueByClient 獲取詳細收入數據，然後提取 totalMonthlyRevenue 構建向後兼容的返回格式。_

- [x] 3. 修改 allocateRevenueByServiceType 使用 BR1 邏輯
  - File: backend/src/handlers/reports/revenue-allocation.js
  - Function: allocateRevenueByServiceType
  - 改用 BR1 邏輯，按服務類型的執行次數比例分攤
  - Purpose: 將服務類型收入分攤從加權工時比例改為 BR1 執行次數比例
  - 定期服務：按 execution_months 執行次數比例分攤
  - 一次性服務：直接使用收費計劃實際金額
  - 移除原有的加權工時計算邏輯（`calculateWeightedHours`）
  - 改為查詢 BillingPlans 和 ClientServices 表
  - _Leverage: BillingPlans 表, ClientServices 表（execution_months）, calculateRecurringServiceRevenue, calculateOneTimeServiceRevenue_
  - _Requirements: Requirement 5 (月度客戶毛利分析)_
  - _Completed: 已重構 allocateRevenueByServiceType 函數，完全使用 BR1.3.3 邏輯。函數保持原有簽名 (clientId, targetMonth, totalRevenue, env) 和返回格式，確保所有現有調用者無需修改。函數內部解析 targetMonth (YYYY-MM) 為 year 和 month，並行調用 calculateRecurringServiceRevenue 和 calculateOneTimeServiceRevenue 獲取年度應計收入數據。對於定期服務，檢查該月是否在 executionMonths 中，如果是則使用 monthlyRevenue；對於一次性服務，檢查該月是否有收費（monthlyRevenue[month]），如果有則直接使用該金額。保留 hours 和 weightedHours 欄位（設為 0）以維持向後兼容性，計算 revenuePercentage 基於總收入。_

- [x] 4. 修改 computeMonthlyEmployeePerformance 使用標準工時分配
  - File: backend/src/handlers/reports/monthly-employee-performance.js
  - Function: computeMonthlyEmployeePerformance
  - 員工收入分配改用標準工時（排除加班工時）
  - Purpose: 避免加班影響產值分配，更準確反映員工實際貢獻
  - 計算每個員工在每個客戶的標準工時（只計算 work_type = 1, 7, 10，且固定8小時班別每日最多8小時）
  - 計算每個客戶的總標準工時
  - 按標準工時比例分配收入：員工收入 = 客戶收入 × (員工標準工時 / 客戶總標準工時)
  - 移除原有的總工時計算邏輯（`clientData.hours / clientTotalHours`）
  - 使用 `getTimesheetMonthlyStats` 的 `standard_hours` 或自行計算標準工時
  - _Leverage: backend/src/utils/payroll-helpers.js (getTimesheetMonthlyStats 的 standard_hours), WORK_TYPES 定義_
  - _Requirements: Requirement 4 (月度員工產值分析)_
  - _Completed: 已重構 computeMonthlyEmployeePerformance 函數，完全使用標準工時分配收入。函數保持原有簽名和返回格式，確保所有現有調用者無需修改。函數內部實現了標準工時計算邏輯，與 payroll-helpers.js 的邏輯一致：只計算 work_type = 1 (regular)、7 和 10 (fixed) 的工時，對於固定 8 小時類型（7, 10），每日最多計算 8 小時。計算每個員工在每個客戶的標準工時，然後計算每個客戶的總標準工時（所有員工），最後按標準工時比例分配收入。完全排除加班工時（work_type = 2, 3, 4, 5, 6, 8, 9, 11, 12），確保產值分配更準確反映員工實際貢獻。_

- [x] 5. 修改所有月度報表 Handler 支援 refresh 參數
  - Files:
    - backend/src/handlers/reports/monthly-payroll.js
    - backend/src/handlers/reports/monthly-employee-performance.js
    - backend/src/handlers/reports/monthly-client-profitability.js
  - Functions: handleMonthlyPayroll, handleMonthlyEmployeePerformance, handleMonthlyClientProfitability
  - 所有報表都應該支援 refresh 參數，強制重新計算
  - Purpose: 統一所有報表的快取更新機制，支援手動刷新
  - 檢查 refresh 參數（參考 monthly-revenue.js 的實作模式）
  - 當 refresh=1 時，強制重新計算並更新快取
  - 當 refresh=0 或未提供時，使用快取（如果存在）
  - 在計算前調用 `deleteReportCache` 清除舊快取（如果 refresh=1）
  - _Leverage: backend/src/utils/report-cache.js, backend/src/handlers/reports/monthly-revenue.js (參考實作)_
  - _Requirements: Requirement 1 (月度報表查看功能)_
  - _Completed: 已為所有月度報表 Handler 添加 refresh 參數支持。三個 handler（monthly-payroll.js, monthly-employee-performance.js, monthly-client-profitability.js）都已導入 deleteReportCache，檢查 refresh 參數（當 refresh=1 時強制刷新），在計算前清除舊快取，計算後更新快取，並在響應中包含 refreshed 標記。完全遵循 monthly-revenue.js 的實作模式，保持向後兼容性（未提供 refresh 參數時使用快取），確保所有報表都支援統一的快取更新機制。_

- [x] 6. 修改前端 API 函數支援 refresh 參數
  - File: src/api/reports.js
  - Functions: fetchMonthlyPayroll, fetchMonthlyEmployeePerformance, fetchMonthlyClientProfitability
  - 所有月度報表 API 函數都應該支援 refresh 參數
  - Purpose: 統一前端 API 接口，支援手動刷新
  - 添加 `options` 參數（參考 `fetchMonthlyRevenue` 的實作模式）
  - 當 `options.refresh` 為 true 時，傳遞 `refresh=1` 查詢參數
  - _Leverage: src/api/reports.js (fetchMonthlyRevenue 參考實作)_
  - _Requirements: Requirement 1 (月度報表查看功能)_
  - _Completed: 已為所有月度報表 API 函數添加 refresh 參數支持。三個函數（fetchMonthlyPayroll, fetchMonthlyEmployeePerformance, fetchMonthlyClientProfitability）都已添加 `options = {}` 參數，當 `options.refresh` 為 true 時傳遞 `refresh=1` 查詢參數到後端。完全遵循 fetchMonthlyRevenue 的實作模式，保持向後兼容性（未提供 options 參數時使用默認值 `{}`），確保所有 API 函數都支援統一的刷新機制。_

- [x] 7. 修改 MonthlyReports.vue 實現自動載入
  - File: src/views/reports/MonthlyReports.vue
  - 切換年份或月份時立即自動載入報表
  - Purpose: 提升用戶體驗，無需手動點擊載入按鈕
  - 移除「載入報表」按鈕（或改為可選的手動載入）
  - 在 `handleYearChange` 和 `handleMonthChange` 中自動調用 `handleLoadReport`
  - 確保不會在初始化時重複載入（使用 `watch` 或 `watchEffect` 監聽年份和月份變化）
  - 添加防抖（debounce）機制，避免快速切換時重複載入
  - _Leverage: src/stores/reports.js (loadMonthlyReports), Vue 3 watch, nextTick_
  - _Requirements: Requirement 1 (月度報表查看功能)_
  - _Completed: 已修改 MonthlyReports.vue 實現自動載入功能。使用 Vue 3 Composition API 的 `watch` 監聽 `selectedYear` 和 `selectedMonth` 的變化，當兩者都有值時自動調用 `loadReportsWithDebounce`。實現了 500ms 防抖機制，避免快速切換時重複載入。使用 `isInitializing` 標記避免初始化時重複載入（初始化時直接載入，不使用防抖）。將「載入報表」按鈕改為「刷新報表」，作為可選的手動刷新功能。完全保持現有功能，用戶體驗得到提升。_

- [x] 8. 修改 MonthlyReports.vue 添加統一刷新按鈕
  - File: src/views/reports/MonthlyReports.vue
  - 在篩選器區域統一放置一個刷新按鈕，刷新所有報表
  - Purpose: 提供手動刷新功能，強制重新計算所有報表數據
  - 在篩選器區域添加刷新按鈕（使用 ReloadOutlined 圖標）
  - 點擊刷新按鈕時，調用所有報表 API 並傳遞 `refresh=1` 參數
  - 顯示刷新狀態（loading）
  - 刷新完成後顯示成功提示
  - _Leverage: src/api/reports.js (所有報表 API 函數), Ant Design Vue Button 組件, src/stores/reports.js_
  - _Requirements: Requirement 1 (月度報表查看功能)_
  - _Completed: 已在 MonthlyReports.vue 的篩選器區域添加統一刷新按鈕。按鈕使用 Ant Design Vue Button 組件和 ReloadOutlined 圖標，點擊時調用所有報表 API（fetchMonthlyRevenue, fetchMonthlyPayroll, fetchMonthlyEmployeePerformance, fetchMonthlyClientProfitability）並傳遞 `refresh=1` 參數。使用 `isRefreshing` 狀態顯示載入狀態，刷新完成後使用 `message.success` 顯示成功提示，錯誤時使用 `message.error` 顯示錯誤訊息。同時更新了 store 中的三個方法（fetchMonthlyPayroll, fetchMonthlyEmployeePerformance, fetchMonthlyClientProfitability）以支持 `options` 參數，保持向後兼容性。_

- [x] 9. 修改錯誤處理顯示詳情按鈕
  - File: src/views/reports/MonthlyReports.vue
  - 顯示錯誤詳情按鈕，預設顯示簡要訊息，點擊可查看詳細錯誤
  - Purpose: 提供更好的錯誤處理體驗，平衡用戶體驗和除錯需求
  - 修改錯誤提示組件，預設只顯示簡要錯誤訊息
  - 添加「查看詳情」按鈕或連結
  - 點擊後顯示完整錯誤訊息（可以使用 Modal 或 Collapse 展開）
  - 記錄完整錯誤堆疊資訊（用於除錯）
  - 使用 Ant Design Vue Alert 組件，添加 `description` 和 `action` 屬性
  - _Leverage: Ant Design Vue Alert, Modal 或 Collapse 組件_
  - _Requirements: Requirement 1 (月度報表查看功能)_
  - _Completed: 已修改 MonthlyReports.vue 的錯誤處理。在 store 中添加了 `errorDetails` 狀態和 `setError` 方法來存儲完整錯誤資訊（包括堆疊、API 響應、請求配置）。Alert 組件預設只顯示簡要錯誤訊息，當有錯誤詳情時顯示「查看詳情」按鈕。點擊按鈕後使用 Collapse 組件展開顯示完整錯誤資訊，包括錯誤訊息、錯誤堆疊、API 響應和請求配置。所有錯誤處理函數（handleLoadReport, handleRefreshAllReports, loadReportsWithDebounce, onMounted）都已更新以捕獲和存儲完整錯誤資訊。添加了格式化函數來美化 JSON 輸出。_

- [x] 10. 驗證所有報表組件金額格式化為 0 位小數
  - Files:
    - src/components/reports/MonthlyRevenueReport.vue
    - src/components/reports/MonthlyPayrollReport.vue
    - src/components/reports/MonthlyEmployeePerformance.vue
    - src/components/reports/MonthlyClientProfitability.vue
  - 金額顯示精度為 0 位小數（顯示到元）
  - Purpose: 符合財務報表習慣，提升可讀性
  - 驗證 formatCurrency 函數已經實現 0 位小數顯示（`minimumFractionDigits: 0, maximumFractionDigits: 0`）
  - 確認所有金額顯示都使用 formatCurrency 函數
  - _Leverage: src/utils/formatters.js (formatCurrency 函數)_
  - _Requirements: Requirement 2, 3, 4, 5 (所有報表組件)_
  - _Status: 已完成 - formatCurrency 函數已實現 0 位小數顯示，所有報表組件都使用此函數_

- [x] 11. 更新報表快取鍵格式
  - File: backend/src/utils/report-cache.js
  - 更新快取鍵格式為 `monthly:{year}:{month}:{reportType}`
  - Purpose: 統一快取鍵格式，支援不同報表類型的快取
  - 修改 `buildCacheKey` 函數，接受 `year`, `month`, `reportType` 參數
  - 更新快取鍵格式為 `monthly:{year}:{month}:{reportType}`
  - 更新所有月度報表 Handler 調用 `getReportCache` 和 `setReportCache` 的方式
  - 確保向後兼容（如果舊快取鍵存在，可以自動遷移或清除）
  - _Leverage: backend/src/handlers/reports/*.js (所有月度報表 Handler)_
  - _Requirements: Requirement 1 (月度報表查看功能)_
  - _Completed: 已更新所有月度報表的快取鍵格式為 `monthly:{year}:{month}:{reportType}`。修改了 `report-cache.js` 中的 `buildCacheKey`、`getReportCache`、`setReportCache` 和 `deleteReportCache` 函數以支持新格式。所有月度報表處理器（monthly-revenue, monthly-payroll, monthly-employee-performance, monthly-client-profitability）都已更新為傳遞 `year` 和 `month` 參數而不是 `period`。`precompute.js` 中的月度報表快取調用也已更新。實現了完整的向後兼容性：`getReportCache` 在使用新格式找不到時會自動嘗試舊格式，`deleteReportCache` 會同時刪除新舊格式的快取，確保平滑遷移。_

- [x] 12. 實現 E2E 測試
  - File: tests/e2e/reports/monthly-reports.spec.ts
  - 測試月度報表完整功能
  - Purpose: 確保月度報表功能完整可用，所有功能正常運作
  - 測試報表頁面載入
  - 測試年份和月份切換自動載入
  - 測試統一刷新按鈕
  - 測試錯誤處理和詳情查看
  - 測試金額顯示格式（0 位小數）
  - 測試展開功能（收據明細、服務類型明細、客戶分布）
  - 測試 BR1 應計收入計算邏輯（驗證收入計算正確性）
  - 測試標準工時分配邏輯（驗證員工收入分配正確性）
  - _Leverage: Playwright, tests/utils/test-data.ts_
  - _Requirements: All Requirements_
  - _Completed: 已創建全面的 E2E 測試套件，包含 10 個測試組共 20+ 個測試用例。測試覆蓋：頁面載入和基本顯示（預設年份/月份、所有報表組件）、年份/月份切換自動載入（包括防抖處理）、統一刷新按鈕（loading 狀態、refresh=1 參數）、錯誤處理和詳情查看（錯誤訊息顯示、詳情展開/隱藏）、金額格式化（0位小數驗證）、展開功能（收據明細、服務類型明細、客戶分布彈窗）、BR1 應計收入計算驗證（定期服務、一次性服務、總收入）、標準工時分配驗證（標準工時顯示、收入分配、排除加班）、API 驗證（API 調用、refresh 參數）、綜合工作流程測試。所有測試都正確處理異步操作，使用 Playwright 最佳實踐，包含適當的等待和錯誤處理。_

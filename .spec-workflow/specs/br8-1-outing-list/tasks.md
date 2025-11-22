# Tasks Document: BR8.1: 外出記錄列表

## 三方差異分析結果

### 已實現功能

1. **外出記錄列表 API Handler** ✅ 已實現
   - `handleGetTrips` - 完整實現外出記錄列表查詢邏輯
   - JOIN 查詢員工名稱、客戶名稱
   - 月份篩選（基於 trip_date）
   - 員工篩選（基於 user_id，僅管理員可用）
   - 客戶篩選（基於 client_id）
   - 權限控制（一般員工只能查看自己的記錄，管理員可以查看所有記錄）
   - 狀態過濾（支援 status 查詢參數，不傳則顯示所有狀態）
   - 排序（按外出日期降序，然後按記錄 ID 降序）
   - 只顯示未刪除的記錄（`is_deleted = 0`）
   - 分頁（預設 20 筆，最多 100 筆）

2. **統計摘要 API Handler** ✅ 已實現
   - `handleGetTripSummary` - 完整實現統計摘要查詢邏輯
   - 月份篩選（基於 trip_date）
   - 員工篩選（基於 user_id，僅管理員可用）
   - 權限控制（一般員工只能查看自己的統計，管理員可以查看所有統計）
   - 計算外出次數（COUNT）
   - 計算總距離（SUM distance_km）
   - 計算交通補貼總額（SUM transport_subsidy_cents，轉換為新台幣）
   - 只計算 status = 'approved' 的記錄

3. **前端 API 調用函數** ✅ 已實現
   - `src/api/trips.js` - 所有外出記錄相關 API 調用函數完整實現
   - `getTrips` 函數（調用 GET /api/v2/trips，支援篩選參數）
   - `getTripsSummary` 函數（調用 GET /api/v2/trips/summary，支援篩選參數）
   - `deleteTrip` 函數（調用 DELETE /api/v2/trips/:id）
   - 統一的錯誤處理和回應格式處理

4. **前端主頁面** ✅ 已實現
   - `src/views/Trips.vue` - 完整實現外出記錄列表主頁面
   - 整合所有子組件（TripsSummary, TripsTable, TripFormModal）
   - 篩選條件管理（月份、員工、客戶）
   - 分頁管理
   - 用戶列表載入（管理員可見）
   - 客戶列表載入
   - 刪除功能
   - 新增和編輯功能

5. **統計摘要組件** ✅ 已實現
   - `src/components/trips/TripsSummary.vue` - 完整實現統計摘要顯示
   - 使用 Ant Design Vue 的 Statistic 組件
   - 格式化數字顯示（距離保留 1 位小數，金額格式化為新台幣）

6. **刪除確認對話框** ✅ 已實現
   - 使用 Ant Design Vue 的 Modal.confirm
   - 顯示確認訊息
   - 處理確認和取消操作

7. **Pinia Store** ✅ 已實現
   - `src/stores/trips.js` - 完整實現外出記錄狀態管理
   - 外出記錄列表狀態
   - 統計摘要狀態
   - 篩選條件狀態
   - 分頁狀態

### 未實現或部分實現功能

1. **外出記錄表格組件狀態欄位** ⚠️ 需要補完
   - 需求：在表格中顯示狀態欄位（pending/approved/rejected）
   - 現狀：需要確認 `TripsTable.vue` 是否已顯示狀態欄位

2. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 外出記錄列表 API Handler

- [x] 1.1.1 驗證外出記錄列表 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/trips/trip-crud.js
  - Function: handleGetTrips
  - 驗證外出記錄列表查詢邏輯完整實現
  - 驗證 JOIN 查詢員工名稱、客戶名稱
  - 驗證月份篩選（基於 trip_date）
  - 驗證員工篩選（基於 user_id，僅管理員可用）
  - 驗證客戶篩選（基於 client_id）
  - 驗證權限控制（一般員工只能查看自己的記錄，管理員可以查看所有記錄）
  - 驗證狀態過濾（支援 status 查詢參數，不傳則顯示所有狀態）
  - 驗證排序（按外出日期降序，然後按記錄 ID 降序）
  - 驗證只顯示未刪除的記錄（`is_deleted = 0`）
  - 驗證分頁（預設 20 筆，最多 100 筆）
  - 驗證路由配置正確
  - _Requirements: BR8.1.1, BR8.1.2, BR8.1.3, BR8.1.4, BR8.1.6_
  - _Status: 已完成_

### 1.2 統計摘要 API Handler

- [x] 1.2.1 驗證統計摘要 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/trips/trip-stats.js
  - Function: handleGetTripSummary
  - 驗證外出記錄統計摘要查詢邏輯完整實現
  - 驗證月份篩選（基於 trip_date）
  - 驗證員工篩選（基於 user_id，僅管理員可用）
  - 驗證權限控制（一般員工只能查看自己的統計，管理員可以查看所有統計）
  - 驗證計算外出次數（COUNT）
  - 驗證計算總距離（SUM distance_km）
  - 驗證計算交通補貼總額（SUM transport_subsidy_cents，轉換為新台幣）
  - 驗證只計算 status = 'approved' 的記錄
  - 驗證路由配置正確
  - _Requirements: BR8.1.5_
  - _Status: 已完成_

### 1.3 刪除 API Handler

- [x] 1.3.1 驗證刪除 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/trips/trip-crud.js
  - Function: handleDeleteTrip
  - 驗證外出記錄刪除邏輯完整實現
  - 驗證權限控制（一般員工只能刪除自己的記錄，管理員可以刪除所有記錄）
  - 驗證軟刪除（`is_deleted = 1`）
  - 驗證觸發薪資重新計算
  - 驗證路由配置正確
  - _Requirements: BR8.1.7_
  - _Status: 已完成_

---

## 2. 前端組件實現

### 2.1 前端 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/trips.js
  - 驗證所有外出記錄相關 API 調用函數完整實現
  - 驗證 getTrips 函數（調用 GET /api/v2/trips，支援篩選參數）
  - 驗證 getTripsSummary 函數（調用 GET /api/v2/trips/summary，支援篩選參數）
  - 驗證 deleteTrip 函數（調用 DELETE /api/v2/trips/:id）
  - 驗證統一的錯誤處理和回應格式處理
  - _Requirements: BR8.1.1, BR8.1.2, BR8.1.3, BR8.1.4, BR8.1.5, BR8.1.6, BR8.1.7_
  - _Status: 已完成_

### 2.2 前端主頁面

- [x] 2.2.1 驗證前端主頁面已實現 ✅ 已實現
  - File: src/views/Trips.vue
  - 驗證頁面佈局和路由
  - 驗證整合所有子組件（TripsSummary, TripsTable, TripFormModal）
  - 驗證數據載入和錯誤處理
  - 驗證篩選條件管理（月份、員工、客戶）
  - 驗證分頁管理
  - 驗證用戶列表載入（管理員可見）
  - 驗證客戶列表載入
  - 驗證刪除功能
  - 驗證新增和編輯功能
  - _Requirements: BR8.1.1, BR8.1.2, BR8.1.3, BR8.1.4, BR8.1.5, BR8.1.6, BR8.1.7_
  - _Status: 已完成_

### 2.3 統計摘要組件

- [x] 2.3.1 驗證統計摘要組件已實現 ✅ 已實現
  - File: src/components/trips/TripsSummary.vue
  - 驗證統計摘要顯示（外出次數、總距離、交通補貼總額）
  - 驗證使用 Ant Design Vue 的 Statistic 組件
  - 驗證格式化數字顯示（距離保留 1 位小數，金額格式化為新台幣）
  - _Requirements: BR8.1.5_
  - _Status: 已完成_

### 2.4 外出記錄表格組件

- [ ] 2.4.1 驗證外出記錄表格組件狀態欄位顯示
  - File: src/components/trips/TripsTable.vue
  - 驗證外出記錄列表展示
  - 驗證使用 Ant Design Vue 的 Table 組件
  - 驗證權限控制（只有創建者或管理員可以編輯/刪除）
  - 驗證分頁顯示
  - 驗證格式化日期顯示
  - 驗證格式化金額顯示
  - **新增需求：** 驗證在表格中顯示狀態欄位（pending/approved/rejected）
  - _Requirements: BR8.1.1, BR8.1.6, BR8.1.7_
  - _Status: 需要確認狀態欄位是否已顯示_

### 2.5 刪除確認對話框

- [x] 2.5.1 驗證刪除確認對話框已實現 ✅ 已實現
  - File: src/components/trips/TripsTable.vue
  - 驗證使用 Ant Design Vue 的 Modal.confirm
  - 驗證顯示確認訊息
  - 驗證處理確認和取消操作
  - _Requirements: BR8.1.7_
  - _Status: 已完成_

### 2.6 Pinia Store

- [x] 2.6.1 驗證 Pinia Store 已實現 ✅ 已實現
  - File: src/stores/trips.js
  - 驗證外出記錄列表狀態
  - 驗證統計摘要狀態
  - 驗證篩選條件狀態
  - 驗證分頁狀態
  - _Requirements: BR8.1.1, BR8.1.2, BR8.1.3, BR8.1.4, BR8.1.5, BR8.1.6_
  - _Status: 已完成_

---

## 3. 測試

### 3.1 E2E 測試

- [ ] 3.1.1 創建外出記錄列表 E2E 測試套件
  - File: tests/e2e/trips/trip-list.spec.ts
  - 測試外出記錄列表載入
  - 測試月份篩選
  - 測試員工篩選（管理員）
  - 測試客戶篩選
  - 測試統計摘要顯示
  - 測試分頁功能
  - 測試刪除功能
  - 測試權限控制（一般員工只能看到自己的記錄）
  - Purpose: 確保外出記錄列表功能完整可用，所有篩選和分頁功能正常運作
  - _Leverage: Playwright, tests/utils/test-data.ts_
  - _Requirements: BR8.1.1, BR8.1.2, BR8.1.3, BR8.1.4, BR8.1.5, BR8.1.6, BR8.1.7_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create E2E tests for trip list functionality including loading, month filtering, user filtering (admin), client filtering, summary display, pagination, delete functionality, and permission control (regular users can only see their own records). Use Playwright framework and test data utilities from tests/utils/test-data.ts | Restrictions: Must use Playwright, must test all filter types, must test pagination, must test delete functionality, must test permission control, must use test data utilities, must handle async operations correctly | Success: All E2E tests pass, all filter types are tested, pagination is tested, delete functionality is tested, permission control is tested_

---

## 總結

### 已完成功能
- ✅ 外出記錄列表 API Handler（完整實現 - JOIN 查詢、篩選、排序、分頁、權限控制）
- ✅ 統計摘要 API Handler（完整實現 - 月份/員工篩選、權限控制、統計計算）
- ✅ 刪除 API Handler（完整實現 - 權限控制、軟刪除、薪資重新計算）
- ✅ 前端 API 調用函數（完整實現 - 所有外出記錄相關 API）
- ✅ 前端主頁面（完整實現 - 篩選、分頁、數據載入、錯誤處理）
- ✅ 統計摘要組件（完整實現 - 統計顯示、數字格式化）
- ✅ 刪除確認對話框（完整實現 - Modal.confirm）
- ✅ Pinia Store（完整實現 - 狀態管理）

### 待完成功能
- ⚠️ 外出記錄表格組件狀態欄位顯示（需要確認是否已顯示 pending/approved/rejected 狀態）
- ❌ E2E 測試（完全未實現）

### 備註
- 大部分核心功能已完整實現，包括：
  - 外出記錄列表查詢（JOIN 查詢、多種篩選、排序、分頁、權限控制）
  - 統計摘要查詢（月份/員工篩選、權限控制、統計計算）
  - 刪除功能（權限控制、軟刪除、薪資重新計算）
  - 前端組件和 API 調用函數
  - 狀態管理（Pinia Store）
- 需要補完的功能：
  - 外出記錄表格組件：需要確認是否已顯示狀態欄位（pending/approved/rejected），如果未顯示則需要補完
  - E2E 測試：需要實現完整的 E2E 測試套件

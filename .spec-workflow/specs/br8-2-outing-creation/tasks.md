# Tasks Document: BR8.2: 外出記錄建立

## 三方差異分析結果

### 已實現功能

1. **補貼計算工具** ✅ 已實現
   - `subsidyCalculator.js` - 前端補貼計算邏輯完整實現
   - `backend/src/handlers/trips/utils.js` - 後端補貼計算邏輯完整實現
   - 補貼計算邏輯：每 5 公里 60 元，向上取整

2. **前端 API 調用函數** ✅ 已實現
   - `src/api/trips.js` - `createTrip` 和 `updateTrip` 函數已實現
   - 統一的錯誤處理和回應格式處理

3. **基本外出記錄表單組件** ✅ 已實現
   - `src/components/trips/TripFormModal.vue` - 基本表單功能已實現
   - 基本欄位：外出日期、目的地、距離、補貼預覽、客戶選擇、外出目的、備註
   - 補貼即時計算和顯示

### 未實現或部分實現功能

1. **時間欄位（start_time, end_time）** ❌ 完全未實現
   - 需求：必填欄位，格式 HH:mm，結束時間必須晚於開始時間
   - 現狀：前端表單和後端 API 均未實現時間欄位

2. **任務關聯（task_id）** ❌ 完全未實現
   - 需求：可選欄位，關聯 Tasks 表，需要驗證任務是否存在
   - 現狀：前端表單和後端 API 均未實現任務欄位

3. **管理員替其他員工新增（user_id）** ❌ 完全未實現
   - 需求：管理員可以指定 user_id，一般員工自動使用當前用戶
   - 現狀：前端表單和後端 API 均未實現員工選擇欄位

4. **資料庫 Migration** ❌ 完全未實現
   - 需求：新增 start_time、end_time、task_id 欄位
   - 現狀：需要確認資料庫 Migration 是否已包含這些欄位

5. **後端時間驗證** ❌ 完全未實現
   - 需求：驗證 start_time、end_time 必填，結束時間必須晚於開始時間
   - 現狀：後端 API 未實現時間驗證

6. **後端任務驗證** ❌ 完全未實現
   - 需求：驗證 task_id 是否存在（如果提供）
   - 現狀：後端 API 未實現任務驗證

7. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 資料庫 Migration

- [ ] 1.1.1 創建資料庫 Migration（新增時間和任務欄位）
  - File: backend/migrations/XXXX_add_trip_time_and_task.sql
  - 新增 start_time 欄位（TEXT，格式：HH:mm）
  - 新增 end_time 欄位（TEXT，格式：HH:mm）
  - 新增 task_id 欄位（INTEGER，可選，外鍵關聯 Tasks 表）
  - 添加外鍵約束和索引
  - Purpose: 擴展 BusinessTrips 表結構，支援時間記錄和任務關聯
  - _Leverage: backend/migrations/_
  - _Requirements: BR8.2.1, BR8.2.5_
  - _Prompt: Role: Database Administrator with expertise in SQLite and D1 | Task: Create migration file to add start_time, end_time, and task_id columns to BusinessTrips table. start_time and end_time should be TEXT type with HH:mm format. task_id should be INTEGER with foreign key constraint to Tasks table. Add appropriate indexes for performance | Restrictions: Must follow existing migration patterns, must add foreign key constraints, must add indexes, must handle NULL values correctly | Success: Migration file is created correctly, columns are added with correct types and constraints, indexes are added, migration can be executed successfully_

### 1.2 新增外出記錄 API Handler

- [ ] 1.2.1 增強新增外出記錄 API Handler（支援時間驗證和任務關聯）
  - File: backend/src/handlers/trips/trip-crud.js
  - Function: handleCreateTrip（修改現有實現）
  - 新增驗證：start_time, end_time 必填，結束時間必須晚於開始時間
  - 新增驗證：task_id 存在性驗證（如果提供）
  - 新增功能：支援管理員指定 user_id（一般員工自動使用當前用戶）
  - 驗證必填欄位（trip_date, start_time, end_time, destination, distance_km）
  - 確認路由配置
  - Purpose: 完整實現新增外出記錄 API，包含所有驗證邏輯
  - _Leverage: backend/src/handlers/trips/utils.js, backend/src/utils/response.js, backend/src/utils/payroll-recalculate.js_
  - _Requirements: BR8.2.1, BR8.2.3, BR8.2.5_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Enhance handleCreateTrip function to add time validation (start_time, end_time required, end_time must be later than start_time), task validation (if task_id provided, validate it exists), and admin user_id specification support | Restrictions: Must maintain existing subsidy calculation and payroll recalculation, must use parameterized queries, must validate time logic correctly | Success: All new validations work correctly, time logic validation prevents invalid time ranges, task validation prevents invalid task associations, admin user_id handling works properly_

### 1.3 更新外出記錄 API Handler

- [ ] 1.3.1 增強更新外出記錄 API Handler（支援時間驗證和任務關聯）
  - File: backend/src/handlers/trips/trip-crud.js
  - Function: handleUpdateTrip（修改現有實現）
  - 新增驗證：結束時間必須晚於開始時間（如果提供了時間欄位）
  - 新增驗證：task_id 存在性驗證（如果提供）
  - 驗證權限（一般員工只能編輯自己的記錄）
  - 確認路由配置
  - Purpose: 完整實現更新外出記錄 API，包含時間和任務驗證
  - _Leverage: backend/src/handlers/trips/utils.js, backend/src/utils/response.js, backend/src/utils/payroll-recalculate.js_
  - _Requirements: BR8.2.2, BR8.2.5_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Enhance handleUpdateTrip function to add time validation (end_time must be later than start_time if time fields provided) and task validation (if task_id provided, validate it exists) | Restrictions: Must maintain existing permission validation and subsidy recalculation, must use parameterized queries | Success: Time validation works for updates, task validation prevents invalid associations, permission checks remain intact_

---

## 2. 前端組件實現

### 2.1 外出記錄表單組件

- [ ] 2.1.1 更新外出記錄表單組件（新增時間和任務欄位）
  - File: src/components/trips/TripFormModal.vue（修改現有組件）
  - 新增開始時間欄位（TimePicker，HH:mm 格式）
  - 新增結束時間欄位（TimePicker，HH:mm 格式）
  - 新增任務選擇欄位（可選，使用 Select 組件）
  - 新增員工選擇欄位（管理員可見）
  - 更新表單驗證規則（時間驗證：結束時間必須晚於開始時間）
  - 新增時間邏輯驗證函數
  - Purpose: 提供完整的外出記錄表單，支援所有必要欄位
  - 任務列表由父組件載入並通過 props 傳遞（使用 src/api/tasks.js 的 fetchTasks）
  - _Leverage: Ant Design Vue, @/utils/subsidyCalculator, @/utils/formatters, src/api/tasks.js_
  - _Requirements: BR8.2.1, BR8.2.2, BR8.2.3, BR8.2.5_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Update TripFormModal.vue to add start_time and end_time TimePicker fields, task selection field (optional), user selection field (admin only), and implement time validation logic (end_time must be later than start_time) | Restrictions: Must use Vue 3 Composition API, must use Ant Design Vue components, must maintain existing subsidy calculation, must follow existing component patterns | Success: All new fields are added and functional, time validation prevents invalid time ranges, admin user selection works correctly_

---

## 3. 已實現功能驗證

### 3.1 補貼計算工具

- [x] 3.1.1 驗證補貼計算工具已實現 ✅ 已實現
  - File: src/utils/subsidyCalculator.js, backend/src/handlers/trips/utils.js
  - 驗證補貼計算邏輯：每 5 公里 60 元，向上取整
  - 驗證前端和後端補貼計算邏輯一致
  - _Requirements: BR8.2.6_
  - _Status: 已完成_

### 3.2 前端 API 調用函數

- [x] 3.2.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/trips.js
  - 驗證 createTrip 函數調用 POST /api/v2/trips
  - 驗證 updateTrip 函數調用 PUT /api/v2/trips/:id
  - 驗證統一的錯誤處理和回應格式處理
  - _Requirements: BR8.2.1, BR8.2.2_
  - _Status: 已完成_

### 3.3 基本外出記錄表單組件

- [x] 3.3.1 驗證基本外出記錄表單組件已實現 ✅ 已實現
  - File: src/components/trips/TripFormModal.vue
  - 驗證基本欄位：外出日期、目的地、距離、補貼預覽、客戶選擇、外出目的、備註
  - 驗證補貼即時計算和顯示
  - _Requirements: BR8.2.1, BR8.2.4, BR8.2.6_
  - _Status: 已完成_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 實現 E2E 測試（trip-creation.spec.ts）
  - File: tests/e2e/trips/trip-creation.spec.ts
  - 測試新增外出記錄完整流程（包含時間欄位和任務關聯）
  - 測試編輯外出記錄流程（包含權限驗證）
  - 測試管理員替其他員工新增流程
  - 測試表單驗證（時間驗證、客戶驗證、任務驗證）
  - 測試補貼計算和即時預覽
  - Purpose: 確保外出記錄建立功能完整可用
  - _Leverage: Playwright, tests/utils/test-data.ts_
  - _Requirements: BR8.2.1, BR8.2.2, BR8.2.3, BR8.2.4, BR8.2.5, BR8.2.6_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for trip creation including time fields validation, task association, admin user selection, and subsidy calculation | Restrictions: Must use Playwright framework, must test all validation scenarios, must handle async operations correctly | Success: All E2E tests pass, covering complete user workflows including new time and task validation features_

---

## 總結

### 已完成功能
- ✅ 補貼計算工具（完整實現 - 前端和後端邏輯一致）
- ✅ 前端 API 調用函數（完整實現 - createTrip 和 updateTrip）
- ✅ 基本外出記錄表單組件（完整實現 - 基本欄位和補貼預覽）

### 待完成功能
- ❌ 資料庫 Migration（完全未實現 - 需要新增 start_time、end_time、task_id 欄位）
- ❌ 後端時間驗證（完全未實現 - 需要驗證 start_time、end_time 必填，結束時間必須晚於開始時間）
- ❌ 後端任務驗證（完全未實現 - 需要驗證 task_id 是否存在）
- ❌ 後端管理員 user_id 支援（完全未實現 - 需要支援管理員指定 user_id）
- ❌ 前端時間欄位（完全未實現 - 需要新增開始時間和結束時間欄位）
- ❌ 前端任務欄位（完全未實現 - 需要新增任務選擇欄位）
- ❌ 前端員工選擇欄位（完全未實現 - 需要新增管理員可見的員工選擇欄位）
- ❌ 前端時間驗證（完全未實現 - 需要驗證結束時間必須晚於開始時間）
- ❌ E2E 測試（完全未實現）

### 備註
- 基本功能已實現，包括：
  - 補貼計算邏輯（前端和後端一致）
  - 基本表單組件（外出日期、目的地、距離、客戶選擇、補貼預覽）
  - API 調用函數（createTrip 和 updateTrip）
- 需要補完的功能：
  - 時間欄位：需求要求必填 start_time 和 end_time，但目前前端表單和後端 API 均未實現。需要：
    - 資料庫 Migration 新增 start_time 和 end_time 欄位
    - 前端表單新增開始時間和結束時間欄位（TimePicker）
    - 前端驗證結束時間必須晚於開始時間
    - 後端 API 驗證時間必填和時間邏輯
  - 任務關聯：需求要求可選 task_id 欄位，但目前前端表單和後端 API 均未實現。需要：
    - 資料庫 Migration 新增 task_id 欄位（外鍵關聯 Tasks 表）
    - 前端表單新增任務選擇欄位
    - 後端 API 驗證 task_id 是否存在（如果提供）
  - 管理員替其他員工新增：需求要求管理員可以指定 user_id，但目前前端表單和後端 API 均未實現。需要：
    - 前端表單新增員工選擇欄位（管理員可見）
    - 後端 API 支援管理員指定 user_id（一般員工自動使用當前用戶）

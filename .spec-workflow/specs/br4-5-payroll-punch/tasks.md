# Tasks Document: BR4.5: 打卡記錄上傳

## 三方差異分析結果

### 已實現功能

1. **後端 API Handler** ✅ 已實現
   - `handleGetPunchRecords` - 獲取打卡記錄列表（支援按員工和月份篩選，權限控制）
   - `handleUploadPunchRecord` - 上傳打卡記錄檔案（保存到 R2 存儲和資料庫，權限控制）
   - `handleDownloadPunchRecord` - 下載打卡記錄檔案（從 R2 存儲下載，權限控制）
   - `handleDeletePunchRecord` - 刪除打卡記錄（權限控制）

2. **路由配置** ✅ 已實現
   - GET /api/v2/payroll/punch-records（列表查詢）
   - POST /api/v2/payroll/punch-records/upload（上傳）
   - GET /api/v2/payroll/punch-records/:id/download（下載）
   - GET /api/v2/payroll/punch-records/:id/preview（預覽）
   - GET /api/v2/payroll/punch-records/:id（單條查詢）
   - DELETE /api/v2/payroll/punch-records/:id（刪除）

3. **前端 API 調用函數** ✅ 已實現
   - `uploadPunchRecord` - 上傳打卡記錄
   - `loadPunchRecords` - 獲取打卡記錄列表

4. **前端組件** ✅ 已實現
   - `PayrollPunch.vue` - 打卡記錄上傳頁面（整合所有子組件）
   - `PunchRecordUpload.vue` - 打卡記錄上傳組件（支援多種檔案格式、員工選擇、月份選擇）
   - `PunchRecordList.vue` - 打卡記錄列表組件（顯示列表、下載、刪除）
   - `PunchRecordPreview.vue` - 打卡記錄預覽組件

5. **資料庫 Migration** ✅ 已實現
   - `PunchRecords` 表已創建（包含所有必要欄位和索引）

### 未實現或部分實現功能

1. **前端 API 調用函數（下載和刪除）** ✅ 已實現
   - 需求：`downloadPunchRecord` 和 `deletePunchRecord` 函數
   - 現狀：已在 `src/api/payroll.js` 中實現

2. **E2E 測試** ❌ 完全未實現

---

## 1. 後端 API 實現

### 1.1 打卡記錄上傳 API Handler

- [x] 1.1.1 驗證打卡記錄上傳 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/punch-records/punch-crud.js
  - Function: handleUploadPunchRecord
  - 驗證檔案上傳邏輯（保存到 R2 存儲）已實現
  - 驗證檔案資訊保存到資料庫已實現
  - 驗證權限控制（員工只能上傳自己的打卡記錄，管理員可以為任何員工上傳）已實現
  - 驗證檔案格式驗證（PDF、Excel、圖片、ZIP）已實現
  - 驗證檔案大小驗證（10MB 限制）已實現
  - 確認路由配置（backend/src/router/punch-records.js 中的 POST /api/v2/payroll/punch-records/upload 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援打卡記錄上傳
  - _Leverage: backend/src/utils/response.js, backend/src/router/punch-records.js, Cloudflare R2_
  - _Requirements: BR4.5.1_
  - _Status: 已完成_

### 1.2 打卡記錄列表查詢 API Handler

- [x] 1.2.1 驗證打卡記錄列表查詢 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/punch-records/punch-crud.js
  - Function: handleGetPunchRecords
  - 驗證打卡記錄列表查詢邏輯已實現
  - 驗證權限控制（員工只能查看自己的打卡記錄，管理員可以查看所有員工的打卡記錄）已實現
  - 驗證按員工和月份篩選已實現
  - 確認路由配置（backend/src/router/punch-records.js 中的 GET /api/v2/payroll/punch-records 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援打卡記錄列表查詢
  - _Leverage: backend/src/utils/response.js, backend/src/router/punch-records.js_
  - _Requirements: BR4.5.2_
  - _Status: 已完成_

### 1.3 打卡記錄下載 API Handler

- [x] 1.3.1 驗證打卡記錄下載 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/punch-records/punch-crud.js
  - Function: handleDownloadPunchRecord
  - 驗證檔案下載邏輯（從 R2 存儲下載）已實現
  - 驗證權限控制（員工只能下載自己的打卡記錄，管理員可以下載所有員工的打卡記錄）已實現
  - 驗證預覽功能已實現（isPreview 參數）
  - 確認路由配置（backend/src/router/punch-records.js 中的 GET /api/v2/payroll/punch-records/:id/download 和 /preview 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援打卡記錄下載
  - _Leverage: backend/src/utils/response.js, backend/src/router/punch-records.js, Cloudflare R2_
  - _Requirements: BR4.5.2_
  - _Status: 已完成_

### 1.4 打卡記錄刪除 API Handler

- [x] 1.4.1 驗證打卡記錄刪除 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/punch-records/punch-crud.js
  - Function: handleDeletePunchRecord
  - 驗證檔案刪除邏輯（從 R2 存儲和資料庫刪除）已實現
  - 驗證權限控制（員工只能刪除自己的打卡記錄，管理員可以刪除所有員工的打卡記錄）已實現
  - 確認路由配置（backend/src/router/punch-records.js 中的 DELETE /api/v2/payroll/punch-records/:id 路由）
  - Purpose: 確認現有後端業務邏輯處理正確支援打卡記錄刪除
  - _Leverage: backend/src/utils/response.js, backend/src/router/punch-records.js, Cloudflare R2_
  - _Requirements: BR4.5.2（隱含需求）_
  - _Status: 已完成_

### 1.5 資料庫 Migration

- [x] 1.5.1 驗證資料庫 Migration 已實現 ✅ 已實現
  - File: backend/migrations/0004_payroll.sql
  - 驗證 PunchRecords 表結構已創建
  - 驗證必要的索引（user_id, month, status）已定義
  - 驗證外鍵約束（user_id 引用 Users 表）已定義
  - 驗證表結構符合 Data Models 定義
  - Purpose: 確認資料庫結構支援打卡記錄功能
  - _Leverage: backend/migrations/0004_payroll.sql_
  - _Requirements: BR4.5.1, BR4.5.2_
  - _Status: 已完成_

---

## 2. 前端 API 調用層

### 2.1 打卡記錄 API 調用函數

- [x] 2.1.1 驗證打卡記錄上傳和列表查詢 API 調用函數已實現 ✅ 已實現
  - File: src/api/payroll.js
  - Functions: uploadPunchRecord, loadPunchRecords
  - 驗證上傳打卡記錄功能正確
  - 驗證獲取打卡記錄列表功能正確
  - 驗證使用統一的錯誤處理和回應格式處理
  - Purpose: 確認 API 調用已封裝並提供統一的錯誤處理和數據轉換
  - _Leverage: src/api/payroll.js_
  - _Requirements: BR4.5.1, BR4.5.2_
  - _Status: 已完成_

- [x] 2.1.2 驗證打卡記錄下載和刪除 API 調用函數已實現 ✅ 已實現
  - File: src/api/payroll.js
  - 驗證 `downloadPunchRecord` 函數已實現（調用 GET /api/v2/payroll/punch-records/:id/download）
  - 驗證 `deletePunchRecord` 函數已實現（調用 DELETE /api/v2/payroll/punch-records/:id）
  - 驗證使用統一的錯誤處理和回應格式處理
  - Purpose: 確認下載和刪除功能的 API 調用已封裝
  - _Leverage: src/api/payroll.js_
  - _Requirements: BR4.5.2_
  - _Status: 已完成_

---

## 3. 前端組件實現

### 3.1 打卡記錄上傳前端頁面

- [x] 3.1.1 驗證打卡記錄上傳前端頁面已實現 ✅ 已實現
  - File: src/views/payroll/PayrollPunch.vue
  - 頁面佈局和路由已實現
  - 整合所有子組件（PunchRecordUpload, PunchRecordList, PunchRecordPreview）
  - 數據載入和錯誤處理已實現
  - 月份篩選功能已實現
  - 員工選擇功能已實現（管理員）
  - Purpose: 確認打卡記錄上傳頁面已完整實現
  - _Leverage: src/views/payroll/PayrollPunch.vue, src/components/payroll/*, src/api/payroll.js_
  - _Requirements: BR4.5.1, BR4.5.2_
  - _Status: 已完成_

### 3.2 打卡記錄上傳組件

- [x] 3.2.1 驗證打卡記錄上傳組件已實現 ✅ 已實現
  - File: src/components/payroll/PunchRecordUpload.vue
  - 檔案上傳功能已實現（支援 PDF、Excel、圖片、ZIP 等多種檔案格式）
  - 員工選擇功能已實現（管理員可以選擇任何員工，員工只能選擇自己）
  - 月份選擇功能已實現
  - 檔案大小驗證已實現（10MB 限制）
  - 上傳進度顯示已實現
  - 表單驗證已實現
  - Purpose: 確認打卡記錄上傳組件已完整實現
  - _Leverage: Ant Design Vue Upload component, src/components/payroll/PunchRecordUpload.vue_
  - _Requirements: BR4.5.1_
  - _Status: 已完成_

### 3.3 打卡記錄列表組件

- [x] 3.3.1 驗證打卡記錄列表組件已實現 ✅ 已實現
  - File: src/components/payroll/PunchRecordList.vue
  - 打卡記錄列表展示已實現（顯示檔案名稱、上傳時間、員工姓名、月份等資訊）
  - 檔案下載功能已實現（觸發 download 事件）
  - 檔案刪除功能已實現（觸發 delete 事件）
  - 檔案預覽功能已實現（觸發 preview 事件）
  - 刷新功能已實現
  - Purpose: 確認打卡記錄列表組件已完整實現
  - _Leverage: Ant Design Vue Table component, src/components/payroll/PunchRecordList.vue_
  - _Requirements: BR4.5.2_
  - _Status: 已完成_

### 3.4 打卡記錄預覽組件

- [x] 3.4.1 驗證打卡記錄預覽組件已實現 ✅ 已實現
  - File: src/components/payroll/PunchRecordPreview.vue
  - 打卡記錄預覽功能已實現
  - 檔案下載功能已實現
  - Purpose: 確認打卡記錄預覽組件已實現
  - _Leverage: src/components/payroll/PunchRecordPreview.vue_
  - _Requirements: BR4.5.2（隱含需求）_
  - _Status: 已完成_

---

## 4. 測試

### 4.1 E2E 測試

- [ ] 4.1.1 實現打卡記錄 E2E 測試
  - File: tests/e2e/payroll/payroll-punch.spec.ts
  - 測試打卡記錄上傳功能（驗證檔案格式驗證、檔案大小驗證、權限控制、上傳成功）
  - 測試打卡記錄列表查看和篩選（驗證按員工和月份篩選、權限控制）
  - 測試權限控制（員工只能查看/下載/刪除自己的打卡記錄，管理員可以查看/下載/刪除所有員工的打卡記錄）
  - 測試檔案下載功能（驗證下載成功、權限控制）
  - 測試檔案刪除功能（驗證刪除成功、權限控制）
  - 測試檔案預覽功能（驗證預覽成功）
  - 測試錯誤處理（驗證檔案格式錯誤、檔案大小超限、權限不足等情況）
  - Purpose: 確保所有打卡記錄功能從用戶角度完整運作，驗證完整的業務流程
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR4.5.1, BR4.5.2_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive E2E tests for punch record functionality including upload, view, filter, permission control, download, delete, and preview. Test both employee and admin user roles. Test file format validation, file size validation, permission control, error handling. Use Playwright framework and test data utilities from tests/e2e/utils/test-data.ts | Restrictions: Must use Playwright, must test all user acceptance criteria, must validate backend data persistence, must test error scenarios, must use test data utilities, must cover both employee and admin scenarios | Success: All E2E tests pass covering complete punch record workflow including data persistence, permission control, file operations, and error handling_

---

## 總結

### 已完成功能
- ✅ 後端 API Handler（完整實現 - 上傳、列表查詢、下載、刪除）
- ✅ 路由配置（完整實現）
- ✅ 前端 API 調用函數（基本實現 - 上傳和列表查詢）
- ✅ 打卡記錄上傳前端頁面（完整實現）
- ✅ 打卡記錄上傳組件（完整實現）
- ✅ 打卡記錄列表組件（完整實現）
- ✅ 打卡記錄預覽組件（完整實現）
- ✅ 資料庫 Migration（完整實現）

### 待完成功能
- ❌ E2E 測試（完全未實現）

### 備註
- 所有核心功能已完整實現，包括：
  - 打卡記錄上傳（支援多種檔案格式、檔案大小驗證、權限控制）
  - 打卡記錄列表查看和篩選（按員工和月份篩選、權限控制）
  - 打卡記錄下載（權限控制）
  - 打卡記錄刪除（權限控制）
  - 打卡記錄預覽
- 僅缺少 E2E 測試以確保完整流程的正確運作

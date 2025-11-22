# Tasks Document: BR16.6: 假日設定

## 三方差異分析結果

### 已實現功能
- ✅ 國定假日列表展示（後端 `handleGetHolidays`，前端 `HolidaysTable.vue`）
- ✅ 新增國定假日功能（後端 `handleCreateHoliday`，前端 `HolidayForm.vue`）
- ✅ 編輯國定假日功能（後端 `handleUpdateHoliday`，前端 `HolidayForm.vue`）
- ✅ 刪除國定假日功能（後端 `handleDeleteHoliday`，硬刪除）
- ✅ CSV 批量上傳功能（後端 `handleCreateHoliday` 支援批量，前端 `BatchUploadForm.vue`）
- ✅ CSV 範本下載功能（前端 `BatchUploadForm.vue`）
- ✅ 日期唯一性檢查（後端驗證）
- ✅ 權限控制（所有已登入用戶可訪問）

### 待實現/修正功能
- ❌ 刪除確認對話框（前端需要添加確認對話框）
- ❌ E2E 測試

---

- [x] 1. 驗證假日列表表格顯示欄位
  - File: src/components/settings/HolidaysTable.vue
  - 驗證表格顯示：日期、假日名稱、操作（編輯、刪除）
  - 驗證按日期升序排序顯示
  - Purpose: 確保假日列表表格符合需求
  - _Leverage: 現有 HolidaysTable.vue 組件_
  - _Requirements: BR16.6.1_
  - _Status: 已完成 - 表格已正確實現顯示日期、假日名稱和操作按鈕_

- [x] 2. 驗證新增國定假日功能
  - File: backend/src/handlers/holidays/holiday-crud.js, src/components/settings/HolidayForm.vue
  - 驗證表單欄位完整（日期、假日名稱）
  - 驗證表單驗證規則正確（必填欄位、日期格式、名稱長度限制）
  - 驗證日期唯一性檢查（後端驗證）
  - 驗證新增成功後列表刷新
  - Purpose: 確保新增功能符合需求
  - _Leverage: Ant Design Vue Form component_
  - _Requirements: BR16.6.2_
  - _Status: 已完成 - 新增功能已正確實現，包含日期唯一性檢查_

- [x] 3. 驗證編輯國定假日功能
  - File: backend/src/handlers/holidays/holiday-crud.js, src/components/settings/HolidayForm.vue
  - 驗證編輯表單預填充現有資料
  - 驗證編輯模式下日期為唯讀
  - 驗證表單驗證規則正確（必填欄位、名稱長度限制）
  - 驗證編輯成功後列表刷新
  - Purpose: 確保編輯功能符合需求
  - _Leverage: Ant Design Vue Form component_
  - _Requirements: BR16.6.3_
  - _Status: 已完成 - 編輯功能已正確實現，日期在編輯模式下為唯讀_

- [x] 4. 驗證刪除國定假日功能（除確認對話框外）
  - File: backend/src/handlers/holidays/holiday-crud.js
  - 驗證後端 API 執行硬刪除（`DELETE FROM Holidays`）
  - 驗證不檢查關聯資料
  - 驗證刪除成功後列表刷新
  - Purpose: 確保刪除功能符合需求（除確認對話框外）
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR16.6.4_
  - _Status: 已完成 - 刪除功能已正確實現硬刪除，但前端缺少確認對話框_

- [x] 5. 驗證 CSV 批量上傳功能
  - File: backend/src/handlers/holidays/holiday-crud.js, src/components/settings/BatchUploadForm.vue
  - 驗證 CSV 格式驗證（日期、名稱）
  - 驗證日期格式驗證（YYYY-MM-DD）和名稱長度驗證（最多 100 個字符）
  - 驗證重複日期處理（跳過已存在的假日）
  - 驗證無效數據行處理（跳過格式錯誤的行並記錄）
  - 驗證成功統計顯示（成功數量、跳過數量、失敗數量）
  - 驗證失敗詳情顯示（包含失敗行號和錯誤原因）
  - Purpose: 確保批量上傳功能符合需求
  - _Leverage: Ant Design Vue Upload component_
  - _Requirements: BR16.6.5_
  - _Status: 已完成 - CSV 批量上傳功能已正確實現，包含完整的驗證和統計_

- [x] 6. 驗證 CSV 範本下載功能
  - File: src/components/settings/BatchUploadForm.vue
  - 驗證 CSV 範本下載功能正常運作
  - 驗證 CSV 範本包含標題行（日期、名稱）和範例數據行
  - Purpose: 提供 CSV 格式範本供用戶下載
  - _Leverage: 現有 BatchUploadForm.vue 組件_
  - _Requirements: BR16.6.6_
  - _Status: 已完成 - CSV 範本下載功能已正確實現_

- [x] 7. 驗證權限控制
  - File: backend/src/router/holidays.js, src/views/settings/SettingsHolidays.vue
  - 驗證所有已登入用戶可訪問假日設定頁面
  - 驗證未登入用戶訪問時重定向到登入頁面
  - Purpose: 確保權限控制符合需求
  - _Leverage: 現有認證機制 (withAuth middleware)_
  - _Requirements: BR16.6.1_
  - _Status: 已完成 - 權限控制已正確實現，所有已登入用戶可訪問_

- [ ] 8. 新增刪除確認對話框
  - File: src/views/settings/SettingsHolidays.vue
  - 為刪除操作添加確認對話框
  - 使用 Ant Design Vue 的 Modal.confirm
  - 顯示確認訊息和要刪除的假日資訊（日期、名稱）
  - Purpose: 符合需求中刪除操作需要確認對話框的要求
  - 當前實現：`handleDeleteHoliday` 函數直接調用 API 刪除（第138行開始）
  - 需要改為：在調用 API 前顯示確認對話框
  - 實現確認對話框邏輯：
    - 使用 `Modal.confirm` 顯示確認對話框
    - 顯示要刪除的假日資訊（日期、名稱）
    - 用戶確認後才調用 API 刪除
    - 用戶取消時不執行任何操作
  - _Leverage: 現有 SettingsHolidays.vue 組件和 Ant Design Vue Modal_
  - _Requirements: BR16.6.4_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design Vue | Task: Add confirmation dialog for holiday deletion in SettingsHolidays.vue using Modal.confirm. Show confirmation message with holiday details (date and name) before deletion. Only proceed with deletion after user confirmation | Restrictions: Must use Ant Design Vue Modal.confirm component, maintain existing deletion flow, ensure user can cancel operation, show holiday date and name in confirmation message | Success: Delete operation shows confirmation dialog with holiday details, user can confirm or cancel, deletion only proceeds after confirmation_

- [ ] 9. 實現 E2E 測試
  - File: tests/e2e/settings/holiday-settings.spec.ts
  - 測試假日設定完整流程
  - Purpose: 確保所有功能正常運作，符合需求規範
  - 測試用戶新增國定假日的完整流程（包括成功和失敗情況，日期唯一性驗證）
  - 測試用戶編輯國定假日的完整流程（包括成功和失敗情況，日期唯讀驗證）
  - 測試用戶刪除國定假日的完整流程（硬刪除，包括確認和取消操作）
  - 測試用戶批量上傳國定假日的完整流程（包括成功、跳過、失敗統計）
  - 測試 CSV 範本下載功能
  - 測試權限控制（所有已登入用戶可訪問，未登入用戶無法訪問）
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR16.6.1, BR16.6.2, BR16.6.3, BR16.6.4, BR16.6.5, BR16.6.6_
  - _Prompt: Role: QA Automation Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive end-to-end tests for holiday settings: add holiday, edit holiday, delete holiday (hard delete with confirmation), batch upload (with success/skip/fail statistics), CSV template download, permission control. Use Playwright framework and test data utilities | Restrictions: Must test real user workflows, ensure tests are maintainable and reliable, test all validation rules and error handling, verify hard delete behavior, verify confirmation dialog, verify batch upload statistics | Success: All E2E tests pass, all workflows work correctly, error handling is verified, hard delete works, confirmation dialog works, batch upload statistics are accurate, permission control works as expected_

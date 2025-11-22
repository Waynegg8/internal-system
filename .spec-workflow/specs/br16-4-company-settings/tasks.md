# Tasks Document: BR16.4: 公司設定

## 三方差異分析結果

### 已實現功能
- ✅ 公司資料切換功能（公司資料 1 和公司資料 2 切換）
- ✅ 公司資料表單欄位（所有必要欄位：公司中文名稱、公司英文名稱、統一編號、地址（兩行）、聯絡電話、銀行資訊）
- ✅ 表單驗證規則（必填欄位、長度限制、即時反饋）
- ✅ 後端 API 端點（GET 和 PUT `/api/v2/settings/company/:setNumber`）
- ✅ API 調用層（`getCompanySettings` 和 `saveCompanySettings`）
- ✅ 狀態管理（Pinia store 中的公司資料狀態管理）
- ✅ 使用正確的設定項前綴（`company1_` 或 `company2_`）

### 待實現/修正功能
- ❌ 未保存變更提示功能（切換公司資料時檢查是否有未保存變更）
- ❌ E2E 測試

---

- [x] 1. 驗證公司資料切換功能
  - File: src/views/settings/SettingsCompany.vue
  - 驗證公司資料 1 和公司資料 2 切換功能正常
  - 驗證切換時正確載入對應的公司資料
  - 驗證切換時表單驗證狀態保持
  - Purpose: 確認公司資料切換功能正常運作
  - _Leverage: 現有 SettingsCompany.vue 組件_
  - _Requirements: BR16.4.1_
  - _Status: 已完成 - 切換和載入功能正常，但缺少未保存變更提示_

- [x] 2. 驗證公司資料表單欄位
  - File: src/components/settings/CompanyInfoForm.vue
  - 驗證表單包含所有必要欄位：公司中文名稱、公司英文名稱、統一編號、地址（兩行）、聯絡電話、銀行資訊（名稱、代號、帳號）
  - 驗證表單驗證規則正確（必填欄位、長度限制）
  - 驗證表單驗證即時反饋
  - Purpose: 確認公司資料表單符合需求
  - _Leverage: 現有 CompanyInfoForm.vue 組件_
  - _Requirements: BR16.4.2_
  - _Status: 已完成 - 所有欄位和驗證規則已正確實現_

- [x] 3. 驗證後端 API 端點
  - File: backend/src/handlers/settings/company-settings.js
  - 驗證 GET /api/v2/settings/company/:setNumber 端點正確載入公司資料
  - 驗證 PUT /api/v2/settings/company/:setNumber 端點正確保存公司資料
  - 驗證使用正確的設定項前綴（company1_ 或 company2_）
  - Purpose: 確認後端 API 符合需求
  - _Leverage: 現有 company-settings.js handler_
  - _Requirements: BR16.4.3_
  - _Status: 已完成 - API 端點已正確實現，使用正確的設定項前綴_

- [x] 4. 驗證 API 調用層
  - File: src/api/settings.js
  - 驗證 getCompanySettings 函數正確調用 GET API
  - 驗證 saveCompanySettings 函數正確調用 PUT API
  - 驗證錯誤處理正確
  - Purpose: 確認 API 調用層符合需求
  - _Leverage: 現有 settings.js API 文件_
  - _Requirements: BR16.4.3_
  - _Status: 已完成 - API 調用函數已正確實現，包含錯誤處理_

- [x] 5. 驗證狀態管理
  - File: src/stores/settings.js
  - 驗證公司資料狀態管理正確
  - 驗證切換公司資料時狀態更新正確
  - 驗證保存後狀態同步正確
  - Purpose: 確認狀態管理符合需求
  - _Leverage: 現有 settings.js store_
  - _Requirements: BR16.4.1, BR16.4.3_
  - _Status: 已完成 - 狀態管理已正確實現，狀態更新和同步正確_

- [ ] 6. 補完未保存變更提示功能
  - File: src/views/settings/SettingsCompany.vue
  - 在切換公司資料時檢查表單是否有未保存變更
  - 實現確認對話框提示用戶是否保存變更
  - 根據用戶選擇執行保存、放棄或取消操作
  - Purpose: 補完公司資料切換的完整功能
  - 實現未保存變更檢測邏輯（比較當前表單數據與原始載入的數據）
  - 在 `handleSetNumberChange` 中檢查是否有未保存變更
  - 如果有未保存變更，顯示確認對話框（使用 Ant Design Modal.confirm）
  - 確認對話框選項：保存並切換、放棄並切換、取消
  - 如果選擇保存並切換，先保存當前數據，然後切換並載入新數據
  - 如果選擇放棄並切換，直接切換並載入新數據
  - 如果選擇取消，不執行任何操作
  - _Leverage: 現有 SettingsCompany.vue 組件, Ant Design Modal.confirm_
  - _Requirements: BR16.4.1 驗收標準 4_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and Ant Design | Task: Add unsaved changes detection and confirmation dialog when switching company data in SettingsCompany.vue. Compare current form data with original loaded data to detect changes. Show confirmation dialog with options: save and switch, discard and switch, cancel. Implement save before switch logic | Restrictions: Use Ant Design Modal.confirm component, follow existing patterns, must handle async save operation | Success: Unsaved changes are detected correctly, confirmation dialog works with all three options, save before switch works correctly_

- [ ] 7. 實現 E2E 測試
  - File: tests/e2e/settings/company-settings.spec.ts
  - 測試公司設定完整流程
  - Purpose: 確保所有功能正常運作，符合需求規範
  - 測試用戶編輯公司資料 1 的完整流程（打開頁面 → 選擇公司資料 1 → 編輯欄位 → 保存 → 驗證保存結果）
  - 測試用戶編輯公司資料 2 的完整流程（打開頁面 → 選擇公司資料 2 → 編輯欄位 → 保存 → 驗證保存結果）
  - 測試用戶切換公司資料的完整流程（編輯公司資料 1 → 切換到公司資料 2 → 驗證資料正確載入 → 編輯並保存 → 切換回公司資料 1 → 驗證資料未丟失）
  - 測試未保存變更提示功能（編輯公司資料 1 → 切換到公司資料 2 → 驗證確認對話框顯示 → 選擇保存並切換 → 驗證保存成功並切換成功）
  - 測試表單驗證（測試必填欄位驗證、長度限制驗證）
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR16.4.1, BR16.4.2, BR16.4.3_
  - _Prompt: Role: QA Automation Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive end-to-end tests for company settings: edit company data 1, edit company data 2, switch between company data, unsaved changes warning, form validation. Use Playwright framework and test data utilities | Restrictions: Must test real user workflows, ensure tests are maintainable and reliable, test all validation rules and error handling | Success: All E2E tests pass, all workflows work correctly, unsaved changes warning works, form validation works as expected_

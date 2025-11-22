# Tasks Document: BR16.3: 使用者管理

## 三方差異分析結果

### 已實現功能
- ✅ 使用者列表展示（後端 `handleGetUsers`，前端 `UsersTable.vue`）
- ✅ 新增使用者功能（後端 `handleCreateUser`，前端 `UserForm.vue`）
- ✅ 編輯使用者功能（後端 `handleUpdateUser`，前端 `UserForm.vue`）
- ✅ 查看使用者密碼功能（後端 `handleGetUserPassword`，前端 `UsersTable.vue`）
- ✅ 重置使用者密碼功能（後端 `handleResetUserPassword`，前端 `UsersTable.vue`）
- ✅ 員工個人資料編輯功能（`EmployeeProfile.vue`，但需要移除電子郵件欄位）
- ✅ 權限控制（管理員/員工界面區分）

### 待實現/修正功能
- ❌ 修正後端使用者刪除 API 為硬刪除（目前是軟刪除）
- ❌ 移除員工個人資料中的電子郵件欄位（`EmployeeProfile.vue`）
- ❌ 移除 SettingsUsers.vue 中與電子郵件相關的邏輯
- ❌ E2E 測試

---

- [ ] 1. 修正後端使用者刪除 API 為硬刪除
  - File: backend/src/handlers/settings/user-management.js
  - Function: handleDeleteUser
  - 將軟刪除改為硬刪除（DELETE FROM Users）
  - 移除關聯資料檢查邏輯
  - Purpose: 實現使用者的硬刪除功能
  - 當前實現：使用 `UPDATE Users SET is_deleted = 1`（軟刪除）
  - 需要改為：使用 `DELETE FROM Users WHERE user_id = ?`（硬刪除）
  - 保留管理員帳號保護邏輯（user_id = 1 不能刪除）
  - 保留使用者存在性檢查
  - 移除 `is_deleted = 0` 的檢查（因為硬刪除不需要檢查軟刪除狀態）
  - _Leverage: backend/src/utils/response.js_
  - _Requirements: BR16.3.4_
  - _Prompt: Role: Backend Developer with expertise in Cloudflare Workers and D1 database | Task: Modify the DELETE handler in user-management.js to perform hard delete instead of soft delete. Change from UPDATE is_deleted = 1 to DELETE FROM Users. Remove is_deleted = 0 check from existence check. Keep admin account protection (user_id = 1) and user existence check | Restrictions: Must use parameterized queries, must handle errors properly, must follow existing response format | Success: User deletion performs hard delete correctly, no soft delete logic, admin protection works, response format is correct_

- [ ] 2. 移除員工個人資料中的電子郵件欄位
  - File: src/components/settings/EmployeeProfile.vue
  - 移除電子郵件表單欄位（第46-53行）
  - 移除電子郵件相關的表單驗證規則（第97-104行）
  - 移除電子郵件相關的表單數據（第77行的 `email: ''`）
  - 移除電子郵件相關的 watch 邏輯（第114行的 `formData.email = newUser.email || ''`）
  - 移除重置表單中的電子郵件重置邏輯（第135行的 `formData.email = ''`）
  - Purpose: 移除員工個人資料中的電子郵件欄位
  - _Leverage: Ant Design Vue Form component_
  - _Requirements: BR16.3.7_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 and form validation | Task: Remove email field from EmployeeProfile.vue component. Remove email from form data (line 77), remove email form item (lines 46-53), remove email validation rules (lines 97-104), remove email from watch logic (line 114), remove email from resetForm (line 135). Keep only hire_date and gender fields | Restrictions: Must maintain existing functionality for other fields, must follow Ant Design Vue form patterns | Success: Email field is completely removed, form works correctly with only hire_date and gender fields_

- [ ] 3. 移除 SettingsUsers.vue 中與電子郵件相關的邏輯
  - File: src/views/settings/SettingsUsers.vue
  - 移除 myProfile 中的 email 欄位（如果存在）
  - 移除 handleProfileDataChange 中與 email 相關的邏輯（如果存在）
  - 移除 loadData 中與 email 相關的邏輯（第133行的 `myProfile.email = currentUser.value.email || ''`）
  - Purpose: 移除頁面中與電子郵件相關的邏輯
  - _Leverage: 現有 SettingsUsers.vue 組件_
  - _Requirements: BR16.3.7_
  - _Prompt: Role: Frontend Developer with expertise in Vue 3 | Task: Remove email-related logic from SettingsUsers.vue. Remove email from myProfile reactive object (if exists), remove email handling from handleProfileDataChange (if exists), remove email from loadData method (line 133: myProfile.email = currentUser.value.email || '') | Restrictions: Must maintain existing functionality for other fields | Success: All email-related logic is removed, component works correctly without email field_

- [x] 4. 驗證使用者列表展示功能
  - File: backend/src/handlers/settings/user-management.js, src/components/settings/UsersTable.vue
  - 驗證後端 API 返回所有使用者資訊（ID、姓名、帳號、角色等）
  - 驗證前端表格正確顯示使用者資訊
  - 驗證操作按鈕顯示正確（編輯、查看密碼、重置密碼、刪除）
  - Purpose: 確認使用者列表展示功能正常運作
  - _Leverage: Ant Design Vue Table component_
  - _Requirements: BR16.3.1_
  - _Status: 已完成 - 使用者列表展示功能已正確實現_

- [x] 5. 驗證新增使用者功能
  - File: backend/src/handlers/settings/user-management.js, src/components/settings/UserForm.vue
  - 驗證表單欄位完整（姓名、帳號、密碼、性別、到職日、角色）
  - 驗證表單驗證規則正確（必填欄位、密碼長度、帳號唯一性）
  - 驗證後端同時保存 `password`（加密）和 `plain_password`（明文）
  - 驗證新增成功後列表刷新
  - Purpose: 確認新增使用者功能正常運作
  - _Leverage: Ant Design Vue Form component, hashPasswordPBKDF2_
  - _Requirements: BR16.3.2_
  - _Status: 已完成 - 新增使用者功能已正確實現，包含密碼加密和明文存儲_

- [x] 6. 驗證編輯使用者功能
  - File: backend/src/handlers/settings/user-management.js, src/components/settings/UserForm.vue
  - 驗證編輯表單預填充現有資料
  - 驗證編輯表單不顯示密碼欄位
  - 驗證表單驗證規則正確（必填欄位、帳號唯一性排除當前使用者）
  - 驗證編輯成功後列表刷新
  - Purpose: 確認編輯使用者功能正常運作
  - _Leverage: Ant Design Vue Form component_
  - _Requirements: BR16.3.3_
  - _Status: 已完成 - 編輯使用者功能已正確實現，不包含密碼欄位_

- [x] 7. 驗證查看使用者密碼功能
  - File: backend/src/handlers/user-profile/profile-crud.js, src/components/settings/UsersTable.vue
  - 驗證後端 API 返回明文密碼（從 `plain_password` 欄位讀取）
  - 驗證前端彈窗正確顯示密碼
  - 驗證無密碼記錄時顯示提示訊息
  - 驗證僅管理員可訪問
  - Purpose: 確認查看使用者密碼功能正常運作
  - _Leverage: Ant Design Vue Modal component_
  - _Requirements: BR16.3.5_
  - _Status: 已完成 - 查看使用者密碼功能已正確實現，包含權限檢查和無密碼記錄處理_

- [x] 8. 驗證重置使用者密碼功能
  - File: backend/src/handlers/user-profile/profile-crud.js, src/components/settings/UsersTable.vue
  - 驗證重置密碼表單要求輸入新密碼（至少 6 個字符）
  - 驗證後端同時更新 `password`（加密）和 `plain_password`（明文）
  - 驗證重置成功後顯示成功提示
  - 驗證僅管理員可訪問
  - Purpose: 確認重置使用者密碼功能正常運作
  - _Leverage: Ant Design Vue Modal component, hashPasswordPBKDF2_
  - _Requirements: BR16.3.6_
  - _Status: 已完成 - 重置使用者密碼功能已正確實現，包含密碼加密和明文存儲_

- [x] 9. 驗證員工個人資料編輯功能（除電子郵件欄位外）
  - File: src/components/settings/EmployeeProfile.vue, src/views/settings/SettingsUsers.vue
  - 驗證員工視圖顯示個人資料編輯界面（而非使用者列表）
  - 驗證表單欄位正確（到職日、性別）
  - 驗證姓名和帳號為唯讀
  - 驗證表單預填充現有資料
  - 驗證表單驗證規則正確（到職日必填）
  - 驗證更新成功後顯示成功提示
  - Purpose: 確認員工個人資料編輯功能正常運作（除電子郵件欄位外）
  - _Leverage: Ant Design Vue Form component_
  - _Requirements: BR16.3.7_
  - _Status: 已完成 - 員工個人資料編輯功能已正確實現，但需要移除電子郵件欄位_

- [ ] 10. 實現 E2E 測試
  - File: tests/e2e/settings/user-management.spec.ts
  - 測試使用者管理完整流程
  - Purpose: 確保所有功能正常運作，符合需求規範
  - 測試管理員新增使用者的完整流程（包括成功和失敗情況）
  - 測試管理員編輯使用者的完整流程（包括成功和失敗情況）
  - 測試管理員刪除使用者的完整流程（硬刪除，包括確認和取消操作）
  - 測試管理員查看使用者密碼的完整流程
  - 測試管理員重置使用者密碼的完整流程（包括成功和失敗情況）
  - 測試員工編輯個人資料的完整流程（確認無電子郵件欄位）
  - 測試權限控制（員工無法訪問使用者列表，員工只能編輯自己的資料）
  - _Leverage: Playwright, tests/e2e/utils/test-data.ts_
  - _Requirements: BR16.3.1, BR16.3.2, BR16.3.3, BR16.3.4, BR16.3.5, BR16.3.6, BR16.3.7_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create comprehensive end-to-end tests for user management: add user, edit user, delete user (hard delete), view password, reset password, employee profile edit (without email field), permission control. Use Playwright framework and test data utilities | Restrictions: Must test real user workflows, ensure tests are maintainable and reliable, test all validation rules and error handling, verify hard delete behavior, verify permission control | Success: All E2E tests pass, all workflows work correctly, error handling is verified, hard delete works, permission control works as expected_

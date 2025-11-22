# Tasks Document: BR6.4: 工時管理功能

## 三方差異分析結果

### 已實現功能

1. **員工篩選功能** ✅ 已實現
   - `Timesheets.vue` - 員工篩選下拉框已實現（第47-65行）
   - 權限檢查正確（僅管理員可見，使用 `store.isAdmin`）
   - 員工列表正確載入和顯示（從 `store.users` 獲取）
   - 選擇變更事件正確觸發數據重新載入（`handleUserIdChange` 方法）

2. **管理員預設行為** ✅ 已實現
   - `timesheets.js` store - `loadAllData` 方法中已實現預設選擇邏輯
   - 管理員進入頁面時自動選擇第一個員工
   - 預設選擇正確觸發數據載入

3. **權限控制機制** ✅ 已實現
   - `timesheet-crud.js` - `handleGetTimesheets` 中已實現完整的權限控制邏輯（第22-29行）
   - 非管理員只能查看自己的工時記錄
   - 管理員可以通過 `user_id` 參數查看任意員工記錄

### 未實現或部分實現功能

1. **獨立組件重構** ⚠️ 需要重構
   - 需求：將員工篩選邏輯重構為獨立的 `EmployeeFilter.vue` 組件
   - 現狀：員工篩選邏輯直接寫在 `Timesheets.vue` 中（第47-65行），未獨立為組件

2. **錯誤處理和用戶反饋** ⚠️ 需要增強
   - 需求：實現員工列表載入失敗的錯誤處理、載入狀態指示、重試機制
   - 現狀：需要確認是否已實現完整的錯誤處理

3. **單元測試** ❌ 完全未實現

4. **整合測試** ❌ 完全未實現

---

## 1. 員工篩選功能

### 1.1 員工篩選功能實現

- [x] 1.1.1 驗證員工篩選功能已實現 ✅ 已實現
  - File: src/views/Timesheets.vue
  - 驗證員工篩選下拉框已實現並正常工作（第47-65行）
  - 驗證權限檢查正確（僅管理員可見，使用 `store.isAdmin`）
  - 驗證員工列表正確載入和顯示（從 `store.users` 獲取）
  - 驗證選擇變更事件正確觸發數據重新載入（`handleUserIdChange` 方法）
  - Purpose: 驗證員工篩選功能的完整實現
  - _Leverage: src/stores/timesheets.js (現有的 users、selectedUserId、isAdmin 狀態), Ant Design Vue Select 組件_
  - _Requirements: BR6.4.1_
  - _Status: 已完成_

### 1.2 管理員預設行為

- [x] 1.2.1 驗證管理員預設行為已實現 ✅ 已實現
  - File: src/stores/timesheets.js
  - 驗證管理員進入頁面時自動選擇第一個員工（在 `loadAllData` 方法中）
  - 驗證預設選擇正確觸發數據載入
  - 驗證非管理員不受影響
  - Purpose: 驗證管理員預設選擇第一個員工的邏輯
  - _Leverage: loadAllData 方法中的預設員工選擇邏輯_
  - _Requirements: BR6.4.2_
  - _Status: 已完成_

### 1.3 權限控制機制

- [x] 1.3.1 驗證權限控制機制已實現 ✅ 已實現
  - File: backend/src/handlers/timesheets/timesheet-crud.js
  - 驗證非管理員只能查看自己的工時記錄（第22-24行）
  - 驗證管理員可以通過 `user_id` 參數查看任意員工記錄（第25-29行）
  - 驗證後端權限檢查在 `handleGetTimesheets` 中正確實現
  - Purpose: 驗證後端權限控制的完整性
  - _Leverage: 現有的權限控制邏輯（第22-29行）_
  - _Requirements: BR6.4.3_
  - _Status: 已完成_

---

## 2. 組件重構

### 2.1 重構員工篩選為獨立組件

- [ ] 2.1.1 重構員工篩選為獨立組件
  - File: src/components/timesheets/EmployeeFilter.vue (新建)
  - 從 `Timesheets.vue` 中提取員工篩選邏輯到獨立組件
  - 創建可重用的 `EmployeeFilter` 組件，使用 Ant Design Vue Select
  - 實現權限檢查，僅管理員可見（使用 `store.isAdmin`）
  - 從 `store.users` 獲取員工列表，綁定 `store.selectedUserId`
  - 實現選擇變更事件，調用 `store.setSelectedUserId`
  - Purpose: 按照設計文檔將員工篩選重構為獨立組件
  - _Leverage: src/stores/timesheets.js (現有的狀態和方法), Ant Design Vue Select 組件_
  - _Requirements: BR6.4.1, 設計文檔的組件化要求_
  - _Prompt: Role: Vue 3 前端開發工程師，專精於組件設計和 Composition API | Task: 從 Timesheets.vue 中提取員工篩選邏輯，創建獨立的 EmployeeFilter.vue 組件，使用 Ant Design Vue Select，實現權限檢查（僅管理員可見）、員工列表顯示、選擇事件處理 | Restrictions: 必須遵循 Vue 3 Composition API 模式，組件應可重用，保持現有功能不變 | Success: 組件正確渲染，權限檢查正常，員工列表正確顯示，選擇變更事件正確更新 store_

### 2.2 更新 Timesheets 視圖使用獨立組件

- [ ] 2.2.1 更新 Timesheets 視圖使用獨立組件
  - File: src/views/Timesheets.vue
  - 替換現有的內聯員工篩選為 `EmployeeFilter` 組件
  - 移除重複的員工篩選邏輯（第47-65行）
  - 確保組件整合後功能保持不變
  - Purpose: 使用新的獨立組件替換現有實現
  - _Leverage: src/components/timesheets/EmployeeFilter.vue_
  - _Requirements: BR6.4.1_
  - _Prompt: Role: Vue 3 全端開發工程師，專精於組件重構和向後兼容 | Task: 在 Timesheets.vue 中替換內聯員工篩選邏輯為 EmployeeFilter 組件，移除重複代碼，確保功能保持不變 | Restrictions: 不破壞現有功能，保持向後兼容 | Success: EmployeeFilter 組件正確整合，功能正常，代碼更清晰_

---

## 3. 錯誤處理和用戶反饋

### 3.1 增強錯誤處理和用戶反饋

- [ ] 3.1.1 增強錯誤處理和用戶反饋
  - Files: src/components/timesheets/EmployeeFilter.vue, src/stores/timesheets.js
  - 在 `EmployeeFilter` 組件中實現員工列表載入失敗的錯誤處理
  - 添加載入狀態指示（loading 狀態）
  - 實現重試機制
  - 增強 store 中的錯誤處理，提供更詳細的錯誤信息
  - Purpose: 提供更好的用戶體驗和錯誤處理
  - _Leverage: Ant Design Vue 組件, 現有的錯誤處理機制_
  - _Requirements: 非功能性需求 (可靠性, 可用性)_
  - _Prompt: Role: UX 工程師，專精於錯誤處理和用戶體驗設計 | Task: 在 EmployeeFilter 組件中添加員工列表載入失敗的處理、載入狀態指示和重試機制，增強 store 的錯誤處理 | Restrictions: 錯誤訊息要用戶友好，提供重試選項，不顯示技術細節 | Success: 所有錯誤場景都有適當處理，用戶看到清晰的錯誤提示，載入狀態正確顯示，重試機制正常工作_

---

## 4. 測試

### 4.1 單元測試

- [ ] 4.1.1 編寫單元測試
  - Files: tests/components/timesheets/EmployeeFilter.test.js, tests/stores/timesheets.test.js
  - 測試 `EmployeeFilter` 組件的渲染和交互
  - 測試 store 的員工選擇邏輯和權限檢查
  - 測試錯誤處理場景
  - Purpose: 確保代碼質量和功能正確性
  - _Leverage: Vitest, Vue Test Utils, 現有測試工具_
  - _Requirements: 所有功能需求_
  - _Prompt: Role: QA 工程師，專精於單元測試和測試自動化 | Task: 為 EmployeeFilter 組件和 timesheets store 編寫全面的單元測試，覆蓋正常流程、錯誤場景、權限檢查等 | Restrictions: 測試要獨立運行，使用 mock 隔離外部依賴 | Success: 測試覆蓋率達標，所有關鍵邏輯都有測試_

### 4.2 整合測試

- [ ] 4.2.1 編寫整合測試
  - File: tests/integration/timesheet-employee-filter.test.js
  - 測試員工篩選與工時記錄載入的整合
  - 測試管理員和非管理員的完整流程
  - 測試錯誤處理場景
  - Purpose: 確保各組件正確協同工作
  - _Leverage: Playwright 或類似 E2E 測試框架_
  - _Requirements: 所有功能需求_
  - _Prompt: Role: 整合測試工程師，專精於端到端測試 | Task: 編寫整合測試，驗證員工篩選功能的完整流程，包括管理員選擇員工、非管理員權限控制等 | Restrictions: 測試要模擬真實用戶操作，穩定可靠 | Success: 所有關鍵用戶流程都有測試覆蓋，能夠發現整合問題_

---

## 總結

### 已完成功能
- ✅ 員工篩選功能（完整實現 - 下拉框、權限檢查、員工列表、選擇事件）
- ✅ 管理員預設行為（完整實現 - 自動選擇第一個員工）
- ✅ 權限控制機制（完整實現 - 後端權限驗證）

### 待完成功能
- ⚠️ 獨立組件重構（需要重構 - 將員工篩選邏輯提取為獨立組件）
- ⚠️ 錯誤處理和用戶反饋（需要增強 - 載入狀態、錯誤處理、重試機制）
- ❌ 單元測試（完全未實現）
- ❌ 整合測試（完全未實現）

### 備註
- 所有核心功能已完整實現，包括：
  - 員工篩選下拉框（僅管理員可見）
  - 管理員預設選擇第一個員工
  - 後端權限控制（非管理員只能查看自己的記錄）
- 需要改進的功能：
  - 獨立組件重構：將員工篩選邏輯從 `Timesheets.vue` 提取為獨立的 `EmployeeFilter.vue` 組件，提高代碼可重用性和維護性
  - 錯誤處理和用戶反饋：增強載入狀態指示、錯誤處理和重試機制，提供更好的用戶體驗

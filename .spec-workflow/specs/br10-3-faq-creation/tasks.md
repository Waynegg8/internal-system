# Tasks Document: BR10.3: FAQ 建立

## 三方差異分析結果

### 已實現功能

1. **FAQ 建立 API Handler** ✅ 已實現
   - `handleCreateFAQ` - 完整實現 FAQ 建立邏輯
   - 必填欄位驗證（問題、答案、適用層級）
   - 自動記錄建立者（當前登入使用者的 user_id）
   - 自動記錄建立時間和更新時間
   - 設置 `is_deleted = 0`
   - 清除快取

2. **前端 API 調用函數** ✅ 已實現
   - `src/api/knowledge.js` - `createFAQ` 函數已實現
   - 使用統一的錯誤處理和回應格式處理

3. **FAQ 編輯抽屜組件（建立模式）** ✅ 已實現
   - `src/components/knowledge/FAQEditDrawer.vue` - 完整實現 FAQ 建立表單
   - 所有表單欄位（問題、服務類型分類、適用層級、客戶、標籤、回答）
   - 必填欄位驗證（問題、服務類型分類、適用層級、回答）
   - 問題長度限制（最大 200 字符）
   - 回答驗證（不能為空或只包含空白字符或空 HTML 標籤）
   - 支援建立和編輯模式

4. **知識庫 Store** ✅ 已實現
   - `src/stores/knowledge.js` - `createFAQ` 方法已實現
   - 正確處理 API 回應
   - 建立成功後更新列表

### 未實現或部分實現功能

1. **E2E 測試** ✅ 已實現
   - `tests/e2e/knowledge/faq-creation.spec.ts` - 已實現，包含 11 個測試用例，全部通過
   - 修復了 FAQNew.vue 中服務類型數據字段映射問題，使用 getServiceId 和 getServiceName 輔助函數

2. **標籤系統自動提取** ✅ 已實現
   - `src/stores/knowledge.js` - `fetchTags` 方法已更新為 async
   - 自動從 FAQ 記錄中提取標籤（支持分頁獲取，最多 5 頁）
   - 合併 localStorage 備份標籤
   - 優雅處理 API 錯誤，失敗時從 localStorage 載入
   - 自動更新 localStorage 作為備份

---

## 1. 後端 API 實現

### 1.1 FAQ 建立 API Handler

- [x] 1.1.1 驗證 FAQ 建立 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/knowledge/faq.js
  - Function: handleCreateFAQ
  - 驗證必填欄位驗證（問題、答案、適用層級）
  - 驗證自動記錄建立者（當前登入使用者的 user_id）
  - 驗證自動記錄建立時間和更新時間
  - 驗證設置 `is_deleted = 0`
  - 驗證清除快取
  - 驗證路由配置正確
  - _Requirements: BR10.3.1, BR10.3.2, BR10.3.3, BR10.3.4, BR10.3.5_
  - _Status: 已完成_

---

## 2. 前端組件實現

### 2.1 前端 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/knowledge.js
  - 驗證 `createFAQ` 函數已實現
  - 驗證使用統一的錯誤處理和回應格式處理
  - _Requirements: BR10.3.3_
  - _Status: 已完成_

### 2.2 FAQ 編輯抽屜組件（建立模式）

- [x] 2.2.1 驗證 FAQ 編輯抽屜組件已實現 ✅ 已實現
  - File: src/components/knowledge/FAQEditDrawer.vue
  - 驗證所有表單欄位（問題、服務類型分類、適用層級、客戶、標籤、回答）
  - 驗證必填欄位驗證（問題、服務類型分類、適用層級、回答）
  - 驗證問題長度限制（最大 200 字符，第42行、第195行）
  - 驗證回答驗證（不能為空或只包含空白字符或空 HTML 標籤，第206-213行）
  - 驗證支援建立和編輯模式
  - _Requirements: BR10.3.1, BR10.3.2, BR10.3.3, BR10.3.5_
  - _Status: 已完成_

### 2.3 知識庫 Store

- [x] 2.3.1 驗證知識庫 Store 已實現 ✅ 已實現
  - File: src/stores/knowledge.js
  - 驗證 `createFAQ` 方法已實現
  - 驗證正確處理 API 回應
  - 驗證建立成功後更新列表
  - _Requirements: BR10.3.3, BR10.3.4_
  - _Status: 已完成_

---

## 3. 測試

### 3.1 E2E 測試

- [x] 3.1.1 實現 E2E 測試 ✅ 已實現
  - File: tests/e2e/knowledge/faq-creation.spec.ts
  - 測試 FAQ 建立表單
  - 測試必填欄位驗證
  - 測試表單提交
  - 測試建立後立即可見
  - _Requirements: All BR10.3 requirements_
  - _Status: 待實現_

---

## 4. 標籤系統

### 4.1 標籤系統自動提取

- [x] 4.1.1 實現標籤系統自動提取 ✅ 已實現
  - 實現從現有 FAQ 記錄中提取標籤的邏輯
  - 更新知識庫 Store 的 `fetchTags` 方法，自動從 FAQ 中提取標籤
  - 確保 FAQ 建立時標籤功能正常工作
  - _Requirements: BR10.3.1, BR10.3.5_
  - _Status: 已完成 - 實現了從 FAQ 記錄中自動提取標籤，支持分頁獲取，合併 localStorage 備份，優雅處理 API 錯誤_

---

## 總結

### 已完成功能
- ✅ FAQ 建立 API Handler（完整實現 - 必填欄位驗證、自動記錄建立者、建立時間和更新時間、設置 is_deleted = 0、清除快取）
- ✅ 前端 API 調用函數（完整實現 - createFAQ 函數、統一錯誤處理）
- ✅ FAQ 編輯抽屜組件（完整實現 - 所有表單欄位、必填欄位驗證、問題長度限制、回答驗證、支援建立和編輯模式）
- ✅ 知識庫 Store（完整實現 - createFAQ 方法、正確處理 API 回應、建立成功後更新列表）

### 待完成功能
- ✅ E2E 測試（已實現 - `tests/e2e/knowledge/faq-creation.spec.ts`，11 個測試用例全部通過）
- ✅ 標籤系統自動提取（已實現 - 從 FAQ 記錄中自動提取標籤，支持分頁獲取和 localStorage 備份）

### 備註
- 所有核心功能已完整實現，包括：
  - 後端 API：FAQ 建立（必填欄位驗證、自動記錄建立者、建立時間和更新時間）
  - 前端組件：建立表單（所有欄位、必填欄位驗證、問題長度限制、回答驗證）
  - 狀態管理：Store 管理建立狀態和列表更新
- 已完成功能：
  - E2E 測試：已建立完整的測試套件，11 個測試用例全部通過
  - 標籤系統自動提取：已實現從 FAQ 自動提取標籤的功能，支持分頁獲取、localStorage 備份和錯誤處理

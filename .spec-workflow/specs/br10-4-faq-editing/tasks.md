# Tasks Document: BR10.4: FAQ 編輯與刪除

## 三方差異分析結果

### 已實現功能

1. **FAQ 更新 API Handler** ✅ 已實現
   - `handleUpdateFAQ` - 完整實現 FAQ 更新邏輯
   - 權限檢查（只有建立者或管理員可以更新，第234行）
   - FAQ 不存在檢查（返回 404，第229-231行）
   - 必填欄位驗證（更新時必須保持必填欄位不為空）
   - 自動更新 `updated_at`（第267-268行）
   - 清除快取

2. **FAQ 刪除 API Handler** ✅ 已實現
   - `handleDeleteFAQ` - 完整實現 FAQ 刪除邏輯
   - 權限檢查（只有建立者或管理員可以刪除，第298行）
   - FAQ 不存在檢查（返回 404，第293-295行）
   - 軟刪除（設置 `is_deleted = 1`，第304行）
   - 自動更新 `updated_at`（第304行）
   - 清除快取

3. **前端 API 調用函數** ✅ 已實現
   - `src/api/knowledge.js` - `updateFAQ` 和 `deleteFAQ` 函數已實現
   - 使用統一的錯誤處理和回應格式處理

4. **FAQ 編輯抽屜組件（編輯模式）** ✅ 已實現
   - `src/components/knowledge/FAQEditDrawer.vue` - 完整實現 FAQ 編輯表單
   - 編輯模式預填現有 FAQ 資訊（第245-268行）
   - 必填欄位驗證（問題、服務類型分類、適用層級、回答）
   - 支援建立和編輯模式

5. **編輯和刪除按鈕** ✅ 已實現
   - `src/views/knowledge/KnowledgeFAQ.vue` - 編輯和刪除按鈕已實現（第118-121行）
   - `handleEditFAQ` 函數已實現（第342行）
   - `handleDeleteFAQ` 函數已實現（第348行）

6. **知識庫 Store** ✅ 已實現
   - `src/stores/knowledge.js` - `updateFAQ` 和 `deleteFAQ` 方法已實現
   - 正確處理 API 回應
   - 更新成功後更新列表和當前 FAQ
   - 刪除成功後更新列表

### 未實現或部分實現功能

1. **編輯和刪除按鈕權限控制** ⚠️ 部分實現
   - 編輯和刪除按鈕已實現，但缺少前端權限檢查（僅建立者或管理員可見）
   - 後端權限檢查已實現

2. **刪除確認對話框** ⚠️ 部分實現
   - `handleDeleteFAQ` 函數已實現，但需要確認是否包含確認對話框

3. **後端更新 API 的 scope 欄位處理** ⚠️ 部分實現
   - `handleUpdateFAQ` 函數中缺少 `scope` 欄位的更新邏輯（第238-265行只處理了 question, answer, category, tags, client_id）

4. **E2E 測試** ❌ 未實現
   - `tests/e2e/knowledge/faq-editing.spec.ts` - 未找到

---

## 1. 後端 API 實現

### 1.1 FAQ 更新 API Handler

- [x] 1.1.1 驗證 FAQ 更新 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/knowledge/faq.js
  - Function: handleUpdateFAQ
  - 驗證權限檢查（只有建立者或管理員可以更新，第234行）
  - 驗證 FAQ 不存在檢查（返回 404，第229-231行）
  - 驗證必填欄位驗證（更新時必須保持必填欄位不為空）
  - 驗證自動更新 `updated_at`（第267-268行）
  - 驗證清除快取
  - ⚠️ 注意：缺少 `scope` 欄位的更新邏輯（需要補完）
  - _Requirements: BR10.4.1, BR10.4.2, BR10.4.3, BR10.4.4_
  - _Status: 已完成（需補完 scope 欄位更新邏輯）_

### 1.2 FAQ 刪除 API Handler

- [x] 1.2.1 驗證 FAQ 刪除 API Handler 已實現 ✅ 已實現
  - File: backend/src/handlers/knowledge/faq.js
  - Function: handleDeleteFAQ
  - 驗證權限檢查（只有建立者或管理員可以刪除，第298行）
  - 驗證 FAQ 不存在檢查（返回 404，第293-295行）
  - 驗證軟刪除（設置 `is_deleted = 1`，第304行）
  - 驗證自動更新 `updated_at`（第304行）
  - 驗證清除快取
  - _Requirements: BR10.4.2, BR10.4.5, BR10.4.6_
  - _Status: 已完成_

---

## 2. 前端組件實現

### 2.1 前端 API 調用函數

- [x] 2.1.1 驗證前端 API 調用函數已實現 ✅ 已實現
  - File: src/api/knowledge.js
  - 驗證 `updateFAQ` 函數已實現
  - 驗證 `deleteFAQ` 函數已實現
  - 驗證使用統一的錯誤處理和回應格式處理
  - _Requirements: BR10.4.4, BR10.4.5_
  - _Status: 已完成_

### 2.2 FAQ 編輯抽屜組件（編輯模式）

- [x] 2.2.1 驗證 FAQ 編輯抽屜組件已實現 ✅ 已實現
  - File: src/components/knowledge/FAQEditDrawer.vue
  - 驗證編輯模式預填現有 FAQ 資訊（第245-268行）
  - 驗證必填欄位驗證（問題、服務類型分類、適用層級、回答）
  - 驗證支援建立和編輯模式
  - _Requirements: BR10.4.1, BR10.4.3, BR10.4.4_
  - _Status: 已完成_

### 2.3 編輯和刪除按鈕

- [x] 2.3.1 驗證編輯和刪除按鈕已實現 ✅ 已實現
  - File: src/views/knowledge/KnowledgeFAQ.vue
  - 驗證編輯按鈕已實現（第118行）
  - 驗證刪除按鈕已實現（第121行）
  - 驗證 `handleEditFAQ` 函數已實現（第342行）
  - 驗證 `handleDeleteFAQ` 函數已實現（第348行）
  - ⚠️ 注意：缺少前端權限檢查（僅建立者或管理員可見）
  - ⚠️ 注意：需要確認刪除確認對話框是否已實現
  - _Requirements: BR10.4.1, BR10.4.2, BR10.4.5, BR10.4.6_
  - _Status: 已完成（需補完前端權限檢查和確認刪除確認對話框）_

### 2.4 知識庫 Store

- [x] 2.4.1 驗證知識庫 Store 已實現 ✅ 已實現
  - File: src/stores/knowledge.js
  - 驗證 `updateFAQ` 方法已實現
  - 驗證 `deleteFAQ` 方法已實現
  - 驗證正確處理 API 回應
  - 驗證更新成功後更新列表和當前 FAQ
  - 驗證刪除成功後更新列表
  - _Requirements: BR10.4.4, BR10.4.5_
  - _Status: 已完成_

---

## 3. 測試

### 3.1 E2E 測試

- [x] 3.1.1 實現 E2E 測試 ✅ 已實現
  - File: tests/e2e/knowledge/faq-editing.spec.ts
  - 測試 FAQ 編輯功能
  - 測試權限控制
  - 測試必填欄位驗證
  - 測試 FAQ 刪除功能
  - 測試刪除確認
  - _Requirements: All BR10.4 requirements_
  - _Status: 已完成_

---

## 4. 補完功能

### 4.1 後端更新 API 的 scope 欄位處理

- [x] 4.1.1 補完後端更新 API 的 scope 欄位處理 ✅ 已實現
  - File: backend/src/handlers/knowledge/faq.js
  - 在 `handleUpdateFAQ` 函數中添加 `scope` 欄位的更新邏輯
  - 確保 `scope` 欄位可以正確更新
  - 添加 scope 欄位驗證（必須是 'service' 或 'task'）
  - _Requirements: BR10.4.4_
  - _Status: 已完成_

### 4.2 前端權限檢查

- [x] 4.2.1 實現前端權限檢查 ✅ 已實現
  - File: src/views/knowledge/KnowledgeFAQ.vue
  - 實現編輯和刪除按鈕的權限檢查（僅建立者或管理員可見）
  - 檢查當前使用者是否為建立者或管理員
  - 導入 useAuthStore 並實現 canEditFAQ 方法
  - 在編輯和刪除按鈕添加 v-if 條件
  - _Requirements: BR10.4.2_
  - _Status: 已完成_

### 4.3 刪除確認對話框

- [x] 4.3.1 確認刪除確認對話框實現 ✅ 已實現
  - File: src/views/knowledge/KnowledgeFAQ.vue
  - 確認 `handleDeleteFAQ` 函數是否包含確認對話框
  - 已添加確認對話框，顯示 FAQ 問題標題
  - 使用 Modal.confirm 實現確認對話框
  - 對話框顯示 FAQ 問題標題，確認後執行刪除，取消則不執行
  - _Requirements: BR10.4.6_
  - _Status: 已完成_

---

## 總結

### 已完成功能
- ✅ FAQ 更新 API Handler（完整實現 - 權限檢查、FAQ 不存在檢查、必填欄位驗證、自動更新 updated_at、清除快取、scope 欄位更新邏輯）
- ✅ FAQ 刪除 API Handler（完整實現 - 權限檢查、FAQ 不存在檢查、軟刪除、自動更新 updated_at、清除快取）
- ✅ 前端 API 調用函數（完整實現 - updateFAQ 和 deleteFAQ 函數、統一錯誤處理）
- ✅ FAQ 編輯抽屜組件（完整實現 - 編輯模式預填、必填欄位驗證、支援建立和編輯模式）
- ✅ 編輯和刪除按鈕（完整實現 - 包含前端權限檢查和刪除確認對話框）
- ✅ 知識庫 Store（完整實現 - updateFAQ 和 deleteFAQ 方法、正確處理 API 回應、更新列表和當前 FAQ）
- ✅ 前端權限檢查（完整實現 - 使用 canEditFAQ 方法檢查權限，僅建立者或管理員可見編輯/刪除按鈕）
- ✅ 刪除確認對話框（完整實現 - 使用 Modal.confirm 顯示 FAQ 問題標題，確認後執行刪除）

### 待完成功能
- ✅ 後端更新 API 的 scope 欄位處理（已完成 - scope 欄位更新邏輯已補完，包含驗證）
- ✅ 前端權限檢查（已完成 - 已實現編輯和刪除按鈕的權限檢查，僅建立者或管理員可見）
- ✅ 刪除確認對話框（已完成 - 已實現確認對話框，顯示 FAQ 問題標題，使用 Modal.confirm）
- ✅ E2E 測試（已完成 - 已建立 `tests/e2e/knowledge/faq-editing.spec.ts`）

### 備註
- 所有核心功能已基本實現，包括：
  - 後端 API：FAQ 更新和刪除（權限檢查、軟刪除、自動更新時間）
  - 前端組件：編輯表單、編輯和刪除按鈕
  - 狀態管理：Store 管理更新和刪除狀態
- 待補完功能：
  - ✅ 後端更新 API 的 scope 欄位處理：已在 `handleUpdateFAQ` 中添加 scope 欄位更新邏輯，包含驗證（必須是 'service' 或 'task'）
  - ✅ 前端權限檢查：已實現編輯和刪除按鈕的權限檢查（僅建立者或管理員可見），使用 `canEditFAQ` 方法檢查權限
  - ✅ 刪除確認對話框：已實現確認對話框，使用 `Modal.confirm` 顯示 FAQ 問題標題，確認後執行刪除，取消則不執行
  - ✅ E2E 測試：已建立完整的測試套件 `tests/e2e/knowledge/faq-editing.spec.ts`

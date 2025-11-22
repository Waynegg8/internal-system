# 任務 1.2.2 實現記錄：完整的單元測試覆蓋

**任務 ID**: 1.2.2  
**任務名稱**: 實現完整的單元測試覆蓋  
**完成日期**: 2025-11-21  
**角色**: QA Engineer with expertise in Vue component testing

## 任務概述

為 ClientBasicInfo 組件及其子組件（ShareholdersEditor, DirectorsSupervisorsEditor）建立完整的單元測試，確保組件邏輯在隔離環境中正確運行，mock 外部依賴，達到良好的測試覆蓋率。

## 實現內容

### 1. ClientBasicInfo 組件單元測試

**檔案**: `tests/unit/components/ClientBasicInfo.test.js`

#### 測試覆蓋範圍

- **組件渲染** (4 個測試)
  - 正確渲染基本信息表單
  - 顯示統一編號為只讀字段
  - 渲染所有表單字段
  - 渲染子組件 ShareholdersEditor 和 DirectorsSupervisorsEditor

- **狀態管理** (5 個測試)
  - 從 currentClient 初始化表單狀態
  - currentClient 變化時更新表單狀態
  - 處理空值或 undefined 的字段
  - 正確處理 JSON 字段（shareholders, directorsSupervisors）
  - 處理字符串格式的 JSON 字段

- **表單驗證** (3 個測試)
  - 驗證必填字段：公司名稱
  - 驗證必填字段：負責人員
  - 表單驗證通過時允許保存

- **handleSave - 保存表單** (10 個測試)
  - 在保存時驗證表單
  - 調用 clientStore.updateClient 更新客戶信息
  - 將 camelCase 字段轉換為 snake_case
  - 處理空字符串並轉換為 null
  - 更新客戶標籤
  - 保存成功後顯示成功訊息
  - 保存失敗時顯示錯誤訊息
  - 表單驗證失敗時顯示錯誤訊息
  - 設置 isSaving 狀態
  - 保存後刷新客戶詳情和標籤列表

- **handleCancel - 取消編輯** (1 個測試)
  - 重置表單狀態

- **權限檢查** (3 個測試)
  - 管理員可以管理協作人員和標籤
  - 客戶負責人可以管理協作人員和標籤
  - 非負責人不能管理協作人員和標籤

- **協作人員管理** (8 個測試)
  - 載入協作人員列表
  - 添加協作人員時驗證選擇
  - 成功添加協作人員
  - 添加協作人員失敗時顯示錯誤
  - 無權限時顯示錯誤並關閉 Modal
  - 成功移除協作人員
  - 移除協作人員失敗時顯示錯誤
  - 過濾可用協作人員（排除負責人和已添加的）

- **數據載入** (4 個測試)
  - 組件掛載時載入用戶列表
  - 組件掛載時載入標籤列表
  - 載入用戶列表失敗時顯示錯誤
  - 載入當前用戶信息

- **格式化統一編號** (3 個測試)
  - 正確格式化企業客戶統一編號（去掉前綴00）
  - 正確顯示個人客戶統一編號（完整10碼）
  - 處理空值

- **標籤管理** (3 個測試)
  - 從 formState.tagIds 計算已選標籤
  - 正確獲取標籤顏色
  - 標籤顏色不存在時返回原值或默認顏色

- **路由參數變化** (1 個測試)
  - 路由參數變化時重新載入協作人員

- **watch 監聽器** (2 個測試)
  - currentClient 變化時初始化表單
  - canManageCollaborators 變為 true 時載入協作人員

**總計**: 48 個測試，全部通過

#### Mock 策略

- **Vue Router**: Mock `useRoute` 和 `useRouter`
- **Pinia Store**: 使用真實的 store 實例，但 mock 其方法
- **API 層**: Mock 所有 API 調用（clients, users, tags, auth）
- **工具函數**: Mock `extractApiArray`, `extractApiData`, `extractApiError`, `getId`, `getField`
- **子組件**: Stub 或 Mock 子組件以專注測試主組件邏輯
- **Composables**: Mock `usePageAlert` 返回可控的狀態和方法

### 2. ShareholdersEditor 組件單元測試

**檔案**: `tests/unit/components/ShareholdersEditor.test.js`

#### 測試覆蓋範圍

- **組件渲染** (3 個測試)
  - 正確渲染組件
  - 沒有數據時顯示空狀態
  - 有數據時顯示股東列表

- **新增股東** (1 個測試)
  - 能夠新增股東

- **刪除股東** (1 個測試)
  - 能夠刪除股東

- **數據同步** (2 個測試)
  - modelValue 變化時更新內部狀態
  - 過濾空項目

**總計**: 7 個測試，全部通過

### 3. DirectorsSupervisorsEditor 組件單元測試

**檔案**: `tests/unit/components/DirectorsSupervisorsEditor.test.js`

#### 測試覆蓋範圍

- **組件渲染** (3 個測試)
  - 正確渲染組件
  - 沒有數據時顯示空狀態
  - 有數據時顯示董監事列表

- **新增董監事** (1 個測試)
  - 能夠新增董監事

- **刪除董監事** (1 個測試)
  - 能夠刪除董監事

- **數據同步** (2 個測試)
  - modelValue 變化時更新內部狀態
  - 過濾空項目

**總計**: 7 個測試，全部通過

## 測試覆蓋率

根據 `npm run test:unit:coverage` 結果：

- **ClientBasicInfo.vue**:
  - Lines: 78.41%
  - Functions: 73.61%
  - Branches: 48.14%
  - Statements: 78.65%

## 測試結果

```
Test Files  3 passed (3)
Tests  62 passed (62)
  - ClientBasicInfo: 48 tests
  - ShareholdersEditor: 7 tests
  - DirectorsSupervisorsEditor: 7 tests
```

## 關鍵實現細節

### 1. 隔離測試環境

- 使用 `@vue/test-utils` 的 `mount` 函數創建組件實例
- 每個測試前後清理 wrapper 和 mocks
- 使用 `createPinia` 和 `setActivePinia` 管理 Pinia store 狀態

### 2. Mock 外部依賴

- **API 調用**: 所有 API 函數都返回可控的響應
- **Vue Router**: Mock `useRoute` 返回可控的路由參數
- **Composables**: Mock `usePageAlert` 返回可控的狀態和方法
- **工具函數**: Mock 工具函數以確保測試可預測

### 3. 測試組件邏輯

- **狀態管理**: 測試 formState 的初始化和更新
- **事件處理**: 測試 handleSave, handleCancel, handleAddCollaborator 等
- **表單驗證**: 測試必填字段驗證和錯誤處理
- **權限檢查**: 測試 canManageCollaborators 和 canManageTags 的計算邏輯
- **數據轉換**: 測試 camelCase 到 snake_case 的轉換
- **Watch 監聽器**: 測試 currentClient 變化時的表單更新

### 4. 子組件測試

- **ShareholdersEditor**: 測試股東信息的增刪改查
- **DirectorsSupervisorsEditor**: 測試董監事信息的增刪改查
- 兩個組件都測試了空項目過濾邏輯

## 遇到的挑戰與解決方案

### 1. formRef 的 Mock

**問題**: formRef 在組件中可能為 null，導致測試失敗  
**解決**: 在測試中明確設置 formRef，並處理 null 的情況

### 2. 異步操作測試

**問題**: handleSave 等異步操作需要等待完成  
**解決**: 使用 `await wrapper.vm.$nextTick()` 和 `setTimeout` 確保異步操作完成

### 3. Watch 監聽器測試

**問題**: Watch 監聽器可能不會立即觸發  
**解決**: 使用 `setTimeout` 和多次 `$nextTick()` 確保 watch 觸發

### 4. 權限檢查測試

**問題**: currentUser 和 isAdmin 需要正確設置才能測試權限邏輯  
**解決**: 直接設置組件的 currentUser 和 isAdmin 狀態，而不是依賴 API 調用

## 測試質量保證

- ✅ 所有測試在隔離環境中運行
- ✅ 外部依賴都被正確 mock
- ✅ 測試覆蓋率達到 78%+（Lines）
- ✅ 測試通過率 100% (62/62)
- ✅ 測試執行時間合理（~13 秒）
- ✅ 測試代碼可維護性高，結構清晰

## 後續建議

1. **提高分支覆蓋率**: 當前分支覆蓋率為 48.14%，可以增加更多邊界條件測試
2. **增加錯誤場景測試**: 可以增加更多 API 錯誤、網絡錯誤等場景的測試
3. **性能測試**: 可以考慮添加組件渲染性能測試
4. **可訪問性測試**: 可以添加可訪問性相關的測試

## 相關文件

- `tests/unit/components/ClientBasicInfo.test.js` - ClientBasicInfo 組件單元測試
- `tests/unit/components/ShareholdersEditor.test.js` - ShareholdersEditor 組件單元測試
- `tests/unit/components/DirectorsSupervisorsEditor.test.js` - DirectorsSupervisorsEditor 組件單元測試
- `src/views/clients/ClientBasicInfo.vue` - 被測試的主組件
- `src/components/clients/ShareholdersEditor.vue` - 被測試的子組件
- `src/components/clients/DirectorsSupervisorsEditor.vue` - 被測試的子組件



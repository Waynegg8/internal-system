# 任務 1.2.3 實現記錄：API 整合測試

**任務 ID**: 1.2.3  
**任務名稱**: 實現 API 整合測試  
**完成日期**: 2025-11-21  
**角色**: QA Engineer with expertise in API testing

## 任務概述

為所有客戶相關 API 端點建立完整的整合測試，測試真實的 API 行為，使用測試數據庫（mock），確保適當的清理，覆蓋所有整合場景。

## 實現內容

### 1. API 整合測試檔案

**檔案**: `tests/integration/api/clients-api.test.js`

#### 測試覆蓋的 API 端點

- **handleClientDetail** - GET /api/v2/clients/:id (4 個測試)
  - 成功獲取客戶詳情
  - 客戶不存在時返回 404
  - 無權限時返回 403
  - 包含標籤信息

- **handleUpdateClient** - PUT /api/v2/clients/:id (7 個測試)
  - 成功更新客戶基本信息
  - 客戶不存在時返回 404
  - 無權限時返回 403
  - 支持負責人更新自己的客戶
  - 正確處理股東信息
  - 正確處理董監事信息
  - 支持 camelCase 和 snake_case 字段名

- **handleDeleteClient** - DELETE /api/v2/clients/:id (3 個測試)
  - 成功刪除客戶（軟刪除）
  - 客戶不存在時返回 404
  - 只有管理員可以刪除客戶

- **handleGetCollaborators** - GET /api/v2/clients/:id/collaborators (3 個測試)
  - 成功獲取協作人員列表
  - 客戶不存在時返回 404
  - 只有管理員或負責人可以查看協作人員

- **handleAddCollaborator** - POST /api/v2/clients/:id/collaborators (7 個測試)
  - 成功添加協作人員
  - 用戶 ID 無效時返回 422
  - 客戶不存在時返回 404
  - 無權限時返回 403
  - 不能添加負責人為協作人員
  - 員工不存在時返回 404
  - 協作人員已存在時返回 422

- **handleRemoveCollaborator** - DELETE /api/v2/clients/:id/collaborators/:collaborationId (5 個測試)
  - 成功移除協作人員
  - 協作記錄 ID 無效時返回 422
  - 協作記錄不存在時返回 404
  - 協作記錄不屬於該客戶時返回 404
  - 只有管理員或負責人可以移除協作人員

- **handleUpdateClientTags** - PUT /api/v2/clients/:id/tags (4 個測試)
  - 成功更新客戶標籤
  - 標籤不存在時返回 422
  - 支持清空標籤
  - 正確處理部分標籤不存在的情況

- **權限檢查綜合測試** (3 個測試)
  - 正確處理管理員權限
  - 正確處理負責人權限
  - 正確處理無權限用戶

- **數據驗證測試** (2 個測試)
  - 驗證必填字段
  - 正確處理 JSON 字符串格式的股東和董監事數據

- **錯誤處理測試** (2 個測試)
  - 數據庫錯誤時返回 500
  - 正確處理事務回滾

**總計**: 40 個測試，全部通過

### 2. Mock 數據庫實現

#### 核心設計

- **createMockDatabase()**: 創建完整的 mock 數據庫，支持 prepare, bind, first, all, run, batch, exec
- **mockDatabaseQuery()**: 根據 SQL 查詢和參數返回模擬數據
- **testData**: 內存中的測試數據存儲，包括 clients, users, collaborators, tags 等

#### Mock 策略

1. **SELECT 查詢**:
   - 根據查詢內容和 binds 參數返回對應數據
   - 支持 JOIN 查詢（Clients + Users + Tags）
   - 支持權限檢查查詢（checkClientAccessPermission）
   - 支持 COUNT 查詢

2. **INSERT 查詢**:
   - 自動生成 ID
   - 將數據添加到 testData
   - 返回 lastInsertId 和 changes

3. **UPDATE 查詢**:
   - 更新 testData 中的對應記錄
   - 支持軟刪除（is_deleted = 1）
   - 返回 changes 計數

4. **DELETE 查詢**:
   - 從 testData 中移除對應記錄
   - 返回 changes 計數

#### 測試數據管理

- **beforeEach**: 初始化測試數據，包括客戶、用戶、標籤等
- **afterEach**: 清理測試數據，確保測試隔離
- **testData**: 全局測試數據存儲，在測試間共享但每次測試前重置

### 3. 權限檢查測試

#### 測試場景

- **管理員**: 可以訪問所有 API，無限制
- **負責人**: 可以訪問自己負責的客戶的 API
- **協作者**: 可以查看客戶詳情（通過 checkClientAccessPermission）
- **無權限用戶**: 返回 403 FORBIDDEN

#### checkClientAccessPermission Mock

實現了完整的權限檢查邏輯：
- 檢查是否為客戶負責人
- 檢查是否為協作者
- 檢查是否填過工時
- 返回對應的權限結果

### 4. 數據驗證測試

#### 測試內容

- **字段驗證**: 測試必填字段和格式驗證
- **數據類型轉換**: 測試 camelCase 和 snake_case 字段名支持
- **JSON 處理**: 測試股東和董監事數據的 JSON 字符串解析
- **空值處理**: 測試 null 和空字符串的處理

### 5. 錯誤處理測試

#### 測試場景

- **404 NOT_FOUND**: 資源不存在
- **403 FORBIDDEN**: 無權限訪問
- **422 VALIDATION_ERROR**: 數據驗證失敗
- **500 INTERNAL_ERROR**: 數據庫錯誤
- **事務回滾**: 測試事務失敗時的正確回滾

## 關鍵實現細節

### 1. 真實 API 行為模擬

- 直接調用 handler 函數，而非通過 HTTP 請求
- Mock 環境變數（DATABASE, CACHE）
- Mock 上下文（ctx.user）
- Mock 請求對象（request, match, url）

### 2. 測試數據庫（Mock）

- 使用內存數據結構（testData）模擬數據庫
- 支持完整的 CRUD 操作
- 支持事務（BEGIN, COMMIT, ROLLBACK）
- 支持複雜查詢（JOIN, WHERE, GROUP BY）

### 3. 適當的清理

- **beforeEach**: 重置 testData 和所有 mocks
- **afterEach**: 清理 testData
- 每個測試獨立，不依賴其他測試的數據

### 4. 整合場景覆蓋

- **成功場景**: 所有 API 的正常流程
- **錯誤場景**: 404, 403, 422, 500 等錯誤
- **權限場景**: 管理員、負責人、協作者、無權限用戶
- **數據驗證場景**: 必填字段、數據格式、JSON 解析
- **邊界場景**: 空數據、null 值、無效 ID

## 遇到的挑戰與解決方案

### 1. Mock 數據庫查詢匹配

**問題**: 需要精確匹配 SQL 查詢以返回正確的數據  
**解決**: 使用 queryLower 進行不區分大小寫的匹配，檢查關鍵字和表名

### 2. 權限檢查邏輯

**問題**: checkClientAccessPermission 的查詢需要正確 mock  
**解決**: 實現完整的權限檢查邏輯，包括負責人、協作者、工時記錄檢查

### 3. UPDATE 查詢的 binds 順序

**問題**: UPDATE 查詢的參數順序需要與實際 SQL 一致  
**解決**: 根據實際 SQL 確定參數順序，正確映射到 testData

### 4. 協作記錄查詢

**問題**: handleRemoveCollaborator 需要查詢協作記錄並檢查客戶  
**解決**: 實現包含 LEFT JOIN 的查詢 mock，返回完整的協作記錄和客戶信息

### 5. 事務處理

**問題**: 需要 mock 事務的 BEGIN, COMMIT, ROLLBACK  
**解決**: 在 mockEnv.DATABASE 中添加 exec 方法支持

## 測試質量保證

- ✅ 所有測試在隔離環境中運行
- ✅ 使用 mock 數據庫模擬真實行為
- ✅ 測試數據在每次測試前後正確清理
- ✅ 測試覆蓋所有 API 端點
- ✅ 測試覆蓋成功和錯誤場景
- ✅ 測試覆蓋權限檢查
- ✅ 測試覆蓋數據驗證
- ✅ 測試通過率 100% (40/40)
- ✅ 測試執行時間合理（~636ms）

## 測試統計

| API 端點 | 測試數量 | 通過率 |
|---------|---------|--------|
| handleClientDetail | 4 | 100% |
| handleUpdateClient | 7 | 100% |
| handleDeleteClient | 3 | 100% |
| handleGetCollaborators | 3 | 100% |
| handleAddCollaborator | 7 | 100% |
| handleRemoveCollaborator | 5 | 100% |
| handleUpdateClientTags | 4 | 100% |
| 權限檢查 | 3 | 100% |
| 數據驗證 | 2 | 100% |
| 錯誤處理 | 2 | 100% |
| **總計** | **40** | **100%** |

## 相關文件

- `tests/integration/api/clients-api.test.js` - API 整合測試檔案
- `backend/src/handlers/clients/client-crud.js` - 客戶 CRUD handlers
- `backend/src/handlers/clients/client-collaborators.js` - 協作者管理 handlers
- `backend/src/handlers/clients/client-tags.js` - 標籤管理 handlers



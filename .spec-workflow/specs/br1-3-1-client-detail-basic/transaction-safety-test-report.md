# 事務安全性測試報告：客戶更新操作

**測試日期**: 2025-11-20  
**測試環境**: Production (https://7e5f70d1.horgoscpa-internal-v2.pages.dev)  
**測試 API**: `PUT /api/v2/clients/:id` (handleUpdateClient)  
**測試客戶**: 0064197890

## 測試目標

驗證客戶更新操作的事務安全性，包括：
1. 原子操作（所有操作要麼全部成功，要麼全部失敗）
2. 回滾機制（部分失敗時能正確回滾）
3. 資料一致性（主表和關聯表資料保持一致）
4. 錯誤恢復（錯誤發生後系統能正確恢復）

## 代碼分析

### 當前實現分析

從 `backend/src/handlers/clients/client-crud.js` 的 `handleUpdateClient` 函數分析：

#### 操作流程

1. **UPDATE Clients 表**（第 920-946 行）
   - 更新客戶基本資訊
   - 無錯誤處理（如果失敗會拋出異常）

2. **DELETE + INSERT Shareholders 表**（第 949-968 行）
   - 先刪除所有現有股東記錄
   - 再插入新的股東記錄
   - 使用 try-catch，但只記錄警告，不會回滾

3. **DELETE + INSERT DirectorsSupervisors 表**（第 970-989 行）
   - 先刪除所有現有董監事記錄
   - 再插入新的董監事記錄
   - 使用 try-catch，但只記錄警告，不會回滾

4. **清除快取**（第 991-997 行）
   - 異步清除相關快取
   - 失敗不影響主流程

#### 事務安全性問題

**❌ 嚴重問題：沒有使用資料庫事務**

1. **多個獨立操作**：
   - UPDATE Clients、DELETE Shareholders、INSERT Shareholders、DELETE DirectorsSupervisors、INSERT DirectorsSupervisors 都是獨立的 SQL 操作
   - 沒有包裝在事務中，無法保證原子性

2. **部分失敗風險**：
   - 如果 UPDATE Clients 成功，但 INSERT Shareholders 失敗，會導致：
     - 客戶基本資訊已更新
     - 但股東資料被刪除且未重新插入
     - 資料不一致

3. **錯誤處理不足**：
   - Shareholders 和 DirectorsSupervisors 的錯誤只記錄警告
   - 不會回滾已執行的操作
   - 不會返回錯誤給前端

4. **覆蓋策略風險**：
   - 採用「先刪再插」策略
   - 如果 DELETE 成功但 INSERT 失敗，資料會丟失

## 測試結果

### 測試 1: 正常更新操作（驗證原子性）

**測試步驟**：
1. 修改客戶基本資訊（公司名稱、負責人、地址）
2. 新增股東資訊（姓名：事務測試股東張三）
3. 點擊「儲存變更」

**預期結果**：
- 所有操作應該全部成功或全部失敗
- 資料應該保持一致

**實際結果**：
- ✅ 客戶基本資訊成功更新
  - 公司名稱：`BR2.5測試客戶-事務測試-1763664197890`
  - 公司負責人：`事務測試負責人`
  - 公司地址：`台北市信義區事務測試地址123號`
  - updated_at：`2025-11-20 19:37:49`
- ✅ 股東資訊成功保存
  - 股東姓名：`事務測試股東張三`
  - Shareholders 表中有 1 筆記錄
- ✅ 資料一致性：基本資訊和關聯表資料都已正確保存

**結論**：✅ 正常情況下操作成功，但**無法驗證原子性**（因為沒有測試失敗場景）

### 測試 2: 資料一致性驗證

**測試步驟**：
1. 查詢資料庫驗證資料一致性
2. 檢查主表和關聯表的資料是否匹配

**查詢結果**：

```sql
-- 客戶基本資訊
SELECT client_id, company_name, company_owner, company_address, updated_at 
FROM Clients 
WHERE client_id = '0064197890' AND is_deleted = 0
```
**結果**：
- client_id: `0064197890`
- company_name: `BR2.5測試客戶-事務測試-1763664197890` ✅
- company_owner: `事務測試負責人` ✅
- company_address: `台北市信義區事務測試地址123號` ✅
- updated_at: `2025-11-20 19:37:49` ✅

```sql
-- 股東資訊
SELECT client_id, name, share_percentage 
FROM Shareholders 
WHERE client_id = '0064197890'
```
**結果**：
- 記錄數：1 ✅
- name: `事務測試股東張三` ✅
- share_percentage: `null`（前端未提交持股比例）

```sql
-- 董監事資訊
SELECT COUNT(*) as count 
FROM DirectorsSupervisors 
WHERE client_id = '0064197890'
```
**結果**：
- 記錄數：0 ✅（符合預期，未新增董監事）

**結論**：✅ 資料一致性正常（在正常操作情況下）

### 測試 3: 部分更新失敗場景（模擬測試）

**測試方法**：代碼審查 + 邏輯分析

**模擬場景**：
1. UPDATE Clients 成功
2. DELETE Shareholders 成功
3. INSERT Shareholders 失敗（例如：資料庫約束錯誤、網路中斷）

**預期行為**：
- 應該回滾所有操作
- 返回錯誤給前端
- 資料保持原狀

**實際行為**（根據代碼分析）：
- ❌ **不會回滾**：UPDATE Clients 和 DELETE Shareholders 已經完成
- ❌ **不會返回錯誤**：錯誤被 try-catch 捕獲，只記錄警告
- ❌ **資料不一致**：
  - 客戶基本資訊已更新
  - 股東資料被刪除但未重新插入
  - 前端收到成功響應，但資料實際不一致

**結論**：❌ **存在嚴重的事務安全性問題**

### 測試 4: 錯誤恢復機制

**測試方法**：代碼審查

**錯誤處理分析**：

1. **UPDATE Clients**：
   - 無錯誤處理
   - 如果失敗會拋出異常，返回 500 錯誤
   - ✅ 不會導致資料不一致（因為是第一個操作）

2. **Shareholders 操作**：
   ```javascript
   try {
     await env.DATABASE.prepare(`DELETE FROM Shareholders ...`).run();
     // INSERT operations...
   } catch (e) {
     console.warn('[UpdateClient] write Shareholders failed:', e);
     // ❌ 不會回滾，不會返回錯誤
   }
   ```
   - ❌ 錯誤被吞掉，不會回滾
   - ❌ 不會通知前端
   - ❌ 不會恢復已刪除的資料

3. **DirectorsSupervisors 操作**：
   - 與 Shareholders 相同的問題

**結論**：❌ **錯誤恢復機制不足**

## 發現的問題

### 🔴 嚴重問題 (Critical)

#### Bug #1: 缺乏資料庫事務支持
- **嚴重程度**: Critical
- **影響範圍**: 所有客戶更新操作
- **問題描述**: 
  - 多個 SQL 操作沒有包裝在事務中
  - 無法保證原子性（ACID 中的 Atomicity）
  - 部分操作失敗時無法回滾
- **風險場景**:
  1. UPDATE Clients 成功 → DELETE Shareholders 成功 → INSERT Shareholders 失敗
     - 結果：客戶資訊已更新，但股東資料丟失
  2. UPDATE Clients 成功 → DELETE Shareholders 失敗（例如：外鍵約束）
     - 結果：客戶資訊已更新，但股東資料未刪除（資料不一致）
- **建議修復**: 
  - 使用 Cloudflare D1 的事務支持（如果可用）
  - 或實現補償性事務（Compensating Transaction）模式
  - 在錯誤發生時手動回滾已執行的操作

#### Bug #2: 錯誤處理不當
- **嚴重程度**: Critical
- **影響範圍**: 股東和董監事資料更新
- **問題描述**:
  - Shareholders 和 DirectorsSupervisors 的錯誤只記錄警告
  - 不會回滾已執行的操作
  - 不會返回錯誤給前端
  - 前端會收到成功響應，但資料實際不一致
- **建議修復**:
  - 如果關聯表操作失敗，應該回滾主表更新
  - 返回錯誤給前端，讓用戶知道操作失敗
  - 記錄詳細錯誤日誌

#### Bug #3: 覆蓋策略風險
- **嚴重程度**: High
- **影響範圍**: 股東和董監事資料
- **問題描述**:
  - 採用「先刪再插」策略
  - 如果 DELETE 成功但 INSERT 失敗，資料會永久丟失
- **建議修復**:
  - 使用事務確保原子性
  - 或改用「先插再刪」策略（但需要處理重複資料）
  - 或使用 UPSERT（INSERT OR REPLACE）語句

## 測試結論

### ✅ 符合要求
- 正常操作情況下，資料能正確保存
- 資料一致性在正常情況下正常

### ❌ 不符合要求
- **原子操作**: ❌ 缺乏事務支持，無法保證原子性
- **回滾機制**: ❌ 沒有回滾機制，部分失敗時無法恢復
- **錯誤恢復**: ❌ 錯誤處理不當，不會通知前端，不會恢復資料

### 整體評估

**狀態**: ❌ **不符合要求**

**主要問題**:
1. 缺乏資料庫事務支持，無法保證原子性
2. 錯誤處理不當，部分失敗時不會回滾
3. 覆蓋策略存在資料丟失風險

**風險等級**: 🔴 **高風險**

**影響**:
- 在網路不穩定或資料庫約束錯誤時，可能導致資料不一致
- 用戶可能收到成功響應，但資料實際未完全更新
- 可能導致資料丟失（股東/董監事資料）

## 建議修復方案

### 優先級 1: 實現事務支持

**方案 A: 使用 D1 事務（參考 billing-crud.js 的實現）**

根據 `backend/src/handlers/billing/billing-crud.js` 中的實現，D1 支持事務操作：

```javascript
// 開始事務
try { 
  await env.DATABASE.exec?.("BEGIN"); 
} catch (_) { 
  try { 
    await env.DATABASE.prepare("BEGIN").run(); 
  } catch(_){}
}

try {
  // 1. UPDATE Clients
  await env.DATABASE.prepare(`UPDATE Clients ...`).run();
  
  // 2. DELETE Shareholders
  await env.DATABASE.prepare(`DELETE FROM Shareholders ...`).run();
  
  // 3. INSERT Shareholders
  for (const s of shareholders) {
    await env.DATABASE.prepare(`INSERT INTO Shareholders ...`).bind(...).run();
  }
  
  // 4. DELETE DirectorsSupervisors
  await env.DATABASE.prepare(`DELETE FROM DirectorsSupervisors ...`).run();
  
  // 5. INSERT DirectorsSupervisors
  for (const d of directorsSupervisors) {
    await env.DATABASE.prepare(`INSERT INTO DirectorsSupervisors ...`).bind(...).run();
  }
  
  // 提交事務
  try { 
    await env.DATABASE.exec?.("COMMIT"); 
  } catch (_) { 
    try { 
      await env.DATABASE.prepare("COMMIT").run(); 
    } catch(_){}
  }
} catch (e) {
  // 回滾事務
  try { 
    await env.DATABASE.exec?.("ROLLBACK"); 
  } catch (_) { 
    try { 
      await env.DATABASE.prepare("ROLLBACK").run(); 
    } catch(_){}
  }
  throw e; // 重新拋出錯誤
}
```

**方案 B: 實現補償性事務**

```javascript
// 記錄原始狀態
const originalClient = await getClient(clientId);
const originalShareholders = await getShareholders(clientId);

try {
  // 執行更新操作
  await updateClient(...);
  await updateShareholders(...);
} catch (e) {
  // 回滾：恢復原始狀態
  await restoreClient(originalClient);
  await restoreShareholders(originalShareholders);
  throw e; // 重新拋出錯誤
}
```

### 優先級 2: 改進錯誤處理

```javascript
// 改進後的錯誤處理
let shareholdersError = null;
try {
  await env.DATABASE.prepare(`DELETE FROM Shareholders ...`).run();
  // INSERT operations...
} catch (e) {
  shareholdersError = e;
  // 記錄錯誤並回滾主表更新
  await rollbackClientUpdate(clientId, originalData);
  return errorResponse(500, "UPDATE_FAILED", "股東資料更新失敗", e, requestId);
}
```

### 優先級 3: 改進覆蓋策略

**方案 A: 使用 UPSERT**

```sql
INSERT OR REPLACE INTO Shareholders (...)
VALUES (...)
```

**方案 B: 使用臨時表**

```sql
-- 1. 插入到臨時表
INSERT INTO Shareholders_temp (...)
-- 2. 在事務中替換
BEGIN TRANSACTION;
DELETE FROM Shareholders WHERE client_id = ?;
INSERT INTO Shareholders SELECT * FROM Shareholders_temp WHERE client_id = ?;
COMMIT;
```

## 測試數據詳情

### 測試環境
- **瀏覽器**: Chrome (via Browser MCP)
- **網路**: 實際生產環境網路
- **測試時間**: 2025-11-20 19:37-19:40

### 測試數據

#### 正常更新操作
```
操作前：
- 公司名稱: BR2.5測試客戶有限公司-修復測試-1763664197890
- 公司負責人: (空)
- 公司地址: (空)
- 股東數量: 0

操作後：
- 公司名稱: BR2.5測試客戶-事務測試-1763664197890 ✅
- 公司負責人: 事務測試負責人 ✅
- 公司地址: 台北市信義區事務測試地址123號 ✅
- 股東數量: 1 ✅
- updated_at: 2025-11-20 19:37:49 ✅
```

#### 資料一致性驗證
```
Clients 表：
- client_id: 0064197890
- company_name: BR2.5測試客戶-事務測試-1763664197890 ✅
- company_owner: 事務測試負責人 ✅
- company_address: 台北市信義區事務測試地址123號 ✅

Shareholders 表：
- 記錄數: 1 ✅
- name: 事務測試股東張三 ✅
- client_id: 0064197890 ✅ (外鍵一致)

DirectorsSupervisors 表：
- 記錄數: 0 ✅ (符合預期)
```

---

**測試執行者**: QA Engineer (AI)  
**測試工具**: Browser MCP (Cursor Browser Extension) + Database MCP  
**測試方法**: 實際瀏覽器操作 + 資料庫查詢驗證 + 代碼審查


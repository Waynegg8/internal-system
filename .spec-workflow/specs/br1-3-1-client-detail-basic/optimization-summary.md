# 性能優化總結

**優化日期**: 2025-11-20  
**優化目標**: 將 `handleClientDetail` API 響應時間從 2305-2369ms 降低到 < 500ms

## 優化措施

### 1. 消除 N+1 查詢問題 ✅

**問題**：
- 原代碼對每個服務都執行單獨的計費排程查詢
- 對每個服務都執行單獨的任務配置數量查詢
- 如果有 N 個服務，會執行 2N 次額外的資料庫查詢

**優化方案**：
- 使用批量查詢一次性獲取所有服務的計費排程
- 使用批量查詢一次性獲取所有服務的任務配置數量
- 將查詢結果存儲在 Map 中，供後續使用

**代碼變更**：
```javascript
// 優化前：N+1 查詢
services = await Promise.all(servicesRows.map(async (svc) => {
  const billingRows = await env.DATABASE.prepare(...).bind(svc.client_service_id).all();
  const taskConfigsCount = await env.DATABASE.prepare(...).bind(svc.client_service_id).first();
  // ...
}));

// 優化後：批量查詢
const serviceIds = servicesRows.map(s => s.client_service_id);
const allBillingRows = await env.DATABASE.prepare(
  `SELECT ... WHERE client_service_id IN (${placeholders})`
).bind(...serviceIds).all();
const allTaskConfigsRows = await env.DATABASE.prepare(
  `SELECT ... WHERE client_service_id IN (${placeholders})`
).bind(...serviceIds).all();
```

### 2. 優化快取策略 ✅

**問題**：
- 快取保存是同步的，會阻塞響應返回
- 快取讀取失敗時沒有錯誤處理

**優化方案**：
- 異步保存快取，不阻塞響應返回
- 添加快取讀取錯誤處理，失敗時回退到資料庫查詢

**代碼變更**：
```javascript
// 優化前：同步保存快取
await saveKVCache(env, cacheKey, 'client_detail', data, { ttl: 3600 });

// 優化後：異步保存快取
if (!noCache) {
  saveKVCache(env, cacheKey, 'client_detail', data, { ttl: 3600 }).catch(err => {
    console.warn('[ClientDetail] Cache save failed (non-blocking):', err);
  });
}
```

### 3. 異步更新任務配置計數 ✅

**問題**：
- 更新任務配置計數是同步的，會阻塞響應

**優化方案**：
- 將更新操作改為異步執行，不等待完成

**代碼變更**：
```javascript
// 優化前：同步更新
if (actualCount !== storedCount) {
  await env.DATABASE.prepare(`UPDATE ...`).run();
}

// 優化後：異步更新
const updatePromises = [];
if (actualCount !== storedCount) {
  updatePromises.push(env.DATABASE.prepare(`UPDATE ...`).run().catch(() => {}));
}
Promise.all(updatePromises).catch(() => {});
```

## 優化結果

### 性能測試對比

| 指標 | 優化前 | 優化後 | 改善 |
|------|--------|--------|------|
| **無快取 API 響應時間** | 2369ms | 2365.4ms | -3.6ms (-0.15%) |
| **頁面載入時間** | 278.5ms | 297.1ms | +18.6ms (+6.7%) |
| **API Duration** | 1650.6ms | 1636.1ms | -14.5ms (-0.88%) |

### 分析

**改善不明顯的原因**：

1. **主要瓶頸不在 N+1 查詢**：
   - 測試客戶只有 1 個服務，N+1 問題影響較小
   - 主要時間消耗在資料庫查詢本身，而非查詢次數

2. **資料庫查詢複雜度**：
   - 主查詢包含多表 JOIN 和 GROUP_CONCAT
   - 服務列表查詢包含 LEFT JOIN
   - 股東/董監事查詢
   - 這些查詢本身的執行時間較長

3. **網路延遲**：
   - Cloudflare Workers 到 D1 資料庫的網路延遲
   - 可能還有其他中間層的延遲

## 進一步優化建議

### 優先級 1: 資料庫索引優化

1. **檢查並優化索引**：
   - 確保 `Clients.client_id` 有索引
   - 確保 `ClientServices.client_id` 有索引
   - 確保 `ServiceBillingSchedule.client_service_id` 有索引
   - 確保 `ClientServiceTaskConfigs.client_service_id` 有索引

2. **優化 JOIN 查詢**：
   - 檢查 JOIN 順序是否最優
   - 考慮使用 EXPLAIN QUERY PLAN 分析查詢計劃

### 優先級 2: 快取策略改進

1. **預熱快取**：
   - 在客戶資料更新時主動更新快取
   - 避免首次請求時快取未建立

2. **分層快取**：
   - 使用 D1 快取作為二級快取
   - KV 快取作為一級快取

3. **部分快取**：
   - 將服務列表、股東、董監事等分別快取
   - 允許部分資料使用快取，部分資料查詢資料庫

### 優先級 3: 查詢優化

1. **減少資料傳輸**：
   - 只查詢必要的欄位
   - 避免查詢大量不需要的資料

2. **並行查詢**：
   - 股東和董監事查詢可以並行執行
   - 服務列表查詢可以與其他查詢並行

3. **資料預聚合**：
   - 將常用的聚合資料（如年度總額）預先計算並存儲
   - 減少運行時計算

### 優先級 4: 架構優化

1. **讀寫分離**：
   - 考慮使用只讀副本進行查詢
   - 減少主資料庫的負載

2. **CDN 快取**：
   - 對於不經常變更的資料，使用 CDN 快取
   - 減少 Worker 的處理負載

## 結論

本次優化主要解決了 N+1 查詢問題，但由於測試客戶只有 1 個服務，改善效果不明顯。主要性能瓶頸在於：

1. **資料庫查詢本身的執行時間**（約 1.6 秒）
2. **網路延遲**（約 0.7 秒）

要達到 < 500ms 的目標，需要：
1. 優化資料庫索引和查詢計劃
2. 改進快取策略，確保快取真正生效
3. 考慮架構層面的優化（讀寫分離、CDN 快取等）

**建議**：在有多個服務的客戶上測試，驗證 N+1 優化的實際效果。




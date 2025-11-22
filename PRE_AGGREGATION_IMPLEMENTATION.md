# 預聚合方案實施文檔

## 概述

為了解決 D1 寫入限制（119.04k / 100k 已超過）和查詢次數限制（50次）的問題，實施了預聚合方案。

## 實施內容

### 1. 數據庫表結構

**表名**: `TaskGenerationQueue`

**字段**:
- `queue_id`: 主鍵
- `client_id`, `client_service_id`, `service_id`, `config_id`: 關聯字段
- `target_year`, `target_month`: 目標年月
- `generation_time`, `due_date`: 預先計算的時間
- `is_fixed_deadline`: 是否固定期限
- `status`: pending/processing/completed/failed
- `created_at`, `updated_at`, `processed_at`: 時間戳
- `error_message`: 錯誤訊息

**索引**:
- `idx_task_generation_queue_status`: (status, target_year, target_month)
- `idx_task_generation_queue_client`: (client_id, target_year, target_month)
- `idx_task_generation_queue_service`: (client_service_id, target_year, target_month)

**唯一約束**: (client_service_id, config_id, target_year, target_month)

### 2. 核心函數

#### `preAggregateTasks(env, targetYear, targetMonth, options)`

**功能**: 預先計算需要生成的任務並存入 TaskGenerationQueue

**流程**:
1. 檢查是否已有預聚合數據（避免重複計算）
2. 單一查詢獲取所有需要生成的任務數據
3. 處理數據並計算生成時間和截止日期
4. 批量插入到 TaskGenerationQueue（分批處理避免 SQL 變數限制）

**查詢次數**: 1-3次（檢查 + 查詢數據 + 批量插入）

**優勢**:
- 預先計算所有邏輯（生成時間、截止日期、是否應該生成）
- 減少後續生成時的複雜計算
- 可以提前發現問題

#### `generateTasksFromQueue(env, targetYear, targetMonth, options)`

**功能**: 從 TaskGenerationQueue 讀取並生成任務

**流程**:
1. 從 Queue 獲取待處理任務（單一查詢，帶 JOIN 獲取完整信息）
2. 檢查是否已存在任務（避免重複生成）
3. 批量插入任務到 ActiveTasks
4. 更新 Queue 狀態為 completed

**查詢次數**: 5-15次（取決於批量大小）
- 1次：從 Queue 讀取
- N次：檢查已存在任務（可優化為批量檢查）
- 1次：批量插入任務
- 1次：查詢 task_id
- N次：更新 Queue 狀態（可優化為批量更新）

### 3. 集成到現有流程

**修改**: `handleManualTaskGeneration` 在 `backend/src/handlers/task-generator/index.js`

**新流程**:
1. 調用 `preAggregateTasks` 預聚合任務
2. 調用 `generateTasksFromQueue` 從 Queue 生成任務
3. 合併結果返回

## 優勢分析

### 查詢次數優化

**舊方案**:
- 初始查詢：1次（allDataSql）
- 每個客戶：3-4次（INSERT tasks + SELECT task_ids + INSERT stages）
- 總計：1 + 18×4 = 73次（超過50次限制）

**新方案（預聚合）**:
- 預聚合階段：1-3次
- 生成階段：5-15次
- 總計：6-18次（遠低於50次限制）

### 寫入次數優化

**舊方案**:
- 每個任務：1次寫入（INSERT ActiveTasks）
- 每個階段：1次寫入（INSERT ActiveTaskStages）
- 總計：19任務 + 19階段 = 38次寫入

**新方案（預聚合）**:
- 預聚合：批量插入 Queue（1次批量寫入）
- 生成：批量插入任務（1次批量寫入）
- 總計：2-3次批量寫入（大幅減少寫入次數）

### 處理速度優化

**舊方案**:
- 每次生成都需要複雜的 JOIN 查詢
- 每次生成都需要計算生成時間和截止日期
- 每次生成都需要檢查各種條件

**新方案（預聚合）**:
- 預聚合時一次性計算所有邏輯
- 生成時只需讀取 Queue 和插入任務
- 大幅提高處理速度

## 適用場景

### 適合使用預聚合
1. **大量數據生成**：需要生成大量任務時
2. **D1 限制嚴格**：免費版查詢和寫入限制
3. **定期生成**：Cron 觸發的定期生成
4. **性能要求高**：需要快速處理

### 不適合使用預聚合
1. **即時生成**：用戶觸發的即時生成（JIT）
2. **少量數據**：只需要生成少量任務時
3. **頻繁變更**：配置頻繁變更，預聚合數據容易過時

## 明天測試建議

1. **等待 D1 寫入限制重置**（UTC 午夜）
2. **清理舊的 Queue 數據**（如果有的話）
3. **測試預聚合方案性能**：
   - 記錄預聚合階段耗時和查詢次數
   - 記錄生成階段耗時和查詢次數
   - 記錄總寫入次數
   - 驗證能否處理更多客戶和服務
4. **對比舊方案**：如果預聚合有問題，可以回退到舊方案

## 優化建議

### 短期優化
1. **批量檢查已存在任務**：減少查詢次數
2. **批量更新 Queue 狀態**：減少查詢次數
3. **優化批量插入大小**：平衡 SQL 變數限制和查詢次數

### 長期優化
1. **增量預聚合**：只預聚合新增或變更的配置
2. **預聚合緩存**：緩存預聚合結果，避免重複計算
3. **異步預聚合**：在 Cron 觸發時異步預聚合，用戶觸發時直接生成

## 回退方案

如果預聚合方案有問題，可以：
1. 在 `handleManualTaskGeneration` 中添加開關
2. 通過環境變數控制是否使用預聚合
3. 默認使用舊方案，預聚合作為可選優化



# Design Document: BR2.5: 任務自動生成

## Overview

每日檢查並自動生成任務，包括任務生成時間計算、到期日計算、固定期限任務處理、任務生成預覽和歷史記錄功能

本功能是任務管理系統的核心模組之一，提供自動化任務生成功能，根據服務配置和任務配置自動創建需要執行的任務，減少人工配置工作。

## Steering Document Alignment

### Technical Standards (tech.md)

遵循以下技術標準：
- 使用 Cloudflare Workers Scheduled Events (Cron Triggers) 執行定時任務
- 使用 Cloudflare D1 (SQLite) 作為資料庫
- 遵循統一的錯誤處理和回應格式
- 使用參數化查詢防止 SQL 注入
- 實現任務生成歷史記錄機制
- 實現任務生成預覽功能

### Project Structure (structure.md)

遵循以下項目結構：
- 後端 Handler 位於 `backend/src/handlers/task-generator/`
- Cron 任務配置在 `backend/src/index.js` 的 `scheduled` 函數中
- 資料庫 Migration 位於 `backend/migrations/`
- 遵循命名規範：Handler 使用 kebab-case

## Code Reuse Analysis

### Existing Components to Leverage

- **generateTasksForMonth**: 現有的任務生成邏輯（位於 `backend/src/handlers/task-generator/generator-new.js`），目前使用 `advance_days` 計算生成時間（dueDate - advanceDays），需要增強以支援 `generation_time_rule`
- **calculateDueDate**: 現有的到期日計算邏輯（位於 `generator-new.js`），需要遷移到新創建的 `dateCalculators.js` 並增強
- **calculateGenerationTime**: 需要實現的生成時間計算邏輯（需創建 `backend/src/utils/dateCalculators.js` 文件，基於 generation_time_rule，需要新增欄位），如果未配置 generation_time_rule 則回退到現有的 advance_days 邏輯
- **PreviewTasksModal.vue**: 任務生成預覽組件（位於 `src/components/settings/PreviewTasksModal.vue`，已有，需增強）

### Integration Points

- **handleTaskAutoGeneration**: Cron 任務觸發的任務生成處理函數，位於 `backend/src/index.js`
- **generateTasksForMonth**: 任務生成核心邏輯，位於 `backend/src/handlers/task-generator/generator-new.js`
- **handleTaskGenerationPreview**: 任務生成預覽 API（已存在於 `backend/src/handlers/task-generator/index.js`，需增強以支援生成時間和到期日計算）
- **handleGetTaskGenerationHistory**: 任務生成歷史查詢 API（需創建 `backend/src/handlers/task-generator/task-generation-history.js`）
- **ClientServiceTaskConfigs 表**: 存儲任務配置資訊（advance_days, due_rule, due_value, days_due, is_fixed_deadline 等，其中 generation_time_rule 和 is_fixed_deadline 需要新增欄位）
- **ClientServices 表**: 存儲客戶服務資訊（execution_months, use_for_auto_generate, service_type）
- **ActiveTasks 表**: 存儲生成的任務
- **TaskGenerationHistory 表**: 存儲任務生成歷史（需通過 migration 0043 創建）
- **CronJobExecutions 表**: 存儲 Cron 任務執行歷史（已存在於 migration 0009）

## Architecture

### Component Architecture

後端採用 Cloudflare Workers Scheduled Events，定時執行任務生成：

```
Cron Trigger (每天 02:00 台灣時間)
  ↓
scheduled() 函數 (backend/src/index.js)
  ↓
handleTaskAutoGeneration()
  ↓
generateTasksForMonth() (backend/src/handlers/task-generator/generator-new.js)
  ↓
日期計算工具 (calculateGenerationTime, calculateDueDate)
  ↓
資料庫操作 (創建任務、記錄歷史)
  ↓
資料庫 (Cloudflare D1)
```

### Modular Design Principles

- **Single File Responsibility**: 每個文件只處理一個功能模組
- **Service Layer Separation**: 業務邏輯與資料庫操作分離
- **Utility Modularity**: 日期計算等工具函數獨立模組，易於測試和重用
- **Error Handling**: 完整的錯誤處理和日誌記錄機制

## Components and Interfaces

### handleTaskAutoGeneration

- **Purpose**: Cron 任務觸發的任務生成處理函數
- **Location**: `backend/src/index.js`
- **Parameters**: 
  - `env`: Cloudflare Workers 環境變數
  - `now`: 當前時間（UTC）
  - `requestId`: 請求 ID
- **Dependencies**: 
  - `generateTasksForMonth` 函數
  - CronJobExecutions 表（記錄執行歷史）
- **Reuses**: 
  - 任務生成核心邏輯
  - 日期計算工具

### generateTasksForMonth

- **Purpose**: 為指定年月生成任務的核心邏輯
- **Location**: `backend/src/handlers/task-generator/generator-new.js`
- **Parameters**: 
  - `env`: Cloudflare Workers 環境變數
  - `targetYear`: 目標年份
  - `targetMonth`: 目標月份
  - `options`: 選項（now, force 等）
- **Returns**: 
  - `{ generatedCount, skippedCount, errors }`
- **Dependencies**: 
  - 日期計算工具函數
  - 資料庫操作
- **Reuses**: 
  - 日期計算工具
  - 任務創建邏輯

### calculateGenerationTime

- **Purpose**: 計算任務生成時間
- **Location**: `backend/src/utils/dateCalculators.js`
- **Parameters**: 
  - `rule`: 生成時間規則
  - `params`: 生成時間參數
  - `serviceYear`: 服務年份
  - `serviceMonth`: 服務月份
- **Returns**: Date 對象
- **Dependencies**: 無
- **Reuses**: 無

### calculateDueDate

- **Purpose**: 計算任務到期日
- **Location**: `backend/src/utils/dateCalculators.js`（從 `generator-new.js` 遷移並增強）
- **Parameters**: 
  - `config`: 任務配置對象（包含 due_rule, due_value, days_due, is_fixed_deadline 等）
  - `serviceYear`: 服務年份
  - `serviceMonth`: 服務月份
- **Returns**: Date 對象
- **Dependencies**: 無
- **Reuses**: 現有的 calculateDueDate 邏輯（generator-new.js）

### handleTaskGenerationPreview

- **Purpose**: 處理任務生成預覽 API 請求
- **Location**: `backend/src/handlers/task-generator/index.js`
- **Parameters**: 
  - `request`: HTTP 請求對象
  - `env`: Cloudflare Workers 環境變數
  - `ctx`: 執行上下文
  - `requestId`: 請求 ID
- **Returns**: JSON 回應
- **Dependencies**: 
  - 日期計算工具函數
  - 任務配置查詢
- **Reuses**: 
  - 日期計算工具

### handleGetTaskGenerationHistory

- **Purpose**: 處理任務生成歷史查詢 API 請求
- **Location**: `backend/src/handlers/task-generator/task-generation-history.js`
- **Parameters**: 
  - `request`: HTTP 請求對象
  - `env`: Cloudflare Workers 環境變數
  - `ctx`: 執行上下文
  - `requestId`: 請求 ID
- **Returns**: JSON 回應
- **Dependencies**: 
  - 資料庫查詢
- **Reuses**: 
  - 統一回應格式工具

## Data Models

### TaskGenerationHistory

```javascript
{
  history_id: Integer (PK),
  generation_time: DateTime, // 生成時間（UTC ISO8601）
  service_year: Integer, // 服務年份
  service_month: Integer, // 服務月份
  client_id: Integer (FK -> Clients.client_id),
  client_service_id: Integer (FK -> ClientServices.client_service_id),
  service_name: String, // 服務名稱
  generated_tasks: Text, // JSON 格式字串，生成的任務列表 [{ task_id, task_name, generation_time, due_date, ... }]
  generation_status: String (success|failed|partial), // 生成狀態
  error_message: Text, // 錯誤訊息（如果失敗）
  generated_count: Integer, // 成功生成的任務數量
  skipped_count: Integer, // 跳過的任務數量
  created_at: DateTime // 記錄創建時間
}
```

### CronJobExecution

```javascript
{
  execution_id: Integer (PK),
  job_name: String, // 'task_auto_generation'
  status: String (success|failed|running),
  executed_at: DateTime, // UTC ISO8601
  details: Text, // JSON 格式字串，執行詳情（成功時記錄影響筆數等）
  error_message: Text // 錯誤訊息（失敗時）
}
```

## Error Handling

### Error Scenarios

1. **Cron 任務執行失敗**
   - **Handling**: 捕獲異常，記錄到 CronJobExecutions 表（status='failed'），記錄錯誤訊息到 error_message，不拋出異常（避免影響其他 cron 任務）
   - **User Impact**: 記錄錯誤日誌，管理員可查看執行歷史

2. **任務生成時間計算錯誤**
   - **Handling**: 捕獲日期計算錯誤，記錄錯誤，跳過該任務配置
   - **User Impact**: 記錄到生成歷史，標記為失敗或部分成功

3. **任務已存在（重複生成）**
   - **Handling**: 檢查任務是否已存在，如果存在則跳過，不報錯
   - **User Impact**: 記錄到生成歷史，標記為跳過

4. **資料庫操作失敗**
   - **Handling**: 捕獲資料庫錯誤，記錄錯誤，回滾事務（如果支援）
   - **User Impact**: 記錄到生成歷史，標記為失敗

5. **任務配置無效**
   - **Handling**: 驗證任務配置，無效配置跳過並記錄警告
   - **User Impact**: 記錄到生成歷史，標記為跳過

## Testing Strategy

### Unit Testing

- **日期計算測試**: 測試各種生成時間和到期日規則的計算邏輯
- **任務生成邏輯測試**: 測試任務生成的核心邏輯
- **固定期限任務處理測試**: 測試固定期限任務的處理邏輯
- **測試框架**: 建議使用 Vitest

### Integration Testing

- **API 整合測試**: 測試任務生成預覽和歷史查詢 API
- **資料庫整合測試**: 測試任務生成和歷史記錄的資料庫操作
- **測試框架**: 建議使用 Vitest + MSW (Mock Service Worker)

### End-to-End Testing

- **E2E 測試**: 使用 Playwright 測試完整用戶流程
- **測試場景**: 
  - 任務生成預覽功能
  - 任務生成歷史查看
  - 手動觸發任務生成（測試用）
- **Cron 任務測試**: 需要模擬 Cron 觸發或手動觸發測試
- **測試數據**: 使用測試工具函數設置測試數據
- **測試帳號**: 使用 `admin`/`111111` 管理員帳號和 `liu`/`111111` 員工帳號



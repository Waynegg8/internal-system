# 任務配置 API 文檔

本文檔描述任務配置相關的所有 API 端點，包括請求格式、響應格式、參數說明和示例。

## 基礎信息

- **Base URL**: `/api/v2`
- **認證**: 所有端點都需要身份驗證（使用 `session` cookie）
- **Content-Type**: `application/json`
- **字符編碼**: UTF-8

## 通用響應格式

### 成功響應

```json
{
  "ok": true,
  "code": "OK",
  "message": "操作成功",
  "data": { ... },
  "meta": {
    "requestId": "req_...",
    "version": "1.0.1"
  }
}
```

### 錯誤響應

```json
{
  "ok": false,
  "code": "ERROR_CODE",
  "message": "錯誤描述",
  "errors": { ... },
  "meta": {
    "requestId": "req_..."
  }
}
```

### HTTP 狀態碼

- `200 OK`: 操作成功
- `400 BAD_REQUEST`: 請求格式錯誤
- `401 UNAUTHORIZED`: 未登入或身份驗證失敗
- `403 FORBIDDEN`: 無權限執行此操作
- `404 NOT_FOUND`: 資源不存在
- `422 VALIDATION_ERROR`: 驗證失敗
- `500 INTERNAL_ERROR`: 伺服器錯誤

## 權限要求

所有任務配置操作都需要以下權限之一：
- **管理員** (`is_admin = true`)
- **客戶負責人** (客戶的 `assignee_user_id` 等於當前用戶的 `user_id`)

---

## API 端點

### 1. 獲取任務配置列表

獲取指定客戶服務的所有任務配置。

**端點**: `GET /api/v2/clients/:clientId/services/:clientServiceId/task-configs`

**路徑參數**:
- `clientId` (string, 必填): 客戶 ID
- `clientServiceId` (number, 必填): 客戶服務 ID

**請求示例**:
```http
GET /api/v2/clients/123/services/456/task-configs
Cookie: session=...
```

**響應示例**:
```json
{
  "ok": true,
  "code": "OK",
  "message": "查詢成功",
  "data": [
    {
      "config_id": 1,
      "task_name": "記帳",
      "task_description": "每月記帳作業",
      "assignee_user_id": 5,
      "estimated_hours": 8.0,
      "advance_days": 7,
      "due_rule": "end_of_month",
      "due_value": null,
      "days_due": null,
      "stage_order": 1,
      "execution_frequency": "monthly",
      "execution_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      "auto_generate": true,
      "notes": "注意事項",
      "sops": [
        {
          "sop_id": 10,
          "title": "記帳 SOP",
          "category": "ACCOUNTING",
          "scope": "task"
        }
      ]
    }
  ],
  "meta": {
    "requestId": "req_abc123",
    "version": "1.0.1"
  }
}
```

**響應字段說明**:
- `config_id` (number): 配置 ID
- `task_name` (string): 任務名稱
- `task_description` (string, 可選): 任務描述
- `assignee_user_id` (number, 可選): 負責人用戶 ID
- `estimated_hours` (number, 可選): 預估工時（小時）
- `advance_days` (number): 提前天數（默認 7）
- `due_rule` (string): 到期日規則類型（舊規則）
- `due_value` (number, 可選): 到期日規則參數（舊規則）
- `days_due` (number, 可選): 新規則：從服務月份開始日加上的天數（優先使用）
- `stage_order` (number): 階段編號（從 1 開始）
- `execution_frequency` (string): 執行頻率（默認 "monthly"）
- `execution_months` (array<number>): 執行月份列表（1-12，默認全部月份）
- `auto_generate` (boolean): 是否用於自動生成任務（默認 true）
- `notes` (string, 可選): 備註
- `sops` (array): 關聯的 SOP 列表
  - `sop_id` (number): SOP ID
  - `title` (string): SOP 標題
  - `category` (string): SOP 分類
  - `scope` (string): SOP 層級（"service" 或 "task"）

**錯誤響應**:
- `401 UNAUTHORIZED`: 未登入或身份驗證失敗
- `403 FORBIDDEN`: 無權限查看此客戶服務的任務配置
- `404 NOT_FOUND`: 客戶服務不存在

---

### 2. 創建任務配置

為指定客戶服務創建新的任務配置。

**端點**: `POST /api/v2/clients/:clientId/services/:clientServiceId/task-configs`

**路徑參數**:
- `clientId` (string, 必填): 客戶 ID
- `clientServiceId` (number, 必填): 客戶服務 ID

**請求體**:
```json
{
  "task_name": "記帳",
  "task_description": "每月記帳作業",
  "assignee_user_id": 5,
  "estimated_hours": 8.0,
  "advance_days": 7,
  "due_rule": "end_of_month",
  "due_value": null,
  "days_due": 30,
  "stage_order": 1,
  "execution_frequency": "monthly",
  "execution_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  "auto_generate": true,
  "notes": "注意事項",
  "sop_ids": [10, 11]
}
```

**請求字段說明**:
- `task_name` (string, **必填**): 任務名稱
- `task_description` (string, 可選): 任務描述
- `assignee_user_id` (number, 可選): 負責人用戶 ID
- `estimated_hours` (number, 可選): 預估工時（小時，正數）
- `advance_days` (number, 可選): 提前天數（默認 7）
- `due_rule` (string, 可選): 到期日規則類型（舊規則，當 `days_due` 為空時使用）
  - 可選值: `"end_of_month"`, `"specific_day"`, `"next_month_day"`, `"days_after_start"`, `"service_month_end"`, `"fixed_date"`, `"next_month_end"`, `"n_months_end"`, `"fixed_deadline"`, `"daysAfterStart"`
- `due_value` (number, 可選): 到期日規則參數（舊規則，根據 `due_rule` 類型不同而不同）
- `days_due` (number, 可選): 新規則：從服務月份開始日加上的天數（優先使用，必須 >= 0）
- `stage_order` (number, 可選): 階段編號（從 1 開始，默認 0）
- `execution_frequency` (string, 可選): 執行頻率（默認 "monthly"）
- `execution_months` (array<number>, 可選): 執行月份列表（1-12，默認全部月份）
- `auto_generate` (boolean, 可選): 是否用於自動生成任務（默認 true）
- `notes` (string, 可選): 備註
- `sop_ids` (array<number>, 可選): 關聯的 SOP ID 列表

**請求示例**:
```http
POST /api/v2/clients/123/services/456/task-configs
Content-Type: application/json
Cookie: session=...

{
  "task_name": "記帳",
  "stage_order": 1,
  "days_due": 30,
  "estimated_hours": 8.0,
  "sop_ids": [10]
}
```

**響應示例**:
```json
{
  "ok": true,
  "code": "OK",
  "message": "任務配置已創建",
  "data": {
    "config_id": 1
  },
  "meta": {
    "requestId": "req_abc123",
    "version": "1.0.1"
  }
}
```

**錯誤響應**:
- `400 BAD_REQUEST`: 請求格式錯誤
- `401 UNAUTHORIZED`: 未登入或身份驗證失敗
- `403 FORBIDDEN`: 無權限為此客戶服務新增任務配置
- `404 NOT_FOUND`: 客戶服務不存在
- `422 VALIDATION_ERROR`: 驗證失敗（例如：任務名稱為必填）

---

### 3. 更新任務配置

更新指定任務配置的信息。

**端點**: `PUT /api/v2/clients/:clientId/services/:clientServiceId/task-configs/:configId`

**路徑參數**:
- `clientId` (string, 必填): 客戶 ID
- `clientServiceId` (number, 必填): 客戶服務 ID
- `configId` (number, 必填): 任務配置 ID

**請求體**:
```json
{
  "task_name": "記帳（更新）",
  "task_description": "每月記帳作業（已更新）",
  "assignee_user_id": 6,
  "estimated_hours": 10.0,
  "advance_days": 7,
  "due_rule": "end_of_month",
  "due_value": null,
  "days_due": 30,
  "stage_order": 1,
  "execution_frequency": "monthly",
  "execution_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  "auto_generate": true,
  "notes": "更新後的備註",
  "sop_ids": [10, 11, 12]
}
```

**請求字段說明**: 與創建任務配置相同（所有字段都是可選的，但至少需要提供一個字段）

**請求示例**:
```http
PUT /api/v2/clients/123/services/456/task-configs/1
Content-Type: application/json
Cookie: session=...

{
  "task_name": "記帳（更新）",
  "estimated_hours": 10.0,
  "sop_ids": [10, 11]
}
```

**響應示例**:
```json
{
  "ok": true,
  "code": "OK",
  "message": "任務配置已更新",
  "data": {
    "config_id": 1
  },
  "meta": {
    "requestId": "req_abc123",
    "version": "1.0.1"
  }
}
```

**錯誤響應**:
- `400 BAD_REQUEST`: 請求格式錯誤
- `401 UNAUTHORIZED`: 未登入或身份驗證失敗
- `403 FORBIDDEN`: 無權限修改此任務配置
- `404 NOT_FOUND`: 任務配置不存在
- `422 VALIDATION_ERROR`: 驗證失敗

---

### 4. 刪除任務配置

刪除指定的任務配置（軟刪除）。

**端點**: `DELETE /api/v2/clients/:clientId/services/:clientServiceId/task-configs/:configId`

**路徑參數**:
- `clientId` (string, 必填): 客戶 ID
- `clientServiceId` (number, 必填): 客戶服務 ID
- `configId` (number, 必填): 任務配置 ID

**請求示例**:
```http
DELETE /api/v2/clients/123/services/456/task-configs/1
Cookie: session=...
```

**響應示例**:
```json
{
  "ok": true,
  "code": "OK",
  "message": "任務配置已刪除",
  "data": {
    "config_id": 1
  },
  "meta": {
    "requestId": "req_abc123",
    "version": "1.0.1"
  }
}
```

**錯誤響應**:
- `401 UNAUTHORIZED`: 未登入或身份驗證失敗
- `403 FORBIDDEN`: 無權限刪除此任務配置
- `404 NOT_FOUND`: 任務配置不存在

---

### 5. 批量保存任務配置

批量保存任務配置（用於新增/編輯客戶服務時）。此端點會刪除現有的所有任務配置，然後創建新的配置。

**端點**: `POST /api/v2/clients/:clientId/services/:clientServiceId/task-configs/batch`

**路徑參數**:
- `clientId` (string, 必填): 客戶 ID
- `clientServiceId` (number, 必填): 客戶服務 ID

**請求體**:
```json
{
  "tasks": [
    {
      "name": "記帳",
      "description": "每月記帳作業",
      "assignee_user_id": 5,
      "estimated_hours": 8.0,
      "advance_days": 7,
      "due_rule": "end_of_month",
      "due_value": null,
      "days_due": 30,
      "stage_order": 1,
      "execution_frequency": "monthly",
      "execution_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      "auto_generate": true,
      "notes": "注意事項",
      "sop_ids": [10, 11]
    },
    {
      "name": "報稅",
      "stage_order": 2,
      "days_due": 45,
      "estimated_hours": 4.0,
      "sop_ids": [12]
    }
  ],
  "service_sops": [20, 21]
}
```

**請求字段說明**:
- `tasks` (array, **必填**): 任務配置列表
  - 每個任務配置對象的字段與創建任務配置相同，但字段名可以使用 `name` 或 `task_name`
  - `name` 或 `task_name` (string, **必填**): 任務名稱
  - 其他字段與創建任務配置相同
- `service_sops` (array<number>, 可選): 服務層級的 SOP ID 列表

**請求示例**:
```http
POST /api/v2/clients/123/services/456/task-configs/batch
Content-Type: application/json
Cookie: session=...

{
  "tasks": [
    {
      "name": "記帳",
      "stage_order": 1,
      "days_due": 30,
      "estimated_hours": 8.0,
      "sop_ids": [10]
    },
    {
      "name": "報稅",
      "stage_order": 2,
      "days_due": 45,
      "estimated_hours": 4.0,
      "sop_ids": [12]
    }
  ],
  "service_sops": [20, 21]
}
```

**響應示例**:
```json
{
  "ok": true,
  "code": "OK",
  "message": "任務配置已保存",
  "data": {
    "config_ids": [1, 2]
  },
  "meta": {
    "requestId": "req_abc123",
    "version": "1.0.1"
  }
}
```

**響應字段說明**:
- `config_ids` (array<number>): 創建的任務配置 ID 列表（按順序）

**錯誤響應**:
- `400 BAD_REQUEST`: 請求格式錯誤
- `401 UNAUTHORIZED`: 未登入或身份驗證失敗
- `403 FORBIDDEN`: 無權限批量保存此客戶服務的任務配置
- `404 NOT_FOUND`: 客戶服務不存在
- `422 VALIDATION_ERROR`: 驗證失敗（例如：`tasks` 必須為陣列，任務名稱不能為空）
- `500 INTERNAL_ERROR`: 保存任務配置時發生錯誤

---

## 到期日規則說明

### 新規則（優先使用）

使用 `days_due` 字段，表示從服務月份開始日加上的天數。

**示例**:
- `days_due: 30` → 服務月份 1 日 + 30 天 = 服務月份 31 日（或該月最後一天）

### 舊規則（回退使用）

當 `days_due` 為空時，使用 `due_rule` 和 `due_value`。

**規則類型**:

1. **`end_of_month`** / **`service_month_end`**
   - 描述: 服務月份結束時
   - 參數: 無需 `due_value`
   - 示例: 3 月的任務到期日為 3 月 31 日

2. **`specific_day`** / **`fixed_date`**
   - 描述: 固定日期（每月 X 日）
   - 參數: `due_value` 為日期（1-31）
   - 示例: `due_value: 15` → 每月 15 日（如果該月沒有 15 日，則為該月最後一天）

3. **`next_month_day`** / **`next_month_end`**
   - 描述: 下個月結束時或下個月的第 X 天
   - 參數: `due_value` 為日期（1-31，可選）
   - 示例: 3 月的任務到期日為 4 月 30 日

4. **`n_months_end`**
   - 描述: N 個月後結束
   - 參數: `due_value` 為月數（>= 1）
   - 示例: `due_value: 2` → 服務月份後 2 個月的最後一天

5. **`fixed_deadline`**
   - 描述: 固定期限（指定年月日）
   - 參數: `due_value` 為包含 `year`, `month`, `day` 的對象
   - 示例: `due_value: { year: 2024, month: 3, day: 15 }` → 2024 年 3 月 15 日

6. **`days_after_start`**
   - 描述: 服務月份開始後 N 天
   - 參數: `due_value` 為天數（>= 0）
   - 示例: `due_value: 20` → 服務月份 1 日 + 20 天

---

## 生成時間規則說明

生成時間規則用於控制任務何時自動生成（前端預覽使用，後端任務生成邏輯參考此規則）。

**規則類型**:

1. **`service_month_start`**
   - 描述: 服務月份開始時
   - 參數: 無需參數
   - 示例: 3 月的任務在 3 月 1 日生成

2. **`prev_month_last_x_days`**
   - 描述: 服務月份前一個月的最後 X 天
   - 參數: `days` (1-31)
   - 示例: `days: 3` → 3 月的任務在 2 月的最後 3 天生成（2 月 28/29 日、27 日、26 日）

3. **`prev_month_x_day`**
   - 描述: 服務月份前一個月的第 X 天
   - 參數: `day` (1-31)
   - 示例: `day: 25` → 3 月的任務在 2 月 25 日生成（如果該月沒有 25 日，則為該月最後一天）

4. **`next_month_start`**
   - 描述: 服務月份後一個月開始時
   - 參數: 無需參數
   - 示例: 1 月的任務在 2 月 1 日生成

5. **`monthly_x_day`**
   - 描述: 每月 X 日
   - 參數: `day` (1-31)
   - 示例: `day: 15` → 3 月的任務在 3 月 15 日生成（如果該月沒有 15 日，則為該月最後一天）

---

## 完整示例

### 創建完整的任務配置

```http
POST /api/v2/clients/123/services/456/task-configs
Content-Type: application/json
Cookie: session=...

{
  "task_name": "記帳",
  "task_description": "每月記帳作業，包含所有交易記錄",
  "assignee_user_id": 5,
  "estimated_hours": 8.0,
  "advance_days": 7,
  "days_due": 30,
  "stage_order": 1,
  "execution_frequency": "monthly",
  "execution_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  "auto_generate": true,
  "notes": "請注意核對所有交易記錄",
  "sop_ids": [10, 11]
}
```

### 批量保存多個任務配置

```http
POST /api/v2/clients/123/services/456/task-configs/batch
Content-Type: application/json
Cookie: session=...

{
  "tasks": [
    {
      "name": "記帳",
      "stage_order": 1,
      "days_due": 30,
      "estimated_hours": 8.0,
      "sop_ids": [10]
    },
    {
      "name": "報稅",
      "stage_order": 2,
      "days_due": 45,
      "estimated_hours": 4.0,
      "sop_ids": [12]
    },
    {
      "name": "財務報表",
      "stage_order": 3,
      "due_rule": "end_of_month",
      "estimated_hours": 2.0,
      "sop_ids": [13]
    }
  ],
  "service_sops": [20, 21]
}
```

---

## 注意事項

1. **權限檢查**: 所有操作都需要管理員權限或客戶負責人權限
2. **階段編號唯一性**: 同一服務下的任務配置不能有重複的階段編號
3. **軟刪除**: 刪除操作是軟刪除，不會真正刪除數據
4. **批量保存**: 批量保存會刪除現有的所有任務配置，然後創建新的配置
5. **SOP 關聯**: 更新任務配置時，如果提供 `sop_ids`，會先刪除舊的關聯，然後創建新的關聯
6. **到期日規則優先級**: 新規則（`days_due`）優先於舊規則（`due_rule` / `due_value`）
7. **執行月份**: 如果未提供 `execution_months`，默認為所有月份（1-12）

---

## 版本歷史

- **v1.0.1**: 初始版本，支持任務配置的 CRUD 操作和批量保存




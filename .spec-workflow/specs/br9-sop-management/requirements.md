# Requirements Document: BR9: SOP 管理

## Introduction

SOP（Standard Operating Procedures）管理功能，建立、維護並關聯 SOP，支援服務層級與任務層級 SOP，供任務生成時自動套用與查閱。

本功能是知識庫系統的核心模組之一，與任務管理系統緊密整合，支援服務層級和任務層級 SOP，並在創建任務時自動套用相關 SOP。

**User Story**: 作為會計師事務所的員工，我需要建立和管理標準作業程序（SOP），以便能夠在創建任務時自動套用相關 SOP，提升工作效率和作業一致性。

## Alignment with Product Vision

本功能支持知識庫管理系統的核心目標：
- **提升作業一致性**：透過標準作業程序確保所有員工遵循相同的作業流程
- **提升工作效率**：自動套用相關 SOP，減少手動選擇和查找時間
- **知識管理**：集中管理 SOP，方便維護和更新
- **支援審計追蹤**：版本號追蹤 SOP 變更，支援審計需求

## Requirements

### BR9.1: SOP 建立/編輯

**User Story**: 作為員工，我需要建立和編輯 SOP，以便能夠維護標準作業程序。

#### 驗收標準
- WHEN 建立 SOP THEN 系統 SHALL 支援以下必填欄位：標題、層級（service/task）、服務類型、內容（富文本）
- WHEN 建立 SOP THEN 系統 SHALL 支援以下可選欄位：客戶（未綁定客戶則為通用 SOP）、標籤（多選）
- WHEN 建立 SOP THEN 系統 SHALL 保存版本號（初始版本為 1）
- WHEN 更新 SOP THEN 系統 SHALL 自動將版本號 +1（任何欄位更新都會增加版本號）
- WHEN 更新 SOP THEN 系統 SHALL 不保存歷史版本（舊版本內容不可恢復）

### BR9.1.1: SOP 編輯表單

**User Story**: 作為員工，我需要編輯 SOP，以便更新 SOP 內容。

#### 驗收標準
1. WHEN 員工打開 SOP 編輯表單時 THEN 系統 SHALL 預填現有 SOP 的所有資訊
2. WHEN 員工編輯 SOP 時 THEN 系統 SHALL 允許修改以下欄位：
   - 標題（`title`，必填，文字輸入）
   - 層級（`scope`，必填，下拉選擇：服務層級/任務層級）
   - 服務類型分類（`category`，必填，下拉選擇）
   - 客戶（`client_id`，可選，下拉選擇）
   - 標籤（`tags`，可選，多選）
   - 內容（`content`，必填，富文本編輯器）
3. WHEN 員工編輯 SOP 時 THEN 系統 SHALL 顯示建立者和建立時間（唯讀，不可修改）
4. WHEN 員工編輯 SOP 時 THEN 系統 SHALL 顯示當前版本號（唯讀，不可修改）

### BR9.1.2: 編輯時必填欄位驗證

**User Story**: 作為員工，我需要確保編輯後的 SOP 仍然包含所有必填欄位。

#### 驗收標準
1. WHEN 員工提交 SOP 編輯表單時 THEN 系統 SHALL 驗證以下必填欄位：
   - 標題（`title`）：不能為空，不能只包含空白字符
   - 層級（`scope`）：必須選擇服務層級或任務層級
   - 服務類型分類（`category`）：必須選擇一個服務類型
   - 內容（`content`）：不能為空，不能只包含空白字符或空 HTML 標籤（如 `<p><br></p>`）
2. WHEN 員工將必填欄位更新為空時 THEN 系統 SHALL 顯示錯誤訊息並阻止提交
3. WHEN 員工將內容更新為空或只包含空白字符時 THEN 系統 SHALL 顯示錯誤訊息並阻止提交

### BR9.1.3: SOP 更新提交

**User Story**: 作為員工，我需要提交 SOP 編輯表單，以便保存更新後的 SOP。

#### 驗收標準
1. WHEN 員工提交有效的 SOP 編輯表單時 THEN 系統 SHALL 更新 SOP 記錄
2. WHEN 系統更新 SOP 時 THEN 系統 SHALL 自動將版本號 +1
3. WHEN 系統更新 SOP 時 THEN 系統 SHALL 自動更新最後更新時間（`updated_at`，當前時間）
4. WHEN 系統更新 SOP 時 THEN 系統 SHALL 不修改建立者（`created_by`）和建立時間（`created_at`）
5. WHEN SOP 更新成功時 THEN 系統 SHALL 顯示成功訊息並刷新 SOP 詳情或列表
6. WHEN SOP 更新失敗時 THEN 系統 SHALL 顯示錯誤訊息並保持表單狀態

### BR9.1.4: SOP 刪除功能

**User Story**: 作為員工，我需要刪除不再需要的 SOP。

#### 驗收標準
1. WHEN 員工確認刪除 SOP 時 THEN 系統 SHALL 執行軟刪除（設置 `is_deleted = 1`，不實際刪除記錄）
2. WHEN 系統刪除 SOP 時 THEN 系統 SHALL 自動更新最後更新時間（`updated_at`，當前時間）
3. WHEN SOP 刪除成功時 THEN 系統 SHALL 顯示成功訊息並從列表中移除該 SOP
4. WHEN SOP 刪除失敗時 THEN 系統 SHALL 顯示錯誤訊息

### BR9.1.5: 刪除確認

**User Story**: 作為員工，我需要確認刪除操作，以免誤刪 SOP。

#### 驗收標準
1. WHEN 員工點擊刪除按鈕時 THEN 系統 SHALL 顯示確認對話框
2. WHEN 確認對話框顯示時 THEN 系統 SHALL 顯示 SOP 的標題，以便確認
3. WHEN 員工確認刪除時 THEN 系統 SHALL 執行刪除操作
4. WHEN 員工取消刪除時 THEN 系統 SHALL 取消操作，不執行刪除

### BR9.2: SOP 關聯規則

**User Story**: 作為員工，我需要將 SOP 關聯到服務類型和客戶，以便能夠正確分類和管理 SOP。

#### 驗收標準
- WHEN 建立 SOP THEN 系統 SHALL 要求每個 SOP 必須關聯一個服務類型（category）
- WHEN 建立 SOP THEN 系統 SHALL 支援選擇特定客戶（客戶專屬 SOP）或不選擇客戶（通用 SOP）
- WHEN 建立 SOP THEN 系統 SHALL 要求每個 SOP 必須明確指定層級（service 或 task）
- WHEN 建立 SOP THEN 系統 SHALL 區分服務層級（service）和任務層級（task）

### BR9.3: 服務層級 SOP 自動勾選

**User Story**: 作為員工，我在創建任務時選擇服務後，系統應該自動勾選符合條件的服務層級 SOP。

#### 驗收標準
- WHEN 創建任務並選擇服務 THEN 系統 SHALL 自動勾選符合條件的服務層級 SOP
- WHEN 服務層級 SOP 自動勾選 THEN 符合條件為：`scope = 'service'` 且 `category = 服務類型` 且（`client_id = 任務客戶` 或 `client_id IS NULL`）
- WHEN 服務層級 SOP 自動勾選 THEN 用戶 SHALL 可以取消勾選或手動勾選其他 SOP
- WHEN 服務層級 SOP 自動勾選 THEN 綁定方式為直接關聯（引用 SOP ID），SOP 更新時任務中看到的內容也會更新

### BR9.4: 任務層級 SOP 自動勾選

**User Story**: 作為員工，我在創建任務時新增任務項目後，系統應該自動勾選符合條件的任務層級 SOP。

#### 驗收標準
- WHEN 創建任務並新增任務項目 THEN 系統 SHALL 自動勾選符合條件的任務層級 SOP
- WHEN 任務層級 SOP 自動勾選 THEN 符合條件為：`scope = 'task'` 且 `category = 服務類型` 且（`client_id = 任務客戶` 或 `client_id IS NULL`）
- WHEN 任務層級 SOP 自動勾選 THEN 用戶 SHALL 可以取消勾選或手動勾選其他 SOP
- WHEN 任務層級 SOP 自動勾選 THEN 綁定方式為直接關聯（引用 SOP ID），SOP 更新時任務中看到的內容也會更新
- WHEN 編輯已存在的任務 THEN 系統 SHALL 不自動勾選新的 SOP（維持現有 SOP 關聯）

### BR9.5: SOP 可見性控制

**User Story**: 作為員工，我需要根據客戶和層級查看相關的 SOP，以便能夠選擇正確的 SOP。

#### 驗收標準
- WHEN 在 SOP 列表頁 THEN 系統 SHALL 顯示所有 SOP（通用 + 所有客戶專屬），可選客戶篩選
- WHEN 在任務中選擇 SOP THEN 系統 SHALL 只顯示「通用 SOP」和「該任務所屬客戶的專屬 SOP」
- WHEN 在任務中選擇 SOP THEN 系統 SHALL 不顯示其他客戶的專屬 SOP
- WHEN 選擇服務層級 SOP THEN 系統 SHALL 不顯示任務層級 SOP（反之亦然）

### BR9.6: SOP 搜尋/篩選

**User Story**: 作為員工，我需要搜尋和篩選 SOP，以便能夠快速找到目標 SOP。

#### 驗收標準
- WHEN 搜尋 SOP THEN 系統 SHALL 依關鍵字搜尋標題和標籤
- WHEN 篩選 SOP THEN 系統 SHALL 支援以下篩選條件：
  - 層級（全部/服務層級/任務層級）
  - 服務類型
  - 客戶（可選，選擇後顯示通用 SOP + 該客戶的專屬 SOP）
  - 標籤（多選）
  - 日期（年月）
- WHEN 選擇客戶篩選 THEN 系統 SHALL 顯示通用 SOP + 該客戶的專屬 SOP

### BR9.7: SOP 關聯與更新

**User Story**: 作為員工，我需要確保 SOP 更新後，已關聯到任務的 SOP 顯示最新內容。

#### 驗收標準
- WHEN SOP 更新內容 THEN 已關聯到任務的 SOP SHALL 顯示最新版本內容（因為是直接關聯引用）
- WHEN 任務已關聯 SOP THEN 系統 SHALL 保持關聯關係，不受 SOP 更新影響（除非手動修改）

## Non-Functional Requirements

### Code Architecture and Modularity

- 前端組件應遵循 Vue 3 Composition API 模式
- 組件應保持單一職責，可重用性高
- API 調用應統一封裝，錯誤處理一致
- 後端 Handler 應遵循單一職責原則

### Performance

- API 響應時間 < 500ms（SOP 列表查詢）
- 頁面載入時間 < 2 秒（SOP 列表頁）
- SOP 自動勾選響應時間 < 300ms（任務創建時自動勾選 SOP）
- 富文本編輯器載入時間 < 1 秒

### Security

- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證
- 富文本內容需過濾 XSS 攻擊
- 遵循 Cookie-based Session 認證機制

### Reliability

- 系統可用性目標：99.9%
- 錯誤處理應優雅降級，不影響用戶體驗
- 自動勾選 SOP 失敗時，不影響任務創建流程

### Usability

- 界面簡潔，操作流程直觀
- 編輯流程清晰
- 錯誤訊息明確
- 表單驗證即時反饋
- 刪除確認明確
- 自動勾選的 SOP 可以取消勾選
- 搜尋和篩選功能易於使用

## Business Rules

### 層級區分
- 服務層級 SOP 不出現在任務層級 SOP 選項中（反之亦然）
- 每個 SOP 必須明確指定層級（service 或 task）

### 客戶專屬 SOP
- 客戶專屬 SOP（`client_id` 不為 NULL）僅在該客戶相關的任務中可見
- 通用 SOP（`client_id` 為 NULL）在所有任務中都可見
- 在任務中選擇 SOP 時，只顯示通用 SOP 和該任務所屬客戶的專屬 SOP

### 自動勾選規則
- 自動勾選的 SOP 必須同時滿足以下條件：
  - 層級匹配（服務層級或任務層級）
  - 服務類型匹配（category = 服務類型）
  - 客戶匹配（`client_id = 任務客戶` 或 `client_id IS NULL`）
- 自動勾選的 SOP 可以取消勾選
- 用戶可以手動勾選其他符合條件的 SOP
- 只在創建任務時自動勾選，編輯已存在的任務時不自動勾選

### 版本管理
- 每次更新 SOP 時，版本號自動 +1
- 不保存歷史版本，更新後舊版本內容不可恢復
- 版本號僅用於標識當前版本，不支援版本回滾

### SOP 關聯方式
- 任務與 SOP 的關聯採用直接引用方式（存儲 SOP ID）
- SOP 內容更新時，任務中看到的 SOP 內容也會更新（顯示最新版本）
- 已關聯的 SOP 不會因為 SOP 更新而自動解除關聯

## Technical Implementation Notes

### 資料庫欄位
- `version`：版本號（INTEGER，預設 1，更新時自動 +1）
- `scope`：適用層級（TEXT，'service' 或 'task'）
- `category`：服務類型（TEXT，對應服務的 service_code）
- `client_id`：客戶 ID（TEXT，NULL 表示通用 SOP）
- `is_published`：已存在但前端不使用（所有 SOP 都視為可用）

### 前端實作重點
1. **TasksNew.vue**：
   - `handleServiceChange`：選擇服務時自動勾選服務層級 SOP
   - `addTask`：新增任務時自動勾選任務層級 SOP
   - 確保自動勾選的 SOP 可以取消勾選

2. **ManageSOPModal.vue**：
   - 新增 `clientId` prop
   - 過濾邏輯：只顯示通用 SOP 和該任務客戶的專屬 SOP
   - 層級過濾：服務層級和任務層級分開顯示

3. **TaskSOPList.vue**：
   - 新增 `clientId` prop 並傳給 `ManageSOPModal`

### 後端 API
- 確保返回的 SOP 列表正確過濾客戶專屬 SOP
- 確保版本號更新邏輯正確（任何欄位更新都 +1）

### 路由
- SOP 列表：`/knowledge/sop`
- SOP 詳情：`/knowledge/sop/:id`（支援直接編輯，參考 BR10 FAQ 詳情頁）



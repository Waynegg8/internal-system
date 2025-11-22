# Requirements Document: BR6.1: 工時填報

## Introduction

工時填報功能提供員工記錄每日工時與任務耗時的核心界面。本功能支援選擇客戶、服務項目、任務類型、工時類型，並記錄時數，為薪資與績效提供依據。

**User Story**: 作為會計師事務所的員工，我需要填寫工時記錄，以便記錄每日工作內容和工時，為薪資計算和績效評估提供依據。

**路由**
- 工時填報：`/timesheets`

## Alignment with Product Vision

本功能支持工時記錄系統的核心目標：
- **準確記錄工時**：提供完整的工時填報界面，確保工時記錄準確
- **關聯任務與客戶**：將工時記錄與客戶、服務項目、任務類型關聯，便於後續分析
- **支援多種工時類型**：支援正常工時和各種加班類型，符合勞基法規定
- **數據完整性**：確保任務類型必填，只能選擇已配置的任務類型

## Requirements

### BR6.1.1: 工時填報欄位

**User Story**: 作為員工，我需要填寫工時記錄的基本欄位，以便記錄工作內容。

#### 驗收標準
- WHEN 員工填寫工時記錄時 THEN 系統 SHALL 提供以下欄位：
  - 日期（自動帶入當前週的日期）
  - 客戶（下拉選擇，必填）
  - 服務項目（下拉選擇，必填，根據客戶動態載入）
  - 任務類型（下拉選擇，必填，根據客戶和服務項目動態載入）
  - 工時類型（下拉選擇，必填）
  - 時數（數字輸入，必填）
- WHEN 員工選擇客戶時 THEN 系統 SHALL 動態載入該客戶的服務項目列表
- WHEN 員工選擇服務項目時 THEN 系統 SHALL 動態載入該客戶該服務項目已配置的任務類型列表

### BR6.1.2: 任務類型選擇

**User Story**: 作為員工，我需要選擇任務類型，以便準確記錄工作內容。

#### 驗收標準
- WHEN 員工選擇任務類型時 THEN 系統 SHALL 只顯示該客戶該服務項目已配置的任務類型（通過 `ClientServiceTaskConfigs` 關聯 `ServiceItems`）
- WHEN 任務類型列表為空時 THEN 系統 SHALL 顯示提示「該客戶該服務項目尚未配置任務類型」
- WHEN 員工未選擇任務類型時 THEN 系統 SHALL 阻止提交並提示「請選擇任務類型」
- WHEN 前端發送工時記錄時 THEN 系統 SHALL 發送 `service_item_id`（數字）到後端
- WHEN 後端接收 `service_item_id` 時 THEN 系統 SHALL 查詢 `ServiceItems` 表取得 `item_name` 並存儲到 `task_type` 欄位

### BR6.1.3: 工時類型選擇

**User Story**: 作為員工，我需要選擇工時類型，以便區分正常工時和加班工時。

#### 驗收標準
- WHEN 員工選擇工時類型時 THEN 系統 SHALL 提供以下11種工時類型：
  - 一般（正常工時，ID: 1）
  - 平日OT前2h（ID: 2）
  - 平日OT後2h（ID: 3）
  - 休息日前2h（ID: 4）
  - 休息日3-8h（ID: 5）
  - 休息日9-12h（ID: 6）
  - 國定8h內（ID: 7）
  - 國定9-10h（ID: 8）
  - 國定11-12h（ID: 9）
  - 例假8h內（ID: 10）
  - 例假9-12h（ID: 11）
- WHEN 員工選擇工時類型時 THEN 系統 SHALL 根據日期類型動態過濾可用的工時類型（見 BR6.2）
- WHEN 前端發送工時記錄時 THEN 系統 SHALL 發送 `work_type`（數字 ID，1-11）到後端

### BR6.1.4: 時數輸入

**User Story**: 作為員工，我需要輸入工時時數，以便記錄工作時長。

#### 驗收標準
- WHEN 員工輸入時數時 THEN 系統 SHALL 限制輸入範圍為 0.5 - 12 小時
- WHEN 員工輸入時數時 THEN 系統 SHALL 驗證時數必須是 0.5 的倍數
- WHEN 員工輸入非 0.5 倍數的時數時 THEN 系統 SHALL 自動四捨五入到 0.5 小時
- WHEN 員工輸入時數時 THEN 系統 SHALL 支援小數點後 1 位精度
- WHEN 員工輸入超出範圍的時數時 THEN 系統 SHALL 阻止提交並提示「時數必須在 0.5 - 12 小時之間」

### BR6.1.5: 工時記錄合併邏輯

**User Story**: 作為員工，我需要系統自動合併相同組合的工時記錄，以便在同一行顯示。

#### 驗收標準
- WHEN 系統建立表格行時 THEN 系統 SHALL 使用以下唯一性判斷：`user_id + client_id + service_id + service_item_id + work_type_id`
- WHEN 同一任務、同一工時類型、同一天的工時存在多筆記錄時 THEN 系統 SHALL 自動合併為同一行，累加時數
- WHEN 同一任務、不同工時類型、同一天的工時存在時 THEN 系統 SHALL 分成不同行
- WHEN 不同任務、同一工時類型、同一天的工時存在時 THEN 系統 SHALL 分成不同行
- WHEN 不同客戶、相同服務項目和任務類型、同一天的工時存在時 THEN 系統 SHALL 分成不同行
- WHEN 系統累加工時時 THEN 系統 SHALL 自動四捨五入到 0.5 小時
- WHEN 合併後的工時超過 12 小時時 THEN 系統 SHALL 顯示警告提示

### BR6.1.6: 後端去重保護

**User Story**: 作為系統，我需要防止重複記錄，確保數據完整性。

#### 驗收標準
- WHEN 後端保存工時記錄時 THEN 系統 SHALL 檢查是否存在相同組合：`user_id + work_date + client_id + service_id + task_type + work_type`
- WHEN 存在相同組合的記錄時 THEN 系統 SHALL 累加工時而不是創建新記錄
- WHEN 後端累加工時時 THEN 系統 SHALL 自動四捨五入到 0.5 小時
- WHEN 累加後的工時超過 24 小時時 THEN 系統 SHALL 返回錯誤提示「單日工時不能超過 24 小時」
- WHEN 後端更新現有記錄時 THEN 系統 SHALL 更新 `updated_at` 時間戳

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 任務類型列表載入時間 < 1 秒
- 工時記錄保存響應時間 < 1 秒

### Security
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證
- 權限控制：員工只能查看和編輯自己的工時記錄（管理員除外）

### Reliability
- 工時記錄保存準確
- 任務類型列表載入穩定
- 數據轉換（service_item_id → task_type）準確

### Usability
- 界面簡潔直觀
- 下拉選擇流暢
- 時數輸入方便（支援小數點）
- 錯誤提示清晰


# Requirements Document: BR8.2: 外出記錄建立

## Introduction

外出記錄建立功能提供新增和編輯外出記錄的界面。本功能幫助員工快速建立外出記錄，自動計算交通補貼，並與任務和客戶關聯。

**User Story**: 作為會計師事務所的員工，我需要建立和編輯外出記錄，以便記錄外出行程並獲得交通補貼。

## Alignment with Product Vision

本功能支持外出記錄管理系統的核心目標：
- **提升記錄效率**：快速建立外出記錄，減少手動操作時間
- **確保數據準確性**：自動計算交通補貼，確保補貼金額準確
- **支援靈活關聯**：支援關聯任務和客戶，便於追蹤和分析
- **提升管理效率**：管理員可以替其他員工新增記錄，提升管理效率

## Requirements

### BR8.2.1: 新增外出記錄

**User Story**: 作為員工，我需要新增外出記錄，以便記錄外出行程並獲得交通補貼。

#### 驗收標準
- WHEN 員工點擊「新增外出登記」按鈕時 THEN 系統 SHALL 顯示外出記錄表單彈窗
- WHEN 員工填寫外出記錄表單時 THEN 系統 SHALL 要求填寫以下必填欄位：
  - 外出日期（`trip_date`，格式：YYYY-MM-DD）
  - 開始時間（`start_time`，格式：HH:mm）
  - 結束時間（`end_time`，格式：HH:mm）
  - 目的地（`destination`）
  - 距離（`distance_km`，公里，必須 > 0）
- WHEN 員工填寫時間時 THEN 系統 SHALL 驗證結束時間必須晚於開始時間
- WHEN 員工填寫距離時 THEN 系統 SHALL 自動計算並顯示交通補貼預覽（每 5 公里 60 元，向上取整）
- WHEN 員工提交表單時 THEN 系統 SHALL 驗證必填欄位
- WHEN 員工選擇客戶時 THEN 系統 SHALL 驗證客戶是否存在
- WHEN 員工選擇任務時 THEN 系統 SHALL 驗證任務是否存在
- WHEN 表單驗證通過時 THEN 系統 SHALL 創建外出記錄並自動計算補貼金額存入資料庫
- WHEN 外出記錄創建成功時 THEN 系統 SHALL 將狀態設為 `approved`（已核准）
- WHEN 外出記錄創建成功時 THEN 系統 SHALL 觸發薪資重新計算

### BR8.2.2: 編輯外出記錄

**User Story**: 作為員工或管理員，我需要編輯外出記錄，以便修正錯誤的記錄。

#### 驗收標準
- WHEN 員工點擊「編輯」按鈕時 THEN 系統 SHALL 顯示外出記錄表單彈窗並填充現有數據
- WHEN 員工修改距離時 THEN 系統 SHALL 重新計算並顯示交通補貼預覽
- WHEN 員工修改時間時 THEN 系統 SHALL 驗證結束時間必須晚於開始時間
- WHEN 員工修改客戶時 THEN 系統 SHALL 驗證客戶是否存在
- WHEN 員工修改任務時 THEN 系統 SHALL 驗證任務是否存在
- WHEN 員工提交表單時 THEN 系統 SHALL 驗證必填欄位
- WHEN 表單驗證通過時 THEN 系統 SHALL 更新外出記錄
- WHEN 距離被修改時 THEN 系統 SHALL 重新計算補貼金額並更新資料庫
- WHEN 外出記錄更新成功時 THEN 系統 SHALL 觸發薪資重新計算
- WHEN 一般員工嘗試編輯其他員工的外出記錄時 THEN 系統 SHALL 拒絕操作並顯示錯誤訊息
- WHEN 管理員編輯任何外出記錄時 THEN 系統 SHALL 允許操作

### BR8.2.3: 管理員替其他員工新增

**User Story**: 作為管理員，我需要替其他員工新增外出記錄，以便記錄員工的外出行程。

#### 驗收標準
- WHEN 管理員打開新增表單時 THEN 系統 SHALL 顯示「員工」選擇欄位
- WHEN 管理員選擇員工時 THEN 系統 SHALL 將該員工設為外出記錄的創建者
- WHEN 一般員工打開新增表單時 THEN 系統 SHALL 不顯示「員工」選擇欄位（自動使用當前登入用戶）

### BR8.2.4: 客戶關聯

**User Story**: 作為員工，我需要關聯客戶，以便追蹤與客戶相關的外出記錄。

#### 驗收標準
- WHEN 員工填寫外出記錄表單時 THEN 系統 SHALL 提供「客戶」選擇欄位（可選）
- WHEN 員工選擇客戶時 THEN 系統 SHALL 驗證客戶是否存在，並將該客戶關聯到外出記錄
- WHEN 員工選擇不存在的客戶時 THEN 系統 SHALL 拒絕提交並顯示錯誤訊息
- WHEN 員工不選擇客戶時 THEN 系統 SHALL 允許提交（客戶為可選欄位）

### BR8.2.5: 任務關聯

**User Story**: 作為員工，我需要關聯任務，以便追蹤與任務相關的外出記錄。

#### 驗收標準
- WHEN 員工填寫外出記錄表單時 THEN 系統 SHALL 提供「任務」選擇欄位（可選）
- WHEN 員工選擇任務時 THEN 系統 SHALL 驗證任務是否存在，並將該任務關聯到外出記錄
- WHEN 員工選擇不存在的任務時 THEN 系統 SHALL 拒絕提交並顯示錯誤訊息
- WHEN 員工不選擇任務時 THEN 系統 SHALL 允許提交（任務為可選欄位）

### BR8.2.6: 補貼計算

**User Story**: 作為員工，我需要知道交通補貼金額，以便了解補貼情況。

#### 驗收標準
- WHEN 員工輸入距離時 THEN 系統 SHALL 自動計算交通補貼（每 5 公里 60 元，向上取整）
- WHEN 補貼計算完成時 THEN 系統 SHALL 在表單中顯示補貼預覽
- WHEN 外出記錄創建或更新時 THEN 系統 SHALL 將補貼金額存入資料庫（單位：分）
- WHEN 薪資計算時 THEN 系統 SHALL 使用已存的補貼金額（不重新計算）

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義清晰的組件和層級之間的契約

### Performance
- API 響應時間 < 500ms
- 表單提交響應時間 < 1 秒
- 補貼計算響應時間 < 100ms

### Security
- 員工只能編輯自己的外出記錄
- 管理員可以編輯所有外出記錄
- 所有 API 請求需要身份驗證
- 使用參數化查詢防止 SQL 注入
- 前端和後端都要驗證必填欄位
- 驗證外鍵關聯（客戶、任務）是否存在，防止無效關聯

### Reliability
- 系統應該優雅地處理錯誤情況
- 提供清晰的錯誤訊息給用戶
- 確保數據一致性（創建/更新記錄時觸發薪資重新計算）

### Usability
- 界面簡潔直觀
- 表單驗證即時反饋
- 必填欄位明確標記
- 提供補貼預覽，讓用戶了解補貼金額


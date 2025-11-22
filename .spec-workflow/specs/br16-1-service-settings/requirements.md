# Requirements Document: BR16.1: 服務設定

## Introduction

服務設定功能提供系統層級的服務項目管理，包括新增、編輯、刪除服務項目，以及設定服務類型、服務名稱和服務層級 SOP。本功能幫助所有用戶統一管理系統中的服務項目，為客戶服務管理提供基礎資料。

**User Story**: 作為系統用戶，我需要管理服務項目，以便能夠統一管理系統中的服務類型，為客戶服務管理提供基礎資料。

## Alignment with Product Vision

本功能支持系統設定的核心目標：
- **統一服務管理**：集中管理所有服務項目，確保服務資料的一致性
- **簡化服務配置**：提供簡潔的服務設定界面，降低管理成本
- **支援客戶服務**：為客戶服務管理提供基礎服務資料

## Requirements

### BR16.1.1: 服務列表展示

**User Story**: 作為用戶，我需要查看服務列表，以便了解所有服務項目的狀況。

#### 驗收標準
- WHEN 用戶打開服務設定頁面時 THEN 系統 SHALL 顯示所有服務項目（所有已登入用戶可訪問）
- WHEN 未登入用戶嘗試訪問服務設定頁面時 THEN 系統 SHALL 要求登入
- WHEN 用戶查看服務列表時 THEN 系統 SHALL 顯示以下資訊：
  - 服務名稱（`service_name`）
  - 服務類型（`service_type`：週期性/一次性）
  - 操作（編輯、刪除）
- WHEN 用戶查看服務列表時 THEN 系統 SHALL 不顯示服務代碼、ID、服務層級 SOP
- WHEN 服務列表載入失敗時 THEN 系統 SHALL 顯示錯誤提示，表格顯示為空
- WHEN 服務列表為空時 THEN 系統 SHALL 顯示空狀態提示

### BR16.1.2: 新增服務項目

**User Story**: 作為用戶，我需要新增服務項目，以便擴展系統支援的服務類型。

#### 驗收標準
- WHEN 用戶點擊「新增服務項目」按鈕時 THEN 系統 SHALL 顯示服務項目表單（空表單）
- WHEN 用戶點擊表單「取消」按鈕時 THEN 系統 SHALL 關閉表單，不保存任何變更
- WHEN 用戶填寫服務項目表單時 THEN 系統 SHALL 要求填寫以下欄位：
  - 服務類型（必填）：週期性（`recurring`）或一次性（`one_off`）
  - 服務名稱（必填）：最多 100 個字符
  - 服務層級 SOP（可選）：可選擇已存在的服務層級 SOP 或選擇「無」
- WHEN 用戶提交新增表單時 THEN 系統 SHALL 驗證必填欄位
- WHEN 用戶提交新增表單時 THEN 系統 SHALL 驗證服務名稱長度不超過 100 個字符
- WHEN 用戶提交新增表單時 THEN 系統 SHALL 自動生成服務代碼（後端處理，前端不顯示）
- WHEN 用戶成功新增服務項目時 THEN 系統 SHALL 刷新服務列表並顯示成功提示
- WHEN 用戶新增服務項目失敗時 THEN 系統 SHALL 顯示錯誤提示並保持表單狀態

### BR16.1.3: 編輯服務項目

**User Story**: 作為用戶，我需要編輯服務項目，以便更新服務資訊。

#### 驗收標準
- WHEN 用戶點擊「編輯」按鈕時 THEN 系統 SHALL 顯示服務項目編輯表單，並預填充現有資料（服務類型、服務名稱、服務層級 SOP）
- WHEN 用戶點擊表單「取消」按鈕時 THEN 系統 SHALL 關閉表單，不保存任何變更
- WHEN 用戶編輯服務項目時 THEN 系統 SHALL 允許修改以下欄位：
  - 服務類型（必填）：週期性（`recurring`）或一次性（`one_off`）
  - 服務名稱（必填）：最多 100 個字符
  - 服務層級 SOP（可選）：可選擇已存在的服務層級 SOP 或選擇「無」
- WHEN 用戶提交編輯表單時 THEN 系統 SHALL 驗證必填欄位
- WHEN 用戶提交編輯表單時 THEN 系統 SHALL 驗證服務名稱長度不超過 100 個字符
- WHEN 用戶成功更新服務項目時 THEN 系統 SHALL 刷新服務列表並顯示成功提示
- WHEN 用戶編輯服務項目失敗時 THEN 系統 SHALL 顯示錯誤提示並保持表單狀態

### BR16.1.4: 刪除服務項目

**User Story**: 作為用戶，我需要刪除服務項目，以便移除不再使用的服務類型。

#### 驗收標準
- WHEN 用戶點擊「刪除」按鈕時 THEN 系統 SHALL 顯示確認對話框
- WHEN 用戶在確認對話框中點擊「取消」時 THEN 系統 SHALL 關閉對話框，不執行刪除操作
- WHEN 用戶確認刪除時 THEN 系統 SHALL 從資料庫真正刪除該服務項目（硬刪除，非軟刪除）
- WHEN 用戶刪除服務項目時 THEN 系統 SHALL 不檢查關聯資料（不檢查是否有客戶使用此服務）
- WHEN 用戶成功刪除服務項目時 THEN 系統 SHALL 刷新服務列表並顯示成功提示
- WHEN 用戶刪除服務項目失敗時 THEN 系統 SHALL 顯示錯誤提示，不刷新列表

### BR16.1.5: 服務層級 SOP 選擇

**User Story**: 作為用戶，我需要為服務項目選擇服務層級 SOP，以便在客戶服務中自動綁定 SOP。

#### 驗收標準
- WHEN 用戶新增或編輯服務項目時 THEN 系統 SHALL 顯示服務層級 SOP 選擇下拉框
- WHEN 用戶選擇服務層級 SOP 時 THEN 系統 SHALL 顯示所有可用的服務層級 SOP（`scope = 'service'`）
- WHEN 用戶選擇「無」時 THEN 系統 SHALL 將服務層級 SOP 設為 NULL
- WHEN 用戶選擇服務層級 SOP 時 THEN 系統 SHALL 在客戶服務選擇此服務時自動綁定該 SOP
- WHEN 服務層級 SOP 列表載入失敗時 THEN 系統 SHALL 顯示錯誤提示，SOP 選擇框顯示為空或禁用，但不阻止表單提交（SOP 為可選）

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 2 秒
- 表單提交響應時間 < 1 秒

### Security
- 所有已登入用戶可訪問服務設定頁面（需 JWT Token 驗證）
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 服務列表載入穩定
- 新增/編輯/刪除操作可靠
- 服務代碼自動生成唯一

### Usability
- 界面簡潔直觀
- 表單驗證提示清晰
- 操作反饋及時



# Requirements Document: BR16.6: 假日設定

## Introduction

假日設定功能提供系統層級的國定假日管理，包括新增、編輯、刪除國定假日，以及 CSV 批量上傳國定假日。本功能幫助所有用戶統一管理國定假日，為工時、請假、加班等業務提供基礎資料。

**User Story**: 作為系統用戶，我需要管理國定假日，以便能夠統一管理國定假日，為工時、請假、加班等業務提供基礎資料。

## Alignment with Product Vision

本功能支持系統設定的核心目標：
- **統一假日管理**：集中管理國定假日，確保假日資料的一致性
- **支援批量操作**：支援 CSV 批量上傳，提升管理效率
- **提供基礎資料**：為工時、請假、加班等業務提供基礎假日資料

## Requirements

### BR16.6.1: 國定假日列表展示

**User Story**: 作為用戶，我需要查看國定假日列表，以便了解所有國定假日的狀況。

#### 驗收標準
- WHEN 用戶打開假日設定頁面時 THEN 系統 SHALL 顯示所有國定假日（所有用戶可訪問）
- WHEN 用戶查看國定假日列表時 THEN 系統 SHALL 顯示以下資訊：
  - 日期（`holiday_date`）
  - 假日名稱（`name`）
  - 操作（編輯、刪除）
- WHEN 用戶查看國定假日列表時 THEN 系統 SHALL 按日期升序排序顯示

### BR16.6.2: 新增國定假日

**User Story**: 作為用戶，我需要新增國定假日，以便擴展系統支援的假日。

#### 驗收標準
- WHEN 用戶點擊「新增假日」按鈕時 THEN 系統 SHALL 顯示國定假日表單
- WHEN 用戶填寫國定假日表單時 THEN 系統 SHALL 要求填寫以下欄位：
  - 日期（必填）：日期選擇器，格式 YYYY-MM-DD
  - 假日名稱（必填）：最多 100 個字符
- WHEN 用戶提交新增表單時 THEN 系統 SHALL 驗證必填欄位和日期格式
- WHEN 用戶提交新增表單且日期已存在時 THEN 系統 SHALL 顯示錯誤提示（日期唯一性驗證）
- WHEN 用戶成功新增國定假日時 THEN 系統 SHALL 刷新假日列表並顯示成功提示

### BR16.6.3: 編輯國定假日

**User Story**: 作為用戶，我需要編輯國定假日，以便更新假日資訊。

#### 驗收標準
- WHEN 用戶點擊「編輯」按鈕時 THEN 系統 SHALL 顯示國定假日編輯表單，並預填充現有資料
- WHEN 用戶編輯國定假日時 THEN 系統 SHALL 允許修改以下欄位：
  - 日期（必填，唯讀）：編輯模式下日期不可修改
  - 假日名稱（必填）：最多 100 個字符
- WHEN 用戶提交編輯表單時 THEN 系統 SHALL 驗證必填欄位
- WHEN 用戶成功更新國定假日時 THEN 系統 SHALL 刷新假日列表並顯示成功提示

### BR16.6.4: 刪除國定假日

**User Story**: 作為用戶，我需要刪除國定假日，以便移除不再使用的假日。

#### 驗收標準
- WHEN 用戶點擊「刪除」按鈕時 THEN 系統 SHALL 顯示確認對話框
- WHEN 用戶確認刪除時 THEN 系統 SHALL 從資料庫真正刪除該國定假日（硬刪除，非軟刪除）
- WHEN 用戶刪除國定假日時 THEN 系統 SHALL 不檢查關聯資料（不檢查是否有工時記錄、請假記錄等）
- WHEN 用戶成功刪除國定假日時 THEN 系統 SHALL 刷新假日列表並顯示成功提示

### BR16.6.5: CSV 批量上傳

**User Story**: 作為用戶，我需要批量上傳國定假日，以便快速導入大量假日資料。

#### 驗收標準
- WHEN 用戶點擊「批量上傳」按鈕時 THEN 系統 SHALL 顯示批量上傳表單
- WHEN 用戶上傳 CSV 文件時 THEN 系統 SHALL 驗證 CSV 格式（日期、名稱）
- WHEN 用戶上傳 CSV 文件時 THEN 系統 SHALL 解析 CSV 內容並驗證數據格式
- WHEN 用戶上傳 CSV 文件時 THEN 系統 SHALL 驗證日期格式（YYYY-MM-DD）和名稱長度（最多 100 個字符）
- WHEN 用戶上傳 CSV 文件時 THEN 系統 SHALL 處理重複日期（跳過已存在的假日）
- WHEN 用戶上傳 CSV 文件時 THEN 系統 SHALL 處理無效數據行（跳過格式錯誤的行並記錄）
- WHEN 用戶成功批量上傳時 THEN 系統 SHALL 顯示成功統計（成功數量、跳過數量、失敗數量）
- WHEN 用戶批量上傳失敗時 THEN 系統 SHALL 顯示失敗詳情（包含失敗行號和錯誤原因）

### BR16.6.6: CSV 範本下載

**User Story**: 作為用戶，我需要下載 CSV 範本，以便了解 CSV 格式要求。

#### 驗收標準
- WHEN 用戶點擊「下載範本」按鈕時 THEN 系統 SHALL 下載 CSV 範本文件
- WHEN 用戶下載 CSV 範本時 THEN 系統 SHALL 提供包含範例數據的 CSV 文件
- WHEN CSV 範本包含時 THEN 系統 SHALL 包含標題行（日期、名稱）和範例數據行

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 2 秒
- CSV 批量上傳響應時間 < 5 秒（取決於數據量）

### Security
- 所有已登入用戶可訪問假日設定頁面
- 使用參數化查詢防止 SQL 注入
- CSV 文件上傳驗證和後端驗證

### Reliability
- 假日列表載入穩定
- 新增/編輯/刪除操作可靠
- CSV 批量上傳穩定

### Usability
- 界面簡潔直觀
- CSV 批量上傳流程清晰
- 錯誤提示明確



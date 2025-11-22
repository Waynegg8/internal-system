# Requirements Document: BR10.4: FAQ 編輯與刪除

## Introduction

FAQ 編輯與刪除功能提供編輯和刪除現有 FAQ 的功能。本功能幫助員工更新 FAQ 內容、修正錯誤，並管理不再需要的 FAQ。

**User Story**: 作為會計師事務所的員工，我需要編輯和刪除 FAQ，以便更新 FAQ 內容、修正錯誤，並管理不再需要的 FAQ。

## Alignment with Product Vision

本功能支持知識管理系統的核心目標：
- **確保數據準確性**：支援編輯功能，確保 FAQ 內容準確和最新
- **支援內容維護**：支援刪除功能，管理不再需要的 FAQ
- **權限控制**：只有建立者或管理員可以編輯/刪除 FAQ，確保內容安全

## Requirements

### BR10.4.1: FAQ 編輯表單

**User Story**: 作為員工，我需要編輯 FAQ，以便更新 FAQ 內容。

#### 驗收標準

1. WHEN 員工打開 FAQ 編輯表單時 THEN 系統 SHALL 預填現有 FAQ 的所有資訊
2. WHEN 員工編輯 FAQ 時 THEN 系統 SHALL 允許修改以下欄位：
   - 問題（`question`，必填，文字輸入，最大長度 200 字符）
   - 服務類型分類（`category`，必填，下拉選擇）
   - 適用層級（`scope`，必填，下拉選擇：服務層級/任務層級）
   - 客戶（`client_id`，可選，下拉選擇）
   - 標籤（`tags`，可選，多選）
   - 回答（`answer`，必填，富文本編輯器）
3. WHEN 員工編輯 FAQ 時 THEN 系統 SHALL 顯示建立者和建立時間（唯讀，不可修改）

### BR10.4.2: 編輯權限控制

**User Story**: 作為系統，我需要控制編輯權限，確保只有建立者或管理員可以編輯 FAQ。

#### 驗收標準

1. WHEN 員工嘗試編輯 FAQ 時 THEN 系統 SHALL 檢查當前使用者是否為建立者或管理員
2. WHEN 當前使用者是建立者時 THEN 系統 SHALL 允許編輯
3. WHEN 當前使用者是管理員時 THEN 系統 SHALL 允許編輯
4. WHEN 當前使用者既不是建立者也不是管理員時 THEN 系統 SHALL 拒絕編輯請求並顯示錯誤訊息（403 Forbidden）
5. WHEN 系統檢查權限時 THEN 系統 SHALL 比較當前使用者的 `user_id` 與 FAQ 的 `created_by` 欄位
6. WHEN 系統檢查管理員權限時 THEN 系統 SHALL 檢查當前使用者的角色（`role`）是否為管理員（`admin`）

### BR10.4.3: 編輯時必填欄位驗證

**User Story**: 作為員工，我需要確保編輯後的 FAQ 仍然包含所有必填欄位。

#### 驗收標準

1. WHEN 員工提交 FAQ 編輯表單時 THEN 系統 SHALL 驗證以下必填欄位：
   - 問題（`question`）：不能為空，不能只包含空白字符
   - 服務類型分類（`category`）：必須選擇一個服務類型
   - 適用層級（`scope`）：必須選擇服務層級或任務層級
   - 回答（`answer`）：不能為空，不能只包含空白字符或空 HTML 標籤（如 `<p><br></p>`）
2. WHEN 員工將必填欄位更新為空時 THEN 系統 SHALL 顯示錯誤訊息並阻止提交
3. WHEN 員工將問題長度更新為超過 200 字符時 THEN 系統 SHALL 顯示錯誤訊息並阻止提交
4. WHEN 員工將回答更新為空或只包含空白字符時 THEN 系統 SHALL 顯示錯誤訊息並阻止提交

### BR10.4.4: FAQ 更新提交

**User Story**: 作為員工，我需要提交 FAQ 編輯表單，以便保存更新後的 FAQ。

#### 驗收標準

1. WHEN 員工提交有效的 FAQ 編輯表單時 THEN 系統 SHALL 更新 FAQ 記錄
2. WHEN 系統更新 FAQ 時 THEN 系統 SHALL 自動更新最後更新時間（`updated_at`，當前時間）
3. WHEN 系統更新 FAQ 時 THEN 系統 SHALL 不修改建立者（`created_by`）和建立時間（`created_at`）
4. WHEN FAQ 更新成功時 THEN 系統 SHALL 顯示成功訊息並刷新 FAQ 詳情或列表
5. WHEN FAQ 更新失敗時 THEN 系統 SHALL 顯示錯誤訊息並保持表單狀態

### BR10.4.5: FAQ 刪除功能

**User Story**: 作為員工，我需要刪除不再需要的 FAQ。

#### 驗收標準

1. WHEN 員工嘗試刪除 FAQ 時 THEN 系統 SHALL 檢查當前使用者是否為建立者或管理員
2. WHEN 當前使用者是建立者時 THEN 系統 SHALL 允許刪除
3. WHEN 當前使用者是管理員時 THEN 系統 SHALL 允許刪除
4. WHEN 當前使用者既不是建立者也不是管理員時 THEN 系統 SHALL 拒絕刪除請求並顯示錯誤訊息（403 Forbidden）
5. WHEN 系統檢查權限時 THEN 系統 SHALL 比較當前使用者的 `user_id` 與 FAQ 的 `created_by` 欄位
6. WHEN 系統檢查管理員權限時 THEN 系統 SHALL 檢查當前使用者的角色（`role`）是否為管理員（`admin`）
7. WHEN 員工確認刪除 FAQ 時 THEN 系統 SHALL 執行軟刪除（設置 `is_deleted = 1`，不實際刪除記錄）
8. WHEN 系統刪除 FAQ 時 THEN 系統 SHALL 自動更新最後更新時間（`updated_at`，當前時間）
9. WHEN FAQ 刪除成功時 THEN 系統 SHALL 顯示成功訊息並從列表中移除該 FAQ
10. WHEN FAQ 刪除失敗時 THEN 系統 SHALL 顯示錯誤訊息

### BR10.4.6: 刪除確認

**User Story**: 作為員工，我需要確認刪除操作，以免誤刪 FAQ。

#### 驗收標準

1. WHEN 員工點擊刪除按鈕時 THEN 系統 SHALL 顯示確認對話框
2. WHEN 確認對話框顯示時 THEN 系統 SHALL 顯示 FAQ 的問題標題，以便確認
3. WHEN 員工確認刪除時 THEN 系統 SHALL 執行刪除操作
4. WHEN 員工取消刪除時 THEN 系統 SHALL 取消操作，不執行刪除

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- FAQ 更新響應時間 < 1 秒
- FAQ 刪除響應時間 < 500ms
- 表單驗證響應時間 < 100ms

### Security
- 只有建立者或管理員可以編輯/刪除 FAQ
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證
- 富文本內容需要進行 XSS 防護
- 權限檢查必須在後端執行

### Reliability
- FAQ 編輯和刪除功能穩定
- 必填欄位驗證準確
- 權限檢查準確
- 數據更新完整

### Usability
- 界面簡潔直觀
- 編輯流程清晰
- 錯誤訊息明確
- 表單驗證即時反饋
- 刪除確認明確


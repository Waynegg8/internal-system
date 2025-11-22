# Requirements Document: BR10.3: FAQ 建立

## Introduction

FAQ 建立功能提供建立新 FAQ 的功能。本功能幫助員工快速建立 FAQ，記錄常見問題和解答，提升知識傳遞效率。

**User Story**: 作為會計師事務所的員工，我需要建立 FAQ，以便記錄常見問題和解答，幫助其他員工快速找到答案。

## Alignment with Product Vision

本功能支持知識管理系統的核心目標：
- **提升知識傳遞效率**：快速建立 FAQ，記錄常見問題和解答
- **確保數據準確性**：驗證必填欄位，確保 FAQ 資訊完整
- **支援靈活分類**：支援服務類型分類、適用層級、客戶、標籤等多種分類方式

## Requirements

### BR10.3.1: FAQ 建立表單

**User Story**: 作為員工，我需要填寫 FAQ 建立表單，以便建立新的 FAQ。

#### 驗收標準

1. WHEN 員工打開 FAQ 建立表單時 THEN 系統 SHALL 顯示以下欄位：
   - 問題（`question`，必填，文字輸入，最大長度 200 字符）
   - 服務類型分類（`category`，必填，下拉選擇）
   - 適用層級（`scope`，必填，下拉選擇：服務層級/任務層級）
   - 客戶（`client_id`，可選，下拉選擇）
   - 標籤（`tags`，可選，多選）
   - 回答（`answer`，必填，富文本編輯器）
2. WHEN 員工填寫表單時 THEN 系統 SHALL 提供即時驗證反饋
3. WHEN 員工選擇服務類型分類時 THEN 系統 SHALL 顯示所有可用的服務類型
4. WHEN 員工選擇標籤時 THEN 系統 SHALL 顯示所有可用的標籤（從標籤管理系統取得）

### BR10.3.2: 必填欄位驗證

**User Story**: 作為員工，我需要確保填寫所有必填欄位，以便建立完整的 FAQ。

#### 驗收標準

1. WHEN 員工提交 FAQ 建立表單時 THEN 系統 SHALL 驗證以下必填欄位：
   - 問題（`question`）：不能為空，不能只包含空白字符
   - 服務類型分類（`category`）：必須選擇一個服務類型
   - 適用層級（`scope`）：必須選擇服務層級或任務層級
   - 回答（`answer`）：不能為空，不能只包含空白字符或空 HTML 標籤（如 `<p><br></p>`）
2. WHEN 必填欄位未填寫時 THEN 系統 SHALL 顯示錯誤訊息並阻止提交
3. WHEN 問題長度超過 200 字符時 THEN 系統 SHALL 顯示錯誤訊息並阻止提交
4. WHEN 回答為空或只包含空白字符時 THEN 系統 SHALL 顯示錯誤訊息並阻止提交

### BR10.3.3: FAQ 建立提交

**User Story**: 作為員工，我需要提交 FAQ 建立表單，以便保存新的 FAQ。

#### 驗收標準

1. WHEN 員工提交有效的 FAQ 建立表單時 THEN 系統 SHALL 建立新的 FAQ 記錄
2. WHEN 系統建立 FAQ 時 THEN 系統 SHALL 自動記錄建立者（`created_by`，當前登入使用者的 `user_id`）
3. WHEN 系統建立 FAQ 時 THEN 系統 SHALL 自動記錄建立時間（`created_at`，當前時間）
4. WHEN 系統建立 FAQ 時 THEN 系統 SHALL 自動設置最後更新時間（`updated_at`，當前時間）
5. WHEN 系統建立 FAQ 時 THEN 系統 SHALL 設置 `is_deleted = 0`
6. WHEN FAQ 建立成功時 THEN 系統 SHALL 顯示成功訊息並跳轉到 FAQ 列表或詳情頁面
7. WHEN FAQ 建立失敗時 THEN 系統 SHALL 顯示錯誤訊息並保持表單狀態

### BR10.3.4: 建立後立即發佈

**User Story**: 作為員工，我需要建立的 FAQ 立即可見，以便其他員工能夠查看。

#### 驗收標準

1. WHEN FAQ 建立成功時 THEN 系統 SHALL 立即可見（所有登入使用者都可以查看）
2. WHEN FAQ 建立成功時 THEN 系統 SHALL 不需要額外的發佈步驟（無草稿狀態）

### BR10.3.5: 可選欄位處理

**User Story**: 作為員工，我需要選擇性地填寫客戶和標籤，以便更精確地分類 FAQ。

#### 驗收標準

1. WHEN 員工不選擇客戶時 THEN 系統 SHALL 允許提交（`client_id` 為 NULL）
2. WHEN 員工不選擇標籤時 THEN 系統 SHALL 允許提交（`tags` 為空字串或 NULL）
3. WHEN 員工選擇多個標籤時 THEN 系統 SHALL 將標籤存儲為逗號分隔的字串（例如："標籤1,標籤2,標籤3"）

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- FAQ 建立響應時間 < 1 秒
- 表單驗證響應時間 < 100ms

### Security
- 所有登入使用者都可以建立 FAQ
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證
- 富文本內容需要進行 XSS 防護

### Reliability
- FAQ 建立功能穩定
- 必填欄位驗證準確
- 數據保存完整

### Usability
- 界面簡潔直觀
- 建立流程清晰
- 錯誤訊息明確
- 表單驗證即時反饋







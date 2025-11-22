# Requirements Document: BR10.2: FAQ 詳情

## Introduction

FAQ 詳情功能提供 FAQ 的完整資訊展示。本功能幫助員工查看 FAQ 的詳細內容，包括問題、答案、分類、標籤、建立者等資訊。

**User Story**: 作為會計師事務所的員工，我需要查看 FAQ 詳情，以便了解常見問題的完整解答和相關資訊。

## Alignment with Product Vision

本功能支持知識管理系統的核心目標：
- **提升知識傳遞效率**：集中展示 FAQ 完整資訊，提供統一的查看界面
- **確保資訊完整性**：顯示建立者、建立時間等元數據，便於追蹤和維護
- **提升工作效率**：快速查看 FAQ 詳情，無需跳轉多個頁面

## Requirements

### BR10.2.1: FAQ 詳情展示

**User Story**: 作為員工，我需要查看 FAQ 詳情，以便了解 FAQ 的完整資訊。

#### 驗收標準

1. WHEN 員工打開 FAQ 詳情頁面時 THEN 系統 SHALL 顯示 FAQ 的所有資訊
2. WHEN 員工查看 FAQ 詳情時 THEN 系統 SHALL 顯示以下資訊：
   - 問題（`question`）
   - 答案（`answer`，富文本格式）
   - 服務類型分類（`category`）
   - 適用層級（`scope`：服務層級/任務層級）
   - 客戶（`client_id`，如果有）
   - 標籤（`tags`）
   - 建立者名稱（`created_by_name`，從 Users 表 JOIN 取得）
   - 建立時間（`created_at`，格式：YYYY-MM-DD HH:mm，例如：2024-01-15 14:30）
   - 最後更新時間（`updated_at`）
3. WHEN 員工查看 FAQ 詳情時 THEN 系統 SHALL 以易讀的格式顯示答案（支援富文本渲染）
4. WHEN FAQ 有標籤時 THEN 系統 SHALL 以標籤形式顯示標籤
5. WHEN FAQ 有服務類型分類時 THEN 系統 SHALL 以標籤形式顯示分類

### BR10.2.2: 建立者與建立時間顯示

**User Story**: 作為員工，我需要查看 FAQ 的建立者與建立時間，以便了解 FAQ 的來源和歷史。

#### 驗收標準

1. WHEN 員工查看 FAQ 詳情時 THEN 系統 SHALL 顯示建立者名稱（非 user_id）
2. WHEN 員工查看 FAQ 詳情時 THEN 系統 SHALL 顯示建立時間，格式為 YYYY-MM-DD HH:mm（例如：2024-01-15 14:30）
3. WHEN 系統獲取建立者名稱時 THEN 系統 SHALL 從 Users 表 JOIN 取得使用者名稱（`name` 欄位）
4. WHEN FAQ 沒有建立者資訊時 THEN 系統 SHALL 顯示「未知」或留空

### BR10.2.3: 富文本答案顯示

**User Story**: 作為員工，我需要查看格式化的 FAQ 答案，以便更好地理解內容。

#### 驗收標準

1. WHEN 員工查看 FAQ 詳情時 THEN 系統 SHALL 正確渲染富文本答案（支援 HTML 格式）
2. WHEN FAQ 答案包含格式時 THEN 系統 SHALL 正確顯示標題、段落、列表、表格等格式
3. WHEN FAQ 答案包含圖片時 THEN 系統 SHALL 正確顯示圖片（如果有的話）

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 2 秒
- 富文本渲染時間 < 1 秒

### Security
- 所有登入使用者都可以查看 FAQ 詳情
- 使用參數化查詢防止 SQL 注入
- 富文本內容需要進行 XSS 防護

### Reliability
- FAQ 詳情顯示準確
- 建立者資訊正確顯示
- 富文本渲染穩定

### Usability
- 界面簡潔直觀
- 資訊層次清晰
- 富文本內容易讀







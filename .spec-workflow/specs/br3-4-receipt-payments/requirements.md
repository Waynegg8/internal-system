# Requirements Document: BR3.4: 付款記錄管理

## Introduction

付款記錄管理功能提供新增、編輯、刪除付款記錄的功能。本功能幫助員工記錄和管理收據的付款資訊。

## Alignment with Product Vision

本功能支持收據管理系統的核心目標：
- **提升付款管理效率**：快速記錄和管理付款資訊
- **確保數據準確性**：自動更新收據狀態，確保數據準確
- **支援審計追蹤**：記錄修改和刪除歷史，支援審計追蹤

## Requirements

### BR3.4.1: 新增付款記錄

**User Story:** As a 員工, I want 新增付款記錄, so that 記錄客戶的付款資訊

#### Acceptance Criteria

1. WHEN 客戶付款時 THEN 系統 SHALL 記錄付款資訊並更新收據狀態
2. WHEN 付款總額 = 0 時 THEN 系統 SHALL 自動更新收據狀態為「未付款」
3. WHEN 付款總額 > 0 且 < 收據金額時 THEN 系統 SHALL 自動更新收據狀態為「部分付款」
4. WHEN 付款總額達到收據金額時 THEN 系統 SHALL 自動更新收據狀態為「已付款」
5. WHEN 付款總額超過收據金額時 THEN 系統 SHALL 允許但提示「付款總額超過收據金額，超出部分可用於抵扣其他收據」

### BR3.4.2: 編輯付款記錄

**User Story:** As a 員工, I want 編輯付款記錄, so that 修正付款資訊

#### Acceptance Criteria

1. WHEN 員工修改付款記錄時 THEN 系統 SHALL 允許修改並留下修改記錄（所有員工都可以編輯）
2. WHEN 員工修改付款記錄時 THEN 系統 SHALL 記錄修改前的值和修改後的值、修改人、修改時間
3. WHEN 員工修改付款記錄後 THEN 系統 SHALL 重新計算付款總額並更新收據狀態

### BR3.4.3: 刪除付款記錄

**User Story:** As a 員工, I want 刪除付款記錄, so that 處理錯誤的付款記錄

#### Acceptance Criteria

1. WHEN 員工刪除付款記錄時 THEN 系統 SHALL 允許刪除（軟刪除）並留下刪除記錄（所有員工都可以刪除）
2. WHEN 員工刪除付款記錄時 THEN 系統 SHALL 記錄刪除人、刪除時間
3. WHEN 員工刪除付款記錄後 THEN 系統 SHALL 重新計算付款總額並更新收據狀態

### BR3.4.4: 付款記錄顯示

**User Story:** As a 員工, I want 查看付款記錄, so that 了解收據的付款情況

#### Acceptance Criteria

1. WHEN 員工查看付款記錄時 THEN 系統 SHALL 按付款日期降序顯示（最新的在前）
2. WHEN 員工查看付款記錄時 THEN 系統 SHALL 顯示每筆付款金額和累計金額
3. WHEN 付款記錄被軟刪除時 THEN 系統 SHALL 不顯示該記錄（除非有特殊權限）
4. WHEN 沒有付款記錄時 THEN 系統 SHALL 顯示空狀態提示
5. WHEN 員工查看付款記錄時 THEN 系統 SHALL 顯示付款方式、參考號碼、備註等完整資訊

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 付款記錄操作響應時間 < 1 秒

### Security
- 所有員工都可以新增、編輯、刪除付款記錄（無權限限制）
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 付款記錄操作穩定
- 收據狀態自動更新準確

### Usability
- 界面簡潔直觀
- 付款記錄管理流程清晰


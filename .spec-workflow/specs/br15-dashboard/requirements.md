# Requirements Document: BR15: 儀表板（Dashboard）

## Introduction

儀表板功能提供使用者在登入後的首頁總覽，快速掌握待辦、近期活動與關鍵指標，支持管理員與一般員工差異化視圖。

**User Story**: 作為會計師事務所的員工或管理員，我需要查看儀表板，以便快速了解工作狀況、追蹤任務進度、掌握財務狀況，並及時接收重要提醒。

## Alignment with Product Vision

本功能支持會計師事務所內部管理系統的核心目標：
- **提升管理效率**：管理員可以快速了解全公司業務狀況，及時發現問題
- **提升工作效率**：員工可以快速了解自己的工作狀況，及時處理待辦事項
- **及時提醒**：通過自動提醒機制，確保重要事項不會遺漏
- **數據可視化**：通過圖表和統計數據，直觀展示業務狀況

## Requirements

### BR15.1: 管理員儀表板

**User Story**: 作為管理員，我需要查看管理員儀表板，以便了解全公司所有員工的任務、工時、財務統計和提醒。

#### 驗收標準

- WHEN 管理員查看儀表板 THEN 系統 SHALL 顯示所有員工的任務、工時、財務統計
- WHEN 管理員查看今日摘要 THEN 系統 SHALL 計算全公司所有員工的任務統計
- WHEN 管理員查看各員工任務狀態 THEN 系統 SHALL 僅在選定月份顯示已完成任務
- WHEN 管理員查看各員工工時 THEN 系統 SHALL 正確計算工作日數（排除國定假日，只計算週一至週五）
- WHEN 管理員查看財務狀況（本年累計）THEN 系統 SHALL 包含到當天為止的數據
- WHEN 管理員查看即時提醒 THEN 系統 SHALL 顯示 BR2.6 任務通知系統的所有提醒類型，並根據類型顯示不同的圖標、顏色和標籤

### BR15.2: 員工儀表板

**User Story**: 作為員工，我需要查看員工儀表板，以便了解自己的任務、工時統計和相關提醒。

#### 驗收標準

- WHEN 員工查看儀表板 THEN 系統 SHALL 僅顯示自己的任務與工時統計
- WHEN 員工查看我的工時 THEN 系統 SHALL 根據月份自動計算目標工時（工作日數 × 8 小時）
- WHEN 員工查看我的任務 THEN 系統 SHALL 僅顯示「待辦/進行中」的任務
- WHEN 員工查看儀表板 THEN 系統 SHALL 不顯示「我的假期」組件

### BR15.3: 今日摘要

**User Story**: 作為用戶，我需要查看今日摘要，以便快速了解當天的任務狀況。

#### 驗收標準

- WHEN 生成每日摘要 THEN 系統 SHALL 包含逾期任務、今日到期、待處理任務統計
- WHEN 管理員查看今日摘要 THEN 系統 SHALL 計算全公司所有員工的任務統計
- WHEN 員工查看今日摘要 THEN 系統 SHALL 僅計算自己的任務統計

### BR15.4: 即時提醒

**User Story**: 作為用戶，我需要接收即時提醒，以便及時了解重要任務通知。

#### 驗收標準

- WHEN 有逾期任務 THEN 系統 SHALL 在即時提醒中顯示並提供跳轉
- WHEN 系統顯示即時提醒 THEN 系統 SHALL 整合 BR2.6 任務通知系統的提醒
- WHEN 系統顯示即時提醒 THEN 系統 SHALL 根據提醒類型顯示不同的圖標、顏色和標籤：
  - `overdue`：紅色警告圖標
  - `upcoming`：橙色提醒圖標
  - `delay`：黃色延誤圖標
  - `conflict`：紅色衝突圖標
- WHEN 系統顯示 `upcoming` 類型提醒 THEN 系統 SHALL 顯示「剩餘 X 天」或「即將到期」，而非「延遲 X 天」
- WHEN 系統顯示 `delay` 或 `conflict` 類型提醒 THEN 系統 SHALL 顯示詳細描述信息（description 字段）

### BR15.5: 數據刷新

**User Story**: 作為用戶，我需要儀表板數據自動刷新，以便及時了解最新狀況。

#### 驗收標準

- WHEN 系統自動刷新 THEN 系統 SHALL 每 5 分鐘刷新一次數據
- WHEN 頁面獲得焦點 THEN 系統 SHALL 自動刷新數據
- WHEN 用戶查看儀表板 THEN 系統 SHALL 不提供手動刷新按鈕

### BR15.6: 權限控制

**User Story**: 作為系統，我需要根據用戶角色顯示不同的儀表板內容。

#### 驗收標準

- WHEN 管理員查看儀表板 THEN 系統 SHALL 顯示全公司所有員工的統計數據和提醒
- WHEN 員工查看儀表板 THEN 系統 SHALL 僅顯示與自己相關的統計數據和提醒
- WHEN 系統判斷用戶角色 THEN 系統 SHALL 不需要更細緻的權限控制（如部門主管視圖）

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Each file should have a single, well-defined purpose
- **Modular Design**: Components, utilities, and services should be isolated and reusable
- **Dependency Management**: Minimize interdependencies between modules
- **Clear Interfaces**: Define clean contracts between components and layers

### Performance
- API 響應時間 < 1 秒
- 頁面載入時間 < 3 秒
- 自動刷新不影響用戶操作
- 數據查詢使用快取機制提升性能

### Security
- 儀表板數據的存取應遵循權限控制機制
- 敏感資訊應進行適當保護
- 防止 XSS 攻擊

### Reliability
- 數據查詢失敗時有明確錯誤記錄
- 自動刷新失敗時不影響用戶操作
- 避免重複請求數據

### Usability
- 界面簡潔直觀，操作流程清晰
- 數據展示清晰易懂
- 支援快速跳轉到對應詳情頁

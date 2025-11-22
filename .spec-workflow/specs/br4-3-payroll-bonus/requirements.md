# Requirements Document: BR4.3: 績效獎金與年終獎金

## Introduction

績效獎金與年終獎金管理功能提供統一的績效獎金調整和年終獎金設定界面。本功能幫助管理員管理員工的績效獎金和年終獎金。

**User Story**: 作為會計師事務所的管理員，我需要調整員工的績效獎金和設定年終獎金，以便能夠靈活管理員工的獎金。

## Alignment with Product Vision

本功能支持薪資管理系統的核心目標：
- **提升獎金管理效率**：集中管理績效獎金和年終獎金，提供統一的管理界面
- **確保計算準確性**：自動觸發薪資重新計算，確保計算準確
- **支援靈活配置**：支援跨年發放年終獎金，滿足不同業務需求

## Requirements

### BR4.3.1: 績效獎金調整

**User Story**: 作為管理員，我需要調整員工的月度績效獎金，以便靈活管理員工的績效獎金。

#### 驗收標準
- WHEN 管理員選擇年度時 THEN 系統 SHALL 顯示所有員工的月度績效獎金表格（每個月一列）
- WHEN 管理員在表格中輸入調整金額時 THEN 系統 SHALL 允許直接在表格中輸入
- WHEN 管理員調整績效獎金時 THEN 系統 SHALL 將調整後的格子顯示藍色背景，表示已調整
- WHEN 管理員儲存調整時 THEN 系統 SHALL 批量保存所有調整值並自動觸發相關月份的薪資重新計算
- WHEN 管理員查看績效獎金表格時 THEN 系統 SHALL 顯示員工姓名和每個月的績效獎金金額
- IF 績效獎金調整失敗 THEN 系統 SHALL 顯示錯誤訊息並保留已輸入的數據

### BR4.3.2: 年終獎金設定

**User Story**: 作為管理員，我需要設定員工的年終獎金，以便在指定月份將年終獎金計入該員工的薪資。

#### 驗收標準
- WHEN 管理員選擇年度時 THEN 系統 SHALL 顯示所有員工的年終獎金設定
- WHEN 管理員設定年終獎金時 THEN 系統 SHALL 要求輸入年終獎金金額和發放月份（格式：YYYY-MM）
- WHEN 管理員設定年終獎金時 THEN 系統 SHALL 支援跨年發放（例如：2025 年的年終獎金可以設定在 2026 年發放）
- WHEN 管理員儲存年終獎金設定時 THEN 系統 SHALL 保存設定並自動觸發指定月份的薪資重新計算
- WHEN 系統計算薪資時 THEN 系統 SHALL 在指定月份將年終獎金計入該員工的薪資
- IF 年終獎金設定失敗 THEN 系統 SHALL 顯示錯誤訊息並標記錯誤欄位，允許重試
- IF 發放月份格式不正確 THEN 系統 SHALL 顯示驗證錯誤並阻止提交

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 2 秒
- 支援大量員工的獎金管理

### Security
- 只有管理員可以管理績效獎金和年終獎金
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 獎金數據完整準確
- 自動觸發薪資重新計算功能正常
- CRUD 操作穩定

### Usability
- 界面簡潔直觀
- 表格操作流暢
- 調整標記明顯易識別


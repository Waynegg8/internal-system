# Requirements Document: BR5.6: 客戶任務成本分析

## Introduction

客戶任務成本分析功能提供客戶和任務的成本、收入、利潤分析查看功能。本功能幫助管理員查看客戶和任務的成本、收入、利潤等分析資訊。

**User Story**: 作為管理員，我需要查看客戶任務成本分析，以便了解客戶和任務的利潤情況。

## Alignment with Product Vision

本功能支持成本管理系統的核心目標：
- **利潤分析**：清楚了解每個客戶和任務的利潤情況
- **決策支持**：為業務決策提供數據支持

## Requirements

### BR5.6.1: 按客戶查看

**User Story**: 作為管理員，我需要按客戶查看成本分析，以便了解每個客戶的利潤情況。

#### 驗收標準

- WHEN 管理員按客戶查看成本分析時 THEN 系統 SHALL 顯示以下欄位：
  - 客戶名稱
  - 總工時
  - 總成本
  - 收入
  - 利潤
  - 利潤率
- WHEN 管理員展開客戶明細時 THEN 系統 SHALL 顯示：
  - 員工明細
  - 分攤管理費明細
- WHEN 管理員查看分攤管理費明細時 THEN 系統 SHALL 顯示每個成本項目的分攤金額

### BR5.6.2: 按任務查看

**User Story**: 作為管理員，我需要按任務查看成本分析，以便了解每個任務的利潤情況。

#### 驗收標準

- WHEN 管理員按任務查看成本分析時 THEN 系統 SHALL 顯示以下欄位：
  - 任務名稱
  - 客戶名稱（用於識別任務所屬客戶）
  - 工時
  - 成本
  - 收入
  - 利潤
- WHEN 管理員查看任務成本分析時 THEN 系統 SHALL 按任務名稱排序

## Non-Functional Requirements

### Performance
- API 響應時間 < 2 秒
- 頁面載入時間 < 3 秒

### Security
- 僅管理員可以訪問客戶任務成本分析功能
- 使用參數化查詢防止 SQL 注入

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件只負責一個功能模組（Handler、Component、API 函數分離）
- **Modular Design**: 組件、工具函數和服務應隔離且可重用
- **Dependency Management**: 最小化模組間的相互依賴
- **Clear Interfaces**: 定義清晰的組件和層級之間的契約

### Reliability
- 成本、收入、利潤數據準確
- 計算邏輯正確
- 數據一致性：確保與 BR5.4 分攤計算結果一致
- 收入計算：使用 BR1 的應計收入邏輯（從 ClientServices 和 ServiceBillingSchedule 表計算），而非 Receipts 表
  - 定期服務：按執行次數比例分攤
  - 一次性服務：直接使用實際金額
- 錯誤處理：API 錯誤時提供明確的錯誤訊息

### Usability
- 清晰的數據展示：使用表格和展開明細展示分析數據
- 直觀的操作：支援年份月份選擇和視圖切換
- 響應式設計：適配不同螢幕尺寸


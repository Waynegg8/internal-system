# Requirements Document: BR3.3: 收據建立

## Introduction

收據建立功能提供從對帳提醒開立收據和手動建立收據的功能。本功能幫助員工快速建立收據。

**User Story**: 作為會計師事務所的員工，我需要建立收據，以便記錄客戶的收費資訊。

## Alignment with Product Vision

本功能支持收據管理系統的核心目標：
- **提升收據建立效率**：從對帳提醒快速開立收據，減少手動操作
- **確保數據準確性**：自動生成收據編號，確保編號唯一性
- **支援靈活調整**：支援金額調整，滿足不同業務需求

## Requirements

### BR3.3.1: 從對帳提醒開立收據

**User Story**: 作為員工，我需要從對帳提醒中開立收據，以便快速建立收據。

**驗收標準**:
- WHEN 員工從對帳提醒中開立收據時 THEN 系統 SHALL 允許選擇該客戶不同月份的多個服務一起開收據
- WHEN 員工選擇多個服務開立收據時 THEN 系統 SHALL 計算建議金額為所有選中服務的收費計劃金額總和
- WHEN 員工開立收據後 THEN 系統 SHALL 自動標記相關提醒為已完成，不再顯示

### BR3.3.2: 手動建立收據

**User Story**: 作為員工，我需要手動建立收據，以便記錄客戶的收費資訊。

**驗收標準**:
- WHEN 員工創建收據時 THEN 系統 SHALL 關聯客戶、月份、服務類型並記錄收據金額
- WHEN 員工創建收據時 THEN 系統 SHALL 自動生成收據編號，格式為 `YYYYMM-XXX`（例如：`202401-001`）
- WHEN 系統生成收據編號時 THEN 系統 SHALL 基於開立日期（`receipt_date`）的年月作為前綴
- WHEN 系統生成收據編號時 THEN 系統 SHALL 每月獨立計數，從 `001` 開始
- WHEN 同一個月有超過 999 張收據時 THEN 系統 SHALL 使用 4 位數序號（例如：`202401-1000`）
- WHEN 系統查詢最大編號時 THEN 系統 SHALL 包含作廢的收據（查詢時包含 `status = 'cancelled'` 的收據）
- WHEN 系統生成新收據編號時 THEN 系統 SHALL 不重用作廢的收據編號（作廢的收據編號保留，新收據使用新的編號）
- WHEN 員工修改建議金額時 THEN 系統 SHALL 要求填寫修改原因（`amount_adjustment_reason`）
- WHEN 員工選擇多個服務類型時 THEN 系統 SHALL 計算建議金額為所有選中服務的收費計劃金額總和

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 收據建立響應時間 < 1 秒

### Security
- 所有員工都可以建立收據（無權限限制）
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 收據編號生成唯一
- 收據建立功能穩定

### Usability
- 界面簡潔直觀
- 建立流程清晰







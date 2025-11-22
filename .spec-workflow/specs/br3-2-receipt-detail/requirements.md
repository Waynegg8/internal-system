# Requirements Document: BR3.2: 收據詳情

## Introduction

收據詳情功能提供收據的完整資訊展示和管理功能。本功能幫助員工查看收據詳情、編輯收據、作廢收據，並列印收據或請款單。

**User Story**: 作為會計師事務所的員工，我需要查看和管理收據詳情，以便能夠編輯收據、作廢收據，並列印收據或請款單。

## Alignment with Product Vision

本功能支持收據管理系統的核心目標：
- **提升收據管理效率**：集中展示收據資訊，提供統一的管理界面
- **確保數據準確性**：支援編輯和作廢功能，確保收據數據準確
- **支援審計追蹤**：記錄編輯歷史和作廢原因，支援審計追蹤
- **提升工作效率**：支援列印功能，方便向客戶提供收據或請款單

## Requirements

### BR3.2.1: 收據詳情展示

**User Story**: 作為員工，我需要查看收據詳情，以便了解收據的完整資訊。

#### 驗收標準

1. WHEN 員工打開收據詳情頁面時 THEN 系統 SHALL 顯示收據的所有資訊
2. WHEN 員工查看收據詳情時 THEN 系統 SHALL 顯示：收據基本信息、明細項目、付款記錄、編輯歷史

### BR3.2.2: 收據編輯

**User Story**: 作為員工，我需要編輯收據，以便修正收據資訊。

#### 驗收標準

1. WHEN 員工編輯已付款收據時 THEN 系統 SHALL 允許編輯
2. WHEN 員工編輯已作廢收據時 THEN 系統 SHALL 允許編輯
3. WHEN 員工編輯部分付款收據時 THEN 系統 SHALL 允許編輯
4. WHEN 員工編輯收據時 THEN 系統 SHALL 允許修改收據號碼（但不能與現有收據號碼重複，需檢查除當前收據外的所有收據）
5. WHEN 員工編輯收據時 THEN 系統 SHALL 不允許修改客戶（`client_id`），前端表單應禁用此欄位，後端應驗證並拒絕修改請求
6. WHEN 員工編輯收據時 THEN 系統 SHALL 不允許手動修改收據狀態（`status` 欄位），狀態由系統根據付款記錄自動計算
7. WHEN 員工修改收據總金額時 THEN 系統 SHALL 檢查新總金額不能小於已付款金額總和，如果小於則提示錯誤並阻止修改
8. WHEN 員工編輯收據時 THEN 系統 SHALL 記錄編輯歷史（修改前後的值、修改人、修改時間）到 ReceiptEditHistory 表

### BR3.2.3: 收據作廢

**User Story**: 作為員工，我需要作廢收據，以便處理錯誤的收據。

#### 驗收標準

1. WHEN 員工作廢收據時 THEN 系統 SHALL 要求填寫作廢原因（必填）
2. WHEN 員工作廢已付款收據時 THEN 系統 SHALL 允許作廢，但需在付款記錄中標記為「已作廢收據的付款」（退款處理需在財務系統中另行處理，本系統僅標記狀態）
3. WHEN 收據作廢後 THEN 系統 SHALL 保留收據在系統中，標記為 `status = 'cancelled'`，`is_deleted = 0`
4. WHEN 收據作廢後 THEN 系統 SHALL 保留已付款記錄，但標記為「已作廢收據的付款」
5. WHEN 所有員工作廢收據時 THEN 系統 SHALL 允許所有員工作廢收據（無權限限制）

### BR3.2.4: 收據列印

**User Story**: 作為員工，我需要列印收據或請款單，以便向客戶提供收據或請款單。

#### 驗收標準

1. WHEN 員工列印請款單時 THEN 系統 SHALL 先選擇公司資料，然後列印包含公司資訊、客戶資訊、收據明細、費用總計、扣繳金額、銀行帳戶資訊、開立日期的請款單
2. WHEN 員工列印收據時 THEN 系統 SHALL 先選擇公司資料，然後列印包含公司資訊、收據編號、客戶資訊、收據明細、合計金額（中文大寫）、開立日期、簽名欄位、兩聯（收執聯和存查聯）的收據
3. WHEN 員工列印未作廢的收據時 THEN 系統 SHALL 允許列印
4. WHEN 員工列印已作廢的收據時 THEN 系統 SHALL 不允許列印
5. WHEN 員工列印未付款的收據時 THEN 系統 SHALL 允許列印請款單（用於請款）
6. WHEN 公司資料未設定時 THEN 系統 SHALL 提示錯誤並阻止列印
7. WHEN 員工選擇公司資料列印時 THEN 系統 SHALL 支援選擇不同的公司資料（例如：不同統編的公司）

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 2 秒
- 列印響應時間 < 3 秒

### Security
- 所有員工都可以查看、編輯、作廢收據（無權限限制）
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 編輯和作廢功能穩定
- 列印功能穩定
- 編輯歷史記錄完整

### Usability
- 界面簡潔直觀
- 編輯流程清晰
- 列印功能易用


# Requirements Document: BR4.4: 系統設定調整

## Introduction

系統設定調整功能提供統一的系統參數設定界面。本功能幫助管理員調整誤餐費、交通補貼、請假扣款、時薪計算等系統參數。

**User Story**: 作為會計師事務所的管理員，我需要調整系統參數，以便能夠靈活配置薪資計算規則。

## Alignment with Product Vision

本功能支持薪資管理系統的核心目標：
- **提升系統靈活性**：支援調整系統參數，滿足不同業務需求
- **確保計算準確性**：自動觸發薪資重新計算，確保計算準確
- **統一管理**：集中管理系統參數，提供統一的管理界面

## Requirements

### BR4.4.1: 誤餐費設定

**User Story**: 作為管理員，我需要設定誤餐費參數，以便在薪資計算時使用。

#### 驗收標準
1. WHEN 管理員設定誤餐費時 THEN 系統 SHALL 要求輸入誤餐費單價（元/次）和誤餐費最低加班時數
2. IF 誤餐費單價為負數或非數字 THEN 系統 SHALL 顯示驗證錯誤並阻止提交
3. IF 誤餐費最低加班時數為負數或非數字 THEN 系統 SHALL 顯示驗證錯誤並阻止提交
4. WHEN 管理員儲存誤餐費設定時 THEN 系統 SHALL 保存設定並自動觸發所有員工的薪資重新計算
5. WHEN 誤餐費設定保存成功時 THEN 系統 SHALL 顯示成功訊息

### BR4.4.2: 交通補貼設定

**User Story**: 作為管理員，我需要設定交通補貼參數，以便在薪資計算時使用。

#### 驗收標準
1. WHEN 管理員設定交通補貼時 THEN 系統 SHALL 要求輸入每個區間公里數和每個區間金額（元）
2. IF 每個區間公里數為負數、零或非數字 THEN 系統 SHALL 顯示驗證錯誤並阻止提交
3. IF 每個區間金額為負數或非數字 THEN 系統 SHALL 顯示驗證錯誤並阻止提交
4. WHEN 管理員儲存交通補貼設定時 THEN 系統 SHALL 保存設定並自動觸發所有員工的薪資重新計算
5. WHEN 交通補貼設定保存成功時 THEN 系統 SHALL 顯示成功訊息

### BR4.4.3: 請假扣款設定

**User Story**: 作為管理員，我需要設定請假扣款參數，以便在薪資計算時使用。

#### 驗收標準
1. WHEN 管理員設定請假扣款時 THEN 系統 SHALL 要求輸入病假扣款比例、事假扣款比例、日薪計算除數
2. IF 病假扣款比例小於 0 或大於 1 或非數字 THEN 系統 SHALL 顯示驗證錯誤並阻止提交
3. IF 事假扣款比例小於 0 或大於 1 或非數字 THEN 系統 SHALL 顯示驗證錯誤並阻止提交
4. IF 日薪計算除數為負數、零或非數字 THEN 系統 SHALL 顯示驗證錯誤並阻止提交
5. WHEN 管理員儲存請假扣款設定時 THEN 系統 SHALL 保存設定並自動觸發所有員工的薪資重新計算
6. WHEN 請假扣款設定保存成功時 THEN 系統 SHALL 顯示成功訊息

### BR4.4.4: 時薪計算設定

**User Story**: 作為管理員，我需要設定時薪計算參數，以便在薪資計算時使用。

#### 驗收標準
1. WHEN 管理員設定時薪計算時 THEN 系統 SHALL 要求輸入時薪計算除數（預設 240）
2. IF 時薪計算除數為負數、零或非數字 THEN 系統 SHALL 顯示驗證錯誤並阻止提交
3. WHEN 管理員儲存時薪計算設定時 THEN 系統 SHALL 保存設定並自動觸發所有員工的薪資重新計算
4. WHEN 時薪計算設定保存成功時 THEN 系統 SHALL 顯示成功訊息

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 2 秒

### Security
- 只有管理員可以調整系統設定
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證

### Reliability
- 系統參數數據完整準確
- 自動觸發薪資重新計算功能正常
- 設定更新穩定

### Usability
- 界面簡潔直觀
- 表單驗證提示明確
- 設定說明清晰


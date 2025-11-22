# Requirements Document: BR2.5: 任務自動生成

## Introduction

任務自動生成功能根據服務配置和任務配置自動創建需要執行的任務。系統每日檢查並生成任務，支援任務生成預覽和歷史記錄，確保任務及時生成並可追蹤。

**User Story**: 作為會計師事務所的系統，我需要自動生成任務，以便根據服務配置和任務配置自動創建需要執行的任務。

## Alignment with Product Vision

本功能支持任務管理系統的核心目標：
- **自動化流程**：自動化任務生成，減少人工配置工作
- **及時生成任務**：根據任務生成時間規則及時生成任務
- **確保規則正確**：支援任務生成預覽，確保生成規則正確
- **支援審計追蹤**：記錄任務生成歷史，支援追蹤和審計

## Requirements

### BR2.5.1: 任務自動生成邏輯

**User Story**: 作為系統，我需要每日檢查並自動生成任務，以便及時創建需要執行的任務。

**驗收標準**:
- WHEN 系統每日執行任務生成檢查時 THEN 系統 SHALL 在每天 02:00（台灣時間）執行
- WHEN 系統檢查任務生成時 THEN 系統 SHALL 檢查所有需要生成的任務（基於服務的 execution_months 和 use_for_auto_generate）
- WHEN 任務生成時間到達時 THEN 系統 SHALL 根據任務配置的生成時間規則計算實際生成日期（如果配置了 generation_time_rule 則使用該規則，否則回退到現有的 advance_days 邏輯：dueDate - advanceDays）
- WHEN 系統生成任務時 THEN 系統 SHALL 根據任務配置創建任務，包括：
  - 任務基本信息（名稱、描述、負責人等）
  - 任務階段（根據階段配置創建）
  - 任務到期日（根據到期日規則計算）
  - 任務關聯的 SOP（從任務配置中讀取）
- WHEN 系統生成任務時 THEN 系統 SHALL 檢查任務是否已存在（避免重複生成）
- WHEN 系統生成任務成功時 THEN 系統 SHALL 記錄任務生成歷史到 TaskGenerationHistory 表
- WHEN 系統生成任務失敗時 THEN 系統 SHALL 記錄錯誤訊息到 TaskGenerationHistory 表，並標記生成狀態為 failed 或 partial

### BR2.5.2: 任務生成時間計算

**User Story**: 作為系統，我需要根據任務生成時間規則計算實際生成日期，以便在正確的時間生成任務。

**驗收標準**:
- WHEN 系統計算任務生成時間時 THEN 系統 SHALL 根據以下規則計算：
  - 「服務月份開始時」：服務月份的第一天（例如：2024-03-01）
  - 「服務月份前一個月的最後X天」：服務月份前一個月的最後X天（例如：服務月份為3月，前一個月為2月，最後3天為 2024-02-27, 2024-02-28, 2024-02-29）
  - 「服務月份前一個月的第X天」：服務月份前一個月的第X天（如果該月沒有X日，則為該月最後一天，例如：前一個月為2月，第31天則為 2024-02-29）
  - 「服務月份後一個月開始時」：服務月份後一個月的第一天（例如：服務月份為3月，後一個月為4月，生成時間為 2024-04-01）
- WHEN 系統計算生成時間時 THEN 系統 SHALL 考慮服務的執行月份（execution_months）
- WHEN 系統計算生成時間時 THEN 系統 SHALL 處理月份天數不足的情況（例如：2月沒有31日）

### BR2.5.3: 任務到期日計算

**User Story**: 作為系統，我需要根據任務到期日規則計算實際到期日，以便設定正確的任務到期日。

**驗收標準**:
- WHEN 系統計算任務到期日時 THEN 系統 SHALL 根據以下規則計算：
  - 「服務月份結束時」：服務月份的最後一天（例如：2024-03-31）
  - 「服務月份後一個月結束時」：服務月份後一個月的最後一天（例如：服務月份為3月，後一個月為4月，到期日為 2024-04-30）
  - 「服務月份後N個月結束時」：服務月份後N個月的最後一天（例如：服務月份為3月，後2個月為5月，到期日為 2024-05-31）
  - 「固定日期」：每月指定日期（如果該月沒有指定日期，則為該月最後一天，例如：每月15日，2月則為 2024-02-29）
  - 「固定期限」：服務月份指定日期（用於稅務申報等固定期限任務，例如：服務月份為3月，固定期限為每月15日，則到期日為 2024-03-15）
- WHEN 系統計算到期日時 THEN 系統 SHALL 考慮固定期限任務的特殊處理（不受前置任務延後影響）
- WHEN 系統計算到期日時 THEN 系統 SHALL 處理月份天數不足的情況

### BR2.5.4: 固定期限任務處理

**User Story**: 作為系統，我需要處理固定期限任務，以便確保固定期限任務不受前置任務延後影響。

**驗收標準**:
- WHEN 系統生成固定期限任務時 THEN 系統 SHALL 標記任務為固定期限（is_fixed_deadline = true）
- WHEN 前置任務延誤時 THEN 系統 SHALL 不影響固定期限任務的到期日
- WHEN 前置任務延誤導致中間任務無法在固定期限前完成時 THEN 系統 SHALL 計算中間任務的預估完成時間（考慮 estimated_hours 或 estimated_work_days，將小時轉換為天數），如果預估完成時間超過固定期限，則調整中間任務的到期日為「固定期限的前一天」
- WHEN 前置任務延誤時 THEN 系統 SHALL 發送通知給後續任務負責人、階段負責人和客戶負責人

### BR2.5.5: 任務生成預覽

**User Story**: 作為員工，我需要預覽任務生成效果，以便確認任務生成規則設定正確。

**驗收標準**:
- WHEN 員工在服務設定中配置任務時 THEN 系統 SHALL 提供任務生成預覽功能
- WHEN 員工查看任務生成預覽時 THEN 系統 SHALL 顯示以下資訊：
  - 任務名稱
  - 生成時間（實際日期）
  - 到期日（實際日期）
  - 服務月份
- WHEN 員工查看任務生成預覽時 THEN 系統 SHALL 顯示整個當月服務的完整情況（包括該服務月份所有需要生成的任務），而不只是單個任務
- WHEN 員工調整任務生成時間或到期日規則時 THEN 系統 SHALL 即時更新預覽

### BR2.5.6: 任務生成歷史記錄

**User Story**: 作為員工，我需要查看任務生成歷史，以便追蹤任務生成情況。

**驗收標準**:
- WHEN 系統生成任務時 THEN 系統 SHALL 記錄任務生成歷史
- WHEN 系統記錄任務生成歷史時 THEN 系統 SHALL 記錄以下資訊到 TaskGenerationHistory 表：
  - 生成時間（generation_time）
  - 服務年份（service_year）
  - 服務月份（service_month）
  - 客戶 ID（client_id）
  - 客戶服務 ID（client_service_id）
  - 服務名稱（service_name）
  - 生成的任務列表（generated_tasks，JSON 格式）
  - 生成狀態（generation_status：success/failed/partial）
  - 成功生成的任務數量（generated_count）
  - 跳過的任務數量（skipped_count）
  - 錯誤訊息（error_message，如果失敗）
- WHEN 員工查看任務生成歷史時 THEN 系統 SHALL 提供獨立的頁面（有獨立 URL）
- WHEN 員工查看任務生成歷史時 THEN 系統 SHALL 支援按時間範圍（generation_time）、客戶（client_id）、服務類型（可通過 client_service_id 關聯查詢）篩選
- WHEN 員工查看任務生成歷史時 THEN 系統 SHALL 顯示生成詳情（包括生成的任務列表）

---

## 業務規則

### 任務生成觸發規則

- 系統每日 02:00（台灣時間）執行任務生成檢查
- 檢查所有需要生成的任務（基於服務的 execution_months 和 use_for_auto_generate）
- 只有 `use_for_auto_generate = 1` 的服務才會自動生成任務
- 任務生成時間基於任務配置的生成時間規則（generation_time_rule），如果未配置則使用現有的 advance_days 邏輯（向後兼容）

### 任務生成時間規則

- 生成時間規則使用直觀的描述（例如：「服務月份開始時」）
- 生成時間計算考慮服務的執行月份（execution_months）
- 處理月份天數不足的情況（例如：2月沒有31日）

### 任務到期日規則

- 到期日規則使用直觀的描述
- 固定日期處理：如果該月沒有指定日期，則為該月最後一天
- 固定期限任務不受前置任務延後影響

### 固定期限任務處理規則

- 固定期限任務的到期日不受前置任務延後影響
- 如果前置任務延誤導致中間任務無法在固定期限前完成：
  - 計算中間任務的預估完成時間（考慮 estimated_hours 或 estimated_work_days，將小時轉換為天數）
  - 如果預估完成時間超過固定期限，則調整中間任務的到期日為「固定期限的前一天」
  - 發送通知給後續任務負責人、階段負責人和客戶負責人

### 任務生成歷史記錄規則

- 每次任務生成都記錄歷史
- 歷史記錄包括生成詳情和生成狀態
- 歷史記錄支援篩選和查詢

---

## 非功能性需求

### Code Architecture and Modularity
- **Single Responsibility Principle**: Each file should have a single, well-defined purpose
- **Modular Design**: Components, utilities, and services should be isolated and reusable
- **Dependency Management**: Minimize interdependencies between modules
- **Clear Interfaces**: Define clean contracts between components and layers

### 性能要求

- 任務生成檢查執行時間 < 30 秒
- 任務生成預覽響應時間 < 500ms
- 任務生成歷史查詢響應時間 < 2 秒

### Security

- 任務生成邏輯應驗證服務配置的有效性
- 任務生成應遵循權限控制機制
- 任務生成歷史記錄應保護敏感資訊
- 防止重複生成和惡意觸發任務生成

### 可靠性要求

- 任務生成失敗時有明確錯誤記錄
- 任務生成歷史記錄完整準確
- 避免重複生成任務

### 可維護性要求

- 任務生成邏輯清晰，易於維護
- 任務生成歷史支援追蹤和審計
- 任務生成規則易於調整


# Requirements Document: BR2.3: 任務創建

## Introduction

任務創建功能在服務設定中提供任務配置界面，幫助員工為客戶服務設定需要執行的任務。支援任務模板套用、即時預覽、一次性服務立即生成和定期服務自動生成等功能。

**User Story**: 作為會計師事務所的員工，我需要在服務設定中創建任務配置，以便為客戶服務設定需要執行的任務。

## Alignment with Product Vision

本功能支持任務管理系統的核心目標：
- **提升配置效率**：在服務設定中統一管理任務配置，提升配置效率
- **減少重複工作**：支援任務模板套用，減少重複配置工作
- **確保設定正確**：提供即時預覽功能，確保任務生成時間和到期日設定正確
- **自動化任務生成**：支援一次性服務立即生成任務，定期服務自動生成任務

## Requirements

### BR2.3.1: 任務配置創建

**User Story**: 作為員工，我需要在服務設定中創建任務配置，以便設定服務需要執行的任務。

#### Acceptance Criteria
- WHEN 員工在服務設定中配置任務時 THEN 系統 SHALL 允許添加多個任務配置
- WHEN 員工添加任務配置時 THEN 系統 SHALL 要求填寫以下資訊：
  - 任務名稱（從服務類型下的任務類型列表下拉選擇，必填，不是手動輸入）
  - 階段編號（stage_order，必填，從 1 開始，整數）
  - 負責人（可選，從用戶列表選擇）
  - 預估工時（estimated_hours，可選，正數，單位：小時）
  - 任務生成時間規則（generation_time_rule，必填）
  - 任務生成時間參數（generation_time_params，根據規則類型必填或可選）
  - 任務到期日規則（due_date_rule，必填）
  - 任務到期日參數（due_date_params，根據規則類型必填或可選）
  - 是否為固定期限任務（is_fixed_deadline，可選，默認為 false）
  - 服務層級 SOP（多選，可取消預設）
  - 任務層級 SOP（多選，可取消預設）
  - 任務描述（可選，文本）
  - 備註（可選，文本）
- WHEN 員工填寫階段編號時 THEN 系統 SHALL 驗證階段編號的唯一性（同一服務下不能有重複的階段編號）
- WHEN 員工選擇任務名稱時 THEN 系統 SHALL 從服務類型下的任務類型列表（ServiceItems）中選擇
- WHEN 員工配置任務時 THEN 系統 SHALL 提供即時預覽，顯示實際的生成時間和到期日
- WHEN 員工編輯任務配置時 THEN 系統 SHALL 允許修改所有可配置欄位，並驗證修改後的數據有效性
- WHEN 員工刪除任務配置時 THEN 系統 SHALL 確認刪除操作，並檢查是否已有生成的任務（如有則提示影響）
- WHEN 員工保存任務配置時 THEN 系統 SHALL 驗證所有必填欄位，驗證失敗時阻止保存並顯示錯誤提示

### BR2.3.2: 任務生成時間規則

**User Story**: 作為員工，我需要設定任務生成時間規則，以便控制任務何時自動生成。

#### Acceptance Criteria
- WHEN 員工設定任務生成時間時 THEN 系統 SHALL 提供以下規則選項：
  - 服務月份開始時（例如：3月1日生成3月的任務）
  - 服務月份前一個月的最後X天（例如：1月28日生成2月的任務，X=3）
  - 服務月份前一個月的第X天（例如：1月25日生成2月的任務，X=25）
  - 服務月份後一個月開始時（例如：2月1日生成1月的任務）
- WHEN 員工選擇生成時間規則時 THEN 系統 SHALL 即時顯示預覽效果（例如：「3月的任務在3月1日生成」）
- WHEN 員工設定生成時間參數時 THEN 系統 SHALL 根據規則類型顯示對應的參數輸入欄位
- WHEN 員工選擇「服務月份前一個月的最後X天」時 THEN 系統 SHALL 顯示天數輸入欄位（days），範圍為 1-31
- WHEN 員工選擇「服務月份前一個月的第X天」時 THEN 系統 SHALL 顯示日期輸入欄位（day），範圍為 1-31

### BR2.3.3: 任務到期日規則

**User Story**: 作為員工，我需要設定任務到期日規則，以便控制任務何時到期。

#### Acceptance Criteria
- WHEN 員工設定任務到期日時 THEN 系統 SHALL 提供以下規則選項：
  - 服務月份結束時（例如：3月31日）
  - 服務月份後一個月結束時（例如：4月30日）
  - 服務月份後N個月結束時（例如：服務月份+2個月的月底）
  - 固定日期（例如：每月15日，如果該月沒有15日則為該月最後一天）
  - 固定期限（例如：服務月份15日，用於稅務申報等固定期限任務）
- WHEN 員工選擇到期日規則時 THEN 系統 SHALL 即時顯示預覽效果（例如：「到期日是3月15日」）
- WHEN 員工設定固定日期時 THEN 系統 SHALL 處理月份天數不足的情況（例如：2月沒有31日，則為2月最後一天）
- WHEN 員工選擇「服務月份後N個月結束時」時 THEN 系統 SHALL 顯示月數輸入欄位（months），範圍為 1-12
- WHEN 員工選擇「固定日期」時 THEN 系統 SHALL 顯示日期輸入欄位（day），範圍為 1-31，並處理月份天數不足的情況
- WHEN 員工選擇「固定期限」時 THEN 系統 SHALL 顯示日期輸入欄位（day），範圍為 1-31，並自動設置 is_fixed_deadline = true

### BR2.3.4: 固定期限任務

**User Story**: 作為員工，我需要設定固定期限任務，以便處理不受前置任務延後影響的任務。

#### Acceptance Criteria
- WHEN 員工設定任務為固定期限任務時 THEN 系統 SHALL 標記該任務為固定期限（is_fixed_deadline = true）
- WHEN 前置任務延誤時 THEN 系統 SHALL 不影響固定期限任務的到期日
- WHEN 前置任務延誤導致中間任務無法在固定期限前完成時 THEN 系統 SHALL 調整中間任務的到期日為「固定期限的前一天減去中間任務的預估工時（estimated_hours，將小時轉換為天數）」，確保中間任務有足夠時間完成
- WHEN 前置任務延誤時 THEN 系統 SHALL 通知後續任務負責人、階段負責人和客戶負責人
- WHEN 系統調整中間任務到期日時 THEN 系統 SHALL 記錄調整原因和原始到期日，以便審計追蹤

### BR2.3.5: 任務預覽功能

**User Story**: 作為員工，我需要預覽任務生成效果，以便確認任務生成時間和到期日設定正確。

#### Acceptance Criteria
- WHEN 員工配置任務生成時間和到期日時 THEN 系統 SHALL 即時顯示預覽效果
- WHEN 系統顯示預覽時 THEN 系統 SHALL 顯示以下資訊：
  - 任務名稱
  - 生成時間（實際日期）
  - 到期日（實際日期）
  - 服務月份
- WHEN 員工查看預覽時 THEN 系統 SHALL 顯示整個當月服務的完整情況，而不只是單個任務
- WHEN 員工調整生成時間或到期日規則時 THEN 系統 SHALL 即時更新預覽
- WHEN 系統顯示預覽時 THEN 系統 SHALL 按階段編號（stage_order）排序顯示任務
- WHEN 預覽中任務的生成時間或到期日計算失敗時 THEN 系統 SHALL 顯示錯誤提示，並標記該任務配置需要修正

### BR2.3.6: SOP 自動綁定

**User Story**: 作為員工，我需要自動綁定 SOP 到任務，以便任務生成時自動關聯相關 SOP。

#### Acceptance Criteria
- WHEN 員工配置任務時 THEN 系統 SHALL 自動讀取服務層級 SOP（從知識庫讀取，根據服務類型和客戶篩選）
- WHEN 系統自動綁定 SOP 時 THEN 系統 SHALL 優先使用客戶專屬 SOP，如果沒有則使用統一模板
- WHEN 客戶有多個專屬服務層級 SOP 時 THEN 系統 SHALL 全部預設選中，員工可自行決定是否保留
- WHEN 系統讀取服務層級 SOP 時 THEN 系統 SHALL 根據服務的 service_id 找到對應的 Services.service_code，然後根據 SOPDocuments.category（對應 Services.service_code）和客戶 ID（client_id）篩選，優先顯示客戶專屬 SOP（client_id 匹配），其次顯示統一模板 SOP（client_id 為 NULL）
- WHEN 員工取消選擇預設的服務層級 SOP 時 THEN 系統 SHALL 允許取消，但應提示可能影響任務執行
- WHEN 員工選擇任務層級 SOP 時 THEN 系統 SHALL 先根據服務的 service_id 找到對應的 Services.service_code，然後根據 SOPDocuments.category（對應 Services.service_code）篩選，再篩選層級（scope = 'task'）
- WHEN 員工選擇 SOP 時 THEN 系統 SHALL 支援多選，並可取消預設帶入的 SOP
- WHEN 員工選擇 SOP 時 THEN 系統 SHALL 使用內嵌選擇形式（非彈窗），類似任務創建時的 SOP 選擇

### BR2.3.7: 一次性服務任務生成

**User Story**: 作為員工，我需要在一次性服務設定完成後立即生成任務，以便及時開始執行任務。

#### Acceptance Criteria
- WHEN 員工設定一次性服務並保存時 THEN 系統 SHALL 立即生成該服務的所有任務
- WHEN 系統生成一次性服務任務時 THEN 系統 SHALL 使用服務月份作為任務的服務月份
- WHEN 系統生成一次性服務任務時 THEN 系統 SHALL 根據任務配置的生成時間和到期日規則計算實際日期
- WHEN 員工配置一次性服務的任務時 THEN 系統 SHALL 隱藏「用於自動生成任務」選項（一次性服務不需要此選項）
- WHEN 系統生成一次性服務任務時 THEN 系統 SHALL 根據任務配置的生成時間規則判斷是否立即生成（如果生成時間已到或已過，則立即生成；否則在生成時間到達時生成）

### BR2.3.8: 定期服務任務配置

**User Story**: 作為員工，我需要在定期服務中配置任務，以便系統自動生成任務。

#### Acceptance Criteria
- WHEN 員工設定定期服務的任務配置時 THEN 系統 SHALL 保存任務配置到服務設定中
- WHEN 系統自動生成任務時 THEN 系統 SHALL 根據任務配置和服務的執行月份（execution_months）生成任務
- WHEN 員工在現有定期服務中新增任務時 THEN 系統 SHALL 提供以下選項：
  - 選項 A：僅為當前月份生成（一次性）
  - 選項 B：保存為模板，用於未來自動生成（use_for_auto_generate = true）
  - 選項 C：保留設定，未來可手動加入（use_for_auto_generate = false）
- WHEN 員工選擇「僅為當前月份生成」時 THEN 系統 SHALL 立即為當前月份生成任務，但不保存為模板
- WHEN 員工選擇「保存為模板」時 THEN 系統 SHALL 保存任務配置並設置 use_for_auto_generate = true，用於未來自動生成
- WHEN 員工選擇「保留設定」時 THEN 系統 SHALL 保存任務配置但設置 use_for_auto_generate = false，未來需手動加入

---

## 業務規則

### 任務名稱管理規則

- 任務名稱必須從服務類型下的任務類型列表（ServiceItems）中選擇
- 任務類型在系統設定頁面管理（每個服務類型下可設置多個任務類型）
- 任務名稱不能手動輸入

### 任務生成時間規則

- 生成時間規則使用直觀的描述（例如：「服務月份開始時」），而非「+1個月-1個月」這種難以理解的格式
- 生成時間參數根據規則類型不同而不同：
  - 「服務月份前一個月的最後X天」：參數為 days（天數）
  - 「服務月份前一個月的第X天」：參數為 day（日期）
  - 「服務月份後一個月開始時」：無需參數

### 任務到期日規則

- 到期日規則使用直觀的描述
- 固定日期處理：如果該月沒有指定日期（例如：2月沒有31日），則為該月最後一天
- 固定期限任務不受前置任務延後影響

### 固定期限任務處理規則

- 固定期限任務的到期日不受前置任務延後影響
- 如果前置任務延誤導致中間任務無法在固定期限前完成：
  - 計算中間任務的預估完成時間（考慮 estimated_hours，將小時轉換為天數）
  - 如果預估完成時間超過固定期限，則調整中間任務的到期日為「固定期限的前一天減去中間任務的預估工時（estimated_hours，將小時轉換為天數）」，確保中間任務有足夠時間完成
  - 發送通知給後續任務負責人、階段負責人和客戶負責人
  - 記錄調整原因和原始到期日，以便審計追蹤

### SOP 綁定規則

- 服務層級 SOP：
  - 從知識庫自動讀取（根據服務的 service_id 找到 Services.service_code，對應 SOPDocuments.category，並根據 client_id 篩選）
  - 優先使用客戶專屬 SOP（client_id 匹配），如果沒有則使用統一模板（client_id 為 NULL）
  - 如果客戶有多個專屬 SOP，全部預設選中
- 任務層級 SOP：
  - 先根據服務的 service_id 找到 Services.service_code，對應 SOPDocuments.category 篩選，再篩選層級（scope = 'task'）
  - 支援多選，可取消預設帶入的 SOP
- SOP 選擇使用內嵌形式（非彈窗）

### 任務生成規則

- 一次性服務：設定完成後立即生成任務
- 定期服務：根據任務配置和服務的執行月份（execution_months）自動生成
- 任務生成時間基於任務配置的生成時間規則
- 任務到期日基於任務配置的到期日規則

---

## 非功能性需求

### Code Architecture and Modularity
- **Single Responsibility Principle**: Each file should have a single, well-defined purpose
- **Modular Design**: Components, utilities, and services should be isolated and reusable
- **Dependency Management**: Minimize interdependencies between modules
- **Clear Interfaces**: Define clean contracts between components and layers

### Performance

- 任務配置保存響應時間 < 1 秒
- 預覽功能響應時間 < 500ms
- 一次性服務任務生成時間 < 3 秒

### Security

- 所有輸入資料應進行驗證和清理，防止 SQL 注入和 XSS 攻擊
- 任務配置資料的存取應遵循權限控制機制
- 任務生成規則應驗證有效性，防止惡意配置
- 敏感資訊應在傳輸和存儲時進行適當保護

### Reliability

- 任務配置驗證完整，防止錯誤配置
- 任務生成失敗時有明確錯誤提示
- 固定期限任務處理邏輯正確，避免任務衝突
- 任務生成時間和到期日計算邏輯正確，處理邊緣情況（閏年、月份天數不同等）

### Usability

- 任務生成時間和到期日規則描述清晰易懂
- 預覽功能即時顯示，幫助用戶理解設定效果
- SOP 選擇界面直觀易用
- 一次性服務和定期服務的任務配置流程清晰明確


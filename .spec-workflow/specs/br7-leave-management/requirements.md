# Requirements Document: BR7: 假期管理（Leaves）

## Introduction

假期管理功能提供員工假期申請、餘額管理、生活事件登記等功能。本功能幫助員工管理各類假別與餘額，支持申請、餘額扣減、併入薪資扣款與工時規則。

**User Story**: 作為會計師事務所的員工，我需要申請和管理假期，以便能夠記錄請假情況、追蹤假期餘額，並確保假期記錄與薪資結算正確整合。

**路由**
- 假期申請：`/leaves`

## Alignment with Product Vision

本功能支持人力資源管理的核心目標：
- **提升假期管理效率**：集中管理所有假期申請和餘額，提供統一的查看和管理界面
- **自動化餘額計算**：根據年資、生活事件等自動計算假期餘額
- **確保數據準確性**：與薪資系統整合，確保假期扣款準確
- **提升工作效率**：簡化假期申請流程，無需審批即可生效

## Requirements

### BR7.1: 假期申請

**User Story**: 作為員工，我需要申請假期，以便記錄請假情況。

#### 驗收標準
- WHEN 員工申請假期時 THEN 系統 SHALL 檢查餘額是否足夠，餘額不足時阻止提交並顯示錯誤訊息
- WHEN 員工申請假期成功時 THEN 系統 SHALL 立即扣減對應餘額（補休採 FIFO，按產生日期排序）
- WHEN 員工申請颱風假時 THEN 系統 SHALL 允許申請（無餘額限制），且薪資結算時扣 100% 薪水
- WHEN 員工未登記生活事件時 THEN 系統 SHALL 不顯示對應的假別選項（產假、產檢假、陪產假、婚假、喪假）
- WHEN 生活事件假期餘額為 0 時 THEN 系統 SHALL 隱藏該事件餘額顯示，且該假別不出現在選單中
- WHEN 員工申請假期時 THEN 系統 SHALL 自動計算請假時數（扣除午休，午休時間為 12:00-13:00）
- WHEN 員工申請假期時 THEN 系統 SHALL 如果請假時間跨越午休時間（12:00-13:00），自動扣除 1 小時午休時間
- WHEN 員工申請假期成功時 THEN 系統 SHALL 直接設為「已核准」（approved）狀態，不需要審批流程

### BR7.2: 假期餘額管理

**User Story**: 作為員工，我需要查看假期餘額，以便了解可用的假期額度。

#### 驗收標準
- WHEN 員工查看假期餘額時 THEN 系統 SHALL 顯示以下假別的餘額：
  - 特休（依年資計算）
  - 病假（固定 30 天/年）
  - 事假（固定 14 天/年）
  - 補休（來自加班產生，按產生日期排序）
  - 生活事件假期（由生活事件自動給予）
- WHEN 生活事件假期餘額為 0 時 THEN 系統 SHALL 隱藏該事件餘額顯示
- WHEN 員工查看補休餘額時 THEN 系統 SHALL 顯示補休總餘額（按產生日期排序）
- WHEN 補休到期時 THEN 系統 SHALL 自動轉換剩餘未使用的時數為加班費（入薪資），並更新 CompensatoryLeaveGrants 狀態為 'expired'

### BR7.3: 假期記錄查詢

**User Story**: 作為員工，我需要查看假期記錄，以便追蹤請假歷史。

#### 驗收標準
- WHEN 員工查看假期記錄時 THEN 系統 SHALL 支援依期間（年份、月份）查詢
- WHEN 管理員查看假期記錄時 THEN 系統 SHALL 支援依人員查詢（可查看所有員工）
- WHEN 員工查看假期記錄時 THEN 系統 SHALL 支援依假別查詢
- WHEN 員工查看假期記錄時 THEN 系統 SHALL 顯示假期記錄列表（假別、日期、時數、提交日期等）

### BR7.4: 假期編輯與刪除

**User Story**: 作為員工，我需要編輯或刪除假期記錄，以便修正錯誤的申請。

#### 驗收標準
- WHEN 員工編輯假期時 THEN 系統 SHALL 先歸還原額度（補休按 FIFO 順序歸還），再扣減新額度（補休按 FIFO 順序扣減），餘額不足時不允許修改
- WHEN 員工刪除假期時 THEN 系統 SHALL 歸還對應的假期餘額
- WHEN 員工刪除補休假期時 THEN 系統 SHALL 按照 FIFO 順序（按產生日期排序，先歸還到最早產生的記錄），歸還到對應的 `CompensatoryLeaveGrants` 記錄中，更新 `hours_remaining` 和 `hours_used`

### BR7.5: 生活事件管理

**User Story**: 作為員工，我需要登記生活事件，以便獲得對應的假期額度。

#### 驗收標準
- WHEN 員工登記生活事件時 THEN 系統 SHALL 自動給予對應的假期額度（如婚假 8 天、喪假 8 天、產假 42 天等）
- WHEN 員工登記生活事件時 THEN 系統 SHALL 根據事件類型確定對應的假別和天數
- WHEN 員工查看生活事件記錄時 THEN 系統 SHALL 顯示生活事件記錄列表（事件類型、日期、對應假別等）
- WHEN 員工刪除生活事件時 THEN 系統 SHALL 收回給予的假期額度（重新計算假期餘額）
- WHEN 生活事件假期餘額為 0 時 THEN 系統 SHALL 隱藏該事件餘額顯示，且該假別不出現在選單中
- WHEN 員工申請生活事件假期時 THEN 系統 SHALL 不檢查有效期，過期仍可申請

### BR7.6: 補休 FIFO 管理

**User Story**: 作為員工，我需要使用補休，系統應按照 FIFO 順序扣減補休額度。

#### 驗收標準
- WHEN 員工申請補休時 THEN 系統 SHALL 按產生日期排序，先扣最早產生的補休
- WHEN 員工申請補休時 THEN 系統 SHALL 如果單筆補休額度不足，自動使用多筆補休來滿足申請時數
- WHEN 員工部分使用補休時 THEN 系統 SHALL 保留在該筆補休記錄中，更新 `hours_used` 和 `hours_remaining`（`hours_remaining = hours_generated - hours_used`），狀態保持為 'active'
- WHEN 補休完全使用時 THEN 系統 SHALL 更新 CompensatoryLeaveGrants 狀態為 'fully_used'，並更新 `hours_used` 等於 `hours_generated`，`hours_remaining` 等於 0
- WHEN 補休到期時 THEN 系統 SHALL 自動轉換剩餘未使用的時數為加班費（入薪資），並更新狀態為 'expired'

### BR7.7: 假別選單過濾

**User Story**: 作為員工，我需要看到可用的假別選項，系統應根據性別和生活事件自動過濾。

#### 驗收標準
- WHEN 員工查看假別選單時 THEN 系統 SHALL 顯示基本假別（特休、病假、事假、補休、公假、颱風假）給所有員工
- WHEN 女性員工查看假別選單時 THEN 系統 SHALL 顯示生理假選項
- WHEN 員工查看假別選單時 THEN 系統 SHALL 只有當生活事件假期有可用餘額（`days_remaining > 0`）時，才顯示對應的假別選項（產假、產檢假、陪產假、婚假、喪假）
- WHEN 員工未登記生活事件或餘額為 0 時 THEN 系統 SHALL 不顯示對應的假別選項

### BR7.8: 薪資整合

**User Story**: 作為系統，我需要將假期記錄整合到薪資結算中，確保扣款準確。

#### 驗收標準
- WHEN 進行薪資結算時 THEN 系統 SHALL 依假別規則執行扣款或免扣（颱風假扣 100%）
- WHEN 補休到期時 THEN 系統 SHALL 自動轉換剩餘未使用的時數為加班費（入薪資）
- WHEN 員工申請假期成功時 THEN 系統 SHALL 觸發重新計算薪資（異步執行）

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個文件應該有單一、明確的職責
- **Modular Design**: 組件、工具和服務應該隔離且可重用
- **Dependency Management**: 最小化模組之間的相互依賴
- **Clear Interfaces**: 定義組件和層之間的清晰契約

### Performance
- API 響應時間 < 500ms
- 頁面載入時間 < 3 秒
- 餘額計算響應時間 < 1 秒
- 支援快取機制以提升查詢效能

### Security
- 員工只能查看和編輯自己的假期記錄（管理員可查看所有員工）
- 使用參數化查詢防止 SQL 注入
- 前端輸入驗證和後端驗證
- 確保餘額扣減的原子性操作

### Reliability
- 餘額扣減和歸還操作必須是原子性的
- 補休 FIFO 扣減邏輯必須準確
- 生活事件假期餘額計算必須準確
- 與薪資系統的整合必須可靠

### Usability
- 界面簡潔直觀
- 假別選單自動過濾，減少用戶困惑
- 餘額顯示清晰，易於理解
- 申請流程簡單，無需審批即可生效

# Requirements Document: BR2.2: 任務詳情

## Introduction

任務詳情功能提供完整的任務資訊展示和管理界面，幫助員工了解任務全貌、更新任務狀態、管理任務階段，並查看任務相關的 SOP 和文檔。

**User Story**: 作為會計師事務所的員工，我需要查看和管理任務詳情，以便了解任務的完整資訊、更新任務狀態、管理任務階段，並查看任務相關的 SOP 和文檔。

## Alignment with Product Vision

本功能支持任務管理系統的核心目標：
- **完整資訊展示**：提供完整的任務資訊展示，幫助員工了解任務全貌
- **準確進度追蹤**：支援任務狀態和階段管理，確保任務進度追蹤準確
- **提升執行效率**：整合 SOP 和文檔管理，提升任務執行效率
- **支援審計追蹤**：記錄完整的變更歷史，支援審計和追蹤

## Requirements

### BR2.2.1: 任務基本信息展示

**User Story**: 作為員工，我需要查看任務的基本資訊，以便了解任務的詳細情況。

**驗收標準**:
- WHEN 員工打開任務詳情頁面時 THEN 系統 SHALL 顯示以下基本信息：
  - 任務名稱
  - 客戶名稱（可點擊跳轉到客戶詳情）
  - 服務名稱
  - 服務月份（格式：YYYY-MM）
  - 負責人（可編輯）
  - 狀態（唯讀，需通過「更新狀態說明」彈窗更新）
  - 到期日
  - 是否逾期
  - 預估工時（estimated_hours）
  - 任務描述
  - 備註
- WHEN 員工點擊客戶名稱時 THEN 系統 SHALL 跳轉到客戶詳情頁面
- WHEN 員工更新負責人時 THEN 系統 SHALL 立即保存並顯示成功提示
- WHEN 員工更新負責人時 THEN 系統 SHALL 記錄變更歷史（原負責人、新負責人、變更時間、變更人）

### BR2.2.2: 任務階段管理

**User Story**: 作為員工，我需要查看和管理任務階段，以便了解任務進度和階段狀態。

**驗收標準**:
- WHEN 員工查看任務詳情時 THEN 系統 SHALL 顯示所有任務階段，按階段順序排列
- WHEN 系統顯示階段時 THEN 系統 SHALL 顯示以下資訊：
  - 階段名稱（可命名，在設定頁面管理）
  - 階段編號（stage_order）
  - 階段狀態（pending、in_progress、completed）
  - 開始時間
  - 完成時間
  - 延遲天數
  - 階段備註
- WHEN 任務階段狀態變化時 THEN 系統 SHALL 自動更新階段狀態（不需要手動更新）
- WHEN 前置階段的所有任務都完成時 THEN 系統 SHALL 自動將下一階段狀態更新為「pending」（可開始狀態）
- WHEN 員工需要確認階段同步時 THEN 系統 SHALL 在確認後才同步階段狀態

### BR2.2.3: 任務狀態更新

**User Story**: 作為員工，我需要更新任務狀態，以便記錄任務進度。

**驗收標準**:
- WHEN 員工點擊「更新狀態」按鈕時 THEN 系統 SHALL 打開「更新狀態說明」彈窗
- WHEN 員工更新任務狀態時 THEN 系統 SHALL 要求填寫狀態說明（必填）
- WHEN 員工更新任務狀態時 THEN 系統 SHALL 允許調整到期日（必須通過此彈窗調整）
- WHEN 員工調整到期日時 THEN 系統 SHALL 記錄調整原因和調整人
- WHEN 員工更新狀態成功時 THEN 系統 SHALL 記錄變更歷史並顯示成功提示

### BR2.2.4: 任務 SOP 關聯

**User Story**: 作為員工，我需要查看和管理任務關聯的 SOP，以便參考標準作業程序。

**驗收標準**:
- WHEN 員工查看任務詳情時 THEN 系統 SHALL 顯示任務關聯的 SOP 列表
- WHEN 系統顯示 SOP 時 THEN 系統 SHALL 顯示以下資訊：
  - SOP 標題
  - SOP 分類
  - SOP 版本
- WHEN 員工點擊「管理 SOP」按鈕時 THEN 系統 SHALL 打開 SOP 選擇界面（內嵌形式，非彈窗）
- WHEN 員工選擇 SOP 時 THEN 系統 SHALL 支援多選，並可取消已選的 SOP
- WHEN 員工保存 SOP 關聯時 THEN 系統 SHALL 記錄變更歷史

### BR2.2.5: 任務文檔管理

**User Story**: 作為員工，我需要上傳和管理任務相關文檔，以便保存任務執行過程中的文件。

**驗收標準**:
- WHEN 員工查看任務詳情時 THEN 系統 SHALL 顯示任務關聯的文檔列表
- WHEN 系統顯示文檔時 THEN 系統 SHALL 顯示以下資訊：
  - 文檔名稱
  - 上傳時間
  - 上傳人
  - 文檔大小
- WHEN 員工上傳文檔時 THEN 系統 SHALL 上傳到知識庫-附件，並自動綁定該任務
- WHEN 員工上傳文檔成功時 THEN 系統 SHALL 記錄變更歷史
- WHEN 員工下載文檔時 THEN 系統 SHALL 允許下載文檔
- WHEN 員工刪除文檔時 THEN 系統 SHALL 要求確認，刪除後記錄變更歷史

### BR2.2.6: 任務變更歷史

**User Story**: 作為員工，我需要查看任務的變更歷史，以便了解任務的變更記錄。

**驗收標準**:
- WHEN 員工點擊「查看變更歷史」按鈕時 THEN 系統 SHALL 打開變更歷史彈窗
- WHEN 系統顯示變更歷史時 THEN 系統 SHALL 記錄以下變更：
  - 任務狀態變更（狀態、變更時間、變更人、變更說明）
  - 階段狀態變更（階段、狀態、變更時間、變更人）
  - 到期日調整（原到期日、新到期日、調整原因、調整人、調整時間）
  - 負責人變更（原負責人、新負責人、變更時間、變更人）
  - SOP 關聯變更（新增/刪除的 SOP、變更時間、變更人）
  - 文檔變更（上傳/刪除的文檔、變更時間、變更人）
- WHEN 系統顯示變更歷史時 THEN 系統 SHALL 按時間倒序排列

---

## 業務規則

### 階段自動更新規則

- 階段狀態自動更新，不需要手動更新
- 階段狀態更新邏輯：
  - 當前置階段的所有任務都完成（status = 'completed'）時，下一階段自動變為「pending」（可開始狀態）
  - 「已取消」（cancelled）狀態的任務不計入已完成
  - 階段同步需要確認後才執行

### 狀態更新規則

- 任務狀態必須通過「更新狀態說明」彈窗更新，不能直接編輯
- 到期日調整必須通過「更新狀態說明」彈窗進行
- 狀態更新時必須填寫狀態說明（必填）

### SOP 關聯規則

- 任務關聯的 SOP 包括：
  - 服務層級 SOP：從服務設定自動帶入，如果有客戶專屬 SOP 則優先使用
  - 任務層級 SOP：可手動選擇，支援多選
- SOP 選擇界面使用內嵌形式（非彈窗），類似任務創建時的 SOP 選擇

### 文檔管理規則

- 上傳的文檔直接存儲到知識庫-附件
- 文檔自動綁定到任務
- 文檔上傳後記錄變更歷史

### 變更歷史記錄規則

- 所有變更都必須記錄變更歷史
- 變更歷史包括：變更類型、變更內容、變更時間、變更人
- 變更歷史按時間倒序排列

---

## 非功能性需求

### Code Architecture and Modularity
- **Single Responsibility Principle**: Each file should have a single, well-defined purpose
- **Modular Design**: Components, utilities, and services should be isolated and reusable
- **Dependency Management**: Minimize interdependencies between modules
- **Clear Interfaces**: Define clean contracts between components and layers

### 性能要求

- 頁面載入時間 < 2 秒
- 文檔上傳進度顯示
- 文檔下載響應時間 < 3 秒

### Security

- 所有輸入資料應進行驗證和清理，防止 SQL 注入和 XSS 攻擊
- 任務資料的存取應遵循權限控制機制
- 文檔上傳應驗證文件類型和大小，防止惡意文件上傳
- 敏感資訊應在傳輸和存儲時進行適當保護

### 可用性要求

- 狀態更新流程清晰易懂
- SOP 和文檔管理操作直觀
- 變更歷史易於查看和理解

### 可靠性要求

- 文檔上傳失敗時有明確錯誤提示
- 狀態更新失敗時有回滾機制
- 變更歷史記錄完整準確


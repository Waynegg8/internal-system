# Requirements Document: BR1.3.1: 客戶詳情頁 - 基本資訊分頁

## Introduction

客戶詳情頁的基本資訊分頁是會計師事務所內部管理系統的核心功能之一，提供客戶基本資訊的完整管理流程。此功能允許員工查看和編輯客戶的詳細資訊，包括公司基本資料、聯絡資訊、股東持股、董監事資訊等，幫助事務所維護準確完整的客戶資料，提升客戶服務品質。

**頁面結構說明**:
- 客戶基本資訊管理是客戶詳情頁（ClientDetail）的一個獨立分頁（Tab）
- 路由：`/clients/:id` → 基本資訊分頁（ClientBasicInfo.vue）

## Alignment with Product Vision

本功能支持產品願景中的以下目標：
- **集中管理客戶資訊**：提供統一的客戶資訊管理介面，確保資料完整性
- **提升客戶服務品質**：透過完整的客戶資訊記錄，幫助員工快速了解客戶狀況
- **確保財務準確性**：維護準確的客戶基本資訊，為帳務管理提供可靠基礎
- **支援審計追蹤**：透過軟刪除機制和更新時間記錄，保留完整的資料變更歷史

## Requirements

### Requirement 1: 編輯客戶資訊

**User Story:** 作為會計師事務所的員工，我需要編輯客戶基本資訊，以便維護和更新客戶資料。

#### Acceptance Criteria

1. WHEN 員工編輯客戶資訊時 THEN 系統 SHALL 允許修改除統一編號外的所有欄位
2. WHEN 員工編輯客戶資訊時 THEN 系統 SHALL 更新客戶資料並記錄修改時間（updated_at）
3. WHEN 員工編輯客戶資訊時 THEN 系統 SHALL 允許修改以下欄位：
   - 公司名稱（company_name）：必填
   - 公司負責人（company_owner）：可選
   - 公司地址（company_address）：可選
   - 資本額（capital_amount）：可選
   - 股東持股資訊（shareholders）：可選
   - 董監事資訊（directors_supervisors）：可選
   - 聯絡人（contact_person_1, contact_person_2）：可選
   - 負責人員（assignee_user_id）：必填
   - 主要聯絡方式（primary_contact_method）：可選
   - 聯絡電話（phone）：可選
   - Email（email）：可選
   - LINE ID（line_id）：可選
   - 客戶備註（client_notes）：可選
   - 收款備註（payment_notes）：可選
   - 標籤（tags）：可選
4. IF 員工嘗試修改統一編號（tax_registration_number）時 THEN 系統 SHALL 阻止修改並顯示只讀提示
5. IF 必填欄位（公司名稱、負責人員）為空時 THEN 系統 SHALL 阻止提交並顯示驗證錯誤

### Requirement 2: 查看客戶詳情

**User Story:** 作為會計師事務所的員工，我需要查看客戶的完整基本資訊，以便了解客戶狀況。

#### Acceptance Criteria

1. WHEN 員工查看客戶基本資訊分頁時 THEN 系統 SHALL 顯示客戶的所有基本資訊（包括基本資料、聯絡資訊、股東持股、董監事資訊、標籤、協作者等）
2. WHEN 員工查看客戶基本資訊時 THEN 系統 SHALL 顯示統一編號欄位（只讀，不可修改）
3. WHEN 員工查看客戶基本資訊時 THEN 系統 SHALL 顯示所有已填寫的欄位資訊
4. IF 客戶資料不存在時 THEN 系統 SHALL 顯示 404 錯誤或空狀態提示

### Requirement 3: 刪除客戶

**User Story:** 作為系統管理員，我需要刪除客戶資料，以便清理無效或重複的客戶記錄。

#### Acceptance Criteria

1. WHEN 員工刪除客戶時 THEN 系統 SHALL 執行軟刪除，保留歷史記錄
2. WHEN 員工刪除客戶時 THEN 系統 SHALL 記錄刪除時間（deleted_at）和刪除人員（deleted_by）
3. IF 客戶有關聯的服務、任務等數據時 THEN 系統 SHALL 保留這些關聯數據（軟刪除）
4. IF 非管理員用戶嘗試刪除客戶時 THEN 系統 SHALL 阻止操作並顯示權限錯誤

### Requirement 4: 客戶標籤管理

**User Story:** 作為會計師事務所的員工，我需要管理客戶標籤，以便分類和組織客戶資料。

#### Acceptance Criteria

1. WHEN 員工管理客戶標籤時 THEN 系統 SHALL 允許新增、移除標籤
2. WHEN 員工新增標籤時 THEN 系統 SHALL 即時更新客戶標籤列表
3. WHEN 員工移除標籤時 THEN 系統 SHALL 即時更新客戶標籤列表
4. IF 標籤不存在時 THEN 系統 SHALL 允許創建新標籤

### Requirement 5: 客戶協作者管理

**User Story:** 作為管理員或客戶負責人，我需要管理客戶協作者，以便分配客戶管理權限。

#### Acceptance Criteria

1. WHEN 員工管理客戶協作者時 THEN 系統 SHALL 允許新增、移除協作者
2. IF 用戶為管理員或客戶負責人時 THEN 系統 SHALL 顯示協作者管理功能
3. IF 用戶非管理員且非客戶負責人時 THEN 系統 SHALL 隱藏協作者管理功能
4. WHEN 員工新增協作者時 THEN 系統 SHALL 驗證協作者用戶是否存在

### Requirement 6: 公司負責人欄位編輯

**User Story:** 作為會計師事務所的員工，我需要編輯客戶公司的負責人資訊，以便記錄客戶公司的負責人姓名。

#### Acceptance Criteria

1. WHEN 員工編輯公司負責人欄位時 THEN 系統 SHALL 允許輸入和保存公司負責人姓名
2. IF 公司負責人欄位為空時 THEN 系統 SHALL 允許保存（可選欄位）

### Requirement 7: 公司地址欄位編輯

**User Story:** 作為會計師事務所的員工，我需要編輯客戶公司的地址資訊，以便記錄客戶公司的地址。

#### Acceptance Criteria

1. WHEN 員工編輯公司地址欄位時 THEN 系統 SHALL 允許輸入和保存公司地址
2. IF 公司地址欄位為空時 THEN 系統 SHALL 允許保存（可選欄位）

### Requirement 8: 資本額欄位編輯

**User Story:** 作為會計師事務所的員工，我需要編輯客戶公司的資本額資訊，以便記錄公司資本額。

#### Acceptance Criteria

1. WHEN 員工編輯資本額欄位時 THEN 系統 SHALL 允許輸入和保存資本額（數字，單位：新台幣元）
2. IF 資本額欄位為空時 THEN 系統 SHALL 允許保存（可選欄位）
3. IF 資本額輸入非數字時 THEN 系統 SHALL 顯示驗證錯誤

### Requirement 9: 股東持股資訊編輯

**User Story:** 作為會計師事務所的員工，我需要編輯客戶公司的股東持股資訊，以便記錄股東姓名及持股詳情。

#### Acceptance Criteria

1. WHEN 員工編輯股東持股資訊時 THEN 系統 SHALL 允許新增、編輯、刪除股東記錄
2. WHEN 員工新增股東記錄時 THEN 系統 SHALL 允許輸入以下資訊：
   - 股東姓名（必填）
   - 持股比例（%）
   - 持股數（股數）
   - 持股金額（新台幣元）
   - 持股類型（普通股、特別股等）
3. IF 股東持股資訊為空時 THEN 系統 SHALL 允許保存（可選欄位）

### Requirement 10: 董監事資訊編輯

**User Story:** 作為會計師事務所的員工，我需要編輯客戶公司的董監事資訊，以便記錄董事、監事姓名及任期。

#### Acceptance Criteria

1. WHEN 員工編輯董監事資訊時 THEN 系統 SHALL 允許新增、編輯、刪除董監事記錄
2. WHEN 員工新增董監事記錄時 THEN 系統 SHALL 允許輸入以下資訊：
   - 姓名（必填）
   - 職務（董事、監事、董事長等）
   - 任期開始日期
   - 任期結束日期
   - 是否為現任
3. IF 董監事資訊為空時 THEN 系統 SHALL 允許保存（可選欄位）

### Requirement 11: 主要聯絡方式編輯

**User Story:** 作為會計師事務所的員工，我需要編輯客戶的主要聯絡方式，以便標記客戶的主要聯絡方式類型。

#### Acceptance Criteria

1. WHEN 員工編輯主要聯絡方式時 THEN 系統 SHALL 允許選擇聯絡方式類型（選項：LINE、電話、Email、其他）
2. IF 主要聯絡方式為空時 THEN 系統 SHALL 允許保存（可選欄位）

### Requirement 12: LINE ID 編輯

**User Story:** 作為會計師事務所的員工，我需要編輯客戶的 LINE ID，以便記錄客戶的 LINE 聯絡資訊。

#### Acceptance Criteria

1. WHEN 員工編輯 LINE ID 欄位時 THEN 系統 SHALL 允許輸入和保存 LINE ID
2. IF LINE ID 欄位為空時 THEN 系統 SHALL 允許保存（可選欄位）

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個組件和 Handler 應有單一明確的職責
- **Modular Design**: 組件、工具函數和服務應隔離且可重用
- **Dependency Management**: 最小化模組間的相互依賴
- **Clear Interfaces**: 定義清晰的組件和 API 介面

### Performance
- API 響應時間應小於 500ms（正常情況）
- 頁面載入時間應小於 3 秒
- 資料庫查詢應使用適當的索引和快取策略

### Security
- 所有 API 請求必須通過身份驗證
- 只有管理員或客戶負責人可以刪除客戶和管理協作者
- 使用參數化查詢防止 SQL 注入
- 統一編號欄位應為只讀，防止未授權修改

### Reliability
- 實現軟刪除機制，保留歷史記錄
- 所有資料更新應記錄更新時間（updated_at）
- 刪除操作應記錄刪除時間（deleted_at）和刪除人員（deleted_by）
- 提供適當的錯誤處理和用戶提示

### Usability
- 表單驗證應提供清晰的錯誤提示
- 必填欄位應明確標示
- 只讀欄位應明確標示（如統一編號）
- 操作成功應提供明確的成功提示

## Business Rules

- 統一編號（tax_registration_number）作為客戶編號（client_id），一旦建立不可修改（只讀）
- 公司名稱（company_name）為必填欄位
- 負責人員（assignee_user_id）為必填欄位
- 刪除客戶時，相關的服務、任務等數據會保留（軟刪除）
- 只有管理員或客戶負責人可以管理客戶協作者
- 公司負責人（company_owner）：可選，記錄客戶公司的負責人姓名（與事務所內部負責人員不同）
- 公司地址（company_address）：可選，記錄客戶公司的地址
- 資本額（capital_amount）：可選，記錄公司資本額（數字，單位：新台幣元）
- 股東持股資訊（shareholders）：可選，記錄股東姓名及持股資訊（可記錄多筆，建議使用關聯表）
  - 股東姓名
  - 持股比例（%）
  - 持股數（股數）
  - 持股金額（新台幣元）
  - 持股類型（普通股、特別股等）
- 董監事資訊（directors_supervisors）：可選，記錄董事、監事姓名及任期（可記錄多筆，建議使用關聯表）
  - 姓名
  - 職務（董事、監事、董事長等）
  - 任期開始日期
  - 任期結束日期
  - 是否為現任
- 主要聯絡方式（primary_contact_method）：可選，標記客戶的主要聯絡方式類型（選項：'line'、'phone'、'email'、'other'）
- LINE ID（line_id）：可選，記錄客戶的 LINE ID

## Database Schema Notes

**資料庫欄位狀態**（需確認或新增的欄位）:
- `company_owner`（公司負責人）：TEXT，可選
- `company_address`（公司地址）：TEXT，可選
- `capital_amount`（資本額）：REAL 或 INTEGER，可選，單位：新台幣元
- `shareholders`（股東持股資訊）：使用關聯表 `Shareholders`，可選
- `directors_supervisors`（董監事資訊）：使用關聯表 `DirectorsSupervisors`，可選
- `contact_person_1`（聯絡人1）：TEXT，可選（需確認資料庫是否已存儲）
- `contact_person_2`（聯絡人2）：TEXT，可選（需確認資料庫是否已存儲）
- `primary_contact_method`（主要聯絡方式）：TEXT，可選，選項值：'line'、'phone'、'email'、'other'
- `line_id`（LINE ID）：TEXT，可選

# Requirements Document: BR1.2.1: 客戶新增 - 基本資訊分頁

## Introduction

客戶新增基本資訊分頁是會計師事務所內部管理系統的核心功能之一，提供員工在新增客戶時填寫完整的基本資料，包括公司資訊、聯絡方式、股東董監事等。此功能支援企業客戶和個人客戶兩種類型，並提供智能化的統一編號處理機制。

**頁面結構說明**:
- 客戶新增基本資訊分頁是客戶新增頁面（ClientAdd）的一個獨立分頁（Tab）
- 路由：`/clients/add/basic` → 基本資訊分頁（ClientAddBasic.vue）

**業務價值**:
- 集中管理客戶資訊，提升客戶服務品質
- 追蹤客戶服務狀態，及時響應客戶需求
- 管理客戶帳務，確保財務準確性

## Alignment with Product Vision

本功能支援產品願景中的以下目標：
- **提升客戶服務品質**: 透過完整的客戶資訊管理，確保資料準確性和完整性
- **提高工作效率**: 自動化統一編號處理和客戶編號生成，減少人工錯誤
- **資料完整性**: 支援股東和董監事資訊的標準化存儲，便於查詢和統計
- **靈活性**: 支援獨立保存基本資訊，允許分階段填寫客戶資料

## Requirements

### Requirement 1: 填寫客戶基本資料

**User Story:** 作為會計師事務所的員工，我需要在新增客戶時填寫基本資訊，以便建立客戶的基本資料。

#### Acceptance Criteria

1. WHEN 員工在新增客戶基本資訊分頁時 THEN 系統 SHALL 允許填寫客戶基本資料
2. WHEN 員工填寫基本資訊時 THEN 系統 SHALL 允許填寫以下欄位：
   - 公司名稱（company_name）：必填
   - 統一編號（tax_registration_number）：企業客戶8碼，個人客戶10碼
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
3. IF 公司名稱（company_name）為空 THEN 系統 SHALL 阻止表單提交並顯示錯誤提示
4. IF 負責人員（assignee_user_id）為空 THEN 系統 SHALL 阻止表單提交並顯示錯誤提示

### Requirement 2: 客戶編號生成與統一編號處理

**User Story:** 作為會計師事務所的員工，我需要系統自動處理統一編號和客戶編號，以便確保編號的唯一性和正確性。

#### Acceptance Criteria

1. WHEN 員工填寫統一編號時 THEN 系統 SHALL 將統一編號作為客戶編號（client_id）使用（統一編號即為客戶編號）
2. WHEN 員工點擊「產生個人客戶編號」時 THEN 系統 SHALL 自動生成個人客戶編號（智能避開合法統編）
3. IF 統一編號為8碼（企業客戶） THEN 系統 SHALL 自動加前綴 `00` 存入（變成10碼）
4. IF 統一編號為10碼（個人客戶） THEN 系統 SHALL 直接存入統一編號欄位
5. IF 統一編號已存在（包括已刪除的客戶） THEN 系統 SHALL 阻止保存並顯示錯誤提示
6. WHEN 系統生成個人客戶編號時 THEN 系統 SHALL 確保編號格式避開合法統編格式

### Requirement 3: 獨立保存基本資訊

**User Story:** 作為會計師事務所的員工，我需要在填寫完基本資訊後能夠獨立保存，以便分階段完成客戶資料的建立。

#### Acceptance Criteria

1. WHEN 員工在基本資訊分頁點擊保存時 THEN 系統 SHALL 創建客戶基本資料，客戶即被創建
2. WHEN 員工保存基本資訊後 THEN 系統 SHALL 允許切換到其他分頁（服務設定、帳務設定）繼續填寫
3. WHEN 員工保存基本資訊後 THEN 系統 SHALL 允許離開頁面，之後可以從客戶列表進入該客戶繼續填寫其他分頁
4. IF 保存成功 THEN 系統 SHALL 顯示成功提示並更新客戶狀態

### Requirement 4: 股東和董監事資訊管理

**User Story:** 作為會計師事務所的員工，我需要記錄客戶的股東和董監事資訊，以便完整管理客戶資料。

#### Acceptance Criteria

1. WHEN 員工填寫股東資訊時 THEN 系統 SHALL 允許記錄多筆股東資料，包括：
   - 股東姓名（必填）
   - 持股比例（%）
   - 持股數（股數）
   - 持股金額（新台幣元）
   - 持股類型（普通股、特別股等）
2. WHEN 員工填寫董監事資訊時 THEN 系統 SHALL 允許記錄多筆董監事資料，包括：
   - 姓名（必填）
   - 職務（董事、監事、董事長等）
   - 任期開始日期
   - 任期結束日期
   - 是否為現任
3. WHEN 系統保存客戶資料時 THEN 系統 SHALL 將股東和董監事資訊存儲到關聯表（Shareholders、DirectorsSupervisors）
4. WHEN 系統讀取客戶資料時 THEN 系統 SHALL 從關聯表聚合股東和董監事資訊回傳前端

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 每個組件和 Handler 應有單一、明確的職責
- **Modular Design**: 組件、工具函數和服務應保持獨立且可重用
- **Dependency Management**: 最小化模組間的相互依賴
- **Clear Interfaces**: 定義清晰的組件和 API 介面

### Performance
- API 響應時間應小於 500ms（正常情況）
- 頁面載入時間應小於 3 秒
- 表單驗證應即時響應，無明顯延遲
- 統一編號唯一性檢查應使用資料庫索引優化查詢性能

### Security
- 所有輸入資料應進行驗證和清理，防止 SQL 注入和 XSS 攻擊
- 統一編號唯一性檢查應包括已刪除的客戶（支援恢復機制）
- 客戶資料的存取應遵循權限控制機制
- 敏感資訊（如統一編號）應在傳輸和存儲時進行適當保護

### Reliability
- 資料保存應使用事務處理，確保資料一致性
- 股東和董監事資訊的保存應採用「先刪後插」策略，確保資料同步
- 系統應提供適當的錯誤處理和用戶友好的錯誤提示
- 支援軟刪除機制，保留歷史記錄供審計使用

### Usability
- 表單欄位應有清晰的標籤和提示說明
- 必填欄位應明確標示
- 錯誤提示應具體且易於理解
- 統一編號自動同步功能應直觀且不干擾用戶操作
- 股東和董監事資訊的動態列表應易於新增、編輯和刪除

## Business Rules

- 公司名稱（company_name）為必填欄位
- 負責人員（assignee_user_id）為必填欄位
- 統一編號（tax_registration_number）直接作為客戶編號（client_id），必須唯一（主鍵）
- 統一編號欄位統一存儲10碼格式
- 企業客戶：輸入8碼統一編號，系統自動加前綴 `00` 存入（變成10碼）
- 個人客戶：輸入10碼身分證，直接存入統一編號欄位
- 公司負責人（company_owner）：可選，記錄客戶公司的負責人姓名（與事務所內部負責人員不同）
- 公司地址（company_address）：可選，記錄客戶公司的地址
- 資本額（capital_amount）：可選，記錄公司資本額（數字，單位：新台幣元）
- 股東持股資訊（shareholders）：可選，記錄股東姓名及持股資訊（可記錄多筆，使用關聯表：標準化）
- 董監事資訊（directors_supervisors）：可選，記錄董事、監事姓名及任期（可記錄多筆，使用關聯表：標準化）
- 主要聯絡方式（primary_contact_method）：可選，標記客戶的主要聯絡方式類型（選項：LINE、電話、Email、其他）
- LINE ID（line_id）：可選，記錄客戶的 LINE ID

## Database Design (BR1.3.1)

為支援查詢、統計與一致性，股東與董監事資訊改採「關聯表」存放（取代 JSON 欄位落地），規格要求如下：

### 關聯表設計

- **Shareholders 表**:
  - 主鍵：`id`（自增）
  - 關聯：`client_id` → `Clients.client_id`
  - 欄位：`name`（必填）、`share_percentage`（%）、`share_count`（股數）、`share_amount`（金額）、`share_type`
  - 索引：`client_id`、`(client_id, name)`、`(client_id, share_percentage)`

- **DirectorsSupervisors 表**:
  - 主鍵：`id`（自增）
  - 關聯：`client_id` → `Clients.client_id`
  - 欄位：`name`（必填）、`position`、`term_start`、`term_end`、`is_current`
  - 索引：`client_id`、`(client_id, is_current)`、`(client_id, position)`

### API 規範

- **Client Detail 讀取**：優先從關聯表聚合回傳前端；若關聯表無資料，保留解析舊 JSON 欄位的相容路徑（過渡期）
- **Client Update/Save**：寫入時覆蓋關聯表（先刪後插），不再寫回 JSON 欄位（JSON 欄位保留但不再使用）

### 遷移

- 遷移檔：`0038_add_shareholders_and_directors_tables.sql`
- 說明：建立 `Shareholders`、`DirectorsSupervisors` 與索引；舊 JSON 欄位保留相容，後續可提供一次性資料轉移工具

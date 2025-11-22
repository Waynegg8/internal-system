# QA-01: 認證與用戶基礎 (Auth Foundation)

## Introduction

本規格旨在建立測試環境的認證基礎設施，包括建立標準測試用戶帳號、驗證登入功能，以及測試向後兼容性（舊資料用戶的 NULL 欄位處理）。這是所有後續測試 Spec 的基礎，確保測試資料的一致性和可重用性。

**業務價值**：
- 為所有後續測試提供標準化的測試用戶帳號
- 驗證認證系統的正確性和穩定性
- 確保系統能正確處理舊資料（NULL 欄位），避免向後兼容性問題
- 建立測試環境的基礎設施，支援後續測試的自動化執行

## Alignment with Product Vision

本規格支援產品願景中的以下目標：
- **安全性與可靠性**：驗證認證機制和權限控制的正確性
- **數據完整性**：確保測試用戶資料的完整性和一致性
- **向後兼容性**：驗證系統能正確處理舊資料，避免因資料結構變更導致的錯誤
- **可測試性**：建立標準化的測試資料，提升後續測試的效率

## 前置條件

### 環境要求
- 系統已部署並可正常訪問
- 資料庫已初始化並完成所有遷移
- 系統中存在 Seed Admin 帳號（透過 .env 配置）

### 依賴關係
- **無前置依賴**：這是 Phase 1 的第一個 Spec，不依賴其他測試 Spec
- **後續依賴**：所有其他測試 Spec 都依賴本 Spec 建立的測試用戶帳號

### 參考資料
- **QA-00 架構映射**：必須遵循「黃金數據命名規範」中定義的用戶命名規則
- **向後兼容性雷區**：必須測試 Users 表的 NULL 欄位處理（phone, address, emergency_contact_name, emergency_contact_phone, plain_password）

---

## Requirements

### Requirement 1: Admin Setup (管理員設定)

**User Story**: 作為測試執行者，我需要使用 Seed Admin 帳號登入系統，並建立三個標準測試用戶帳號（`TEST_ADMIN_01`、`TEST_USER_STD`、`TEST_USER_LEGACY`），以便後續測試可以使用這些帳號進行驗證。

#### Acceptance Criteria

1. **WHEN** 使用 Seed Admin 帳號（從 .env 獲取）登入系統 **THEN** 系統 SHALL 成功建立 Session 並導向首頁
   - 登入請求應返回 HTTP 200 狀態碼
   - 響應應包含用戶資訊（userId, username, name, email, isAdmin）
   - Cookie 應包含有效的 Session ID
   - 應成功導向首頁（Dashboard）

2. **WHEN** 管理員進入「系統設定 > 用戶管理」頁面 **THEN** 系統 SHALL 顯示用戶列表，包含 Seed Admin 帳號
   - 用戶列表應正確載入
   - 列表應顯示用戶的基本資訊（姓名、帳號、角色、Email 等）
   - 管理員應能看到「新增用戶」按鈕

3. **WHEN** 管理員建立 `TEST_ADMIN_01` 帳號 **THEN** 系統 SHALL 成功建立管理員帳號，並符合以下規範：
   - Username: `TEST_ADMIN_01`
   - Name: `測試管理員01`
   - Email: `test_admin_01@test.com`
   - Password: `111111`
   - Role: 管理員（`is_admin = 1`）
   - 所有欄位完整（phone, address, emergency_contact_name, emergency_contact_phone 等）
   - 建立成功後應顯示成功訊息
   - 用戶列表應立即更新，顯示新建立的帳號

4. **WHEN** 管理員建立 `TEST_USER_STD` 帳號 **THEN** 系統 SHALL 成功建立標準員工帳號，並符合以下規範：
   - Username: `TEST_USER_STD`
   - Name: `測試員工（標準）`
   - Email: `test_user_std@test.com`
   - Password: `111111`
   - Role: 一般員工（`is_admin = 0`）
   - 所有欄位完整：
     - `phone`: `0912345678`
     - `address`: `台北市信義區測試路123號`
     - `emergency_contact_name`: `緊急聯絡人`
     - `emergency_contact_phone`: `0987654321`
     - `gender`: `M`（男性）
     - `birth_date`: `1990-01-01`
     - `start_date`: `2024-01-01`
   - 建立成功後應顯示成功訊息
   - 用戶列表應立即更新，顯示新建立的帳號

5. **WHEN** 管理員建立 `TEST_USER_LEGACY` 帳號 **THEN** 系統 SHALL 成功建立舊資料員工帳號，並符合以下規範：
   - Username: `TEST_USER_LEGACY`
   - Name: `測試員工（舊資料）`
   - Email: `test_user_legacy@test.com`
   - Password: `111111`
   - Role: 一般員工（`is_admin = 0`）
   - **僅基本欄位**，其他欄位為 NULL：
     - `phone`: NULL
     - `address`: NULL
     - `emergency_contact_name`: NULL
     - `emergency_contact_phone`: NULL
     - `gender`: `M`（基本欄位，必須有值）
     - `birth_date`: NULL
     - `start_date`: `2024-01-01`（基本欄位，必須有值）
   - 建立成功後應顯示成功訊息
   - 用戶列表應立即更新，顯示新建立的帳號

6. **WHEN** 管理員建立 `TEST_USER_ASSIGNEE` 帳號 **THEN** 系統 SHALL 成功建立負責人員工帳號，並符合以下規範：
   - Username: `TEST_USER_ASSIGNEE`
   - Name: `測試負責人`
   - Email: `test_user_assignee@test.com`
   - Password: `111111`
   - Role: 一般員工（`is_admin = 0`）
   - 所有欄位完整（與 `TEST_USER_STD` 相同）
   - 建立成功後應顯示成功訊息
   - 用戶列表應立即更新，顯示新建立的帳號

7. **IF** 建立用戶時發生錯誤（如帳號已存在、Email 重複等） **THEN** 系統 SHALL 顯示明確的錯誤訊息，並阻止建立
   - 錯誤訊息應清楚說明失敗原因
   - 表單應保留已輸入的資料（除了敏感資訊如密碼）
   - 用戶列表不應更新

#### 業務規則

- 所有測試用戶的預設密碼必須為 `111111`
- 所有測試用戶的 `is_deleted` 必須為 `0`
- 用戶帳號（username）必須唯一
- Email 必須唯一（如果系統要求）
- `TEST_USER_LEGACY` 必須僅包含基本欄位，用於測試向後兼容性

---

### Requirement 2: Login Verification (登入驗證)

**User Story**: 作為測試執行者，我需要驗證三個新建立的測試帳號都能正常登入，並且權限和首頁顯示正確，以便確認認證系統的正確性。

#### Acceptance Criteria

1. **WHEN** 使用 `TEST_ADMIN_01` 帳號登入系統 **THEN** 系統 SHALL 成功建立 Session 並導向管理員首頁
   - 登入請求應返回 HTTP 200 狀態碼
   - 響應應包含用戶資訊，且 `isAdmin` 為 `true`
   - Cookie 應包含有效的 Session ID
   - 應成功導向管理員儀表板（AdminDashboard）
   - 儀表板應顯示管理員專屬功能（如「系統設定」選單）

2. **WHEN** 使用 `TEST_USER_STD` 帳號登入系統 **THEN** 系統 SHALL 成功建立 Session 並導向員工首頁
   - 登入請求應返回 HTTP 200 狀態碼
   - 響應應包含用戶資訊，且 `isAdmin` 為 `false`
   - Cookie 應包含有效的 Session ID
   - 應成功導向員工儀表板（EmployeeDashboard）
   - 儀表板應顯示員工專屬功能（如「我的任務」、「我的工時」）
   - 儀表板不應顯示管理員專屬功能（如「系統設定」選單）

3. **WHEN** 使用 `TEST_USER_LEGACY` 帳號登入系統 **THEN** 系統 SHALL 成功建立 Session 並導向員工首頁
   - 登入請求應返回 HTTP 200 狀態碼
   - 響應應包含用戶資訊，且 `isAdmin` 為 `false`
   - Cookie 應包含有效的 Session ID
   - 應成功導向員工儀表板（EmployeeDashboard）
   - 即使部分欄位為 NULL，登入流程不應失敗

4. **WHEN** 使用錯誤的帳號或密碼登入 **THEN** 系統 SHALL 拒絕登入並顯示錯誤訊息
   - 登入請求應返回 HTTP 401 狀態碼
   - 響應應包含錯誤訊息「帳號或密碼錯誤」
   - 不應建立 Session
   - 不應設置 Cookie
   - 應停留在登入頁面

5. **WHEN** 使用已刪除的帳號登入 **THEN** 系統 SHALL 拒絕登入並顯示錯誤訊息
   - 登入請求應返回 HTTP 401 狀態碼
   - 響應應包含錯誤訊息「帳號或密碼錯誤」（不洩露帳號狀態）
   - 不應建立 Session
   - 不應設置 Cookie

6. **WHEN** 登入成功後，檢查 Session 有效性 **THEN** 系統 SHALL 正確識別已登入用戶
   - 呼叫 `/api/v2/auth/me` API 應返回當前用戶資訊
   - 用戶資訊應與登入時返回的資訊一致
   - Session 應在設定的 TTL 時間內有效

7. **WHEN** 登出系統 **THEN** 系統 SHALL 清除 Session 並導向登入頁面
   - 登出請求應成功執行
   - Session 應從資料庫中刪除
   - Cookie 應被清除
   - 應導向登入頁面
   - 後續請求應被視為未登入

#### 業務規則

- 登入時應更新 `Users.last_login` 欄位
- Session TTL 應符合系統設定（預設 30 天）
- 登入失敗時不應洩露帳號是否存在（統一返回「帳號或密碼錯誤」）
- 已刪除的帳號（`is_deleted = 1`）不應能登入

---

### Requirement 3: Legacy Data Check (舊資料檢查)

**User Story**: 作為測試執行者，我需要驗證 `TEST_USER_LEGACY` 帳號在登入後，個人資料頁面能正確處理 NULL 欄位，不會因為缺少欄位而報錯或顯示白畫面，以便確認系統的向後兼容性。

#### Acceptance Criteria

1. **WHEN** 使用 `TEST_USER_LEGACY` 帳號登入後，進入「個人資料」頁面 **THEN** 系統 SHALL 正確顯示個人資料，且 NULL 欄位應顯示適當的預設值或「-」
   - 頁面應正常載入，不應出現白畫面
   - 不應出現 JavaScript 錯誤或 Console 錯誤
   - 基本欄位應正確顯示：
     - 姓名：`測試員工（舊資料）`
     - 帳號：`TEST_USER_LEGACY`
     - 角色：`員工`
     - Email：`test_user_legacy@test.com`
   - NULL 欄位應顯示適當的預設值：
     - `phone`：顯示「-」或空字串（不應顯示 "null" 或 "undefined"）
     - `address`：顯示「-」或空字串
     - `emergency_contact_name`：顯示「-」或空字串
     - `emergency_contact_phone`：顯示「-」或空字串
     - `birth_date`：顯示「未設定」或「-」
   - 頁面不應因為 NULL 欄位而崩潰

2. **WHEN** 呼叫 `/api/v2/user-profile/:userId` API 獲取 `TEST_USER_LEGACY` 的個人資料 **THEN** 系統 SHALL 返回完整的用戶資料，且 NULL 欄位應為 `null` 而非 `undefined`
   - API 應返回 HTTP 200 狀態碼
   - 響應應包含所有用戶欄位
   - NULL 欄位應明確返回 `null` 值
   - 不應出現 `undefined` 值
   - 資料格式應符合前端期望

3. **WHEN** 在個人資料頁面嘗試編輯 `TEST_USER_LEGACY` 的資料 **THEN** 系統 SHALL 允許編輯，且 NULL 欄位應能正常填入新值
   - 表單應正常顯示
   - NULL 欄位的輸入框應為空（而非顯示 "null"）
   - 應能正常填入新值並儲存
   - 儲存後應更新資料庫，NULL 欄位應變為新值

4. **WHEN** 檢查 `ProfileInfo.vue` 組件渲染 `TEST_USER_LEGACY` 的資料 **THEN** 組件 SHALL 正確處理 NULL 值，使用 `|| '-'` 或類似邏輯顯示預設值
   - 組件不應因為 NULL 值而報錯
   - 所有顯示欄位都應有 NULL 檢查
   - 不應出現 "Cannot read property of null" 等錯誤

5. **WHEN** 檢查 `EmployeeProfile.vue` 組件渲染 `TEST_USER_LEGACY` 的資料 **THEN** 組件 SHALL 正確處理 NULL 值，表單欄位應顯示空值而非 "null"
   - 組件不應因為 NULL 值而報錯
   - 表單欄位應正確初始化為空值
   - 不應出現 "Cannot read property of null" 等錯誤

6. **IF** 個人資料頁面因為 NULL 欄位而出現錯誤 **THEN** 系統 SHALL 記錄錯誤並顯示友好的錯誤訊息，而非白畫面
   - 錯誤應記錄到 Console（開發環境）或日誌（生產環境）
   - 用戶應看到友好的錯誤訊息（如「載入個人資料時發生錯誤，請稍後再試」）
   - 不應顯示技術性錯誤訊息給用戶

#### 業務規則

- 所有顯示用戶資料的組件都應有 NULL 值檢查
- NULL 欄位應顯示「-」或「未設定」，而非 "null" 或 "undefined"
- 表單欄位應將 NULL 值初始化為空字串或空值
- 系統不應因為 NULL 欄位而崩潰或顯示白畫面

#### 測試重點（根據 QA-00 向後兼容性雷區）

根據 QA-00 架構映射的「向後兼容性雷區」章節，以下欄位需要特別測試：

- **`phone`**：可能為 NULL（舊資料）
  - 驗證所有讀取 `phone` 的地方都有 NULL 檢查或預設值
  - 驗證個人資料頁面顯示時，NULL 值應顯示「-」

- **`address`**：可能為 NULL（舊資料）
  - 驗證個人資料頁面顯示時，NULL 值應顯示「-」

- **`emergency_contact_name`**：可能為 NULL（舊資料）
  - 驗證個人資料頁面顯示時，NULL 值應顯示「-」

- **`emergency_contact_phone`**：可能為 NULL（舊資料）
  - 驗證個人資料頁面顯示時，NULL 值應顯示「-」

- **`plain_password`**：可能為 NULL（僅在創建或重置密碼後才有值）
  - 本測試不涉及 `plain_password`（管理員查看密碼功能），但應確認該欄位為 NULL 時不會影響其他功能

---

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 認證相關的 Handler、Store、API 應各自負責單一職責
- **Modular Design**: 認證邏輯應與業務邏輯分離，可獨立測試
- **Dependency Management**: 認證模組不應依賴其他業務模組
- **Clear Interfaces**: API 端點應有明確的請求/回應格式

### Performance
- 登入請求應在 500ms 內完成
- Session 驗證應在 100ms 內完成
- 個人資料頁面載入應在 1 秒內完成

### Security
- 密碼應使用 PBKDF2 加密存儲
- Session ID 應使用加密安全的隨機數生成
- Cookie 應設置適當的 SameSite 和 Secure 屬性
- 登入失敗時不應洩露帳號是否存在
- 已刪除的帳號不應能登入

### Reliability
- 認證系統應有完整的錯誤處理機制
- Session 過期應正確處理，導向登入頁面
- 資料庫連接失敗時應返回適當的錯誤訊息
- NULL 欄位處理不應導致系統崩潰

### Usability
- 登入表單應有清晰的錯誤提示
- 個人資料頁面應正確顯示所有欄位，NULL 值應顯示「-」或「未設定」
- 錯誤訊息應友好且易於理解
- 操作應有即時反饋（載入狀態、成功/錯誤提示）

---

## 測試資料規範

### 必須建立的測試用戶

根據 QA-00 架構映射的「黃金數據命名規範」，本 Spec 必須建立以下測試用戶：

1. **`TEST_ADMIN_01`**（測試管理員01）
   - 角色：管理員
   - 用途：所有需要管理員權限的測試
   - 所有欄位完整

2. **`TEST_USER_STD`**（測試員工（標準））
   - 角色：一般員工
   - 用途：標準功能測試，所有新欄位都有值
   - 所有欄位完整

3. **`TEST_USER_LEGACY`**（測試員工（舊資料））
   - 角色：一般員工
   - 用途：向後兼容測試，部分欄位為 NULL
   - 僅基本欄位，其他欄位為 NULL

4. **`TEST_USER_ASSIGNEE`**（測試負責人）
   - 角色：一般員工
   - 用途：作為客戶/任務負責人的測試
   - 所有欄位完整

### 資料完整性要求

- 所有測試用戶的預設密碼：`111111`
- 所有測試用戶的 `is_deleted = 0`
- `TEST_USER_STD` 和 `TEST_USER_ASSIGNEE`：所有欄位完整
- `TEST_USER_LEGACY`：僅基本欄位（username, name, password, email, gender, start_date），其他欄位為 NULL

### 跨 Spec 共享

- 本 Spec 建立的測試用戶應被後續所有測試 Spec 重用
- 後續 Spec 不應重新建立這些用戶，而應使用本 Spec 建立的用戶
- 測試結束後，可選擇保留這些用戶供後續測試使用，或清理（視測試策略而定）

---

## 成功標準

本 Spec 完成後，應達成以下目標：

1. ✅ 成功建立 4 個標準測試用戶帳號（`TEST_ADMIN_01`、`TEST_USER_STD`、`TEST_USER_LEGACY`、`TEST_USER_ASSIGNEE`）
2. ✅ 所有測試用戶都能正常登入，權限正確
3. ✅ `TEST_USER_LEGACY` 的 NULL 欄位能正確處理，個人資料頁面不報錯
4. ✅ 認證系統的基本功能（登入、登出、Session 管理）正常運作
5. ✅ 為後續測試 Spec 提供可重用的測試用戶基礎設施




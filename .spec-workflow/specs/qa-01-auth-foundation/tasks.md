# Tasks Document: QA-01: 認證與用戶基礎

## 1.0 基礎工具建立 (Utilities Foundation)

- [ ] 1.1 安裝 dotenv 套件
- **File**: `package.json` (修改)
- **Actions**:
  1. 檢查 `package.json` 的 `devDependencies` 中是否已包含 `dotenv`
  2. 如果不存在，執行 `npm install --save-dev dotenv`
  3. 確認安裝成功（檢查 `package.json` 和 `package-lock.json` 是否更新）
  4. 驗證安裝：執行 `npm list dotenv` 確認套件存在
- **Purpose**: 提供環境變數讀取功能，用於讀取 `.env` 中的 `SEED_ADMIN_USER` 和 `SEED_ADMIN_PASS`
- **_Leverage**: 無（新依賴）
- **_Requirements**: Design Phase - 技術堆疊與工具
- **_Prompt**: Role: DevOps Engineer specializing in Node.js dependency management | Task: Install dotenv package as a dev dependency to enable environment variable loading from .env files | Restrictions: Must install as devDependency (not production dependency), ensure package-lock.json is updated, verify installation with npm list dotenv | Success: dotenv is listed in package.json devDependencies, package-lock.json is updated, npm list dotenv shows the package is installed

- [ ] 1.2 建立 VisualLogger 類別
- **File**: `tests/utils/visual-logger.ts` (新建)
- **Actions**:
  1. 建立 `tests/utils/visual-logger.ts` 檔案
  2. 定義 TypeScript 介面：
     - `LogEntry`: 包含 timestamp, step, description, screenshot?, dbState?
     - `User`: 包含 user_id, username, email, is_admin, phone?, address?, emergency_contact_name?, emergency_contact_phone?
  3. 實作 `VisualLogger` 類別，包含以下方法：
     - `constructor(outputDir: string)`: 初始化日誌目錄（預設 `test-results/qa-01-auth`）
     - `async initialize()`: 使用 `fs/promises.mkdir` 遞迴建立輸出目錄和 `screenshots/` 子目錄
     - `async logStep(step: string, description: string)`: 記錄測試步驟到 `logEntries` 陣列，並輸出到 console
     - `async captureScreenshot(page: Page, name: string, description: string)`: 
       - 生成檔名：`${name}-${timestamp}.png`（timestamp 格式：ISO 字串，替換 `:` 和 `.` 為 `-`）
       - 使用 `page.screenshot({ path, fullPage: true })` 截圖
       - 儲存到 `screenshots/` 目錄
       - 記錄到 `logEntries`，包含相對路徑 `screenshots/${filename}`
     - `async logDatabaseState(before: User[], after: User[], operation: string)`: 記錄資料庫狀態變更
     - `private generateMarkdownTable(users: User[], title: string)`: 生成 Markdown 表格（包含 User ID, Username, Email, Role, Phone, Address 欄位）
     - `private generateDBDiffSection(entry: LogEntry)`: 生成資料庫差異區段（變更前/變更後表格，新增/更新用戶標示）
     - `async generateReport()`: 產生完整的 Markdown 報告
       - 標題：`# QA-01: 認證與用戶基礎 - 測試報告`
       - 執行時間：使用 `new Date().toLocaleString('zh-TW')`
       - 總步驟數
       - 遍歷所有 `logEntries`，生成步驟區段
       - 包含截圖連結（Markdown 格式：`![描述](路徑)`）
       - 包含資料庫狀態對比表格
     - `async saveReport()`: 儲存報告到檔案
       - 檔名：`report-${timestamp}.md`
       - 使用 `fs/promises.writeFile` 寫入
       - 返回檔案路徑
  4. 確保所有 TypeScript 類型正確定義，使用 strict mode
  5. 確保所有 async 操作都有適當的錯誤處理
- **Purpose**: 提供視覺化日誌記錄功能，自動產生包含截圖和資料庫狀態對比的 Markdown 報告
- **_Leverage**: `@playwright/test` (Page 類型), `fs/promises` (檔案操作), `path` (路徑處理)
- **_Requirements**: Design Phase - 視覺化日誌架構 (Logger 類別設計)
- **_Prompt**: Role: TypeScript Developer specializing in test automation and logging systems | Task: Implement VisualLogger class following the design document specifications, creating a comprehensive logging system that generates Markdown reports with screenshots and database state comparisons | Restrictions: Must use TypeScript strict mode, handle all async operations properly, ensure directory creation is recursive, screenshot filenames must include timestamp, Markdown tables must be properly formatted, all error cases must be handled gracefully | Success: VisualLogger class is fully implemented with all required methods, generates properly formatted Markdown reports, screenshots are saved correctly, database state comparisons are displayed in tables, all TypeScript types are properly defined, error handling is robust

- [ ] 1.3 建立 DatabaseConnector 類別
- **File**: `tests/utils/db-connector.ts` (新建)
- **Actions**:
  1. 建立 `tests/utils/db-connector.ts` 檔案
  2. 定義 TypeScript 介面：
     - `User`: 與 VisualLogger 中的 User 介面一致
  3. 實作 `DatabaseConnector` 類別，包含以下方法：
     - `async queryUsers(usernames: string[]): Promise<User[]>`: 
       - 使用 `child_process.exec` 執行 `wrangler d1 execute horgoscpa-db-v2 --remote --command "SELECT ..."`
       - 查詢語句：`SELECT user_id, username, name, email, is_admin, is_deleted, phone, address, emergency_contact_name, emergency_contact_phone, gender, birth_date, start_date FROM Users WHERE username IN (${usernames.map(u => `'${u}'`).join(',')}) AND is_deleted = 0`
       - 解析 wrangler 命令的 JSON 輸出
       - 轉換資料庫格式到 TypeScript User 格式
       - 如果 wrangler 命令失敗，記錄警告並返回空陣列（不中斷流程）
     - `async userExists(username: string): Promise<boolean>`: 
       - 呼叫 `queryUsers([username])`
       - 檢查結果陣列長度是否 > 0
     - `async resetUserPassword(username: string, password: string): Promise<void>`: 
       - 使用 API 方式重置密碼（因為需要 hash，直接使用 API 更安全）
       - 或使用 wrangler d1 execute 執行 UPDATE（需要先 hash 密碼，使用與後端相同的 PBKDF2 演算法）
       - 建議：使用 API `/api/v2/settings/users/:userId` (PUT) 更新密碼（需要先登入獲取 Session）
       - 如果 API 方式不可行，使用 wrangler 命令執行 UPDATE（需要實作密碼 hash）
     - `async ensureUserActive(username: string): Promise<void>`: 
       - 使用 wrangler d1 execute 執行 `UPDATE Users SET is_deleted = 0 WHERE username = '${username}'`
       - 如果 wrangler 命令失敗，記錄警告（不中斷流程）
  4. 實作錯誤處理：
     - wrangler 命令執行失敗時，記錄警告但不拋出錯誤
     - 提供備選方案：如果 wrangler 不可用，提供 API 查詢方法（使用 `callAPI` 從 `tests/e2e/utils/test-data.ts`）
  5. 確保所有資料庫操作都是安全的（參數化查詢或適當的輸入驗證）
- **Purpose**: 封裝資料庫查詢邏輯，支援 Pre-check 和用戶狀態重置
- **_Leverage**: `child_process` (執行 wrangler 命令), `tests/e2e/utils/test-data.ts` (callAPI 函數，作為備選)
- **_Requirements**: Design Phase - 測試腳本流程設計 (Pre-check Phase), Component 3: Database Connector
- **_Prompt**: Role: Backend Developer specializing in database operations and command-line tools | Task: Implement DatabaseConnector class that wraps wrangler d1 execute commands for querying Cloudflare D1 database, with fallback to API queries if wrangler is unavailable, and implements user password reset and active status assurance | Restrictions: Must handle command execution errors gracefully, provide fallback mechanism, ensure password hashing matches backend implementation (or use API for password reset), all database operations must be read-only except for password reset and status update, SQL injection prevention through proper input validation | Success: DatabaseConnector can query users from database, check user existence, reset passwords, and ensure user active status, error handling is robust with fallback mechanisms, all operations are safe and idempotent

---

## 2.0 業務輔助類別建立 (Business Helpers)

- [ ] 2.1 建立測試用戶資料定義
- **File**: `tests/e2e/qa-01-auth/test-users.ts` (新建)
- **Actions**:
  1. 建立 `tests/e2e/qa-01-auth/test-users.ts` 檔案
  2. 定義 TypeScript 介面：
     - `UserData`: 包含 username, name, email, password, isAdmin, phone?, address?, emergency_contact_name?, emergency_contact_phone?, gender, birth_date?, start_date
  3. 定義 `TEST_USERS` 常數物件，包含 4 個測試用戶的完整資料：
     - `TEST_ADMIN_01`: 
       - username: `'TEST_ADMIN_01'`
       - name: `'測試管理員01'`
       - email: `'test_admin_01@test.com'`
       - password: `'111111'`
       - isAdmin: `true`
       - phone: `'0912345678'`
       - address: `'台北市信義區測試路123號'`
       - emergency_contact_name: `'緊急聯絡人'`
       - emergency_contact_phone: `'0987654321'`
       - gender: `'M'`
       - birth_date: `'1990-01-01'`
       - start_date: `'2024-01-01'`
     - `TEST_USER_STD`: 
       - 與 `TEST_ADMIN_01` 相同，但 `isAdmin: false`
       - name: `'測試員工（標準）'`
       - email: `'test_user_std@test.com'`
     - `TEST_USER_LEGACY`: 
       - username: `'TEST_USER_LEGACY'`
       - name: `'測試員工（舊資料）'`
       - email: `'test_user_legacy@test.com'`
       - password: `'111111'`
       - isAdmin: `false`
       - phone: `null` (明確設定為 null)
       - address: `null` (明確設定為 null)
       - emergency_contact_name: `null` (明確設定為 null)
       - emergency_contact_phone: `null` (明確設定為 null)
       - gender: `'M'` (基本欄位，必須有值)
       - birth_date: `null` (明確設定為 null)
       - start_date: `'2024-01-01'` (基本欄位，必須有值)
     - `TEST_USER_ASSIGNEE`: 
       - 與 `TEST_USER_STD` 相同
       - username: `'TEST_USER_ASSIGNEE'`
       - name: `'測試負責人'`
       - email: `'test_user_assignee@test.com'`
  4. 匯出 `TEST_USERS` 常數和 `UserData` 介面
  5. 確保所有資料符合 QA-00 黃金數據命名規範
- **Purpose**: 定義所有測試用戶的標準資料，遵循 QA-00 黃金數據命名規範
- **_Leverage**: QA-00 架構映射 - 黃金數據命名規範 (用戶/員工章節)
- **_Requirements**: Requirements Phase - 測試資料規範, Design Phase - Data Models (Test User Definitions)
- **_Prompt**: Role: TypeScript Developer specializing in test data management | Task: Create test-users.ts file defining all test user data constants following QA-00 Golden Data Naming Convention, ensuring TEST_USER_LEGACY has null fields for backward compatibility testing | Restrictions: Must strictly follow QA-00 naming conventions, all passwords must be '111111', TEST_USER_LEGACY must have phone, address, emergency_contact_name, emergency_contact_phone, and birth_date as null (explicitly set to null, not undefined), all TypeScript types must be properly defined and exported | Success: TEST_USERS constant is defined with all 4 users, types are properly defined and exported, TEST_USER_LEGACY has correct null fields, all data matches QA-00 specifications exactly

- [ ] 2.2 建立 UserCreationHelper 類別
- **File**: `tests/utils/user-creation-helper.ts` (新建)
- **Actions**:
  1. 建立 `tests/utils/user-creation-helper.ts` 檔案
  2. 引入必要的模組：
     - `@playwright/test` (Page 類型)
     - `tests/utils/visual-logger.ts` (VisualLogger)
     - `tests/e2e/utils/test-data.ts` (callAPI)
     - `tests/e2e/qa-01-auth/test-users.ts` (UserData 類型)
  3. 實作 `UserCreationHelper` 類別：
     - `constructor(page: Page, logger: VisualLogger)`: 儲存 page 和 logger 實例
     - `async createUserViaUI(userData: UserData): Promise<number | null>`: 
       - 導航到 `/settings/users` 頁面
       - 等待頁面載入完成（`waitForLoadState('networkidle')`）
       - 點擊「新增用戶」按鈕（使用 `page.getByRole('button', { name: /新增|添加/ })`）
       - 等待表單模態框出現
       - 填寫表單欄位（使用適當的 Playwright 選擇器）：
         - username: `page.fill('input[name="username"]', userData.username)`
         - name: `page.fill('input[name="name"]', userData.name)`
         - email: `page.fill('input[name="email"]', userData.email)`
         - password: `page.fill('input[name="password"]', userData.password)`
         - is_admin: 如果 `userData.isAdmin` 為 true，勾選 checkbox
         - phone: 如果 `userData.phone` 存在，填寫（條件式填寫）
         - address: 如果 `userData.address` 存在，填寫（條件式填寫）
         - emergency_contact_name: 如果 `userData.emergency_contact_name` 存在，填寫（條件式填寫）
         - emergency_contact_phone: 如果 `userData.emergency_contact_phone` 存在，填寫（條件式填寫）
         - birth_date: 如果 `userData.birth_date` 存在，使用日期選擇器填寫（條件式填寫）
         - gender: 使用 select 選擇 `userData.gender`
         - start_date: 使用日期選擇器填寫 `userData.start_date`
       - 在送出前截圖：`await logger.captureScreenshot(page, `form-filled-${userData.username}`, `表單填寫完成: ${userData.username}`)`
       - 送出表單：`await page.click('button[type="submit"]')` 或 `await page.getByRole('button', { name: /確認|提交/ }).click()`
       - 等待成功訊息出現：`await page.waitForSelector('.ant-message-success', { timeout: 5000 })`
       - 在成功訊息出現時截圖：`await logger.captureScreenshot(page, `user-created-${userData.username}`, `用戶建立成功: ${userData.username}`)`
       - 從 API 獲取新建立的用戶 ID：
         - 使用 `callAPI(page, 'GET', '/settings/users')` 獲取用戶列表
         - 從列表中找出 `username === userData.username` 的用戶
         - 返回 `user.user_id` 或 `user.id`
       - 如果建立失敗，返回 `null` 並記錄錯誤
  4. 實作錯誤處理：
     - 表單驗證錯誤：等待錯誤訊息出現，記錄到 logger
     - API 錯誤：記錄錯誤訊息
     - 超時錯誤：記錄超時訊息
  5. 確保所有等待操作都有適當的 timeout
- **Purpose**: 封裝用戶建立的 UI 操作邏輯，提供可重用的用戶建立功能
- **_Leverage**: `@playwright/test` (Page 類型), `tests/utils/visual-logger.ts` (VisualLogger), `tests/e2e/utils/test-data.ts` (callAPI 函數)
- **_Requirements**: Design Phase - Component 4: User Creation Helper
- **_Prompt**: Role: QA Automation Engineer specializing in Playwright and UI automation | Task: Implement UserCreationHelper class that encapsulates UI operations for creating users through the browser, including conditional form field filling, screenshot capture at key moments, and user ID retrieval | Restrictions: Must handle all form fields conditionally (only fill if value exists and is not null), wait for page loads and element visibility, capture screenshots before form submission and after success message, handle errors gracefully, use proper Playwright selectors (prefer getByRole and getByPlaceholder), ensure all waits have appropriate timeouts | Success: UserCreationHelper can successfully create users via UI, captures screenshots at correct moments, retrieves user IDs, handles errors properly, works for both admin and regular user creation, conditional field filling works correctly for TEST_USER_LEGACY with null fields

---

## 3.0 主測試腳本實作 (Main Script Implementation)

- [ ] 3.1 建立主測試腳本
- **File**: `tests/e2e/qa-01-auth/setup.spec.ts` (新建)
- **Actions**:
  1. 建立 `tests/e2e/qa-01-auth/setup.spec.ts` 檔案
  2. 引入必要的模組：
     ```typescript
     import dotenv from 'dotenv'
     dotenv.config()
     
     import { test, expect } from '@playwright/test'
     import { login, clearCacheAndLogout } from '../utils/auth'
     import { VisualLogger } from '../../utils/visual-logger'
     import { DatabaseConnector } from '../../utils/db-connector'
     import { UserCreationHelper } from '../../utils/user-creation-helper'
     import { TEST_USERS } from './test-users'
     ```
  3. 讀取環境變數：
     ```typescript
     const SEED_ADMIN_USER = process.env.SEED_ADMIN_USER
     const SEED_ADMIN_PASS = process.env.SEED_ADMIN_PASS
     
     if (!SEED_ADMIN_USER || !SEED_ADMIN_PASS) {
       throw new Error('請設定 SEED_ADMIN_USER 和 SEED_ADMIN_PASS 環境變數（在 .env 檔案中）')
     }
     ```
  4. 實作主測試流程：
     ```typescript
     test('QA-01: 建立測試用戶基礎設施', async ({ page }) => {
       // 初始化工具
       const logger = new VisualLogger('test-results/qa-01-auth')
       await logger.initialize()
       
       const dbConnector = new DatabaseConnector()
       const userCreationHelper = new UserCreationHelper(page, logger)
       
       // 1. Pre-check Phase
       await logger.logStep('Pre-check', '開始檢查測試用戶是否存在')
       const existingUsers: Record<string, boolean> = {}
       
       for (const [key, userData] of Object.entries(TEST_USERS)) {
         const exists = await dbConnector.userExists(userData.username)
         existingUsers[key] = exists
         await logger.logStep('Pre-check', `檢查用戶 ${userData.username}: ${exists ? '已存在' : '不存在'}`)
       }
       
       // 2. Conditional Execution Phase
       await logger.logStep('Conditional Execution', '開始建立或重置測試用戶')
       
       for (const [key, userData] of Object.entries(TEST_USERS)) {
         const exists = existingUsers[key]
         
         if (!exists) {
           // 用戶不存在 → UI 流程建立
           await logger.logStep('建立用戶', `開始建立用戶 ${userData.username}（UI 流程）`)
           
           // 記錄建立前的資料庫狀態
           const beforeState = await dbConnector.queryUsers([userData.username])
           await logger.logDatabaseState(beforeState, [], '建立前')
           
           // 執行 UI 流程
           const userId = await userCreationHelper.createUserViaUI(userData)
           
           if (userId) {
             // 記錄建立後的資料庫狀態
             const afterState = await dbConnector.queryUsers([userData.username])
             await logger.logDatabaseState(beforeState, afterState, '建立後')
             
             await logger.logStep('建立成功', `用戶 ${userData.username} 建立成功，ID: ${userId}`)
           } else {
             throw new Error(`建立用戶 ${userData.username} 失敗`)
           }
         } else {
           // 用戶已存在 → 資料庫直接重置
           await logger.logStep('重置用戶', `用戶 ${userData.username} 已存在，重置密碼和狀態`)
           
           // 記錄重置前的資料庫狀態
           const beforeState = await dbConnector.queryUsers([userData.username])
           
           // 重置密碼和狀態
           await dbConnector.resetUserPassword(userData.username, '111111')
           await dbConnector.ensureUserActive(userData.username)
           
           // 記錄重置後的資料庫狀態
           const afterState = await dbConnector.queryUsers([userData.username])
           await logger.logDatabaseState(beforeState, afterState, '重置後')
           
           await logger.logStep('重置成功', `用戶 ${userData.username} 重置成功`)
         }
       }
       
       // 3. Verification Phase
       await logger.logStep('Verification', '開始驗證測試用戶登入和個人資料頁面')
       
       // 使用 Seed Admin 登入
       await logger.logStep('登入', `使用 Seed Admin 登入: ${SEED_ADMIN_USER}`)
       await login(page, { username: SEED_ADMIN_USER!, password: SEED_ADMIN_PASS! })
       await expect(page).toHaveURL(/.*\/dashboard/)
       
       // 登出 Seed Admin
       await page.getByRole('button', { name: /登出|退出/ }).click()
       await page.waitForURL('**/login')
       
       // 驗證每個測試用戶
       for (const [key, userData] of Object.entries(TEST_USERS)) {
         // 登入測試
         await logger.logStep('登入驗證', `測試用戶 ${userData.username} 登入`)
         await login(page, { username: userData.username, password: '111111' })
         
         // 驗證首頁顯示
         await expect(page).toHaveURL(/.*\/dashboard/)
         
         if (userData.isAdmin) {
           await expect(page.getByText('系統設定')).toBeVisible()
         } else {
           await expect(page.getByText('系統設定')).not.toBeVisible()
         }
         
         // 特別測試 TEST_USER_LEGACY 的個人資料頁面
         if (key === 'TEST_USER_LEGACY') {
           await logger.logStep('Legacy 資料檢查', `檢查 ${userData.username} 的個人資料頁面`)
           
           // 導航到個人資料頁面
           await page.goto('/profile')
           await page.waitForLoadState('networkidle')
           
           // 截圖（證明沒有白畫面）
           await logger.captureScreenshot(page, 'legacy-user-profile', 'Legacy 用戶個人資料頁面（驗證 NULL 欄位處理）')
           
           // 驗證 NULL 欄位正確顯示
           const phoneElement = page.getByText('電話', { exact: false }).or(page.getByText('Phone', { exact: false }))
           if (await phoneElement.isVisible().catch(() => false)) {
             const phoneValue = await phoneElement.textContent()
             expect(phoneValue).toMatch(/-|未設定|空/)
           }
           
           // 檢查 Console 錯誤
           const consoleErrors: string[] = []
           page.on('console', msg => {
             if (msg.type() === 'error') {
               consoleErrors.push(msg.text())
             }
           })
           
           // 驗證沒有 JavaScript 錯誤
           expect(consoleErrors.length).toBe(0)
           
           await logger.logStep('Legacy 資料檢查完成', `個人資料頁面正常顯示，NULL 欄位處理正確`)
         }
         
         // 登出
         await page.getByRole('button', { name: /登出|退出/ }).click()
         await page.waitForURL('**/login')
       }
       
       // 產生報告
       const reportPath = await logger.saveReport()
       console.log(`\n✅ 測試報告已儲存: ${reportPath}\n`)
     })
     ```
  5. 實作錯誤處理：
     - 環境變數缺失：顯示明確錯誤訊息
     - 用戶建立失敗：記錄錯誤並中斷測試
     - 登入失敗：記錄錯誤並中斷測試
     - 個人資料頁面錯誤：記錄錯誤並中斷測試
  6. 確保所有操作都有適當的等待和超時設定
- **Purpose**: 組合所有工具，執行完整的測試流程（Pre-check → 條件執行 → 驗證）
- **_Leverage**: `tests/e2e/utils/auth.ts` (login), `tests/utils/visual-logger.ts` (VisualLogger), `tests/utils/db-connector.ts` (DatabaseConnector), `tests/utils/user-creation-helper.ts` (UserCreationHelper), `tests/e2e/qa-01-auth/test-users.ts` (TEST_USERS)
- **_Requirements**: Requirements Phase - 所有 User Stories (Requirement 1, 2, 3), Design Phase - 測試腳本流程設計
- **_Prompt**: Role: QA Automation Engineer specializing in end-to-end testing and test orchestration | Task: Implement main test script setup.spec.ts that orchestrates the complete test flow: Pre-check (database query), Conditional Execution (UI creation or DB reset), and Verification (login tests and legacy data check), following the design document specifications | Restrictions: Must load environment variables using dotenv, handle all error scenarios gracefully, ensure idempotency (can run multiple times), capture screenshots at key moments, generate comprehensive Markdown report, test legacy user profile page for NULL field handling, all waits must have appropriate timeouts | Success: Test script runs successfully, creates or resets all test users, verifies login functionality, tests legacy user profile page, generates Markdown report with screenshots and database state comparisons, script is idempotent (can run multiple times without errors), all error cases are handled properly

---

## 4.0 環境配置檢查 (Environment Setup)

- [ ] 4.1 檢查環境變數配置
- **File**: `.env` (檢查/建立)
- **Actions**:
  1. 檢查專案根目錄是否存在 `.env` 檔案
  2. 如果不存在，建立 `.env` 檔案（注意：不要覆蓋現有的 `.env`，如果已存在則跳過建立）
  3. 在 `.env` 中提供範本內容（如果檔案是新建立的）：
     ```
     # QA-01 測試用 Seed Admin 帳號
     # 請填入真實的 Seed Admin 帳號和密碼
     SEED_ADMIN_USER=your_seed_admin_username
     SEED_ADMIN_PASS=your_seed_admin_password
     
     # Playwright 測試基礎 URL（可選，預設使用 production）
     # PLAYWRIGHT_BASE_URL=https://v2.horgoscpa.com
     ```
  4. 如果 `.env` 已存在但缺少 `SEED_ADMIN_USER` 或 `SEED_ADMIN_PASS`，在終端顯示提示：
     ```
     ⚠️  警告: .env 檔案存在，但缺少以下環境變數：
     - SEED_ADMIN_USER
     - SEED_ADMIN_PASS
     
     請在 .env 檔案中新增這些變數並填入真實的 Seed Admin 帳號和密碼。
     ```
  5. 在 `tests/e2e/qa-01-auth/setup.spec.ts` 中實作環境變數驗證（已在 Task 3.1 中包含）
  6. 在 README 或測試文檔中說明如何設定環境變數（可選，視專案需求）
- **Purpose**: 確保測試腳本能正確讀取 Seed Admin 帳號資訊
- **_Leverage**: `dotenv` (環境變數讀取), `fs/promises` (檔案檢查)
- **_Requirements**: Design Phase - 技術堆疊與工具
- **_Prompt**: Role: DevOps Engineer specializing in environment configuration and documentation | Task: Check for .env file existence, create template file if missing, and implement environment variable validation in test script | Restrictions: Must not overwrite existing .env file, provide clear template with comments, validate environment variables before test execution, provide helpful error messages if variables are missing | Success: .env template file is created if missing, test script validates environment variables and shows helpful error messages if missing, user is clearly informed about required environment variables

---

## 5.0 執行與驗收 (Execution & Verification)

- [ ] 5.1 執行測試腳本
- **File**: 終端命令執行
- **Actions**:
  1. 確保所有前置任務已完成（Task 1-4）
  2. 確保環境變數已正確設定（`.env` 檔案存在且包含 `SEED_ADMIN_USER` 和 `SEED_ADMIN_PASS`）
  3. 執行測試命令：
     ```bash
     npx playwright test tests/e2e/qa-01-auth/setup.spec.ts
     ```
  4. 觀察測試執行過程：
     - 檢查是否有錯誤訊息
     - 檢查 Pre-check 階段是否正確執行（應顯示每個用戶的存在狀態）
     - 檢查 Conditional Execution 階段是否正確執行（應顯示建立或重置的用戶）
     - 檢查 Verification 階段是否正確執行（應顯示登入測試和個人資料頁面測試）
  5. 如果測試失敗：
     - 檢查錯誤訊息
     - 檢查 Playwright 報告（`playwright-report/index.html`）
     - 檢查 Console 輸出
     - 修復問題後重新執行
  6. 如果測試成功，繼續執行 Task 5.2
- **Purpose**: 執行完整的測試流程，驗證所有功能正常運作
- **_Leverage**: `npx playwright test` (Playwright 測試執行器)
- **_Requirements**: 所有 Requirements Phase 的驗收標準
- **_Prompt**: Role: QA Engineer specializing in test execution and debugging | Task: Execute the test script and verify all phases complete successfully, debugging any issues that arise | Restrictions: Must ensure all prerequisites are met before execution, monitor test execution for errors, verify each phase completes correctly, fix any issues before proceeding | Success: Test script executes successfully, all phases complete without errors, test users are created or reset correctly, login verification passes, legacy user profile page test passes

- [ ] 5.2 讀取並顯示報告摘要
- **File**: `test-results/qa-01-auth/report-{timestamp}.md` (讀取)
- **Actions**:
  1. 檢查 `test-results/qa-01-auth/` 目錄是否存在
  2. 找出最新生成的 Markdown 報告檔案（檔名格式：`report-{timestamp}.md`）
  3. 讀取報告內容（使用 `fs/promises.readFile`）
  4. 解析報告內容，提取關鍵資訊：
     - 執行時間（從報告標題或內容中提取）
     - 總步驟數（從報告內容中提取）
     - 建立的用戶列表（從「建立成功」步驟中提取 User ID, Username, Email, Role）
     - 重置的用戶列表（從「重置成功」步驟中提取）
     - 驗證結果（從「登入驗證」和「Legacy 資料檢查」步驟中提取）
     - 截圖列表（從報告中提取所有截圖連結）
  5. 在終端顯示報告摘要：
     ```
     ========================================
     QA-01 測試報告摘要
     ========================================
     執行時間: 2025-01-XX XX:XX:XX
     總步驟數: XX
     
     建立的用戶:
     - TEST_ADMIN_01 (ID: X, Email: test_admin_01@test.com, Role: 管理員)
     - TEST_USER_STD (ID: X, Email: test_user_std@test.com, Role: 員工)
     - TEST_USER_LEGACY (ID: X, Email: test_user_legacy@test.com, Role: 員工)
     - TEST_USER_ASSIGNEE (ID: X, Email: test_user_assignee@test.com, Role: 員工)
     
     重置的用戶:
     - (如果有的話)
     
     驗證結果:
     - 所有用戶登入測試: ✅ 通過
     - Legacy 用戶個人資料頁: ✅ 通過（無白畫面，NULL 欄位處理正確）
     
     截圖數量: X 張
     報告位置: test-results/qa-01-auth/report-{timestamp}.md
     ========================================
     ```
  6. 如果報告讀取失敗，顯示錯誤訊息並提示檢查報告目錄
- **Purpose**: 提供測試結果的快速摘要，方便快速了解測試執行狀況
- **_Leverage**: `fs/promises` (讀取檔案), Markdown 解析（簡單的正則表達式或手動解析）
- **_Requirements**: Design Phase - 視覺化日誌架構
- **_Prompt**: Role: DevOps Engineer specializing in test reporting and automation | Task: Read the generated Markdown report and display a concise summary in the terminal, extracting key information like execution time, created users, and verification results | Restrictions: Must handle file reading errors gracefully, parse Markdown content correctly, display information in a clear and readable format, highlight key results (pass/fail), show report file location | Success: Report summary is displayed clearly in terminal, includes all key information, highlights test results (pass/fail), shows report file location, handles errors gracefully

---

## 6.0 架構文檔同步 (Documentation Sync) - **關鍵任務**

- [ ] 6.1 回顧 QA-00 架構映射文檔
- **File**: `.spec-workflow/specs/qa-00-architecture-map/requirements.md` (讀取和檢查)
- **Actions**:
  1. 讀取 `QA-00-Architecture-Map/requirements.md` 文檔
  2. 根據 Task 5 的執行結果，檢查以下內容是否與實際情況相符：
     - **黃金數據命名規範**：
       - 檢查用戶命名（`TEST_ADMIN_01`, `TEST_USER_STD`, `TEST_USER_LEGACY`, `TEST_USER_ASSIGNEE`）是否正確
       - 檢查用戶資料定義（欄位名稱、預設值）是否與實際建立的一致
     - **向後兼容性雷區**：
       - 檢查 Users 表的欄位名稱是否正確（`phone`, `address`, `emergency_contact_name`, `emergency_contact_phone`）
       - 檢查 NULL 欄位處理邏輯是否與實際測試結果一致
       - 檢查個人資料頁面的欄位顯示邏輯是否與實際情況一致
     - **資料庫狀態流轉**：
       - 檢查 User 狀態流轉描述是否與實際建立流程一致
  3. 對比實際測試結果與文檔描述：
     - 檢查資料庫查詢結果中的欄位名稱
     - 檢查 UI 表單中的欄位名稱
     - 檢查個人資料頁面實際顯示的欄位
     - 檢查 NULL 欄位的實際處理方式（顯示「-」還是「未設定」）
  4. 記錄發現的差異：
     - 如果發現欄位名稱不一致（例如：文檔寫 `phone` 但實際是 `mobile_number`）
     - 如果發現 NULL 處理邏輯不一致（例如：文檔寫顯示「-」但實際顯示「未設定」）
     - 如果發現其他不一致的地方
- **Purpose**: 確保 QA-00 架構映射文檔與實際代碼保持一致
- **_Leverage**: Task 5 的執行結果（測試報告、資料庫查詢結果、UI 截圖）
- **_Requirements**: QA-00 架構映射 - 黃金數據命名規範, 向後兼容性雷區
- **_Prompt**: Role: Technical Writer specializing in documentation accuracy and code-documentation synchronization | Task: Review QA-00 Architecture Map document against actual test execution results, identifying any discrepancies between documented field names, NULL handling logic, and actual implementation | Restrictions: Must compare actual database schema, UI form fields, and profile page display against documentation, identify all discrepancies accurately, document findings clearly | Success: All discrepancies between QA-00 documentation and actual implementation are identified, findings are clearly documented with specific examples

- [ ] 6.2 更新 QA-00 架構映射文檔
- **File**: `.spec-workflow/specs/qa-00-architecture-map/requirements.md` (修改)
- **Actions**:
  1. 根據 Task 6.1 發現的差異，更新 QA-00 文檔：
     - **如果發現欄位名稱不一致**：
       - 更新「向後兼容性雷區」章節中的欄位名稱
       - 更新「資料庫狀態流轉」章節中的欄位引用
       - 確保所有欄位名稱與實際資料庫和 UI 一致
     - **如果發現 NULL 處理邏輯不一致**：
       - 更新「向後兼容性雷區」章節中的測試重點描述
       - 更新「測試重點」中的預期行為描述
       - 確保描述與實際測試結果一致
     - **如果發現其他不一致**：
       - 更新相關章節的描述
       - 確保文檔準確反映實際情況
  2. 在更新後，在文檔中新增「驗證記錄」區段（如果不存在）：
     ```markdown
     ## 驗證記錄
     
     ### 2025-01-XX: QA-01 測試驗證
     - ✅ 黃金數據命名規範驗證通過
     - ✅ Users 表欄位名稱驗證通過（phone, address, emergency_contact_name, emergency_contact_phone）
     - ✅ NULL 欄位處理邏輯驗證通過（個人資料頁面顯示「-」或「未設定」）
     - ✅ 資料庫狀態流轉描述驗證通過
     ```
  3. 如果沒有發現差異，在「驗證記錄」中註記：
     ```markdown
     ## 驗證記錄
     
     ### 2025-01-XX: QA-01 測試驗證
     - ✅ QA-00 驗證無誤：所有欄位名稱、NULL 處理邏輯、資料庫狀態流轉描述與實際情況完全一致
     ```
  4. 確保更新後的文檔格式正確，Markdown 語法無誤
  5. 在 Implementation Log 中記錄更新內容
- **Purpose**: 修正 QA-00 文檔中的不準確描述，確保文檔與實際代碼保持一致
- **_Leverage**: Task 6.1 的發現結果
- **_Requirements**: QA-00 架構映射 - 所有相關章節
- **_Prompt**: Role: Technical Writer specializing in documentation maintenance and accuracy | Task: Update QA-00 Architecture Map document based on discrepancies found in Task 6.1, ensuring all field names, NULL handling logic, and database state transitions accurately reflect actual implementation | Restrictions: Must update all identified discrepancies, maintain document structure and formatting, add verification record section, ensure Markdown syntax is correct, document all changes clearly | Success: QA-00 document is updated with accurate information, all discrepancies are corrected, verification record is added, document remains well-structured and readable

- [ ] 6.3 記錄架構文檔同步結果
- **File**: Implementation Log (使用 log-implementation 工具)
- **Actions**:
  1. 使用 `log-implementation` 工具記錄 Task 6 的執行結果：
     - **taskId**: `6`
     - **summary**: 簡要描述同步結果（例如：「驗證並更新 QA-00 架構映射文檔，確保與實際代碼一致」）
     - **filesModified**: `['.spec-workflow/specs/qa-00-architecture-map/requirements.md']`（如果有修改）
     - **filesCreated**: `[]`
     - **statistics**: 記錄修改的行數
     - **artifacts**: 
       - 記錄發現的差異（如果有）
       - 記錄更新的內容（如果有）
       - 記錄驗證結果（「QA-00 驗證無誤」或具體的修正內容）
  2. 在記錄中明確標註：
     - 是否發現差異
     - 如果發現差異，具體的差異內容
     - 如果沒有差異，標註「QA-00 驗證無誤」
- **Purpose**: 記錄架構文檔同步的執行結果，為後續測試 Spec 提供參考
- **_Leverage**: `log-implementation` MCP 工具
- **_Requirements**: QA-00 架構映射 - 所有相關章節
- **_Prompt**: Role: Technical Writer specializing in documentation and implementation logging | Task: Log the documentation synchronization results using log-implementation tool, clearly documenting any discrepancies found and updates made to QA-00 document | Restrictions: Must use log-implementation tool correctly, provide clear summary of findings, document all changes made, mark verification status clearly | Success: Implementation log is created with clear documentation of synchronization results, discrepancies (if any) are documented, updates (if any) are recorded, verification status is clearly marked

---

## 任務執行順序

所有任務必須按順序執行，因為後續任務依賴前置任務的產出：

1. **Task 1** (基礎工具建立) → 必須先完成，提供後續任務所需的工具類別
2. **Task 2** (業務輔助類別) → 依賴 Task 1 的 VisualLogger
3. **Task 3** (主測試腳本) → 依賴 Task 1 和 Task 2 的所有工具
4. **Task 4** (環境配置) → 可與 Task 1-3 並行，但必須在 Task 5 之前完成
5. **Task 5** (執行與驗收) → 依賴所有前置任務完成
6. **Task 6** (架構文檔同步) → 依賴 Task 5 的執行結果

## 驗收標準

所有任務完成後，應達成以下目標：

1. ✅ 所有工具類別已建立並可正常使用
2. ✅ 測試用戶資料定義符合 QA-00 黃金數據命名規範
3. ✅ 主測試腳本可成功執行，具備冪等性
4. ✅ 環境變數已正確配置
5. ✅ 測試報告和截圖已正確生成
6. ✅ 所有測試用戶已建立或重置
7. ✅ 所有登入測試通過
8. ✅ Legacy 用戶個人資料頁面測試通過（無白畫面，NULL 欄位處理正確）
9. ✅ **QA-00 架構映射文檔已驗證並更新（如有必要）**

## 特別注意事項

### Task 6 的重要性

Task 6（架構文檔同步）是確保整個測試體系準確性的關鍵任務。通過實際測試執行，我們可以：

1. **驗證文檔準確性**：確保 QA-00 文檔中的定義與實際代碼一致
2. **發現潛在問題**：及早發現文檔與代碼的不一致，避免後續測試基於錯誤的假設
3. **建立信任基礎**：確保後續測試 Spec 可以放心地參考 QA-00 文檔

### 執行 Task 6 時的檢查清單

- [ ] 檢查 Users 表的實際欄位名稱是否與文檔一致
- [ ] 檢查 UI 表單中的欄位名稱是否與文檔一致
- [ ] 檢查個人資料頁面的實際顯示邏輯是否與文檔描述一致
- [ ] 檢查 NULL 欄位的實際處理方式是否與文檔描述一致
- [ ] 檢查測試用戶的實際建立結果是否與文檔定義一致
- [ ] 記錄所有發現的差異（如果有的話）
- [ ] 更新 QA-00 文檔（如果有差異）
- [ ] 在驗證記錄中標註驗證結果

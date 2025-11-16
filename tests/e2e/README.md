# Playwright 測試使用指南

## 🎯 三種測試方式（不用全部手寫！）

### 方式一：Codegen 錄製工具（最簡單，推薦！）

**適合場景**：不想手寫程式碼，想要快速生成測試腳本

**使用步驟**：

1. **啟動你的應用**（選擇一個）：
   ```bash
   # 本地開發
   npm run dev
   
   # 或預覽模式
   npm run build
   npm run preview
   ```

2. **啟動 Codegen 錄製工具**：
   ```bash
   # 錄製本地開發環境
   npm run test:codegen:local
   
   # 或錄製預覽環境
   npm run test:codegen:preview
   
   # 或錄製生產環境
   npm run test:codegen:prod
   ```

3. **在瀏覽器中操作**：
   - 會自動開啟兩個視窗
   - 左邊是瀏覽器（你操作的視窗）
   - 右邊是程式碼生成視窗（自動生成測試腳本）
   - 你在左邊做什麼操作，右邊就會自動生成對應的測試程式碼

4. **儲存測試腳本**：
   - 操作完成後，複製右邊生成的程式碼
   - 貼到 `tests/e2e/` 目錄下的新檔案（例如：`my-test.spec.ts`）
   - 就完成了！

**實際範例**：
假設你要測試「登入功能」：
1. 執行 `npm run test:codegen:local`
2. 在左邊瀏覽器輸入帳號密碼，點擊登入
3. 右邊自動生成：
   ```typescript
   await page.goto('http://localhost:5173/login')
   await page.fill('input[name="username"]', 'admin')
   await page.fill('input[name="password"]', '111111')
   await page.click('button[type="submit"]')
   ```
4. 複製這段程式碼，存成 `tests/e2e/login.spec.ts`
5. 完成！

---

### 方式二：UI Mode 視覺化測試（互動式測試）

**適合場景**：想要邊測試邊調整，即時看到結果

**使用步驟**：

1. **啟動 UI Mode**：
   ```bash
   npm run test:ui
   ```

2. **在視覺化介面中**：
   - 選擇要執行的測試
   - 點擊執行
   - 即時看到測試結果
   - 可以暫停、單步執行、查看變數
   - 可以修改測試並立即重新執行

3. **好處**：
   - 不需要手寫程式碼
   - 可以互動式調試
   - 視覺化查看測試過程

---

### 方式三：手寫測試腳本（最靈活）

**適合場景**：需要複雜邏輯、條件判斷、資料驗證

**範例**（已經在 `tests/e2e/` 目錄中）：
```typescript
import { test, expect } from '@playwright/test'
import { login } from './utils/auth'

test('登入測試', async ({ page }) => {
  await login(page)
  await page.goto('/dashboard')
  await expect(page.locator('.dashboard-title')).toBeVisible()
})
```

---

## 📋 常用指令

```bash
# 錄製測試（推薦新手）
npm run test:codegen:local

# 視覺化測試
npm run test:ui

# 執行所有測試
npm test

# 執行測試（顯示瀏覽器視窗）
npm run test:headed

# 除錯模式
npm run test:debug
```

---

## 🎓 實際使用場景

### 場景一：測試新功能「客戶管理」

1. 開發完成後，執行 `npm run test:codegen:local`
2. 在瀏覽器中：
   - 登入系統
   - 點擊「客戶管理」
   - 新增一個客戶
   - 編輯客戶資料
   - 刪除客戶
3. 右邊自動生成完整測試腳本
4. 儲存為 `tests/e2e/clients.spec.ts`
5. 以後每次修改程式碼，執行 `npm test` 就能自動測試這些功能

### 場景二：測試登入流程

1. 執行 `npm run test:codegen:local`
2. 在瀏覽器中輸入錯誤密碼，確認錯誤訊息
3. 輸入正確密碼，確認成功登入
4. 自動生成測試腳本，包含錯誤和成功兩種情況

### 場景三：測試表單驗證

1. 執行 `npm run test:codegen:local`
2. 在表單中故意留空必填欄位，提交表單
3. 確認錯誤訊息顯示
4. 填寫完整資料，確認成功提交
5. 自動生成包含驗證邏輯的測試腳本

---

## 💡 小技巧

1. **Codegen 可以錄製任何操作**：點擊、輸入、選擇、拖曳等
2. **錄製後可以手動調整**：生成的程式碼可以編輯，加入自己的邏輯
3. **可以錄製多個測試**：一次錄製多個功能，然後分開儲存
4. **結合 UI Mode**：先用 Codegen 生成，再用 UI Mode 調試和優化

---

## 🚀 開始使用

最簡單的方式就是：
```bash
npm run test:codegen:local
```

然後在瀏覽器中操作你的應用，程式碼會自動生成！



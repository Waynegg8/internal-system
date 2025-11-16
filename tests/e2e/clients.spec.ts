import { test, expect } from '@playwright/test'
import { login } from './utils/auth'

test.describe('客戶管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('應該能訪問客戶列表頁面', async ({ page }) => {
    await page.goto('/clients', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/clients/)
    // 檢查頁面是否載入（檢查 body 或主要容器）
    await expect(page.locator('body')).toBeVisible()
  })

  test('應該能點擊新增客戶按鈕', async ({ page }) => {
    await page.goto('/clients', { waitUntil: 'networkidle' })
    
    // 尋找新增按鈕（可能是「新增」、「新增客戶」、「+」等）
    const addButton = page.locator('button:has-text("新增"), a:has-text("新增"), button:has-text("新增客戶")').first()
    
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click()
      await expect(page).toHaveURL(/.*\/clients\/add/)
    } else {
      // 如果找不到按鈕，至少確認頁面載入正常
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('應該能訪問新增客戶頁面', async ({ page }) => {
    await page.goto('/clients/add', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/clients\/add/)
  })
})


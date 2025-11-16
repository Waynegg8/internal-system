import { test, expect } from '@playwright/test'
import { login } from './utils/auth'

test.describe('任務管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('應該能訪問任務列表頁面', async ({ page }) => {
    await page.goto('/tasks', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/tasks/)
    // 檢查頁面是否載入
    await expect(page.locator('body')).toBeVisible()
  })

  test('應該能訪問新增任務頁面', async ({ page }) => {
    await page.goto('/tasks/new', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/tasks\/new/)
  })
})


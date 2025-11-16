import { test, expect } from '@playwright/test'
import { login } from './utils/auth'

test.describe('知識庫', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('應該能訪問知識庫 SOP 頁面', async ({ page }) => {
    await page.goto('/knowledge/sop', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/knowledge\/sop/)
  })

  test('應該能訪問知識庫 FAQ 頁面', async ({ page }) => {
    await page.goto('/knowledge/faq', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/knowledge\/faq/)
  })

  test('應該能訪問知識庫資源頁面', async ({ page }) => {
    await page.goto('/knowledge/resources', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/knowledge\/resources/)
  })

  test('應該能訪問知識庫附件頁面', async ({ page }) => {
    await page.goto('/knowledge/attachments', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/knowledge\/attachments/)
  })
})



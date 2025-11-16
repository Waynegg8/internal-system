import { test, expect } from '@playwright/test'
import { login } from './utils/auth'

test.describe('工時記錄', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('應該能訪問工時記錄頁面', async ({ page }) => {
    await page.goto('/timesheets', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/timesheets/)
    
    // 檢查是否有週導航或工時表格（使用更精確的選擇器）
    const weekNav = page.locator('[class*="week-navigation"]').first()
    const timesheetTable = page.locator('[class*="timesheet-table"]').first()
    
    // 至少其中一個應該可見
    const hasWeekNav = await weekNav.isVisible().catch(() => false)
    const hasTable = await timesheetTable.isVisible().catch(() => false)
    
    expect(hasWeekNav || hasTable).toBeTruthy()
  })
})


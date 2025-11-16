import { test, expect } from '@playwright/test'
import { login } from './utils/auth'

test.describe('Dashboard Alerts & Summary', () => {
  test('renders daily summary and realtime alerts sections', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    const summaryCard = page.locator('.summary-card')
    await expect(summaryCard, 'should render daily summary card').toBeVisible()
    // 使用更精確的選擇器，只匹配 card title
    await expect(summaryCard.locator('.ant-card-head-title').getByText('今日摘要'), 'card title should be visible').toBeVisible()

    const alertsCard = page.locator('.alerts-card')
    await expect(alertsCard, 'should render realtime alerts card').toBeVisible()
    // 使用更精確的選擇器，只匹配 card title
    await expect(alertsCard.locator('.ant-card-head-title').getByText('即時提醒'), 'card title should be visible').toBeVisible()

    // verify cards render empty states gracefully when no data
    const summaryEmpty = summaryCard.locator('.ant-empty')
    const alertsEmpty = alertsCard.locator('.ant-empty')
    await Promise.all([
      expect(summaryEmpty.or(summaryCard.locator('.summary-stats'))).toBeVisible(),
      expect(alertsEmpty.or(alertsCard.locator('.alerts-list'))).toBeVisible()
    ])
  })
})




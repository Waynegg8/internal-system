import { test, expect } from '@playwright/test'
import { login } from './utils/auth'

test.describe('Knowledge Attachments task filter integration', () => {
  test('displays task filter banner when taskId query provided', async ({ page }) => {
    await login(page)

    const taskId = process.env.TEST_TASK_ID
    test.skip(!taskId, 'TEST_TASK_ID must be provided to validate task filtered attachments')

    const targetUrl = `/knowledge/attachments?taskId=${encodeURIComponent(taskId)}&returnTo=${encodeURIComponent(
      `/tasks/${taskId}`
    )}`
    await page.goto(targetUrl, { waitUntil: 'networkidle' })

    const banner = page.locator('.task-filter-banner')
    await expect(banner).toBeVisible()
    await expect(banner.getByText(`任務 ${taskId}`)).toBeVisible()
    await expect(banner.getByRole('button', { name: '回到任務' })).toBeVisible()
    await expect(banner.getByRole('button', { name: '清除篩選' })).toBeVisible()
  })
})




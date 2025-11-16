import { test, expect } from '@playwright/test'
import { login } from './utils/auth'

test.describe('Task stage panel interactions', () => {
  test('opens update stage modal and validates fields', async ({ page }) => {
    const taskId = process.env.TEST_TASK_ID
    test.skip(!taskId, 'TEST_TASK_ID must be provided to validate task stage management')

    await login(page)
    await page.goto(`/tasks/${taskId}`, { waitUntil: 'networkidle' })

    const stagePanel = page.locator('.stage-list')
    await expect(stagePanel).toBeVisible()

    const editButtons = stagePanel.getByRole('button', { name: /更新階段|檢視/ })
    await editButtons.first().click()

    const modal = page.locator('.ant-modal')
    await expect(modal).toBeVisible()
    await expect(modal.getByText('階段狀態')).toBeVisible()
    await expect(modal.getByText('延遲天數')).toBeVisible()

    // dont submit to avoid mutating data
    await modal.getByRole('button', { name: '取消' }).click()
    await expect(modal).toBeHidden()
  })
})





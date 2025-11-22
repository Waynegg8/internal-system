import { test, expect } from '@playwright/test'
import { login, clearCacheAndLogout } from './utils/auth'

/**
 * BR5.2: 月度管理費用記錄 - 完整測試套件
 *
 * 測試範圍：
 * - 月度管理費用記錄列表展示
 * - 新增月度管理費用記錄
 * - 編輯月度管理費用記錄
 * - 刪除月度管理費用記錄
 * - 驗證規則檢查（必填欄位、金額正數、年份月份範圍、唯一性約束）
 */

test.describe('BR5.2: 月度管理費用記錄', () => {
  test.beforeEach(async ({ page }) => {
    // 每次測試前清除緩存並登出，確保從乾淨狀態開始
    await clearCacheAndLogout(page)
    // 然後重新登入
    await login(page)
  })

  test('應該能訪問月度管理費用記錄頁面', async ({ page }) => {
    await page.goto('/costs/records', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/.*\/costs\/records/)

    // 檢查頁面標題
    await expect(page.locator('h1:has-text("月度管理費用記錄")')).toBeVisible()

    // 檢查新增按鈕存在
    await expect(page.locator('button:has-text("新增記錄")')).toBeVisible()
  })

  test('列表應該顯示所有記錄', async ({ page }) => {
    await page.goto('/costs/records', { waitUntil: 'networkidle' })

    // 檢查表格存在
    const table = page.locator('.ant-table')
    await expect(table).toBeVisible()

    // 如果有記錄，檢查欄位顯示
    const rows = page.locator('.ant-table-tbody .ant-table-row')
    if (await rows.count() > 0) {
      // 檢查第一行記錄的欄位
      const firstRow = rows.first()

      // 檢查成本項目名稱欄位
      const costNameCell = firstRow.locator('.ant-table-cell').nth(0)
      await expect(costNameCell).toBeVisible()

      // 檢查金額欄位
      const amountCell = firstRow.locator('.ant-table-cell').nth(1)
      await expect(amountCell).toBeVisible()

      // 檢查備註欄位（可選）
      const notesCell = firstRow.locator('.ant-table-cell').nth(2)
      await expect(notesCell).toBeVisible()

      // 檢查錄入人欄位
      const createdByCell = firstRow.locator('.ant-table-cell').nth(3)
      await expect(createdByCell).toBeVisible()

      // 檢查操作按鈕
      const actionCell = firstRow.locator('.ant-table-cell').nth(4)
      await expect(actionCell.locator('button:has-text("編輯")')).toBeVisible()
      await expect(actionCell.locator('button:has-text("刪除")')).toBeVisible()
    }
  })

  test('應該能新增月度管理費用記錄', async ({ page }) => {
    await page.goto('/costs/records', { waitUntil: 'networkidle' })

    // 點擊新增按鈕
    await page.locator('button:has-text("新增記錄")').click()

    // 等待表單彈窗出現
    await expect(page.locator('.ant-modal-title:has-text("新增月度記錄")')).toBeVisible()

    // 獲取當前年月
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // 填寫表單 - 選擇第一個成本項目類型
    const costTypeSelect = page.locator('.ant-modal .ant-select').first()
    await costTypeSelect.click()
    await page.locator('.ant-select-dropdown .ant-select-item').first().click()

    // 填寫年份
    const yearInput = page.locator('.ant-modal input[type="number"]').nth(0)
    await yearInput.fill(currentYear.toString())

    // 選擇月份
    const monthSelect = page.locator('.ant-modal .ant-select').nth(1)
    await monthSelect.click()
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: `${currentMonth}月` }).click()

    // 填寫金額
    const amountInput = page.locator('.ant-modal input[type="number"]').nth(1)
    await amountInput.fill('1000')

    // 填寫備註（可選）
    const notesInput = page.locator('.ant-modal textarea')
    await notesInput.fill('測試記錄')

    // 提交表單
    await page.locator('.ant-modal .ant-btn-primary').click()

    // 檢查成功訊息
    await expect(page.locator('.ant-message-success')).toBeVisible()

    // 檢查彈窗關閉
    await expect(page.locator('.ant-modal')).not.toBeVisible()
  })

  test('新增記錄時應該驗證必填欄位', async ({ page }) => {
    await page.goto('/costs/records', { waitUntil: 'networkidle' })

    // 點擊新增按鈕
    await page.locator('button:has-text("新增記錄")').click()

    // 直接點擊提交按鈕，不填寫任何欄位
    await page.locator('.ant-modal .ant-btn-primary').click()

    // 檢查驗證錯誤訊息
    await expect(page.locator('.ant-form-item-explain-error:has-text("請選擇成本項目")')).toBeVisible()
    await expect(page.locator('.ant-form-item-explain-error:has-text("請輸入年份")')).toBeVisible()
    await expect(page.locator('.ant-form-item-explain-error:has-text("請選擇月份")')).toBeVisible()
    await expect(page.locator('.ant-form-item-explain-error:has-text("請輸入金額")')).toBeVisible()
  })

  test('金額應該大於0', async ({ page }) => {
    await page.goto('/costs/records', { waitUntil: 'networkidle' })

    // 點擊新增按鈕
    await page.locator('button:has-text("新增記錄")').click()

    // 填寫表單
    const costTypeSelect = page.locator('.ant-modal .ant-select').first()
    await costTypeSelect.click()
    await page.locator('.ant-select-dropdown .ant-select-item').first().click()

    const now = new Date()
    const yearInput = page.locator('.ant-modal input[type="number"]').nth(0)
    await yearInput.fill(now.getFullYear().toString())

    const monthSelect = page.locator('.ant-modal .ant-select').nth(1)
    await monthSelect.click()
    await page.locator('.ant-select-dropdown .ant-select-item').first().click()

    // 輸入無效金額（0或負數）
    const amountInput = page.locator('.ant-modal input[type="number"]').nth(1)
    await amountInput.fill('0')

    // 提交表單
    await page.locator('.ant-modal .ant-btn-primary').click()

    // 檢查驗證錯誤
    await expect(page.locator('.ant-form-item-explain-error:has-text("金額必須大於0")')).toBeVisible()
  })

  test('年份應該在有效範圍內', async ({ page }) => {
    await page.goto('/costs/records', { waitUntil: 'networkidle' })

    // 點擊新增按鈕
    await page.locator('button:has-text("新增記錄")').click()

    // 輸入無效年份
    const yearInput = page.locator('.ant-modal input[type="number"]').nth(0)
    await yearInput.fill('1899')

    // 失去焦點觸發驗證
    await page.locator('.ant-modal').click()

    // 檢查驗證錯誤
    await expect(page.locator('.ant-form-item-explain-error:has-text("年份必須在1900-2100之間")')).toBeVisible()
  })

  test('應該能編輯現有記錄', async ({ page }) => {
    await page.goto('/costs/records', { waitUntil: 'networkidle' })

    // 檢查是否有記錄可以編輯
    const editButtons = page.locator('button:has-text("編輯")')
    if (await editButtons.count() > 0) {
      // 點擊第一個編輯按鈕
      await editButtons.first().click()

      // 檢查編輯彈窗出現
      await expect(page.locator('.ant-modal-title:has-text("編輯月度記錄")')).toBeVisible()

      // 修改備註
      const notesInput = page.locator('.ant-modal textarea')
      await notesInput.fill('編輯測試備註')

      // 提交表單
      await page.locator('.ant-modal .ant-btn-primary').click()

      // 檢查成功訊息
      await expect(page.locator('.ant-message-success')).toBeVisible()
    }
  })

  test('應該能刪除記錄', async ({ page }) => {
    await page.goto('/costs/records', { waitUntil: 'networkidle' })

    // 檢查是否有記錄可以刪除
    const deleteButtons = page.locator('button:has-text("刪除")')
    if (await deleteButtons.count() > 0) {
      // 獲取刪除前的記錄數量
      const initialCount = await page.locator('.ant-table-tbody .ant-table-row').count()

      // 點擊第一個刪除按鈕
      await deleteButtons.first().click()

      // 確認刪除（如果有確認對話框）
      const confirmButton = page.locator('.ant-modal-confirm-btns .ant-btn-primary')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }

      // 檢查成功訊息
      await expect(page.locator('.ant-message-success')).toBeVisible()

      // 可選：檢查記錄數量減少（如果實現了重新載入）
      // const finalCount = await page.locator('.ant-table-tbody .ant-table-row').count()
      // expect(finalCount).toBeLessThan(initialCount)
    }
  })

  test('同一成本項目類型在同一月應該只能有一筆記錄', async ({ page }) => {
    await page.goto('/costs/records', { waitUntil: 'networkidle' })

    // 首先新增一筆記錄
    await page.locator('button:has-text("新增記錄")').click()

    // 選擇成本項目類型
    const costTypeSelect = page.locator('.ant-modal .ant-select').first()
    await costTypeSelect.click()
    const firstCostType = page.locator('.ant-select-dropdown .ant-select-item').first()
    await firstCostType.click()
    const selectedCostTypeText = await firstCostType.textContent()

    // 填寫年月
    const now = new Date()
    const yearInput = page.locator('.ant-modal input[type="number"]').nth(0)
    await yearInput.fill(now.getFullYear().toString())

    const monthSelect = page.locator('.ant-modal .ant-select').nth(1)
    await monthSelect.click()
    await page.locator('.ant-select-dropdown .ant-select-item').first().click()

    // 填寫金額
    const amountInput = page.locator('.ant-modal input[type="number"]').nth(1)
    await amountInput.fill('2000')

    // 提交第一筆記錄
    await page.locator('.ant-modal .ant-btn-primary').click()
    await expect(page.locator('.ant-message-success')).toBeVisible()

    // 再次嘗試新增同一成本項目類型在同一月份的記錄
    await page.locator('button:has-text("新增記錄")').click()

    // 選擇相同的成本項目類型
    await costTypeSelect.click()
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: selectedCostTypeText }).click()

    // 填寫相同的年月
    await yearInput.fill(now.getFullYear().toString())
    await monthSelect.click()
    await page.locator('.ant-select-dropdown .ant-select-item').first().click()

    // 填寫金額
    await amountInput.fill('3000')

    // 提交表單
    await page.locator('.ant-modal .ant-btn-primary').click()

    // 檢查重複錯誤訊息
    await expect(page.locator('.ant-message-error')).toBeVisible()
  })
})



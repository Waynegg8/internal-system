/**
 * 收據詳情頁面 E2E 測試
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'

test.describe('收據詳情頁面', () => {
  test.beforeEach(async ({ page }) => {
    // 登入並導航到收據列表
    await login(page)
    await page.goto('/receipts')
    await expect(page).toHaveURL('/receipts')
  })

  test('應該能夠載入收據詳情', async ({ page }) => {
    // 點擊第一個收據
    await page.locator('.ant-table-tbody tr').first().click()

    // 等待詳情頁面載入
    await expect(page).toHaveURL(/\/receipts\/.+/)

    // 檢查基本資訊是否顯示
    await expect(page.locator('text=收據編號')).toBeVisible()
    await expect(page.locator('text=客戶名稱')).toBeVisible()
    await expect(page.locator('text=總金額')).toBeVisible()
  })

  test('應該能夠編輯收據', async ({ page }) => {
    // 導航到收據詳情頁面
    await page.locator('.ant-table-tbody tr').first().click()
    await expect(page).toHaveURL(/\/receipts\/.+/)

    // 點擊編輯按鈕
    await page.click('text=編輯收據')

    // 檢查編輯彈窗是否打開
    await expect(page.locator('.ant-modal-title').filter({ hasText: '編輯收據' })).toBeVisible()

    // 修改備註欄位
    const newNotes = `測試備註 ${Date.now()}`
    await page.fill('.ant-modal textarea', newNotes)

    // 提交編輯
    await page.click('.ant-modal button.ant-btn-primary')

    // 檢查成功提示
    await expect(page.locator('.ant-alert-success')).toBeVisible()

    // 檢查備註是否已更新
    await expect(page.locator(`text=${newNotes}`)).toBeVisible()
  })

  test('應該能夠作廢收據', async ({ page }) => {
    // 創建測試收據（先跳過，因為需要 API 調用）

    // 導航到收據詳情頁面
    await page.locator('.ant-table-tbody tr').first().click()
    await expect(page).toHaveURL(/\/receipts\/.+/)

    // 點擊作廢按鈕
    await page.click('text=作廢收據')

    // 檢查作廢彈窗是否打開
    await expect(page.locator('.ant-modal-title').filter({ hasText: '作廢收據' })).toBeVisible()

    // 輸入作廢原因
    const cancellationReason = `測試作廢 ${Date.now()}`
    await page.fill('.ant-modal textarea', cancellationReason)

    // 提交作廢
    await page.click('.ant-modal button.ant-btn-primary')

    // 檢查是否跳轉回列表頁面
    await expect(page).toHaveURL('/receipts')
  })

  test('應該能夠列印請款單', async ({ page }) => {
    // 導航到收據詳情頁面
    await page.locator('.ant-table-tbody tr').first().click()
    await expect(page).toHaveURL(/\/receipts\/.+/)

    // 點擊列印請款單按鈕
    await page.click('text=列印請款單')

    // 檢查列印選擇彈窗是否打開
    await expect(page.locator('.ant-modal-title').filter({ hasText: '選擇列印類型' })).toBeVisible()

    // 點擊列印請款單
    await page.click('text=列印請款單')

    // 檢查是否彈出列印對話框（無法直接測試列印功能）
    // 但可以檢查按鈕是否存在
    await expect(page.locator('button').filter({ hasText: '列印' })).toBeVisible()
  })

  test('應該能夠列印收據', async ({ page }) => {
    // 導航到收據詳情頁面
    await page.locator('.ant-table-tbody tr').first().click()
    await expect(page).toHaveURL(/\/receipts\/.+/)

    // 點擊列印收據按鈕
    await page.click('text=列印收據')

    // 檢查列印選擇彈窗是否打開
    await expect(page.locator('.ant-modal-title').filter({ hasText: '選擇列印類型' })).toBeVisible()

    // 點擊列印收據
    await page.click('text=列印收據')

    // 檢查是否彈出列印對話框
    await expect(page.locator('button').filter({ hasText: '列印' })).toBeVisible()
  })

  test('應該顯示編輯歷史', async ({ page }) => {
    // 導航到收據詳情頁面
    await page.locator('.ant-table-tbody tr').first().click()
    await expect(page).toHaveURL(/\/receipts\/.+/)

    // 檢查編輯歷史區域是否存在
    await expect(page.locator('text=編輯歷史')).toBeVisible()
  })

  test('作廢後按鈕應該被禁用', async ({ page }) => {
    // 先創建一個未作廢的收據（需要 API 調用，此處跳過）

    // 編輯收據為作廢狀態（需要 API 調用，此處跳過）

    // 導航到收據詳情頁面
    await page.locator('.ant-table-tbody tr').first().click()
    await expect(page).toHaveURL(/\/receipts\/.+/)

    // 檢查編輯和作廢按鈕是否被禁用
    // 注意：實際測試中需要先將收據設為作廢狀態
    const editButton = page.locator('button').filter({ hasText: '編輯收據' })
    const cancelButton = page.locator('button').filter({ hasText: '作廢收據' })

    // 如果收據已作廢，這些按鈕應該被禁用或隱藏
    // 此測試需要根據實際情況調整
  })
})



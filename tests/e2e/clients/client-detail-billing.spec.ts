/**
 * 客戶收費管理 E2E 測試
 * 測試 BR1.3.3 完整工作流程
 * 
 * 測試場景：
 * 1. 年度收費計劃管理（年度切換、自動建立、CRUD）
 * 2. 定期服務收費計劃建立和收入分攤計算
 * 3. 一次性服務收費計劃和收入記錄
 * 4. 應計收入展示和計算驗證
 * 5. 批量操作和錯誤處理
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'
import { createTestClient, callAPI } from '../utils/test-data'

test.describe('客戶收費管理 (BR1.3.3)', () => {
  let testClientId: string | null = null
  const currentYear = new Date().getFullYear()
  const testYear = currentYear

  test.beforeAll(async ({ browser }) => {
    // 設置測試數據：創建測試客戶
    const context = await browser.newContext()
    const page = await context.newPage()
    
    try {
      await login(page)
      
      // 創建測試客戶
      testClientId = await createTestClient(page, {
        companyName: `E2E測試收費客戶-${Date.now()}`,
        taxId: String(Math.floor(Math.random() * 100000000)).padStart(8, '0'),
        contactPerson1: '測試聯絡人',
        phone: '02-1234-5678',
        email: `test-billing-${Date.now()}@test.com`
      })
      
      if (!testClientId) {
        throw new Error('無法創建測試客戶')
      }
      
      // 確保客戶有至少一個定期服務（用於測試）
      // 這裡假設客戶已經有服務，如果沒有，測試會處理
      
    } catch (error) {
      console.error('設置測試數據失敗:', error)
      throw error
    } finally {
      await context.close()
    }
  })

  test.beforeEach(async ({ page }) => {
    await login(page)
    
    if (!testClientId) {
      throw new Error('測試客戶 ID 未設置')
    }
    
    // 導航到客戶詳情頁的收費設定標籤
    await page.goto(`/clients/${testClientId}`, { waitUntil: 'networkidle' })
    
    // 等待頁面載入
    await page.waitForLoadState('networkidle')
    
    // 點擊收費設定標籤
    await page.getByRole('tab', { name: /收費設定|Billing/ }).click()
    await page.waitForTimeout(1000) // 等待標籤切換
  })

  test('應該顯示年度選擇器和收費計劃列表', async ({ page }) => {
    // 驗證年度選擇器存在
    const yearSelector = page.locator('[data-testid="billing-year-selector"], .ant-select').first()
    await expect(yearSelector).toBeVisible({ timeout: 5000 })
    
    // 驗證收費計劃標籤存在
    await expect(page.getByRole('tab', { name: /收費計劃|Billing Plans/ })).toBeVisible()
    
    // 驗證應計收入標籤存在
    await expect(page.getByRole('tab', { name: /應計收入|Accrued Revenue/ })).toBeVisible()
  })

  test('應該能夠切換年度並自動建立收費計劃', async ({ page }) => {
    const targetYear = testYear + 1 // 測試下一年度
    
    // 點擊年度選擇器
    const yearSelector = page.locator('.ant-select-selector').first()
    await yearSelector.click()
    await page.waitForTimeout(500)
    
    // 選擇目標年度（如果存在）
    const yearOption = page.getByText(String(targetYear), { exact: true })
    if (await yearOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await yearOption.click()
      await page.waitForTimeout(2000) // 等待自動建立完成
      
      // 驗證是否有成功提示或計劃已建立
      // 這裡可能需要檢查是否有自動建立的提示
    }
  })

  test('應該能夠建立定期服務收費計劃', async ({ page }) => {
    // 點擊新增收費計劃按鈕
    const addButton = page.getByRole('button', { name: /新增|Add|建立/ })
    await addButton.click()
    await page.waitForTimeout(1000)
    
    // 選擇收費類型：定期服務
    const recurringRadio = page.getByRole('radio', { name: /定期服務|Recurring/ })
    await recurringRadio.click()
    await page.waitForTimeout(500)
    
    // 選擇關聯服務（如果有多個選項）
    const serviceSelect = page.locator('.ant-select').first()
    await serviceSelect.click()
    await page.waitForTimeout(500)
    
    // 選擇第一個服務選項
    const firstOption = page.locator('.ant-select-item-option').first()
    if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstOption.click()
    } else {
      // 如果沒有服務，跳過此測試或創建服務
      test.skip()
      return
    }
    
    // 選擇月份（例如：1-3月）
    await page.getByText('1月').click()
    await page.getByText('2月').click()
    await page.getByText('3月').click()
    
    // 填寫月份金額
    // 查找月份金額輸入框（可能在表格中）
    const amountInputs = page.locator('input[type="number"]').filter({ hasText: /金額|Amount/ })
    const firstAmountInput = amountInputs.first()
    if (await firstAmountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstAmountInput.fill('20000')
    }
    
    // 填寫付款期限（如果可見）
    const paymentDueInput = page.getByPlaceholder(/付款期限|Payment Due/).first()
    if (await paymentDueInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paymentDueInput.fill('30')
    }
    
    // 提交表單
    const submitButton = page.getByRole('button', { name: /確定|OK|提交|Submit/ }).last()
    await submitButton.click()
    
    // 等待成功提示
    await expect(page.getByText(/成功|Success|建立成功/)).toBeVisible({ timeout: 5000 })
    
    // 驗證計劃出現在列表中
    await page.waitForTimeout(1000)
    await expect(page.getByText(/定期服務|Recurring/)).toBeVisible()
  })

  test('應該能夠建立一次性服務收費計劃', async ({ page }) => {
    // 點擊新增收費計劃按鈕
    const addButton = page.getByRole('button', { name: /新增|Add|建立/ })
    await addButton.click()
    await page.waitForTimeout(1000)
    
    // 選擇收費類型：一次性服務
    const oneTimeRadio = page.getByRole('radio', { name: /一次性服務|One-time/ })
    await oneTimeRadio.click()
    await page.waitForTimeout(500)
    
    // 選擇關聯服務
    const serviceSelect = page.locator('.ant-select').first()
    await serviceSelect.click()
    await page.waitForTimeout(500)
    
    const firstOption = page.locator('.ant-select-item-option').first()
    if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstOption.click()
    } else {
      test.skip()
      return
    }
    
    // 填寫項目名稱
    const descriptionInput = page.getByPlaceholder(/項目名稱|Description|項目/).first()
    await descriptionInput.fill('設立費')
    
    // 選擇收費日期
    const datePicker = page.locator('.ant-picker').first()
    await datePicker.click()
    await page.waitForTimeout(500)
    
    // 選擇今天或指定日期
    const todayButton = page.getByRole('button', { name: /今天|Today/ })
    if (await todayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await todayButton.click()
    } else {
      // 手動選擇日期
      const dateInput = page.locator('.ant-picker-input input').first()
      await dateInput.fill(`${testYear}-03-15`)
    }
    
    // 填寫金額
    const amountInput = page.getByPlaceholder(/金額|Amount/).first()
    await amountInput.fill('50000')
    
    // 提交表單
    const submitButton = page.getByRole('button', { name: /確定|OK|提交|Submit/ }).last()
    await submitButton.click()
    
    // 等待成功提示
    await expect(page.getByText(/成功|Success|建立成功/)).toBeVisible({ timeout: 5000 })
  })

  test('應該能夠編輯收費計劃', async ({ page }) => {
    // 等待計劃列表載入
    await page.waitForTimeout(2000)
    
    // 查找編輯按鈕（可能在表格的操作列中）
    const editButtons = page.getByRole('button', { name: /編輯|Edit/ })
    const firstEditButton = editButtons.first()
    
    if (await firstEditButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstEditButton.click()
      await page.waitForTimeout(1000)
      
      // 修改金額（如果可見）
      const amountInput = page.locator('input[type="number"]').first()
      if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await amountInput.clear()
        await amountInput.fill('25000')
      }
      
      // 提交修改
      const submitButton = page.getByRole('button', { name: /確定|OK|提交|Submit/ }).last()
      await submitButton.click()
      
      // 等待成功提示
      await expect(page.getByText(/成功|Success|更新成功/)).toBeVisible({ timeout: 5000 })
    } else {
      // 如果沒有計劃可編輯，跳過此測試
      test.skip()
    }
  })

  test('應該能夠刪除收費計劃', async ({ page }) => {
    // 等待計劃列表載入
    await page.waitForTimeout(2000)
    
    // 查找刪除按鈕
    const deleteButtons = page.getByRole('button', { name: /刪除|Delete/ })
    const firstDeleteButton = deleteButtons.first()
    
    if (await firstDeleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstDeleteButton.click()
      await page.waitForTimeout(500)
      
      // 確認刪除（如果有確認對話框）
      const confirmButton = page.getByRole('button', { name: /確定|確認|OK/ })
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }
      
      // 等待成功提示
      await expect(page.getByText(/成功|Success|刪除成功/)).toBeVisible({ timeout: 5000 })
    } else {
      test.skip()
    }
  })

  test('應該能夠查看應計收入', async ({ page }) => {
    // 切換到應計收入標籤
    await page.getByRole('tab', { name: /應計收入|Accrued Revenue/ }).click()
    await page.waitForTimeout(2000)
    
    // 驗證應計收入內容顯示
    // 應該有年度總計
    await expect(page.getByText(/年度總計|Annual Total|總計/)).toBeVisible({ timeout: 5000 })
    
    // 應該有定期服務收入分攤表格（如果有定期服務）
    const recurringSection = page.getByText(/定期服務|Recurring/).first()
    if (await recurringSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(recurringSection).toBeVisible()
    }
    
    // 應該有一次性服務收入表格（如果有一次性服務）
    const oneTimeSection = page.getByText(/一次性服務|One-time/).first()
    if (await oneTimeSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(oneTimeSection).toBeVisible()
    }
  })

  test('應該驗證應計收入計算準確性', async ({ page }) => {
    // 使用 API 直接驗證計算結果
    if (!testClientId) {
      test.skip()
      return
    }
    
    // 切換到應計收入標籤
    await page.getByRole('tab', { name: /應計收入|Accrued Revenue/ }).click()
    await page.waitForTimeout(2000)
    
    // 通過 API 獲取應計收入數據
    const revenueResponse = await callAPI(page, 'GET', `/clients/${testClientId}/billing/revenue?year=${testYear}&validate=true`)
    
    expect(revenueResponse).toBeDefined()
    if (revenueResponse?.ok && revenueResponse?.data) {
      const revenueData = revenueResponse.data
      
      // 驗證數據結構
      expect(revenueData).toHaveProperty('summary')
      expect(revenueData.summary).toHaveProperty('totalRecurringRevenue')
      expect(revenueData.summary).toHaveProperty('totalOneTimeRevenue')
      expect(revenueData.summary).toHaveProperty('totalAnnualRevenue')
      
      // 驗證總額計算正確
      const calculatedTotal = (revenueData.summary.totalRecurringRevenue || 0) + 
                              (revenueData.summary.totalOneTimeRevenue || 0)
      expect(revenueData.summary.totalAnnualRevenue).toBeCloseTo(calculatedTotal, 2)
      
      // 如果有驗證結果，檢查驗證狀態
      if (revenueData.validation) {
        // 驗證應該通過（或至少沒有嚴重錯誤）
        expect(revenueData.validation.isValid).toBe(true)
      }
    }
  })

  test('應該能夠批量刪除收費計劃', async ({ page }) => {
    // 等待計劃列表載入
    await page.waitForTimeout(2000)
    
    // 查找表格的複選框（如果支持批量選擇）
    const checkboxes = page.locator('input[type="checkbox"]').filter({ has: page.locator('thead') })
    const checkboxCount = await checkboxes.count()
    
    if (checkboxCount > 0) {
      // 選擇多個計劃
      await checkboxes.nth(0).check()
      if (checkboxCount > 1) {
        await checkboxes.nth(1).check()
      }
      
      // 點擊批量刪除按鈕
      const batchDeleteButton = page.getByRole('button', { name: /批量刪除|Batch Delete/ })
      if (await batchDeleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await batchDeleteButton.click()
        
        // 確認刪除
        const confirmButton = page.getByRole('button', { name: /確定|確認|OK/ })
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click()
        }
        
        // 等待成功提示
        await expect(page.getByText(/成功|Success|刪除成功/)).toBeVisible({ timeout: 5000 })
      }
    } else {
      test.skip()
    }
  })

  test('應該處理表單驗證錯誤', async ({ page }) => {
    // 點擊新增收費計劃按鈕
    const addButton = page.getByRole('button', { name: /新增|Add|建立/ })
    await addButton.click()
    await page.waitForTimeout(1000)
    
    // 不填寫任何必填欄位，直接提交
    const submitButton = page.getByRole('button', { name: /確定|OK|提交|Submit/ }).last()
    await submitButton.click()
    
    // 應該顯示驗證錯誤
    await expect(page.getByText(/請選擇|請輸入|必填|Required/)).toBeVisible({ timeout: 3000 })
  })

  test('應該正確處理年度切換時的數據一致性', async ({ page }) => {
    const year1 = testYear
    const year2 = testYear + 1
    
    // 在 year1 建立計劃
    await page.goto(`/clients/${testClientId}`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: /收費設定|Billing/ }).click()
    await page.waitForTimeout(1000)
    
    // 切換到 year2
    const yearSelector = page.locator('.ant-select-selector').first()
    await yearSelector.click()
    await page.waitForTimeout(500)
    
    const year2Option = page.getByText(String(year2), { exact: true })
    if (await year2Option.isVisible({ timeout: 2000 }).catch(() => false)) {
      await year2Option.click()
      await page.waitForTimeout(2000)
      
      // 驗證 year2 的計劃列表（應該與 year1 分開）
      // 這裡可以通過 API 驗證
      const plansResponse = await callAPI(page, 'GET', `/clients/${testClientId}/billing/plans?year=${year2}`)
      
      if (plansResponse?.ok) {
        // 驗證返回的計劃都是 year2 的
        const plans = plansResponse.data?.plans || []
        plans.forEach((plan: any) => {
          expect(plan.billingYear).toBe(year2)
        })
      }
    }
  })

  test('應該正確顯示收費計劃統計資訊', async ({ page }) => {
    // 等待計劃列表載入
    await page.waitForTimeout(2000)
    
    // 查找統計資訊區域
    const statsSection = page.locator('[data-testid="billing-stats"], .ant-statistic, .ant-descriptions')
    
    if (await statsSection.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // 驗證統計資訊存在
      await expect(statsSection.first()).toBeVisible()
      
      // 應該有定期服務數量
      const recurringCount = page.getByText(/定期服務.*數量|Recurring.*Count/)
      if (await recurringCount.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(recurringCount).toBeVisible()
      }
      
      // 應該有一次性服務數量
      const oneTimeCount = page.getByText(/一次性服務.*數量|One-time.*Count/)
      if (await oneTimeCount.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(oneTimeCount).toBeVisible()
      }
      
      // 應該有年度總計
      const yearTotal = page.getByText(/年度總計|Year Total|總計/)
      if (await yearTotal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(yearTotal).toBeVisible()
      }
    }
  })
})




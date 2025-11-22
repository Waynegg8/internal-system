/**
 * 成本分攤計算 E2E 測試
 * 測試所有分攤方式和計算邏輯
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'

test.describe('成本分攤計算功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登入為管理員
    await login(page)

    // 導航到成本分攤計算頁面
    await page.goto('/costs/allocation')
    await page.waitForLoadState('networkidle')
  })

  test('應該能選擇年份月份並選擇分攤方式', async ({ page }) => {
    // 驗證頁面標題
    await expect(page.locator('h1, .ant-card-head-title')).toContainText(/成本分攤計算/)

    // 驗證年份月份選擇器存在
    const monthPicker = page.locator('.ant-picker')
    await expect(monthPicker).toBeVisible()

    // 驗證分攤方式選擇器存在
    const allocationSelect = page.locator('.ant-select')
    await expect(allocationSelect).toBeVisible()

    // 驗證可以選擇不同的分攤方式
    await allocationSelect.click()
    await expect(page.locator('.ant-select-dropdown')).toBeVisible()

    // 檢查分攤方式選項
    await expect(page.locator('.ant-select-dropdown')).toContainText('按員工數分攤')
    await expect(page.locator('.ant-select-dropdown')).toContainText('按工時分攤')
    await expect(page.locator('.ant-select-dropdown')).toContainText('按收入分攤')
  })

  test('按員工數分攤應該正確計算', async ({ page }) => {
    // 選擇年份月份 (使用當前月份)
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    // 選擇分攤方式：按員工數分攤
    await page.locator('.ant-select').click()
    await page.locator('.ant-select-dropdown').locator('text=按員工數分攤').click()

    // 點擊計算按鈕
    await page.locator('.ant-btn-primary').click()

    // 等待計算完成
    await page.waitForTimeout(2000)

    // 驗證計算結果
    await expect(page.locator('text=計算摘要')).toBeVisible()

    // 驗證員工分攤明細表格存在
    await expect(page.locator('text=員工分攤明細')).toBeVisible()

    // 驗證客戶任務成本表格存在
    await expect(page.locator('text=客戶任務成本')).toBeVisible()
  })

  test('按工時分攤應該正確計算', async ({ page }) => {
    // 選擇分攤方式：按工時分攤
    await page.locator('.ant-select').click()
    await page.locator('.ant-select-dropdown').locator('text=按工時分攤').click()

    // 點擊計算按鈕
    await page.locator('.ant-btn-primary').click()

    // 等待計算完成
    await page.waitForTimeout(2000)

    // 驗證計算結果
    await expect(page.locator('text=分攤方式')).toContainText('按工時分攤')
    await expect(page.locator('text=計算摘要')).toBeVisible()
  })

  test('按收入分攤應該正確計算', async ({ page }) => {
    // 選擇分攤方式：按收入分攤
    await page.locator('.ant-select').click()
    await page.locator('.ant-select-dropdown').locator('text=按收入分攤').click()

    // 點擊計算按鈕
    await page.locator('.ant-btn-primary').click()

    // 等待計算完成
    await page.waitForTimeout(2000)

    // 驗證計算結果
    await expect(page.locator('text=分攤方式')).toContainText('按收入分攤')
    await expect(page.locator('text=計算摘要')).toBeVisible()
  })

  test('應該驗證必填欄位', async ({ page }) => {
    // 不選擇年份月份，直接點擊計算
    await page.locator('.ant-btn-primary').click()

    // 應該顯示錯誤訊息
    await expect(page.locator('.ant-message-error')).toBeVisible()
  })

  test('應該能重置表單', async ({ page }) => {
    // 選擇分攤方式
    await page.locator('.ant-select').click()
    await page.locator('.ant-select-dropdown').locator('text=按工時分攤').click()

    // 驗證選擇成功
    await expect(page.locator('.ant-select-selection-item')).toContainText('按工時分攤')

    // 點擊重置按鈕
    await page.locator('.ant-btn').filter({ hasText: '重置' }).click()

    // 驗證表單已重置
    await expect(page.locator('.ant-select-selection-placeholder')).toBeVisible()
  })

  test('計算結果應該包含完整的數據', async ({ page }) => {
    // 選擇按員工數分攤
    await page.locator('.ant-select').click()
    await page.locator('.ant-select-dropdown').locator('text=按員工數分攤').click()

    // 點擊計算
    await page.locator('.ant-btn-primary').click()

    // 等待結果
    await page.waitForTimeout(3000)

    // 驗證結果表格包含必要欄位
    await expect(page.locator('table')).toBeVisible()

    // 檢查員工表格是否包含名稱、時薪、總成本等欄位
    const tableHeaders = page.locator('table thead th')
    await expect(tableHeaders).toContainText('員工姓名')
    await expect(tableHeaders).toContainText('實際時薪')
    await expect(tableHeaders).toContainText('總成本')

    // 檢查客戶表格是否包含客戶名稱、總成本等欄位
    await expect(tableHeaders).toContainText('客戶名稱')
    await expect(tableHeaders).toContainText('總成本')
  })

  test('應該處理計算錯誤情況', async ({ page }) => {
    // 模擬無數據的情況 - 使用未來月份
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 2) // 兩個月後

    // 選擇未來月份
    await page.locator('.ant-picker').click()
    await page.locator('.ant-picker-cell-inner').filter({
      hasText: (futureDate.getMonth() + 1).toString()
    }).first().click()

    // 選擇分攤方式
    await page.locator('.ant-select').click()
    await page.locator('.ant-select-dropdown').locator('text=按員工數分攤').click()

    // 點擊計算
    await page.locator('.ant-btn-primary').click()

    // 等待結果 - 應該能正常處理無數據情況
    await page.waitForTimeout(2000)

    // 驗證沒有崩潰，並顯示適當的結果
    await expect(page.locator('text=計算摘要')).toBeVisible()
  })
})

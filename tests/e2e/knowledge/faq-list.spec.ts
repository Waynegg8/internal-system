/**
 * FAQ 列表功能 E2E 測試
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'

test.describe('FAQ 列表功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登入
    await login(page)

    // 導航到知識庫 FAQ 頁面
    await page.goto('/knowledge/faq')
    await page.waitForLoadState('networkidle')
  })

  test('應該能載入 FAQ 列表頁面', async ({ page }) => {
    // 驗證頁面標題
    await expect(page.locator('h1, .page-title')).toContainText(/FAQ/)

    // 驗證列表區域存在
    await expect(page.locator('.faq-list-col')).toBeVisible()

    // 驗證預覽區域存在
    await expect(page.locator('.faq-preview-col')).toBeVisible()
  })

  test('應該能載入並顯示 FAQ 列表', async ({ page }) => {
    // 等待數據載入
    await page.waitForTimeout(2000)

    // 檢查是否有 FAQ 數據或空狀態
    const hasFAQs = await page.locator('.faq-item, .ant-empty').first().isVisible()

    if (hasFAQs) {
      // 如果有 FAQ，檢查列表項結構
      const faqItems = page.locator('.faq-item')
      if (await faqItems.count() > 0) {
        const firstItem = faqItems.first()

        // 檢查 FAQ 項目包含問題標題
        await expect(firstItem.locator('.ant-list-item-meta-title')).toBeVisible()
      }
    }
  })

  test('應該支援關鍵詞搜尋', async ({ page }) => {
    // 找到搜尋輸入框
    const searchInput = page.locator('.search-input input')

    // 輸入搜尋關鍵詞
    await searchInput.fill('測試')
    await searchInput.press('Enter')

    // 等待搜尋結果
    await page.waitForTimeout(1000)

    // 驗證搜尋功能觸發（檢查是否有結果或空狀態）
    const resultsVisible = await page.locator('.faq-item, .ant-empty').first().isVisible()
    expect(resultsVisible).toBe(true)
  })

  test('應該支援服務類型篩選', async ({ page }) => {
    // 找到服務類型下拉選單
    const serviceSelect = page.locator('.service-item .ant-select')

    // 點擊展開下拉選單
    await serviceSelect.click()

    // 等待下拉選單載入
    await page.waitForTimeout(500)

    // 如果有選項，選擇第一個
    const options = page.locator('.ant-select-dropdown .ant-select-item')
    if (await options.count() > 0) {
      await options.first().click()

      // 等待篩選結果
      await page.waitForTimeout(1000)

      // 驗證篩選功能觸發
      const resultsVisible = await page.locator('.faq-item, .ant-empty').first().isVisible()
      expect(resultsVisible).toBe(true)
    }
  })

  test('應該支援層級篩選', async ({ page }) => {
    // 找到層級下拉選單
    const scopeSelect = page.locator('.level-item .ant-select')

    // 點擊展開下拉選單
    await scopeSelect.click()

    // 選擇「服務層級」
    await page.locator('.ant-select-dropdown').locator('text=服務層級').click()

    // 等待篩選結果
    await page.waitForTimeout(1000)

    // 驗證篩選功能觸發
    const resultsVisible = await page.locator('.faq-item, .ant-empty').first().isVisible()
    expect(resultsVisible).toBe(true)
  })

  test('應該支援客戶篩選', async ({ page }) => {
    // 找到客戶下拉選單
    const clientSelect = page.locator('.client-item .ant-select')

    // 點擊展開下拉選單
    await clientSelect.click()

    // 等待下拉選單載入
    await page.waitForTimeout(500)

    // 如果有選項，選擇第一個
    const options = page.locator('.ant-select-dropdown .ant-select-item')
    if (await options.count() > 0) {
      await options.first().click()

      // 等待篩選結果
      await page.waitForTimeout(1000)

      // 驗證篩選功能觸發
      const resultsVisible = await page.locator('.faq-item, .ant-empty').first().isVisible()
      expect(resultsVisible).toBe(true)
    }
  })

  test('應該支援標籤篩選', async ({ page }) => {
    // 找到標籤下拉選單
    const tagsSelect = page.locator('.tags-item .ant-select')

    // 點擊展開下拉選單
    await tagsSelect.click()

    // 等待下拉選單載入
    await page.waitForTimeout(500)

    // 如果有選項，選擇第一個
    const options = page.locator('.ant-select-dropdown .ant-select-item')
    if (await options.count() > 0) {
      await options.first().click()

      // 等待篩選結果
      await page.waitForTimeout(1000)

      // 驗證篩選功能觸發
      const resultsVisible = await page.locator('.faq-item, .ant-empty').first().isVisible()
      expect(resultsVisible).toBe(true)
    }
  })

  test('應該支援分頁功能', async ({ page }) => {
    // 等待數據載入
    await page.waitForTimeout(2000)

    // 檢查是否有分頁組件
    const pagination = page.locator('.ant-pagination')
    if (await pagination.isVisible()) {
      // 如果有分頁，檢查分頁功能
      const totalText = await pagination.locator('.ant-pagination-total-text').textContent()
      expect(totalText).toContain('共')

      // 檢查分頁按鈕
      const pageButtons = pagination.locator('.ant-pagination-item')
      if (await pageButtons.count() > 1) {
        // 點擊第二頁
        await pageButtons.nth(1).click()

        // 等待頁面切換
        await page.waitForTimeout(1000)

        // 驗證頁面已切換
        const currentPage = await pagination.locator('.ant-pagination-item-active').textContent()
        expect(currentPage).toBe('2')
      }
    }
  })

  test('應該能點擊 FAQ 項目查看詳情', async ({ page }) => {
    // 等待數據載入
    await page.waitForTimeout(2000)

    // 找到第一個 FAQ 項目
    const firstFAQ = page.locator('.faq-item').first()

    if (await firstFAQ.isVisible()) {
      // 點擊 FAQ 項目
      await firstFAQ.click()

      // 等待詳情載入
      await page.waitForTimeout(1000)

      // 驗證詳情區域有內容
      const detailArea = page.locator('.faq-preview')
      await expect(detailArea).toBeVisible()

      // 檢查是否有問題標題
      const questionTitle = detailArea.locator('h2')
      if (await questionTitle.isVisible()) {
        const questionText = await questionTitle.textContent()
        expect(questionText?.length).toBeGreaterThan(0)
      }

      // 檢查是否有回答內容
      const answerContent = detailArea.locator('.ql-editor')
      if (await answerContent.isVisible()) {
        const answerText = await answerContent.textContent()
        expect(answerText?.length).toBeGreaterThan(0)
      }
    }
  })

  test('應該顯示空狀態當沒有 FAQ 時', async ({ page }) => {
    // 等待數據載入
    await page.waitForTimeout(2000)

    // 檢查是否有空狀態
    const emptyState = page.locator('.ant-empty')
    if (await emptyState.isVisible()) {
      // 驗證空狀態訊息
      const emptyText = await emptyState.locator('.ant-empty-description').textContent()
      expect(emptyText).toContain('尚無 FAQ')
    }
  })

  test('應該支援列表收合功能', async ({ page }) => {
    // 找到收合按鈕
    const collapseButton = page.locator('.faq-list-col .ant-btn').first()

    if (await collapseButton.isVisible()) {
      // 點擊收合按鈕
      await collapseButton.click()

      // 等待動畫完成
      await page.waitForTimeout(500)

      // 檢查列表是否被隱藏或收合
      const listCol = page.locator('.faq-list-col')
      const isCollapsed = await listCol.evaluate(el => el.style.width === '0px' || el.classList.contains('collapsed'))

      // 驗證收合狀態
      expect(isCollapsed).toBe(true)
    }
  })

  test('應該能處理載入錯誤', async ({ page }) => {
    // 模擬網路錯誤（通過攔截請求）
    await page.route('**/api/v2/faq**', route => route.abort())

    // 重新載入頁面
    await page.reload()

    // 等待錯誤處理
    await page.waitForTimeout(2000)

    // 檢查是否有錯誤提示（可能顯示在頁面頂部或控制台）
    const errorAlert = page.locator('.ant-alert-error')
    const hasError = await errorAlert.isVisible() || await page.locator('text=載入失敗').isVisible()

    // 驗證錯誤處理存在
    expect(hasError).toBe(true)
  })
})

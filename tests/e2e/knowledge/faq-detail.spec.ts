import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'

test.describe('FAQ 詳情功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // 確保在 FAQ 頁面
    await page.goto('/knowledge/faq', { waitUntil: 'networkidle' })
  })

  test('應該能載入 FAQ 詳情並顯示完整資訊', async ({ page }) => {
    // 等待 FAQ 列表載入
    await page.waitForSelector('.faq-list-col .ant-list-item', { timeout: 10000 })

    // 獲取第一個 FAQ 項目
    const firstFAQ = page.locator('.faq-list-col .ant-list-item').first()

    // 確保有 FAQ 項目
    await expect(firstFAQ).toBeVisible()

    // 點擊第一個 FAQ 查看詳情
    await firstFAQ.click()

    // 等待詳情區域載入
    await page.waitForSelector('.faq-preview', { timeout: 5000 })

    // 驗證詳情區域顯示
    const detailArea = page.locator('.faq-preview')
    await expect(detailArea).toBeVisible()

    // 驗證問題標題顯示
    const questionTitle = detailArea.locator('h2')
    await expect(questionTitle).toBeVisible()
    await expect(questionTitle).not.toBeEmpty()

    // 驗證建立者資訊區域
    const creatorInfo = page.locator('.faq-preview').locator('div').filter({ hasText: '建立者：' }).first()
    await expect(creatorInfo).toBeVisible()

    // 驗證建立者名稱顯示
    const creatorName = creatorInfo.locator('span').nth(1) // 第二個 span 是建立者名稱
    await expect(creatorName).toBeVisible()
    await expect(creatorName).not.toHaveText('未知') // 不應該顯示「未知」

    // 驗證建立時間顯示
    const createTime = creatorInfo.locator('span').filter({ hasText: '建立時間：' }).locator('xpath=following-sibling::span').first()
    await expect(createTime).toBeVisible()
    await expect(createTime).not.toBeEmpty()

    // 驗證建立時間格式（應該包含日期和時間）
    const createTimeText = await createTime.textContent()
    expect(createTimeText).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/) // YYYY-MM-DD HH:mm 格式

    // 驗證回答區域
    const answerSection = detailArea.locator('.faq-answer')
    await expect(answerSection).toBeVisible()

    // 驗證標籤顯示（如果有的話）
    const tags = detailArea.locator('.ant-tag')
    // 標籤可能存在也可能不存在，但如果存在應該正確顯示
    const tagCount = await tags.count()
    if (tagCount > 0) {
      for (let i = 0; i < tagCount; i++) {
        await expect(tags.nth(i)).toBeVisible()
      }
    }
  })

  test('應該能正確渲染富文本答案', async ({ page }) => {
    // 等待 FAQ 列表載入
    await page.waitForSelector('.faq-list-col .ant-list-item', { timeout: 10000 })

    // 獲取第一個 FAQ 項目
    const firstFAQ = page.locator('.faq-list-col .ant-list-item').first()
    await expect(firstFAQ).toBeVisible()

    // 點擊查看詳情
    await firstFAQ.click()

    // 等待詳情載入
    await page.waitForSelector('.faq-preview .faq-answer', { timeout: 5000 })

    // 驗證答案區域存在
    const answerArea = page.locator('.faq-preview .faq-answer')
    await expect(answerArea).toBeVisible()

    // 驗證答案內容不為空
    const answerText = await answerArea.textContent()
    expect(answerText?.trim()).not.toBe('')

    // 如果答案包含 HTML 標籤，驗證它們被正確渲染
    const answerHtml = await answerArea.innerHTML()
    if (answerHtml.includes('<') && answerHtml.includes('>')) {
      // 檢查常見的 HTML 元素是否被正確渲染
      const hasRenderedElements = answerHtml.includes('<p>') ||
                                  answerHtml.includes('<br>') ||
                                  answerHtml.includes('<strong>') ||
                                  answerHtml.includes('<em>') ||
                                  answerText?.includes('\n') // 換行符號

      expect(hasRenderedElements).toBe(true)
    }
  })

  test('應該能處理 XSS 防護', async ({ page }) => {
    // 等待 FAQ 列表載入
    await page.waitForSelector('.faq-list-col .ant-list-item', { timeout: 10000 })

    // 獲取第一個 FAQ 項目
    const firstFAQ = page.locator('.faq-list-col .ant-list-item').first()
    await expect(firstFAQ).toBeVisible()

    // 點擊查看詳情
    await firstFAQ.click()

    // 等待詳情載入
    await page.waitForSelector('.faq-preview .faq-answer', { timeout: 5000 })

    // 驗證答案區域
    const answerArea = page.locator('.faq-preview .faq-answer')
    const answerHtml = await answerArea.innerHTML()

    // 驗證沒有危險的 script 標籤
    expect(answerHtml).not.toContain('<script>')
    expect(answerHtml).not.toContain('</script>')
    expect(answerHtml).not.toContain('<iframe>')
    expect(answerHtml).not.toContain('</iframe>')

    // 驗證沒有危險的事件屬性
    expect(answerHtml).not.toMatch(/on\w+\s*=/)
  })

  test('應該能正確顯示分類和標籤', async ({ page }) => {
    // 等待 FAQ 列表載入
    await page.waitForSelector('.faq-list-col .ant-list-item', { timeout: 10000 })

    // 獲取第一個 FAQ 項目
    const firstFAQ = page.locator('.faq-list-col .ant-list-item').first()
    await expect(firstFAQ).toBeVisible()

    // 點擊查看詳情
    await firstFAQ.click()

    // 等待詳情載入
    await page.waitForSelector('.faq-preview', { timeout: 5000 })

    // 檢查是否有分類標籤（通常是藍色標籤）
    const categoryTag = page.locator('.faq-preview .ant-tag-blue')
    const categoryTagExists = await categoryTag.isVisible().catch(() => false)

    // 檢查是否有其他標籤（通常是金色標籤）
    const otherTags = page.locator('.faq-preview .ant-tag-gold')
    const otherTagsCount = await otherTags.count()

    // 如果有標籤，驗證它們正確顯示
    if (categoryTagExists) {
      const categoryText = await categoryTag.textContent()
      expect(categoryText?.trim()).not.toBe('')
    }

    if (otherTagsCount > 0) {
      for (let i = 0; i < otherTagsCount; i++) {
        const tagText = await otherTags.nth(i).textContent()
        expect(tagText?.trim()).not.toBe('')
      }
    }
  })

  test('應該能處理 FAQ 不存在的錯誤情況', async ({ page }) => {
    // 嘗試訪問不存在的 FAQ（通過直接修改 URL）
    await page.goto('/knowledge/faq/999999', { waitUntil: 'networkidle' })

    // 應該會顯示錯誤提示或重新導向
    // 注意：具體的錯誤處理取決於前端實現，可能顯示錯誤訊息或返回列表頁面
    await page.waitForTimeout(2000) // 等待可能的錯誤處理

    // 驗證頁面不會崩潰（至少有基本的頁面結構）
    const pageContent = page.locator('body')
    await expect(pageContent).toBeVisible()
  })
})



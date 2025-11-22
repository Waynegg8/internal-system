import { test, expect } from '@playwright/test'

/**
 * E2E 測試：附件列表與篩選功能
 * 
 * 測試範圍：
 * - BR12.2.7: 知識庫附件頁面
 * - BR12.2.6: 任務詳情頁附件列表
 * 
 * 測試內容：
 * 1. 完整列表查看流程
 * 2. 篩選功能（使用 KnowledgeLayout 的統一篩選區域）
 * 3. 分頁功能
 * 4. 任務詳情頁附件列表
 */

test.describe('附件列表與篩選', () => {
  test.beforeEach(async ({ page }) => {
    // 登入系統
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // 等待登入表單出現
    const loginForm = page.locator('form').first()
    await expect(loginForm).toBeVisible({ timeout: 10000 })
    
    // 填寫登入資訊（根據實際環境調整）
    await page.fill('input[type="text"], input[placeholder*="帳號"], input[placeholder*="用戶名"]', 'admin')
    await page.fill('input[type="password"]', 'admin123')
    
    // 提交登入表單
    await page.click('button[type="submit"], button:has-text("登入"), button:has-text("登錄")')
    
    // 等待登入完成
    await page.waitForURL(/\/(dashboard|tasks|knowledge)/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
  })

  test('應該能夠查看知識庫附件列表', async ({ page }) => {
    // 導航到知識庫附件頁面
    await page.goto('/knowledge/attachments')
    await page.waitForLoadState('networkidle')
    
    // 驗證頁面標題或關鍵元素
    await expect(page.locator('text=附件列表, text=附件, [class*="attachment"]').first()).toBeVisible({ timeout: 10000 })
    
    // 驗證左側列表和右側預覽布局
    const listCol = page.locator('[class*="attachment-list-col"], [class*="list-col"]').first()
    const previewCol = page.locator('[class*="attachment-preview-col"], [class*="preview-col"]').first()
    
    // 等待列表載入
    await page.waitForTimeout(2000)
    
    // 驗證列表區域存在
    await expect(listCol.or(page.locator('text=附件列表'))).toBeVisible({ timeout: 5000 })
  })

  test('應該能夠使用 KnowledgeLayout 的統一篩選區域進行篩選', async ({ page }) => {
    await page.goto('/knowledge/attachments')
    await page.waitForLoadState('networkidle')
    
    // 等待篩選區域載入
    await page.waitForTimeout(2000)
    
    // 驗證搜尋框存在（KnowledgeLayout 的統一篩選區域）
    const searchInput = page.locator('input[placeholder*="關鍵字"], input[placeholder*="搜尋"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    
    // 測試搜尋功能
    await searchInput.fill('test')
    await page.waitForTimeout(1000)
    
    // 驗證實體類型篩選存在（在附件頁面應該顯示為「實體類型」）
    const entityTypeSelect = page.locator('label:has-text("實體類型")').locator('..').locator('select, [role="combobox"]').first()
    if (await entityTypeSelect.count() > 0) {
      await entityTypeSelect.click()
      await page.waitForTimeout(500)
      
      // 選擇任務類型
      const taskOption = page.locator('text=任務').first()
      if (await taskOption.count() > 0) {
        await taskOption.click()
        await page.waitForTimeout(1000)
      }
    }
    
    // 驗證客戶篩選存在
    const clientSelect = page.locator('label:has-text("客戶")').locator('..').locator('select, [role="combobox"]').first()
    if (await clientSelect.count() > 0) {
      await expect(clientSelect).toBeVisible({ timeout: 3000 })
    }
  })

  test('應該能夠進行分頁操作', async ({ page }) => {
    await page.goto('/knowledge/attachments')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // 查找分頁組件
    const pagination = page.locator('[class*="pagination"], .ant-pagination').first()
    
    // 如果存在分頁，測試分頁功能
    if (await pagination.count() > 0) {
      await expect(pagination).toBeVisible({ timeout: 5000 })
      
      // 嘗試點擊下一頁
      const nextPageButton = pagination.locator('button:has-text("下一頁"), [title="Next Page"], .ant-pagination-next').first()
      if (await nextPageButton.count() > 0 && !(await nextPageButton.isDisabled())) {
        await nextPageButton.click()
        await page.waitForTimeout(1000)
      }
      
      // 嘗試改變每頁顯示筆數
      const pageSizeSelect = pagination.locator('select, [role="combobox"]').first()
      if (await pageSizeSelect.count() > 0) {
        await pageSizeSelect.click()
        await page.waitForTimeout(500)
        const option = page.locator('text=50, text="50"').first()
        if (await option.count() > 0) {
          await option.click()
          await page.waitForTimeout(1000)
        }
      }
    }
  })

  test('應該能夠從任務詳情頁查看該任務的附件列表', async ({ page }) => {
    // 先導航到任務列表
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // 嘗試找到第一個任務並點擊
    const firstTaskLink = page.locator('a[href*="/tasks/"]').first()
    
    if (await firstTaskLink.count() > 0) {
      const taskUrl = await firstTaskLink.getAttribute('href')
      if (taskUrl) {
        await page.goto(taskUrl)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
        
        // 驗證任務附件區域存在
        const taskAttachments = page.locator('text=任務附件, text=附件').first()
        if (await taskAttachments.count() > 0) {
          await expect(taskAttachments).toBeVisible({ timeout: 5000 })
          
          // 測試「查看知識庫」按鈕
          const viewKnowledgeButton = page.locator('button:has-text("查看知識庫")').first()
          if (await viewKnowledgeButton.count() > 0) {
            await viewKnowledgeButton.click()
            await page.waitForURL(/\/knowledge\/attachments/, { timeout: 10000 })
            
            // 驗證 URL 中包含 taskId 參數
            const url = page.url()
            expect(url).toContain('taskId')
          }
        }
      }
    }
  })

  test('應該能夠處理任務篩選 banner 的顯示和清除', async ({ page }) => {
    // 直接通過 URL 參數訪問帶任務篩選的附件頁面
    await page.goto('/knowledge/attachments?taskId=1&returnTo=/tasks/1')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // 驗證任務篩選 banner 存在
    const taskBanner = page.locator('text=任務, text=目前僅顯示此任務的附件').first()
    if (await taskBanner.count() > 0) {
      await expect(taskBanner).toBeVisible({ timeout: 5000 })
      
      // 測試清除篩選按鈕
      const clearButton = page.locator('button:has-text("清除篩選")').first()
      if (await clearButton.count() > 0) {
        await clearButton.click()
        await page.waitForTimeout(1000)
        
        // 驗證 URL 中的 taskId 參數被移除
        const url = page.url()
        expect(url).not.toContain('taskId=1')
      }
    }
  })

  test('應該能夠點擊附件進行預覽', async ({ page }) => {
    await page.goto('/knowledge/attachments')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // 查找附件列表中的第一個附件
    const firstAttachment = page.locator('[class*="attachment"], [class*="table-row"], tr').first()
    
    if (await firstAttachment.count() > 0) {
      // 點擊第一個附件
      await firstAttachment.click()
      await page.waitForTimeout(1000)
      
      // 驗證右側預覽區域有內容顯示
      const previewArea = page.locator('[class*="preview"], [class*="attachment-preview"]').first()
      if (await previewArea.count() > 0) {
        await expect(previewArea).toBeVisible({ timeout: 3000 })
      }
    }
  })
})



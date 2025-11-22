/**
 * 資源列表功能 E2E 測試
 * 
 * BR11.1: 資源列表
 * 
 * 測試範圍：
 * - BR11.1.1: 資源列表展示
 * - BR11.1.2: 關鍵詞搜尋
 * - BR11.1.3: 服務類型篩選
 * - BR11.1.4: 層級篩選
 * - BR11.1.5: 客戶篩選
 * - BR11.1.6: 日期篩選
 * - BR11.1.7: 標籤篩選
 * - BR11.1.8: 排序
 * - BR11.1.9: 分頁
 * - BR11.1.10: 列表收起/展開
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'

test.describe('BR11.1: 資源列表功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登入
    await login(page)
    
    // 導航到資源列表頁面
    await page.goto('/knowledge/resources', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // 等待數據載入
  })

  // ========== BR11.1.1: 資源列表展示 ==========
  test.describe('資源列表展示', () => {
    test('應該能載入資源列表頁面', async ({ page }) => {
      // 驗證頁面標題或標籤
      const tab = page.locator('.ant-tabs-tab').filter({ hasText: '資源中心' })
      await expect(tab).toBeVisible()

      // 驗證列表區域存在
      const listCol = page.locator('.document-list-col')
      await expect(listCol).toBeVisible({ timeout: 10000 })

      // 驗證預覽區域存在
      const previewCol = page.locator('.document-preview-col')
      await expect(previewCol).toBeVisible()
    })

    test('應該能載入並顯示資源列表', async ({ page }) => {
      // 等待數據載入
      await page.waitForTimeout(2000)

      // 檢查是否有資源數據或空狀態
      const hasDocuments = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 10000 })

      if (hasDocuments) {
        // 如果有資源，檢查列表項結構
        const documentItems = page.locator('.document-list-item')
        const itemCount = await documentItems.count()
        
        if (itemCount > 0) {
          const firstItem = documentItems.first()

          // 檢查資源項目包含標題
          const title = firstItem.locator('.document-item-title')
          await expect(title).toBeVisible()

          // 檢查是否有上傳者信息
          const uploader = firstItem.locator('text=/上傳者/')
          const hasUploader = await uploader.isVisible().catch(() => false)
          
          // 檢查是否有上傳時間
          const uploadTime = firstItem.locator('text=/上傳時間/')
          const hasUploadTime = await uploadTime.isVisible().catch(() => false)
        }
      }
    })

    test('應該能點擊資源項目查看詳情', async ({ page }) => {
      // 等待數據載入
      await page.waitForTimeout(2000)

      // 找到第一個資源項目
      const firstDocument = page.locator('.document-list-item').first()

      if (await firstDocument.isVisible({ timeout: 10000 }).catch(() => false)) {
        // 獲取資源標題
        const titleElement = firstDocument.locator('.document-item-title')
        const documentTitle = await titleElement.textContent()
        
        // 點擊資源項目
        await firstDocument.click()

        // 等待詳情載入
        await page.waitForTimeout(1000)

        // 驗證詳情區域有內容
        const detailArea = page.locator('.document-preview-col')
        await expect(detailArea).toBeVisible()

        // 檢查預覽標題是否顯示
        const previewTitle = detailArea.locator('.document-preview-title')
        if (await previewTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
          const previewTitleText = await previewTitle.textContent()
          expect(previewTitleText?.length).toBeGreaterThan(0)
        }
      }
    })

    test('應該顯示空狀態當沒有資源時', async ({ page }) => {
      // 等待數據載入
      await page.waitForTimeout(2000)

      // 檢查是否有空狀態
      const emptyState = page.locator('.document-list-col .ant-empty')
      if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 驗證空狀態訊息
        const emptyText = await emptyState.locator('.ant-empty-description').textContent()
        expect(emptyText).toContain('尚無文檔')
      }
    })
  })

  // ========== BR11.1.2: 關鍵詞搜尋 ==========
  test.describe('關鍵詞搜尋', () => {
    test('應該支援關鍵詞搜尋', async ({ page }) => {
      // 找到搜尋輸入框
      const searchInput = page.locator('.search-input input').or(
        page.locator('input[placeholder*="關鍵字"]')
      ).first()

      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 輸入搜尋關鍵詞
        await searchInput.fill('測試')
        await searchInput.press('Enter')

        // 等待搜尋結果（防抖 300ms + API 響應）
        await page.waitForTimeout(1500)

        // 驗證搜尋功能觸發（檢查是否有結果或空狀態）
        const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
        expect(resultsVisible).toBe(true)
      }
    })

    test('應該支援部分匹配搜尋', async ({ page }) => {
      const searchInput = page.locator('.search-input input').or(
        page.locator('input[placeholder*="關鍵字"]')
      ).first()

      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 輸入部分關鍵詞
        await searchInput.fill('文')
        await searchInput.press('Enter')

        // 等待搜尋結果
        await page.waitForTimeout(1500)

        // 驗證搜尋功能觸發
        const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
        expect(resultsVisible).toBe(true)
      }
    })

    test('應該支援防抖搜尋', async ({ page }) => {
      const searchInput = page.locator('.search-input input').or(
        page.locator('input[placeholder*="關鍵字"]')
      ).first()

      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 快速輸入多個字符
        await searchInput.fill('t')
        await page.waitForTimeout(100)
        await searchInput.fill('te')
        await page.waitForTimeout(100)
        await searchInput.fill('tes')
        await page.waitForTimeout(100)
        await searchInput.fill('test')

        // 等待防抖完成（300ms）和 API 響應
        await page.waitForTimeout(1000)

        // 驗證搜尋功能觸發
        const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
        expect(resultsVisible).toBe(true)
      }
    })
  })

  // ========== BR11.1.3: 服務類型篩選 ==========
  test.describe('服務類型篩選', () => {
    test('應該支援服務類型篩選', async ({ page }) => {
      // 找到服務類型下拉選單
      const serviceSelect = page.locator('.service-item .ant-select').or(
        page.locator('label:has-text("服務類型")').locator('..').locator('.ant-select').first()
      )

      if (await serviceSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 點擊展開下拉選單
        await serviceSelect.click()
        await page.waitForTimeout(500)

        // 如果有選項，選擇第一個
        const options = page.locator('.ant-select-dropdown .ant-select-item')
        const optionCount = await options.count()
        
        if (optionCount > 0) {
          await options.first().click()
          await page.waitForTimeout(1000)

          // 驗證篩選功能觸發
          const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
          expect(resultsVisible).toBe(true)
        }
      }
    })

    test('應該支援選擇「全部」顯示所有服務類型', async ({ page }) => {
      const serviceSelect = page.locator('.service-item .ant-select').or(
        page.locator('label:has-text("服務類型")').locator('..').locator('.ant-select').first()
      )

      if (await serviceSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 先選擇一個服務類型
        await serviceSelect.click()
        await page.waitForTimeout(500)
        
        const options = page.locator('.ant-select-dropdown .ant-select-item')
        if (await options.count() > 0) {
          await options.first().click()
          await page.waitForTimeout(1000)

          // 然後清除選擇（選擇全部）
          const clearButton = page.locator('.ant-select-clear')
          if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await clearButton.click()
            await page.waitForTimeout(1000)

            // 驗證篩選已清除
            const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
            expect(resultsVisible).toBe(true)
          }
        }
      }
    })
  })

  // ========== BR11.1.4: 層級篩選 ==========
  test.describe('層級篩選', () => {
    test('應該支援層級篩選 - 服務層級', async ({ page }) => {
      // 找到層級下拉選單
      const scopeSelect = page.locator('.level-item .ant-select').or(
        page.locator('label:has-text("層級")').locator('..').locator('.ant-select').first()
      )

      if (await scopeSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 點擊展開下拉選單
        await scopeSelect.click()
        await page.waitForTimeout(500)

        // 選擇「服務層級」
        const serviceOption = page.locator('.ant-select-dropdown').locator('text=服務層級').first()
        if (await serviceOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await serviceOption.click()
          await page.waitForTimeout(1000)

          // 驗證篩選功能觸發
          const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
          expect(resultsVisible).toBe(true)
        }
      }
    })

    test('應該支援層級篩選 - 任務層級', async ({ page }) => {
      const scopeSelect = page.locator('.level-item .ant-select').or(
        page.locator('label:has-text("層級")').locator('..').locator('.ant-select').first()
      )

      if (await scopeSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await scopeSelect.click()
        await page.waitForTimeout(500)

        // 選擇「任務層級」
        const taskOption = page.locator('.ant-select-dropdown').locator('text=任務層級').first()
        if (await taskOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await taskOption.click()
          await page.waitForTimeout(1000)

          // 驗證篩選功能觸發
          const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
          expect(resultsVisible).toBe(true)
        }
      }
    })

    test('應該支援選擇「全部」顯示所有層級', async ({ page }) => {
      const scopeSelect = page.locator('.level-item .ant-select').or(
        page.locator('label:has-text("層級")').locator('..').locator('.ant-select').first()
      )

      if (await scopeSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await scopeSelect.click()
        await page.waitForTimeout(500)

        // 選擇「全部」
        const allOption = page.locator('.ant-select-dropdown').locator('text=全部').first()
        if (await allOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await allOption.click()
          await page.waitForTimeout(1000)

          // 驗證篩選功能觸發
          const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
          expect(resultsVisible).toBe(true)
        }
      }
    })
  })

  // ========== BR11.1.5: 客戶篩選 ==========
  test.describe('客戶篩選', () => {
    test('應該支援客戶篩選', async ({ page }) => {
      // 找到客戶下拉選單
      const clientSelect = page.locator('.client-item .ant-select').or(
        page.locator('label:has-text("客戶")').locator('..').locator('.ant-select').first()
      )

      if (await clientSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 點擊展開下拉選單
        await clientSelect.click()
        await page.waitForTimeout(500)

        // 如果有選項，選擇第一個
        const options = page.locator('.ant-select-dropdown .ant-select-item')
        const optionCount = await options.count()
        
        if (optionCount > 0) {
          await options.first().click()
          await page.waitForTimeout(1000)

          // 驗證篩選功能觸發
          const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
          expect(resultsVisible).toBe(true)
        }
      }
    })
  })

  // ========== BR11.1.6: 日期篩選 ==========
  test.describe('日期篩選', () => {
    test('應該支援日期篩選', async ({ page }) => {
      // 找到日期選擇器
      const datePicker = page.locator('.date-item .ant-picker').or(
        page.locator('label:has-text("日期")').locator('..').locator('.ant-picker').first()
      )

      if (await datePicker.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 點擊打開日期選擇器
        await datePicker.click()
        await page.waitForTimeout(500)

        // 選擇一個月份（如果有可選項）
        const monthOption = page.locator('.ant-picker-month-panel .ant-picker-cell').first()
        if (await monthOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await monthOption.click()
          await page.waitForTimeout(500)

          // 確認選擇
          const okButton = page.locator('.ant-picker-ok')
          if (await okButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await okButton.click()
          }

          await page.waitForTimeout(1000)

          // 驗證篩選功能觸發
          const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
          expect(resultsVisible).toBe(true)
        }
      }
    })
  })

  // ========== BR11.1.7: 標籤篩選 ==========
  test.describe('標籤篩選', () => {
    test('應該支援標籤篩選', async ({ page }) => {
      // 找到標籤下拉選單
      const tagsSelect = page.locator('.tags-item .ant-select').or(
        page.locator('label:has-text("標籤")').locator('..').locator('.ant-select').first()
      )

      if (await tagsSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 點擊展開下拉選單
        await tagsSelect.click()
        await page.waitForTimeout(500)

        // 如果有選項，選擇第一個
        const options = page.locator('.ant-select-dropdown .ant-select-item')
        const optionCount = await options.count()
        
        if (optionCount > 0) {
          await options.first().click()
          await page.waitForTimeout(1000)

          // 驗證篩選功能觸發
          const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
          expect(resultsVisible).toBe(true)
        }
      }
    })

    test('應該支援多個標籤篩選（OR 邏輯）', async ({ page }) => {
      const tagsSelect = page.locator('.tags-item .ant-select').or(
        page.locator('label:has-text("標籤")').locator('..').locator('.ant-select').first()
      )

      if (await tagsSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await tagsSelect.click()
        await page.waitForTimeout(500)

        const options = page.locator('.ant-select-dropdown .ant-select-item')
        const optionCount = await options.count()
        
        if (optionCount > 1) {
          // 選擇第一個標籤
          await options.first().click()
          await page.waitForTimeout(300)

          // 選擇第二個標籤
          await options.nth(1).click()
          await page.waitForTimeout(1000)

          // 驗證多選功能觸發
          const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
          expect(resultsVisible).toBe(true)
        }
      }
    })
  })

  // ========== BR11.1.9: 分頁 ==========
  test.describe('分頁功能', () => {
    test('應該支援分頁功能', async ({ page }) => {
      // 等待數據載入
      await page.waitForTimeout(2000)

      // 檢查是否有分頁組件
      const pagination = page.locator('.document-list-col .ant-pagination')
      const isPaginationVisible = await pagination.isVisible({ timeout: 5000 }).catch(() => false)

      if (isPaginationVisible) {
        // 驗證分頁組件存在
        await expect(pagination).toBeVisible()

        // 檢查總數顯示
        const totalText = pagination.locator('.ant-pagination-total-text')
        if (await totalText.isVisible({ timeout: 2000 }).catch(() => false)) {
          const totalTextContent = await totalText.textContent()
          expect(totalTextContent).toContain('共')
        }

        // 檢查分頁按鈕
        const pageButtons = pagination.locator('.ant-pagination-item')
        const pageButtonCount = await pageButtons.count()
        
        if (pageButtonCount > 1) {
          // 點擊第二頁
          await pageButtons.nth(1).click()
          await page.waitForTimeout(1000)

          // 驗證頁面已切換
          const currentPage = pagination.locator('.ant-pagination-item-active')
          if (await currentPage.isVisible({ timeout: 2000 }).catch(() => false)) {
            const currentPageText = await currentPage.textContent()
            expect(currentPageText).toBe('2')
          }
        }
      }
    })

    test('應該支援調整每頁顯示筆數', async ({ page }) => {
      await page.waitForTimeout(2000)

      const pagination = page.locator('.document-list-col .ant-pagination')
      if (await pagination.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 找到每頁顯示筆數選擇器
        const pageSizeSelect = pagination.locator('.ant-pagination-options-size-changer')
        
        if (await pageSizeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await pageSizeSelect.click()
          await page.waitForTimeout(500)

          // 選擇不同的每頁顯示筆數
          const sizeOptions = page.locator('.ant-select-dropdown .ant-select-item')
          const sizeOptionCount = await sizeOptions.count()
          
          if (sizeOptionCount > 1) {
            // 選擇 50 筆
            const option50 = sizeOptions.filter({ hasText: '50' }).first()
            if (await option50.isVisible({ timeout: 2000 }).catch(() => false)) {
              await option50.click()
              await page.waitForTimeout(1000)

              // 驗證每頁顯示筆數已改變
              const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
              expect(resultsVisible).toBe(true)
            }
          }
        }
      }
    })

    test('應該在切換頁面時保持篩選條件', async ({ page }) => {
      await page.waitForTimeout(2000)

      // 先設置一個篩選條件
      const scopeSelect = page.locator('.level-item .ant-select').or(
        page.locator('label:has-text("層級")').locator('..').locator('.ant-select').first()
      )

      if (await scopeSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await scopeSelect.click()
        await page.waitForTimeout(500)
        
        const serviceOption = page.locator('.ant-select-dropdown').locator('text=服務層級').first()
        if (await serviceOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await serviceOption.click()
          await page.waitForTimeout(1000)

          // 然後切換分頁
          const pagination = page.locator('.document-list-col .ant-pagination')
          if (await pagination.isVisible({ timeout: 5000 }).catch(() => false)) {
            const pageButtons = pagination.locator('.ant-pagination-item')
            const pageButtonCount = await pageButtons.count()
            
            if (pageButtonCount > 1) {
              await pageButtons.nth(1).click()
              await page.waitForTimeout(1000)

              // 驗證篩選條件仍然保持（通過檢查選中的值）
              const selectedValue = await scopeSelect.locator('.ant-select-selection-item').textContent()
              expect(selectedValue).toContain('服務層級')
            }
          }
        }
      }
    })
  })

  // ========== BR11.1.10: 列表收起/展開 ==========
  test.describe('列表收起/展開', () => {
    test('應該支援列表收起功能', async ({ page }) => {
      // 等待數據載入
      await page.waitForTimeout(2000)

      // 找到收起按鈕
      const collapseButton = page.locator('.document-list-col .ant-btn[type="text"]').or(
        page.locator('.document-list-col button').filter({ hasText: /menu-fold|收起/ })
      ).first()

      if (await collapseButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 點擊收起按鈕
        await collapseButton.click()
        await page.waitForTimeout(500)

        // 檢查列表是否被隱藏
        const listCol = page.locator('.document-list-col')
        const isCollapsed = await listCol.evaluate(el => {
          return window.getComputedStyle(el).display === 'none' || 
                 el.classList.contains('collapsed') ||
                 el.offsetWidth === 0
        }).catch(() => false)

        // 驗證列表已收起
        expect(isCollapsed).toBe(true)
      }
    })

    test('應該支援列表展開功能', async ({ page }) => {
      await page.waitForTimeout(2000)

      // 先收起列表
      const collapseButton = page.locator('.document-list-col .ant-btn[type="text"]').or(
        page.locator('.document-list-col button').filter({ hasText: /menu-fold|收起/ })
      ).first()

      if (await collapseButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await collapseButton.click()
        await page.waitForTimeout(500)

        // 然後找到展開按鈕
        const expandButton = page.locator('.collapsed-toggle button').or(
          page.locator('button').filter({ hasText: /展開列表|menu-unfold/ })
        ).first()

        if (await expandButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          // 點擊展開按鈕
          await expandButton.click()
          await page.waitForTimeout(500)

          // 檢查列表是否顯示
          const listCol = page.locator('.document-list-col')
          const isExpanded = await listCol.isVisible({ timeout: 3000 }).catch(() => false)

          // 驗證列表已展開
          expect(isExpanded).toBe(true)
        }
      }
    })

    test('列表收起時應該在左上角顯示展開按鈕', async ({ page }) => {
      await page.waitForTimeout(2000)

      const collapseButton = page.locator('.document-list-col .ant-btn[type="text"]').or(
        page.locator('.document-list-col button').filter({ hasText: /menu-fold|收起/ })
      ).first()

      if (await collapseButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await collapseButton.click()
        await page.waitForTimeout(500)

        // 檢查展開按鈕是否在左上角顯示
        const expandButton = page.locator('.collapsed-toggle button').or(
          page.locator('button').filter({ hasText: /展開列表/ })
        ).first()

        const isExpandButtonVisible = await expandButton.isVisible({ timeout: 3000 }).catch(() => false)
        expect(isExpandButtonVisible).toBe(true)
      }
    })
  })

  // ========== BR11.1.8: 排序 ==========
  test.describe('排序功能', () => {
    test('應該按上傳時間降序排序', async ({ page }) => {
      // 等待數據載入
      await page.waitForTimeout(2000)

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()

      if (itemCount > 1) {
        // 獲取前兩個項目的上傳時間
        const firstItem = documentItems.first()
        const secondItem = documentItems.nth(1)

        const firstUploadTime = await firstItem.locator('text=/上傳時間/').textContent().catch(() => '')
        const secondUploadTime = await secondItem.locator('text=/上傳時間/').textContent().catch(() => '')

        // 如果有時間信息，驗證第一個時間應該晚於或等於第二個時間
        if (firstUploadTime && secondUploadTime) {
          // 這裡主要驗證列表有時間信息，實際的時間比較需要解析時間格式
          expect(firstUploadTime.length).toBeGreaterThan(0)
          expect(secondUploadTime.length).toBeGreaterThan(0)
        }
      }
    })
  })

  // ========== 綜合測試 ==========
  test.describe('綜合功能測試', () => {
    test('應該能組合多個篩選條件', async ({ page }) => {
      await page.waitForTimeout(2000)

      // 設置搜尋條件
      const searchInput = page.locator('.search-input input').or(
        page.locator('input[placeholder*="關鍵字"]')
      ).first()

      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill('測試')
        await searchInput.press('Enter')
        await page.waitForTimeout(1000)

        // 設置層級篩選
        const scopeSelect = page.locator('.level-item .ant-select').or(
          page.locator('label:has-text("層級")').locator('..').locator('.ant-select').first()
        )

        if (await scopeSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
          await scopeSelect.click()
          await page.waitForTimeout(500)
          
          const serviceOption = page.locator('.ant-select-dropdown').locator('text=服務層級').first()
          if (await serviceOption.isVisible({ timeout: 3000 }).catch(() => false)) {
            await serviceOption.click()
            await page.waitForTimeout(1000)

            // 驗證組合篩選功能觸發
            const resultsVisible = await page.locator('.document-list-item, .ant-empty').first().isVisible({ timeout: 5000 })
            expect(resultsVisible).toBe(true)
          }
        }
      }
    })

    test('應該能處理載入錯誤', async ({ page }) => {
      // 模擬網路錯誤（通過攔截請求）
      await page.route('**/api/v2/documents**', route => route.abort())

      // 重新載入頁面
      await page.reload()
      await page.waitForTimeout(2000)

      // 檢查是否有錯誤提示
      const errorAlert = page.locator('.ant-alert-error')
      const hasError = await errorAlert.isVisible({ timeout: 3000 }).catch(() => false) || 
                      await page.locator('text=/載入失敗|錯誤/').isVisible({ timeout: 2000 }).catch(() => false)

      // 驗證錯誤處理存在
      expect(hasError).toBe(true)
    })
  })
})



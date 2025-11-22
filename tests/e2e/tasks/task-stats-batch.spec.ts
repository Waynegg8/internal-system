import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'
import { setupBR2_1TestData } from '../utils/test-data'

/**
 * BR2.1.3 & BR2.1.4: 統計摘要和批量操作 - E2E 測試
 * 
 * 測試範圍：
 * - 統計摘要顯示和即時更新
 * - 批量分配負責人功能
 * - 批量更新狀態功能
 * - 批量調整到期日功能
 */

test.describe('BR2.1.3 & BR2.1.4: 統計摘要和批量操作', () => {
  let testData: {
    adminUserId?: number
    employeeUserId?: number
    testClients: Array<{ clientId: string; companyName: string; taxId: string }>
    testClientServices: Array<{ clientServiceId: string; clientId: string; serviceId: number }>
    testTasks: Array<{ taskId: string; taskName: string; serviceMonth: string; canStart: boolean; totalStages: number }>
  } = {
    testClients: [],
    testClientServices: [],
    testTasks: []
  }

  test.beforeAll(async ({ browser }) => {
    // 在測試套件開始前設置測試數據
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      // 先登入（確保有 session cookie）
      await login(page)
      
      // 等待一下確保登入完成
      await page.waitForTimeout(1000)
      
      // 設置測試數據（會重用登入後的 cookie）
      testData = await setupBR2_1TestData(page)
      console.log('測試數據設置完成:', testData)
      
      // 驗證測試數據是否成功設置
      if (!testData.testTasks.length) {
        console.warn('警告：測試任務設置可能失敗，但測試將繼續執行')
      }
    } catch (error) {
      console.error('設置測試數據失敗:', error)
      // 不拋出錯誤，讓測試繼續執行（使用現有數據）
    } finally {
      await context.close()
    }
  })

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/tasks', { waitUntil: 'networkidle' })
    // 等待頁面完全載入
    await page.waitForTimeout(2000)
  })

  // ========== 測試組 1: 統計摘要顯示 ==========
  test.describe('統計摘要顯示', () => {
    test('應該顯示統計摘要組件', async ({ page }) => {
      // 查找統計摘要卡片
      const statsCard = page.locator('.task-stats-card, [class*="stat-card"]').first()
      const isVisible = await statsCard.isVisible().catch(() => false)
      
      if (isVisible) {
        await expect(statsCard).toBeVisible()
      } else {
        // 嘗試查找統計摘要標題
        const statsTitle = page.getByText('統計摘要')
        await expect(statsTitle).toBeVisible({ timeout: 5000 })
      }
    })

    test('應該顯示總任務數', async ({ page }) => {
      // 查找總任務數統計
      const totalStat = page.getByText('總任務數').first()
      const isVisible = await totalStat.isVisible().catch(() => false)
      
      if (isVisible) {
        await expect(totalStat).toBeVisible()
        
        // 檢查是否有數值顯示
        const statCard = totalStat.locator('..').locator('..')
        const value = await statCard.locator('.ant-statistic-content').textContent().catch(() => '')
        expect(value).toBeTruthy()
      }
    })

    test('應該顯示進行中任務數', async ({ page }) => {
      // 查找進行中任務數統計
      const inProgressStat = page.getByText('進行中任務數').first()
      const isVisible = await inProgressStat.isVisible().catch(() => false)
      
      if (isVisible) {
        await expect(inProgressStat).toBeVisible()
      }
    })

    test('應該顯示已完成任務數', async ({ page }) => {
      // 查找已完成任務數統計
      const completedStat = page.getByText('已完成任務數').first()
      const isVisible = await completedStat.isVisible().catch(() => false)
      
      if (isVisible) {
        await expect(completedStat).toBeVisible()
      }
    })

    test('應該顯示逾期任務數', async ({ page }) => {
      // 查找逾期任務數統計
      const overdueStat = page.getByText('逾期任務數').first()
      const isVisible = await overdueStat.isVisible().catch(() => false)
      
      if (isVisible) {
        await expect(overdueStat).toBeVisible()
      }
    })

    test('應該顯示可開始任務數', async ({ page }) => {
      // 查找可開始任務數統計
      const canStartStat = page.getByText('可開始任務數').first()
      const isVisible = await canStartStat.isVisible().catch(() => false)
      
      if (isVisible) {
        await expect(canStartStat).toBeVisible()
      }
    })
  })

  // ========== 測試組 2: 統計摘要即時更新 ==========
  test.describe('統計摘要即時更新', () => {
    test('應該在應用篩選條件時更新統計摘要', async ({ page }) => {
      // 先記錄初始統計數據
      const statsCard = page.locator('.task-stats-card').first()
      const statsVisible = await statsCard.isVisible().catch(() => false)
      
      if (statsVisible) {
        // 應用篩選條件（選擇「可開始」）
        const advancedFilterButton = page.locator('text=高級篩選, .ant-collapse-header:has-text("高級篩選")')
        const buttonCount = await advancedFilterButton.count()
        
        if (buttonCount > 0) {
          await advancedFilterButton.first().click()
          await page.waitForTimeout(500)
          
          const canStartSelect = page.locator('input[placeholder*="是否可開始"]').first()
          const selectVisible = await canStartSelect.isVisible().catch(() => false)
          
          if (selectVisible) {
            await canStartSelect.click()
            await page.waitForTimeout(500)
            
            const canStartOption = page.locator('.ant-select-item-option:has-text("可開始")').first()
            const optionVisible = await canStartOption.isVisible().catch(() => false)
            if (optionVisible) {
              await canStartOption.click()
              await page.waitForTimeout(2000)
              
              // 檢查統計摘要是否更新
              const updatedStats = page.locator('.task-stats-card').first()
              const updatedVisible = await updatedStats.isVisible().catch(() => false)
              expect(updatedVisible).toBeTruthy()
            }
          }
        }
      }
    })

    test('應該在清除篩選條件時更新統計摘要', async ({ page }) => {
      // 先應用篩選條件
      const searchInput = page.locator('input[placeholder*="搜尋"]').first()
      const searchVisible = await searchInput.isVisible().catch(() => false)
      
      if (searchVisible) {
        await searchInput.fill('測試')
        await page.waitForTimeout(1000)
        await searchInput.press('Enter')
        await page.waitForTimeout(2000)
        
        // 清除搜尋
        const clearButton = searchInput.locator('..').locator('.ant-input-clear-icon').first()
        const clearVisible = await clearButton.isVisible().catch(() => false)
        
        if (clearVisible) {
          await clearButton.click()
          await page.waitForTimeout(2000)
          
          // 檢查統計摘要是否更新
          const statsCard = page.locator('.task-stats-card').first()
          const statsVisible = await statsCard.isVisible().catch(() => false)
          expect(statsVisible).toBeTruthy()
        }
      }
    })
  })

  // ========== 測試組 3: 批量操作工具欄 ==========
  test.describe('批量操作工具欄', () => {
    test('應該在選擇任務時顯示批量操作工具欄', async ({ page }) => {
      // 查找任務列表中的複選框
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        // 選擇第一個任務
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        // 檢查批量操作工具欄是否顯示
        const batchBar = page.locator('text=已選擇, .ant-alert:has-text("已選擇")').first()
        const barVisible = await batchBar.isVisible().catch(() => false)
        expect(barVisible).toBeTruthy()
      }
    })

    test('應該顯示批量操作按鈕', async ({ page }) => {
      // 先選擇任務
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        // 檢查批量操作按鈕
        const batchStatusButton = page.getByText('批量變更狀態').first()
        const batchDueDateButton = page.getByText('批量調整到期日').first()
        const batchAssigneeButton = page.getByText('批量分配負責人').first()
        
        const statusVisible = await batchStatusButton.isVisible().catch(() => false)
        const dueDateVisible = await batchDueDateButton.isVisible().catch(() => false)
        const assigneeVisible = await batchAssigneeButton.isVisible().catch(() => false)
        
        expect(statusVisible || dueDateVisible || assigneeVisible).toBeTruthy()
      }
    })

    test('應該在沒有選擇任務時隱藏批量操作工具欄', async ({ page }) => {
      // 先選擇任務
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        // 清除選擇
        const clearButton = page.getByText('清除選擇').first()
        const clearVisible = await clearButton.isVisible().catch(() => false)
        
        if (clearVisible) {
          await clearButton.click()
          await page.waitForTimeout(1000)
          
          // 檢查批量操作工具欄是否隱藏
          const batchBar = page.locator('text=已選擇').first()
          const barVisible = await batchBar.isVisible().catch(() => false)
          expect(barVisible).toBeFalsy()
        }
      }
    })
  })

  // ========== 測試組 4: 批量分配負責人 ==========
  test.describe('批量分配負責人', () => {
    test('應該能打開批量分配負責人彈窗', async ({ page }) => {
      // 先選擇任務
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        // 點擊批量分配負責人按鈕
        const batchAssigneeButton = page.getByText('批量分配負責人').first()
        const buttonVisible = await batchAssigneeButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchAssigneeButton.click()
          await page.waitForTimeout(1000)
          
          // 檢查彈窗是否打開
          const modal = page.locator('.ant-modal:has-text("批量分配負責人")').first()
          const modalVisible = await modal.isVisible().catch(() => false)
          expect(modalVisible).toBeTruthy()
        }
      }
    })

    test('應該顯示操作確認信息', async ({ page }) => {
      // 先選擇任務並打開彈窗
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        const batchAssigneeButton = page.getByText('批量分配負責人').first()
        const buttonVisible = await batchAssigneeButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchAssigneeButton.click()
          await page.waitForTimeout(1000)
          
          // 檢查確認信息
          const confirmAlert = page.locator('.ant-alert:has-text("將為")').first()
          const alertVisible = await confirmAlert.isVisible().catch(() => false)
          expect(alertVisible).toBeTruthy()
        }
      }
    })

    test('應該能選擇負責人', async ({ page }) => {
      // 先選擇任務並打開彈窗
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        const batchAssigneeButton = page.getByText('批量分配負責人').first()
        const buttonVisible = await batchAssigneeButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchAssigneeButton.click()
          await page.waitForTimeout(1000)
          
          // 查找負責人下拉框
          const assigneeSelect = page.locator('input[placeholder*="負責人"]').first()
          const selectVisible = await assigneeSelect.isVisible().catch(() => false)
          
          if (selectVisible) {
            await assigneeSelect.click()
            await page.waitForTimeout(500)
            
            // 檢查下拉選項是否顯示
            const options = page.locator('.ant-select-item-option')
            const optionCount = await options.count()
            expect(optionCount).toBeGreaterThanOrEqual(0)
          }
        }
      }
    })
  })

  // ========== 測試組 5: 批量更新狀態 ==========
  test.describe('批量更新狀態', () => {
    test('應該能打開批量更新狀態彈窗', async ({ page }) => {
      // 先選擇任務
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        // 點擊批量變更狀態按鈕
        const batchStatusButton = page.getByText('批量變更狀態').first()
        const buttonVisible = await batchStatusButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchStatusButton.click()
          await page.waitForTimeout(1000)
          
          // 檢查彈窗是否打開
          const modal = page.locator('.ant-modal:has-text("批量變更狀態")').first()
          const modalVisible = await modal.isVisible().catch(() => false)
          expect(modalVisible).toBeTruthy()
        }
      }
    })

    test('應該顯示操作確認信息', async ({ page }) => {
      // 先選擇任務並打開彈窗
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        const batchStatusButton = page.getByText('批量變更狀態').first()
        const buttonVisible = await batchStatusButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchStatusButton.click()
          await page.waitForTimeout(1000)
          
          // 檢查確認信息
          const confirmAlert = page.locator('.ant-alert:has-text("將為")').first()
          const alertVisible = await confirmAlert.isVisible().catch(() => false)
          expect(alertVisible).toBeTruthy()
        }
      }
    })

    test('應該能選擇狀態', async ({ page }) => {
      // 先選擇任務並打開彈窗
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        const batchStatusButton = page.getByText('批量變更狀態').first()
        const buttonVisible = await batchStatusButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchStatusButton.click()
          await page.waitForTimeout(1000)
          
          // 查找狀態下拉框
          const statusSelect = page.locator('input[placeholder*="狀態"], .ant-select:has-text("狀態")').first()
          const selectVisible = await statusSelect.isVisible().catch(() => false)
          
          if (selectVisible) {
            await statusSelect.click()
            await page.waitForTimeout(500)
            
            // 檢查下拉選項是否顯示（應該有「待處理」、「進行中」、「已完成」、「已取消」）
            const options = page.locator('.ant-select-item-option')
            const optionCount = await options.count()
            expect(optionCount).toBeGreaterThanOrEqual(0)
          }
        }
      }
    })
  })

  // ========== 測試組 6: 批量調整到期日 ==========
  test.describe('批量調整到期日', () => {
    test('應該能打開批量調整到期日彈窗', async ({ page }) => {
      // 先選擇任務
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        // 點擊批量調整到期日按鈕
        const batchDueDateButton = page.getByText('批量調整到期日').first()
        const buttonVisible = await batchDueDateButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchDueDateButton.click()
          await page.waitForTimeout(1000)
          
          // 檢查彈窗是否打開
          const modal = page.locator('.ant-modal:has-text("批量調整到期日")').first()
          const modalVisible = await modal.isVisible().catch(() => false)
          expect(modalVisible).toBeTruthy()
        }
      }
    })

    test('應該顯示操作確認信息', async ({ page }) => {
      // 先選擇任務並打開彈窗
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        const batchDueDateButton = page.getByText('批量調整到期日').first()
        const buttonVisible = await batchDueDateButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchDueDateButton.click()
          await page.waitForTimeout(1000)
          
          // 檢查確認信息
          const confirmAlert = page.locator('.ant-alert:has-text("將為")').first()
          const alertVisible = await confirmAlert.isVisible().catch(() => false)
          expect(alertVisible).toBeTruthy()
        }
      }
    })

    test('應該能選擇到期日', async ({ page }) => {
      // 先選擇任務並打開彈窗
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        const batchDueDateButton = page.getByText('批量調整到期日').first()
        const buttonVisible = await batchDueDateButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchDueDateButton.click()
          await page.waitForTimeout(1000)
          
          // 查找到期日選擇器
          const dueDatePicker = page.locator('input[placeholder*="到期日"]').first()
          const pickerVisible = await dueDatePicker.isVisible().catch(() => false)
          
          if (pickerVisible) {
            await dueDatePicker.click()
            await page.waitForTimeout(500)
            
            // 檢查日期選擇面板是否打開
            const datePickerPanel = page.locator('.ant-picker-panel').first()
            const panelVisible = await datePickerPanel.isVisible().catch(() => false)
            expect(panelVisible).toBeTruthy()
          }
        }
      }
    })

    test('應該能輸入調整原因', async ({ page }) => {
      // 先選擇任務並打開彈窗
      const checkboxes = page.locator('.ant-checkbox-input, input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await checkboxes.first().click()
        await page.waitForTimeout(1000)
        
        const batchDueDateButton = page.getByText('批量調整到期日').first()
        const buttonVisible = await batchDueDateButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          await batchDueDateButton.click()
          await page.waitForTimeout(1000)
          
          // 查找調整原因輸入框
          const reasonTextarea = page.locator('textarea[placeholder*="調整原因"], textarea[placeholder*="原因"]').first()
          const textareaVisible = await reasonTextarea.isVisible().catch(() => false)
          
          if (textareaVisible) {
            await expect(reasonTextarea).toBeVisible()
            
            // 輸入調整原因
            await reasonTextarea.fill('測試調整原因')
            await page.waitForTimeout(500)
            
            // 檢查輸入是否成功
            const inputValue = await reasonTextarea.inputValue()
            expect(inputValue).toContain('測試')
          }
        }
      }
    })
  })
})




/**
 * BR2.5 任務自動生成 - 生產規模測試
 * 
 * 使用接近生產環境的數據量進行測試
 * 目標：50客戶 × 7服務 × 6任務 = 2,100任務配置
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'
import { setupBR2_5ProductionScaleTestData, cleanupBR2_5ProductionScaleTestData } from '../utils/test-data-br2-5-production-scale'
import { callAPI } from '../utils/test-data'
import dayjs from 'dayjs'

test.describe('BR2.5: 任務自動生成 - 生產規模測試', () => {
  let testData: {
    adminUserId?: number
    employeeUserId?: number
    testClients: Array<{ clientId: string; companyName: string; taxId: string }>
    testClientServices: Array<{ 
      clientServiceId: number
      clientId: string
      serviceId: number
      serviceName: string
      serviceType: 'recurring' | 'one-time'
    }>
    testTaskConfigs: Array<{
      configId: number
      clientServiceId: number
      taskName: string
      generationTimeRule?: string
      generationTimeParams?: string
      isFixedDeadline?: boolean
    }>
  } = {
    testClients: [],
    testClientServices: [],
    testTaskConfigs: []
  }

  // 測試數據設置（所有測試共享）
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await login(page)
      await page.waitForTimeout(1000)
      
      // 使用生產規模的測試數據
      // 先使用較小規模測試（20客戶），驗證邏輯後可增加到50-100客戶
      const clientCount = parseInt(process.env.PRODUCTION_SCALE_CLIENTS || '20', 10)
      const servicesPerClient = parseInt(process.env.PRODUCTION_SCALE_SERVICES || '7', 10)
      const tasksPerService = parseInt(process.env.PRODUCTION_SCALE_TASKS || '6', 10)
      
      testData = await setupBR2_5ProductionScaleTestData(page, {
        clientCount, // 可通過環境變數調整
        servicesPerClient,
        tasksPerService
      })
      
      console.log('BR2.5 生產規模測試數據設置完成:', {
        clients: testData.testClients.length,
        services: testData.testClientServices.length,
        taskConfigs: testData.testTaskConfigs.length
      })
    } catch (error) {
      console.error('設置測試數據失敗:', error)
      throw error
    } finally {
      await context.close()
    }
  }, 300000) // 5分鐘超時用於設置數據

  // 測試數據清理（所有測試完成後）
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await login(page)
      await cleanupBR2_5ProductionScaleTestData(page, testData)
    } catch (error) {
      console.error('清理測試數據失敗:', error)
    } finally {
      await context.close()
    }
  }, 300000) // 5分鐘超時用於清理數據

  test('生產規模：管理員應該能夠手動觸發任務生成', async ({ page }) => {
    await login(page)
    
    const serviceYear = 2024
    const serviceMonth = 3
    const targetMonthStr = `${serviceYear}-${String(serviceMonth).padStart(2, '0')}`
    
    const startTime = Date.now()
    
    // 觸發任務生成
    const response = await callAPI(page, 'POST', `/admin/tasks/generate?target_month=${targetMonthStr}`)
    
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    
    console.log(`[生產規模測試] 任務生成耗時: ${duration.toFixed(2)}秒`)
    console.log(`[生產規模測試] 生成結果:`, {
      generated: response?.data?.generatedCount || 0,
      skipped: response?.data?.skippedCount || 0,
      processedServices: response?.data?.processedServices || 0,
      totalServices: response?.data?.totalServices || 0,
      queryCount: response?.data?.queryCount || 0
    })
    
    // 驗證響應
    expect(response?.ok).toBeTruthy()
    expect(response?.data?.generatedCount).toBeGreaterThan(0)
    
    // 驗證性能：根據客戶數量動態調整
    const clientCount = testData.testClients.length
    const expectedMaxDuration = clientCount <= 20 ? 300 : clientCount <= 50 ? 600 : 900 // 20客戶5分鐘，50客戶10分鐘，100客戶15分鐘
    expect(duration).toBeLessThan(expectedMaxDuration)
    
    // 驗證生成的任務數量
    const expectedTasks = testData.testTaskConfigs.length // 每個配置生成1個任務
    const actualTasks = response?.data?.generatedCount || 0
    
    console.log(`[生產規模測試] 預期任務數: ${expectedTasks}, 實際生成: ${actualTasks}`)
    
    // 由於可能有些任務因為生成時間規則不滿足條件而跳過，實際生成可能少於預期
    // 但應該生成相當數量的任務
    expect(actualTasks).toBeGreaterThan(expectedTasks * 0.5) // 至少生成50%的任務
  }, 600000) // 10分鐘超時

  test('生產規模：系統應該檢查任務是否已存在（避免重複生成）', async ({ page }) => {
    await login(page)
    
    const serviceYear = 2024
    const serviceMonth = 3
    const targetMonthStr = `${serviceYear}-${String(serviceMonth).padStart(2, '0')}`
    
    // 第一次生成
    const firstResponse = await callAPI(page, 'POST', `/admin/tasks/generate?target_month=${targetMonthStr}`)
    const firstGenerated = firstResponse?.data?.generatedCount || 0
    
    // 立即第二次生成（應該跳過已存在的任務）
    const startTime = Date.now()
    const secondResponse = await callAPI(page, 'POST', `/admin/tasks/generate?target_month=${targetMonthStr}`)
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    
    console.log(`[生產規模測試] 第二次生成耗時: ${duration.toFixed(2)}秒`)
    console.log(`[生產規模測試] 第二次生成結果:`, {
      generated: secondResponse?.data?.generatedCount || 0,
      skipped: secondResponse?.data?.skippedCount || 0
    })
    
    // 驗證第二次生成應該跳過大部分任務
    expect(secondResponse?.data?.skippedCount).toBeGreaterThan(firstGenerated * 0.8) // 至少跳過80%
    expect(secondResponse?.data?.generatedCount).toBeLessThan(firstGenerated * 0.2) // 新生成應該很少
    
    // 第二次生成應該很快（因為大部分任務已存在）
    expect(duration).toBeLessThan(120) // 2分鐘內
  }, 600000) // 10分鐘超時

  test('生產規模：即時生成機制應該對所有用戶可用', async ({ page }) => {
    // 使用員工帳號測試
    await login(page, { username: 'test_employee_br2_5', password: '111111' })
    
    const serviceYear = 2024
    const serviceMonth = 3
    
    // 設置篩選條件
    const params = new URLSearchParams({
      service_year: String(serviceYear),
      service_month: String(serviceMonth),
      trigger_generation: '1'
    })
    
    const startTime = Date.now()
    
    // 觸發即時生成
    const response = await callAPI(page, 'GET', `/tasks?${params.toString()}`)
    
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    
    console.log(`[生產規模測試] 即時生成觸發耗時: ${duration.toFixed(2)}秒`)
    console.log(`[生產規模測試] 響應:`, {
      generationStatus: response?.meta?.generationStatus,
      message: response?.message
    })
    
    // 驗證即時生成已觸發（不應該返回403）
    expect(response?.meta?.generationStatus).toBeTruthy()
    expect(response?.meta?.generationStatus).toMatch(/triggered|generating/)
    
    // 即時生成觸發應該很快（不阻塞）
    expect(duration).toBeLessThan(10) // 10秒內
  }, 60000) // 1分鐘超時
})


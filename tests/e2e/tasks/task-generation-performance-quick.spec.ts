/**
 * 快速性能測試 - 直接測試現有數據的任務生成
 * 不創建測試數據，直接使用現有數據測試
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'
import { callAPI } from '../utils/test-data'

test.describe('任務生成性能快速測試', () => {
  test('測試現有數據的任務生成性能', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(1000)
    
    // 使用當前月份或過去月份（確保生成時間已到）
    const now = new Date()
    const targetYear = now.getFullYear()
    const targetMonth = now.getMonth() + 1 // 當前月份，確保生成時間已到
    const targetMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
    
    console.log(`[性能測試] 開始測試 ${targetMonthStr} 的任務生成`)
    
    const startTime = Date.now()
    
    // 觸發任務生成
    const response = await callAPI(page, 'POST', `/admin/tasks/generate?target_month=${targetMonthStr}`, undefined, 120000)
    
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    
    console.log(`[性能測試] 任務生成完成，耗時: ${duration.toFixed(2)}秒`)
    const skipReasons = response?.data?.skipReasons;
    const clientsProcessed = response?.data?.clientsProcessed;
    const clientsWithTasks = response?.data?.clientsWithTasks;
    
    console.log(`[性能測試] 生成結果:`, {
      generated: response?.data?.generatedCount || 0,
      skipped: response?.data?.skippedCount || 0,
      processedServices: response?.data?.processedServices || 0,
      totalServices: response?.data?.totalServices || 0,
      queryCount: response?.data?.queryCount || 0,
      skipReasons: skipReasons,
      clientsProcessed: clientsProcessed,
      clientsWithTasks: clientsWithTasks
    })
    
    if (skipReasons) {
      console.log(`[性能測試] 跳過原因統計:`, JSON.stringify(skipReasons, null, 2));
    }
    
    if (clientsProcessed !== undefined) {
      console.log(`[性能測試] 處理了 ${clientsProcessed} 個客戶，其中 ${clientsWithTasks} 個有任務生成`);
    }
    
    expect(response?.ok).toBeTruthy()
    expect(response?.data).toBeDefined()
    
    const actualGenerated = response?.data?.generatedCount || 0
    if (actualGenerated > 0) {
      const timePerTask = duration / actualGenerated
      console.log(`[性能測試] 實際生成 ${actualGenerated} 個任務，每個任務平均 ${timePerTask.toFixed(3)} 秒`)
      console.log(`[性能測試] 推斷4,875個任務需要: ${(4875 * timePerTask / 60).toFixed(1)} 分鐘`)
    }
  })
})


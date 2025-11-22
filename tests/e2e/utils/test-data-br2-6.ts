/**
 * BR2.6 任務通知測試數據設置工具
 */

import type { Page } from '@playwright/test'
import { callAPI } from './test-data'

/**
 * 創建測試通知（直接插入 DashboardAlerts）
 * 注意：這需要後端支持直接插入，或者我們需要通過其他方式創建
 * 為了測試，我們可以創建一個測試任務，然後手動觸發通知邏輯
 */
export async function createTestNotification(page: Page, notificationData: {
  userId: number
  alertType: 'overdue' | 'upcoming' | 'delay' | 'conflict'
  title: string
  description?: string
  link?: string
  payload?: any
  isRead?: boolean
}): Promise<number | null> {
  try {
    // 由於沒有直接的創建通知 API，我們需要通過其他方式
    // 這裡我們創建一個測試任務，然後手動插入通知記錄
    // 或者，我們可以創建一個測試專用的 API 端點
    
    // 暫時返回 null，實際實現需要根據後端 API 調整
    // 在實際測試中，我們可能需要：
    // 1. 創建測試任務
    // 2. 設置任務為逾期/即將到期狀態
    // 3. 觸發通知檢查邏輯
    // 或者直接通過 SQL 插入（如果測試環境支持）
    
    console.warn('createTestNotification: 需要實現通知創建邏輯')
    return null
  } catch (error) {
    console.error('創建測試通知失敗:', error)
    return null
  }
}

/**
 * 設置 BR2.6 測試所需的測試數據
 * 包括：測試客戶、測試任務、測試通知
 */
export async function setupBR2_6TestData(page: Page): Promise<{
  adminUserId?: number
  employeeUserId?: number
  testClients: Array<{ clientId: string; companyName: string }>
  testTasks: Array<{ taskId: string; taskName: string }>
  testNotifications: Array<{ notificationId: number; alertType: string }>
}> {
  const result: {
    adminUserId?: number
    employeeUserId?: number
    testClients: Array<{ clientId: string; companyName: string }>
    testTasks: Array<{ taskId: string; taskName: string }>
    testNotifications: Array<{ notificationId: number; alertType: string }>
  } = {
    testClients: [],
    testTasks: [],
    testNotifications: []
  }

  try {
    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (usersResponse?.ok && usersResponse?.data?.length > 0) {
      const adminUser = usersResponse.data.find((u: any) => u.is_admin === 1 || u.isAdmin === true)
      if (adminUser) {
        result.adminUserId = adminUser.user_id || adminUser.id
      }
      // 獲取第一個非管理員用戶作為員工
      const employeeUser = usersResponse.data.find((u: any) => !u.is_admin && !u.isAdmin)
      if (employeeUser) {
        result.employeeUserId = employeeUser.user_id || employeeUser.id
      }
    }

    // 2. 創建測試客戶
    const testClientId = await callAPI(page, 'POST', '/clients', {
      companyName: `BR2.6測試客戶_${Date.now()}`,
      tax_registration_number: `00${String(Date.now()).slice(-8)}`,
      assigneeUserId: result.adminUserId
    }).then((response: any) => {
      if (response?.ok) {
        return response.data?.clientId || response.data?.client_id
      }
      return null
    }).catch(() => null)

    if (testClientId) {
      result.testClients.push({
        clientId: testClientId,
        companyName: `BR2.6測試客戶_${Date.now()}`
      })
    }

    // 3. 創建測試任務（用於生成通知）
    // 注意：這裡需要根據實際的任務創建 API 來實現
    // 為了測試通知功能，我們需要創建逾期或即將到期的任務

    // 4. 創建測試通知
    // 由於沒有直接的創建通知 API，我們需要通過其他方式
    // 在實際測試中，我們可以：
    // - 創建測試任務並設置為逾期狀態
    // - 手動觸發通知檢查邏輯
    // - 或者直接通過 SQL 插入（如果測試環境支持）

    return result
  } catch (error) {
    console.error('設置 BR2.6 測試數據失敗:', error)
    throw new Error(`設置 BR2.6 測試數據失敗: ${String(error)}`)
  }
}

/**
 * 清理 BR2.6 測試數據
 */
export async function cleanupBR2_6TestData(page: Page, testData: {
  testClients?: Array<{ clientId: string }>
  testTasks?: Array<{ taskId: string }>
  testNotifications?: Array<{ notificationId: number }>
}): Promise<void> {
  try {
    // 1. 刪除測試通知（通過 API 標記為已讀或刪除）
    if (testData.testNotifications && testData.testNotifications.length > 0) {
      // 注意：通知可能沒有刪除 API，只能標記為已讀
      // 或者我們需要在測試後清理數據庫
    }

    // 2. 刪除測試任務
    if (testData.testTasks && testData.testTasks.length > 0) {
      for (const task of testData.testTasks) {
        try {
          await callAPI(page, 'DELETE', `/tasks/${task.taskId}`)
        } catch (err) {
          console.warn(`刪除測試任務 ${task.taskId} 失敗:`, err)
        }
      }
    }

    // 3. 刪除測試客戶
    if (testData.testClients && testData.testClients.length > 0) {
      for (const client of testData.testClients) {
        try {
          await callAPI(page, 'DELETE', `/clients/${client.clientId}`)
        } catch (err) {
          console.warn(`刪除測試客戶 ${client.clientId} 失敗:`, err)
        }
      }
    }

    console.log('BR2.6 測試數據清理完成')
  } catch (error) {
    console.error('清理 BR2.6 測試數據失敗:', error)
  }
}




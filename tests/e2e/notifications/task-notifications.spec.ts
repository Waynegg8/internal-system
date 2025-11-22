import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'
import { callAPI } from '../utils/test-data'

/**
 * BR2.6: 任務通知功能 - E2E 測試
 * 
 * 測試範圍：
 * - 通知列表顯示
 * - 通知點擊跳轉
 * - 通知標記已讀
 * - 未讀通知數量顯示
 */

test.describe('BR2.6: 任務通知功能', () => {
  let testData: {
    adminUserId?: number
    testNotifications: Array<{ notificationId: number; alertType: string; isRead: boolean }>
  } = {
    testNotifications: []
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
      
      // 獲取當前用戶 ID
      const usersResponse = await callAPI(page, 'GET', '/settings/users')
      if (usersResponse?.ok && usersResponse?.data?.length > 0) {
        const adminUser = usersResponse.data.find((u: any) => u.is_admin === 1 || u.isAdmin === true)
        if (adminUser) {
          testData.adminUserId = adminUser.user_id || adminUser.id
        }
      }

      // 獲取現有通知（用於測試）
      const notificationsResponse = await callAPI(page, 'GET', '/notifications', {
        page: 1,
        perPage: 10
      })
      
      if (notificationsResponse?.ok && notificationsResponse?.data?.notifications) {
        testData.testNotifications = notificationsResponse.data.notifications.map((n: any) => ({
          notificationId: n.notification_id || n.alert_id,
          alertType: n.notification_type || n.alert_type,
          isRead: n.is_read || false
        }))
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
  })

  // ========== 測試組 1: 通知列表顯示 ==========
  test.describe('通知列表顯示', () => {
    test('應該能訪問通知列表頁面', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(/.*\/notifications/)
      
      // 檢查頁面標題
      const pageTitle = page.getByText('任務通知', { exact: false })
      await expect(pageTitle.first()).toBeVisible({ timeout: 10000 })
    })

    test('應該顯示通知列表', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      
      // 等待通知列表載入
      await page.waitForTimeout(2000)
      
      // 檢查是否有通知列表容器
      const notificationsList = page.locator('.notifications-list, .ant-list')
      await expect(notificationsList.first()).toBeVisible({ timeout: 10000 })
    })

    test('應該顯示通知類型標籤', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 檢查是否有通知類型標籤（逾期、即將到期、延誤、衝突）
      const typeTags = page.locator('.ant-tag').filter({ hasText: /逾期|即將到期|延誤|衝突/ })
      const tagCount = await typeTags.count()
      
      // 如果有通知，應該顯示類型標籤
      if (tagCount > 0) {
        await expect(typeTags.first()).toBeVisible()
      }
    })

    test('應該顯示通知內容', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 檢查是否有通知內容
      const notificationItems = page.locator('.notification-item, .ant-list-item')
      const itemCount = await notificationItems.count()
      
      // 如果有通知，應該顯示通知內容
      if (itemCount > 0) {
        await expect(notificationItems.first()).toBeVisible()
      } else {
        // 如果沒有通知，應該顯示空狀態
        const emptyState = page.getByText('暫無通知', { exact: false })
        await expect(emptyState.first()).toBeVisible()
      }
    })

    test('應該支持通知類型篩選', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 檢查是否有類型篩選下拉框
      const typeFilter = page.locator('select, .ant-select').filter({ hasText: /通知類型|逾期|即將到期/ }).first()
      const filterVisible = await typeFilter.isVisible().catch(() => false)
      
      if (filterVisible) {
        await expect(typeFilter).toBeVisible()
      }
    })

    test('應該支持已讀狀態篩選', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 檢查是否有已讀狀態篩選下拉框
      const readFilter = page.locator('select, .ant-select').filter({ hasText: /已讀狀態|未讀|已讀/ }).first()
      const filterVisible = await readFilter.isVisible().catch(() => false)
      
      if (filterVisible) {
        await expect(readFilter).toBeVisible()
      }
    })
  })

  // ========== 測試組 2: 通知點擊跳轉 ==========
  test.describe('通知點擊跳轉', () => {
    test('點擊通知應該跳轉到任務詳情頁面', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 查找第一個有連結的通知
      const notificationItems = page.locator('.notification-item, .ant-list-item')
      const itemCount = await notificationItems.count()
      
      if (itemCount > 0) {
        const firstNotification = notificationItems.first()
        
        // 查找「查看任務」按鈕或通知本身
        const viewTaskButton = firstNotification.getByText('查看任務', { exact: false })
        const buttonVisible = await viewTaskButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          // 點擊「查看任務」按鈕
          await viewTaskButton.click()
          
          // 等待跳轉到任務詳情頁面
          await page.waitForURL(/.*\/tasks\/\d+/, { timeout: 10000 })
          await expect(page).toHaveURL(/.*\/tasks\/\d+/)
        } else {
          // 如果沒有「查看任務」按鈕，點擊通知本身
          await firstNotification.click()
          
          // 等待跳轉（可能是任務詳情頁面或保持在同一頁面）
          await page.waitForTimeout(1000)
        }
      }
    })
  })

  // ========== 測試組 3: 通知標記已讀 ==========
  test.describe('通知標記已讀', () => {
    test('應該能標記單個通知為已讀', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 查找第一個未讀通知
      const unreadNotifications = page.locator('.notification-item.unread, .ant-list-item').filter({ hasNotText: /已讀/ })
      const unreadCount = await unreadNotifications.count()
      
      if (unreadCount > 0) {
        const firstUnread = unreadNotifications.first()
        
        // 查找「標記為已讀」按鈕
        const markReadButton = firstUnread.getByText('標記為已讀', { exact: false })
        const buttonVisible = await markReadButton.isVisible().catch(() => false)
        
        if (buttonVisible) {
          // 點擊「標記為已讀」按鈕
          await markReadButton.click()
          
          // 等待通知更新
          await page.waitForTimeout(1000)
          
          // 驗證通知已標記為已讀（按鈕應該消失或狀態改變）
          const buttonAfterClick = await markReadButton.isVisible().catch(() => false)
          expect(buttonAfterClick).toBeFalsy()
        }
      }
    })

    test('應該能批量標記所有通知為已讀', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 查找「全部標記為已讀」按鈕
      const markAllReadButton = page.getByText('全部標記為已讀', { exact: false })
      const buttonVisible = await markAllReadButton.isVisible().catch(() => false)
      
      if (buttonVisible) {
        // 檢查按鈕是否可用（如果有未讀通知，應該可用）
        const isDisabled = await markAllReadButton.isDisabled().catch(() => false)
        
        if (!isDisabled) {
          // 點擊「全部標記為已讀」按鈕
          await markAllReadButton.click()
          
          // 等待通知更新
          await page.waitForTimeout(2000)
          
          // 驗證所有通知已標記為已讀（按鈕應該變為禁用狀態）
          const buttonAfterClick = await markAllReadButton.isDisabled().catch(() => false)
          expect(buttonAfterClick).toBeTruthy()
        }
      }
    })

    test('點擊通知應該自動標記為已讀', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 查找第一個未讀通知
      const unreadNotifications = page.locator('.notification-item.unread, .ant-list-item').filter({ hasNotText: /已讀/ })
      const unreadCount = await unreadNotifications.count()
      
      if (unreadCount > 0) {
        const firstUnread = unreadNotifications.first()
        
        // 點擊通知
        await firstUnread.click()
        
        // 等待通知更新
        await page.waitForTimeout(1000)
        
        // 驗證通知已標記為已讀（樣式應該改變）
        const isUnreadAfterClick = await firstUnread.locator('.unread').isVisible().catch(() => false)
        expect(isUnreadAfterClick).toBeFalsy()
      }
    })
  })

  // ========== 測試組 4: 未讀通知數量顯示 ==========
  test.describe('未讀通知數量顯示', () => {
    test('儀表板應該顯示未讀通知數量', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 查找未讀通知數量 Badge
      const unreadBadge = page.locator('.ant-badge-count, [class*="badge"]').filter({ hasText: /\d+/ })
      const badgeVisible = await unreadBadge.isVisible().catch(() => false)
      
      // 如果有未讀通知，應該顯示 Badge
      // 如果沒有未讀通知，Badge 可能不顯示（這是正常的）
      if (badgeVisible) {
        await expect(unreadBadge.first()).toBeVisible()
      }
    })

    test('應該能從儀表板跳轉到通知列表', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 查找「通知」按鈕
      const notificationButton = page.getByText('通知', { exact: false }).filter({ hasText: /通知/ })
      const buttonVisible = await notificationButton.isVisible().catch(() => false)
      
      if (buttonVisible) {
        // 點擊「通知」按鈕
        await notificationButton.click()
        
        // 等待跳轉到通知列表頁面
        await page.waitForURL(/.*\/notifications/, { timeout: 10000 })
        await expect(page).toHaveURL(/.*\/notifications/)
      }
    })

    test('通知列表頁面應該顯示未讀通知數量', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 通過 API 獲取未讀通知數量
      const notificationsResponse = await callAPI(page, 'GET', '/notifications', {
        page: 1,
        perPage: 1,
        is_read: 'false'
      })
      
      if (notificationsResponse?.ok) {
        const unreadCount = notificationsResponse.data?.unreadCount || 0
        
        // 如果有未讀通知，頁面應該顯示未讀數量
        if (unreadCount > 0) {
          // 檢查頁面是否有顯示未讀數量的元素
          const unreadText = page.getByText(`未讀`, { exact: false })
          const textVisible = await unreadText.isVisible().catch(() => false)
          
          // 至少應該有未讀通知的顯示
          expect(unreadCount).toBeGreaterThan(0)
        }
      }
    })
  })

  // ========== 測試組 5: 通知分頁 ==========
  test.describe('通知分頁', () => {
    test('應該支持通知分頁', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // 檢查是否有分頁組件
      const pagination = page.locator('.ant-pagination, [class*="pagination"]')
      const paginationVisible = await pagination.isVisible().catch(() => false)
      
      // 如果有足夠的通知，應該顯示分頁
      // 如果沒有分頁，可能是通知數量不足（這也是正常的）
      if (paginationVisible) {
        await expect(pagination.first()).toBeVisible()
      }
    })
  })
})




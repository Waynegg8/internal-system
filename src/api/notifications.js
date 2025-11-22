import request from './request'
import { extractApiData, extractApiObject, extractApiArray } from '@/utils/apiHelpers'

/**
 * 通知相關 API
 */
export function useNotificationsApi() {
  /**
   * 獲取通知列表
   * @param {Object} params - 查詢參數
   * @param {number} params.page - 頁碼
   * @param {number} params.perPage - 每頁數量
   * @param {string} params.alert_type - 通知類型篩選（overdue, upcoming, delay, conflict）
   * @param {boolean|string} params.is_read - 已讀狀態篩選（true, false）
   */
  const fetchNotifications = async (params = {}) => {
    const response = await request.get('/notifications', { params })
    return extractApiData(response)
  }

  /**
   * 獲取未讀通知數量
   * 通過請求通知列表（最小分頁）來獲取未讀數量
   * 後端 API 會在響應中返回 unreadCount 字段
   */
  const fetchUnreadCount = async () => {
    try {
      const response = await request.get('/notifications', { params: { perPage: 1, is_read: 'false' } })
      const data = extractApiData(response)
      return data?.unreadCount || 0
    } catch (error) {
      console.error('[NotificationsApi] 獲取未讀通知數量失敗:', error)
      return 0
    }
  }

  /**
   * 標記通知為已讀（單個或批量）
   * @param {number|Array<number>} notificationIds - 通知 ID 或 ID 數組
   */
  const markAsRead = async (notificationIds) => {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds]
    const response = await request.put('/notifications/read', {
      notification_ids: ids
    })
    return extractApiData(response)
  }

  /**
   * 標記單個通知為已讀（通過路由參數）
   * @param {number} notificationId - 通知 ID
   */
  const markAsReadById = async (notificationId) => {
    const response = await request.put(`/notifications/${notificationId}/read`)
    return extractApiData(response)
  }

  return {
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAsReadById
  }
}


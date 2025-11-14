import request from './request'

/**
 * 請假相關 API
 */

/**
 * 獲取假期餘額
 * @param {number} year - 年份
 * @param {number|null} userId - 用戶ID（可選，管理員使用）
 * @returns {Promise<Array<{ type, year, total, used, remain }>>}
 */
export async function fetchLeaveBalances(year, userId = null) {
  const params = { year }
  if (userId) {
    params.user_id = userId
  }
  const response = await request.get('/leaves/balances', { params })
  // 處理響應格式：支持 { ok: true, data: [...] } 格式
  if (response && response.ok && response.data) {
    return response.data
  }
  return response.data || response || []
}

/**
 * 獲取假期記錄列表
 * @param {Object} params - 查詢參數
 * @param {number} params.page - 頁碼
 * @param {number} params.perPage - 每頁數量
 * @param {string} params.type - 假別類型
 * @param {number} params.user_id - 用戶ID
 * @param {number} params.year - 年份
 * @param {number} params.month - 月份
 * @returns {Promise<{ items: Array<Leave>, total: number }>}
 */
export async function fetchLeaves(params = {}) {
  const response = await request.get('/leaves', { params })
  // 處理響應格式：支持 { ok: true, data: [...] } 格式
  if (response && response.ok) {
    return {
      items: response.data || [],
      total: response.total || (response.data ? response.data.length : 0)
    }
  }
  // 如果返回的是數組，直接包裝
  if (Array.isArray(response.data)) {
    return {
      items: response.data,
      total: response.data.length
    }
  }
  return {
    items: [],
    total: 0
  }
}

/**
 * 創建假期申請
 * @param {Object} payload - 假期申請數據
 * @param {string} payload.leave_type - 假別類型
 * @param {string} payload.start_date - 開始日期（YYYY-MM-DD）
 * @param {string} payload.start_time - 開始時間（HH:mm）
 * @param {string} payload.end_time - 結束時間（HH:mm）
 * @param {number} payload.amount - 時數
 * @param {string} [payload.notes] - 備註（可選）
 * @returns {Promise<Leave>}
 */
export async function createLeave(payload) {
  const response = await request.post('/leaves', payload)
  // 處理響應格式
  if (response && response.ok && response.data) {
    return response.data
  }
  return response.data || response
}

/**
 * 更新假期申請
 * @param {number} leaveId - 假期ID
 * @param {Object} payload - 假期申請數據（同 createLeave）
 * @returns {Promise<Leave>}
 */
export async function updateLeave(leaveId, payload) {
  const response = await request.put(`/leaves/${leaveId}`, payload)
  // 處理響應格式
  if (response && response.ok && response.data) {
    return response.data
  }
  return response.data || response
}

/**
 * 刪除假期申請
 * @param {number} leaveId - 假期ID
 * @returns {Promise<void>}
 */
export async function deleteLeave(leaveId) {
  await request.delete(`/leaves/${leaveId}`)
}

/**
 * 獲取生活事件列表
 * @param {number|null} userId - 用戶ID（可選，管理員使用）
 * @returns {Promise<Array<LifeEvent>>}
 */
export async function fetchLifeEvents(userId = null) {
  const params = {}
  if (userId) {
    params.user_id = userId
  }
  const response = await request.get('/leaves/life-events', { params })
  // 處理響應格式
  if (response && response.ok && response.data) {
    return response.data
  }
  return response.data || response || []
}

/**
 * 登記生活事件
 * @param {Object} payload - 生活事件數據
 * @param {string} payload.event_type - 事件類型
 * @param {string} payload.event_date - 事件日期（YYYY-MM-DD）
 * @param {string} [payload.notes] - 備註（可選）
 * @returns {Promise<LifeEvent>}
 */
export async function createLifeEvent(payload) {
  const response = await request.post('/leaves/life-events', payload)
  // 處理響應格式
  if (response && response.ok && response.data) {
    return response.data
  }
  return response.data || response
}

/**
 * 刪除生活事件
 * @param {number} eventId - 生活事件ID
 * @returns {Promise<void>}
 */
export async function deleteLifeEvent(eventId) {
  await request.delete(`/leaves/life-events/${eventId}`)
}

/**
 * 重新計算假期額度
 * @param {number} userId - 用戶ID
 * @returns {Promise<any>}
 */
export async function recalculateLeaveBalances(userId) {
  const response = await request.post(`/leaves/recalculate-balances/${userId}`)
  // 處理多種 API 響應格式
  if (response && response.ok && response.data) {
    return response.data
  }
  return response.data || response
}


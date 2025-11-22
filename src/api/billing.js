import request from './request'

/**
 * 收費計劃相關 API
 * 支援年度基礎的收費計劃管理（BR1.3.3）
 */

// ========== 新 API（年度基礎） ==========

/**
 * 獲取客戶收費計劃列表
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {string} [billingType] - 收費類型（'recurring' | 'one-time' | null）
 */
export const fetchBillingPlans = async (clientId, year, billingType = null) => {
  const params = { year }
  if (billingType) {
    params.billing_type = billingType
  }
  const response = await request.get(`/clients/${clientId}/billing/plans`, { params })
  return response
}

/**
 * 建立收費計劃
 * @param {string} clientId - 客戶 ID
 * @param {Object} data - 收費計劃資料
 */
export const createBillingPlan = async (clientId, data) => {
  const response = await request.post(`/clients/${clientId}/billing/plans`, data)
  return response
}

/**
 * 更新收費計劃
 * @param {string} clientId - 客戶 ID
 * @param {number} planId - 收費計劃 ID
 * @param {Object} data - 更新資料
 */
export const updateBillingPlan = async (clientId, planId, data) => {
  const response = await request.put(`/clients/${clientId}/billing/plans/${planId}`, data)
  return response
}

/**
 * 刪除收費計劃（支援批量）
 * @param {string} clientId - 客戶 ID
 * @param {number|string|Array} planIds - 收費計劃 ID 或 ID 陣列（批量刪除時用逗號分隔）
 */
export const deleteBillingPlan = async (clientId, planIds) => {
  const ids = Array.isArray(planIds) ? planIds.join(',') : String(planIds)
  const response = await request.delete(`/clients/${clientId}/billing/plans/${ids}`)
  return response
}

/**
 * 獲取應計收入
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {number} [month] - 月份（可選）
 * @param {boolean} [validate] - 是否驗證計算準確性
 */
export const fetchAccruedRevenue = async (clientId, year, month = null, validate = false) => {
  const params = { year }
  if (month) {
    params.month = month
  }
  if (validate) {
    params.validate = 'true'
  }
  const response = await request.get(`/clients/${clientId}/billing/revenue`, { params })
  return response
}

// ========== 舊 API（向後兼容，服務基礎） ==========

/**
 * @deprecated 使用 fetchBillingPlans 代替
 */
export const fetchBillingSchedules = async (serviceId) => {
  const response = await request.get(`/billing/service/${serviceId}`)
  return response
}

/**
 * @deprecated 使用 createBillingPlan 代替
 */
export const createBillingSchedule = async (data) => {
  const response = await request.post('/billing', data)
  return response
}

/**
 * @deprecated 使用 updateBillingPlan 代替
 */
export const updateBillingSchedule = async (scheduleId, data) => {
  const response = await request.put(`/billing/${scheduleId}`, data)
  return response
}

/**
 * @deprecated 使用 deleteBillingPlan 代替
 */
export const deleteBillingSchedule = async (scheduleId) => {
  const response = await request.delete(`/billing/${scheduleId}`)
  return response
}

/**
 * @deprecated 使用 deleteBillingPlan 代替（支援批量）
 */
export const batchDeleteBillingSchedules = async (scheduleIds) => {
  // 批量刪除：調用批量刪除 API
  if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
    throw new Error('收費計劃ID列表不能為空')
  }
  
  try {
    // axios DELETE 請求使用 data 參數傳遞 body
    const response = await request.delete('/billing/batch', {
      data: { schedule_ids: scheduleIds }
    })
    return response
  } catch (error) {
    console.error('[batchDeleteBillingSchedules] 批量刪除失敗:', error)
    throw error
  }
}

// Composable 函數（向後兼容）
export function useBillingApi() {
  return {
    // 新 API
    fetchBillingPlans,
    createBillingPlan,
    updateBillingPlan,
    deleteBillingPlan,
    fetchAccruedRevenue,
    // 舊 API（向後兼容）
    fetchBillingSchedules,
    createBillingSchedule,
    updateBillingSchedule,
    deleteBillingSchedule,
    batchDeleteBillingSchedules
  }
}


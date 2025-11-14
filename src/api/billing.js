import request from './request'

/**
 * 收費計劃相關 API
 */

// 直接導出的函數（用於組件中直接導入）
export const fetchBillingSchedules = async (serviceId) => {
  const response = await request.get(`/billing/service/${serviceId}`)
  return response
}

export const createBillingSchedule = async (data) => {
  const response = await request.post('/billing', data)
  return response
}

export const updateBillingSchedule = async (scheduleId, data) => {
  const response = await request.put(`/billing/${scheduleId}`, data)
  return response
}

export const deleteBillingSchedule = async (scheduleId) => {
  const response = await request.delete(`/billing/${scheduleId}`)
  return response
}

export const batchDeleteBillingSchedules = async (scheduleIds) => {
  // 批量刪除：逐個調用 DELETE API
  const results = await Promise.allSettled(
    scheduleIds.map(id => deleteBillingSchedule(id))
  )
  const ok = results.filter(r => r.status === 'fulfilled').length
  const fail = results.filter(r => r.status === 'rejected').length
  return { ok, fail, results }
}

// Composable 函數（向後兼容）
export function useBillingApi() {
  return {
    fetchBillingSchedules,
    createBillingSchedule,
    updateBillingSchedule,
    deleteBillingSchedule,
    batchDeleteBillingSchedules
  }
}


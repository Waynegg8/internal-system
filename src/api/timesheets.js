import request from './request'
import { checkSession } from './auth'

/**
 * 工時相關 API
 * 注意：獲取當前用戶應該從 auth.js 導入
 */
export function useTimesheetApi() {
  // 客戶和服務
  const fetchClients = async (params = {}) => {
    const response = await request.get('/clients', { params })
    return response
  }

  const fetchClientServices = async (clientId) => {
    const response = await request.get(`/clients/${clientId}/services`)
    return response
  }

  const fetchServiceItems = async (clientId, serviceId) => {
    // 從客戶服務項目獲取已配置的任務類型
    const response = await request.get(`/clients/${clientId}/services/${serviceId}/items`)
    return response
  }

  // 假日和請假
  const fetchHolidays = async (params = {}) => {
    const response = await request.get('/holidays', { params })
    return response
  }

  const fetchLeaves = async (params = {}) => {
    const response = await request.get('/leaves', { params })
    return response
  }

  // 工時記錄
  const fetchTimesheets = async (params = {}) => {
    const response = await request.get('/timesheets', { params })
    return response
  }

  const saveTimesheets = async (payload) => {
    // payload 格式：{ updates: [...], creates: [...] }
    // 根據原始代碼，使用 UPSERT 邏輯，每個記錄單獨調用 API
    const results = []
    const errors = []
    
    // 處理更新和新增（使用 UPSERT）
    const allRecords = [...(payload.updates || []), ...(payload.creates || [])]
    
    for (const record of allRecords) {
      try {
        // 使用 POST /timesheets 進行 UPSERT
        // 如果包含 timesheet_id，則為更新；否則為新增
        const response = await request.post('/timesheets', record)
        results.push(response)
      } catch (error) {
        errors.push({
          record,
          error: error.message || '保存失敗'
        })
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`部分記錄保存失敗：${errors.map(e => e.error).join('; ')}`)
    }
    
    return {
      ok: true,
      data: results,
      count: results.length
    }
  }

  const deleteTimesheet = async (timesheetId) => {
    const response = await request.delete(`/timesheets/${timesheetId}`)
    return response
  }

  // 統計
  const fetchMonthlySummary = async (params = {}) => {
    const response = await request.get('/timesheets/monthly-summary', { params })
    return response
  }

  // 預取
  const prefetchTimesheets = async (params = {}) => {
    const response = await request.get('/timesheets/prefetch', { params })
    return response
  }

  return {
    fetchClients,
    fetchClientServices,
    fetchServiceItems,
    fetchHolidays,
    fetchLeaves,
    fetchTimesheets,
    saveTimesheets,
    deleteTimesheet,
    fetchMonthlySummary,
    prefetchTimesheets
  }
}

// 導出 checkSession 供其他模塊使用
export { checkSession }


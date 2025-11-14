import request from './request'

/**
 * 儀表板相關 API
 */
export function useDashboardApi() {
  // 儀表板數據
  const fetchDashboardData = async (params = {}) => {
    try {
      // 構建查詢參數，過濾掉 null 和 undefined
      const queryParams = {}
      if (params.ym) queryParams.ym = params.ym
      if (params.financeYm) queryParams.financeYm = params.financeYm
      if (params.financeMode) queryParams.financeMode = params.financeMode
      if (params.activity_days) queryParams.activity_days = params.activity_days
      if (params.activity_user_id) queryParams.activity_user_id = params.activity_user_id
      if (params.activity_type) queryParams.activity_type = params.activity_type
      
      const response = await request.get('/dashboard', { params: queryParams })
      
      // 處理多種響應格式
      // request 攔截器已經返回 response.data，所以這裡直接處理
      if (response && typeof response === 'object') {
        // 如果響應格式是 { ok: true, data: {...} }
        if (response.ok !== undefined) {
          return response
        }
        // 如果直接返回數據，包裝成標準格式
        return {
          ok: true,
          data: response
        }
      }
      
      return response
    } catch (error) {
      // 錯誤處理由 request 攔截器統一處理
      throw error
    }
  }

  const fetchDashboardAlerts = async (params = {}) => {
    try {
      const queryParams = {}
      if (params.scope) queryParams.scope = params.scope

      const response = await request.get('/dashboard/alerts', { params: queryParams })

      if (response && typeof response === 'object') {
        if (response.ok !== undefined) {
          return response
        }
        return {
          ok: true,
          data: response
        }
      }

      return response
    } catch (error) {
      throw error
    }
  }

  return {
    fetchDashboardData,
    fetchDashboardAlerts
  }
}


import request from './request'

/**
 * 薪資相關 API
 */
export function usePayrollApi() {
  // 薪資計算
  const loadPayrollPreview = async (month, forceRefresh = false) => {
    try {
      const url = forceRefresh ? `/payroll/preview/${month}?force=true` : `/payroll/preview/${month}`
      console.log(`[PayrollApi] 載入薪資預覽: ${url}, forceRefresh: ${forceRefresh}`)
      const response = await request.get(url)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        // 如果已經是標準格式 { ok, data }，直接返回
        if ('ok' in response) {
          return response
        }
        // 如果是 { data: { users: [...] } } 格式
        if (response.data && response.data.users) {
          return { ok: true, data: response.data }
        }
        // 如果是 { data: [...] } 格式
        if (Array.isArray(response.data)) {
          return { ok: true, data: response.data }
        }
        // 如果直接是數組
        if (Array.isArray(response)) {
          return { ok: true, data: response }
        }
        // 其他情況，包裝為標準格式
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        throw {
          ...error,
          message: error.response.data?.message || error.message || '載入薪資預覽失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const calculateEmployeePayroll = async (userId, month) => {
    try {
      const response = await request.post(`/payroll/calculate`, {
        user_id: userId,
        month
      })
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        // 如果已經是標準格式 { ok, data }，直接返回
        if ('ok' in response) {
          return response
        }
        // 如果是 { data: {...} } 格式
        if (response.data) {
          return { ok: true, data: response.data }
        }
        // 其他情況，包裝為標準格式
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '載入薪資詳情失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  // 薪資項目類型
  const loadSalaryItemTypes = async () => {
    try {
      const response = await request.get('/payroll/salary-item-types')
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        // 如果已經是標準格式 { ok, data }，直接返回
        if ('ok' in response) {
          return response
        }
        // 如果是 { data: { items: [...] } } 格式
        if (response.data && response.data.items) {
          return { ok: true, data: response.data }
        }
        // 如果是 { data: [...] } 格式
        if (Array.isArray(response.data)) {
          return { ok: true, data: response.data }
        }
        // 如果直接是數組
        if (Array.isArray(response)) {
          return { ok: true, data: response }
        }
        // 其他情況，包裝為標準格式
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '載入薪資項目類型失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const createSalaryItemType = async (payload) => {
    try {
      const response = await request.post('/payroll/salary-item-types', payload)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '創建薪資項目類型失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const updateSalaryItemType = async (itemTypeId, payload) => {
    try {
      const response = await request.put(`/payroll/salary-item-types/${itemTypeId}`, payload)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '更新薪資項目類型失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const toggleSalaryItemTypeStatus = async (itemTypeId, isActive) => {
    try {
      const response = await request.put(`/payroll/salary-item-types/${itemTypeId}/toggle`, {
        is_active: isActive
      })
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '切換薪資項目狀態失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const deleteSalaryItemType = async (itemTypeId) => {
    try {
      const response = await request.delete(`/payroll/salary-item-types/${itemTypeId}`)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        // 409 錯誤：項目正在使用中
        if (error.response.status === 409) {
          throw {
            ...error,
            message: error.response.data?.message || '此薪資項目正在被使用，無法刪除',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '刪除薪資項目失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  // 員工薪資
  const loadAllUsers = async () => {
    try {
      const response = await request.get('/users?per_page=1000')
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        // 如果已經是標準格式 { ok, data }，直接返回
        if ('ok' in response) {
          return response
        }
        // 如果是 { data: { users: [...] } } 格式
        if (response.data && response.data.users) {
          return { ok: true, data: response.data }
        }
        // 如果是 { data: [...] } 格式
        if (Array.isArray(response.data)) {
          return { ok: true, data: response.data }
        }
        // 如果直接是數組
        if (Array.isArray(response)) {
          return { ok: true, data: response }
        }
        // 其他情況，包裝為標準格式
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '載入員工列表失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const loadUserSalary = async (userId) => {
    try {
      const response = await request.get(`/users/${userId}/salary`)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        // 如果已經是標準格式 { ok, data }，直接返回
        if ('ok' in response) {
          return response
        }
        // 如果是 { data: {...} } 格式
        if (response.data) {
          return { ok: true, data: response.data }
        }
        // 其他情況，包裝為標準格式
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '載入員工薪資失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const updateUserSalary = async (userId, payload) => {
    try {
      const response = await request.put(`/users/${userId}/salary`, payload)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '更新員工薪資失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  // 績效獎金
  const loadYearlyBonus = async (year) => {
    try {
      const response = await request.get(`/payroll/yearly-bonus/${year}`)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        // 如果已經是標準格式 { ok, data }，直接返回
        if ('ok' in response) {
          return response
        }
        // 如果是 { data: { year, employees: [...] } } 格式
        if (response.data) {
          return { ok: true, data: response.data }
        }
        // 其他情況，包裝為標準格式
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '載入年度績效獎金數據失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const updateYearlyBonus = async (year, adjustments) => {
    try {
      const response = await request.put(`/payroll/yearly-bonus/${year}`, { adjustments })
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '保存年度績效獎金調整失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  // 年終獎金
  const loadYearEndBonus = async (year) => {
    try {
      const response = await request.get(`/payroll/year-end-bonus/${year}`)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        // 如果已經是標準格式 { ok, data }，直接返回
        if ('ok' in response) {
          return response
        }
        // 如果是 { data: { year, employees: [...], summary: {...} } } 格式
        if (response.data) {
          return { ok: true, data: response.data }
        }
        // 其他情況，包裝為標準格式
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '載入年終獎金數據失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const updateYearEndBonus = async (year, bonuses) => {
    try {
      const response = await request.put(`/payroll/year-end-bonus/${year}`, { bonuses })
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '保存年終獎金失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  // 系統設定
  const loadPayrollSettings = async () => {
    try {
      const response = await request.get('/payroll/settings')
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        // 如果已經是標準格式 { ok, data }，直接返回
        if ('ok' in response) {
          return response
        }
        // 如果是 { data: { settings: [...], grouped: {...} } } 格式
        if (response.data) {
          return { ok: true, data: response.data }
        }
        // 其他情況，包裝為標準格式
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '載入系統設定失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const updatePayrollSettings = async (settings) => {
    try {
      const response = await request.put('/payroll/settings', { settings })
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '更新系統設定失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  // 打卡記錄
  const uploadPunchRecord = async (formData) => {
    try {
      const response = await request.post('/payroll/punch-records/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '上傳打卡記錄失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const loadPunchRecords = async (userId = null) => {
    try {
      const url = userId 
        ? `/payroll/punch-records?user_id=${userId}`
        : '/payroll/punch-records'
      const response = await request.get(url)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        // 如果已經是標準格式 { ok, data }，直接返回
        if ('ok' in response) {
          return response
        }
        // 如果是 { data: { records: [...] } } 格式
        if (response.data && response.data.records) {
          return { ok: true, data: response.data }
        }
        // 如果是 { data: [...] } 格式
        if (Array.isArray(response.data)) {
          return { ok: true, data: response.data }
        }
        // 如果直接是數組
        if (Array.isArray(response)) {
          return { ok: true, data: response }
        }
        // 其他情況，包裝為標準格式
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '載入打卡記錄失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const downloadPunchRecord = async (recordId) => {
    try {
      const response = await request.get(`/payroll/punch-records/${recordId}/download`, {
        responseType: 'blob'
      })
      return response
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '下載打卡記錄失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const previewPunchRecord = async (recordId) => {
    try {
      const response = await request.get(`/payroll/punch-records/${recordId}/preview`, {
        responseType: 'blob'
      })
      return response
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '預覽打卡記錄失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  const deletePunchRecord = async (recordId) => {
    try {
      const response = await request.delete(`/payroll/punch-records/${recordId}`)
      // 處理多種響應格式
      if (response && typeof response === 'object') {
        if ('ok' in response) {
          return response
        }
        if (response.data) {
          return { ok: true, data: response.data }
        }
        return { ok: true, data: response }
      }
      return { ok: true, data: response }
    } catch (error) {
      // 處理錯誤響應
      if (error.response) {
        // 401 錯誤：未登入
        if (error.response.status === 401) {
          throw {
            ...error,
            message: '未登入，請重新登入',
            response: error.response
          }
        }
        // 403 錯誤：無權限
        if (error.response.status === 403) {
          throw {
            ...error,
            message: '您沒有權限訪問此功能',
            response: error.response
          }
        }
        throw {
          ...error,
          message: error.response.data?.message || error.message || '刪除打卡記錄失敗',
          response: error.response
        }
      }
      throw error
    }
  }

  return {
    loadPayrollPreview,
    calculateEmployeePayroll,
    loadSalaryItemTypes,
    createSalaryItemType,
    updateSalaryItemType,
    toggleSalaryItemTypeStatus,
    deleteSalaryItemType,
    loadAllUsers,
    loadUserSalary,
    updateUserSalary,
    loadYearlyBonus,
    updateYearlyBonus,
    loadYearEndBonus,
    updateYearEndBonus,
    loadPayrollSettings,
    updatePayrollSettings,
    uploadPunchRecord,
    loadPunchRecords,
    downloadPunchRecord,
    previewPunchRecord,
    deletePunchRecord
  }
}


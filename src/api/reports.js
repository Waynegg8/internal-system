import request from './request'

/**
 * 報表相關 API
 */
export function useReportsApi() {
  /**
   * 載入月度收款報表
   * @param {number} year - 年份
   * @param {number} month - 月份 (1-12)
   * @returns {Promise} API 響應
   */
  const fetchMonthlyRevenue = async (year, month, options = {}) => {
    try {
      const params = {
        year,
        month
      }

      if (options.refresh) {
        params.refresh = 1
      }

      const response = await request.get('/reports/monthly/revenue', {
        params
      })
      
      // 處理多種 API 響應格式
      // 支持 { ok: true, data: {...} } 格式
      if (response && response.ok !== undefined) {
        return response
      }
      
      // 如果直接返回數據，包裝成標準格式
      return {
        ok: true,
        data: response
      }
    } catch (error) {
      // 錯誤處理已在 request.js 的攔截器中統一處理
      // 401 會自動跳轉登入頁，403 會顯示權限錯誤
      throw error
    }
  }

  /**
   * 載入月度薪資報表
   * @param {number} year - 年份
   * @param {number} month - 月份 (1-12)
   * @param {Object} options - 選項參數
   * @param {boolean} options.refresh - 是否強制刷新（忽略快取）
   * @returns {Promise} API 響應
   */
  const fetchMonthlyPayroll = async (year, month, options = {}) => {
    try {
      const params = {
        year,
        month
      }

      if (options.refresh) {
        params.refresh = 1
      }

      const response = await request.get('/reports/monthly/payroll', {
        params
      })
      
      // 處理多種 API 響應格式
      if (response && response.ok !== undefined) {
        return response
      }
      
      return {
        ok: true,
        data: response
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 載入月度員工產值報表
   * @param {number} year - 年份
   * @param {number} month - 月份 (1-12)
   * @param {Object} options - 選項參數
   * @param {boolean} options.refresh - 是否強制刷新（忽略快取）
   * @returns {Promise} API 響應
   */
  const fetchMonthlyEmployeePerformance = async (year, month, options = {}) => {
    try {
      const params = {
        year,
        month
      }

      if (options.refresh) {
        params.refresh = 1
      }

      const response = await request.get('/reports/monthly/employee-performance', {
        params
      })
      
      // 處理多種 API 響應格式
      if (response && response.ok !== undefined) {
        return response
      }
      
      return {
        ok: true,
        data: response
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 載入月度客戶毛利報表
   * @param {number} year - 年份
   * @param {number} month - 月份 (1-12)
   * @param {Object} options - 選項參數
   * @param {boolean} options.refresh - 是否強制刷新（忽略快取）
   * @returns {Promise} API 響應
   */
  const fetchMonthlyClientProfitability = async (year, month, options = {}) => {
    try {
      const params = {
        year,
        month
      }

      if (options.refresh) {
        params.refresh = 1
      }

      const response = await request.get('/reports/monthly/client-profitability', {
        params
      })
      
      // 處理多種 API 響應格式
      if (response && response.ok !== undefined) {
        return response
      }
      
      return {
        ok: true,
        data: response
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 載入年度收款報表
   * @param {number} year - 年份
   * @param {Object} options - 選項參數
   * @param {boolean} options.refresh - 是否強制刷新（忽略快取）
   * @returns {Promise} API 響應
   */
  const fetchAnnualRevenue = async (year, options = {}) => {
    try {
      const params = { year }

      if (options.refresh) {
        params.refresh = 1
      }

      const response = await request.get('/reports/annual/revenue', {
        params
      })
      
      if (response && response.ok !== undefined) {
        return response
      }
      
      return {
        ok: true,
        data: response
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 載入年度薪資報表
   * @param {number} year - 年份
   * @param {Object} options - 選項參數
   * @param {boolean} options.refresh - 是否強制刷新（忽略快取）
   * @returns {Promise} API 響應
   */
  const fetchAnnualPayroll = async (year, options = {}) => {
    try {
      const params = { year }

      if (options.refresh) {
        params.refresh = 1
      }

      const response = await request.get('/reports/annual/payroll', {
        params
      })
      
      if (response && response.ok !== undefined) {
        return response
      }
      
      return {
        ok: true,
        data: response
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 載入年度員工產值報表
   * @param {number} year - 年份
   * @param {Object} options - 選項參數
   * @param {boolean} options.refresh - 是否強制刷新（忽略快取）
   * @returns {Promise} API 響應
   */
  const fetchAnnualEmployeePerformance = async (year, options = {}) => {
    try {
      const params = { year }

      if (options.refresh) {
        params.refresh = 1
      }

      const response = await request.get('/reports/annual/employee-performance', {
        params
      })
      
      if (response && response.ok !== undefined) {
        return response
      }
      
      return {
        ok: true,
        data: response
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 載入年度客戶毛利報表
   * @param {number} year - 年份
   * @param {Object} options - 選項參數
   * @param {boolean} options.refresh - 是否強制刷新（忽略快取）
   * @returns {Promise} API 響應
   */
  const fetchAnnualClientProfitability = async (year, options = {}) => {
    try {
      const params = { year }

      if (options.refresh) {
        params.refresh = 1
      }

      const response = await request.get('/reports/annual/client-profitability', {
        params
      })
      
      if (response && response.ok !== undefined) {
        return response
      }
      
      return {
        ok: true,
        data: response
      }
    } catch (error) {
      throw error
    }
  }

  return {
    fetchMonthlyRevenue,
    fetchMonthlyPayroll,
    fetchMonthlyEmployeePerformance,
    fetchMonthlyClientProfitability,
    fetchAnnualRevenue,
    fetchAnnualPayroll,
    fetchAnnualEmployeePerformance,
    fetchAnnualClientProfitability
  }
}


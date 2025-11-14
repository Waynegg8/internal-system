import { defineStore } from 'pinia'
import { useReportsApi } from '@/api/reports'

export const useReportsStore = defineStore('reports', {
  state: () => ({
    loading: false,
    error: null,
    monthlyRevenue: null,
    monthlyPayroll: null,
    monthlyEmployeePerformance: null,
    monthlyClientProfitability: null,
    annualRevenue: null,
    annualPayroll: null,
    annualEmployeePerformance: null,
    annualClientProfitability: null,
    selectedYear: null,
    selectedMonth: null,
    reportStatuses: {
      revenue: null,
      payroll: null,
      performance: null,
      profit: null
    }
  }),

  actions: {
    /**
     * 載入月度收款報表
     * @param {number} year - 年份
     * @param {number} month - 月份 (1-12)
     */
    async fetchMonthlyRevenue(year, month, options = {}) {
      this.error = null
      try {
        const response = await useReportsApi().fetchMonthlyRevenue(year, month, options)
        
        // 處理 API 響應格式
        if (response && response.ok) {
          // 處理字段名差異（snake_case 和 camelCase）
          this.monthlyRevenue = normalizeFieldNames(response.data)
        } else {
          this.error = response?.message || '載入報表失敗'
        }
        
        return response
      } catch (error) {
        // 錯誤處理已在 API 層處理（401 跳轉登入頁，403 顯示權限錯誤）
        this.error = error.response?.data?.message || error.message || '載入報表失敗'
        throw error
      }
    },

    /**
     * 設置選中年份
     * @param {number} year - 年份
     */
    setSelectedYear(year) {
      this.selectedYear = year
    },

    /**
     * 設置選中月份
     * @param {number} month - 月份 (1-12)
     */
    setSelectedMonth(month) {
      this.selectedMonth = month
    },

    /**
     * 載入月度薪資報表
     * @param {number} year - 年份
     * @param {number} month - 月份 (1-12)
     */
    async fetchMonthlyPayroll(year, month) {
      this.error = null
      try {
        const response = await useReportsApi().fetchMonthlyPayroll(year, month)
        
        if (response && response.ok) {
          this.monthlyPayroll = normalizeFieldNames(response.data)
        } else {
          this.error = response?.message || '載入薪資報表失敗'
        }
        
        return response
      } catch (error) {
        this.error = error.response?.data?.message || error.message || '載入薪資報表失敗'
        throw error
      }
    },

    /**
     * 載入月度員工產值報表
     * @param {number} year - 年份
     * @param {number} month - 月份 (1-12)
     */
    async fetchMonthlyEmployeePerformance(year, month) {
      this.error = null
      try {
        const response = await useReportsApi().fetchMonthlyEmployeePerformance(year, month)
        
        if (response && response.ok) {
          this.monthlyEmployeePerformance = normalizeFieldNames(response.data)
        } else {
          this.error = response?.message || '載入員工產值報表失敗'
        }
        
        return response
      } catch (error) {
        this.error = error.response?.data?.message || error.message || '載入員工產值報表失敗'
        throw error
      }
    },

    /**
     * 載入月度客戶毛利報表
     * @param {number} year - 年份
     * @param {number} month - 月份 (1-12)
     */
    async fetchMonthlyClientProfitability(year, month) {
      this.error = null
      try {
        const response = await useReportsApi().fetchMonthlyClientProfitability(year, month)
        
        if (response && response.ok) {
          this.monthlyClientProfitability = normalizeFieldNames(response.data)
        } else {
          this.error = response?.message || '載入客戶毛利報表失敗'
        }
        
        return response
      } catch (error) {
        this.error = error.response?.data?.message || error.message || '載入客戶毛利報表失敗'
        throw error
      }
    },

    /**
     * 一次性載入所有月度報表
     * @param {number} year - 年份
     * @param {number} month - 月份 (1-12)
     */
    async loadMonthlyReports(year, month) {
      if (!year || !month) {
        return
      }

      const numericYear = Number(year)
      const numericMonth = Number(month)

      this.loading = true
      this.error = null

      try {
        await Promise.all([
          this.fetchMonthlyRevenue(numericYear, numericMonth, { refresh: true }),
          this.fetchMonthlyPayroll(numericYear, numericMonth),
          this.fetchMonthlyEmployeePerformance(numericYear, numericMonth),
          this.fetchMonthlyClientProfitability(numericYear, numericMonth)
        ])
      } catch (error) {
        console.error('[ReportsStore] 載入月度報表失敗:', error)
        this.error = error?.response?.data?.message || error.message || '載入月度報表失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 載入年度收款報表
     * @param {number} year - 年份
     */
    async fetchAnnualRevenue(year) {
      this.setReportStatus('revenue', 'loading')
      this.error = null
      try {
        const response = await useReportsApi().fetchAnnualRevenue(year)
        
        if (response && response.ok) {
          this.annualRevenue = normalizeFieldNames(response.data)
          this.setReportStatus('revenue', 'success')
        } else {
          this.error = response?.message || '載入年度收款報表失敗'
          this.setReportStatus('revenue', 'error')
        }
        
        return response
      } catch (error) {
        this.error = error.response?.data?.message || error.message || '載入年度收款報表失敗'
        this.setReportStatus('revenue', 'error')
        throw error
      }
    },

    /**
     * 載入年度薪資報表
     * @param {number} year - 年份
     */
    async fetchAnnualPayroll(year) {
      this.setReportStatus('payroll', 'loading')
      this.error = null
      try {
        const response = await useReportsApi().fetchAnnualPayroll(year)
        
        if (response && response.ok) {
          this.annualPayroll = normalizeFieldNames(response.data)
          this.setReportStatus('payroll', 'success')
        } else {
          this.error = response?.message || '載入年度薪資報表失敗'
          this.setReportStatus('payroll', 'error')
        }
        
        return response
      } catch (error) {
        this.error = error.response?.data?.message || error.message || '載入年度薪資報表失敗'
        this.setReportStatus('payroll', 'error')
        throw error
      }
    },

    /**
     * 載入年度員工產值報表
     * @param {number} year - 年份
     */
    async fetchAnnualEmployeePerformance(year) {
      this.setReportStatus('performance', 'loading')
      this.error = null
      try {
        const response = await useReportsApi().fetchAnnualEmployeePerformance(year)
        
        if (response && response.ok) {
          this.annualEmployeePerformance = normalizeFieldNames(response.data)
          this.setReportStatus('performance', 'success')
        } else {
          this.error = response?.message || '載入年度員工產值報表失敗'
          this.setReportStatus('performance', 'error')
        }
        
        return response
      } catch (error) {
        this.error = error.response?.data?.message || error.message || '載入年度員工產值報表失敗'
        this.setReportStatus('performance', 'error')
        throw error
      }
    },

    /**
     * 載入年度客戶毛利報表
     * @param {number} year - 年份
     */
    async fetchAnnualClientProfitability(year) {
      this.setReportStatus('profit', 'loading')
      this.error = null
      try {
        const response = await useReportsApi().fetchAnnualClientProfitability(year)
        
        if (response && response.ok) {
          this.annualClientProfitability = normalizeFieldNames(response.data)
          this.setReportStatus('profit', 'success')
        } else {
          this.error = response?.message || '載入年度客戶毛利報表失敗'
          this.setReportStatus('profit', 'error')
        }
        
        return response
      } catch (error) {
        this.error = error.response?.data?.message || error.message || '載入年度客戶毛利報表失敗'
        this.setReportStatus('profit', 'error')
        throw error
      }
    },

    /**
     * 設置報表載入狀態
     * @param {string} reportType - 報表類型 ('revenue' | 'payroll' | 'performance' | 'profit')
     * @param {string} status - 狀態 ('loading' | 'success' | 'error' | null)
     */
    setReportStatus(reportType, status) {
      if (this.reportStatuses.hasOwnProperty(reportType)) {
        this.reportStatuses[reportType] = status
      }
    },

    /**
     * 清除所有報表狀態
     */
    clearReportStatuses() {
      this.reportStatuses = {
        revenue: null,
        payroll: null,
        performance: null,
        profit: null
      }
    },

    /**
     * 清除錯誤狀態
     */
    clearError() {
      this.error = null
    }
  }
})

/**
 * 標準化字段名（將 snake_case 轉換為 camelCase）
 * @param {Object} data - 原始數據
 * @returns {Object} 標準化後的數據
 */
function normalizeFieldNames(data) {
  if (!data || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => normalizeFieldNames(item))
  }

  const normalized = {}
  for (const [key, value] of Object.entries(data)) {
    // 將 snake_case 轉換為 camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    
    // 遞歸處理嵌套對象
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      normalized[camelKey] = normalizeFieldNames(value)
    } else {
      normalized[camelKey] = value
    }
  }

  return normalized
}


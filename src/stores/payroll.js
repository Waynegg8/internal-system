import { defineStore } from 'pinia'
import { usePayrollApi } from '@/api/payroll'
import { extractApiArray, extractApiData, extractApiObject } from '@/utils/apiHelpers'

export const usePayrollStore = defineStore('payroll', {
  state: () => ({
    selectedMonth: null, // 當前選中的月份（格式：YYYY-MM）
    payrollPreview: [], // 薪資預覽列表
    payrollPreviewCache: new Map(), // 快取：month -> { data, timestamp, fullDataLoaded: Set<userId>, total }
    payrollPreviewTotal: 0, // 薪資預覽總人數
    isForbidden: false, // 是否被禁止檢視薪資預覽
    expandedRows: new Set(), // 展開的行 ID 集合
    loadingDetails: new Set(), // 正在載入詳情的用戶 ID 集合
    salaryItemTypes: [], // 薪資項目類型列表
    filteredSalaryItemTypes: [], // 過濾後的薪資項目列表
    searchKeyword: '', // 搜索關鍵詞
    employees: [], // 所有員工列表
    filteredEmployees: [], // 過濾後的員工列表
    selectedEmployeeId: null, // 當前選中的員工 ID
    currentEmployeeSalary: null, // 當前員工的薪資設定
    employeeSearchKeyword: '', // 員工搜索關鍵詞
    selectedEmployee: null, // 保留兼容性
    yearlyBonusYear: null, // 當前選中的年度
    yearlyBonusData: null, // 年度績效獎金數據（包含員工列表、預設值、調整值）
    yearlyBonus: new Map(), // 保留兼容性
    yearEndBonusYear: null, // 當前選中的年度
    yearEndBonusData: null, // 年終獎金數據（包含員工列表和統計摘要）
    yearEndBonus: new Map(), // 保留兼容性
    payrollSettings: null,
    punchRecords: [],
    selectedPunchRecord: null,
    currentPunchUserId: null,
    loading: false,
    error: null
  }),
  
  getters: {
    // 檢查行是否展開
    isRowExpanded: (state) => (rowId) => {
      return state.expandedRows.has(rowId)
    }
  },
  
  actions: {
    // 獲取薪資預覽（支持快取，5分鐘，智能預載入）
    async loadPayrollPreview(month, forceRefresh = false) {
      this.loading = true
      this.error = null
      
      try {
        this.isForbidden = false
        // 檢查快取（5分鐘有效期）
        const cacheKey = month
        const cache = this.payrollPreviewCache.get(cacheKey)
        const now = Date.now()
        const cacheExpiry = 5 * 60 * 1000 // 5分鐘
        
        if (!forceRefresh && cache && (now - cache.timestamp < cacheExpiry)) {
          // 使用快取，但檢查是否有新數據需要合併
          console.log(`[PayrollStore] ⚡ 使用快取資料 (${month})`)
          this.payrollPreview = cache.data
          this.payrollPreviewTotal = cache.total ?? cache.data.length ?? 0
          return { ok: true, data: cache.data, total: this.payrollPreviewTotal, fromCache: true }
        }
        
        // 從 API 載入
        console.log(`[PayrollStore] 🔄 從伺服器載入資料 (${month}), forceRefresh: ${forceRefresh}`)
        const response = await usePayrollApi().loadPayrollPreview(month, forceRefresh)
        
        // 處理多種 API 響應格式
        let data = []
        let total = 0
        if (response.ok) {
          const responseData = extractApiData(response, {})
          // 格式1: { ok: true, data: { users: [...] } }
          if (responseData.users && Array.isArray(responseData.users)) {
            data = responseData.users
          } else {
            data = extractApiArray(response, [])
          }

          if (Number.isInteger(responseData.total)) {
            total = responseData.total
          } else if (response.data && Number.isInteger(response.data.total)) {
            total = response.data.total
          } else {
            total = data.length
          }
        } else {
          total = data.length
        }
        
        // 合併快取中的完整數據（如果有）
        if (cache && cache.fullDataLoaded) {
          data = data.map(emp => {
            const userId = emp.userId || emp.user_id
            if (userId && cache.fullDataLoaded.has(userId)) {
              // 從快取中找到完整數據並合併
              const cachedEmp = cache.data.find(c => (c.userId || c.user_id) === userId)
              if (cachedEmp && (cachedEmp.tripDetails || cachedEmp.trip_details || 
                  cachedEmp.leaveDetails || cachedEmp.leave_details ||
                  cachedEmp.dailyOvertime || cachedEmp.daily_overtime)) {
                // 深度合併完整數據
                return this.mergeEmployeeData(emp, cachedEmp)
              }
            }
            return emp
          })
        }
        
        // 更新狀態和快取
        this.payrollPreview = data
        this.payrollPreviewTotal = total
        this.payrollPreviewCache.set(cacheKey, {
          data,
          timestamp: now,
          fullDataLoaded: cache?.fullDataLoaded || new Set(),
          total
        })
        
        console.log(`[PayrollStore] ✓ 載入完成，共 ${data.length} 筆記錄`)
        return { ok: true, data, total, fromCache: false }
      } catch (error) {
        this.error = error.message || '載入薪資預覽失敗'
        console.error('[PayrollStore] 載入失敗:', error)
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          // 由路由守衛處理，這裡只設置錯誤
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          this.isForbidden = true
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 合併員工數據（深度合併，保留完整數據）
    mergeEmployeeData(target, source) {
      const merged = { ...target }
      
      // 合併數組字段
      const arrayFields = [
        'tripDetails', 'trip_details',
        'leaveDetails', 'leave_details',
        'dailyOvertime', 'daily_overtime',
        'deductionItems', 'deduction_items',
        'regularAllowanceItems', 'regular_allowance_items',
        'irregularAllowanceItems', 'irregular_allowance_items',
        'regularBonusItems', 'regular_bonus_items',
        'yearEndBonusItems', 'year_end_bonus_items'
      ]
      
      arrayFields.forEach(field => {
        const sourceValue = source[field]
        if (Array.isArray(sourceValue) && sourceValue.length > 0) {
          merged[field] = [...sourceValue]
          // 同時設置對應的 snake_case 或 camelCase 字段
          if (field.includes('_')) {
            const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
            merged[camelField] = [...sourceValue]
          } else {
            const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase()
            merged[snakeField] = [...sourceValue]
          }
        }
      })
      
      // 合併對象字段
      const objectFields = [
        'expiredCompDetails', 'expired_comp_details',
        'mealAllowanceDays', 'meal_allowance_days'
      ]
      
      objectFields.forEach(field => {
        const sourceValue = source[field]
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          merged[field] = { ...sourceValue }
        } else if (Array.isArray(sourceValue) && sourceValue.length > 0) {
          merged[field] = [...sourceValue]
        }
      })
      
      return merged
    },
    
    // 切換行的展開/收起狀態
    toggleRowExpand(rowId) {
      if (this.expandedRows.has(rowId)) {
        this.expandedRows.delete(rowId)
      } else {
        this.expandedRows.add(rowId)
      }
    },
    
    // 更新單個員工的薪資數據（用於展開時載入完整數據）
    updateEmployeePayrollData(userId, fullData) {
      const index = this.payrollPreview.findIndex(
        emp => (emp.userId || emp.user_id) === userId
      )
      if (index !== -1) {
        // 使用統一的合併函數
        const mergedData = this.mergeEmployeeData(this.payrollPreview[index], fullData)
        
        // 確保關鍵字段存在
        this.payrollPreview[index] = {
          ...mergedData,
          userId: fullData.userId || fullData.user_id || userId,
          user_id: fullData.user_id || fullData.userId || userId,
          name: fullData.name || this.payrollPreview[index].name,
          month: fullData.month || this.payrollPreview[index].month,
          _fromCache: false,
          _needsCalculation: false,
          _fullDataLoaded: true // 標記已載入完整數據
        }
        
        // 更新快取中的完整數據標記
        const month = this.selectedMonth
        if (month) {
          const cache = this.payrollPreviewCache.get(month)
          if (cache) {
            if (!cache.fullDataLoaded) {
              cache.fullDataLoaded = new Set()
            }
            cache.fullDataLoaded.add(userId)
            // 更新快取中的數據
            const cacheIndex = cache.data.findIndex(
              emp => (emp.userId || emp.user_id) === userId
            )
            if (cacheIndex !== -1) {
              cache.data[cacheIndex] = { ...this.payrollPreview[index] }
            }
          }
        }
        
        console.log('[PayrollStore] ✓ 更新員工完整數據:', {
          userId,
          index,
          hasTripDetails: !!(this.payrollPreview[index].tripDetails || this.payrollPreview[index].trip_details),
          tripDetailsLength: (this.payrollPreview[index].tripDetails || this.payrollPreview[index].trip_details || []).length,
          hasLeaveDetails: !!(this.payrollPreview[index].leaveDetails || this.payrollPreview[index].leave_details),
          leaveDetailsLength: (this.payrollPreview[index].leaveDetails || this.payrollPreview[index].leave_details || []).length,
          hasDailyOvertime: !!(this.payrollPreview[index].dailyOvertime || this.payrollPreview[index].daily_overtime),
          dailyOvertimeLength: (this.payrollPreview[index].dailyOvertime || this.payrollPreview[index].daily_overtime || []).length
        })
      } else {
        console.warn('[PayrollStore] ⚠ 找不到員工:', userId)
      }
    },
    
    // 檢查員工是否已載入完整數據
    hasFullEmployeeData(userId) {
      const emp = this.payrollPreview.find(
        e => (e.userId || e.user_id) === userId
      )
      if (!emp) return false
      
      // 檢查是否有完整數據標記
      if (emp._fullDataLoaded) return true
      
      // 檢查是否有詳細數據字段
      return !!(emp.tripDetails || emp.trip_details || 
                emp.leaveDetails || emp.leave_details ||
                emp.dailyOvertime || emp.daily_overtime)
    },
    
    // 檢查是否正在載入詳情
    isLoadingDetails(userId) {
      return this.loadingDetails.has(userId)
    },
    
    // 設置載入詳情狀態
    setLoadingDetails(userId, loading) {
      if (loading) {
        this.loadingDetails.add(userId)
      } else {
        this.loadingDetails.delete(userId)
      }
    },
    
    // 清除錯誤狀態
    clearError() {
      this.error = null
    },

    clearForbidden() {
      this.isForbidden = false
    },
    
    // 設置選中月份
    setSelectedMonth(month) {
      this.selectedMonth = month
    },
    
    // 獲取薪資項目類型
    async loadSalaryItemTypes() {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().loadSalaryItemTypes()
        
        // 處理多種 API 響應格式
        let data = []
        if (response && typeof response === 'object') {
          const responseData = extractApiData(response, {})
          if (responseData.items && Array.isArray(responseData.items)) {
            data = responseData.items
          } else {
            data = extractApiArray(response, [])
          }
        }
        
        this.salaryItemTypes = data
        // 自動執行過濾
        this.filterSalaryItemTypes()
        
        return { ok: true, data }
      } catch (error) {
        this.error = error.message || '載入薪資項目類型失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建薪資項目類型
    async createSalaryItemType(data) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().createSalaryItemType(data)
        
        // 創建成功後刷新列表
        await this.loadSalaryItemTypes()
        
        return response
      } catch (error) {
        this.error = error.message || '創建薪資項目類型失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新薪資項目類型
    async updateSalaryItemType(itemTypeId, data) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().updateSalaryItemType(itemTypeId, data)
        
        // 更新成功後刷新列表
        await this.loadSalaryItemTypes()
        
        return response
      } catch (error) {
        this.error = error.message || '更新薪資項目類型失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 啟用/停用薪資項目
    async toggleSalaryItemTypeStatus(itemTypeId, isActive) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().toggleSalaryItemTypeStatus(itemTypeId, isActive)
        
        // 切換成功後刷新列表
        await this.loadSalaryItemTypes()
        
        return response
      } catch (error) {
        this.error = error.message || '切換薪資項目狀態失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除薪資項目
    async deleteSalaryItemType(itemTypeId) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().deleteSalaryItemType(itemTypeId)
        
        // 刪除成功後刷新列表
        await this.loadSalaryItemTypes()
        
        return response
      } catch (error) {
        this.error = error.message || '刪除薪資項目失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        // 處理 409 錯誤（項目正在使用中）
        if (error.response?.status === 409) {
          this.error = error.message || '此薪資項目正在被使用，無法刪除'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置搜索關鍵詞
    setSearchKeyword(keyword) {
      this.searchKeyword = keyword
      this.filterSalaryItemTypes()
    },
    
    // 根據搜索關鍵詞過濾列表
    filterSalaryItemTypes() {
      if (!this.searchKeyword || this.searchKeyword.trim() === '') {
        this.filteredSalaryItemTypes = [...this.salaryItemTypes]
        return
      }
      
      const keyword = this.searchKeyword.trim().toLowerCase()
      this.filteredSalaryItemTypes = this.salaryItemTypes.filter(item => {
        const itemCode = (item.itemCode || item.item_code || '').toLowerCase()
        const itemName = (item.itemName || item.item_name || '').toLowerCase()
        return itemCode.includes(keyword) || itemName.includes(keyword)
      })
    },
    
    // 獲取員工列表（同時獲取當月薪資）
    async loadAllUsers() {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().loadAllUsers()
        
        // 處理多種 API 響應格式
        let data = []
        if (response && typeof response === 'object') {
          const responseData = extractApiData(response, {})
          if (responseData.users && Array.isArray(responseData.users)) {
            data = responseData.users
          } else {
            data = extractApiArray(response, [])
          }
        }
        
        // 不再載入薪資預覽數據，直接使用員工的 base_salary
        this.employees = data
        // 自動執行過濾
        this.filterEmployees()
        
        return { ok: true, data }
      } catch (error) {
        this.error = error.message || '載入員工列表失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取員工薪資
    async loadUserSalary(userId) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().loadUserSalary(userId)
        
        // 處理多種 API 響應格式
        const data = extractApiObject(response, null)
        
        this.currentEmployeeSalary = data
        this.selectedEmployee = { id: userId, salary: data }
        
        return { ok: true, data }
      } catch (error) {
        this.error = error.message || '載入員工薪資失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新員工薪資設定
    async updateUserSalary(userId, data) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().updateUserSalary(userId, data)
        
        // 更新成功後刷新數據
        await this.loadUserSalary(userId)
        
        return response
      } catch (error) {
        this.error = error.message || '更新員工薪資失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置選中的員工 ID
    setSelectedEmployeeId(userId) {
      this.selectedEmployeeId = userId
    },
    
    // 設置員工搜索關鍵詞
    setEmployeeSearchKeyword(keyword) {
      this.employeeSearchKeyword = keyword
      this.filterEmployees()
    },
    
    // 根據搜索關鍵詞過濾員工列表
    filterEmployees() {
      if (!this.employeeSearchKeyword || this.employeeSearchKeyword.trim() === '') {
        this.filteredEmployees = [...this.employees]
        return
      }
      
      const keyword = this.employeeSearchKeyword.trim().toLowerCase()
      this.filteredEmployees = this.employees.filter(employee => {
        const name = (employee.name || employee.userName || '').toLowerCase()
        const account = (employee.account || employee.username || '').toLowerCase()
        return name.includes(keyword) || account.includes(keyword)
      })
    },
    
    // 載入年度績效獎金數據
    async loadYearlyBonus(year) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().loadYearlyBonus(year)
        
        // 處理多種 API 響應格式
        let data = null
        if (response && typeof response === 'object') {
          // 格式1: { ok: true, data: { year, employees: [...] } }
          if (response.ok && response.data) {
            data = response.data
          }
          // 格式2: { data: { year, employees: [...] } }
          else if (response.data) {
            data = response.data
          }
          // 格式3: 直接是對象
          else if (!Array.isArray(response) && typeof response === 'object') {
            data = response
          }
        }
        
        // 轉換數據格式：確保每個員工都有 monthlyDefaults 和 monthlyAdjustments
        if (data && data.employees) {
          data.employees = data.employees.map(employee => {
            // 如果後端已經返回了 monthlyDefaults 和 monthlyAdjustments，直接使用
            if (employee.monthlyDefaults || employee.monthly_defaults) {
              // 確保格式一致
              const monthlyDefaults = employee.monthlyDefaults || employee.monthly_defaults || {}
              const monthlyAdjustments = employee.monthlyAdjustments || employee.monthly_adjustments || {}
              
              // 調試：記錄第一個員工的數據
              if (employee.userId === 50 || employee.user_id === 50) {
                console.log('[PayrollStore] 員工 50 的數據:', {
                  monthlyDefaults,
                  monthlyAdjustments,
                  rawEmployee: employee
                })
              }
              
              return {
                ...employee,
                monthlyDefaults,
                monthly_defaults: monthlyDefaults,
                monthlyAdjustments,
                monthly_adjustments: monthlyAdjustments
              }
            }
            
            // 如果後端返回的是舊格式（monthlyBonuses 陣列），進行轉換
            if (employee.monthlyBonuses && Array.isArray(employee.monthlyBonuses)) {
              const monthlyDefaults = {}
              const monthlyAdjustments = {}
              
              employee.monthlyBonuses.forEach(bonus => {
                const month = bonus.month
                // 儲存預設值（分）
                if (bonus.defaultBonusCents || bonus.default_bonus_cents) {
                  monthlyDefaults[month] = bonus.defaultBonusCents || bonus.default_bonus_cents
                }
                // 儲存調整值（分）
                const adjustedCents = bonus.adjustedBonusCents ?? bonus.adjusted_bonus_cents
                if (adjustedCents !== null && adjustedCents !== undefined) {
                  monthlyAdjustments[month] = {
                    bonusAmountCents: adjustedCents,
                    bonus_amount_cents: adjustedCents,
                    notes: bonus.notes || ''
                  }
                }
              })
              
              return {
                ...employee,
                monthlyDefaults,
                monthly_defaults: monthlyDefaults,
                monthlyAdjustments,
                monthly_adjustments: monthlyAdjustments
              }
            }
            
            // 如果都沒有，返回空對象
            return {
              ...employee,
              monthlyDefaults: {},
              monthly_defaults: {},
              monthlyAdjustments: {},
              monthly_adjustments: {}
            }
          })
        }
        
        this.yearlyBonusData = data
        this.yearlyBonusYear = year
        
        return { ok: true, data }
      } catch (error) {
        this.error = error.message || '載入年度績效獎金數據失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 批量保存全年績效獎金調整
    async updateYearlyBonus(year, adjustments) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().updateYearlyBonus(year, adjustments)
        
        // 保存成功後刷新數據
        await this.loadYearlyBonus(year)
        
        return response
      } catch (error) {
        this.error = error.message || '保存年度績效獎金調整失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置選中的年度
    setYearlyBonusYear(year) {
      this.yearlyBonusYear = year
    },
    
    // 更新單個員工某個月的調整金額（本地狀態更新）
    updateMonthlyAdjustment(empIndex, month, amount) {
      if (!this.yearlyBonusData || !this.yearlyBonusData.employees) {
        return
      }
      
      const employees = this.yearlyBonusData.employees
      if (empIndex < 0 || empIndex >= employees.length) {
        return
      }
      
      const employee = employees[empIndex]
      if (!employee.monthlyAdjustments) {
        employee.monthlyAdjustments = {}
      }
      
      if (amount === null || amount === undefined || amount === '') {
        // 刪除調整值
        delete employee.monthlyAdjustments[month]
      } else {
        // 設置調整值（轉換為分）
        const amountCents = Math.round(Number(amount) * 100)
        if (!isNaN(amountCents) && amountCents >= 0) {
          if (!employee.monthlyAdjustments[month]) {
            employee.monthlyAdjustments[month] = {}
          }
          employee.monthlyAdjustments[month].bonusAmountCents = amountCents
          employee.monthlyAdjustments[month].bonus_amount_cents = amountCents
        }
      }
    },
    
    // 載入年終獎金數據
    async loadYearEndBonus(year) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().loadYearEndBonus(year)
        
        // 處理多種 API 響應格式
        let data = null
        if (response && typeof response === 'object') {
          // 格式1: { ok: true, data: { year, employees: [...], summary: {...} } }
          if (response.ok && response.data) {
            data = response.data
          }
          // 格式2: { data: { year, employees: [...], summary: {...} } }
          else if (response.data) {
            data = response.data
          }
          // 格式3: 直接是對象
          else if (!Array.isArray(response) && typeof response === 'object') {
            data = response
          }
        }
        
        this.yearEndBonusData = data
        this.yearEndBonusYear = year
        
        // 更新統計摘要
        this.updateYearEndBonusSummary()
        
        return { ok: true, data }
      } catch (error) {
        this.error = error.message || '載入年終獎金數據失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 批量保存年終獎金
    async updateYearEndBonus(year, bonuses) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().updateYearEndBonus(year, bonuses)
        
        // 保存成功後刷新數據
        await this.loadYearEndBonus(year)
        
        return response
      } catch (error) {
        this.error = error.message || '保存年終獎金失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置選中的年度
    setYearEndBonusYear(year) {
      this.yearEndBonusYear = year
    },
    
    // 更新統計摘要（本地計算）
    updateYearEndBonusSummary() {
      if (!this.yearEndBonusData || !this.yearEndBonusData.employees) {
        if (this.yearEndBonusData) {
          this.yearEndBonusData.summary = {
            total: 0,
            count: 0,
            average: 0
          }
        }
        return
      }
      
      const employees = this.yearEndBonusData.employees
      let totalCents = 0
      let count = 0
      
      employees.forEach(employee => {
        const amountCents = employee.amountCents || employee.amount_cents || 0
        if (amountCents > 0) {
          totalCents += amountCents
          count++
        }
      })
      
      const total = totalCents / 100
      const average = count > 0 ? total / count : 0
      
      if (!this.yearEndBonusData.summary) {
        this.yearEndBonusData.summary = {}
      }
      
      this.yearEndBonusData.summary = {
        total,
        count,
        average
      }
    },
    
    // 載入系統設定
    async loadPayrollSettings() {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().loadPayrollSettings()
        
        // 處理多種 API 響應格式
        let data = null
        if (response && typeof response === 'object') {
          // 格式1: { ok: true, data: { settings: [...], grouped: {...} } }
          if (response.ok && response.data) {
            data = response.data
          }
          // 格式2: { data: { settings: [...], grouped: {...} } }
          else if (response.data) {
            data = response.data
          }
          // 格式3: 直接是對象
          else if (!Array.isArray(response) && typeof response === 'object') {
            data = response
          }
        }
        
        this.payrollSettings = data
        
        return { ok: true, data }
      } catch (error) {
        this.error = error.message || '載入系統設定失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 批量更新系統設定
    async updatePayrollSettings(settings) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().updatePayrollSettings(settings)
        
        // 更新成功後刷新數據
        await this.loadPayrollSettings()
        
        return response
      } catch (error) {
        this.error = error.message || '更新系統設定失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 載入打卡記錄列表
    async loadPunchRecords(userId = null) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().loadPunchRecords(userId)
        
        // 處理多種 API 響應格式
        let data = []
        if (response && typeof response === 'object') {
          const responseData = extractApiData(response, {})
          if (responseData.records && Array.isArray(responseData.records)) {
            data = responseData.records
          } else {
            data = extractApiArray(response, [])
          }
        }
        
        this.punchRecords = data
        
        return { ok: true, data }
      } catch (error) {
        this.error = error.message || '載入打卡記錄失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 上傳打卡記錄
    async uploadPunchRecord(formData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().uploadPunchRecord(formData)
        
        // 上傳成功後刷新列表
        const userId = this.currentPunchUserId
        await this.loadPunchRecords(userId)
        
        return response
      } catch (error) {
        this.error = error.message || '上傳打卡記錄失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除打卡記錄
    async deletePunchRecord(recordId) {
      this.loading = true
      this.error = null
      
      try {
        const response = await usePayrollApi().deletePunchRecord(recordId)
        
        // 刪除成功後刷新列表
        const userId = this.currentPunchUserId
        await this.loadPunchRecords(userId)
        
        // 如果刪除的是當前選中的記錄，清除選中狀態
        if (this.selectedPunchRecord && (this.selectedPunchRecord.recordId === recordId || this.selectedPunchRecord.record_id === recordId)) {
          this.selectedPunchRecord = null
        }
        
        return response
      } catch (error) {
        this.error = error.message || '刪除打卡記錄失敗'
        
        // 處理 401 錯誤（未登入）
        if (error.response?.status === 401) {
          throw error
        }
        
        // 處理 403 錯誤（無權限）
        if (error.response?.status === 403) {
          this.error = '您沒有權限訪問此功能'
          throw error
        }
        
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置當前查看的用戶 ID（管理員模式）
    setCurrentPunchUserId(userId) {
      this.currentPunchUserId = userId
    },
    
    // 設置選中的打卡記錄（用於預覽）
    setSelectedPunchRecord(record) {
      this.selectedPunchRecord = record
    }
  }
})


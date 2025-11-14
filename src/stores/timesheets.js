import { defineStore } from 'pinia'
import { useTimesheetApi } from '@/api/timesheets'
import { useAuthApi } from '@/api/auth'
import { useClientApi } from '@/api/clients'
import { fetchAllUsers } from '@/api/users'
import { getMonday, buildWeekDays } from '@/utils/date'
import { useTimesheetValidation } from '@/composables/useTimesheetValidation'
import { extractApiArray, extractApiData } from '@/utils/apiHelpers'

// 格式化日期為 ISO 格式 (YYYY-MM-DD)
function formatDateISO(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 工時管理 Store
 */
export const useTimesheetStore = defineStore('timesheets', {
  state: () => ({
    // 當前週的週一日期
    currentWeekStart: getMonday(new Date()),
    
    // 當前用戶
    currentUser: null,
    
    // 是否為管理員
    isAdmin: false,
    
    // 選中的員工 ID（用於管理員篩選）
    selectedUserId: null,
    
    // 員工列表（用於管理員篩選）
    users: [],
    
    // 客戶列表
    clients: [],
    
    // 客戶服務項目緩存 (Map<client_id, Array<service>>)
    clientServices: new Map(),
    
    // 服務子項目緩存 (Map<`${client_id}_${service_id}`, Array<item>>)
    serviceItems: new Map(),
    
    // 工時類型列表（硬編碼常量）
    workTypes: [
      {
        id: 1,
        name: '一般',
        multiplier: 1.0,
        isOvertime: false,
        allowedOn: ['workday']
      },
      {
        id: 2,
        name: '平日OT前2h',
        multiplier: 1.34,
        isOvertime: true,
        maxHours: 2,
        allowedOn: ['workday']
      },
      {
        id: 3,
        name: '平日OT後2h',
        multiplier: 1.67,
        isOvertime: true,
        maxHours: 2,
        requiresTypes: [2],
        allowedOn: ['workday']
      },
      {
        id: 4,
        name: '休息日前2h',
        multiplier: 1.34,
        isOvertime: true,
        maxHours: 2,
        allowedOn: ['restday']
      },
      {
        id: 5,
        name: '休息日3-8h',
        multiplier: 1.67,
        isOvertime: true,
        maxHours: 6,
        requiresTypes: [4],
        allowedOn: ['restday']
      },
      {
        id: 6,
        name: '休息日9-12h',
        multiplier: 2.67,
        isOvertime: true,
        maxHours: 4,
        requiresTypes: [4, 5],
        allowedOn: ['restday']
      },
      {
        id: 7,
        name: '國定8h內',
        multiplier: 1.0,
        isOvertime: true,
        maxHours: 8,
        allowedOn: ['national_holiday']
      },
      {
        id: 8,
        name: '國定9-10h',
        multiplier: 1.34,
        isOvertime: true,
        maxHours: 2,
        requiresTypes: [7],
        allowedOn: ['national_holiday']
      },
      {
        id: 9,
        name: '國定11-12h',
        multiplier: 1.67,
        isOvertime: true,
        maxHours: 2,
        requiresTypes: [7, 8],
        allowedOn: ['national_holiday']
      },
      {
        id: 10,
        name: '例假8h內',
        multiplier: 1.0,
        isOvertime: true,
        maxHours: 8,
        allowedOn: ['weekly_restday']
      },
      {
        id: 11,
        name: '例假9-12h',
        multiplier: 1.0,
        isOvertime: true,
        allowedOn: ['weekly_restday']
      }
    ],
    
    // 假日列表緩存 (Map<iso, Holiday>)
    holidays: new Map(),
    
    // 請假記錄緩存 (Map<iso, Leave>)
    leaves: new Map(),
    
    // 工時記錄數據數組
    timesheets: [],
    
    // 表格行數據（從 timesheets 轉換而來）
    rows: [],
    
    // 週日期數組（包含週一到週日的日期信息）
    weekDays: [],
    
    // 待儲存變更 (Map<`${rowIdx}_${dayIdx}`, Change>)
    pendingChanges: new Map(),
    
    // 本週統計數據對象
    weeklySummary: {
      totalHours: 0,
      overtimeHours: 0,
      weightedHours: 0,
      leaveHours: 0
    },
    
    // 本月統計數據對象
    monthlySummary: {
      totalHours: 0,
      overtimeHours: 0,
      weightedHours: 0,
      leaveHours: 0
    },
    
    // 加載狀態
    loading: false,
    
    // 錯誤信息
    error: null
  }),
  
  getters: {
    // 獲取待儲存變更數量
    pendingChangesCount: (state) => state.pendingChanges.size,
    
    // 獲取工時類型名稱
    getWorkTypeName: (state) => (id) => {
      const workType = state.workTypes.find(wt => wt.id === id)
      return workType ? workType.name : ''
    }
  },
  
  actions: {
    // 設置當前週的週一日期
    setCurrentWeekStart(date) {
      const monday = getMonday(date instanceof Date ? date : new Date(date))
      console.log('[TimesheetStore] setCurrentWeekStart:', {
        inputDate: date,
        monday: monday,
        mondayDayOfWeek: monday.getDay(),
        mondayDate: monday.toISOString().split('T')[0]
      })
      this.currentWeekStart = monday
    },
    
    // 獲取當前用戶信息
    async fetchCurrentUser() {
      try {
        const response = await useAuthApi().checkSession()
        if (response && response.ok && response.data) {
          this.currentUser = response.data
          this.isAdmin = response.data.isAdmin || false
          return response.data
        }
        return null
      } catch (error) {
        console.error('獲取當前用戶失敗:', error)
        return null
      }
    },
    
    // 載入員工列表（僅管理員需要）
    async fetchUsers() {
      if (!this.isAdmin) {
        this.users = []
        return []
      }
      
      try {
        const response = await fetchAllUsers()
        
        // 處理響應格式
        const data = extractApiData(response, {})
        if (data.items && Array.isArray(data.items)) {
          this.users = data.items
        } else {
          this.users = extractApiArray(response, [])
        }
        
        return this.users
      } catch (error) {
        console.error('載入員工列表失敗:', error)
        this.users = []
        throw error
      }
    },
    
    // 設置選中的員工 ID
    setSelectedUserId(userId) {
      this.selectedUserId = userId
    },
    
    // 載入客戶列表
    async fetchClients() {
      try {
        const api = useTimesheetApi()
        const response = await api.fetchClients({ perPage: 1000 })
        
        // 處理響應格式
        const data = extractApiData(response, {})
        if (data.items && Array.isArray(data.items)) {
          this.clients = data.items
        } else {
          this.clients = extractApiArray(response, [])
        }
        
        return this.clients
      } catch (error) {
        console.error('載入客戶列表失敗:', error)
        this.clients = []
        throw error
      }
    },
    
    // 載入客戶的服務項目列表
    async fetchClientServices(clientId) {
      if (!clientId) return []
      
      // 檢查緩存
      if (this.clientServices.has(clientId)) {
        return this.clientServices.get(clientId)
      }
      
      try {
        const api = useTimesheetApi()
        const response = await api.fetchClientServices(clientId)
        
        // 處理響應格式
        const data = extractApiData(response, {})
        let services = []
        if (data.items && Array.isArray(data.items)) {
          services = data.items
        } else {
          services = extractApiArray(response, [])
        }
        
        // 存入緩存
        this.clientServices.set(clientId, services)
        return services
      } catch (error) {
        console.error(`載入客戶 ${clientId} 的服務項目失敗:`, error)
        return []
      }
    },
    
    // 載入客戶服務項目的任務類型列表（只返回已配置的任務類型）
    async fetchServiceItems(clientId, serviceId) {
      if (!clientId || !serviceId) return []
      
      const cacheKey = `${clientId}_${serviceId}`
      
      // 檢查緩存
      if (this.serviceItems.has(cacheKey)) {
        return this.serviceItems.get(cacheKey)
      }
      
      try {
        const api = useTimesheetApi()
        const response = await api.fetchServiceItems(clientId, serviceId)
        
        // 處理響應格式
        const data = extractApiData(response, {})
        let items = []
        if (data.items && Array.isArray(data.items)) {
          items = data.items
        } else {
          items = extractApiArray(response, [])
        }
        
        // 存入緩存
        this.serviceItems.set(cacheKey, items)
        return items
      } catch (error) {
        console.error(`載入客戶 ${clientId} 服務項目 ${serviceId} 的任務類型失敗:`, error)
        return []
      }
    },
    
    // 載入假日列表
    async fetchHolidays(startDate, endDate) {
      try {
        const api = useTimesheetApi()
        const start = formatDateISO(startDate)
        const end = formatDateISO(endDate)
        const response = await api.fetchHolidays({ start_date: start, end_date: end })
        
        // 處理響應格式
        const data = extractApiData(response, {})
        let holidays = []
        if (data.items && Array.isArray(data.items)) {
          holidays = data.items
        } else {
          holidays = extractApiArray(response, [])
        }
        
        // 存入 Map，以 ISO 日期為 key
        this.holidays.clear()
        holidays.forEach(holiday => {
          const date = holiday.date || holiday.holiday_date || holiday.iso
          if (date) {
            const iso = date.split('T')[0]
            this.holidays.set(iso, holiday)
          }
        })
        
        return holidays
      } catch (error) {
        console.error('載入假日列表失敗:', error)
        this.holidays.clear()
        throw error
      }
    },
    
    // 載入請假記錄列表
    async fetchLeaves(startDate, endDate) {
      try {
        const api = useTimesheetApi()
        const startStr = formatDateISO(startDate)
        const endStr = formatDateISO(endDate)
        const params = { dateFrom: startStr, dateTo: endStr, status: 'approved' }
        
        // 如果是管理員且選中了員工，添加 user_id 參數
        if (this.isAdmin && this.selectedUserId) {
          params.user_id = this.selectedUserId
        }
        
        const response = await api.fetchLeaves(params)
        
        // 處理響應格式
        const data = extractApiData(response, {})
        let leaves = []
        if (data.items && Array.isArray(data.items)) {
          leaves = data.items
        } else {
          leaves = extractApiArray(response, [])
        }
        
        // 存入 Map，以 ISO 日期為 key，按日期分組
        this.leaves.clear()
        const leavesByDate = new Map()
        
        leaves.forEach(leave => {
          // 只處理已批准的請假
          if (leave.status !== 'approved') return
          
          const startDateStr = leave.start || leave.start_date
          const endDateStr = leave.end || leave.end_date
          const leaveType = leave.type || leave.leave_type
          const amount = parseFloat(leave.amount || 0)
          const unit = leave.unit || 'hour'
          
          if (!startDateStr || !endDateStr) return
          
          // 將日期範圍展開為每一天
          const start = new Date(startDateStr + 'T00:00:00')
          const end = new Date(endDateStr + 'T00:00:00')
          
          // 計算總天數
          const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
          
          // 計算每天的時數
          let hoursPerDay = 0
          if (unit === 'day') {
            // 如果是按天計算，每天 8 小時
            hoursPerDay = daysDiff > 0 ? (amount * 8) / daysDiff : 0
          } else {
            // 如果是按小時計算，平均分配
            hoursPerDay = daysDiff > 0 ? amount / daysDiff : amount
          }
          
          // 遍歷每一天
          for (let i = 0; i < daysDiff; i++) {
            const currentDate = new Date(start)
            currentDate.setDate(start.getDate() + i)
            const dateStr = formatDateISO(currentDate)
            
            // 只處理在查詢範圍內的日期
            if (dateStr >= startStr && dateStr <= endStr) {
              if (!leavesByDate.has(dateStr)) {
                leavesByDate.set(dateStr, {
                  date: dateStr,
                  types: [],
                  hours: 0
                })
              }
              
              const dayLeave = leavesByDate.get(dateStr)
              dayLeave.types.push({
                type: leaveType,
                leave_type: leaveType,
                hours: hoursPerDay
              })
              dayLeave.hours += hoursPerDay
            }
          }
        })
        
        // 存入 this.leaves Map
        leavesByDate.forEach((value, key) => {
          this.leaves.set(key, value)
        })
        
        return Array.from(leavesByDate.values())
      } catch (error) {
        console.error('載入請假記錄失敗:', error)
        this.leaves.clear()
        throw error
      }
    },
    
    // 載入工時記錄列表
    async fetchTimesheets(startDate, endDate) {
      try {
        const api = useTimesheetApi()
        const start = formatDateISO(startDate)
        const end = formatDateISO(endDate)
        const params = { start_date: start, end_date: end }
        
        // 如果是管理員且選中了員工，添加 user_id 參數
        if (this.isAdmin && this.selectedUserId) {
          params.user_id = this.selectedUserId
        }
        
        console.log('[TimesheetStore] fetchTimesheets 參數:', params)
        const response = await api.fetchTimesheets(params)
        console.log('[TimesheetStore] fetchTimesheets 響應:', response)
        
        // 處理響應格式
        const data = extractApiData(response, {})
        if (data.items && Array.isArray(data.items)) {
          this.timesheets = data.items
        } else {
          this.timesheets = extractApiArray(response, [])
        }
        
        console.log('[TimesheetStore] fetchTimesheets 解析後的數據:', this.timesheets.length, '筆', this.timesheets)
        
        return this.timesheets
      } catch (error) {
        console.error('載入工時記錄失敗:', error)
        this.timesheets = []
        throw error
      }
    },
    
    // 載入月度統計數據
    async fetchMonthlySummary(month) {
      try {
        const api = useTimesheetApi()
        const response = await api.fetchMonthlySummary({ month })
        
        // 處理響應格式
        if (response.data) {
          this.monthlySummary = {
            totalHours: response.data.total_hours || response.data.totalHours || 0,
            overtimeHours: response.data.overtime_hours || response.data.overtimeHours || 0,
            weightedHours: response.data.weighted_hours || response.data.weightedHours || 0,
            leaveHours: response.data.leave_hours || response.data.leaveHours || 0
          }
        } else {
          this.monthlySummary = {
            totalHours: 0,
            overtimeHours: 0,
            weightedHours: 0,
            leaveHours: 0
          }
        }
        
        return this.monthlySummary
      } catch (error) {
        console.error('載入月度統計失敗:', error)
        this.monthlySummary = {
          totalHours: 0,
          overtimeHours: 0,
          weightedHours: 0,
          leaveHours: 0
        }
        throw error
      }
    },
    
    // 建立週日期數組
    buildWeekDays() {
      // 確保 currentWeekStart 是週一
      const monday = getMonday(this.currentWeekStart)
      console.log('[TimesheetStore] buildWeekDays:', {
        originalCurrentWeekStart: this.currentWeekStart,
        monday: monday,
        mondayDayOfWeek: monday.getDay(),
        mondayDate: monday.toISOString().split('T')[0]
      })
      this.currentWeekStart = monday
      this.weekDays = buildWeekDays(this.currentWeekStart, this.holidays)
      console.log('[TimesheetStore] weekDays:', this.weekDays.map(d => ({
        date: d.date,
        dayOfWeek: d.dayOfWeek,
        label: d.label
      })))
    },
    
    // 添加待儲存變更
    addPendingChange(rowIndex, dayIndex, value) {
      const key = `${rowIndex}_${dayIndex}`
      this.pendingChanges.set(key, {
        rowIndex,
        dayIndex,
        value,
        timestamp: Date.now()
      })
    },
    
    // 移除待儲存變更
    removePendingChange(rowIndex, dayIndex) {
      const key = `${rowIndex}_${dayIndex}`
      this.pendingChanges.delete(key)
    },
    
    // 清除所有待儲存變更
    clearPendingChanges() {
      this.pendingChanges.clear()
    },
    
    // 獲取待儲存變更數量
    getPendingChangesCount() {
      return this.pendingChanges.size
    },
    
    // 並行載入所有需要的數據
    async loadAllData() {
      this.loading = true
      this.error = null
      
      try {
        // 計算週的日期範圍
        const weekStart = this.currentWeekStart
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        // 計算當前月份（YYYY-MM）
        const currentMonth = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}`
        
        // 先獲取當前用戶信息（需要知道是否為管理員）
        await this.fetchCurrentUser()
        
        // 並行載入所有數據，使用 Promise.allSettled 確保部分失敗時仍能繼續
        const promises = [
          this.fetchClients(),
          this.fetchHolidays(weekStart, weekEnd),
          this.fetchLeaves(weekStart, weekEnd),
          this.fetchTimesheets(weekStart, weekEnd),
          this.fetchMonthlySummary(currentMonth)
        ]
        
        // 如果是管理員，同時載入員工列表
        let usersPromise = null
        if (this.isAdmin) {
          usersPromise = this.fetchUsers()
          promises.push(usersPromise)
        }
        
        const results = await Promise.allSettled(promises)
        
        // 設置預設選中的員工 ID（僅管理員需要）
        let needReloadTimesheets = false
        if (this.isAdmin && this.selectedUserId === null && this.users.length > 0) {
          // 管理員：預設選擇第一個員工
          const firstUser = this.users[0]
          this.selectedUserId = firstUser.user_id || firstUser.userId || firstUser.id
          needReloadTimesheets = true
        }
        
        // 員工不需要設置 selectedUserId，後端會自動根據當前登入用戶過濾
        
        // 如果設置了預設值，需要重新載入工時數據
        if (needReloadTimesheets) {
          await this.fetchTimesheets(weekStart, weekEnd)
        }
        
        // 檢查是否有錯誤
        const errors = results
          .map((result, index) => {
            if (result.status === 'rejected') {
              const apiNames = this.isAdmin 
                ? ['客戶列表', '假日列表', '請假記錄', '工時記錄', '月度統計', '員工列表']
                : ['客戶列表', '假日列表', '請假記錄', '工時記錄', '月度統計']
              return `${apiNames[index]}: ${result.reason?.message || '載入失敗'}`
            }
            return null
          })
          .filter(Boolean)
        
        if (errors.length > 0) {
          // 部分數據載入失敗，記錄錯誤但不阻止頁面顯示
          this.error = `部分數據載入失敗：${errors.join('；')}`
          console.warn('部分數據載入失敗:', errors)
        }
        
        // 建立週日期數組
        this.buildWeekDays()
        
        // 建立表格行數據
        this.buildRows()
        
        // 計算本週統計（從工時記錄中計算）
        this.calculateWeeklySummary()
        
      } catch (error) {
        // 處理未預期的錯誤
        this.error = error.message || '載入數據失敗'
        console.error('載入數據失敗:', error)
        // 不 throw error，讓頁面仍能顯示（即使沒有數據）
      } finally {
        this.loading = false
      }
    },
    
    // 計算本週統計
    calculateWeeklySummary() {
      const weekStart = formatDateISO(this.currentWeekStart)
      const weekEndDate = new Date(this.currentWeekStart)
      weekEndDate.setDate(this.currentWeekStart.getDate() + 6)
      const weekEnd = formatDateISO(weekEndDate)
      
      let totalHours = 0
      let overtimeHours = 0
      let weightedHours = 0
      let leaveHours = 0
      
      // 從 rows 計算工時統計（包含未保存的變更）
      this.rows.forEach(row => {
        const workTypeId = row.workTypeId || row.work_type_id
        const workType = this.workTypes.find(wt => wt.id === workTypeId)
        
        row.hours.forEach((hours, dayIndex) => {
          if (hours !== null && hours !== undefined && hours > 0) {
            const day = this.weekDays[dayIndex]
            if (day) {
              const workDate = day.date
              if (workDate && workDate >= weekStart && workDate <= weekEnd) {
                const h = parseFloat(hours || 0)
                totalHours += h
                
                if (workType && workType.isOvertime) {
                  overtimeHours += h
                }
                
                // 計算加權工時
                if (workType) {
                  const multiplier = workType.multiplier || 1.0
                  weightedHours += h * multiplier
                } else {
                  weightedHours += h
                }
              }
            }
          }
        })
      })
      
      // 計算請假時數
      this.weekDays.forEach(day => {
        const leave = this.leaves.get(day.date)
        if (leave) {
          const hours = parseFloat(leave.hours || leave.leave_hours || 0)
          leaveHours += hours
        }
      })
      
      this.weeklySummary = {
        totalHours: parseFloat(totalHours.toFixed(1)),
        overtimeHours: parseFloat(overtimeHours.toFixed(1)),
        weightedHours: parseFloat(weightedHours.toFixed(1)),
        leaveHours: parseFloat(leaveHours.toFixed(1))
      }
    },
    
    // 建立表格行數據（從 timesheets 轉換）
    buildRows() {
      const timesheetsLength = this.timesheets?.length || 0
      const weekDaysLength = this.weekDays?.length || 0
      const weekDaysDates = this.weekDays?.map(d => d.date) || []
      
      console.log('[TimesheetStore] buildRows 開始:', {
        timesheetsLength,
        weekDaysLength,
        weekDays: weekDaysDates
      })
      console.log('[TimesheetStore] buildRows timesheets 樣本:', this.timesheets?.slice(0, 3))
      
      if (!this.timesheets || this.timesheets.length === 0) {
        console.log('[TimesheetStore] buildRows: 沒有工時記錄，返回空陣列')
        this.rows = []
        return
      }
      
      const rowMap = new Map()
      
      let processedCount = 0
      let matchedCount = 0
      let unmatchedDates = []
      
      this.timesheets.forEach(timesheet => {
        processedCount++
        const userId = timesheet.user_id || timesheet.userId || this.currentUser?.user_id || this.currentUser?.id
        const userName = timesheet.user_name || timesheet.userName || this.currentUser?.name || '未知'
        const clientId = timesheet.client_id || timesheet.clientId
        const serviceId = timesheet.service_id || timesheet.serviceId
        const serviceItemId = timesheet.service_item_id || timesheet.serviceItemId
        const workTypeId = parseInt(timesheet.work_type || timesheet.workTypeId || 1)
        const workDate = timesheet.work_date || timesheet.workDate
        
        if (!workDate) {
          console.warn('[TimesheetStore] buildRows: 工時記錄缺少 work_date', timesheet)
          return
        }
        
        // 建立行的唯一 key（管理員模式下需要包含 user_id）
        const key = this.isAdmin
          ? `${userId}_${clientId}_${serviceId}_${serviceItemId}_${workTypeId}`
          : `${clientId}_${serviceId}_${serviceItemId}_${workTypeId}`
        
        if (!rowMap.has(key)) {
          const client = this.clients.find(c => {
            const id = c.id || c.client_id || c.clientId
            return id === clientId
          })
          const workType = this.workTypes.find(wt => wt.id === workTypeId)
          
          rowMap.set(key, {
            key,
            userId,
            userName,
            clientId,
            clientName: client ? (client.name || client.company_name || client.companyName || '') : '',
            serviceId,
            serviceName: timesheet.service_name || timesheet.serviceName || '',
            serviceItemId,
            serviceItemName: timesheet.service_item_name || timesheet.serviceItemName || '',
            workTypeId,
            workTypeName: workType ? workType.name : '',
            hours: new Array(7).fill(null),
            timesheetIds: new Array(7).fill(null)
          })
        }
        
        const row = rowMap.get(key)
        
        // 找到對應的日期索引
        const dayIndex = this.weekDays.findIndex(day => day.date === workDate)
        
        if (dayIndex >= 0 && dayIndex < 7) {
          // 累加同一天同一行的工時（不要覆蓋）
          const currentHours = row.hours[dayIndex] || 0
          const newHours = parseFloat(timesheet.hours || 0)
          row.hours[dayIndex] = currentHours + newHours
          
          // 如果有多筆記錄，timesheetIds 存儲為陣列（或只保留最後一筆的 ID）
          if (row.timesheetIds[dayIndex]) {
            // 如果已經有 ID，將其轉換為陣列或累加
            const existingId = row.timesheetIds[dayIndex]
            if (Array.isArray(existingId)) {
              row.timesheetIds[dayIndex].push(timesheet.timesheet_id || timesheet.timesheetId)
            } else {
              row.timesheetIds[dayIndex] = [existingId, timesheet.timesheet_id || timesheet.timesheetId]
            }
          } else {
            row.timesheetIds[dayIndex] = timesheet.timesheet_id || timesheet.timesheetId
          }
          matchedCount++
        } else {
          if (!unmatchedDates.includes(workDate)) {
            unmatchedDates.push(workDate)
          }
          console.warn('[TimesheetStore] buildRows: 找不到日期索引', {
            workDate,
            weekDays: this.weekDays?.map(d => d.date) || [],
            dayIndex,
            timesheet: {
              timesheet_id: timesheet.timesheet_id || timesheet.timesheetId,
              client_id: clientId,
              work_date: workDate
            }
          })
        }
      })
      
      this.rows = Array.from(rowMap.values())
      console.log('[TimesheetStore] buildRows 完成:', {
        processedCount,
        matchedCount,
        unmatchedCount: processedCount - matchedCount,
        unmatchedDates,
        rowsLength: this.rows.length,
        rowsCount: this.rows.length
      })
      
      // 顯示前 3 行作為樣本
      if (this.rows.length > 0) {
        console.log('[TimesheetStore] buildRows 行樣本:', this.rows.slice(0, 3).map(r => ({
          key: r.key,
          clientId: r.clientId,
          serviceId: r.serviceId,
          workTypeId: r.workTypeId,
          hours: [...r.hours],  // 展開 Proxy 陣列
          timesheetIds: [...r.timesheetIds]  // 展開 Proxy 陣列
        })))
      } else {
        console.warn('[TimesheetStore] buildRows: 構建後 rows 為空！', {
          timesheetsCount: this.timesheets.length,
          rowMapSize: rowMap.size
        })
      }
      
      // 檢查第一行的 hours 值
      if (this.rows.length > 0) {
        const firstRow = this.rows[0]
        console.log('[TimesheetStore] buildRows 第一行詳細信息:', {
          key: firstRow.key,
          clientId: firstRow.clientId,
          hours: [...firstRow.hours],
          timesheetIds: [...firstRow.timesheetIds],
          hoursLength: firstRow.hours.length,
          timesheetIdsLength: firstRow.timesheetIds.length
        })
      }
    },
    
    // 添加新行
    addNewRow() {
      const newRow = {
        key: `new_${Date.now()}_${Math.random()}`,
        userId: this.currentUser?.user_id || this.currentUser?.id || null,
        userName: this.currentUser?.name || '未知',
        clientId: null,
        clientName: '',
        serviceId: null,
        serviceName: '',
        serviceItemId: null,
        serviceItemName: '',
        workTypeId: null,
        workTypeName: '',
        hours: new Array(7).fill(null),
        timesheetIds: new Array(7).fill(null)
      }
      this.rows.push(newRow)
    },
    
    // 更新行的某個欄位
    updateRowField(rowIndex, field, value) {
      if (rowIndex < 0 || rowIndex >= this.rows.length) return
      
      const row = this.rows[rowIndex]
      row[field] = value
      
      // 如果更新客戶，清空服務項目和服務子項目
      if (field === 'clientId') {
        row.serviceId = null
        row.serviceName = ''
        row.serviceItemId = null
        row.serviceItemName = ''
        // 清除相關的 pending changes
        this.clearPendingChangesForRow(rowIndex)
      }
      
      // 如果更新服務項目，清空服務子項目
      if (field === 'serviceId') {
        row.serviceItemId = null
        row.serviceItemName = ''
        // 清除相關的 pending changes
        this.clearPendingChangesForRow(rowIndex)
      }
      
      // 如果更新工時類型，清除相關的 pending changes
      if (field === 'workTypeId') {
        this.clearPendingChangesForRow(rowIndex)
      }
    },
    
    // 更新行的某一天的工時
    updateRowHours(rowIndex, dayIndex, hours) {
      if (rowIndex < 0 || rowIndex >= this.rows.length) return
      if (dayIndex < 0 || dayIndex >= 7) return
      
      const row = this.rows[rowIndex]
      // 注意：這裡的 hours 是新的總值，不是增量
      row.hours[dayIndex] = hours
      
      // 記錄 pending change
      if (hours !== null && hours !== undefined && hours > 0) {
        const key = `${rowIndex}_${dayIndex}`
        this.pendingChanges.set(key, {
          rowIndex,
          dayIndex,
          value: hours,
          timestamp: Date.now()
        })
      } else {
        // 如果清空，也記錄為 pending change（用於刪除）
        const key = `${rowIndex}_${dayIndex}`
        this.pendingChanges.set(key, {
          rowIndex,
          dayIndex,
          value: null,
          timestamp: Date.now()
        })
      }
      
      // 重新計算本週統計
      this.calculateWeeklySummary()
    },
    
    // 移除指定行
    removeRow(rowIndex) {
      if (rowIndex < 0 || rowIndex >= this.rows.length) return
      
      // 清除相關的 pending changes
      this.clearPendingChangesForRow(rowIndex)
      
      // 移除行
      this.rows.splice(rowIndex, 1)
      
      // 重新計算本週統計
      this.calculateWeeklySummary()
    },
    
    // 清除指定行的所有 pending changes
    clearPendingChangesForRow(rowIndex) {
      const keysToDelete = []
      this.pendingChanges.forEach((change, key) => {
        if (change.rowIndex === rowIndex) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach(key => this.pendingChanges.delete(key))
    },
    
    // 批量驗證所有待儲存變更
    validateBeforeSave() {
      const errors = []
      const { validateHoursInput } = useTimesheetValidation()
      
      this.pendingChanges.forEach((change, key) => {
        const { rowIndex, dayIndex, value } = change
        const row = this.rows[rowIndex]
        const day = this.weekDays[dayIndex]
        
        if (!row || !day) return
        
        // 只驗證有值的變更
        if (value !== null && value !== undefined && value > 0) {
          const result = validateHoursInput({
            rowIndex,
            dayIndex,
            value,
            row,
            day,
            workTypes: this.workTypes,
            rows: this.rows,
            leaves: this.leaves
          })
          
          if (!result.valid) {
            errors.push({
              rowIndex,
              dayIndex,
              error: result.error
            })
          }
        }
      })
      
      return errors
    },
    
    // 保存工時記錄
    async saveTimesheets(payload) {
      this.loading = true
      this.error = null
      
      try {
        const api = useTimesheetApi()
        const response = await api.saveTimesheets(payload)
        
        // 清除 pending changes
        this.pendingChanges.clear()
        
        // 重新載入數據
        await this.loadAllData()
        
        return response
      } catch (error) {
        this.error = error.message || '儲存工時記錄失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除工時記錄
    async deleteTimesheet(timesheetId) {
      this.loading = true
      this.error = null
      
      try {
        const api = useTimesheetApi()
        const response = await api.deleteTimesheet(timesheetId)
        
        // 重新載入數據
        await this.loadAllData()
        
        return response
      } catch (error) {
        this.error = error.message || '刪除工時記錄失敗'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})

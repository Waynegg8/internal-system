import { defineStore } from 'pinia'
import { useDashboardApi } from '@/api/dashboard'
import { useAuthStore } from '@/stores/auth'
import { getCurrentYm } from '@/utils/formatters'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    dashboardData: null,
    currentYm: getCurrentYm(),
    financeMode: 'month',
    financeYm: getCurrentYm(),
    activityDays: 7,
    activityUserId: null,
    activityType: null,
    notices: [],
    alerts: [],
    dailySummary: null,
    alertsLoading: false,
    alertsError: null,
    alertsLastLoadedAt: null,
    loading: false,
    error: null
  }),
  
  getters: {
    // 從 auth store 獲取當前用戶
    currentUser() {
      const authStore = useAuthStore()
      return authStore.user
    },
    
    // 判斷是否為管理員
    isAdmin() {
      const authStore = useAuthStore()
      return authStore.isAdmin || this.currentUser?.isAdmin || false
    },
    
    // 獲取用戶角色
    userRole() {
      if (this.dashboardData?.role) {
        return this.dashboardData.role
      }
      return this.isAdmin ? 'admin' : 'employee'
    }
  },
  
  actions: {
    // 初始化當前年月
    initCurrentYm() {
      this.currentYm = getCurrentYm()
      this.financeYm = getCurrentYm()
    },
    
    // 獲取儀表板數據
    async fetchDashboardData(params = {}) {
      this.loading = true
      this.error = null
      try {
        // 根據用戶角色構建查詢參數
        const queryParams = {}
        
        if (this.isAdmin) {
          // 管理員參數
          if (this.currentYm) {
            queryParams.ym = this.currentYm
          }
          if (this.financeYm) {
            queryParams.financeYm = this.financeYm
          }
          if (this.financeMode) {
            queryParams.financeMode = this.financeMode
          }
          if (this.activityDays) {
            queryParams.activity_days = this.activityDays
          }
          if (this.activityUserId) {
            queryParams.activity_user_id = this.activityUserId
          }
          if (this.activityType) {
            queryParams.activity_type = this.activityType
          }
        }
        
        // 合併額外參數
        const finalParams = { ...queryParams, ...params }
        
        const response = await useDashboardApi().fetchDashboardData(finalParams)
        
        // 處理多種響應格式
        let data = null
        if (response && typeof response === 'object') {
          if (response.ok && response.data) {
            data = response.data
          } else if (response.data) {
            data = response.data
          } else if (!response.ok) {
            data = response
          }
        }
        
        this.dashboardData = data
        
        // 提取通知信息
        this.extractNotices(data)
        
        return response
      } catch (error) {
        this.error = error.message || '載入儀表板數據失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 提取通知信息
    extractNotices(data) {
      if (!data) {
        this.notices = []
        return
      }
      
      const notices = []
      const role = data.role || this.userRole
      
      if (role === 'admin') {
        // 管理員：逾期任務提醒
        const adminData = data.admin || {}
        const employeeTasks = adminData.employeeTasks || []
        const totalOverdue = employeeTasks.reduce((sum, emp) => {
          const overdue = emp.overdue || {}
          const overdueCount = typeof overdue === 'number' 
            ? overdue 
            : Object.values(overdue).reduce((s, n) => s + (n || 0), 0)
          return sum + overdueCount
        }, 0)
        
        if (totalOverdue > 0) {
          notices.push({
            level: 'warning',
            text: `全公司共有 ${totalOverdue} 個逾期任務`,
            link: '/tasks'
          })
        }
      } else {
        // 員工：緊急任務提醒
        const employeeData = data.employee || {}
        const myTasks = employeeData.myTasks || {}
        const tasks = Array.isArray(myTasks.items) ? myTasks.items : []
        const urgentTasks = tasks.filter(t => t.urgency === 'urgent' || t.urgency === 'overdue')
        
        if (urgentTasks.length > 0) {
          notices.push({
            level: 'info',
            text: `今天有 ${urgentTasks.length} 項任務即將到期`,
            link: '/tasks'
          })
        }
      }
      
      this.notices = notices
    },
    
    // 設置通知列表
    setNotices(notices) {
      this.notices = Array.isArray(notices) ? notices : []
    },

    // 清除通知
    clearNotices() {
      this.notices = []
    },

    // 設置當前年月
    setCurrentYm(ym) {
      this.currentYm = ym
    },
    
    // 設置財務模式
    setFinanceMode(mode) {
      this.financeMode = mode
    },
    
    // 設置財務年月
    setFinanceYm(ym) {
      this.financeYm = ym
    },
    
    // 設置活動篩選
    setActivityFilters(filters) {
      this.activityDays = filters.days !== undefined ? filters.days : this.activityDays
      this.activityUserId = filters.userId !== undefined ? filters.userId : this.activityUserId
      this.activityType = filters.type !== undefined ? filters.type : this.activityType
    },
    
    // 清除錯誤
    clearError() {
      this.error = null
    },

    // 取得儀表板提醒與摘要
    async fetchDashboardAlerts(params = {}) {
      const now = Date.now()
      if (this.alertsLastLoadedAt && !params.force) {
        const elapsed = now - this.alertsLastLoadedAt
        if (elapsed < 60 * 1000) {
          return null
        }
      }

      this.alertsLoading = true
      this.alertsError = null
      try {
        const scope = params.scope || (this.isAdmin ? 'all' : 'assigned')
        const response = await useDashboardApi().fetchDashboardAlerts({ scope })

        let data = null
        if (response && typeof response === 'object') {
          if (response.ok && response.data) {
            data = response.data
          } else if (response.data) {
            data = response.data
          } else if (!response.ok) {
            data = response
          }
        }

        if (data) {
          this.alerts = Array.isArray(data.realtimeAlerts) ? data.realtimeAlerts : []
          this.dailySummary = data.dailySummary || null
          this.alertsLastLoadedAt = now
        }

        return response
      } catch (error) {
        this.alertsError = error.message || '載入提醒資料失敗'
        throw error
      } finally {
        this.alertsLoading = false
      }
    }
  }
})


import { defineStore } from 'pinia'
import { useTaskApi } from '@/api/tasks'
import { extractApiArray, extractApiData } from '@/utils/apiHelpers'

const FILTER_STORAGE_KEY = 'taskOverview_filters'

export const useTaskOverviewStore = defineStore('taskOverview', {
  state: () => ({
    tasks: [],
    filters: {
      months: [],
      statuses: [],
      sources: [],
      search: ''
    },
    selectedMonths: [],
    expandedClients: new Set(),
    expandedServices: new Set(),
    batchSelectedTasks: new Set(),
    loading: false,
    error: null,
    lastUpdateTime: null
  }),

  getters: {
    // 將任務按客戶和服務分組
    groupedTasks(state) {
      const grouped = {}
      
      state.tasks.forEach(task => {
        const clientId = task.client_id || task.clientId
        const companyName = task.company_name || task.companyName
        const taxId = task.client_tax_id || task.tax_id || task.taxId
        
        if (!grouped[clientId]) {
          grouped[clientId] = {
            clientInfo: {
              clientId,
              companyName,
              taxId
            },
            services: {}
          }
        }
        
        const serviceName = task.service_name || task.serviceName || '未分類'
        const serviceMonth = task.service_month || task.serviceMonth
        const serviceKey = `${serviceName}_${serviceMonth}`
        
        if (!grouped[clientId].services[serviceKey]) {
          grouped[clientId].services[serviceKey] = {
            serviceInfo: {
              serviceName,
              serviceMonth
            },
            tasks: []
          }
        }
        
        grouped[clientId].services[serviceKey].tasks.push(task)
      })
      
      return grouped
    },

    // 計算統計數據
    stats(state) {
      const total = state.tasks.length
      const unfinished = state.tasks.filter(t => {
        const status = t.status || t.task_status
        return status === 'pending' || status === 'in_progress'
      }).length
      const completed = state.tasks.filter(t => {
        const status = t.status || t.task_status
        return status === 'completed'
      }).length
      const overdue = state.tasks.filter(t => {
        return t.is_overdue || t.isOverdue
      }).length
      const auto = state.tasks.filter(t => {
        return t.component_id || t.componentId
      }).length
      const manual = total - auto
      
      return {
        total,
        unfinished,
        completed,
        overdue,
        auto,
        manual
      }
    },

    // 獲取選中的任務數量
    selectedTaskCount(state) {
      return state.batchSelectedTasks.size
    },

    // 判斷任務是否已選中
    isTaskSelected: (state) => (taskId) => {
      return state.batchSelectedTasks.has(taskId)
    },

    // 判斷客戶是否已全部選中
    isClientSelected: (state) => (clientId) => {
      const clientTasks = state.tasks.filter(task => {
        const taskClientId = task.client_id || task.clientId
        return taskClientId === clientId
      })
      
      if (clientTasks.length === 0) return false
      
      return clientTasks.every(task => {
        const taskId = task.task_id || task.taskId || task.id
        return state.batchSelectedTasks.has(taskId)
      })
    },

    // 判斷服務是否已全部選中
    isServiceSelected: (state) => (serviceKey) => {
      const [serviceName, serviceMonth] = serviceKey.split('_')
      const serviceTasks = state.tasks.filter(task => {
        const taskServiceName = task.service_name || task.serviceName || '未分類'
        const taskServiceMonth = task.service_month || task.serviceMonth
        return taskServiceName === serviceName && taskServiceMonth === serviceMonth
      })
      
      if (serviceTasks.length === 0) return false
      
      return serviceTasks.every(task => {
        const taskId = task.task_id || task.taskId || task.id
        return state.batchSelectedTasks.has(taskId)
      })
    }
  },

  actions: {
    // 獲取任務總覽
    async fetchTaskOverview() {
      this.loading = true
      this.error = null
      
      try {
        // 構建查詢參數
        const params = {
          months: this.filters.months || [],
          statuses: this.filters.statuses || [],
          sources: this.filters.sources || [],
          search: this.filters.search || ''
        }
        
        const response = await useTaskApi().fetchTaskOverview(params)
        
        // 處理多種 API 響應格式
        const data = extractApiData(response, {})
        let tasks = []
        if (data.tasks && Array.isArray(data.tasks)) {
          tasks = data.tasks
        } else {
          tasks = extractApiArray(response, [])
        }
        
        this.tasks = tasks
        this.lastUpdateTime = new Date()
        
        return response
      } catch (error) {
        this.error = error.message || '載入任務總覽失敗'
        console.error('載入任務總覽失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 設置篩選條件
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
      // 保存到 localStorage
      try {
        localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(this.filters))
      } catch (err) {
        console.error('保存篩選條件失敗:', err)
      }
    },

    // 設置選中的月份
    setSelectedMonths(months) {
      this.selectedMonths = Array.isArray(months) ? months : []
    },

    // 切換客戶展開/折疊
    toggleClientExpanded(clientId) {
      if (this.expandedClients.has(clientId)) {
        this.expandedClients.delete(clientId)
      } else {
        this.expandedClients.add(clientId)
      }
    },

    // 切換服務展開/折疊
    toggleServiceExpanded(serviceKey) {
      if (this.expandedServices.has(serviceKey)) {
        this.expandedServices.delete(serviceKey)
      } else {
        this.expandedServices.add(serviceKey)
      }
    },

    // 全部展開/折疊客戶
    expandAllClients(expand) {
      if (expand) {
        // 展開所有客戶
        Object.keys(this.groupedTasks).forEach(clientId => {
          this.expandedClients.add(clientId)
        })
      } else {
        // 折疊所有客戶
        this.expandedClients.clear()
      }
    },

    // 只展開有逾期任務的客戶
    expandOnlyOverdue() {
      // 先折疊所有客戶
      this.expandedClients.clear()
      
      // 找出有逾期任務的客戶
      const overdueClientIds = new Set()
      this.tasks.forEach(task => {
        if (task.is_overdue || task.isOverdue) {
          const clientId = task.client_id || task.clientId
          if (clientId) {
            overdueClientIds.add(clientId)
          }
        }
      })
      
      // 展開有逾期任務的客戶
      overdueClientIds.forEach(clientId => {
        this.expandedClients.add(clientId)
      })
    },

    // 清除錯誤狀態
    clearError() {
      this.error = null
    },

    // 從 localStorage 恢復篩選條件
    restoreFilters() {
      try {
        const saved = localStorage.getItem(FILTER_STORAGE_KEY)
        if (saved) {
          const filters = JSON.parse(saved)
          this.filters = { ...this.filters, ...filters }
          if (filters.months) {
            this.selectedMonths = filters.months
          }
        }
      } catch (err) {
        console.error('恢復篩選條件失敗:', err)
      }
    },

    // 切換任務選擇
    toggleTaskSelection(taskId) {
      if (this.batchSelectedTasks.has(taskId)) {
        this.batchSelectedTasks.delete(taskId)
      } else {
        this.batchSelectedTasks.add(taskId)
      }
    },

    // 切換客戶選擇
    toggleClientSelection(clientId) {
      const clientTasks = this.tasks.filter(task => {
        const taskClientId = task.client_id || task.clientId
        return taskClientId === clientId
      })
      
      const taskIds = clientTasks.map(task => {
        return task.task_id || task.taskId || task.id
      })
      
      // 檢查是否全部選中
      const allSelected = taskIds.every(taskId => this.batchSelectedTasks.has(taskId))
      
      if (allSelected) {
        // 取消選擇所有任務
        taskIds.forEach(taskId => {
          this.batchSelectedTasks.delete(taskId)
        })
      } else {
        // 選中所有任務
        taskIds.forEach(taskId => {
          this.batchSelectedTasks.add(taskId)
        })
      }
    },

    // 切換服務選擇
    toggleServiceSelection(serviceKey) {
      const [serviceName, serviceMonth] = serviceKey.split('_')
      const serviceTasks = this.tasks.filter(task => {
        const taskServiceName = task.service_name || task.serviceName || '未分類'
        const taskServiceMonth = task.service_month || task.serviceMonth
        return taskServiceName === serviceName && taskServiceMonth === serviceMonth
      })
      
      const taskIds = serviceTasks.map(task => {
        return task.task_id || task.taskId || task.id
      })
      
      // 檢查是否全部選中
      const allSelected = taskIds.every(taskId => this.batchSelectedTasks.has(taskId))
      
      if (allSelected) {
        // 取消選擇所有任務
        taskIds.forEach(taskId => {
          this.batchSelectedTasks.delete(taskId)
        })
      } else {
        // 選中所有任務
        taskIds.forEach(taskId => {
          this.batchSelectedTasks.add(taskId)
        })
      }
    },

    // 清除所有批量選擇
    clearBatchSelection() {
      this.batchSelectedTasks.clear()
    },

    // 批量更新任務狀態
    async batchUpdateStatus(taskIds, status) {
      this.loading = true
      this.error = null
      
      try {
        await useTaskApi().batchUpdateTaskStatus(taskIds, status)
        await this.fetchTaskOverview()
        this.clearBatchSelection()
        return true
      } catch (error) {
        this.error = error.message || '批量更新狀態失敗'
        console.error('批量更新狀態失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 批量調整到期日
    async batchUpdateDueDate(taskIds, dueDate, reason) {
      this.loading = true
      this.error = null
      
      try {
        await useTaskApi().batchAdjustTaskDueDate(taskIds, dueDate, reason)
        await this.fetchTaskOverview()
        this.clearBatchSelection()
        return true
      } catch (error) {
        this.error = error.message || '批量調整到期日失敗'
        console.error('批量調整到期日失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 批量分配負責人
    async batchUpdateAssignee(taskIds, assigneeId) {
      this.loading = true
      this.error = null
      
      try {
        await useTaskApi().batchUpdateTaskAssignee(taskIds, assigneeId)
        await this.fetchTaskOverview()
        this.clearBatchSelection()
        return true
      } catch (error) {
        this.error = error.message || '批量分配負責人失敗'
        console.error('批量分配負責人失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 更新單個任務狀態
    async updateTaskStatus(taskId, status) {
      this.loading = true
      this.error = null
      
      try {
        await useTaskApi().updateTaskStatus(taskId, { status })
        await this.fetchTaskOverview()
        return true
      } catch (error) {
        this.error = error.message || '更新任務狀態失敗'
        console.error('更新任務狀態失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 調整單個任務到期日
    async adjustTaskDueDate(taskId, dueDate, reason) {
      this.loading = true
      this.error = null
      
      try {
        await useTaskApi().adjustTaskDueDate(taskId, {
          due_date: dueDate,
          due_date_reason: reason
        })
        await this.fetchTaskOverview()
        return true
      } catch (error) {
        this.error = error.message || '調整到期日失敗'
        console.error('調整到期日失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 記錄逾期原因
    async recordOverdueReason(taskId, reason) {
      this.loading = true
      this.error = null
      
      try {
        await useTaskApi().updateTask(taskId, {
          overdue_reason: reason
        })
        await this.fetchTaskOverview()
        return true
      } catch (error) {
        this.error = error.message || '記錄逾期原因失敗'
        console.error('記錄逾期原因失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})


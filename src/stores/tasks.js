import { defineStore } from 'pinia'
import { useTaskApi } from '@/api/tasks'
import { useClientApi } from '@/api/clients'
import { fetchAllUsers } from '@/api/users'
import { fetchAllTags } from '@/api/tags'
import { fetchAllSOPs } from '@/api/sop'
import { extractApiArray } from '@/utils/apiHelpers'

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    currentTask: null,
    currentTaskStages: [],
    taskSOPs: [],
    taskDocuments: [],
    currentTaskId: null,
    loading: false,
    error: null,
    stageUpdating: false,
    stageError: null,
    filters: {
      q: '',
      status: null,
      assignee: null,
      tags: null,
      service_year: null,
      service_month: null,
      due: null,
      hide_completed: false
    },
    // 支持數據
    allClients: [],
    allUsers: [],
    allTags: [],
    allSOPs: [],
    selectedTaskIds: []
  }),
  
  getters: {
    // 根據 ID 獲取任務
    getTaskById: (state) => (id) => {
      return state.tasks.find(task => {
        const taskId = task.id || task.taskId || task.task_id
        return taskId === id
      })
    }
  },
  
  actions: {
    // 獲取任務列表
    async fetchTasks(params = {}) {
      this.loading = true
      this.error = null
      try {
        // 構建查詢參數，過濾掉 null 和空值
        const queryParams = {}
        
        // 處理篩選條件
        if (this.filters.q) queryParams.q = this.filters.q
        if (this.filters.status) queryParams.status = this.filters.status
        if (this.filters.assignee) queryParams.assignee = this.filters.assignee
        if (this.filters.tags) queryParams.tags = this.filters.tags
        if (this.filters.service_year) queryParams.service_year = this.filters.service_year
        if (this.filters.service_month) queryParams.service_month = this.filters.service_month
        if (this.filters.due) queryParams.due = this.filters.due
        
        // 注意：hide_completed 不在這裡傳給後端，由前端處理
        // 這樣才能實現"顯示有未完成任務的組的所有任務"的邏輯
        
        const response = await useTaskApi().fetchTasks({
          perPage: 1000,
          ...queryParams,
          ...params
        })
        
        // 處理響應格式
        this.tasks = extractApiArray(response, [])
        
        return response
      } catch (error) {
        this.error = error.message || '載入任務失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取支持數據（客戶、用戶、標籤、SOP）
    async fetchSupportData() {
      try {
        const [clientsRes, usersRes, tagsRes, sopsRes] = await Promise.all([
          useClientApi().fetchClients({ perPage: 1000 }).catch(() => ({ data: [] })),
          fetchAllUsers().catch(() => ({ data: [] })),
          fetchAllTags().catch(() => ({ data: [] })),
          fetchAllSOPs({ perPage: 1000, scope: 'task' }).catch(() => ({ data: [] }))
        ])
        
        this.allClients = clientsRes.data || []
        this.allUsers = usersRes.data || []
        this.allTags = tagsRes.data || []
        this.allSOPs = sopsRes.data || []
      } catch (error) {
        console.error('載入支持數據失敗:', error)
        // 不拋出錯誤，允許部分數據載入失敗
      }
    },
    
    // 獲取任務詳情
    async fetchTaskDetail(taskId) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().fetchTaskDetail(taskId)
        // 處理響應格式
        this.currentTask = response.data || response
        this.currentTaskId = taskId
        const stages = (this.currentTask?.stages || []).map(stage => ({
          stageId: stage.stage_id,
          stageName: stage.stage_name,
          stageOrder: stage.stage_order,
          status: stage.status,
          startedAt: stage.started_at,
          completedAt: stage.completed_at,
          delayDays: stage.delay_days,
          triggeredAt: stage.triggered_at,
          triggeredBy: stage.triggered_by
        }))
        this.currentTaskStages = stages
        return response
      } catch (error) {
        this.error = error.message || '載入任務詳情失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新任務階段
    async updateTaskStage(taskId, stageId, data) {
      this.stageUpdating = true
      this.stageError = null
      try {
        await useTaskApi().updateTaskStageStatus(taskId, stageId, data)
        if (this.currentTaskId === taskId) {
          await this.fetchTaskDetail(taskId)
        }
      } catch (error) {
        this.stageError = error.message || '更新階段失敗'
        throw error
      } finally {
        this.stageUpdating = false
      }
    },
    
    // 創建任務
    async createTask(payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().createTask(payload)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新任務狀態
    async updateTaskStatus(taskId, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().updateTaskStatus(taskId, data)
        // 成功後刷新任務詳情
        if (this.currentTaskId === taskId) {
          await this.fetchTaskDetail(taskId)
        }
        return response
      } catch (error) {
        this.error = error.message || '更新任務狀態失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置篩選條件
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },
    
    // 設置選中的任務ID
    setSelectedTaskIds(ids) {
      this.selectedTaskIds = Array.isArray(ids) ? ids : []
    },
    
    // 清除選中的任務ID
    clearSelectedTaskIds() {
      this.selectedTaskIds = []
    },
    
    // 批量更新任務負責人
    async batchUpdateTaskAssignee(taskIds, assigneeUserId) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().batchUpdateTaskAssignee(taskIds, assigneeUserId)
        // 成功後刷新任務列表
        await this.fetchTasks()
        return response
      } catch (error) {
        this.error = error.message || '批量分配失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新任務負責人
    async updateTaskAssignee(taskId, assigneeUserId) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().updateTaskAssignee(taskId, assigneeUserId)
        // 如果當前任務是正在查看的任務，更新當前任務
        if (this.currentTask && (this.currentTask.id === taskId || this.currentTask.taskId === taskId || this.currentTask.task_id === taskId)) {
          this.currentTask = { ...this.currentTask, assignee_user_id: assigneeUserId }
        }
        return response
      } catch (error) {
        this.error = error.message || '更新負責人失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取任務 SOP
    async fetchTaskSOPs(taskId) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().fetchTaskSOPs(taskId)
        // 處理響應格式
        this.taskSOPs = response.data || response || []
        return response
      } catch (error) {
        this.error = error.message || '載入任務 SOP 失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新任務 SOP
    async updateTaskSOPs(taskId, sopIds) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().updateTaskSOPs(taskId, sopIds)
        // 成功後刷新任務 SOP 列表
        await this.fetchTaskSOPs(taskId)
        return response
      } catch (error) {
        this.error = error.message || '更新任務 SOP 失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取任務文檔
    async fetchTaskDocuments(taskId) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().fetchTaskDocuments(taskId)
        // 處理響應格式
        const data = response.data || response
        this.taskDocuments = Array.isArray(data) ? data : (data?.items || [])
        return response
      } catch (error) {
        this.error = error.message || '載入任務文檔失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 上傳任務文檔
    async uploadTaskDocument(taskId, file, onProgress) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().uploadTaskDocument(taskId, file, onProgress)
        // 成功後刷新任務文檔列表
        await this.fetchTaskDocuments(taskId)
        return response
      } catch (error) {
        this.error = error.message || '上傳文檔失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除任務文檔
    async deleteTaskDocument(taskId, documentId) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().deleteTaskDocument(taskId, documentId)
        // 成功後刷新任務文檔列表
        if (taskId) {
          await this.fetchTaskDocuments(taskId)
        }
        return response
      } catch (error) {
        this.error = error.message || '刪除文檔失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 調整任務到期日
    async adjustTaskDueDate(taskId, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().adjustTaskDueDate(taskId, data)
        // 成功後刷新任務詳情
        if (this.currentTaskId === taskId) {
          await this.fetchTaskDetail(taskId)
        }
        return response
      } catch (error) {
        this.error = error.message || '調整到期日失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取任務變更歷史
    async fetchTaskAdjustmentHistory(taskId) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().fetchTaskAdjustmentHistory(taskId)
        // 處理響應格式
        return response.data || response || []
      } catch (error) {
        this.error = error.message || '載入變更歷史失敗'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})


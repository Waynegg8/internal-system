import request from './request'
import { extractApiData, extractApiObject, extractApiArray } from '@/utils/apiHelpers'
import { getApiBase } from '@/utils/api'

/**
 * 任務相關 API
 */
export function useTaskApi() {
  // 任務列表
  const fetchTasks = async (params = {}) => {
    // 如果明確請求觸發生成，添加 trigger_generation 參數
    if (params.trigger_generation) {
      params.trigger_generation = '1'
    }
    const response = await request.get('/tasks', { params })
    return response
  }

  // 任務詳情
  const fetchTaskDetail = async (taskId) => {
    const response = await request.get(`/tasks/${taskId}`)
    return response
  }

  // 創建任務
  const createTask = async (payload) => {
    const response = await request.post('/tasks', payload)
    return response
  }

  // 更新任務
  const updateTask = async (taskId, data) => {
    const response = await request.put(`/tasks/${taskId}`, data)
    return response
  }

  // 更新任務狀態
  const updateTaskStatus = async (taskId, data) => {
    const response = await request.put(`/tasks/${taskId}/status`, data)
    return response
  }

  // 更新任務負責人
  const updateTaskAssignee = async (taskId, assigneeUserId) => {
    const response = await request.put(`/tasks/${taskId}/assignee`, {
      assignee_user_id: assigneeUserId
    })
    return response
  }

  // 調整任務到期日
  const adjustTaskDueDate = async (taskId, data) => {
    const response = await request.put(`/tasks/${taskId}/due-date`, data)
    return response
  }

  // 刪除任務
  const deleteTask = async (taskId) => {
    const response = await request.delete(`/tasks/${taskId}`)
    return response
  }

  // 任務 SOP
  const fetchTaskSOPs = async (taskId) => {
    const response = await request.get(`/tasks/${taskId}/sops`)
    return response
  }

  const updateTaskSOPs = async (taskId, sopIds) => {
    const response = await request.put(`/tasks/${taskId}/sops`, { sop_ids: sopIds })
    return response
  }

  // 任務文檔
  const fetchTaskDocuments = async (taskId) => {
    const response = await request.get(`/tasks/${taskId}/documents`)
    return response
  }

  const uploadTaskDocument = async (taskId, file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await request.post(`/tasks/${taskId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress
    })
    return response
  }

  const deleteTaskDocument = async (taskId, documentId) => {
    const response = await request.delete(`/tasks/${taskId}/documents/${documentId}`)
    return response
  }

  const downloadTaskDocument = async (taskId, documentId) => {
    const response = await fetch(`${getApiBase()}/tasks/${taskId}/documents/${documentId}/download`, {
      credentials: 'include'
    })
    
    if (!response.ok) {
      // 嘗試讀取錯誤信息
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || '下載失敗')
      }
      throw new Error(`下載失敗: ${response.status} ${response.statusText}`)
    }
    
    // 檢查響應類型
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      // 如果返回的是 JSON，可能是錯誤響應
      const data = await response.json()
      throw new Error(data.message || data.error || '下載失敗：伺服器返回了 JSON 響應')
    }
    
    return await response.blob()
  }

  const deleteDocument = async (documentId) => {
    const response = await request.delete(`/documents/${documentId}`)
    return response
  }

  // 任務變更歷史
  const fetchTaskAdjustmentHistory = async (taskId) => {
    const response = await request.get(`/tasks/${taskId}/adjustment-history`)
    return response
  }

  // 任務總覽
  const fetchTaskOverview = async (params = {}) => {
    const response = await request.get('/tasks/overview', { params })
    return response
  }

  // 任務生成預覽（增強版，完整月份視圖）
  const fetchTaskGenerationPreview = async (params = {}) => {
    const response = await request.get('/admin/tasks/generate/preview', { params })
    return response
  }

  // 獲取任務生成歷史
  const fetchTaskGenerationHistory = async (params = {}) => {
    const response = await request.get('/admin/tasks/generate/history', { params })
    return response
  }

  // 批量操作
  const batchUpdateTaskStatus = async (taskIds, status) => {
    const response = await request.post('/tasks/batch-update-status', {
      task_ids: taskIds,
      status
    })
    return response
  }

  const batchAdjustTaskDueDate = async (taskIds, newDate, reason) => {
    const response = await request.post('/tasks/batch-adjust-due-date', {
      task_ids: taskIds,
      new_date: newDate,
      reason
    })
    return response
  }

  const batchUpdateTaskAssignee = async (taskIds, assigneeId) => {
    const response = await request.post('/tasks/batch-update-assignee', {
      task_ids: taskIds,
      assignee_user_id: assigneeId
    })
    return response
  }

  // 任務依賴
  const updateTaskDueDate = async (taskId, dueDate) => {
    const response = await request.put(`/tasks/${taskId}/due-date`, { due_date: dueDate })
    return response
  }

  const updateTaskStageStatus = async (taskId, stageId, data) => {
    const response = await request.put(`/tasks/${taskId}/stages/${stageId}`, data)
    return response
  }

  // 獲取任務統計摘要
  const getTasksStats = async (params = {}) => {
    try {
      const response = await request.get('/tasks/stats', { params })
      return extractApiObject(response, {
        total: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
        can_start: 0
      })
    } catch (error) {
      console.error('[Tasks API] getTasksStats error:', error)
      throw error
    }
  }

  // 批量更新任務
  const batchUpdateTasks = async (payload) => {
    try {
      const response = await request.post('/tasks/batch', payload)
      return extractApiObject(response, {
        total: 0,
        success: 0,
        failed: 0,
        details: {
          success: [],
          failed: []
        }
      })
    } catch (error) {
      console.error('[Tasks API] batchUpdateTasks error:', error)
      throw error
    }
  }

  // 獲取預設日期範圍
  const getDefaultDateRange = async () => {
    try {
      const response = await request.get('/tasks/default-date-range')
      return extractApiObject(response, {
        start_month: null,
        end_month: null
      })
    } catch (error) {
      console.error('[Tasks API] getDefaultDateRange error:', error)
      // 如果 API 不存在，返回 null（前端可以計算）
      if (error.response?.status === 404) {
        return { start_month: null, end_month: null }
      }
      throw error
    }
  }

  // 生成一次性服務任務
  const generateTasksForOneTimeService = async (clientServiceId, serviceMonth = null) => {
    try {
      const payload = {
        client_service_id: clientServiceId
      }
      if (serviceMonth) {
        payload.service_month = serviceMonth // 格式：YYYY-MM
      }
      const response = await request.post('/tasks/generate/one-time', payload)
      return extractApiData(response, {
        generated: 0,
        skipped: 0,
        errors: []
      })
    } catch (error) {
      console.error('[Tasks API] generateTasksForOneTimeService error:', error)
      throw error
    }
  }

  return {
    fetchTasks,
    fetchTaskDetail,
    createTask,
    updateTask,
    updateTaskStatus,
    updateTaskAssignee,
    adjustTaskDueDate,
    deleteTask,
    fetchTaskSOPs,
    updateTaskSOPs,
    fetchTaskDocuments,
    uploadTaskDocument,
    deleteTaskDocument,
    downloadTaskDocument,
    deleteDocument,
    fetchTaskAdjustmentHistory,
    fetchTaskOverview,
    batchUpdateTaskStatus,
    batchAdjustTaskDueDate,
    batchUpdateTaskAssignee,
    updateTaskDueDate,
    updateTaskStageStatus,
    getTasksStats,
    batchUpdateTasks,
    getDefaultDateRange,
    generateTasksForOneTimeService,
    fetchTaskGenerationHistory,
    fetchTaskGenerationPreview
  }
}


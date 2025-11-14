import request from './request'

/**
 * 任務相關 API
 */
export function useTaskApi() {
  // 任務列表
  const fetchTasks = async (params = {}) => {
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
    deleteDocument,
    fetchTaskAdjustmentHistory,
    fetchTaskOverview,
    batchUpdateTaskStatus,
    batchAdjustTaskDueDate,
    batchUpdateTaskAssignee,
    updateTaskDueDate,
    updateTaskStageStatus
  }
}


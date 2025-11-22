import request from './request'

/**
 * 任務配置相關 API（重構版 - 移除服務組件概念）
 */

// 獲取客戶服務的任務配置列表
export const fetchTaskConfigs = async (clientId, serviceId) => {
  const response = await request.get(`/clients/${clientId}/services/${serviceId}/task-configs`)
  return response
}

// 創建任務配置
export const createTaskConfig = async (clientId, serviceId, data) => {
  const response = await request.post(`/clients/${clientId}/services/${serviceId}/task-configs`, data)
  return response
}

// 更新任務配置
export const updateTaskConfig = async (clientId, serviceId, configId, data) => {
  const response = await request.put(`/clients/${clientId}/services/${serviceId}/task-configs/${configId}`, data)
  return response
}

// 刪除任務配置
export const deleteTaskConfig = async (clientId, serviceId, configId) => {
  const response = await request.delete(`/clients/${clientId}/services/${serviceId}/task-configs/${configId}`)
  return response
}

// 批量保存任務配置
export const batchSaveTaskConfigs = async (clientId, serviceId, data) => {
  const response = await request.post(`/clients/${clientId}/services/${serviceId}/task-configs/batch`, data)
  return response
}

// Composable 函數
export function useTaskConfigApi() {
  return {
    fetchTaskConfigs,
    createTaskConfig,
    updateTaskConfig,
    deleteTaskConfig,
    batchSaveTaskConfigs
  }
}













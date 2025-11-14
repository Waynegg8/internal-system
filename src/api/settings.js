import request from './request'
import { checkSession } from './auth'

/**
 * 系統設定相關 API
 * 注意：獲取當前用戶應該從 auth.js 導入
 */
export function useSettingsApi() {
  // 服務項目
  const getServices = async () => {
    const response = await request.get('/settings/services')
    return response
  }

  const getServiceById = async (serviceId) => {
    const response = await request.get(`/settings/services/${serviceId}`)
    return response
  }

  const createService = async (data) => {
    const response = await request.post('/settings/services', data)
    return response
  }

  const updateService = async (serviceId, data) => {
    const response = await request.put(`/settings/services/${serviceId}`, data)
    return response
  }

  const deleteService = async (serviceId) => {
    const response = await request.delete(`/settings/services/${serviceId}`)
    return response
  }

  const getServiceSOPs = async () => {
    const response = await request.get('/settings/services/sops')
    return response
  }

  // 服務子項目（任務類型）
  const getServiceItems = async (serviceId) => {
    const response = await request.get(`/settings/services/${serviceId}/items`)
    return response
  }

  const createServiceItem = async (serviceId, data) => {
    const response = await request.post(`/settings/services/${serviceId}/items`, data)
    return response
  }

  const updateServiceItem = async (serviceId, itemId, data) => {
    const response = await request.put(`/settings/services/${serviceId}/items/${itemId}`, data)
    return response
  }

  const deleteServiceItem = async (serviceId, itemId) => {
    const response = await request.delete(`/settings/services/${serviceId}/items/${itemId}`)
    return response
  }

  // 任務模板
  const getTaskTemplates = async () => {
    const response = await request.get('/settings/task-templates')
    return response
  }

  const getTaskTemplateById = async (templateId) => {
    const response = await request.get(`/settings/task-templates/${templateId}`)
    return response
  }

  const createTaskTemplate = async (data) => {
    const response = await request.post('/settings/task-templates', data)
    return response
  }

  const updateTaskTemplate = async (templateId, data) => {
    const response = await request.put(`/settings/task-templates/${templateId}`, data)
    return response
  }

  const deleteTaskTemplate = async (templateId) => {
    const response = await request.delete(`/settings/task-templates/${templateId}`)
    return response
  }

  const getTemplateStages = async (templateId) => {
    const response = await request.get(`/settings/task-templates/${templateId}/stages`)
    return response
  }

  const createTemplateStage = async (templateId, data) => {
    const response = await request.post(`/settings/task-templates/${templateId}/stages`, data)
    return response
  }

  const updateTemplateStage = async (templateId, stageId, data) => {
    const response = await request.put(`/settings/task-templates/${templateId}/stages/${stageId}`, data)
    return response
  }

  const deleteTemplateStage = async (templateId, stageId) => {
    const response = await request.delete(`/settings/task-templates/${templateId}/stages/${stageId}`)
    return response
  }

  // 用戶
  const getUsers = async () => {
    const response = await request.get('/settings/users')
    return response
  }

  const getUserById = async (userId) => {
    const response = await request.get(`/settings/users/${userId}`)
    return response
  }

  const createUser = async (data) => {
    const response = await request.post('/settings/users', data)
    return response
  }

  const updateUser = async (userId, data) => {
    const response = await request.put(`/settings/users/${userId}`, data)
    return response
  }

  const deleteUser = async (userId) => {
    const response = await request.delete(`/settings/users/${userId}`)
    return response
  }

  const resetUserPassword = async (userId, newPassword) => {
    const response = await request.post(`/settings/users/${userId}/reset-password`, {
      new_password: newPassword
    })
    return response
  }

  const getUserPassword = async (userId) => {
    const response = await request.get(`/settings/users/${userId}/password`)
    return response
  }

  const updateMyProfile = async (data) => {
    // 需要先從 auth.js 獲取當前用戶
    const userResponse = await checkSession()
    if (!userResponse.ok) {
      throw new Error('請先登入')
    }
    const userId = userResponse.data.id
    const response = await request.put(`/settings/users/${userId}`, data)
    return response
  }

  // 公司資訊
  const getCompanySettings = async (setNumber) => {
    const response = await request.get(`/settings/company/${setNumber}`)
    return response
  }

  const saveCompanySettings = async (setNumber, settings) => {
    const response = await request.put(`/settings/company/${setNumber}`, settings)
    return response
  }

  // 自動化規則
  const getAutoGenerateComponents = async () => {
    const response = await request.get('/settings/automation/components')
    return response
  }

  const getComponentTasks = async (componentId) => {
    const response = await request.get(`/settings/automation/components/${componentId}/tasks`)
    return response
  }

  const previewNextMonthTasks = async (targetMonth) => {
    const response = await request.get('/settings/automation/preview', {
      params: { target_month: targetMonth }
    })
    return response
  }

  // 國定假日
  const getHolidays = async () => {
    const response = await request.get('/settings/holidays')
    return response
  }

  const createHoliday = async (data) => {
    const response = await request.post('/settings/holidays', data)
    return response
  }

  const updateHoliday = async (date, data) => {
    const response = await request.put(`/settings/holidays/${date}`, data)
    return response
  }

  const deleteHoliday = async (date) => {
    const response = await request.delete(`/settings/holidays/${date}`)
    return response
  }

  const batchCreateHolidays = async (holidays) => {
    const response = await request.post('/settings/holidays/batch', holidays)
    return response
  }

  // 通用
  const getSOPs = async (scope) => {
    const response = await request.get('/settings/sops', {
      params: { scope }
    })
    return response
  }

  const getClients = async () => {
    const response = await request.get('/clients?per_page=1000')
    return response
  }

  const getDocuments = async (category) => {
    const response = await request.get('/settings/documents', {
      params: { category }
    })
    return response
  }

  const getSettings = async (category) => {
    const response = await request.get(`/settings/${category}`)
    return response
  }

  const batchUpdateSettings = async (category, settings) => {
    const response = await request.put(`/settings/${category}`, settings)
    return response
  }

  return {
    getServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    getServiceSOPs,
    getServiceItems,
    createServiceItem,
    updateServiceItem,
    deleteServiceItem,
    getTaskTemplates,
    getTaskTemplateById,
    createTaskTemplate,
    updateTaskTemplate,
    deleteTaskTemplate,
    getTemplateStages,
    createTemplateStage,
    updateTemplateStage,
    deleteTemplateStage,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    getUserPassword,
    updateMyProfile,
    getCompanySettings,
    saveCompanySettings,
    getAutoGenerateComponents,
    getComponentTasks,
    previewNextMonthTasks,
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    batchCreateHolidays,
    getSOPs,
    getClients,
    getDocuments,
    getSettings,
    batchUpdateSettings
  }
}

// 導出 checkSession 供其他模塊使用
export { checkSession }


import request from './request'

/**
 * 客戶相關 API - BR1.1 客戶列表管理
 */

// BR1.1 任務所需的 API 函數

/**
 * 獲取客戶列表 - BR1.1.1, BR1.1.2, BR1.1.3
 */
export const getClients = async (params = {}) => {
  const response = await request.get('/clients', { params })
  return response
}

/**
 * 批量移轉客戶負責人 - BR1.1.5
 */
export const batchTransferAssignee = async (payload) => {
  const response = await request.post('/clients/batch-assign', payload)
  return response
}

/**
 * 刪除客戶 - BR1.1.6
 */
export const deleteClient = async (clientId) => {
  const response = await request.delete(`/clients/${clientId}`)
  return response
}

export const fetchAllClients = async (params = {}) => {
  const response = await request.get('/clients', { params: { ...params, perPage: params.perPage || 1000 } })
  return response
}

export const updateClientTags = async (clientId, tagIds) => {
  const response = await request.put(`/clients/${clientId}/tags`, { tag_ids: tagIds })
  return response
}

export const createClientService = async (clientId, data) => {
  const response = await request.post(`/clients/${clientId}/services`, data)
  return response
}

export const updateClientService = async (clientId, serviceId, data) => {
  const response = await request.put(`/clients/${clientId}/services/${serviceId}`, data)
  return response
}

export const deleteClientService = async (clientId, serviceId) => {
  const response = await request.delete(`/clients/${clientId}/services/${serviceId}`)
  return response
}

// Composable 函數（向後兼容）
export function useClientApi() {
  // 客戶列表
  const fetchClients = async (params = {}) => {
    const response = await request.get('/clients', { params })
    return response
  }

  // 客戶詳情
  const fetchClientDetail = async (clientId) => {
    const response = await request.get(`/clients/${clientId}`)
    return response
  }

  // 創建客戶
  const createClient = async (payload) => {
    const response = await request.post('/clients', payload)
    return response
  }

  // 更新客戶
  const updateClient = async (clientId, data) => {
    const response = await request.put(`/clients/${clientId}`, data)
    return response
  }

  // 刪除客戶
  const deleteClient = async (clientId) => {
    const response = await request.delete(`/clients/${clientId}`)
    return response
  }

  // 客戶服務
  const fetchClientServices = async (clientId) => {
    // 服務列表包含在客戶詳情中
    const response = await request.get(`/clients/${clientId}`)
    return response
  }

  const createClientService = async (clientId, data) => {
    const response = await request.post(`/clients/${clientId}/services`, data)
    return response
  }

  const updateClientService = async (clientId, serviceId, data) => {
    const response = await request.put(`/clients/${clientId}/services/${serviceId}`, data)
    return response
  }

  const deleteClientService = async (clientId, serviceId) => {
    const response = await request.delete(`/clients/${clientId}/services/${serviceId}`)
    return response
  }

  // 客戶標籤
  const updateClientTags = async (clientId, tagIds) => {
    const response = await request.put(`/clients/${clientId}/tags`, { tag_ids: tagIds })
    return response
  }

  // 批量操作
  const batchAssignClients = async (payload) => {
    const response = await request.post('/clients/batch-assign', payload)
    return response
  }

  const previewMigrateClients = async (params) => {
    // 快速移轉使用 batch-assign 端點，帶 dry_run 參數
    const response = await request.post('/clients/batch-assign', {
      ...params,
      dry_run: true
    })
    return response
  }

  const migrateClients = async (params) => {
    // 快速移轉使用 batch-assign 端點
    const response = await request.post('/clients/batch-assign', params)
    return response
  }

  // 工具函數
  const getNextPersonalClientId = async () => {
    const response = await request.get('/clients/next-personal-id')
    return response
  }

  // 協作人員管理
  const getCollaborators = async (clientId) => {
    const response = await request.get(`/clients/${clientId}/collaborators`)
    return response
  }

  const addCollaborator = async (clientId, userId) => {
    const response = await request.post(`/clients/${clientId}/collaborators`, { user_id: userId })
    return response
  }

  const removeCollaborator = async (clientId, collaborationId) => {
    const response = await request.delete(`/clients/${clientId}/collaborators/${collaborationId}`)
    return response
  }

  return {
    fetchClients,
    fetchClientDetail,
    createClient,
    updateClient,
    deleteClient,
    fetchClientServices,
    createClientService,
    updateClientService,
    deleteClientService,
    updateClientTags,
    batchAssignClients,
    previewMigrateClients,
    migrateClients,
    getNextPersonalClientId,
    getCollaborators,
    addCollaborator,
    removeCollaborator
  }
}


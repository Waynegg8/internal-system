import request from './request'

/**
 * 服務相關 API
 */

// 直接導出的函數（用於組件中直接導入）
export const fetchAllServices = async () => {
  const response = await request.get('/services?per_page=1000')
  return response
}

export const fetchServiceItems = async () => {
  const response = await request.get('/services/items')
  return response
}

// Composable 函數（向後兼容）
export function useServiceApi() {
  // 服務列表
  const fetchServices = async () => {
    const response = await request.get('/services')
    return response
  }

  const fetchAllServices = async () => {
    const response = await request.get('/services?per_page=1000')
    return response
  }

  // 服務項目
  const fetchServiceItems = async () => {
    const response = await request.get('/services/items')
    return response
  }

  // 客戶服務
  const fetchClientServices = async (clientId) => {
    const response = await request.get(`/clients/${clientId}/services`)
    return response
  }

  return {
    fetchServices,
    fetchAllServices,
    fetchServiceItems,
    fetchClientServices
  }
}


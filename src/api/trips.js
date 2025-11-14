import request from './request'
import { checkSession } from './auth'

/**
 * 外出登記相關 API
 * 注意：獲取當前用戶應該從 auth.js 導入
 */
export function useTripApi() {
  // 用戶列表（管理員用）
  const getUsers = async () => {
    const response = await request.get('/users')
    return response
  }

  // 客戶列表
  const getClients = async () => {
    const response = await request.get('/clients?per_page=1000')
    return response
  }

  // 外出登記
  const getTrips = async (params = {}) => {
    const response = await request.get('/trips', { params })
    return response
  }

  const getTripsSummary = async (params = {}) => {
    const response = await request.get('/trips/summary', { params })
    return response
  }

  const createTrip = async (data) => {
    const response = await request.post('/trips', data)
    return response
  }

  const updateTrip = async (tripId, data) => {
    const response = await request.put(`/trips/${tripId}`, data)
    return response
  }

  const deleteTrip = async (tripId) => {
    const response = await request.delete(`/trips/${tripId}`)
    return response
  }

  return {
    getUsers,
    getClients,
    getTrips,
    getTripsSummary,
    createTrip,
    updateTrip,
    deleteTrip
  }
}

// 導出 checkSession 供其他模塊使用
export { checkSession }


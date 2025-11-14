import request from './request'

/**
 * 用戶相關 API
 * 注意：獲取當前用戶應該從 auth.js 導入
 */

// 直接導出的函數（用於組件中直接導入）
export const fetchAllUsers = async () => {
  const response = await request.get('/users?per_page=1000')
  return response
}

// Composable 函數（向後兼容）
export function useUserApi() {
  // 用戶列表
  const fetchUsers = async () => {
    const response = await request.get('/users')
    return response
  }

  const fetchAllUsers = async () => {
    const response = await request.get('/users?per_page=1000')
    return response
  }

  // 用戶詳情
  const fetchUserDetail = async (userId) => {
    const response = await request.get(`/users/${userId}`)
    return response
  }

  return {
    fetchUsers,
    fetchAllUsers,
    fetchUserDetail
  }
}


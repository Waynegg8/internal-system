import request from './request'

/**
 * SOP 相關 API
 */

// 直接導出的函數（用於組件中直接導入）
export const fetchAllSOPs = async (params = {}) => {
  const response = await request.get('/sop', { params })
  return response
}

// Composable 函數（向後兼容）
export function useSopApi() {
  return {
    fetchAllSOPs
  }
}


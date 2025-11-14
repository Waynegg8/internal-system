import request from './request'

/**
 * 標籤相關 API
 */

// 直接導出的函數（用於組件中直接導入）
export const fetchAllTags = async () => {
  const response = await request.get('/tags?per_page=1000')
  return response
}

export const createTag = async (data) => {
  const response = await request.post('/tags', data)
  return response
}

export const updateTag = async (tagId, data) => {
  const response = await request.put(`/tags/${tagId}`, data)
  return response
}

export const deleteTag = async (tagId) => {
  const response = await request.delete(`/tags/${tagId}`)
  return response
}

export const fetchTags = async () => {
  const response = await request.get('/tags')
  return response
}

// Composable 函數（向後兼容）
export function useTagApi() {
  return {
    fetchTags,
    fetchAllTags,
    createTag,
    updateTag,
    deleteTag
  }
}


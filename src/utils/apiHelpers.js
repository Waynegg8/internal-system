/**
 * API 响应处理工具函数
 * 用于统一处理不同格式的 API 响应
 */

/**
 * 从 API 响应中提取数据
 * 支持多种响应格式：
 * - { ok: true, data: [...] }
 * - { data: [...] }
 * - [...]
 * - { ok: true, data: {...} }
 * - {...}
 * 
 * @param {*} response - API 响应
 * @param {*} defaultValue - 默认值（如果无法提取数据）
 * @returns {*} 提取的数据
 */
export function extractApiData(response, defaultValue = null) {
  // 如果响应本身就是数组或对象（直接返回数据）
  if (Array.isArray(response)) {
    return response
  }
  
  // 如果响应是 null 或 undefined
  if (!response) {
    return defaultValue
  }
  
  // 如果响应有 ok 和 data 字段
  if (response.ok && response.data !== undefined) {
    return response.data
  }
  
  // 如果响应有 data 字段
  if (response.data !== undefined) {
    return response.data
  }
  
  // 如果响应本身是对象且没有 data 字段，可能是直接返回的对象
  if (typeof response === 'object' && !Array.isArray(response)) {
    // 检查是否是错误响应
    if (response.error || response.message) {
      return defaultValue
    }
    // 可能是直接返回的对象数据
    return response
  }
  
  return defaultValue
}

/**
 * 从 API 响应中提取数组数据
 * 确保返回的是数组
 * 
 * @param {*} response - API 响应
 * @param {Array} defaultValue - 默认数组值
 * @returns {Array} 数组数据
 */
export function extractApiArray(response, defaultValue = []) {
  const data = extractApiData(response, defaultValue)
  return Array.isArray(data) ? data : defaultValue
}

/**
 * 从 API 响应中提取对象数据
 * 确保返回的是对象
 * 
 * @param {*} response - API 响应
 * @param {Object} defaultValue - 默认对象值（可以是 null）
 * @returns {Object|null} 对象数据
 */
export function extractApiObject(response, defaultValue = {}) {
  const data = extractApiData(response, defaultValue)
  if (data === null || data === undefined) {
    return defaultValue
  }
  return data && typeof data === 'object' && !Array.isArray(data) ? data : defaultValue
}

/**
 * 检查 API 响应是否成功
 * 
 * @param {*} response - API 响应
 * @returns {boolean} 是否成功
 */
export function isApiSuccess(response) {
  if (!response) return false
  if (response.ok === true) return true
  if (response.error) return false
  if (response.status === 'error') return false
  // 如果有 data 字段，认为成功
  if (response.data !== undefined) return true
  // 如果是数组或对象，认为成功
  if (Array.isArray(response) || (typeof response === 'object' && !response.error)) {
    return true
  }
  return false
}

/**
 * 从 API 响应中提取错误消息
 * 
 * @param {*} response - API 响应
 * @param {string} defaultMessage - 默认错误消息
 * @returns {string} 错误消息
 */
export function extractApiError(response, defaultMessage = '請求失敗') {
  if (!response) return defaultMessage
  if (response.message) return response.message
  if (response.error) return typeof response.error === 'string' ? response.error : defaultMessage
  if (response.data?.message) return response.data.message
  return defaultMessage
}


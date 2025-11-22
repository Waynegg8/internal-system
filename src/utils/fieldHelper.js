/**
 * 字段獲取工具函數
 * 統一處理 snake_case 和 camelCase 字段名，減少重複的 || 邏輯
 */

/**
 * 統一處理字段名（支持 snake_case 和 camelCase）
 * @param {Object} obj - 對象
 * @param {string} camelKey - camelCase 字段名
 * @param {string} snakeKey - snake_case 字段名（可選，自動生成）
 * @param {*} defaultValue - 默認值
 * @returns {*} 字段值
 */
export const getField = (obj, camelKey, snakeKey = null, defaultValue = null) => {
  if (!obj) return defaultValue

  const snake = snakeKey || camelKey.replace(/([A-Z])/g, '_$1').toLowerCase()

  return obj[camelKey] ?? obj[snake] ?? defaultValue
}

/**
 * 獲取 ID 字段（支持多種格式）
 * @param {Object} obj - 對象
 * @param {...string} keys - 可能的字段名
 * @returns {*} ID 值
 */
export const getId = (obj, ...keys) => {
  if (!obj) return null

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key]
    }
  }

  return null
}













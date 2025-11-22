/**
 * 錯誤處理工具
 * 提供統一的錯誤處理和用戶友好的錯誤消息
 */

/**
 * 錯誤類型枚舉
 */
export const ErrorType = {
  NETWORK: 'NETWORK',
  API: 'API',
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
}

/**
 * 從錯誤對象中提取用戶友好的錯誤消息
 * @param {Error|Object|string} error - 錯誤對象
 * @param {string} defaultMessage - 默認錯誤消息
 * @returns {string} 用戶友好的錯誤消息
 */
export function getErrorMessage(error, defaultMessage = '操作失敗，請稍後再試') {
  // 如果是字符串，直接返回
  if (typeof error === 'string') {
    return error
  }

  // 如果是 Error 對象
  if (error instanceof Error) {
    // 檢查是否有用戶友好的消息
    if (error.userMessage) {
      return error.userMessage
    }
    // 檢查是否是網絡錯誤
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return '網絡連接失敗，請檢查您的網絡連接'
    }
    // 返回通用錯誤消息，不暴露技術細節
    return defaultMessage
  }

  // 如果是 API 響應錯誤
  if (error?.response) {
    const response = error.response
    
    // 處理 HTTP 狀態碼
    if (response.status === 400) {
      return error.message || '請求參數錯誤，請檢查輸入內容'
    } else if (response.status === 401) {
      return '登錄已過期，請重新登錄'
    } else if (response.status === 403) {
      return '您沒有權限執行此操作'
    } else if (response.status === 404) {
      return '請求的資源不存在'
    } else if (response.status === 409) {
      return error.message || '數據衝突，請檢查輸入內容'
    } else if (response.status >= 500) {
      return '服務器錯誤，請稍後再試'
    }
    
    // 嘗試從響應數據中提取錯誤消息
    if (response.data) {
      if (typeof response.data === 'string') {
        return response.data
      }
      if (response.data.message) {
        return response.data.message
      }
      if (response.data.error) {
        return response.data.error
      }
    }
  }

  // 如果是包含 message 屬性的對象
  if (error?.message) {
    // 檢查是否是技術性錯誤消息，如果是則返回默認消息
    const techKeywords = ['TypeError', 'ReferenceError', 'SyntaxError', 'at ', 'stack']
    const isTechnical = techKeywords.some(keyword => error.message.includes(keyword))
    if (isTechnical) {
      return defaultMessage
    }
    return error.message
  }

  // 默認返回通用錯誤消息
  return defaultMessage
}

/**
 * 判斷錯誤類型
 * @param {Error|Object|string} error - 錯誤對象
 * @returns {string} 錯誤類型
 */
export function getErrorType(error) {
  if (typeof error === 'string') {
    return ErrorType.UNKNOWN
  }

  if (error instanceof Error) {
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return ErrorType.NETWORK
    }
  }

  if (error?.response) {
    const status = error.response.status
    if (status === 401 || status === 403) {
      return ErrorType.PERMISSION
    } else if (status === 404) {
      return ErrorType.NOT_FOUND
    } else if (status >= 500) {
      return ErrorType.SERVER
    } else if (status >= 400) {
      return ErrorType.API
    }
  }

  if (error?.validation) {
    return ErrorType.VALIDATION
  }

  return ErrorType.UNKNOWN
}

/**
 * 處理錯誤並返回結構化的錯誤信息
 * @param {Error|Object|string} error - 錯誤對象
 * @param {Object} options - 選項
 * @param {string} options.defaultMessage - 默認錯誤消息
 * @param {boolean} options.logToConsole - 是否記錄到控制台
 * @param {string} options.context - 錯誤上下文（用於日誌）
 * @returns {Object} 結構化的錯誤信息
 */
export function handleError(error, options = {}) {
  const {
    defaultMessage = '操作失敗，請稍後再試',
    logToConsole = true,
    context = 'Error'
  } = options

  const errorType = getErrorType(error)
  const userMessage = getErrorMessage(error, defaultMessage)

  // 記錄到控制台（僅在開發環境或明確要求時）
  if (logToConsole) {
    console.error(`[${context}]`, {
      type: errorType,
      error: error,
      userMessage: userMessage
    })
  }

  return {
    type: errorType,
    message: userMessage,
    originalError: error,
    canRetry: errorType === ErrorType.NETWORK || errorType === ErrorType.SERVER
  }
}

/**
 * 創建帶有用戶友好消息的錯誤對象
 * @param {string} userMessage - 用戶友好的錯誤消息
 * @param {Error} originalError - 原始錯誤對象（可選）
 * @returns {Error} 錯誤對象
 */
export function createUserFriendlyError(userMessage, originalError = null) {
  const error = originalError || new Error(userMessage)
  error.userMessage = userMessage
  return error
}




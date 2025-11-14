import request from './request'
import { fetchAllServices } from './services'
import { useClientApi } from './clients'
import { getApiBase } from '@/utils/api'

/**
 * 知識庫相關 API
 */

// 直接導出的函數（用於組件中直接導入）

/**
 * 獲取 SOP 列表
 * @param {Object} params - 查詢參數
 * @returns {Promise} API 響應
 */
export const fetchSOPs = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString()
  const response = await request.get(`/sop?${queryString}`)
  return response
}

/**
 * 獲取單個 SOP 詳情
 * @param {string|number} id - SOP ID
 * @returns {Promise} API 響應
 */
export const fetchSOP = async (id) => {
  const response = await request.get(`/sop/${id}`)
  return response
}

/**
 * 創建 SOP
 * @param {Object} data - SOP 數據
 * @param {string} data.title - 標題
 * @param {string|number} data.category - 服務類型分類
 * @param {string|number} [data.client_id] - 客戶 ID
 * @param {string} data.scope - SOP 適用層級（service|task）
 * @param {Array<string>} [data.tags] - 標籤列表
 * @param {string} data.content - 內容（HTML）
 * @returns {Promise} API 響應
 */
export const createSOP = async (data) => {
  const response = await request.post('/sop', data)
  return response
}

/**
 * 更新 SOP
 * @param {string|number} id - SOP ID
 * @param {Object} data - SOP 數據
 * @param {string} [data.title] - 標題
 * @param {string|number} [data.category] - 服務類型分類
 * @param {string|number} [data.client_id] - 客戶 ID
 * @param {string} [data.scope] - SOP 適用層級（service|task）
 * @param {Array<string>} [data.tags] - 標籤列表
 * @param {string} [data.content] - 內容（HTML）
 * @returns {Promise} API 響應
 */
export const updateSOP = async (id, data) => {
  const response = await request.put(`/sop/${id}`, data)
  return response
}

/**
 * 刪除 SOP
 * @param {string|number} id - SOP ID
 * @returns {Promise} API 響應
 */
export const deleteSOP = async (id) => {
  const response = await request.delete(`/sop/${id}`)
  return response
}

/**
 * 獲取 FAQ 列表
 * @param {Object} params - 查詢參數
 * @returns {Promise} API 響應
 */
export const fetchFAQs = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString()
  const response = await request.get(`/faq?${queryString}`)
  return response
}

/**
 * 獲取單個 FAQ 詳情
 * @param {string|number} id - FAQ ID
 * @returns {Promise} API 響應
 */
export const fetchFAQ = async (id) => {
  const response = await request.get(`/faq/${id}`)
  return response
}

/**
 * 創建 FAQ
 * @param {Object} data - FAQ 數據
 * @param {string} data.question - 問題
 * @param {string|number} data.category - 服務類型分類
 * @param {string|number} [data.client_id] - 客戶 ID
 * @param {string} data.scope - FAQ 適用層級（service|task）
 * @param {Array<string>} [data.tags] - 標籤列表
 * @param {string} data.answer - 回答（HTML）
 * @returns {Promise} API 響應
 */
export const createFAQ = async (data) => {
  const response = await request.post('/faq', data)
  return response
}

/**
 * 更新 FAQ
 * @param {string|number} id - FAQ ID
 * @param {Object} data - FAQ 數據
 * @param {string} [data.question] - 問題
 * @param {string|number} [data.category] - 服務類型分類
 * @param {string|number} [data.client_id] - 客戶 ID
 * @param {string} [data.scope] - FAQ 適用層級（service|task）
 * @param {Array<string>} [data.tags] - 標籤列表
 * @param {string} [data.answer] - 回答（HTML）
 * @returns {Promise} API 響應
 */
export const updateFAQ = async (id, data) => {
  const response = await request.put(`/faq/${id}`, data)
  return response
}

/**
 * 刪除 FAQ
 * @param {string|number} id - FAQ ID
 * @returns {Promise} API 響應
 */
export const deleteFAQ = async (id) => {
  const response = await request.delete(`/faq/${id}`)
  return response
}

/**
 * 獲取文檔列表
 * @param {Object} params - 查詢參數
 * @returns {Promise} API 響應
 */
export const fetchDocuments = async (params = {}) => {
  const response = await request.get('/documents', { params })
  return response
}

/**
 * 獲取單個文檔詳情
 * @param {string|number} id - 文檔 ID
 * @returns {Promise} API 響應
 */
export const fetchDocument = async (id) => {
  const response = await request.get(`/documents/${id}`)
  return response
}

/**
 * 上傳文檔
 * @param {FormData} formData - 表單數據（包含文件和元數據）
 * @param {Function} onProgress - 進度回調函數
 * @returns {Promise} API 響應
 */
export const uploadDocument = async (formData, onProgress) => {
  try {
    console.log('Store: 開始上傳文檔')
    const response = await request.post('/documents/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percent)
      }
      }
    })
    return response
  } catch (error) {
    console.error('上傳文檔 API 錯誤:', error)
    if (error.response) {
      console.error('響應狀態:', error.response.status)
      console.error('響應數據:', error.response.data)
      throw new Error(error.response.data?.message || error.response.data?.error || `上傳失敗: ${error.response.statusText}`)
    } else if (error.request) {
      console.error('請求發送但無響應:', error.request)
      throw new Error('無法連接到伺服器，請檢查網路連接')
    } else {
      console.error('請求配置錯誤:', error.message)
      throw error
    }
  }
}

/**
 * 下載文檔
 * @param {string|number} id - 文檔 ID
 * @returns {Promise<Blob>} Blob 數據
 */
export const downloadDocument = async (id) => {
  const response = await fetch(`${getApiBase()}/documents/${id}/download`, {
    credentials: 'include'
  })
  
  if (!response.ok) {
    throw new Error('下載失敗')
  }
  
  return await response.blob()
}

/**
 * 刪除文檔
 * @param {string|number} id - 文檔 ID
 * @returns {Promise} API 響應
 */
export const deleteDocument = async (id) => {
  const response = await request.delete(`/documents/${id}`)
  return response
}

/**
 * 獲取附件列表
 * @param {Object} params - 查詢參數
 * @returns {Promise} API 響應
 */
export const fetchAttachments = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString()
  const response = await request.get(`/attachments?${queryString}`)
  return response
}

/**
 * 上傳附件（兩步流程：先獲取簽名，再上傳）
 * @param {FormData} formData - 表單數據（包含文件和元數據）
 * @param {Function} onProgress - 進度回調函數
 * @returns {Promise} API 響應
 */
export const uploadAttachment = async (formData, onProgress) => {
  try {
    // 從 FormData 中提取文件
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      throw new Error('無法獲取文件對象')
    }

    // 第一步：獲取上傳簽名
    const signResponse = await request.post('/attachments/upload-sign', {
      entity_type: 'sop', // 使用 'sop' 作為知識庫附件的 entity_type（後端支持）
      entity_id: '0', // 使用 '0' 作為獨立附件的 entity_id
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      content_length: file.size
    })

    // axios 攔截器已經返回 response.data，所以 signResponse 就是數據對象
    // successResponse 返回的格式是 { ok: true, data: {...}, message: "...", requestId: "..." }
    if (!signResponse || !signResponse.ok || !signResponse.data) {
      throw new Error(signResponse?.message || '獲取上傳簽名失敗')
    }

    const { uploadUrl, headers: uploadHeaders } = signResponse.data

    // 第二步：使用簽名 URL 上傳文件
    const xhr = new XMLHttpRequest()
    
    return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent)
      }
    })
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (error) {
          resolve(xhr.responseText)
        }
      } else {
          try {
            const errorData = JSON.parse(xhr.responseText)
            reject(new Error(errorData.message || errorData.error || `上傳失敗: ${xhr.statusText}`))
          } catch {
        reject(new Error(`上傳失敗: ${xhr.statusText}`))
          }
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('上傳失敗'))
    })
    
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', uploadHeaders['Content-Type'] || file.type)
      // 注意：瀏覽器不允許手動設置 Content-Length header，會自動計算
      xhr.withCredentials = true
      xhr.send(file)
    })
  } catch (error) {
    console.error('上傳附件 API 錯誤:', error)
    if (error.response) {
      console.error('響應狀態:', error.response.status)
      console.error('響應數據:', error.response.data)
      throw new Error(error.response.data?.message || error.response.data?.error || `上傳失敗: ${error.response.statusText}`)
    } else if (error.request) {
      console.error('請求發送但無響應:', error.request)
      throw new Error('無法連接到伺服器，請檢查網路連接')
    } else {
      console.error('請求配置錯誤:', error.message)
      throw error
    }
  }
}

/**
 * 下載附件
 * @param {string|number} id - 附件 ID
 * @returns {Promise<Blob>} Blob 數據
 */
export const downloadAttachment = async (id) => {
  const response = await fetch(`${getApiBase()}/attachments/${id}/download`, {
    credentials: 'include'
  })
  
  if (!response.ok) {
    // 嘗試讀取錯誤信息
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const errorData = await response.json()
      throw new Error(errorData.message || errorData.error || '下載失敗')
    }
    throw new Error(`下載失敗: ${response.status} ${response.statusText}`)
  }
  
  // 檢查響應類型
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    // 如果返回的是 JSON，可能是錯誤響應
    const data = await response.json()
    throw new Error(data.message || data.error || '下載失敗：伺服器返回了 JSON 響應')
  }
  
  return await response.blob()
}

/**
 * 刪除附件
 * @param {string|number} id - 附件 ID
 * @returns {Promise} API 響應
 */
export const deleteAttachment = async (id) => {
  const response = await request.delete(`/attachments/${id}`)
  return response
}


/**
 * 獲取服務類型列表（重用現有的 services API）
 * @returns {Promise} API 響應
 */
export const fetchServices = async () => {
  try {
    const response = await fetchAllServices()
    return response
  } catch (error) {
    // 處理錯誤
    throw error
  }
}

/**
 * 獲取客戶列表（重用現有的 clients API）
 * @param {Object} params - 查詢參數
 * @returns {Promise} API 響應
 */
export const fetchClients = async (params = {}) => {
  try {
    const clientApi = useClientApi()
    const response = await clientApi.fetchClients(params)
    return response
  } catch (error) {
    // 處理錯誤
    throw error
  }
}

// Composable 函數（向後兼容）
export function useKnowledgeApi() {
  return {
    fetchSOPs,
    fetchSOP,
    createSOP,
    updateSOP,
    deleteSOP,
    fetchFAQs,
    fetchFAQ,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    fetchDocuments,
    fetchDocument,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    fetchAttachments,
    uploadAttachment,
    downloadAttachment,
    deleteAttachment,
    fetchServices,
    fetchClients
  }
}

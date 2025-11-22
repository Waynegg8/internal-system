import request from './request'
import { getApiBase } from '@/utils/api'

/**
 * 附件相關 API
 * 提供通用的附件上傳、下載、刪除等功能
 */

/**
 * 上傳附件（兩步流程：先獲取簽名，再上傳）
 * @param {File} file - 文件對象
 * @param {string} entityType - 附件關聯的實體類型（'task' | 'client' | 'sop' | 'receipt'）
 * @param {string|number} entityId - 附件關聯的實體 ID
 * @param {Function} onProgress - 進度回調函數 (percent) => void
 * @param {AbortSignal} [signal] - 可選的 AbortSignal 用於取消上傳
 * @returns {Promise} API 響應，包含附件信息
 */
export const uploadAttachment = async (file, entityType, entityId, onProgress, signal) => {
  try {
    if (!file || !(file instanceof File)) {
      throw new Error('無法獲取文件對象')
    }

    // 附件系統專為任務服務，只允許 task
    if (entityType !== 'task') {
      throw new Error('附件系統專為任務服務，entity_type 必須為 "task"')
    }

    if (!entityId) {
      throw new Error('entity_id 必填')
    }

    // 第一步：獲取上傳簽名
    const signResponse = await request.post('/attachments/upload-sign', {
      entity_type: entityType,
      entity_id: String(entityId),
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
      // 處理取消信號
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort()
          reject(new Error('上傳已取消'))
        })
      }

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

      xhr.addEventListener('abort', () => {
        reject(new Error('上傳已取消'))
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
 * 獲取附件列表
 * 調用 GET /api/v2/attachments，支援多種篩選參數
 * 
 * @param {Object} params - 查詢參數
 * @param {string} [params.entity_type] - 實體類型（'task' | 'client' | 'sop' | 'receipt'）
 * @param {string|number} [params.entity_id] - 實體 ID
 * @param {string} [params.q] - 關鍵詞搜尋（搜尋附件名稱）
 * @param {number} [params.page] - 頁碼（預設 1）
 * @param {number} [params.perPage] - 每頁顯示筆數（預設 20，最多 100）
 * @param {string} [params.per_page] - 每頁顯示筆數（與 perPage 同義，向後兼容）
 * @param {string} [params.file_type] - 文件類型篩選（'all' | 'pdf' | 'image' | 'excel' | 'word'）
 * @param {string} [params.dateFrom] - 上傳日期起始（YYYY-MM-DD）
 * @param {string} [params.dateTo] - 上傳日期結束（YYYY-MM-DD）
 * @param {string} [params.type] - 實體類型篩選（與 entity_type 同義，向後兼容）
 * @param {string} [params.client] - 客戶 ID 篩選（與 entity_id 同義，向後兼容）
 * @returns {Promise<Object>} API 響應，格式為 { ok: true, data: { attachments: Array, total: number, page: number, perPage: number }, message: string }
 * 
 * @example
 * // 獲取所有附件
 * const response = await fetchAttachments({ page: 1, perPage: 20 })
 * 
 * @example
 * // 獲取特定任務的附件
 * const response = await fetchAttachments({ entity_type: 'task', entity_id: '123' })
 * 
 * @example
 * // 搜尋附件
 * const response = await fetchAttachments({ q: 'invoice', entity_type: 'receipt' })
 */
export const fetchAttachments = async (params = {}) => {
  try {
    // 參數標準化處理
    const normalizedParams = { ...params }
    
    // 統一 perPage 參數名稱（後端支援 perPage 和 per_page）
    if (normalizedParams.per_page !== undefined && normalizedParams.perPage === undefined) {
      normalizedParams.perPage = normalizedParams.per_page
    }
    
    // 統一 entity_type 參數名稱（後端支援 entity_type 和 type）
    if (normalizedParams.type !== undefined && normalizedParams.entity_type === undefined) {
      normalizedParams.entity_type = normalizedParams.type
    }
    
    // 統一 entity_id 參數名稱（後端支援 entity_id 和 client）
    if (normalizedParams.client !== undefined && normalizedParams.entity_id === undefined) {
      normalizedParams.entity_id = normalizedParams.client
    }
    
    // 移除空值參數
    const cleanParams = Object.fromEntries(
      Object.entries(normalizedParams).filter(([_, value]) => 
        value !== undefined && value !== null && value !== ''
      )
    )
    
    // 調用 API
    const response = await request.get('/attachments', { params: cleanParams })
    
    // 使用統一的響應處理
    // 後端返回格式：{ ok: true, data: { attachments: [...], total, page, perPage }, message: "..." }
    return response
  } catch (error) {
    console.error('獲取附件列表失敗:', error)
    // 統一錯誤處理：request 攔截器已經處理了 401/403 等錯誤
    // 這裡只需要重新拋出錯誤，讓調用方處理
    throw error
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
      throw new Error(errorData.message || errorData.error || `下載失敗: ${response.statusText}`)
    }
    throw new Error(`下載失敗: ${response.statusText}`)
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


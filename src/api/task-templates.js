import request from './request'

/**
 * 任務模板相關 API
 */

/**
 * 獲取任務模板列表
 * @param {Object} options - 可選參數
 * @param {string} options.search - 搜索關鍵詞（支持按模板名稱、服務名稱、客戶名稱搜索）
 * @param {string} options.q - 搜索關鍵詞的別名（與 search 相同）
 * @param {number|string} options.service_id - 服務 ID 過濾
 * @param {string} options.client_type - 客戶類型過濾：'unified' 表示統一模板（client_id IS NULL），'specific' 表示客戶專屬（client_id IS NOT NULL）
 * @returns {Promise} API 響應
 */
export async function fetchTaskTemplates(options = {}) {
  // 構建查詢參數
  const params = {}
  
  // 搜索關鍵詞（支持 search 或 q 參數）
  if (options.search) {
    params.search = options.search
  } else if (options.q) {
    params.q = options.q
  }
  
  // 服務 ID 過濾
  if (options.service_id !== undefined && options.service_id !== null) {
    params.service_id = options.service_id
  }
  
  // 客戶類型過濾
  if (options.client_type) {
    params.client_type = options.client_type
  }
  
  // 發送請求（如果有參數則傳遞，否則不傳遞以保持向後兼容）
  const response = await request.get('/task-templates', Object.keys(params).length > 0 ? { params } : {})
  return response
}

export async function fetchTaskTemplateStages(templateId) {
  const response = await request.get(`/task-templates/${templateId}/stages`)
  return response
}

/**
 * 創建任務模板
 * @param {Object} payload - 模板數據
 * @param {string} payload.template_name - 模板名稱（必填）
 * @param {number|string} payload.service_id - 服務 ID（必填）
 * @param {number|string|null} payload.client_id - 客戶 ID（可選，null 表示統一模板）
 * @param {string} payload.description - 模板描述（可選）
 * @param {number|string|null} payload.sop_id - SOP ID（可選）
 * @param {Array} payload.tasks - 任務配置列表（可選，與 stages 二選一）
 * @param {Array} payload.stages - 階段配置列表（可選，與 tasks 二選一）
 * @param {string} payload.default_due_date_rule - 默認到期日規則（可選）
 * @param {string|number|null} payload.default_due_date_value - 默認到期日值（可選）
 * @param {number} payload.default_due_date_offset_days - 默認到期日偏移天數（可選，默認 0）
 * @param {number} payload.default_advance_days - 默認提前天數（可選，默認 7）
 * @returns {Promise} API 響應，包含 template_id
 */
export async function createTaskTemplate(payload) {
  try {
    // 構建請求體
    const requestBody = {
      template_name: payload.template_name,
      service_id: payload.service_id
    }
    
    // 客戶 ID（可選，null 表示統一模板）
    if (payload.client_id !== undefined && payload.client_id !== null) {
      requestBody.client_id = payload.client_id
    } else {
      // 如果未提供 client_id，設置為 null 表示統一模板
      requestBody.client_id = null
    }
    
    // 模板描述（可選）
    if (payload.description !== undefined && payload.description !== null) {
      requestBody.description = payload.description
    }
    
    // SOP ID（可選）
    if (payload.sop_id !== undefined && payload.sop_id !== null) {
      requestBody.sop_id = payload.sop_id
    }
    
    // 任務配置列表（支持 tasks 或 stages）
    if (Array.isArray(payload.tasks) && payload.tasks.length > 0) {
      requestBody.tasks = payload.tasks
    } else if (Array.isArray(payload.stages) && payload.stages.length > 0) {
      requestBody.stages = payload.stages
    }
    
    // 默認到期日規則（可選）
    if (payload.default_due_date_rule !== undefined && payload.default_due_date_rule !== null) {
      requestBody.default_due_date_rule = payload.default_due_date_rule
    }
    
    // 默認到期日值（可選）
    if (payload.default_due_date_value !== undefined && payload.default_due_date_value !== null) {
      requestBody.default_due_date_value = payload.default_due_date_value
    }
    
    // 默認到期日偏移天數（可選）
    if (payload.default_due_date_offset_days !== undefined && payload.default_due_date_offset_days !== null) {
      requestBody.default_due_date_offset_days = payload.default_due_date_offset_days
    }
    
    // 默認提前天數（可選）
    if (payload.default_advance_days !== undefined && payload.default_advance_days !== null) {
      requestBody.default_advance_days = payload.default_advance_days
    }
    
    // 發送 POST 請求
    const response = await request.post('/task-templates', requestBody)
    return response
  } catch (error) {
    // 錯誤處理
    console.error('[Task Templates API] createTaskTemplate error:', error)
    
    // 如果是驗證錯誤（422），保留原始錯誤信息
    if (error.response?.status === 422) {
      throw error
    }
    
    // 其他錯誤，重新拋出
    throw error
  }
}

/**
 * 更新任務模板
 * @param {number|string} templateId - 模板 ID
 * @param {Object} payload - 模板數據（不包含 service_id，因為服務不可修改）
 * @param {string} payload.template_name - 模板名稱（可選）
 * @param {number|string|null} payload.client_id - 客戶 ID（可選，null 表示統一模板）
 * @param {string} payload.description - 模板描述（可選）
 * @param {number|string|null} payload.sop_id - SOP ID（可選）
 * @param {boolean} payload.is_active - 是否啟用（可選）
 * @param {Array} payload.tasks - 任務配置列表（可選，與 stages 二選一）
 * @param {Array} payload.stages - 階段配置列表（可選，與 tasks 二選一）
 * @param {string} payload.default_due_date_rule - 默認到期日規則（可選）
 * @param {string|number|null} payload.default_due_date_value - 默認到期日值（可選）
 * @param {number} payload.default_due_date_offset_days - 默認到期日偏移天數（可選）
 * @param {number} payload.default_advance_days - 默認提前天數（可選）
 * @returns {Promise} API 響應，包含 template_id
 */
export async function updateTaskTemplate(templateId, payload) {
  try {
    // 驗證模板 ID
    if (!templateId || (typeof templateId !== 'number' && typeof templateId !== 'string')) {
      throw new Error('模板 ID 無效')
    }
    
    // 構建請求體（不包含 service_id，因為服務不可修改）
    const requestBody = {}
    
    // 模板名稱（可選）
    if (payload.template_name !== undefined) {
      requestBody.template_name = payload.template_name
    }
    
    // 客戶 ID（可選）
    if (payload.client_id !== undefined) {
      requestBody.client_id = payload.client_id !== null ? payload.client_id : null
    }
    
    // 模板描述（可選）
    if (payload.description !== undefined) {
      requestBody.description = payload.description !== null ? payload.description : null
    }
    
    // SOP ID（可選）
    if (payload.sop_id !== undefined) {
      requestBody.sop_id = payload.sop_id !== null ? payload.sop_id : null
    }
    
    // 是否啟用（可選）
    if (payload.is_active !== undefined) {
      requestBody.is_active = Boolean(payload.is_active)
    }
    
    // 任務配置列表（支持 tasks 或 stages）
    if (Array.isArray(payload.tasks)) {
      requestBody.tasks = payload.tasks
    } else if (Array.isArray(payload.stages)) {
      requestBody.stages = payload.stages
    }
    
    // 默認到期日規則（可選）
    if (payload.default_due_date_rule !== undefined) {
      requestBody.default_due_date_rule = payload.default_due_date_rule !== null ? payload.default_due_date_rule : null
    }
    
    // 默認到期日值（可選）
    if (payload.default_due_date_value !== undefined) {
      requestBody.default_due_date_value = payload.default_due_date_value !== null ? payload.default_due_date_value : null
    }
    
    // 默認到期日偏移天數（可選）
    if (payload.default_due_date_offset_days !== undefined) {
      requestBody.default_due_date_offset_days = payload.default_due_date_offset_days
    }
    
    // 默認提前天數（可選）
    if (payload.default_advance_days !== undefined) {
      requestBody.default_advance_days = payload.default_advance_days
    }
    
    // 發送 PUT 請求
    const response = await request.put(`/task-templates/${templateId}`, requestBody)
    return response
  } catch (error) {
    // 錯誤處理
    console.error('[Task Templates API] updateTaskTemplate error:', error)
    
    // 如果是驗證錯誤（422），保留原始錯誤信息
    if (error.response?.status === 422) {
      throw error
    }
    
    // 其他錯誤，重新拋出
    throw error
  }
}

/**
 * 刪除任務模板
 * @param {number|string} templateId - 模板 ID
 * @returns {Promise} API 響應，包含 template_id
 * @throws {Error} 如果模板被使用（409），錯誤對象包含 used_by_services 等信息
 */
export async function deleteTaskTemplate(templateId) {
  try {
    // 驗證模板 ID
    if (!templateId || (typeof templateId !== 'number' && typeof templateId !== 'string')) {
      throw new Error('模板 ID 無效')
    }
    
    // 發送 DELETE 請求
    const response = await request.delete(`/task-templates/${templateId}`)
    return response
  } catch (error) {
    // 錯誤處理
    console.error('[Task Templates API] deleteTaskTemplate error:', error)
    
    // 如果是模板被使用錯誤（409），保留原始錯誤信息（包含服務列表）
    if (error.response?.status === 409) {
      // 錯誤響應格式：
      // {
      //   success: false,
      //   error: "TEMPLATE_IN_USE",
      //   message: "無法刪除模板「...」，因為有 X 個服務正在使用此模板",
      //   data: {
      //     template_id: number,
      //     template_name: string,
      //     used_by_count: number,
      //     used_by_services: Array<{client_service_id, client_id, client_name, service_id, service_name}>,
      //     message: string
      //   },
      //   request_id: string
      // }
      throw error
    }
    
    // 如果是驗證錯誤（400, 404），保留原始錯誤信息
    if (error.response?.status === 400 || error.response?.status === 404) {
      throw error
    }
    
    // 如果是權限錯誤（403），保留原始錯誤信息
    if (error.response?.status === 403) {
      throw error
    }
    
    // 其他錯誤（500 等），重新拋出
    throw error
  }
}

/**
 * 獲取任務模板階段列表
 * @param {number|string} templateId - 模板 ID
 * @returns {Promise} API 響應，包含階段列表數組
 */
export async function fetchStages(templateId) {
  try {
    // 驗證模板 ID
    if (!templateId || (typeof templateId !== 'number' && typeof templateId !== 'string')) {
      throw new Error('模板 ID 無效')
    }
    
    // 發送 GET 請求
    const response = await request.get(`/settings/task-templates/${templateId}/stages`)
    return response
  } catch (error) {
    // 錯誤處理
    console.error('[Task Templates API] fetchStages error:', error)
    
    // 保留所有錯誤信息
    throw error
  }
}

/**
 * 批量更新階段名稱和順序
 * @param {number|string} templateId - 模板 ID
 * @param {Object} payload - 更新數據
 * @param {Array} payload.stages - 階段數組，每個階段包含 stage_id（必填）、stage_name（可選）、stage_order（可選）
 * @returns {Promise} API 響應，包含 template_id、updated_count、stages
 */
export async function updateStageNames(templateId, payload) {
  try {
    // 驗證模板 ID
    if (!templateId || (typeof templateId !== 'number' && typeof templateId !== 'string')) {
      throw new Error('模板 ID 無效')
    }
    
    // 驗證 stages 數組
    if (!Array.isArray(payload.stages) || payload.stages.length === 0) {
      throw new Error('stages 必須為非空陣列')
    }
    
    // 構建請求體
    const requestBody = {
      stages: payload.stages
    }
    
    // 發送 PUT 請求
    const response = await request.put(`/settings/task-templates/${templateId}/stages/batch`, requestBody)
    return response
  } catch (error) {
    // 錯誤處理
    console.error('[Task Templates API] updateStageNames error:', error)
    
    // 如果是驗證錯誤（422），保留原始錯誤信息（包含詳細的驗證錯誤列表）
    if (error.response?.status === 422) {
      throw error
    }
    
    // 其他錯誤，重新拋出
    throw error
  }
}

/**
 * 同步階段變更到使用該模板的服務配置
 * @param {number|string} templateId - 模板 ID
 * @param {Object} options - 選項
 * @param {boolean} options.confirm - 是否確認同步（必填，true 表示確認執行同步）
 * @returns {Promise} API 響應
 * @throws {Error} 如果未確認（428），錯誤對象包含 affected_services 等信息
 */
export async function syncStages(templateId, options = {}) {
  try {
    // 驗證模板 ID
    if (!templateId || (typeof templateId !== 'number' && typeof templateId !== 'string')) {
      throw new Error('模板 ID 無效')
    }
    
    // 構建請求體
    const requestBody = {
      confirm: options.confirm === true
    }
    
    // 發送 POST 請求
    const response = await request.post(`/settings/task-templates/${templateId}/stages/sync`, requestBody)
    return response
  } catch (error) {
    // 錯誤處理
    console.error('[Task Templates API] syncStages error:', error)
    
    // 如果是需要確認的錯誤（428），保留原始錯誤信息（包含受影響的服務列表）
    if (error.response?.status === 428) {
      // 錯誤響應格式：
      // {
      //   success: false,
      //   error: "SYNC_CONFIRMATION_REQUIRED",
      //   message: "需要確認階段同步",
      //   data: {
      //     requires_confirmation: true,
      //     template_id: number,
      //     template_name: string,
      //     affected_services_count: number,
      //     affected_services: Array<{client_service_id, client_id, client_name, service_id, service_name}>,
      //     stages_count: number,
      //     stages: Array<{stage_id, stage_name, stage_order}>,
      //     message: string
      //   },
      //   request_id: string
      // }
      throw error
    }
    
    // 如果是驗證錯誤（422），保留原始錯誤信息
    if (error.response?.status === 422) {
      throw error
    }
    
    // 如果是模板不存在錯誤（404），保留原始錯誤信息
    if (error.response?.status === 404) {
      throw error
    }
    
    // 如果是權限錯誤（403），保留原始錯誤信息
    if (error.response?.status === 403) {
      throw error
    }
    
    // 其他錯誤（500 等），重新拋出
    throw error
  }
}

// Composable 函數（向後兼容）
export function useTaskTemplateApi() {
  return {
    fetchTaskTemplates,
    fetchTaskTemplateStages,
    createTaskTemplate,
    updateTaskTemplate,
    deleteTaskTemplate,
    fetchStages,
    updateStageNames,
    syncStages
  }
}


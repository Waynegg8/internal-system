import request from './request'

/**
 * 任務模板相關 API
 */

// 直接導出的函數（用於組件中直接導入）
export async function fetchTaskTemplates() {
  const response = await request.get('/task-templates')
  return response
}

export async function fetchTaskTemplateStages(templateId) {
  const response = await request.get(`/task-templates/${templateId}/stages`)
  return response
}

// Composable 函數（向後兼容）
export function useTaskTemplateApi() {
  return {
    fetchTaskTemplates,
    fetchTaskTemplateStages
  }
}


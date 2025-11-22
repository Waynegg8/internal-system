import request from './request'
import { checkAdminPermission } from './auth'

/**
 * 成本相關 API
 */
export function useCostApi() {
  // 成本項目類型
  const fetchCostTypes = async () => {
    const response = await request.get('/admin/cost-types')
    return response
  }

  const createCostType = async (data) => {
    const response = await request.post('/admin/cost-types', data)
    return response
  }

  const updateCostType = async (id, data) => {
    const response = await request.put(`/admin/cost-types/${id}`, data)
    return response
  }

  const deleteCostType = async (id) => {
    const response = await request.delete(`/admin/cost-types/${id}`)
    return response
  }

  // 成本項目（保留向後兼容）
  const fetchCostItems = async () => {
    const response = await request.get('/costs/items')
    return response
  }

  const createCostItem = async (data) => {
    const response = await request.post('/costs/items', data)
    return response
  }

  const updateCostItem = async (id, data) => {
    const response = await request.put(`/costs/items/${id}`, data)
    return response
  }

  const deleteCostItem = async (id) => {
    const response = await request.delete(`/costs/items/${id}`)
    return response
  }

  // 月度管理費用
  const fetchOverheadCosts = async (year, month) => {
    const response = await request.get(`/costs/overhead/${year}/${month}`)
    return response
  }

  const createOverheadCost = async (data) => {
    const response = await request.post('/costs/overhead', data)
    return response
  }

  const updateOverheadCost = async (id, data) => {
    const response = await request.put(`/costs/overhead/${id}`, data)
    return response
  }

  const deleteOverheadCost = async (id) => {
    const response = await request.delete(`/costs/overhead/${id}`)
    return response
  }

  // 月度管理費用記錄 - 主要 API
  const fetchCostRecords = async () => {
    const response = await request.get('/costs/records')
    return response
  }

  const createCostRecord = async (data) => {
    const response = await request.post('/costs/records', data)
    return response
  }

  const updateCostRecord = async (id, data) => {
    const response = await request.put(`/costs/records/${id}`, data)
    return response
  }

  const deleteCostRecord = async (id) => {
    const response = await request.delete(`/costs/records/${id}`)
    return response
  }

  const generateOverheadCosts = async (year, month, templateIds) => {
    const response = await request.post('/costs/overhead/generate', {
      year,
      month,
      template_ids: templateIds
    })
    return response
  }

  const previewOverheadCostsGeneration = async (year, month) => {
    const response = await request.get(`/costs/overhead/preview/${year}/${month}`)
    return response
  }

  // 自動生成模板
  const fetchOverheadTemplate = async (costTypeId) => {
    const response = await request.get(`/costs/overhead-templates/${costTypeId}`)
    return response
  }

  const updateOverheadTemplate = async (costTypeId, data) => {
    const response = await request.put(`/costs/overhead-templates/${costTypeId}`, data)
    return response
  }

  // 員工成本
  const fetchEmployeeCosts = async (year, month) => {
    const response = await request.get(`/costs/employee/${year}/${month}`)
    return response
  }

  // 客戶任務成本
  const fetchClientCostsSummary = async (year, month) => {
    const response = await request.get(`/costs/client-summary/${year}/${month}`)
    return response
  }

  const fetchTaskCosts = async (year, month) => {
    const response = await request.get(`/costs/task/${year}/${month}`)
    return response
  }

  // 成本分攤計算
  const calculateAllocation = async (year, month, allocationMethod) => {
    const response = await request.post('/costs/allocation/calculate', {
      year,
      month,
      allocation_method: allocationMethod
    })
    return response
  }

  // 服務項目
  const fetchServiceItems = async () => {
    const response = await request.get('/services/items')
    return response
  }

  // 權限（直接使用從 auth.js 導入的函數）

  return {
    fetchCostTypes,
    createCostType,
    updateCostType,
    deleteCostType,
    fetchCostItems,
    createCostItem,
    updateCostItem,
    deleteCostItem,
    fetchOverheadCosts,
    createOverheadCost,
    updateOverheadCost,
    deleteOverheadCost,
    fetchCostRecords,
    createCostRecord,
    updateCostRecord,
    deleteCostRecord,
    generateOverheadCosts,
    previewOverheadCostsGeneration,
    fetchOverheadTemplate,
    updateOverheadTemplate,
    fetchEmployeeCosts,
    fetchClientCostsSummary,
    fetchTaskCosts,
    calculateAllocation,
    fetchServiceItems,
    checkAdminPermission
  }
}


import { defineStore } from 'pinia'
import { useCostApi } from '@/api/costs'
import { extractApiArray } from '@/utils/apiHelpers'

export const useCostStore = defineStore('costs', {
  state: () => ({
    costTypes: [],
    overheadCosts: [],
    employeeCosts: [],
    clientCostsSummary: null,
    clientCostsData: [],
    taskCosts: [],
    serviceItems: [],
    overheadTemplates: {},
    overheadCostsSummary: null,
    employeeCostsSummary: null,
    loading: false,
    error: null
  }),
  
  actions: {
    // 獲取成本項目類型
    async fetchCostTypes() {
      this.loading = true
      this.error = null
      try {
        const response = await useCostApi().fetchCostTypes()
        // 處理多種 API 響應格式
        const allCostTypes = extractApiArray(response, [])
        // 預設只保留啟用中的項目，避免刪除後仍顯示在列表中
        this.costTypes = allCostTypes.filter((item) => {
          const isActive =
            item.isActive !== undefined
              ? item.isActive
              : item.is_active !== undefined
                ? item.is_active
                : true
          return isActive !== false
        })
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 新增成本項目類型
    async createCostType(data) {
      this.error = null
      try {
        const response = await useCostApi().createCostType(data)
        // 處理多種 API 響應格式
        if (response.ok || response.data !== undefined) {
          // 自動刷新成本項目列表
          await this.fetchCostTypes()
          return response
        } else {
          throw new Error(response.message || '新增失敗')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 更新成本項目類型
    async updateCostType(id, data) {
      this.error = null
      try {
        const response = await useCostApi().updateCostType(id, data)
        // 處理多種 API 響應格式
        if (response.ok || response.data !== undefined) {
          // 自動刷新成本項目列表
          await this.fetchCostTypes()
          return response
        } else {
          throw new Error(response.message || '更新失敗')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 刪除成本項目類型
    async deleteCostType(id) {
      this.error = null
      try {
        const response = await useCostApi().deleteCostType(id)
        if (response.ok || response.data !== undefined) {
          if (this.overheadTemplates && this.overheadTemplates[id]) {
            delete this.overheadTemplates[id]
          }
          await this.fetchCostTypes()
          return response
        }
        throw new Error(response.message || '刪除失敗')
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 獲取月度管理費用
    async fetchOverheadCosts(year, month) {
      this.loading = true
      this.error = null
      try {
        const response = await useCostApi().fetchOverheadCosts(year, month)
        // 處理多種 API 響應格式
        if (response.ok && response.data) {
          // 支持 { ok: true, data: { items: [], total, totalFixed, totalVariable } } 格式
          if (response.data.items && Array.isArray(response.data.items)) {
            this.overheadCosts = response.data.items
            // 處理統計摘要數據
            this.overheadCostsSummary = {
              total: response.data.total || 0,
              totalFixed: response.data.totalFixed || 0,
              totalVariable: response.data.totalVariable || 0
            }
          } else if (Array.isArray(response.data)) {
            this.overheadCosts = response.data
            this.overheadCostsSummary = null
          } else {
            this.overheadCosts = []
            this.overheadCostsSummary = null
          }
        } else if (Array.isArray(response)) {
          this.overheadCosts = response
          this.overheadCostsSummary = null
        } else if (response.data && Array.isArray(response.data)) {
          this.overheadCosts = response.data
          this.overheadCostsSummary = null
        } else {
          this.overheadCosts = []
          this.overheadCostsSummary = null
        }
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 新增月度管理費用
    async createOverheadCost(data) {
      this.error = null
      try {
        const response = await useCostApi().createOverheadCost(data)
        // 處理多種 API 響應格式
        if (response.ok || response.data !== undefined) {
          // 自動刷新月度記錄列表
          const year = data.year
          const month = data.month
          if (year && month) {
            await this.fetchOverheadCosts(year, month)
          }
          return response
        } else {
          throw new Error(response.message || '新增失敗')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 更新月度管理費用
    async updateOverheadCost(id, data) {
      this.error = null
      try {
        const response = await useCostApi().updateOverheadCost(id, data)
        // 處理多種 API 響應格式
        if (response.ok || response.data !== undefined) {
          // 自動刷新月度記錄列表
          const year = data.year
          const month = data.month
          if (year && month) {
            await this.fetchOverheadCosts(year, month)
          }
          return response
        } else {
          throw new Error(response.message || '更新失敗')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 刪除月度管理費用
    async deleteOverheadCost(id) {
      this.error = null
      try {
        const response = await useCostApi().deleteOverheadCost(id)
        // 處理多種 API 響應格式
        if (response.ok || response.data !== undefined) {
          // 需要從現有記錄中獲取 year 和 month 來刷新列表
          const cost = this.overheadCosts.find(c => {
            const costId = c.id || c.cost_id || c.overheadCostId
            return costId === id
          })
          if (cost) {
            const year = cost.year || cost.recordYear
            const month = cost.month || cost.recordMonth
            if (year && month) {
              await this.fetchOverheadCosts(year, month)
            }
          }
          return response
        } else {
          throw new Error(response.message || '刪除失敗')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 生成月度管理費用
    async generateOverheadCosts(year, month, templateIds) {
      this.error = null
      try {
        const response = await useCostApi().generateOverheadCosts(year, month, templateIds)
        // 處理多種 API 響應格式
        if (response.ok || response.data !== undefined) {
          // 自動刷新月度記錄列表
          await this.fetchOverheadCosts(year, month)
          return response
        } else {
          throw new Error(response.message || '生成失敗')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 預覽月度管理費用生成
    async previewOverheadCostsGeneration(year, month) {
      this.error = null
      try {
        const response = await useCostApi().previewOverheadCostsGeneration(year, month)
        // 處理多種 API 響應格式
        if (response.ok && response.data) {
          return Array.isArray(response.data) ? response.data : (response.data.items || [])
        } else if (Array.isArray(response)) {
          return response
        } else if (response.data && Array.isArray(response.data)) {
          return response.data
        } else {
          return []
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 獲取自動生成模板
    async fetchOverheadTemplate(costTypeId, { force = false } = {}) {
      this.error = null
      try {
        // 先檢查緩存中是否已有該模板
        if (!force && this.overheadTemplates[costTypeId]) {
          return this.overheadTemplates[costTypeId]
        }
        
        const response = await useCostApi().fetchOverheadTemplate(costTypeId)
        // 處理多種 API 響應格式（包括模板不存在的情況）
        let template = null
        if (response.ok && response.data) {
          template = response.data
        } else if (response.data) {
          template = response.data
        } else if (response && !response.ok && response.status === 404) {
          // 模板不存在，返回 null
          template = null
        } else {
          template = null
        }
        
        // 將結果存入緩存（若無模板則清除舊緩存）
        if (template) {
          this.overheadTemplates[costTypeId] = template
        } else {
          delete this.overheadTemplates[costTypeId]
        }
        
        return template
      } catch (error) {
        // 如果模板不存在（404），返回 null
        if (error.response && error.response.status === 404) {
          return null
        }
        this.error = error.message
        throw error
      }
    },
    
    // 更新自動生成模板
    async updateOverheadTemplate(costTypeId, data) {
      this.error = null
      try {
        const response = await useCostApi().updateOverheadTemplate(costTypeId, data)
        // 處理多種 API 響應格式
        if (response.ok || response.data !== undefined) {
          // 成功後重新取得最新模板，避免舊資料被快取
          const latestTemplate = await this.fetchOverheadTemplate(costTypeId, { force: true })
          if (latestTemplate) {
            this.overheadTemplates[costTypeId] = latestTemplate
          } else {
            delete this.overheadTemplates[costTypeId]
          }
          return { ...(response || {}), data: latestTemplate }
        } else {
          throw new Error(response.message || '更新失敗')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 清除錯誤
    clearError() {
      this.error = null
    },
    
    // 獲取員工成本
    async fetchEmployeeCosts(year, month) {
      this.loading = true
      this.error = null
      try {
        const response = await useCostApi().fetchEmployeeCosts(year, month)
        // 處理多種 API 響應格式
        if (response.ok && response.data) {
          // 支持 { ok: true, data: { employees: [], totalCost } } 格式
          if (response.data.employees && Array.isArray(response.data.employees)) {
            this.employeeCosts = response.data.employees
            // 處理統計總計數據
            this.employeeCostsSummary = {
              totalCost: response.data.totalCost || 0
            }
          } else if (Array.isArray(response.data)) {
            this.employeeCosts = response.data
            this.employeeCostsSummary = null
          } else {
            this.employeeCosts = []
            this.employeeCostsSummary = null
          }
        } else if (Array.isArray(response)) {
          this.employeeCosts = response
          this.employeeCostsSummary = null
        } else if (response.data && Array.isArray(response.data)) {
          this.employeeCosts = response.data
          this.employeeCostsSummary = null
        } else {
          this.employeeCosts = []
          this.employeeCostsSummary = null
        }
        return response
      } catch (error) {
        // 處理 501 狀態碼
        if (error.response && error.response.status === 501) {
          this.error = '501 Not Implemented'
        } else {
          this.error = error.message || '未知錯誤'
        }
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取客戶任務成本
    async fetchClientCostsSummary(year, month) {
      this.loading = true
      this.error = null
      try {
        const response = await useCostApi().fetchClientCostsSummary(year, month)
        // 處理多種 API 響應格式
        if (response.ok && response.data) {
          // 支持 { ok: true, data: { clients: [], totalCost, totalRevenue, totalProfit, avgMargin } } 格式
          if (response.data.clients && Array.isArray(response.data.clients)) {
            this.clientCostsData = response.data.clients
            // 處理統計總結數據
            this.clientCostsSummary = {
              totalCost: response.data.totalCost || 0,
              totalRevenue: response.data.totalRevenue || 0,
              totalProfit: response.data.totalProfit || 0,
              avgMargin: response.data.avgMargin || 0
            }
          } else if (Array.isArray(response.data)) {
            this.clientCostsData = response.data
            this.clientCostsSummary = null
          } else {
            this.clientCostsData = []
            this.clientCostsSummary = null
          }
        } else if (Array.isArray(response)) {
          this.clientCostsData = response
          this.clientCostsSummary = null
        } else if (response.data && Array.isArray(response.data)) {
          this.clientCostsData = response.data
          this.clientCostsSummary = null
        } else {
          this.clientCostsData = []
          this.clientCostsSummary = null
        }
        return response
      } catch (error) {
        // 處理 501 狀態碼
        if (error.response && error.response.status === 501) {
          this.error = '501 Not Implemented'
        } else {
          this.error = error.message || '未知錯誤'
        }
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取任務成本
    async fetchTaskCosts(year, month) {
      this.loading = true
      this.error = null
      try {
        const response = await useCostApi().fetchTaskCosts(year, month)
        // 處理多種 API 響應格式
        if (response.ok && response.data) {
          this.taskCosts = Array.isArray(response.data) ? response.data : (response.data.items || [])
        } else if (Array.isArray(response)) {
          this.taskCosts = response
        } else if (response.data && Array.isArray(response.data)) {
          this.taskCosts = response.data
        } else {
          this.taskCosts = []
        }
        return response
      } catch (error) {
        // 處理 501 狀態碼
        if (error.response && error.response.status === 501) {
          this.error = '501 Not Implemented'
        } else {
          this.error = error.message || '未知錯誤'
        }
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 成本分攤計算
    async calculateAllocation(year, month, allocationMethod) {
      this.loading = true
      this.error = null
      try {
        const response = await useCostApi().calculateAllocation(year, month, allocationMethod)
        // 處理多種 API 響應格式
        if (response.ok && response.data) {
          return response
        } else if (response.data) {
          return response
        } else {
          throw new Error(response.message || '計算失敗')
        }
      } catch (error) {
        this.error = error.message || '計算失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 獲取服務項目
    async fetchServiceItems() {
      this.error = null
      try {
        const response = await useCostApi().fetchServiceItems()
        // 處理多種 API 響應格式
        if (response.ok && response.data) {
          this.serviceItems = Array.isArray(response.data) ? response.data : (response.data.items || [])
        } else if (Array.isArray(response)) {
          this.serviceItems = response
        } else if (response.data && Array.isArray(response.data)) {
          this.serviceItems = response.data
        } else {
          this.serviceItems = []
        }
        return response
      } catch (error) {
        // 服務項目獲取失敗不影響主功能，只記錄錯誤
        console.error('獲取服務項目失敗:', error)
        this.serviceItems = []
        return { ok: false, data: [] }
      }
    }
  }
})


import { defineStore } from 'pinia'
import { useClientApi } from '@/api/clients'
import { extractApiArray, extractApiData } from '@/utils/apiHelpers'

export const useClientStore = defineStore('clients', {
  state: () => ({
    clients: [],
    currentClient: null,
    clientServices: [],
    billingSchedules: [],
    serviceComponents: [],
    allTags: [],
    allServices: [],
    allUsers: [],
    allSOPs: [],
    loading: false,
    error: null,
    pagination: {
      current: 1,
      pageSize: 50,
      total: 0
    },
    filters: {
      q: '',
      tag_id: null
    },
    selectedClientIds: []
  }),
  
  getters: {
    // 根據 ID 獲取客戶
    getClientById: (state) => (id) => {
      return state.clients.find(client => client.id === id)
    }
  },
  
  actions: {
    // 獲取客戶列表
    async fetchClients(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().fetchClients({
          page: this.pagination.current,
          perPage: this.pagination.pageSize,
          ...this.filters,
          ...params
        })
        
        this.clients = extractApiArray(response, [])
        this.pagination.total = response.meta?.total || 0
        
        return response
      } catch (error) {
        console.error('[ClientStore] API 請求失敗:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取客戶詳情
    async fetchClientDetail(clientId) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().fetchClientDetail(clientId)
        // axios 攔截器返回 response.data，結構是 { ok, code, message, data, meta }
        // 我們需要的客戶數據在 data 字段中
        console.log('API Response:', JSON.stringify(response, null, 2))
        this.currentClient = response.data
        console.log('Current Client:', JSON.stringify(this.currentClient, null, 2))
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建客戶
    async createClient(payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().createClient(payload)
        // 可以選擇刷新列表
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新客戶
    async updateClient(clientId, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().updateClient(clientId, data)
        if (this.currentClient?.id === clientId) {
          this.currentClient = { ...this.currentClient, ...data }
        }
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除客戶
    async deleteClient(clientId) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().deleteClient(clientId)
        // 支持多種字段名格式
        this.clients = this.clients.filter(client => {
          const id = client.id || client.clientId || client.client_id
          return id !== clientId
        })
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置篩選條件
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },
    
    // 設置分頁
    setPagination(pagination) {
      this.pagination = { ...this.pagination, ...pagination }
    },
    
    // 設置選中的客戶
    setSelectedClientIds(ids) {
      this.selectedClientIds = ids
    },
    
    // 清除選中的客戶
    clearSelectedClientIds() {
      this.selectedClientIds = []
    },
    
    // 批量分配客戶
    async batchAssignClients(clientIds, assigneeUserId) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().batchAssignClients({
          client_ids: clientIds,
          assignee_user_id: assigneeUserId
        })
        // 成功後刷新客戶列表
        await this.fetchClients()
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 預覽移轉客戶
    async previewMigrateClients(params) {
      this.loading = true
      this.error = null
      try {
        // 快速移轉使用 batch-assign 端點，帶 dry_run 參數
        const response = await useClientApi().batchAssignClients({
          ...params,
          dry_run: true
        })
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 移轉客戶
    async migrateClients(params) {
      this.loading = true
      this.error = null
      try {
        // 快速移轉使用 batch-assign 端點
        const response = await useClientApi().batchAssignClients(params)
        // 成功後刷新客戶列表
        await this.fetchClients()
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})


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
    selectedClientIds: [],
    // 性能優化：請求去重和緩存
    _fetchingClientDetail: null, // 正在進行的請求 Promise
    _lastFetchedClientId: null, // 最後獲取的客戶 ID
    _lastFetchTime: 0 // 最後獲取時間
  }),
  
  getters: {
    // 根據 ID 獲取客戶
    getClientById: (state) => (id) => {
      return state.clients.find(client => client.id === id)
    },
    // 檢查當前客戶是否已載入
    isCurrentClientLoaded: (state) => (clientId) => {
      return state.currentClient && 
             (state.currentClient.clientId === clientId || 
              state.currentClient.client_id === clientId ||
              state.currentClient.id === clientId)
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
    
    // 獲取客戶詳情（帶請求去重和緩存優化）
    async fetchClientDetail(clientId, options = {}) {
      const { forceRefresh = false, skipCache = false } = options
      
      // 如果已有相同客戶的數據且未強制刷新，且請求正在進行中，返回現有請求
      if (!forceRefresh && !skipCache && this._fetchingClientDetail && this._lastFetchedClientId === clientId) {
        console.log('[ClientStore] 重用進行中的請求:', clientId)
        return this._fetchingClientDetail
      }
      
      // 如果已有相同客戶的數據且未過期（5秒內），且未強制刷新，直接返回
      const now = Date.now()
      const cacheValid = !forceRefresh && 
                        this.isCurrentClientLoaded(clientId) && 
                        (now - this._lastFetchTime) < 5000 // 5秒緩存
      
      if (cacheValid && !skipCache) {
        console.log('[ClientStore] 使用緩存數據:', clientId)
        return { data: this.currentClient, ok: true }
      }
      
      // 創建新的請求
      this.loading = true
      this.error = null
      this._lastFetchedClientId = clientId
      
      const fetchPromise = (async () => {
        try {
          const response = await useClientApi().fetchClientDetail(clientId)
          // axios 攔截器返回 response.data，結構是 { ok, code, message, data, meta }
          // 我們需要的客戶數據在 data 字段中
          this.currentClient = response.data
          this._lastFetchTime = Date.now()
          console.log('[ClientStore] 客戶詳情已載入:', clientId)
          return response
        } catch (error) {
          this.error = error.message
          throw error
        } finally {
          this.loading = false
          this._fetchingClientDetail = null
        }
      })()
      
      // 保存請求 Promise 以供重用
      this._fetchingClientDetail = fetchPromise
      
      return fetchPromise
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


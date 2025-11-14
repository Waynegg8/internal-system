import { defineStore } from 'pinia'
import { useReceiptApi } from '@/api/receipts'

export const useReceiptStore = defineStore('receipts', {
  state: () => ({
    receipts: [],
    currentReceipt: null,
    reminders: [],
    loading: false,
    error: null,
    pagination: {
      current: 1,
      pageSize: 50,
      total: 0
    },
    filters: {
      q: '',
      status: 'all',
      receipt_type: 'all',
      dateFrom: '',
      dateTo: ''
    }
  }),
  
  actions: {
    // 獲取收據列表
    async fetchAllReceipts(params = {}) {
      this.loading = true
      this.error = null
      try {
        // 構建請求參數
        const requestParams = {
          page: this.pagination.current,
          perPage: this.pagination.pageSize,
          ...this.filters,
          ...params
        }
        
        // 移除 'all' 值的篩選參數
        if (requestParams.status === 'all') {
          delete requestParams.status
        }
        if (requestParams.receipt_type === 'all') {
          delete requestParams.receipt_type
        }
        
        // 移除空字符串
        Object.keys(requestParams).forEach(key => {
          if (requestParams[key] === '') {
            delete requestParams[key]
          }
        })
        
        const response = await useReceiptApi().fetchAllReceipts(requestParams)
        this.receipts = response.data || []
        
        // 更新分頁信息
        if (response.meta) {
          this.pagination.total = response.meta.total || 0
        }
        
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取收據詳情
    async fetchReceiptDetail(receiptId) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().fetchReceiptDetail(receiptId)
        // 處理 API 響應格式：可能是 { ok: true, data: {...} } 或直接是 data
        this.currentReceipt = response.data || response
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建收據
    async createReceipt(payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().createReceipt(payload)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新收據
    async updateReceipt(receiptId, payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().updateReceipt(receiptId, payload)
        if (this.currentReceipt) {
          await this.fetchReceiptDetail(receiptId)
        }
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建收款記錄
    async createPayment(receiptId, payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().createPayment(receiptId, payload)
        // 成功後刷新收據詳情
        if (this.currentReceipt?.id === receiptId || this.currentReceipt?.receiptId === receiptId) {
          await this.fetchReceiptDetail(receiptId)
        }
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 作廢收據
    async cancelReceipt(receiptId) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().cancelReceipt(receiptId)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取收據提醒
    async fetchReceiptReminders() {
      try {
        const response = await useReceiptApi().fetchReceiptReminders()
        this.reminders = response.data || []
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 暫緩收據提醒
    async postponeReminder(data) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().postponeReminder(data)
        // 成功後刷新提醒列表
        await this.fetchReceiptReminders()
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
    
    // 重置篩選條件
    resetFilters() {
      this.filters = {
        q: '',
        status: 'all',
        receipt_type: 'all',
        dateFrom: '',
        dateTo: ''
      }
    }
  }
})


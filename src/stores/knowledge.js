import { defineStore } from 'pinia'
import { fetchServices, fetchClients, fetchSOPs, fetchSOP, createSOP, updateSOP, deleteSOP, fetchFAQs, fetchFAQ, createFAQ, updateFAQ, deleteFAQ, fetchDocuments, fetchDocument, uploadDocument as uploadDocumentApi, updateDocument as updateDocumentApi, downloadDocument, getPreviewUrl, deleteDocument, batchDeleteDocuments as batchDeleteDocumentsApi } from '@/api/knowledge'
import { fetchAttachments as fetchAttachmentsApi, downloadAttachment as downloadAttachmentApi, deleteAttachment as deleteAttachmentApi } from '@/api/attachments'
import { extractApiArray, extractApiData } from '@/utils/apiHelpers'

export const useKnowledgeStore = defineStore('knowledge', {
  state: () => ({
    loading: false,
    error: null,
    activeTab: 'sop', // 'sop' | 'faq' | 'resources' | 'attachments'
    filters: {
      q: '', // 搜尋關鍵字
      category: '', // 服務類型
      scope: '', // 層級（全部、服務層級、任務層級）
      client: '', // 客戶
      year: '', // 年份
      month: '', // 月份
      tags: [] // 標籤（多選）
    },
    services: [], // 服務類型列表
    clients: [], // 客戶列表
    tags: [], // 標籤列表（從 localStorage 載入）
    // SOP 相關狀態
    sops: [], // SOP 列表
    currentSOP: null, // 當前選中的 SOP
    sopPagination: {
      page: 1,
      perPage: 20,
      total: 0
    }, // SOP 分頁信息
    sopLoading: false, // SOP 載入狀態
    // FAQ 相關狀態
    faqs: [], // FAQ 列表
    currentFAQ: null, // 當前選中的 FAQ
    faqPagination: {
      page: 1,
      perPage: 20,
      total: 0
    }, // FAQ 分頁信息
    faqLoading: false, // FAQ 載入狀態
    // 文檔相關狀態
    documents: [], // 文檔列表
    currentDocument: null, // 當前選中的文檔
    documentPagination: {
      page: 1,
      perPage: 20,
      total: 0
    }, // 文檔分頁信息
    documentLoading: false, // 文檔載入狀態
    // 附件相關狀態
    attachments: [], // 附件列表
    currentAttachment: null, // 當前選中的附件
    attachmentPagination: {
      page: 1,
      perPage: 20,
      total: 0
    }, // 附件分頁信息
    attachmentLoading: false, // 附件載入狀態
    attachmentFilters: {
      q: '', // 搜尋關鍵字
      client: '', // 客戶
      type: '', // 類型（任務附件、客戶附件、收據附件）
      taskId: '' // 任務ID篩選
    }
  }),

  getters: {
    // 獲取當前篩選條件
    currentFilters: (state) => state.filters
  },

  actions: {
    /**
     * 設置當前激活的標籤
     * @param {string} tab - 標籤名稱
     */
    setActiveTab(tab) {
      this.activeTab = tab
    },

    /**
     * 設置篩選條件
     * @param {Object} filters - 篩選條件對象
     */
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },

    /**
     * 更新單個篩選條件
     * @param {string} key - 篩選條件鍵
     * @param {any} value - 篩選條件值
     */
    updateFilter(key, value) {
      this.filters[key] = value
    },

    /**
     * 清除所有篩選條件
     */
    clearFilters() {
      this.filters = {
        q: '',
        category: '',
        scope: '',
        client: '',
        year: '',
        month: '',
        tags: []
      }
    },

    normalizeDocument(doc) {
      if (!doc || typeof doc !== 'object') {
        return null
      }

      const documentId = doc.document_id || doc.documentId || doc.id
      const fileSize = doc.fileSize ?? doc.file_size ?? doc.size ?? doc.fileSizeBytes ?? doc.sizeBytes ?? 0
      const createdAt = doc.createdAt || doc.created_at || doc.uploadedAt || doc.upload_time || doc.created || null
      const updatedAt = doc.updatedAt || doc.updated_at || doc.modifiedAt || doc.updated || null
      const tags = Array.isArray(doc.tags)
        ? doc.tags
        : typeof doc.tags === 'string'
          ? doc.tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : []

      return {
        ...doc,
        id: documentId,
        document_id: documentId,
        documentId,
        title: doc.title || doc.document_title || doc.fileName || doc.file_name || doc.name || '',
        fileName: doc.fileName || doc.file_name || doc.filename || doc.name || '',
        file_name: doc.file_name || doc.fileName || doc.filename || doc.name || '',
        fileUrl: doc.fileUrl || doc.file_url || doc.filePath || '',
        file_url: doc.file_url || doc.fileUrl || doc.filePath || '',
        fileSize,
        file_size: fileSize,
        category: doc.category || doc.service_id || doc.category_id || null,
        scope: doc.scope || doc.document_scope || null,
        clientId: doc.clientId ?? doc.client_id ?? doc.client ?? null,
        client_id: doc.client_id ?? doc.clientId ?? doc.client ?? null,
        docYear: doc.docYear ?? doc.doc_year ?? doc.year ?? null,
        docMonth: doc.docMonth ?? doc.doc_month ?? doc.month ?? null,
        tags,
        createdAt,
        created_at: createdAt,
        updatedAt,
        updated_at: updatedAt,
        uploaderName: doc.uploaderName || doc.uploader_name || doc.uploadedByName || null,
        uploadedBy: doc.uploadedBy ?? doc.uploaded_by ?? null
      }
    },

    /**
     * 載入服務類型列表
     */
    async fetchServices() {
      this.loading = true
      this.error = null
      try {
        const response = await fetchServices()
        // 處理多種 API 響應格式
        const data = extractApiData(response, {})
        // 後端返回的 data 可能是數組，也可能是包含 services 字段的對象
        if (Array.isArray(data)) {
          this.services = data
        } else if (data.services && Array.isArray(data.services)) {
          this.services = data.services
        } else {
          this.services = extractApiArray(response, [])
        }
        console.log('載入的服務類型:', this.services)
        console.log('服務類型數量:', this.services.length)
        if (this.services.length > 0) {
          console.log('第一個服務類型:', this.services[0])
        }
        return response
      } catch (error) {
        console.error('載入服務類型失敗:', error)
        this.error = error.message || '載入服務類型失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 載入客戶列表
     */
    async fetchClients() {
      this.loading = true
      this.error = null
      try {
        const response = await fetchClients({ per_page: 1000 })
        // 處理多種 API 響應格式
        const data = extractApiData(response, {})
        // 後端返回的 data 可能是數組，也可能是包含 clients 字段的對象
        if (Array.isArray(data)) {
          this.clients = data
        } else if (data.clients && Array.isArray(data.clients)) {
          this.clients = data.clients
        } else {
          this.clients = extractApiArray(response, [])
        }
        console.log('載入的客戶列表:', this.clients)
        console.log('客戶數量:', this.clients.length)
        if (this.clients.length > 0) {
          console.log('第一個客戶:', this.clients[0])
        }
        return response
      } catch (error) {
        console.error('載入客戶列表失敗:', error)
        this.error = error.message || '載入客戶列表失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 載入標籤列表（從 FAQ 記錄自動提取 + localStorage 備份）
     */
    async fetchTags() {
      try {
        // 1. 先從 localStorage 載入備份標籤
        let storedTags = []
        try {
          const storedTagsStr = localStorage.getItem('knowledge_tags')
          if (storedTagsStr) {
            storedTags = JSON.parse(storedTagsStr)
          }
        } catch (e) {
          console.warn('從 localStorage 載入標籤失敗:', e)
        }

        // 2. 從 FAQ 記錄中提取標籤
        let faqTags = []
        try {
          // 獲取 FAQ 記錄來提取標籤（使用默認分頁，避免過大請求）
          // 嘗試獲取多頁以獲取更多標籤，但限制總數
          const maxPages = 5 // 最多獲取 5 頁，即最多 100 個 FAQ
          const allTags = new Set()
          
          for (let page = 1; page <= maxPages; page++) {
            try {
              const response = await fetchFAQs({ per_page: 20, page })
              const data = extractApiData(response, {})
              const faqs = Array.isArray(data) ? data : (data.faqs || extractApiArray(response, []))
              
              if (!faqs || faqs.length === 0) {
                break // 沒有更多數據了
              }
              
              // 從每個 FAQ 中提取標籤
              faqs.forEach(faq => {
                if (faq.tags) {
                  let tags = []
                  if (Array.isArray(faq.tags)) {
                    tags = faq.tags
                  } else if (typeof faq.tags === 'string') {
                    // 處理逗號分隔的字串
                    tags = faq.tags.split(',').map(t => t.trim()).filter(Boolean)
                  }
                  tags.forEach(tag => {
                    if (tag) {
                      allTags.add(tag)
                    }
                  })
                }
              })
              
              // 檢查是否還有更多頁
              const hasNext = response.meta?.hasNext || (faqs.length < 20)
              if (!hasNext) {
                break
              }
            } catch (pageError) {
              console.warn(`獲取第 ${page} 頁 FAQ 失敗:`, pageError)
              break // 如果某一頁失敗，停止獲取
            }
          }
          
          faqTags = Array.from(allTags).sort()
          console.log('從 FAQ 提取的標籤:', faqTags.length, faqTags)
        } catch (error) {
          console.warn('從 FAQ 提取標籤失敗:', error)
        }

        // 3. 合併兩個來源的標籤並去重
        const mergedTags = new Set([...faqTags, ...storedTags])
        this.tags = Array.from(mergedTags).sort()
        
        // 4. 更新 localStorage 作為備份
        if (this.tags.length > 0) {
          try {
            localStorage.setItem('knowledge_tags', JSON.stringify(this.tags))
          } catch (e) {
            console.warn('保存標籤到 localStorage 失敗:', e)
          }
        }
        
        console.log('載入的標籤列表:', this.tags.length, this.tags)
        return this.tags
      } catch (error) {
        console.error('載入標籤失敗:', error)
        // 失敗時嘗試從 localStorage 載入
        try {
          const storedTags = localStorage.getItem('knowledge_tags')
          if (storedTags) {
            this.tags = JSON.parse(storedTags)
          } else {
            this.tags = []
          }
        } catch (e) {
          this.tags = []
        }
        return this.tags
      }
    },

    /**
     * 保存標籤列表（到 localStorage）
     * @param {Array} tags - 標籤列表
     */
    saveTags(tags) {
      try {
        this.tags = tags
        localStorage.setItem('knowledge_tags', JSON.stringify(tags))
      } catch (error) {
        console.error('保存標籤失敗:', error)
        throw error
      }
    },

    /**
     * 清除錯誤狀態
     */
    clearError() {
      this.error = null
    },

    /**
     * 載入 SOP 列表
     * @param {Object} params - 查詢參數
     */
    async fetchSOPs(params = {}) {
      this.sopLoading = true
      this.error = null
      try {
        // 構建查詢參數
        const queryParams = {
          page: this.sopPagination.page,
          per_page: this.sopPagination.perPage,
          ...this.filters,
          ...params
        }

        // 將 client 轉換為 client_id（後端期望的參數名）
        if (queryParams.client) {
          queryParams.client_id = queryParams.client
          delete queryParams.client
        }

        // 處理標籤參數（SOP 後端不支持標籤篩選，使用搜索關鍵字）
        if (Array.isArray(queryParams.tags) && queryParams.tags.length > 0) {
          // SOP 後端沒有專門的標籤篩選，將標籤添加到搜索關鍵字中
          const tagSearch = queryParams.tags.join(' ')
          if (queryParams.q) {
            queryParams.q = `${queryParams.q} ${tagSearch}`
          } else {
            queryParams.q = tagSearch
          }
          // 移除 tags 參數，因為後端不支持
          delete queryParams.tags
        } else if (Array.isArray(queryParams.tags) && queryParams.tags.length === 0) {
          delete queryParams.tags
        }

        // 移除空值
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
            delete queryParams[key]
          }
        })

        const response = await fetchSOPs(queryParams)
        
        // 處理多種 API 響應格式
        const data = extractApiData(response, {})
        if (data.sops && Array.isArray(data.sops)) {
          this.sops = data.sops
          this.sopPagination.total = response.meta?.total || response.total || data.sops.length
        } else {
          this.sops = extractApiArray(response, [])
          this.sopPagination.total = response.meta?.total || response.total || this.sops.length
        }

        // 更新分頁信息
        if (response.meta) {
          this.sopPagination.page = response.meta.page || response.meta.current_page || this.sopPagination.page
          this.sopPagination.perPage = response.meta.per_page || response.meta.perPage || this.sopPagination.perPage
          this.sopPagination.total = response.meta.total || this.sopPagination.total
        }

        return response
      } catch (error) {
        this.error = error.message || '載入 SOP 列表失敗'
        throw error
      } finally {
        this.sopLoading = false
      }
    },

    /**
     * 載入單個 SOP 詳情
     * @param {string|number} id - SOP ID
     */
    async fetchSOP(id) {
      this.sopLoading = true
      this.error = null
      try {
        const response = await fetchSOP(id)
        
        // 處理多種 API 響應格式
        let sop = null
        if (response.data) {
          sop = response.data
        } else if (response.sop) {
          sop = response.sop
        } else {
          sop = response
        }

        this.currentSOP = sop
        return sop
      } catch (error) {
        this.error = error.message || '載入 SOP 詳情失敗'
        throw error
      } finally {
        this.sopLoading = false
      }
    },

    /**
     * 創建 SOP
     * @param {Object} data - SOP 數據
     */
    async createSOP(data) {
      this.sopLoading = true
      this.error = null
      try {
        const response = await createSOP(data)
        
        // 處理多種 API 響應格式
        let sop = null
        if (response.data) {
          sop = response.data
        } else if (response.sop) {
          sop = response.sop
        } else {
          sop = response
        }

        // 添加到列表
        this.sops.unshift(sop)
        this.sopPagination.total += 1

        return sop
      } catch (error) {
        this.error = error.message || '創建 SOP 失敗'
        throw error
      } finally {
        this.sopLoading = false
      }
    },

    /**
     * 更新 SOP
     * @param {string|number} id - SOP ID
     * @param {Object} data - SOP 數據
     */
    async updateSOP(id, data) {
      this.sopLoading = true
      this.error = null
      try {
        const response = await updateSOP(id, data)
        
        // 處理多種 API 響應格式
        let sop = null
        if (response.data) {
          sop = response.data
        } else if (response.sop) {
          sop = response.sop
        } else {
          sop = response
        }

        // 更新列表中的 SOP
        const index = this.sops.findIndex(s => {
          const sopId = s.id || s.sopId || s.sop_id
          return sopId === id
        })
        if (index !== -1) {
          this.sops[index] = sop
        }

        // 更新當前選中的 SOP
        if (this.currentSOP) {
          const currentId = this.currentSOP.id || this.currentSOP.sopId || this.currentSOP.sop_id
          if (currentId === id) {
            this.currentSOP = sop
          }
        }

        return sop
      } catch (error) {
        this.error = error.message || '更新 SOP 失敗'
        throw error
      } finally {
        this.sopLoading = false
      }
    },

    /**
     * 刪除 SOP
     * @param {string|number} id - SOP ID
     */
    async deleteSOP(id) {
      this.sopLoading = true
      this.error = null
      try {
        await deleteSOP(id)

        // 從列表中移除
        this.sops = this.sops.filter(s => {
          const sopId = s.id || s.sopId || s.sop_id
          return sopId !== id
        })
        this.sopPagination.total -= 1

        // 如果刪除的是當前選中的 SOP，清除當前選中
        if (this.currentSOP) {
          const currentId = this.currentSOP.id || this.currentSOP.sopId || this.currentSOP.sop_id
          if (currentId === id) {
            this.currentSOP = null
          }
        }

        return true
      } catch (error) {
        this.error = error.message || '刪除 SOP 失敗'
        throw error
      } finally {
        this.sopLoading = false
      }
    },

    /**
     * 設置當前選中的 SOP
     * @param {Object|null} sop - SOP 對象
     */
    setCurrentSOP(sop) {
      this.currentSOP = sop
    },

    /**
     * 設置 SOP 分頁信息
     * @param {Object} pagination - 分頁信息
     */
    setSOPPagination(pagination) {
      this.sopPagination = { ...this.sopPagination, ...pagination }
    },

    /**
     * 清除當前選中的 SOP
     */
    clearCurrentSOP() {
      this.currentSOP = null
    },

    /**
     * 載入 FAQ 列表
     * @param {Object} params - 查詢參數
     */
    async fetchFAQs(params = {}) {
      this.faqLoading = true
      this.error = null
      try {
        // 構建查詢參數
        const queryParams = {
          page: this.faqPagination.page,
          per_page: this.faqPagination.perPage,
          ...this.filters,
          ...params
        }

        // 將 client 轉換為 client_id（後端期望的參數名）
        if (queryParams.client) {
          queryParams.client_id = queryParams.client
          delete queryParams.client
        }

        // 處理標籤參數（FAQ 後端支持標籤篩選，轉換為逗號分隔的字符串）
        if (Array.isArray(queryParams.tags) && queryParams.tags.length > 0) {
          queryParams.tags = queryParams.tags.join(',')
        } else if (Array.isArray(queryParams.tags) && queryParams.tags.length === 0) {
          delete queryParams.tags
        }

        // 移除空值
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
            delete queryParams[key]
          }
        })

        const response = await fetchFAQs(queryParams)
        
        // 處理多種 API 響應格式
        const data = extractApiData(response, {})
        if (data.faqs && Array.isArray(data.faqs)) {
          this.faqs = data.faqs
          this.faqPagination.total = response.meta?.total || response.total || data.faqs.length
        } else {
          this.faqs = extractApiArray(response, [])
          this.faqPagination.total = response.meta?.total || response.total || this.faqs.length
        }

        // 更新分頁信息
        if (response.meta) {
          this.faqPagination.page = response.meta.page || response.meta.current_page || this.faqPagination.page
          this.faqPagination.perPage = response.meta.per_page || response.meta.perPage || this.faqPagination.perPage
          this.faqPagination.total = response.meta.total || this.faqPagination.total
        }

        return response
      } catch (error) {
        this.error = error.message || '載入 FAQ 列表失敗'
        throw error
      } finally {
        this.faqLoading = false
      }
    },

    /**
     * 載入單個 FAQ 詳情
     * @param {string|number} id - FAQ ID
     */
    async fetchFAQ(id) {
      this.faqLoading = true
      this.error = null
      try {
        const response = await fetchFAQ(id)
        
        // 處理多種 API 響應格式
        let faq = null
        if (response.data) {
          faq = response.data
        } else if (response.faq) {
          faq = response.faq
        } else {
          faq = response
        }

        this.currentFAQ = faq
        return faq
      } catch (error) {
        this.error = error.message || '載入 FAQ 詳情失敗'
        throw error
      } finally {
        this.faqLoading = false
      }
    },

    /**
     * 創建 FAQ
     * @param {Object} data - FAQ 數據
     */
    async createFAQ(data) {
      this.faqLoading = true
      this.error = null
      try {
        const response = await createFAQ(data)
        
        // 處理多種 API 響應格式
        let faq = null
        if (response.data) {
          faq = response.data
        } else if (response.faq) {
          faq = response.faq
        } else {
          faq = response
        }

        // 添加到列表
        this.faqs.unshift(faq)
        this.faqPagination.total += 1

        return faq
      } catch (error) {
        this.error = error.message || '創建 FAQ 失敗'
        throw error
      } finally {
        this.faqLoading = false
      }
    },

    /**
     * 更新 FAQ
     * @param {string|number} id - FAQ ID
     * @param {Object} data - FAQ 數據
     */
    async updateFAQ(id, data) {
      this.faqLoading = true
      this.error = null
      try {
        const response = await updateFAQ(id, data)
        
        // 處理多種 API 響應格式
        let faq = null
        if (response.data) {
          faq = response.data
        } else if (response.faq) {
          faq = response.faq
        } else {
          faq = response
        }

        // 更新列表中的 FAQ
        const index = this.faqs.findIndex(f => {
          const faqId = f.id || f.faqId || f.faq_id
          return faqId === id
        })
        if (index !== -1) {
          this.faqs[index] = faq
        }

        // 更新當前選中的 FAQ
        if (this.currentFAQ) {
          const currentId = this.currentFAQ.id || this.currentFAQ.faqId || this.currentFAQ.faq_id
          if (currentId === id) {
            this.currentFAQ = faq
          }
        }

        return faq
      } catch (error) {
        this.error = error.message || '更新 FAQ 失敗'
        throw error
      } finally {
        this.faqLoading = false
      }
    },

    /**
     * 刪除 FAQ
     * @param {string|number} id - FAQ ID
     */
    async deleteFAQ(id) {
      this.faqLoading = true
      this.error = null
      try {
        await deleteFAQ(id)

        // 從列表中移除
        this.faqs = this.faqs.filter(f => {
          const faqId = f.id || f.faqId || f.faq_id
          return faqId !== id
        })
        this.faqPagination.total -= 1

        // 如果刪除的是當前選中的 FAQ，清除當前選中
        if (this.currentFAQ) {
          const currentId = this.currentFAQ.id || this.currentFAQ.faqId || this.currentFAQ.faq_id
          if (currentId === id) {
            this.currentFAQ = null
          }
        }

        return true
      } catch (error) {
        this.error = error.message || '刪除 FAQ 失敗'
        throw error
      } finally {
        this.faqLoading = false
      }
    },

    /**
     * 設置當前選中的 FAQ
     * @param {Object|null} faq - FAQ 對象
     */
    setCurrentFAQ(faq) {
      this.currentFAQ = faq
    },

    /**
     * 設置 FAQ 分頁信息
     * @param {Object} pagination - 分頁信息
     */
    setFAQPagination(pagination) {
      this.faqPagination = { ...this.faqPagination, ...pagination }
    },

    /**
     * 清除當前選中的 FAQ
     */
    clearCurrentFAQ() {
      this.currentFAQ = null
    },

    /**
     * 載入文檔列表
     * @param {Object} params - 查詢參數
     */
    async fetchDocuments(params = {}) {
      this.documentLoading = true
      this.error = null
      try {
        // 構建查詢參數
        const queryParams = {
          page: this.documentPagination.page,
          per_page: this.documentPagination.perPage,
          ...this.filters,
          ...params
        }
 
        // 將 UI 使用的欄位名稱同步為後端期望的參數
        if (queryParams.client) {
          queryParams.client_id = queryParams.client
          delete queryParams.client
        }
        if (queryParams.per_page !== undefined) {
          queryParams.perPage = queryParams.per_page
          delete queryParams.per_page
        }
        if (queryParams.scope === 'all') {
          delete queryParams.scope
        }

        if (queryParams.__append !== undefined) {
          delete queryParams.__append
        }

        // 處理標籤參數（如果是數組，轉換為逗號分隔的字符串）
        if (Array.isArray(queryParams.tags) && queryParams.tags.length > 0) {
          queryParams.tags = queryParams.tags.join(',')
        } else if (Array.isArray(queryParams.tags) && queryParams.tags.length === 0) {
          delete queryParams.tags
        }

        // 移除空值
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
            delete queryParams[key]
          }
        })

        const response = await fetchDocuments(queryParams)
        console.log('[KnowledgeStore] fetchDocuments response:', response)
        const data = extractApiData(response, {})
        let documents = []
        if (Array.isArray(data)) {
          documents = data
        } else if (Array.isArray(data.items)) {
          documents = data.items
        } else if (Array.isArray(data.documents)) {
          documents = data.documents
        } else {
          documents = extractApiArray(response, [])
        }

        const normalizedDocuments = documents
          .map(doc => this.normalizeDocument(doc))
          .filter(Boolean)

        if (params && params.__append === true) {
          const existingIds = new Set(
            this.documents.map(doc => doc.document_id || doc.id || doc.documentId)
          )
          const merged = normalizedDocuments.filter(doc => {
            const docId = doc.document_id || doc.id || doc.documentId
            return docId && !existingIds.has(docId)
          })
          this.documents = [...merged, ...this.documents]
        } else {
          this.documents = normalizedDocuments
        }
        this.documentPagination.total = response.meta?.total || response.total || this.documents.length

        if (response.meta) {
          this.documentPagination.page = response.meta.page || response.meta.current_page || this.documentPagination.page
          const perPageValue = response.meta.per_page || response.meta.perPage || this.documentPagination.perPage
          this.documentPagination.perPage = perPageValue
          this.documentPagination.total = response.meta.total || this.documentPagination.total
        }

        // 維持或設定當前選中的文檔
        if (this.documents.length === 0) {
          this.currentDocument = null
        } else if (!this.currentDocument) {
          this.currentDocument = this.documents[0]
        } else {
          const currentId = this.currentDocument.document_id || this.currentDocument.id || this.currentDocument.documentId
          const matched = this.documents.find(doc => {
            const docId = doc.document_id || doc.id || doc.documentId
            return docId === currentId
          })
          this.currentDocument = matched || this.documents[0]
        }

        return response
      } catch (error) {
        this.error = error.message || '載入文檔列表失敗'
        throw error
      } finally {
        this.documentLoading = false
      }
    },

    /**
     * 載入單個文檔詳情
     * @param {string|number} id - 文檔 ID
     */
    async fetchDocument(id) {
      this.documentLoading = true
      this.error = null
      try {
        const response = await fetchDocument(id)
        
        // 處理多種 API 響應格式
        let document = null
        if (response.data) {
          document = response.data
        } else if (response.document) {
          document = response.document
        } else {
          document = response
        }

        this.currentDocument = document
        return document
      } catch (error) {
        this.error = error.message || '載入文檔詳情失敗'
        throw error
      } finally {
        this.documentLoading = false
      }
    },

    /**
     * 上傳文檔
     * @param {FormData} formData - 表單數據
     * @param {Function} onProgress - 進度回調
     */
    async uploadDocument(formData, onProgress) {
      this.documentLoading = true
      this.error = null
      try {
        console.log('Store: 開始上傳文檔')
        const response = await uploadDocumentApi(formData, onProgress)
        console.log('Store: 上傳文檔響應:', response)
        
        // 處理 API 響應格式（axios 攔截器返回 response.data）
        // successResponse 返回格式: { ok: true, data: {...}, message: "...", meta: {...} }
        let document = null
        if (response && typeof response === 'object') {
          if (response.ok && response.data) {
            // 標準響應格式
            document = response.data
          } else if (response.data && !response.ok) {
            // 有 data 但 ok 為 false（錯誤響應）
            throw new Error(response.message || '上傳失敗')
          } else if (response.document_id || response.id) {
            // 響應本身就是文檔對象
            document = response
          } else if (response.document) {
            document = response.document
          } else {
            document = response
          }
        } else {
          document = response
        }

        console.log('Store: 處理後的文檔對象:', document)

        const normalizedDocument = this.normalizeDocument(document)

        if (normalizedDocument) {
          const existingIndex = this.documents.findIndex(doc => {
            const docId = doc.document_id || doc.id || doc.documentId
            const newId = normalizedDocument.document_id || normalizedDocument.id || normalizedDocument.documentId
            return docId === newId
          })

          if (existingIndex !== -1) {
            this.documents.splice(existingIndex, 1, normalizedDocument)
          } else {
            this.documents.unshift(normalizedDocument)
            this.documentPagination.total += 1
          }

          this.currentDocument = normalizedDocument
        }

        return normalizedDocument
      } catch (error) {
        console.error('Store: 上傳文檔錯誤:', error)
        console.error('Store: 錯誤詳情:', {
          message: error.message,
          response: error.response,
          request: error.request
        })
        this.error = error.message || '上傳文檔失敗'
        throw error
      } finally {
        this.documentLoading = false
      }
    },

    /**
     * 更新文檔
     * @param {string|number} id - 文檔 ID
     * @param {Object|FormData} data - 文檔數據
     * @param {Function} [onProgress] - 進度回調（用於文件上傳）
     */
    async updateDocument(id, data, onProgress) {
      this.documentLoading = true
      this.error = null
      try {
        console.log('Store: 開始更新文檔:', id)
        const response = await updateDocumentApi(id, data, onProgress)
        console.log('Store: 更新文檔響應:', response)
        
        // 處理 API 響應格式
        let document = null
        if (response && typeof response === 'object') {
          if (response.ok && response.data) {
            // 標準響應格式
            document = response.data
          } else if (response.data && !response.ok) {
            // 有 data 但 ok 為 false（錯誤響應）
            throw new Error(response.message || '更新失敗')
          } else if (response.document_id || response.id) {
            // 響應本身就是文檔對象
            document = response
          } else if (response.document) {
            document = response.document
          } else {
            document = response
          }
        } else {
          document = response
        }

        console.log('Store: 處理後的文檔對象:', document)

        const normalizedDocument = this.normalizeDocument(document)

        if (normalizedDocument) {
          // 更新列表中的文檔
          const existingIndex = this.documents.findIndex(doc => {
            const docId = doc.document_id || doc.id || doc.documentId
            const updateId = normalizedDocument.document_id || normalizedDocument.id || normalizedDocument.documentId
            return docId === updateId
          })

          if (existingIndex !== -1) {
            this.documents.splice(existingIndex, 1, normalizedDocument)
          }

          // 如果更新的是當前選中的文檔，更新當前選中
          if (this.currentDocument) {
            const currentId = this.currentDocument.id || this.currentDocument.documentId || this.currentDocument.document_id
            const updateId = normalizedDocument.document_id || normalizedDocument.id || normalizedDocument.documentId
            if (String(currentId) === String(updateId)) {
              this.currentDocument = normalizedDocument
            }
          }
        }

        return normalizedDocument
      } catch (error) {
        console.error('Store: 更新文檔錯誤:', error)
        console.error('Store: 錯誤詳情:', {
          message: error.message,
          response: error.response,
          request: error.request
        })
        this.error = error.message || '更新文檔失敗'
        throw error
      } finally {
        this.documentLoading = false
      }
    },

    /**
     * 下載文檔
     * @param {string|number} id - 文檔 ID
     * @returns {Promise<Blob>} Blob 數據
     */
    async downloadDocument(id) {
      this.documentLoading = true
      this.error = null
      try {
        const blob = await downloadDocument(id)
        return blob
      } catch (error) {
        this.error = error.message || '下載文檔失敗'
        throw error
      } finally {
        this.documentLoading = false
      }
    },

    /**
     * 批量刪除文檔
     * @param {Array<string|number>} ids - 文檔 ID 數組
     * @returns {Promise<Object>} 響應數據，包含 success_count, failed_count, success_ids, failed_ids 等
     */
    async batchDeleteDocuments(ids) {
      this.documentLoading = true
      this.error = null
      try {
        console.log('Store: 開始批量刪除文檔:', ids)
        const response = await batchDeleteDocumentsApi(ids)
        console.log('Store: 批量刪除文檔響應:', response)
        
        // 處理 API 響應格式
        let result = null
        if (response && typeof response === 'object') {
          if (response.ok && response.data) {
            // 標準響應格式
            result = response.data
          } else if (response.data && !response.ok) {
            // 有 data 但 ok 為 false（錯誤響應）
            throw new Error(response.message || '批量刪除失敗')
          } else {
            // 響應本身就是結果對象
            result = response
          }
        } else {
          result = response
        }

        console.log('Store: 處理後的批量刪除結果:', result)

        // 從響應中獲取成功和失敗的 ID
        const successIds = result?.success_ids || []
        const failedIds = result?.failed_ids || []
        const successCount = result?.success_count || successIds.length
        const failedCount = result?.failed_count || failedIds.length

        // 從列表中移除成功刪除的文檔
        if (successIds.length > 0) {
          this.documents = this.documents.filter(d => {
            const docId = d.id || d.documentId || d.document_id
            return !successIds.includes(Number(docId))
          })
          this.documentPagination.total -= successCount
        }

        // 如果當前選中的文檔被刪除，清除當前選中
        if (this.currentDocument && successIds.length > 0) {
          const currentId = this.currentDocument.id || this.currentDocument.documentId || this.currentDocument.document_id
          if (successIds.includes(Number(currentId))) {
            this.currentDocument = null
          }
        }

        // 返回結果，包含成功和失敗的統計信息
        return {
          success_count: successCount,
          failed_count: failedCount,
          success_ids: successIds,
          failed_ids: failedIds,
          unauthorized_ids: result?.unauthorized_ids || [],
          not_found_ids: result?.not_found_ids || [],
          message: result?.message || response?.message || `已成功刪除 ${successCount} 筆文檔${failedCount > 0 ? `，${failedCount} 筆失敗` : ''}`
        }
      } catch (error) {
        console.error('Store: 批量刪除文檔錯誤:', error)
        console.error('Store: 錯誤詳情:', {
          message: error.message,
          response: error.response,
          request: error.request
        })
        this.error = error.message || '批量刪除文檔失敗'
        throw error
      } finally {
        this.documentLoading = false
      }
    },

    /**
     * 刪除文檔
     * @param {string|number} id - 文檔 ID
     */
    async deleteDocument(id) {
      this.documentLoading = true
      this.error = null
      try {
        await deleteDocument(id)

        // 從列表中移除
        this.documents = this.documents.filter(d => {
          const docId = d.id || d.documentId || d.document_id
          return docId !== id
        })
        this.documentPagination.total -= 1

        // 如果刪除的是當前選中的文檔，清除當前選中
        if (this.currentDocument) {
          const currentId = this.currentDocument.id || this.currentDocument.documentId || this.currentDocument.document_id
          if (currentId === id) {
            this.currentDocument = null
          }
        }

        return true
      } catch (error) {
        this.error = error.message || '刪除文檔失敗'
        throw error
      } finally {
        this.documentLoading = false
      }
    },

    /**
     * 設置當前選中的文檔
     * @param {Object|null} document - 文檔對象
     */
    setCurrentDocument(document) {
      this.currentDocument = document
    },

    /**
     * 設置文檔分頁信息
     * @param {Object} pagination - 分頁信息
     */
    setDocumentPagination(pagination) {
      this.documentPagination = { ...this.documentPagination, ...pagination }
    },

    /**
     * 清除當前選中的文檔
     */
    clearCurrentDocument() {
      this.currentDocument = null
    },

    /**
     * 載入附件列表
     * @param {Object} params - 查詢參數
     */
    async fetchAttachments(params = {}) {
      this.attachmentLoading = true
      this.error = null
      try {
        // 構建查詢參數，使用新的 /api/v2/attachments API 參數格式
        const queryParams = {
          page: this.attachmentPagination.page,
          perPage: this.attachmentPagination.perPage,
          ...this.attachmentFilters,
          ...params
        }

        // 參數轉換：將舊的參數名稱轉換為新的 API 參數
        // taskId -> entity_id (當 entity_type 為 task 時)
        if (queryParams.taskId && !queryParams.entity_id) {
          queryParams.entity_type = 'task'
          queryParams.entity_id = String(queryParams.taskId)
          delete queryParams.taskId
        }

        // type -> entity_type
        if (queryParams.type && !queryParams.entity_type) {
          queryParams.entity_type = queryParams.type
        }

        // client -> entity_id (當 entity_type 為 client 時)
        if (queryParams.client && !queryParams.entity_id && queryParams.entity_type === 'client') {
          queryParams.entity_id = queryParams.client
          delete queryParams.client
        }

        // per_page -> perPage
        if (queryParams.per_page !== undefined && queryParams.perPage === undefined) {
          queryParams.perPage = queryParams.per_page
          delete queryParams.per_page
        }

        // 移除空值
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
            delete queryParams[key]
          }
        })

        // 調用新的附件 API
        const response = await fetchAttachmentsApi(queryParams)
        
        // 處理 API 響應格式：{ ok: true, data: { attachments: [...], total, page, perPage }, message: "..." }
        const responseData = response?.data || response
        let attachmentsData = []
        let total = 0
        let page = 1
        let perPage = 20

        if (responseData?.attachments && Array.isArray(responseData.attachments)) {
          attachmentsData = responseData.attachments
          total = responseData.total || 0
          page = responseData.page || this.attachmentPagination.page
          perPage = responseData.perPage || responseData.per_page || this.attachmentPagination.perPage
        } else if (Array.isArray(responseData)) {
          attachmentsData = responseData
          total = responseData.length
        } else {
          attachmentsData = extractApiArray(response, [])
          total = response?.meta?.total || response?.total || attachmentsData.length
        }
        
        // 標準化附件數據，確保字段名稱一致
        this.attachments = attachmentsData.map(att => {
          // 後端返回的字段：attachment_id, entity_type, entity_id, entity_name, object_key, filename, content_type, size_bytes, uploader_user_id, uploader_name, uploaded_at
          // 同時支持 snake_case 和 camelCase
          return {
            // 原始數據
            ...att,
            // ID 字段（支持多種格式）
            id: att.attachment_id || att.id || att.document_id,
            attachment_id: att.attachment_id || att.id || att.document_id,
            document_id: att.attachment_id || att.id || att.document_id,
            // 實體相關字段
            entity_type: att.entity_type || att.entityType,
            entityType: att.entity_type || att.entityType,
            entity_id: att.entity_id || att.entityId,
            entityId: att.entity_id || att.entityId,
            entity_name: att.entity_name || att.entityName,
            entityName: att.entity_name || att.entityName,
            // 文件相關字段
            filename: att.filename || att.name || att.file_name || att.original_name,
            name: att.filename || att.name || att.file_name || att.original_name,
            file_name: att.filename || att.name || att.file_name || att.original_name,
            original_name: att.original_name || att.filename || att.name || att.file_name,
            object_key: att.object_key || att.objectKey,
            objectKey: att.object_key || att.objectKey,
            content_type: att.content_type || att.contentType || att.mime_type || att.type,
            contentType: att.content_type || att.contentType || att.mime_type || att.type,
            mime_type: att.content_type || att.contentType || att.mime_type || att.type,
            type: att.content_type || att.contentType || att.mime_type || att.type,
            // 大小字段
            size_bytes: att.size_bytes || att.sizeBytes || att.size || att.file_size || 0,
            sizeBytes: att.size_bytes || att.sizeBytes || att.size || att.file_size || 0,
            size: att.size_bytes || att.sizeBytes || att.size || att.file_size || 0,
            file_size: att.size_bytes || att.sizeBytes || att.size || att.file_size || 0,
            // 上傳者字段
            uploader_user_id: att.uploader_user_id || att.uploaderUserId,
            uploaderUserId: att.uploader_user_id || att.uploaderUserId,
            uploader_name: att.uploader_name || att.uploaderName,
            uploaderName: att.uploader_name || att.uploaderName,
            // 時間字段
            uploaded_at: att.uploaded_at || att.uploadedAt || att.created_at || att.createdAt,
            uploadedAt: att.uploaded_at || att.uploadedAt || att.created_at || att.createdAt,
            created_at: att.uploaded_at || att.uploadedAt || att.created_at || att.createdAt,
            createdAt: att.uploaded_at || att.uploadedAt || att.created_at || att.createdAt,
            upload_time: att.uploaded_at || att.uploadedAt || att.created_at || att.createdAt
          }
        })
        
        // 更新分頁信息
        this.attachmentPagination.page = page
        this.attachmentPagination.perPage = perPage
        this.attachmentPagination.total = total

        return response
      } catch (error) {
        this.error = error.message || '載入附件列表失敗'
        throw error
      } finally {
        this.attachmentLoading = false
      }
    },

    /**
     * 上傳附件
     * @param {FormData} formData - 表單數據
     * @param {Function} onProgress - 進度回調
     */
    async uploadAttachment(formData, onProgress) {
      this.attachmentLoading = true
      this.error = null
      try {
        console.log('Store: 開始上傳附件')
        
        const file = formData.get('file')
        const fileInfo = {
          name: file?.name || '',
          size: file?.size || 0,
          type: file?.type || 'application/octet-stream',
          mime_type: file?.type || 'application/octet-stream'
        }
        
        const title = formData.get('title') || fileInfo.name
        const description = formData.get('description') || ''

        const scopeValue = this.attachmentFilters.type === 'task' || this.attachmentFilters.taskId ? 'task' : 'service'
        if (!formData.has('scope')) {
          formData.append('scope', scopeValue)
        } else {
          formData.set('scope', scopeValue)
        }
        if (!formData.has('task_id') && this.attachmentFilters.taskId) {
          formData.append('task_id', this.attachmentFilters.taskId)
        }

        const response = await uploadDocumentApi(formData, onProgress)
        console.log('Store: 上傳附件響應:', response)

        if (!response || !response.ok || !response.data) {
          throw new Error(response?.message || '上傳失敗')
        }

        let attachment = response.data

        const attachmentId = attachment.document_id || attachment.attachment_id || attachment.id
        if (attachmentId) {
          attachment = {
            ...attachment,
            id: attachmentId,
            document_id: attachment.document_id || attachmentId,
            attachment_id: attachment.attachment_id || attachmentId,
            name: attachment.name || title || fileInfo.name,
            filename: attachment.fileName || attachment.filename || fileInfo.name,
            original_name: attachment.original_name || attachment.fileName || attachment.filename || fileInfo.name,
            title: attachment.title || title,
            size: attachment.size || attachment.file_size || fileInfo.size,
            file_size: attachment.file_size || attachment.size || fileInfo.size,
            type: attachment.type || attachment.fileType || fileInfo.type,
            mime_type: attachment.mime_type || attachment.fileType || attachment.type || fileInfo.mime_type,
            description: attachment.description || description,
            created_at: attachment.createdAt || attachment.created_at || new Date().toISOString(),
            upload_time: attachment.createdAt || attachment.created_at || new Date().toISOString(),
            updated_at: attachment.updatedAt || attachment.updated_at || new Date().toISOString()
          }
        }

        console.log('Store: 處理後的附件對象:', attachment)

        if (attachment && (attachment.document_id || attachment.attachment_id || attachment.id)) {
          this.attachments.unshift(attachment)
          this.attachmentPagination.total += 1
        }

        return attachment
      } catch (error) {
        console.error('Store: 上傳附件錯誤:', error)
        console.error('Store: 錯誤詳情:', {
          message: error.message,
          response: error.response,
          request: error.request
        })
        this.error = error.message || '上傳附件失敗'
        throw error
      } finally {
        this.attachmentLoading = false
      }
    },

    /**
     * 下載附件
     * @param {string|number} id - 附件 ID
     * @returns {Promise<Blob>} Blob 數據
     */
    async downloadAttachment(id) {
      this.attachmentLoading = true
      this.error = null
      try {
        // 使用新的附件下載 API
        const blob = await downloadAttachmentApi(id)
        return blob
      } catch (error) {
        this.error = error.message || '下載附件失敗'
        throw error
      } finally {
        this.attachmentLoading = false
      }
    },

    /**
     * 刪除附件
     * @param {string|number} id - 附件 ID
     */
    async deleteAttachment(id) {
      this.attachmentLoading = true
      this.error = null
      try {
        // 使用新的附件刪除 API
        await deleteAttachmentApi(id)

        // 從列表中移除
        this.attachments = this.attachments.filter(a => {
          const attachId = a.attachment_id || a.id || a.document_id || a.attachmentId
          return String(attachId) !== String(id)
        })
        this.attachmentPagination.total = Math.max(0, this.attachmentPagination.total - 1)

        return true
      } catch (error) {
        this.error = error.message || '刪除附件失敗'
        throw error
      } finally {
        this.attachmentLoading = false
      }
    },

    /**
     * 設置附件篩選條件
     * @param {Object} filters - 篩選條件
     */
    setAttachmentFilters(filters) {
      this.attachmentFilters = { ...this.attachmentFilters, ...filters }
    },

    /**
     * 設置當前選中的附件
     * @param {Object|null} attachment - 附件對象
     */
    setCurrentAttachment(attachment) {
      this.currentAttachment = attachment
    },

    /**
     * 設置附件分頁信息
     * @param {Object} pagination - 分頁信息
     */
    setAttachmentPagination(pagination) {
      this.attachmentPagination = { ...this.attachmentPagination, ...pagination }
    }
  }
})

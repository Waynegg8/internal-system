import { defineStore } from 'pinia'
import { fetchServices, fetchClients, fetchSOPs, fetchSOP, createSOP, updateSOP, deleteSOP, fetchFAQs, fetchFAQ, createFAQ, updateFAQ, deleteFAQ, fetchDocuments, fetchDocument, uploadDocument as uploadDocumentApi, downloadDocument, deleteDocument } from '@/api/knowledge'
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
     * 載入標籤列表（從 localStorage）
     */
    fetchTags() {
      try {
        const storedTags = localStorage.getItem('knowledge_tags')
        if (storedTags) {
          this.tags = JSON.parse(storedTags)
        } else {
          this.tags = []
        }
      } catch (error) {
        console.error('載入標籤失敗:', error)
        this.tags = []
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
        // 構建查詢參數
        const queryParams = {
          page: this.attachmentPagination.page,
          per_page: this.attachmentPagination.perPage,
          ...this.attachmentFilters,
          ...params
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

        if (queryParams.taskId) {
          queryParams.task_id = queryParams.taskId
          delete queryParams.taskId
        }

        const response = await fetchDocuments(queryParams)
        
        // 保存當前列表中的附件信息（用於合併）
        const existingAttachmentsMap = new Map()
        this.attachments.forEach(att => {
          const id = att.id || att.attachment_id
          if (id) {
            existingAttachmentsMap.set(String(id), att)
          }
        })
        
        // 處理多種 API 響應格式
        const data = extractApiData(response, [])
        let newAttachments = []
        if (Array.isArray(data)) {
          newAttachments = data
        } else if (data?.documents && Array.isArray(data.documents)) {
          newAttachments = data.documents
        } else {
          newAttachments = extractApiArray(response, [])
        }
        
        // 合併已存在的附件信息（保留 size、name 等完整信息）
        this.attachments = newAttachments.map(att => {
          const id = att.id || att.attachment_id
          
          // 標準化 API 返回的字段名稱
          const normalizedAtt = {
            ...att,
            // 處理 size 字段（API 可能返回 sizeBytes）
            size: att.size || att.file_size || att.sizeBytes || att.size_bytes || 0,
            file_size: att.file_size || att.size || att.sizeBytes || att.size_bytes || 0,
            // 處理 name 字段
            name: att.name || att.filename || att.original_name || '',
            filename: att.filename || att.name || att.original_name || '',
            original_name: att.original_name || att.name || att.filename || '',
            // 處理 type 字段
            mime_type: att.mime_type || att.type || att.contentType || att.content_type || '',
            type: att.type || att.mime_type || att.contentType || att.content_type || '',
            // 處理時間字段
            created_at: att.created_at || att.upload_time || att.uploadedAt || '',
            upload_time: att.upload_time || att.created_at || att.uploadedAt || ''
          }
          
          if (id && existingAttachmentsMap.has(String(id))) {
            const existing = existingAttachmentsMap.get(String(id))
            // 合併：優先使用 API 返回的數據，但如果缺少 size 等字段，使用已存在的數據
            return {
              ...normalizedAtt,
              size: normalizedAtt.size || existing.size || existing.file_size || 0,
              file_size: normalizedAtt.file_size || normalizedAtt.size || existing.file_size || existing.size || 0,
              name: normalizedAtt.name || existing.name || existing.filename || '',
              filename: normalizedAtt.filename || normalizedAtt.name || existing.filename || existing.name || '',
              original_name: normalizedAtt.original_name || normalizedAtt.name || existing.original_name || existing.name || '',
              mime_type: normalizedAtt.mime_type || normalizedAtt.type || existing.mime_type || existing.type || '',
              type: normalizedAtt.type || normalizedAtt.mime_type || existing.type || existing.mime_type || '',
              created_at: normalizedAtt.created_at || normalizedAtt.upload_time || existing.created_at || existing.upload_time || '',
              upload_time: normalizedAtt.upload_time || normalizedAtt.created_at || existing.upload_time || existing.created_at || ''
            }
          }
          return normalizedAtt
        })
        
        // 更新分頁信息
        const meta = response.meta || response.metadata || null
        if (meta) {
          this.attachmentPagination.page = meta.page || meta.current_page || this.attachmentPagination.page
          this.attachmentPagination.perPage = meta.per_page || meta.perPage || this.attachmentPagination.perPage
          this.attachmentPagination.total = meta.total || this.attachments.length
        } else {
          this.attachmentPagination.total = this.attachments.length
        }

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
        const blob = await downloadDocument(id)
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
        await deleteDocument(id)

        // 從列表中移除
        this.attachments = this.attachments.filter(a => {
          const attachId = a.document_id || a.id || a.attachmentId || a.attachment_id
          return attachId !== id
        })
        this.attachmentPagination.total -= 1

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
     * 設置附件分頁信息
     * @param {Object} pagination - 分頁信息
     */
    setAttachmentPagination(pagination) {
      this.attachmentPagination = { ...this.attachmentPagination, ...pagination }
    }
  }
})

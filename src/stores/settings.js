import { defineStore } from 'pinia'
import { useSettingsApi } from '@/api/settings'
import { extractApiArray } from '@/utils/apiHelpers'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    services: [],
    serviceSOPs: [],
    taskTemplates: [],
    templateStages: {}, // 緩存各模板的任務階段列表（key: templateId, value: stages 數組）
    taskTemplateFilters: { // 任務模板搜索和過濾條件
      search: '', // 搜索關鍵詞（模板名稱、服務名稱、客戶名稱）
      service_id: null, // 服務 ID 過濾
      client_type: null // 客戶類型過濾：'unified' 表示統一模板，'specific' 表示客戶專屬
    },
    supportData: { // 支持數據（服務、客戶、SOP、資源文檔）
      services: [],
      clients: [],
      sops: [],
      documents: []
    },
    users: [],
    companySettings: null,
    automationComponents: [],
    componentTasks: {},
    previewTasks: [],
    holidays: [],
    loading: false,
    error: null
  }),
  
  actions: {
    // 獲取服務項目
    async getServices() {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().getServices()
        if (response.ok) {
          const services = response.data || []
          // 去重處理：確保每個 service_id 只出現一次
          const serviceMap = new Map()
          services.forEach(service => {
            const serviceId = service.service_id
            if (!serviceMap.has(serviceId)) {
              serviceMap.set(serviceId, service)
            } else {
              console.warn(`[SettingsStore] 發現重複的服務 ID: ${serviceId}`, service)
            }
          })
          this.services = Array.from(serviceMap.values())
        } else {
          this.error = response.message || '獲取服務項目失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '獲取服務項目失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建服務項目
    async createService(data) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().createService(data)
        if (response.ok) {
          // 刷新服務列表
          await this.getServices()
        } else {
          this.error = response.message || '創建服務項目失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '創建服務項目失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新服務項目
    async updateService(serviceId, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().updateService(serviceId, data)
        if (response.ok) {
          // 刷新服務列表
          await this.getServices()
        } else {
          this.error = response.message || '更新服務項目失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '更新服務項目失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除服務項目
    async deleteService(serviceId) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().deleteService(serviceId)
        if (response.ok) {
          // 刷新服務列表
          await this.getServices()
        } else {
          this.error = response.message || '刪除服務項目失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '刪除服務項目失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取服務層級 SOP 列表
    async getServiceSOPs() {
      this.error = null
      try {
        const response = await useSettingsApi().getServiceSOPs()
        if (response.ok) {
          this.serviceSOPs = response.data || []
        } else {
          this.error = response.message || '獲取服務層級 SOP 失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '獲取服務層級 SOP 失敗'
        throw error
      }
    },
    
    // 清除錯誤
    clearError() {
      this.error = null
    },
    
    // 獲取任務模板
    async getTaskTemplates(options = {}) {
      this.loading = true
      this.error = null
      try {
        // 如果 options 為空，使用 store 中的過濾條件
        const queryOptions = Object.keys(options).length > 0 
          ? options 
          : this.buildTaskTemplateQueryOptions()
        
        const response = await useSettingsApi().getTaskTemplates(queryOptions)
        // 處理多種 API 響應格式
        this.taskTemplates = extractApiArray(response, [])
        return response
      } catch (error) {
        this.error = error.message || '獲取任務模板失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 構建任務模板查詢選項（從 store 的過濾條件構建）
    buildTaskTemplateQueryOptions() {
      const options = {}
      
      // 搜索關鍵詞
      if (this.taskTemplateFilters.search && this.taskTemplateFilters.search.trim()) {
        options.search = this.taskTemplateFilters.search.trim()
      }
      
      // 服務 ID 過濾
      if (this.taskTemplateFilters.service_id !== null && this.taskTemplateFilters.service_id !== undefined) {
        options.service_id = this.taskTemplateFilters.service_id
      }
      
      // 客戶類型過濾
      if (this.taskTemplateFilters.client_type) {
        options.client_type = this.taskTemplateFilters.client_type
      }
      
      return options
    },
    
    // 設置任務模板搜索關鍵詞
    setTaskTemplateSearch(search) {
      this.taskTemplateFilters.search = search || ''
    },
    
    // 設置任務模板服務 ID 過濾
    setTaskTemplateServiceId(serviceId) {
      this.taskTemplateFilters.service_id = serviceId !== undefined && serviceId !== null ? serviceId : null
    },
    
    // 設置任務模板客戶類型過濾
    setTaskTemplateClientType(clientType) {
      this.taskTemplateFilters.client_type = clientType || null
    },
    
    // 重置任務模板過濾條件
    resetTaskTemplateFilters() {
      this.taskTemplateFilters = {
        search: '',
        service_id: null,
        client_type: null
      }
    },
    
    // 更新任務模板過濾條件（批量更新）
    updateTaskTemplateFilters(filters) {
      if (filters.search !== undefined) {
        this.taskTemplateFilters.search = filters.search || ''
      }
      if (filters.service_id !== undefined) {
        this.taskTemplateFilters.service_id = filters.service_id !== null && filters.service_id !== undefined ? filters.service_id : null
      }
      if (filters.client_type !== undefined) {
        this.taskTemplateFilters.client_type = filters.client_type || null
      }
    },
    
    // 創建任務模板
    async createTaskTemplate(data) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().createTaskTemplate(data)
        // 處理多種 API 響應格式
        if (response.ok || response.data) {
          // 成功後自動刷新模板列表
          await this.getTaskTemplates()
        } else {
          this.error = response.message || '創建任務模板失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '創建任務模板失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新任務模板
    async updateTaskTemplate(templateId, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().updateTaskTemplate(templateId, data)
        // 處理多種 API 響應格式
        if (response.ok || response.data) {
          // 成功後自動刷新模板列表
          await this.getTaskTemplates()
        } else {
          this.error = response.message || '更新任務模板失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '更新任務模板失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除任務模板
    // 獲取任務模板階段
    async getTaskTemplateStages(templateId) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().getTemplateStages(templateId)
        if (response.ok || response.data) {
          // 緩存階段資訊
          this.templateStages[templateId] = response.data || []
          return response
        } else {
          this.error = response.message || '獲取模板階段失敗'
          return response
        }
      } catch (error) {
        this.error = error.message || '獲取模板階段失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteTaskTemplate(templateId) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().deleteTaskTemplate(templateId)
        // 處理多種 API 響應格式
        if (response.ok || response.data !== undefined) {
          // 成功後自動刷新模板列表
          await this.getTaskTemplates()
          // 清除該模板的階段緩存
          if (this.templateStages[templateId]) {
            delete this.templateStages[templateId]
          }
        } else {
          this.error = response.message || '刪除任務模板失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '刪除任務模板失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取模板任務階段
    async getTemplateStages(templateId) {
      this.error = null
      try {
        // 先檢查緩存中是否已有該模板的階段
        if (this.templateStages[templateId]) {
          return { ok: true, data: this.templateStages[templateId] }
        }
        
        // 如果沒有，調用 API
        const response = await useSettingsApi().getTemplateStages(templateId)
        // 處理多種 API 響應格式
        const stages = extractApiArray(response, [])
        
        // 將結果存入緩存
        this.templateStages[templateId] = stages
        return { ok: true, data: stages }
      } catch (error) {
        this.error = error.message || '獲取任務階段失敗'
        throw error
      }
    },
    
    // 創建任務階段
    async createTemplateStage(templateId, data) {
      this.error = null
      try {
        const response = await useSettingsApi().createTemplateStage(templateId, data)
        // 處理多種 API 響應格式
        if (response.ok || response.data) {
          // 成功後清除該模板的緩存
          this.clearTemplateStagesCache(templateId)
        } else {
          this.error = response.message || '創建任務階段失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '創建任務階段失敗'
        throw error
      }
    },
    
    // 更新任務階段
    async updateTemplateStage(templateId, stageId, data) {
      this.error = null
      try {
        const response = await useSettingsApi().updateTemplateStage(templateId, stageId, data)
        // 處理多種 API 響應格式
        if (response.ok || response.data) {
          // 成功後清除該模板的緩存
          this.clearTemplateStagesCache(templateId)
        } else {
          this.error = response.message || '更新任務階段失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '更新任務階段失敗'
        throw error
      }
    },
    
    // 刪除任務階段
    async deleteTemplateStage(templateId, stageId) {
      this.error = null
      try {
        const response = await useSettingsApi().deleteTemplateStage(templateId, stageId)
        // 處理多種 API 響應格式
        if (response.ok || response.data !== undefined) {
          // 成功後清除該模板的緩存
          this.clearTemplateStagesCache(templateId)
        } else {
          this.error = response.message || '刪除任務階段失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '刪除任務階段失敗'
        throw error
      }
    },
    
    // 清除指定模板的階段緩存
    clearTemplateStagesCache(templateId) {
      if (this.templateStages[templateId]) {
        delete this.templateStages[templateId]
      }
    },
    
    // 獲取支持數據（服務、客戶、SOP、資源文檔）
    async fetchSupportData() {
      this.error = null
      try {
        // 並行載入所有支持數據
        const [servicesRes, clientsRes, sopsRes, documentsRes] = await Promise.all([
          useSettingsApi().getServices(),
          useSettingsApi().getClients(),
          useSettingsApi().getSOPs('task'),
          useSettingsApi().getDocuments('resource')
        ])
        
        // 處理服務列表
        const services = extractApiArray(servicesRes, [])
        
        // 處理客戶列表
        const clients = extractApiArray(clientsRes, [])
        
        // 處理 SOP 列表
        const sops = extractApiArray(sopsRes, [])
        
        // 處理資源文檔列表
        const documents = extractApiArray(documentsRes, [])
        
        // 存入 supportData
        this.supportData = {
          services,
          clients,
          sops,
          documents
        }
        
        return { ok: true, data: this.supportData }
      } catch (error) {
        this.error = error.message || '獲取支持數據失敗'
        throw error
      }
    },
    
    // 獲取用戶列表
    async getUsers() {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().getUsers()
        if (response.ok) {
          this.users = response.data || []
        } else {
          this.error = response.message || '獲取用戶列表失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '獲取用戶列表失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建用戶
    async createUser(data) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().createUser(data)
        if (response.ok) {
          // 刷新用戶列表
          await this.getUsers()
        } else {
          this.error = response.message || '創建用戶失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '創建用戶失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新用戶
    async updateUser(userId, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().updateUser(userId, data)
        if (response.ok) {
          // 刷新用戶列表
          await this.getUsers()
        } else {
          this.error = response.message || '更新用戶失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '更新用戶失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除用戶
    async deleteUser(userId) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().deleteUser(userId)
        if (response.ok) {
          // 刷新用戶列表
          await this.getUsers()
        } else {
          this.error = response.message || '刪除用戶失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '刪除用戶失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 重置用戶密碼
    async resetUserPassword(userId, newPassword) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().resetUserPassword(userId, newPassword)
        if (response.ok) {
          // 不刷新列表，只顯示成功提示
        } else {
          this.error = response.message || '重置密碼失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '重置密碼失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 查看用戶密碼（管理員專用）
    async getUserPassword(userId) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().getUserPassword(userId)
        if (!response.ok) {
          this.error = response.message || '查詢密碼失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '查詢密碼失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新當前用戶個人資料
    async updateMyProfile(data) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().updateMyProfile(data)
        if (response.ok) {
          // 不刷新列表，只顯示成功提示
        } else {
          this.error = response.message || '更新個人資料失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '更新個人資料失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取公司設定
    async getCompanySettings(setNumber) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().getCompanySettings(setNumber)
        if (response.ok) {
          // 將設定列表轉換為對象格式
          const settingsList = Array.isArray(response.data) ? response.data : []
          const settingsObj = {}
          const prefix = `company${setNumber}_`
          
          settingsList.forEach(setting => {
            if (setting.settingKey && setting.settingKey.startsWith(prefix)) {
              // 移除前綴，獲取字段名
              const fieldName = setting.settingKey.replace(prefix, '')
              settingsObj[fieldName] = setting.settingValue || ''
            }
          })
          
          this.companySettings = settingsObj
          return { ...response, formData: settingsObj }
        } else {
          this.error = response.message || '獲取公司設定失敗'
          return response
        }
      } catch (error) {
        this.error = error.message || '獲取公司設定失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 保存公司設定
    async saveCompanySettings(setNumber, formData) {
      this.loading = true
      this.error = null
      try {
        // 將表單數據轉換為設定列表格式
        const prefix = `company${setNumber}_`
        const settings = []
        
        // 定義所有可能的字段
        const fields = [
          'name',
          'name_en',
          'tax_id',
          'address',
          'address_line2',
          'phone',
          'bank',
          'bank_code',
          'account_number'
        ]
        
        fields.forEach(field => {
          settings.push({
            settingKey: `${prefix}${field}`,
            settingValue: formData[field] || ''
          })
        })
        
        const response = await useSettingsApi().saveCompanySettings(setNumber, settings)
        if (response.ok) {
          // 更新本地狀態
          this.companySettings = formData
        } else {
          this.error = response.message || '保存公司設定失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '保存公司設定失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取自動化規則
    async getAutoGenerateComponents() {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().getAutoGenerateComponents()
        if (response.ok) {
          this.automationComponents = response.data || []
        } else {
          this.error = response.message || '獲取自動化規則失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '獲取自動化規則失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取組成部分的任務配置
    async getComponentTasks(componentId) {
      this.error = null
      try {
        const response = await useSettingsApi().getComponentTasks(componentId)
        if (response.ok) {
          const tasks = response.data || []
          // 存入緩存
          this.componentTasks[componentId] = tasks
          return { ...response, tasks }
        } else {
          this.error = response.message || '獲取任務配置失敗'
          return response
        }
      } catch (error) {
        this.error = error.message || '獲取任務配置失敗'
        throw error
      }
    },
    
    // 預覽下月任務
    async previewNextMonthTasks(targetMonth) {
      this.loading = true
      this.error = null
      try {
        // 如果未提供 targetMonth，自動計算下個月
        if (!targetMonth) {
          const now = new Date()
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          targetMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
        }
        
        const response = await useSettingsApi().previewNextMonthTasks(targetMonth)
        if (response.ok) {
          this.previewTasks = response.data || []
        } else {
          this.error = response.message || '預覽任務失敗'
        }
        return { ...response, targetMonth }
      } catch (error) {
        this.error = error.message || '預覽任務失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取國定假日
    async getHolidays() {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().getHolidays()
        if (response.ok) {
          this.holidays = response.data || []
        } else {
          this.error = response.message || '獲取國定假日失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '獲取國定假日失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建國定假日
    async createHoliday(data) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().createHoliday(data)
        if (response.ok) {
          // 刷新假日列表
          await this.getHolidays()
        } else {
          this.error = response.message || '創建國定假日失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '創建國定假日失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新國定假日
    async updateHoliday(date, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().updateHoliday(date, data)
        if (response.ok) {
          // 刷新假日列表
          await this.getHolidays()
        } else {
          this.error = response.message || '更新國定假日失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '更新國定假日失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除國定假日
    async deleteHoliday(date) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().deleteHoliday(date)
        if (response.ok) {
          // 刷新假日列表
          await this.getHolidays()
        } else {
          this.error = response.message || '刪除國定假日失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '刪除國定假日失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 批量創建國定假日
    async batchCreateHolidays(holidays) {
      this.loading = true
      this.error = null
      try {
        const response = await useSettingsApi().batchCreateHolidays(holidays)
        if (response.ok) {
          // 刷新假日列表
          await this.getHolidays()
        } else {
          this.error = response.message || '批量創建國定假日失敗'
        }
        return response
      } catch (error) {
        this.error = error.message || '批量創建國定假日失敗'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})


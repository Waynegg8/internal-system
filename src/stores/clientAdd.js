import { defineStore } from 'pinia'
import { fetchAllUsers } from '@/api/users'
import { useClientApi, createClientService } from '@/api/clients'
import { fetchAllTags, createTag } from '@/api/tags'
import { fetchAllServices } from '@/api/services'
import { fetchAllSOPs } from '@/api/sop'
import { createBillingSchedule } from '@/api/billing'
import { batchSaveTaskConfigs, fetchTaskConfigs } from '@/api/task-configs'
import { extractApiArray, extractApiData } from '@/utils/apiHelpers'

export const useClientAddStore = defineStore('clientAdd', {
  state: () => ({
    formData: {
      company_name: '',
      tax_id: '', // 統一編號就是客戶編號，不需要單獨的 client_id 欄位
      contact_person: '',
      contact_person_2: '',
      assignee_user_id: null,
      phone: '',
      email: '',
      notes: '',
      billing_notes: '',
      selected_tags: [],
      // 新增欄位
      company_owner: '',
      company_address: '',
      capital_amount: null,
      shareholders: null, // JSON 格式
      directors_supervisors: null, // JSON 格式
      primary_contact_method: '',
      line_id: ''
    },
    supportData: {
      users: [],
      tags: [],
      services: [],
      sops: []
    },
    tempServices: [], // 臨時服務列表（包含任務配置）
    tempBillings: [], // 臨時收費列表
    loading: false,
    error: null,
    createdClientId: null,
    progress: {
      visible: false,
      percent: 0,
      status: 'active',
      text: ''
    }
  }),

  actions: {
    // 獲取支持數據
    async fetchSupportData() {
      this.loading = true
      this.error = null
      try {
        const usersResponse = await fetchAllUsers()
        this.supportData.users = usersResponse.data || []
        
        const tagsResponse = await fetchAllTags()
        this.supportData.tags = extractApiArray(tagsResponse, [])
        
        const servicesResponse = await fetchAllServices()
        const services = extractApiArray(servicesResponse, [])
        // 使用 Vue 的響應式方式設置數組
        this.supportData.services.splice(0, this.supportData.services.length, ...services)
        
        const sopsResponse = await fetchAllSOPs({ per_page: 1000 })
        this.supportData.sops = extractApiArray(sopsResponse, [])
      } catch (error) {
        this.error = error.message || '載入支持數據失敗'
        console.error('載入支持數據失敗:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 設置服務數據（用於直接設置）
    setServices(services) {
      this.supportData.services.splice(0, this.supportData.services.length, ...services)
    },

    // 獲取下一個個人客戶編號（統一編號就是客戶編號）
    async getNextClientId() {
      this.loading = true
      this.error = null
      try {
        const clientApi = useClientApi()
        const response = await clientApi.getNextPersonalClientId()
        // 生成的編號直接填入統一編號欄位（統一編號就是客戶編號）
        this.formData.tax_id = response.data?.next_id || ''
        return response
      } catch (error) {
        this.error = error.message || '獲取客戶編號失敗'
        console.error('獲取客戶編號失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 創建新標籤
    async createNewTag(tagData) {
      this.loading = true
      this.error = null
      try {
        const response = await createTag({
          tag_name: tagData.name,
          tag_color: tagData.color
        })
        
        await this.fetchAllTags()
        return response
      } catch (error) {
        this.error = error.message || '創建標籤失敗'
        console.error('創建標籤失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 獲取所有標籤
    async fetchAllTags() {
      try {
        const tagsResponse = await fetchAllTags()
        this.supportData.tags = extractApiArray(tagsResponse, [])
      } catch (error) {
        console.error('載入標籤失敗:', error)
        throw error
      }
    },

    // 更新選中的標籤
    updateSelectedTags(tagIds) {
      this.formData.selected_tags = tagIds
    },

    // 添加臨時服務
    async addTempService(service) {
      const tempServiceId = `temp_${Date.now()}`
      
      // 確保 service_id 是真正的服務ID，不是臨時ID
      let actualServiceId = service.service_id || service.id
      if (!actualServiceId || String(actualServiceId).startsWith('temp_')) {
        console.error('[addTempService] 無效的 service_id:', actualServiceId, 'service:', service)
        throw new Error('服務ID無效，請重新選擇服務')
      }
      
      const newService = {
        id: tempServiceId,
        service_id: actualServiceId, // 確保使用真正的服務ID（不是臨時ID）
        name: service.name || service.service_name,
        status: service.status || 'active',
        service_type: service.service_type || 'recurring',
        execution_months: service.execution_months || [],
        use_for_auto_generate: service.use_for_auto_generate !== undefined ? service.use_for_auto_generate : 1,
        start_date: service.start_date || null,
        tasks: [], // 任務配置列表（將自動建立）
        service_sops: [] // 服務層級 SOP
      }

      // 自動建立任務配置（使用任務模板）
      try {
        await this.autoCreateTaskConfigs(newService)
      } catch (error) {
        console.warn('自動建立任務配置失敗:', error)
        // 不阻止服務添加，用戶可以手動配置
      }

      this.tempServices.push(newService)
    },

    // 自動建立任務配置（使用任務模板）
    async autoCreateTaskConfigs(service) {
      if (!service || !service.service_id) {
        return
      }

      try {
        // 導入 request 用於 API 調用
        const requestModule = await import('@/api/request')
        const request = requestModule.default || requestModule
        
        // 1. 優先查詢客戶專屬模板（如果客戶已創建）
        let template = null
        if (this.createdClientId) {
          const clientTemplatesResponse = await request.get('/task-templates', {
            params: {
              service_id: service.service_id,
              client_id: this.createdClientId
            }
          })
          if (clientTemplatesResponse?.data && Array.isArray(clientTemplatesResponse.data)) {
            const activeTemplates = clientTemplatesResponse.data.filter(t => t.is_active)
            if (activeTemplates.length > 0) {
              template = activeTemplates[0]
            }
          }
        }

        // 2. 如果沒有客戶專屬模板，查詢通用模板
        if (!template) {
          const generalTemplatesResponse = await request.get('/task-templates', {
            params: {
              service_id: service.service_id,
              client_id: 'null' // 查詢通用模板（client_id 為 null）
            }
          })
          if (generalTemplatesResponse?.data && Array.isArray(generalTemplatesResponse.data)) {
            const activeTemplates = generalTemplatesResponse.data.filter(t => t.is_active)
            if (activeTemplates.length > 0) {
              template = activeTemplates[0]
            }
          }
        }

        // 3. 如果找到模板，套用模板並建立任務配置
        if (template && template.tasks && template.tasks.length > 0) {
          // 將模板的任務轉換為任務配置
          const taskConfigs = template.tasks.map((task, index) => ({
            name: task.task_name || task.stage_name || `任務 ${index + 1}`,
            assignee_user_id: task.assignee_user_id || null,
            estimated_hours: task.estimated_hours || null,
            advance_days: task.advance_days || template.default_advance_days || 7,
            due_rule: task.due_rule || template.default_due_date_rule || 'end_of_month',
            due_value: task.due_value || template.default_due_date_value || null,
            days_due: Number.isFinite(task.days_due) ? Number(task.days_due) : null,
            // 執行頻率從服務層級繼承，不使用模板的執行頻率
            execution_frequency: 'monthly', // 固定為 monthly，實際執行月份從服務層級繼承
            execution_months: service.execution_months || [], // 從服務層級繼承
            notes: task.notes || task.description || null,
            sops: task.sops || [],
            sop_ids: (task.sops || []).map(s => s.sop_id || s),
            stage_order: task.stage_order || index + 1,
            description: task.description || null,
            fromTemplate: true
          }))

          // 將任務配置添加到服務
          service.tasks = taskConfigs
        }
      } catch (error) {
        console.warn('自動建立任務配置失敗:', error)
        // 不拋出錯誤，允許用戶手動配置
      }
    },

    // 移除臨時服務
    removeTempService(tempServiceId) {
      const index = this.tempServices.findIndex(s => s.id === tempServiceId)
      if (index !== -1) {
        this.tempServices.splice(index, 1)
      }
    },

    // 更新臨時服務的任務配置
    updateTempServiceTasks(tempServiceId, tasks) {
      const service = this.tempServices.find(s => s.id === tempServiceId)
      if (service) {
        service.tasks = tasks
      }
    },

    // 更新臨時服務的 SOP
    updateTempServiceSOPs(tempServiceId, sops) {
      const service = this.tempServices.find(s => s.id === tempServiceId)
      if (service) {
        service.service_sops = sops
      }
    },

    // 添加臨時收費
    addTempBilling(billing) {
      // 如果 billing 已經有 id，使用它；否則生成新的
      const tempBillingId = billing.id || `temp_${Date.now()}_${Math.random()}`
      const newBilling = {
        id: tempBillingId,
        ...billing
      }
      this.tempBillings.push(newBilling)
    },

    // 移除臨時收費
    removeTempBilling(tempBillingId) {
      const index = this.tempBillings.findIndex(b => b.id === tempBillingId)
      if (index !== -1) {
        this.tempBillings.splice(index, 1)
      }
    },

    // 更新臨時收費
    updateTempBilling(tempBillingId, updates) {
      const billing = this.tempBillings.find(b => b.id === tempBillingId)
      if (billing) {
        Object.assign(billing, updates)
      }
    },

    // 批量移除臨時收費
    batchRemoveTempBillings(billingIds) {
      this.tempBillings = this.tempBillings.filter(b => !billingIds.includes(b.id))
    },

    // 提交客戶（完整流程）
    async submitClient() {
      this.loading = true
      this.error = null
      this.progress.visible = true
      this.progress.percent = 0
      this.progress.status = 'active'
      this.createdClientId = null

      try {
        // Step 1: 創建客戶基本資料（20%）
        // 如果客戶已存在，跳過創建步驟
        let clientId = this.createdClientId
        if (!clientId) {
          this.updateProgress(true, 10, 'active', '正在創建客戶基本資料...')
        const clientApi = useClientApi()
          // 準備請求數據（統一編號處理由後端完成）
          const clientData = {
            company_name: this.formData.company_name,
            tax_registration_number: this.formData.tax_id || null, // 統一編號就是客戶編號
            contact_person_1: this.formData.contact_person,
            contact_person_2: this.formData.contact_person_2,
            assignee_user_id: this.formData.assignee_user_id,
            phone: this.formData.phone,
            email: this.formData.email,
            client_notes: this.formData.notes,
            payment_notes: this.formData.billing_notes,
            company_owner: this.formData.company_owner || null,
            company_address: this.formData.company_address || null,
            capital_amount: this.formData.capital_amount || null,
            shareholders: this.formData.shareholders || null,
            directors_supervisors: this.formData.directors_supervisors || null,
            primary_contact_method: this.formData.primary_contact_method || null,
            line_id: this.formData.line_id || null
          }
          const clientResponse = await clientApi.createClient(clientData)
          clientId = clientResponse.data?.client_id || clientResponse.data?.clientId

        if (!clientId) {
          throw new Error('客戶ID未返回')
        }

        this.createdClientId = clientId
          this.updateProgress(true, 20, 'active', '客戶基本資料創建成功')
        } else {
          this.updateProgress(true, 20, 'active', '客戶基本資料已存在')
        }

        // Step 2: 更新客戶標籤（30%）
        if (this.formData.selected_tags && this.formData.selected_tags.length > 0) {
          this.updateProgress(true, 25, 'active', '正在設置客戶標籤...')
          const clientApi = useClientApi()
          await clientApi.updateClientTags(clientId, {
            tag_ids: this.formData.selected_tags
          })
          this.updateProgress(true, 30, 'active', '客戶標籤設置成功')
        } else {
          this.updateProgress(true, 30, 'active', '跳過標籤設置')
        }

        // Step 3: 創建服務及任務配置（30% - 60%）
        // 只保存尚未保存過的服務（沒有 client_service_id 的服務）
        const unsavedServices = this.tempServices.filter(s => !s.client_service_id)
        const totalServices = unsavedServices.length
        if (totalServices > 0) {
          this.updateProgress(true, 35, 'active', '正在創建客戶服務...')
          
          for (let i = 0; i < totalServices; i++) {
            const service = unsavedServices[i]
            const percentStart = 35 + ((60 - 35) / totalServices) * i
            const percentEnd = 35 + ((60 - 35) / totalServices) * (i + 1)

            this.updateProgress(true, percentStart, 'active', `正在創建服務: ${service.name}`)

            // 創建客戶服務
            const serviceResponse = await createClientService(clientId, {
              service_id: service.service_id,
              status: service.status || 'active',
              start_date: service.start_date || null
            })

            // 獲取創建的服務 ID（如果 API 返回）
            const clientServiceId = serviceResponse.data?.client_service_id || serviceResponse.data?.id
            if (clientServiceId) {
              service.client_service_id = clientServiceId
            }

            // 批量保存任務配置
            if (service.tasks && service.tasks.length > 0) {
              const taskPayload = {
                tasks: service.tasks.map(task => ({
                  task_name: task.name,
                  task_description: task.description,
                  assignee_user_id: task.assignee_user_id,
                  estimated_hours: task.estimated_hours,
                  advance_days: task.advance_days || 7,
                  due_rule: task.due_rule || 'end_of_month',
                  due_value: task.due_value,
                  days_due: Number.isFinite(task.days_due) ? Number(task.days_due) : null,
                  stage_order: task.stage_order || 0,
                  delivery_frequency: task.delivery_frequency || 'monthly',
                  delivery_months: task.delivery_months || null,
                  auto_generate: task.auto_generate !== false ? 1 : 0,
                  notes: task.notes,
                  sop_ids: task.sop_ids || []
                })),
                service_sops: (service.service_sops || []).map(s => s.sop_id || s.id)
              }

              await batchSaveTaskConfigs(clientId, service.service_id, taskPayload)
            }

            this.updateProgress(true, percentEnd, 'active', `服務 ${service.name} 創建完成`)
          }

          this.updateProgress(true, 60, 'active', '所有服務創建完成')
        } else {
          this.updateProgress(true, 60, 'active', '跳過服務創建（所有服務已保存）')
        }

        // Step 4: 創建收費排程（60% - 80%）
        // 只保存尚未保存過的收費（沒有 billing_schedule_id 的收費）
        const unsavedBillings = this.tempBillings.filter(b => !b.billing_schedule_id)
        const totalBillings = unsavedBillings.length
        if (totalBillings > 0) {
          this.updateProgress(true, 65, 'active', '正在創建收費排程...')
          
          for (let i = 0; i < totalBillings; i++) {
            const billing = unsavedBillings[i]
            const percentStart = 65 + ((80 - 65) / totalBillings) * i
            const percentEnd = 65 + ((80 - 65) / totalBillings) * (i + 1)

            this.updateProgress(true, percentStart, 'active', `正在創建收費排程 ${i + 1}/${totalBillings}`)

            const billingResponse = await createBillingSchedule({
              ...billing,
              client_id: clientId
            })

            // 獲取創建的收費計劃 ID（如果 API 返回）
            const billingScheduleId = billingResponse.data?.billing_schedule_id || billingResponse.data?.id
            if (billingScheduleId) {
              billing.billing_schedule_id = billingScheduleId
            }

            this.updateProgress(true, percentEnd, 'active', `收費排程 ${i + 1}/${totalBillings} 創建完成`)
          }

          this.updateProgress(true, 80, 'active', '所有收費排程創建完成')
        } else {
          this.updateProgress(true, 80, 'active', '跳過收費排程創建（所有收費已保存）')
        }

        // 完成
        this.updateProgress(true, 100, 'success', '客戶創建完成！')

        return clientId

      } catch (error) {
        this.error = error.message || '創建客戶失敗'
        this.updateProgress(true, this.progress.percent, 'exception', `錯誤: ${this.error}`)
        console.error('創建客戶失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 更新進度
    updateProgress(visible, percent, status, text) {
      this.progress.visible = visible
      this.progress.percent = percent
      this.progress.status = status
      this.progress.text = text
    },

    // 獨立保存帳務設定（客戶必須已存在）
    async saveBillings() {
      this.loading = true
      this.error = null
      
      try {
        // 檢查客戶是否已存在
        if (!this.createdClientId) {
          throw new Error('請先保存基本資訊，客戶必須已存在才能保存帳務設定')
        }
        
        const clientId = this.createdClientId
        const totalBillings = this.tempBillings.length
        
        if (totalBillings === 0) {
          // 沒有收費需要保存，直接返回
          return
        }
        
        // 保存所有收費計劃
        for (let i = 0; i < totalBillings; i++) {
          const billing = this.tempBillings[i]
          
          // 檢查收費是否已經保存過（如果有 billing_schedule_id 則表示已保存）
          if (billing.billing_schedule_id) {
            // 收費已存在，跳過創建
            continue
          }
          
          // 創建收費計劃
          const billingResponse = await createBillingSchedule({
            ...billing,
            client_id: clientId
          })
          
          // 獲取創建的收費計劃 ID（如果 API 返回）
          const billingScheduleId = billingResponse.data?.billing_schedule_id || billingResponse.data?.id
          if (billingScheduleId) {
            billing.billing_schedule_id = billingScheduleId
          }
        }
        
        return clientId
      } catch (error) {
        this.error = error.message || '保存帳務設定失敗'
        console.error('保存帳務設定失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 獨立保存服務設定（客戶必須已存在）
    async saveServices() {
      this.loading = true
      this.error = null
      
      try {
        // 檢查客戶是否已存在
        if (!this.createdClientId) {
          throw new Error('請先保存基本資訊，客戶必須已存在才能保存服務設定')
        }
        
        const clientId = this.createdClientId
        const totalServices = this.tempServices.length
        
        if (totalServices === 0) {
          // 沒有服務需要保存，直接返回
          return
        }
        
        // 保存所有服務及任務配置
        for (let i = 0; i < totalServices; i++) {
          const service = this.tempServices[i]
          
          // 檢查服務是否已經保存過（如果有 client_service_id 則表示已保存）
          if (service.client_service_id) {
            // 服務已存在，跳過創建
            continue
          }
          
          // 創建客戶服務
          const serviceResponse = await createClientService(clientId, {
            service_id: service.service_id,
            status: service.status || 'active',
            start_date: service.start_date || null,
            service_type: service.service_type || 'recurring',
            execution_months: service.execution_months ? JSON.stringify(service.execution_months) : null,
            use_for_auto_generate: service.use_for_auto_generate !== undefined ? service.use_for_auto_generate : 1
          })
          
          // 獲取創建的服務 ID（如果 API 返回）
          const clientServiceId = serviceResponse.data?.client_service_id || serviceResponse.data?.id
          if (clientServiceId) {
            service.client_service_id = clientServiceId
          }
          
          // 批量保存任務配置
          if (service.tasks && service.tasks.length > 0) {
            const taskPayload = {
              tasks: service.tasks.map(task => ({
                task_name: task.name,
                task_description: task.description,
                assignee_user_id: task.assignee_user_id,
                estimated_hours: task.estimated_hours,
                advance_days: task.advance_days || 7,
                due_rule: task.due_rule || 'end_of_month',
                due_value: task.due_value,
                  days_due: Number.isFinite(task.days_due) ? Number(task.days_due) : null,
                stage_order: task.stage_order || 0,
                delivery_frequency: task.delivery_frequency || 'monthly',
                delivery_months: task.delivery_months || null,
                auto_generate: task.auto_generate !== false ? 1 : 0,
                notes: task.notes,
                sop_ids: task.sop_ids || []
              })),
              service_sops: (service.service_sops || []).map(s => s.sop_id || s.id)
            }
            
            await batchSaveTaskConfigs(clientId, service.service_id, taskPayload)
          }
        }
        
        return clientId
      } catch (error) {
        this.error = error.message || '保存服務設定失敗'
        console.error('保存服務設定失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 獨立保存基本資訊（創建客戶）
    async saveBasicInfo() {
      this.loading = true
      this.error = null
      
      try {
        const clientApi = useClientApi()
        
        // 準備請求數據
        // 注意：統一編號處理由後端完成（企業客戶自動加前綴00，個人客戶直接使用）
        const clientData = {
          company_name: this.formData.company_name,
          tax_registration_number: this.formData.tax_id || null, // 統一編號就是客戶編號
          contact_person_1: this.formData.contact_person,
          contact_person_2: this.formData.contact_person_2,
          assignee_user_id: this.formData.assignee_user_id,
          phone: this.formData.phone,
          email: this.formData.email,
          client_notes: this.formData.notes,
          payment_notes: this.formData.billing_notes,
          company_owner: this.formData.company_owner || null,
          company_address: this.formData.company_address || null,
          capital_amount: this.formData.capital_amount || null,
          shareholders: this.formData.shareholders || null,
          directors_supervisors: this.formData.directors_supervisors || null,
          primary_contact_method: this.formData.primary_contact_method || null,
          line_id: this.formData.line_id || null
        }
        
        // 如果客戶已存在，則更新；否則創建
        if (this.createdClientId) {
          await clientApi.updateClient(this.createdClientId, clientData)
          
          // 更新標籤
          if (this.formData.selected_tags && this.formData.selected_tags.length > 0) {
            await clientApi.updateClientTags(this.createdClientId, {
              tag_ids: this.formData.selected_tags
            })
          }
          
          return this.createdClientId
        } else {
          // 創建新客戶
          const clientResponse = await clientApi.createClient(clientData)
          
          const clientId = clientResponse.data?.client_id || clientResponse.data?.clientId
          
          if (!clientId) {
            throw new Error('客戶ID未返回')
          }
          
          this.createdClientId = clientId
          
          // 設置標籤
          if (this.formData.selected_tags && this.formData.selected_tags.length > 0) {
            await clientApi.updateClientTags(clientId, {
              tag_ids: this.formData.selected_tags
            })
          }
          
          return clientId
        }
      } catch (error) {
        this.error = error.message || '保存基本資訊失敗'
        console.error('保存基本資訊失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 重置表單
    resetForm() {
      this.formData = {
        company_name: '',
        tax_id: '', // 統一編號就是客戶編號
        contact_person: '',
        contact_person_2: '',
        assignee_user_id: null,
        phone: '',
        email: '',
        notes: '',
        billing_notes: '',
        selected_tags: []
      }
      this.tempServices = []
      this.tempBillings = []
      this.error = null
      this.createdClientId = null
      this.progress = {
        visible: false,
        percent: 0,
        status: 'active',
        text: ''
      }
    },

    // 重置表單數據（保留 createdClientId，用於繼續編輯）
    resetFormData() {
      this.formData = {
        company_name: '',
        tax_id: '', // 統一編號就是客戶編號
        contact_person: '',
        contact_person_2: '',
        assignee_user_id: null,
        phone: '',
        email: '',
        notes: '',
        billing_notes: '',
        selected_tags: []
      }
      this.tempServices = []
      this.tempBillings = []
      this.error = null
      this.createdClientId = null
      this.progress = {
        visible: false,
        percent: 0,
        status: 'active',
        text: ''
      }
    },

    // 從現有客戶複製資訊
    async copyFromClient(clientId) {
      this.loading = true
      this.error = null
      
      try {
        const clientApi = useClientApi()
        
        // 獲取客戶詳情
        const clientDetailResponse = await clientApi.fetchClientDetail(clientId)
        const clientData = extractApiData(clientDetailResponse)
        
        if (!clientData) {
          throw new Error('無法獲取客戶詳情')
        }
        
        // 複製基本資訊（清除客戶專屬資訊）
        this.formData = {
          company_name: clientData.companyName || clientData.company_name || '',
          tax_id: '', // 清除統一編號，需要手動輸入
          contact_person: clientData.contact_person_1 || clientData.contactPerson1 || '',
          contact_person_2: clientData.contact_person_2 || clientData.contactPerson2 || '',
          assignee_user_id: clientData.assigneeUserId || clientData.assignee_user_id || null,
          phone: clientData.phone || '',
          email: clientData.email || '',
          notes: clientData.clientNotes || clientData.client_notes || '',
          billing_notes: clientData.paymentNotes || clientData.payment_notes || '',
          selected_tags: (clientData.tags || []).map(tag => tag.tag_id || tag.id)
        }
        
        // 複製服務設定（包括任務配置）
        this.tempServices = []
        const services = clientData.services || []
        
        for (const service of services) {
          const serviceId = service.service_id || service.serviceId
          const clientServiceId = service.client_service_id || service.clientServiceId
          
          if (!serviceId) continue
          
          // 獲取任務配置
          let tasks = []
          let serviceSOPs = []
          
          if (clientServiceId) {
            try {
              const taskConfigsResponse = await fetchTaskConfigs(clientId, clientServiceId)
              const taskConfigs = extractApiArray(taskConfigsResponse, [])
              
              tasks = taskConfigs.map(config => ({
                name: config.task_name || config.taskName,
                description: config.task_description || config.taskDescription || '',
                assignee_user_id: config.assignee_user_id || config.assigneeUserId,
                estimated_hours: config.estimated_hours || config.estimatedHours,
                advance_days: config.advance_days || config.advanceDays || 7,
                due_rule: config.due_rule || config.dueRule || 'end_of_month',
                due_value: config.due_value || config.dueValue,
                days_due: Number.isFinite(config.days_due || config.daysDue) ? Number(config.days_due || config.daysDue) : null,
                stage_order: config.stage_order || config.stageOrder || 0,
                delivery_frequency: config.delivery_frequency || config.deliveryFrequency || 'monthly',
                delivery_months: config.delivery_months || config.deliveryMonths,
                auto_generate: config.auto_generate !== false,
                notes: config.notes || '',
                sop_ids: (config.sops || []).map(s => s.sop_id || s.id)
              }))
              
              // 獲取服務 SOPs（從任務配置中提取）
              const allSOPIds = new Set()
              taskConfigs.forEach(config => {
                if (config.sops) {
                  config.sops.forEach(sop => {
                    allSOPIds.add(sop.sop_id || sop.id)
                  })
                }
              })
              serviceSOPs = Array.from(allSOPIds).map(id => ({ sop_id: id }))
            } catch (error) {
              console.warn('獲取任務配置失敗:', error)
            }
          }
          
          // 複製收費計劃
          const billingSchedule = service.billing_schedule || service.billingSchedule || []
          for (const billing of billingSchedule) {
            this.tempBillings.push({
              id: `temp_${Date.now()}_${Math.random()}`,
              temp_service_id: `temp_service_${serviceId}`, // 臨時服務 ID，用於關聯
              service_id: serviceId,
              service_name: service.service_name || service.serviceName,
              billing_type: 'monthly',
              billing_month: billing.billing_month || billing.billingMonth,
              billing_amount: billing.billing_amount || billing.billingAmount || 0,
              payment_due_days: billing.payment_due_days || billing.paymentDueDays || 30,
              notes: billing.notes || ''
            })
          }
          
          // 添加到臨時服務列表
          this.tempServices.push({
            id: `temp_${Date.now()}_${Math.random()}`,
            service_id: serviceId,
            name: service.service_name || service.serviceName,
            status: service.status || 'active',
            start_date: service.start_date || service.startDate || null,
            tasks: tasks,
            service_sops: serviceSOPs
          })
        }
        
        return true
      } catch (error) {
        this.error = error.message || '複製客戶資訊失敗'
        console.error('複製客戶資訊失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})

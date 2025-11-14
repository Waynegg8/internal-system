import { defineStore } from 'pinia'
import { fetchAllUsers } from '@/api/users'
import { useClientApi, createClientService } from '@/api/clients'
import { fetchAllTags, createTag } from '@/api/tags'
import { fetchAllServices } from '@/api/services'
import { fetchAllSOPs } from '@/api/sop'
import { createBillingSchedule } from '@/api/billing'
import { batchSaveTaskConfigs } from '@/api/task-configs'
import { extractApiArray } from '@/utils/apiHelpers'

export const useClientAddStore = defineStore('clientAdd', {
  state: () => ({
    formData: {
      company_name: '',
      client_id: '',
      tax_id: '',
      contact_person: '',
      contact_person_2: '',
      assignee_user_id: null,
      phone: '',
      email: '',
      notes: '',
      billing_notes: '',
      selected_tags: []
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
        this.supportData.services = extractApiArray(servicesResponse, [])
        
        const sopsResponse = await fetchAllSOPs({ per_page: 1000 })
        this.supportData.sops = extractApiArray(sopsResponse, [])
      } catch (error) {
        this.error = error.message || '載入支持數據失敗'
        console.error('載入支持數據失敗:', error)
      } finally {
        this.loading = false
      }
    },

    // 獲取下一個個人客戶編號
    async getNextClientId() {
      this.loading = true
      this.error = null
      try {
        const clientApi = useClientApi()
        const response = await clientApi.getNextPersonalClientId()
        this.formData.client_id = response.data?.next_id || ''
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
    addTempService(service) {
      const tempServiceId = `temp_${Date.now()}`
      const newService = {
        id: tempServiceId,
        service_id: service.id || service.service_id,
        name: service.name || service.service_name,
        status: 'active',
        start_date: null,
        tasks: [], // 任務配置列表
        service_sops: [] // 服務層級 SOP
      }
      this.tempServices.push(newService)
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
      const tempBillingId = `temp_${Date.now()}`
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
        this.updateProgress(10, '正在創建客戶基本資料...')
        const clientApi = useClientApi()
        const clientResponse = await clientApi.createClient(this.formData)
        const clientId = clientResponse.data?.client_id

        if (!clientId) {
          throw new Error('客戶ID未返回')
        }

        this.createdClientId = clientId
        this.updateProgress(20, '客戶基本資料創建成功')

        // Step 2: 更新客戶標籤（30%）
        if (this.formData.selected_tags && this.formData.selected_tags.length > 0) {
          this.updateProgress(25, '正在設置客戶標籤...')
          await clientApi.updateClientTags(clientId, {
            tag_ids: this.formData.selected_tags
          })
          this.updateProgress(30, '客戶標籤設置成功')
        } else {
          this.updateProgress(30, '跳過標籤設置')
        }

        // Step 3: 創建服務及任務配置（30% - 60%）
        const totalServices = this.tempServices.length
        if (totalServices > 0) {
          this.updateProgress(35, '正在創建客戶服務...')
          
          for (let i = 0; i < totalServices; i++) {
            const service = this.tempServices[i]
            const percentStart = 35 + ((60 - 35) / totalServices) * i
            const percentEnd = 35 + ((60 - 35) / totalServices) * (i + 1)

            this.updateProgress(percentStart, `正在創建服務: ${service.name}`)

            // 創建客戶服務
            await createClientService(clientId, {
              service_id: service.service_id,
              status: service.status || 'active',
              start_date: service.start_date || null
            })

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

            this.updateProgress(percentEnd, `服務 ${service.name} 創建完成`)
          }

          this.updateProgress(60, '所有服務創建完成')
        } else {
          this.updateProgress(60, '跳過服務創建')
        }

        // Step 4: 創建收費排程（60% - 80%）
        const totalBillings = this.tempBillings.length
        if (totalBillings > 0) {
          this.updateProgress(65, '正在創建收費排程...')
          
          for (let i = 0; i < totalBillings; i++) {
            const billing = this.tempBillings[i]
            const percentStart = 65 + ((80 - 65) / totalBillings) * i
            const percentEnd = 65 + ((80 - 65) / totalBillings) * (i + 1)

            this.updateProgress(percentStart, `正在創建收費排程 ${i + 1}/${totalBillings}`)

            await createBillingSchedule({
              ...billing,
              client_id: clientId
            })

            this.updateProgress(percentEnd, `收費排程 ${i + 1}/${totalBillings} 創建完成`)
          }

          this.updateProgress(80, '所有收費排程創建完成')
        } else {
          this.updateProgress(80, '跳過收費排程創建')
        }

        // 完成
        this.updateProgress(100, '客戶創建完成！')
        this.progress.status = 'success'

        return clientId

      } catch (error) {
        this.error = error.message || '創建客戶失敗'
        this.progress.status = 'exception'
        this.updateProgress(this.progress.percent, `錯誤: ${this.error}`)
        console.error('創建客戶失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 更新進度
    updateProgress(percent, text) {
      this.progress.percent = percent
      this.progress.text = text
    },

    // 重置表單
    resetForm() {
      this.formData = {
        company_name: '',
        client_id: '',
        tax_id: '',
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
    }
  }
})

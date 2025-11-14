<template>
  <div class="tasks-new-content">
    <div style="margin-bottom: 24px">
      <a-button type="link" @click="handleBack">
        <template #icon>
          <ArrowLeftOutlined />
        </template>
        返回
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-form
        :model="form"
        :rules="formRules"
        ref="formRef"
        @finish="handleSubmit"
        class="task-form"
      >
        <a-card class="form-section-card">
          <!-- 基本資訊 -->
          <template #title>
            <div class="section-title">
              <InfoCircleOutlined />
              <span>基本資訊</span>
            </div>
          </template>
          
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item
                label="客戶"
                name="clientId"
                :rules="[{ required: true, message: '請選擇客戶' }]"
              >
                <a-select
                  v-model:value="form.clientId"
                  placeholder="請選擇客戶"
                  show-search
                  :filter-option="filterOption"
                  @change="handleClientChange"
                  :loading="clientsLoading"
                >
                  <a-select-option
                    v-for="client in clients"
                    :key="client.client_id || client.id"
                    :value="client.client_id || client.id"
                  >
                    {{ client.name }}
                  </a-select-option>
                </a-select>
                <template #help>
                  <a-typography-text type="secondary" style="font-size: 12px">
                    選擇要服務的客戶
                  </a-typography-text>
                </template>
              </a-form-item>
            </a-col>
            
            <a-col :span="12">
              <a-form-item
                label="服務類型"
                name="serviceId"
                :rules="[{ required: true, message: '請選擇服務類型' }]"
              >
                <a-select
                  v-model:value="form.serviceId"
                  placeholder="請先選擇客戶"
                  :disabled="!form.clientId"
                  @change="handleServiceChange"
                  :loading="servicesLoading"
                >
                  <a-select-option
                    v-for="service in availableServices"
                    :key="service.service_id || service.id"
                    :value="service.service_id || service.id"
                  >
                    {{ service.service_name || service.name }}
                  </a-select-option>
                </a-select>
                <template #help>
                  <a-typography-text type="secondary" style="font-size: 12px">
                    選擇服務類型（記帳、稅務等）
                  </a-typography-text>
                </template>
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <a-card class="form-section-card">
          <!-- 服務月份 -->
          <template #title>
            <div class="section-title">
              <CalendarOutlined />
              <span>服務月份</span>
            </div>
          </template>
          
          <a-form-item
            label="服務月份"
            name="serviceMonth"
            :rules="[{ required: true, message: '請選擇服務月份' }]"
          >
            <a-date-picker
              v-model:value="form.serviceMonth"
              picker="month"
              format="YYYY-MM"
              style="width: 100%"
              placeholder="請選擇服務月份"
            />
            <template #help>
              <a-typography-text type="secondary" style="font-size: 12px">
                所有任務都將使用此服務月份
              </a-typography-text>
            </template>
          </a-form-item>
        </a-card>

        <a-card class="form-section-card">
          <!-- 服務層級 SOP -->
          <template #title>
            <div class="section-title">
              <FileTextOutlined />
              <span>服務層級 SOP</span>
            </div>
          </template>
          
          <a-form-item label="關聯 SOP 文檔">
            <a-button
              type="default"
              @click="openServiceSOPSelector"
              :disabled="!form.serviceId"
              style="width: 100%; text-align: left"
            >
              <template #icon>
                <FileTextOutlined />
              </template>
              <span v-if="serviceLevelSOPs.length === 0">點擊選擇服務通用 SOP</span>
              <span v-else>已選 {{ serviceLevelSOPs.length }} 個 SOP</span>
            </a-button>
            
            <div v-if="serviceLevelSOPs.length > 0" style="margin-top: 12px">
              <a-tag
                v-for="sop in serviceLevelSOPs"
                :key="sop.sop_id || sop.id"
                closable
                @close="removeServiceSOP(sop.sop_id || sop.id)"
                style="margin-bottom: 8px"
              >
                {{ sop.title }}
              </a-tag>
            </div>
            
            <template #help>
              <a-typography-text type="secondary" style="font-size: 12px">
                選擇的 SOP 將套用到所有任務
              </a-typography-text>
            </template>
          </a-form-item>
        </a-card>

        <a-card class="form-section-card">
          <!-- 任務列表 -->
          <template #title>
            <div class="section-title">
              <UnorderedListOutlined />
              <span>任務列表</span>
            </div>
          </template>
          
          <div class="tasks-container">
            <div
              v-for="(task, index) in tasks"
              :key="task.id"
              class="task-card"
            >
              <a-card size="small" :bordered="true">
                <template #title>
                  <div class="task-card-header">
                    <span class="task-number">
                      <CheckCircleOutlined />
                      任務 {{ index + 1 }}
                    </span>
                    <a-space>
                      <a-button
                        type="text"
                        size="small"
                        :disabled="index === 0"
                        @click="moveTaskUp(index)"
                        :icon="h(ArrowUpOutlined)"
                        title="上移"
                      />
                      <a-button
                        type="text"
                        size="small"
                        :disabled="index === tasks.length - 1"
                        @click="moveTaskDown(index)"
                        :icon="h(ArrowDownOutlined)"
                        title="下移"
                      />
                      <a-button
                        type="text"
                        size="small"
                        danger
                        :disabled="tasks.length <= 1"
                        @click="removeTask(index)"
                        :icon="h(DeleteOutlined)"
                        title="刪除"
                      />
                    </a-space>
                  </div>
                </template>
                
                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item
                      :label="`任務類型`"
                      :name="['tasks', index, 'taskName']"
                      :rules="[{ required: true, message: '請選擇任務類型' }]"
                    >
                      <a-select
                        v-model:value="task.taskName"
                        placeholder="請選擇任務類型"
                        :options="taskNameOptions"
                        :disabled="!form.serviceId"
                      />
                      <template #help>
                        <a-typography-text type="secondary" style="font-size: 11px">
                          從服務項目選擇
                        </a-typography-text>
                      </template>
                    </a-form-item>
                  </a-col>
                  
                  <a-col :span="12">
                    <a-form-item
                      :label="`負責人`"
                      :name="['tasks', index, 'assigneeUserId']"
                    >
                      <a-select
                        v-model:value="task.assigneeUserId"
                        placeholder="未分配"
                        :options="userOptions"
                        allow-clear
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
                
                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item
                      :label="`到期日`"
                      :name="['tasks', index, 'dueDate']"
                    >
                      <a-date-picker
                        v-model:value="task.dueDate"
                        style="width: 100%"
                        format="YYYY-MM-DD"
                        placeholder="選擇到期日"
                      />
                    </a-form-item>
                  </a-col>
                  
                  <a-col :span="12">
                    <a-form-item
                      :label="`備註`"
                      :name="['tasks', index, 'notes']"
                    >
                      <a-input
                        v-model:value="task.notes"
                        placeholder="選填"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
                
                <a-form-item label="關聯 SOP 文檔">
                  <a-button
                    type="default"
                    @click="openTaskSOPSelector(index)"
                    :disabled="!form.serviceId"
                    style="width: 100%"
                  >
                    <template #icon>
                      <FileTextOutlined />
                    </template>
                    <span v-if="!task.sopIds || task.sopIds.length === 0">
                      點擊選擇 SOP 文檔...
                    </span>
                    <span v-else>
                      已選 {{ task.sopIds.length }} 個 SOP
                    </span>
                  </a-button>
                  
                  <div v-if="task.sopIds && task.sopIds.length > 0" style="margin-top: 8px">
                    <a-tag
                      v-for="sopId in task.sopIds"
                      :key="sopId"
                      style="margin-bottom: 4px"
                    >
                      {{ getSOPTitle(sopId) }}
                    </a-tag>
                  </div>
                  
                  <template #help>
                    <a-typography-text type="secondary" style="font-size: 11px">
                      可選擇多個 SOP 作為任務參考文檔
                    </a-typography-text>
                  </template>
                </a-form-item>
              </a-card>
            </div>
            
            <a-button
              type="dashed"
              @click="addTask"
              block
              style="margin-top: 16px"
              :icon="h(PlusOutlined)"
            >
              添加任務
            </a-button>
            
            <a-typography-text type="secondary" style="display: block; margin-top: 12px; font-size: 12px">
              <InfoCircleOutlined />
              任務將按照順序執行，每個任務完成後才能開始下一個
            </a-typography-text>
          </div>
        </a-card>

        <div class="form-actions">
          <a-space>
            <a-button @click="handleBack">取消</a-button>
            <a-button type="primary" html-type="submit" :loading="submitting">
              <template #icon>
                <CheckOutlined />
              </template>
              建立所有任務
            </a-button>
          </a-space>
        </div>
      </a-form>
    </a-spin>

    <!-- SOP 選擇彈窗（使用共用組件） -->
    <SOPSelectorModal
      v-model:open="sopModalVisible"
      :title="sopModalTitle"
      :selected-sop-ids="sopModalSelectedIds"
      :all-sops="allSOPs"
      @ok="handleSOPModalOk"
      @cancel="handleSOPModalCancel"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePageAlert } from '@/composables/usePageAlert'
import {
  ArrowLeftOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { useClientApi, fetchAllClients } from '@/api/clients'
import { fetchAllServices, fetchServiceItems } from '@/api/services'
import { fetchAllSOPs } from '@/api/sop'
import { fetchAllUsers } from '@/api/users'
import { useTaskApi } from '@/api/tasks'
import { createClientService } from '@/api/clients'
import SOPSelectorModal from '@/components/shared/SOPSelectorModal.vue'

const router = useRouter()
const formRef = ref()
const taskApi = useTaskApi()

// 表單數據
const form = reactive({
  clientId: null,
  serviceId: null,
  serviceMonth: dayjs()
})

// 表單驗證規則
const formRules = {
  clientId: [{ required: true, message: '請選擇客戶' }],
  serviceId: [{ required: true, message: '請選擇服務類型' }],
  serviceMonth: [{ required: true, message: '請選擇服務月份' }]
}

// 頁面提示
const { showSuccess, showError, showWarning } = usePageAlert()

// 狀態
const loading = ref(false)
const submitting = ref(false)
const clientsLoading = ref(false)
const servicesLoading = ref(false)

// 數據列表
const clients = ref([])
const allServices = ref([])
const clientServices = ref([])
const serviceItems = ref([])
const users = ref([])
const allSOPs = ref([])

// 任務列表
const tasks = ref([])
let taskCounter = 0

// SOP 相關
const serviceLevelSOPs = ref([])
const sopModalVisible = ref(false)
const sopModalMode = ref('service') // 'service' 或 'task'
const sopModalTaskIndex = ref(-1)
const sopModalSelectedIds = ref([])

// 計算屬性
const availableServices = computed(() => {
  if (!form.clientId) return []
  return clientServices.value.filter(cs => 
    cs.client_id === form.clientId || cs.client_id === parseInt(form.clientId)
  ).map(cs => {
    const service = allServices.value.find(s => 
      s.service_id === cs.service_id || s.id === cs.service_id
    )
    return service || cs
  }).filter(Boolean)
})

const taskNameOptions = computed(() => {
  if (!form.serviceId) return []
  const items = serviceItems.value.filter(item => 
    String(item.service_id) === String(form.serviceId) && item.is_active !== false
  )
  return items.map(item => ({
    label: item.item_name,
    value: item.item_name
  }))
})

const userOptions = computed(() => {
  return users.value.map(user => ({
    label: user.name,
    value: user.user_id || user.id
  }))
})


const sopModalTitle = computed(() => {
  if (sopModalMode.value === 'service') {
    const service = allServices.value.find(s => 
      s.service_id === form.serviceId || s.id === form.serviceId
    )
    return `選擇服務通用 SOP（${service?.service_name || service?.name || '通用'}）`
  } else {
    return '選擇任務 SOP'
  }
})

// 方法
const filterOption = (input, option) => {
  return option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

const handleBack = () => {
  router.push('/tasks')
}

// 載入數據
const loadClients = async () => {
  clientsLoading.value = true
  try {
    const response = await fetchAllClients({ perPage: 1000 })
    if (response.ok && response.data) {
      clients.value = response.data.items || response.data || []
    }
  } catch (error) {
    console.error('載入客戶失敗:', error)
    showError('載入客戶列表失敗')
  } finally {
    clientsLoading.value = false
  }
}

const loadServices = async () => {
  servicesLoading.value = true
  try {
    const response = await fetchAllServices()
    if (response.ok && response.data) {
      allServices.value = response.data || []
    }
  } catch (error) {
    console.error('載入服務失敗:', error)
    showError('載入服務列表失敗')
  } finally {
    servicesLoading.value = false
  }
}

const loadServiceItems = async () => {
  try {
    const response = await fetchServiceItems()
    if (response.ok && response.data) {
      serviceItems.value = response.data || []
    }
  } catch (error) {
    console.error('載入服務項目失敗:', error)
  }
}

const loadUsers = async () => {
  try {
    const response = await fetchAllUsers()
    if (response.ok && response.data) {
      users.value = response.data || []
    }
  } catch (error) {
    console.error('載入用戶失敗:', error)
  }
}

const loadClientServices = async (clientId) => {
  if (!clientId) {
    clientServices.value = []
    return
  }
  
  try {
    const clientApi = useClientApi()
    const response = await clientApi.fetchClientDetail(clientId)
    if (response.ok && response.data) {
      clientServices.value = response.data.services || []
    }
  } catch (error) {
    console.error('載入客戶服務失敗:', error)
  }
}

const loadSOPs = async (category = null, scope = null) => {
  try {
    const params = { perPage: 200 }
    if (category) params.category = category
    if (scope) params.scope = scope
    
    const response = await fetchAllSOPs(params)
    if (response.ok && response.data) {
      allSOPs.value = response.data || []
    }
  } catch (error) {
    console.error('載入 SOP 失敗:', error)
  }
}

// 客戶和服務變化處理
const handleClientChange = async (clientId) => {
  form.serviceId = null
  clientServices.value = []
  if (clientId) {
    await loadClientServices(clientId)
  }
}

const handleServiceChange = async (serviceId) => {
  if (!serviceId) return
  
  const service = allServices.value.find(s => 
    s.service_id === serviceId || s.id === serviceId
  )
  const serviceCode = service?.service_code || ''
  
  // 載入對應的 SOP
  await loadSOPs(serviceCode, 'service')
}

// 任務管理
const addTask = () => {
  taskCounter++
  const serviceMonth = form.serviceMonth
  let defaultDueDate = null
  
  if (serviceMonth) {
    const monthStr = typeof serviceMonth === 'string' ? serviceMonth : dayjs(serviceMonth).format('YYYY-MM')
    const [year, month] = monthStr.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    defaultDueDate = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`)
  }
  
  tasks.value.push({
    id: `task_${taskCounter}`,
    taskName: null,
    assigneeUserId: null,
    dueDate: defaultDueDate,
    notes: '',
    sopIds: []
  })
}

const removeTask = (index) => {
  if (tasks.value.length <= 1) {
    message.warning('至少需要一個任務')
    return
  }
  tasks.value.splice(index, 1)
}

const moveTaskUp = (index) => {
  if (index === 0) return
  const task = tasks.value[index]
  tasks.value[index] = tasks.value[index - 1]
  tasks.value[index - 1] = task
}

const moveTaskDown = (index) => {
  if (index === tasks.value.length - 1) return
  const task = tasks.value[index]
  tasks.value[index] = tasks.value[index + 1]
  tasks.value[index + 1] = task
}

// SOP 管理
const openServiceSOPSelector = async () => {
  if (!form.serviceId) {
    message.warning('請先選擇服務類型')
    return
  }
  
  const service = allServices.value.find(s => 
    s.service_id === form.serviceId || s.id === form.serviceId
  )
  const serviceCode = service?.service_code || ''
  
  await loadSOPs(serviceCode, 'service')
  
  sopModalMode.value = 'service'
  sopModalSelectedIds.value = serviceLevelSOPs.value.map(sop => sop.sop_id || sop.id)
  sopModalVisible.value = true
}

const openTaskSOPSelector = async (index) => {
  if (!form.serviceId) {
    message.warning('請先選擇服務類型')
    return
  }
  
  const service = allServices.value.find(s => 
    s.service_id === form.serviceId || s.id === form.serviceId
  )
  const serviceCode = service?.service_code || ''
  
  await loadSOPs(serviceCode, 'task')
  
  sopModalMode.value = 'task'
  sopModalTaskIndex.value = index
  sopModalSelectedIds.value = tasks.value[index].sopIds || []
  sopModalVisible.value = true
}

const handleSOPModalOk = (selectedIds) => {
  if (sopModalMode.value === 'service') {
    serviceLevelSOPs.value = allSOPs.value.filter(sop => 
      selectedIds.includes(sop.sop_id || sop.id)
    )
  } else {
    const task = tasks.value[sopModalTaskIndex.value]
    if (task) {
      task.sopIds = [...selectedIds]
    }
  }
}

const handleSOPModalCancel = () => {
  // 取消時不需要做任何操作
}

const removeServiceSOP = (sopId) => {
  serviceLevelSOPs.value = serviceLevelSOPs.value.filter(sop => 
    (sop.sop_id || sop.id) !== sopId
  )
}

const getSOPTitle = (sopId) => {
  const sop = allSOPs.value.find(s => (s.sop_id || s.id) === sopId)
  return sop?.title || '未知 SOP'
}

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    if (tasks.value.length === 0) {
      message.warning('請至少添加一個任務')
      return
    }
    
    // 驗證所有任務都有任務類型
    const invalidTasks = tasks.value.filter(t => !t.taskName)
    if (invalidTasks.length > 0) {
      message.warning('請填寫所有任務的任務類型')
      return
    }
    
    submitting.value = true
    
    // 查找或創建客戶服務關係
    let clientServiceId = null
    const existingService = clientServices.value.find(cs => 
      cs.service_id === form.serviceId || cs.service_id === parseInt(form.serviceId)
    )
    
    if (existingService) {
      clientServiceId = existingService.client_service_id || existingService.id
    } else {
      // 創建新的客戶服務關係
      try {
        const response = await createClientService(form.clientId, {
          service_id: form.serviceId,
          status: 'active'
        })
        
        if (response.ok && response.data) {
          clientServiceId = response.data.client_service_id || response.data.id
        } else {
          throw new Error(response.message || '創建客戶服務關係失敗')
        }
      } catch (error) {
        showError('創建客戶服務關係失敗: ' + (error.message || '未知錯誤'))
        submitting.value = false
        return
      }
    }
    
    if (!clientServiceId) {
      showError('無法獲取客戶服務關係 ID')
      submitting.value = false
      return
    }
    
    // 按順序創建任務
    let previousTaskId = null
    let createdCount = 0
    
    for (const task of tasks.value) {
      const taskData = {
        client_service_id: clientServiceId,
        service_month: typeof form.serviceMonth === 'string' ? form.serviceMonth : dayjs(form.serviceMonth).format('YYYY-MM'),
        task_name: task.taskName,
        due_date: task.dueDate ? dayjs(task.dueDate).format('YYYY-MM-DD') : null,
        assignee_user_id: task.assigneeUserId || null,
        notes: task.notes || null,
        prerequisite_task_id: previousTaskId
      }
      
      try {
        const response = await taskApi.createTask(taskData)
        
        if (response.ok && response.data) {
          const createdTaskId = response.data.task_id || response.data.id
          createdCount++
          
          // 合併服務層級和任務層級的 SOP
          const allSopIds = [...new Set([
            ...serviceLevelSOPs.value.map(sop => sop.sop_id || sop.id),
            ...(task.sopIds || [])
          ])]
          
          // 關聯 SOP
          if (allSopIds.length > 0) {
            try {
              await taskApi.updateTaskSOPs(createdTaskId, allSopIds)
            } catch (error) {
              console.warn('關聯 SOP 失敗:', error)
            }
          }
          
          previousTaskId = createdTaskId
        } else {
          throw new Error(response.message || '創建任務失敗')
        }
      } catch (error) {
        showError(`建立第 ${createdCount + 1} 個任務失敗: ${error.message || '未知錯誤'}`)
        if (createdCount > 0) {
          showWarning(`已成功建立 ${createdCount} 個任務，請檢查任務列表`)
        }
        submitting.value = false
        return
      }
    }
    
    message.success(`成功建立 ${createdCount} 個任務`)
    router.push('/tasks')
  } catch (error) {
    console.error('提交失敗:', error)
    if (error.errorFields) {
      message.warning('請填寫所有必填字段')
    }
  } finally {
    submitting.value = false
  }
}

// 初始化
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      loadClients(),
      loadServices(),
      loadServiceItems(),
      loadUsers()
    ])
    
    // 添加第一個任務
    if (tasks.value.length === 0) {
      addTask()
    }
  } catch (error) {
    console.error('初始化失敗:', error)
  } finally {
    loading.value = false
  }
})

// 監聽服務月份變化，更新任務的預設到期日
watch(() => form.serviceMonth, (newMonth) => {
  if (newMonth && tasks.value.length > 0) {
    const monthStr = typeof newMonth === 'string' ? newMonth : dayjs(newMonth).format('YYYY-MM')
    const [year, month] = monthStr.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const defaultDueDate = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`)
    
    tasks.value.forEach(task => {
      if (!task.dueDate) {
        task.dueDate = defaultDueDate
      }
    })
  }
})
</script>

<style scoped>
.tasks-new-content {
  padding: 24px;
}

.page-header {
  background: white;
  padding: 16px 24px;
  margin-bottom: 16px;
  border-radius: 8px;
}

.task-form {
  max-width: 1200px;
  margin: 0 auto;
}

.form-section-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #475569;
}

.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  margin-bottom: 0;
}

.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-number {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding: 24px 0;
  border-top: 1px solid #f0f0f0;
  margin-top: 24px;
}
</style>

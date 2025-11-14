<template>
  <a-modal
    v-model:visible="modalVisible"
    :title="modalTitle"
    :width="800"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form :model="form" :rules="rules" ref="formRef" layout="vertical">
      <!-- 客戶服務選擇 -->
      <a-form-item label="客戶服務" name="clientServiceId">
        <a-select
          v-model:value="form.clientServiceId"
          placeholder="請選擇客戶服務"
          show-search
          :filter-option="filterClientServiceOption"
          @change="handleClientServiceChange"
        >
          <a-select-option
            v-for="cs in clientServiceOptions"
            :key="cs.clientServiceId"
            :value="cs.clientServiceId"
          >
            {{ cs.label }}
          </a-select-option>
        </a-select>
      </a-form-item>
      
      <!-- 任務類型選擇 -->
      <a-form-item label="任務類型" name="taskName">
        <a-select
          v-model:value="form.taskName"
          placeholder="請選擇任務類型"
          :disabled="!form.clientServiceId"
          @change="handleTaskNameChange"
        >
          <a-select-option
            v-for="item in availableServiceItems"
            :key="item.itemId || item.item_id || item.id"
            :value="item.itemName || item.item_name || item.name"
          >
            {{ item.itemName || item.item_name || item.name }}
          </a-select-option>
        </a-select>
      </a-form-item>
      
      <!-- 負責人選擇 -->
      <a-form-item label="負責人" name="assigneeUserId">
        <a-select
          v-model:value="form.assigneeUserId"
          placeholder="請選擇負責人"
          show-search
          :filter-option="filterUserOption"
          allow-clear
        >
          <a-select-option
            v-for="user in users"
            :key="getUserId(user)"
            :value="getUserId(user)"
          >
            {{ getUserName(user) }}
          </a-select-option>
        </a-select>
      </a-form-item>
      
      <!-- 前置任務選擇 -->
      <a-form-item
        v-if="prerequisiteTasks.length > 0"
        label="前置任務"
        name="prerequisiteTaskId"
      >
        <a-select
          v-model:value="form.prerequisiteTaskId"
          placeholder="無前置任務"
          allow-clear
          @change="handlePrerequisiteChange"
        >
          <a-select-option :value="null">無前置任務</a-select-option>
          <a-select-option
            v-for="task in prerequisiteTasks"
            :key="getTaskId(task)"
            :value="getTaskId(task)"
          >
            {{ getTaskName(task) }}
            <span v-if="getDueDate(task)" style="color: #999">
              (到期：{{ formatDate(getDueDate(task)) }})
            </span>
          </a-select-option>
        </a-select>
      </a-form-item>
      
      <!-- 到期日期選擇 -->
      <a-form-item label="到期日期" name="dueDate">
        <a-date-picker
          v-model:value="form.dueDate"
          placeholder="請選擇到期日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          @change="handleDueDateChange"
        />
      </a-form-item>
      
      <!-- 衝突提示 -->
      <a-alert
        v-if="conflictTasks.length > 0"
        type="warning"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #message>
          <div>
            <div style="font-weight: 600; margin-bottom: 8px">
              檢測到後續任務到期日衝突
            </div>
            <div style="font-size: 13px; margin-bottom: 8px">
              以下後續任務的到期日需要延後：
            </div>
            <div
              v-for="task in conflictTasks"
              :key="getTaskId(task)"
              style="padding: 4px 8px; background: white; border-radius: 4px; margin-bottom: 4px; font-size: 13px"
            >
              {{ getTaskName(task) }}
              <span style="color: #dc2626">
                （當前：{{ formatDate(getDueDate(task)) }}）
              </span>
            </div>
            <div style="margin-top: 12px; padding: 8px; background: white; border-radius: 4px">
              <a-checkbox v-model:checked="form.autoAdjustSubsequent">
                自動延後後續任務到期日
              </a-checkbox>
              <div v-if="form.autoAdjustSubsequent" style="margin-top: 8px; padding-left: 24px; display: flex; align-items: center; gap: 8px">
                <span style="font-size: 13px">延後</span>
                <a-input-number
                  v-model:value="form.delayDays"
                  :min="1"
                  :max="30"
                  style="width: 80px"
                />
                <span style="font-size: 13px">天</span>
              </div>
            </div>
          </div>
        </template>
      </a-alert>
      
      <!-- SOP 選擇 -->
      <a-form-item label="SOP">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
          <a-button @click="showSOPSelector = true">
            選擇 SOP
          </a-button>
          <a-tag
            v-for="sop in selectedSOPs"
            :key="getSOPId(sop)"
            closable
            @close="removeSOP(sop)"
            style="margin: 0"
          >
            {{ getSOPTitle(sop) }}
          </a-tag>
          <span v-if="selectedSOPs.length === 0" style="color: #999; font-size: 13px">
            未選擇 SOP
          </span>
        </div>
      </a-form-item>
      
      <!-- 備註 -->
      <a-form-item label="備註" name="notes">
        <a-textarea
          v-model:value="form.notes"
          placeholder="可選"
          :rows="3"
        />
      </a-form-item>
    </a-form>
    
    <!-- SOP 選擇器彈窗 -->
    <a-modal
      v-model:visible="showSOPSelector"
      title="選擇 SOP"
      :width="600"
      @ok="handleSOPSelectorOk"
      @cancel="showSOPSelector = false"
    >
      <a-input-search
        v-model:value="sopSearchKeyword"
        placeholder="搜索 SOP"
        style="margin-bottom: 16px"
      />
      <a-list
        :data-source="filteredSOPs"
        :pagination="{ pageSize: 10 }"
        style="max-height: 400px; overflow-y: auto"
      >
        <template #renderItem="{ item: sop }">
          <a-list-item>
            <a-checkbox
              :checked="isSOPSelected(sop)"
              @change="(e) => toggleSOP(sop, e.target.checked)"
            >
              {{ getSOPTitle(sop) }}
            </a-checkbox>
          </a-list-item>
        </template>
      </a-list>
    </a-modal>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  clients: {
    type: Array,
    default: () => []
  },
  services: {
    type: Array,
    default: () => []
  },
  serviceItems: {
    type: Array,
    default: () => []
  },
  users: {
    type: Array,
    default: () => []
  },
  tasks: {
    type: Array,
    default: () => []
  },
  sops: {
    type: Array,
    default: () => []
  },
  // 快速新增上下文（从服务组点击时传入）
  quickAddContext: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

const formRef = ref(null)
const loading = ref(false)
const showSOPSelector = ref(false)
const sopSearchKeyword = ref('')
const selectedSOPs = ref([])
const conflictTasks = ref([])

const form = ref({
  clientServiceId: null,
  taskName: null,
  assigneeUserId: null,
  prerequisiteTaskId: null,
  dueDate: null,
  autoAdjustSubsequent: false,
  delayDays: 7,
  notes: null
})

// 表單驗證規則
const rules = {
  clientServiceId: [
    { required: true, message: '請選擇客戶服務', trigger: 'change' }
  ],
  taskName: [
    { required: true, message: '請選擇任務類型', trigger: 'change' }
  ],
  dueDate: [
    { required: true, message: '請選擇到期日期', trigger: 'change' }
  ]
}

// 計算 modal 顯示狀態
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 計算 modal 標題
const modalTitle = computed(() => {
  if (props.quickAddContext) {
    const monthText = props.quickAddContext.serviceMonth
      ? formatServiceMonth(props.quickAddContext.serviceMonth)
      : ''
    return `新增任務：${props.quickAddContext.serviceName}${monthText}`
  }
  return '快速新增任務'
})

// 構建客戶服務選項
const clientServiceOptions = computed(() => {
  const options = []
  
  // 如果有快速新增上下文，直接使用
  if (props.quickAddContext) {
    const client = props.clients.find(
      c => getClientId(c) === props.quickAddContext.clientId
    )
    if (client) {
      options.push({
        clientServiceId: props.quickAddContext.clientServiceId,
        clientId: props.quickAddContext.clientId,
        serviceId: props.quickAddContext.serviceId,
        label: `${getClientName(client)} - ${props.quickAddContext.serviceName}`
      })
    }
    return options
  }
  
  // 否則從任務列表中構建
  const clientServiceMap = new Map()
  
  props.tasks.forEach(task => {
    const clientId = getTaskClientId(task)
    const serviceId = getTaskServiceId(task)
    const clientServiceId = getTaskClientServiceId(task)
    
    if (clientId && serviceId && clientServiceId) {
      const key = `${clientId}-${serviceId}`
      if (!clientServiceMap.has(key)) {
        const client = props.clients.find(c => getClientId(c) === clientId)
        const service = props.services.find(s => getServiceId(s) === serviceId)
        
        if (client && service) {
          clientServiceMap.set(key, {
            clientServiceId,
            clientId,
            serviceId,
            label: `${getClientName(client)} - ${getServiceName(service)}`
          })
        }
      }
    }
  })
  
  return Array.from(clientServiceMap.values())
})

// 可用的服務項目（根據選中的客戶服務過濾）
const availableServiceItems = computed(() => {
  if (!form.value.clientServiceId) return []
  
  const clientService = clientServiceOptions.value.find(
    cs => cs.clientServiceId === form.value.clientServiceId
  )
  
  if (!clientService) return []
  
  return props.serviceItems.filter(item => {
    const itemServiceId = item.serviceId || item.service_id
    return String(itemServiceId) === String(clientService.serviceId) &&
           (item.isActive !== false && item.is_active !== false)
  })
})

// 前置任務列表（根據選中的客戶服務動態加載）
const prerequisiteTasks = computed(() => {
  if (!form.value.clientServiceId) return []
  
  const clientService = clientServiceOptions.value.find(
    cs => cs.clientServiceId === form.value.clientServiceId
  )
  
  if (!clientService) return []
  
  // 從任務列表中篩選出該客戶服務的任務
  return props.tasks.filter(task => {
    const taskClientId = getTaskClientId(task)
    const taskServiceId = getTaskServiceId(task)
    const taskClientServiceId = getTaskClientServiceId(task)
    
    return taskClientId === clientService.clientId &&
           taskServiceId === clientService.serviceId &&
           (taskClientServiceId === clientService.clientServiceId || !taskClientServiceId) &&
           getTaskStatus(task) !== 'cancelled'
  })
})

// 過濾後的 SOP 列表
const filteredSOPs = computed(() => {
  let sops = props.sops || []
  
  // 如果有搜索關鍵字，過濾
  if (sopSearchKeyword.value) {
    const keyword = sopSearchKeyword.value.toLowerCase()
    sops = sops.filter(sop => {
      const title = getSOPTitle(sop).toLowerCase()
      return title.includes(keyword)
    })
  }
  
  // 根據選中的服務過濾（如果有的話）
  if (form.value.clientServiceId) {
    const clientService = clientServiceOptions.value.find(
      cs => cs.clientServiceId === form.value.clientServiceId
    )
    
    if (clientService) {
      const service = props.services.find(
        s => getServiceId(s) === clientService.serviceId
      )
      
      if (service) {
        const serviceCode = getServiceCode(service)
        sops = sops.filter(sop => {
          const scope = sop.scope || ''
          const category = sop.category || ''
          return scope === 'task' &&
                 (category === serviceCode ||
                  category === serviceCode.toLowerCase() ||
                  category === serviceCode.toUpperCase())
        })
      }
    }
  }
  
  return sops.sort((a, b) => {
    const titleA = getSOPTitle(a) || ''
    const titleB = getSOPTitle(b) || ''
    return titleA.localeCompare(titleB, 'zh-TW')
  })
})

// 監聽 visible 變化，重置表單
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
    
    // 如果有快速新增上下文，預填充
    if (props.quickAddContext) {
      form.value.clientServiceId = props.quickAddContext.clientServiceId
      loadPrerequisiteTasks()
    }
  } else {
    resetForm()
  }
})

// 重置表單
const resetForm = () => {
  form.value = {
    clientServiceId: props.quickAddContext?.clientServiceId || null,
    taskName: null,
    assigneeUserId: null,
    prerequisiteTaskId: null,
    dueDate: null,
    autoAdjustSubsequent: false,
    delayDays: 7,
    notes: null
  }
  selectedSOPs.value = []
  conflictTasks.value = []
  formRef.value?.resetFields()
}

// 處理客戶服務變化
const handleClientServiceChange = () => {
  form.value.taskName = null
  form.value.prerequisiteTaskId = null
  loadPrerequisiteTasks()
  checkConflict()
}

// 處理任務類型變化
const handleTaskNameChange = () => {
  checkConflict()
}

// 載入前置任務
const loadPrerequisiteTasks = () => {
  // 前置任務列表已經通過 computed 自動計算
}

// 處理前置任務變化
const handlePrerequisiteChange = () => {
  checkConflict()
}

// 處理到期日期變化
const handleDueDateChange = (date) => {
  // 將 dayjs 對象轉換為字符串
  if (date) {
    form.value.dueDate = date.format('YYYY-MM-DD')
  } else {
    form.value.dueDate = null
  }
  checkConflict()
}

// 檢測衝突
const checkConflict = () => {
  if (!form.value.prerequisiteTaskId || !form.value.dueDate) {
    conflictTasks.value = []
    return
  }
  
  // 構建任務依賴關係圖
  const taskDependencyMap = new Map()
  prerequisiteTasks.value.forEach(task => {
    const prerequisiteId = getPrerequisiteTaskId(task)
    if (prerequisiteId) {
      if (!taskDependencyMap.has(prerequisiteId)) {
        taskDependencyMap.set(prerequisiteId, [])
      }
      taskDependencyMap.get(prerequisiteId).push(task)
    }
  })
  
  // 找出所有依賴選中的前置任務的後續任務
  const affectedTasks = taskDependencyMap.get(form.value.prerequisiteTaskId) || []
  
  // 檢查哪些後續任務的到期日早於或等於新任務的到期日
  const conflicts = affectedTasks.filter(task => {
    const taskDueDate = getDueDate(task)
    if (!taskDueDate) return false
    const dueDateStr = typeof form.value.dueDate === 'string' 
      ? form.value.dueDate 
      : form.value.dueDate?.format('YYYY-MM-DD')
    return new Date(taskDueDate) <= new Date(dueDateStr)
  })
  
  conflictTasks.value = conflicts
}

// 處理提交
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    // 構建 payload
    const payload = {
      client_service_id: form.value.clientServiceId,
      task_name: form.value.taskName,
      assignee_user_id: form.value.assigneeUserId,
      due_date: form.value.dueDate,
      prerequisite_task_id: form.value.prerequisiteTaskId,
      notes: form.value.notes
    }
    
    // 如果有快速新增上下文，添加服務月份
    if (props.quickAddContext?.serviceMonth) {
      payload.service_month = props.quickAddContext.serviceMonth
    }
    
    // 如果有選擇 SOP，添加到 payload
    if (selectedSOPs.value.length > 0) {
      payload.sop_ids = selectedSOPs.value.map(sop => getSOPId(sop))
    }
    
    // 如果需要調整後續任務
    if (form.value.autoAdjustSubsequent && conflictTasks.value.length > 0 && form.value.dueDate) {
      const newDueDate = dayjs(form.value.dueDate)
        .add(form.value.delayDays, 'day')
        .format('YYYY-MM-DD')
      
      // 先調整後續任務的到期日（將在父組件中處理）
      payload.adjust_subsequent_tasks = {
        task_ids: conflictTasks.value.map(task => getTaskId(task)),
        new_due_date: newDueDate
      }
    }
    
    emit('success', payload)
  } catch (error) {
    console.error('表單驗證失敗:', error)
  } finally {
    loading.value = false
  }
}

// 處理取消
const handleCancel = () => {
  modalVisible.value = false
}

// SOP 選擇器相關
const isSOPSelected = (sop) => {
  return selectedSOPs.value.some(s => getSOPId(s) === getSOPId(sop))
}

const toggleSOP = (sop, checked) => {
  if (checked) {
    if (!isSOPSelected(sop)) {
      selectedSOPs.value.push(sop)
    }
  } else {
    const index = selectedSOPs.value.findIndex(s => getSOPId(s) === getSOPId(sop))
    if (index > -1) {
      selectedSOPs.value.splice(index, 1)
    }
  }
}

const removeSOP = (sop) => {
  const index = selectedSOPs.value.findIndex(s => getSOPId(s) === getSOPId(sop))
  if (index > -1) {
    selectedSOPs.value.splice(index, 1)
  }
}

const handleSOPSelectorOk = () => {
  showSOPSelector.value = false
}

// 輔助函數
const filterClientServiceOption = (input, option) => {
  const label = option.children?.[0]?.children || option.children || ''
  return label.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

const filterUserOption = (input, option) => {
  const userName = option.children?.[0]?.children || option.children || ''
  return userName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

const formatDate = (date) => {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
}

const formatServiceMonth = (serviceMonth) => {
  if (!serviceMonth) return ''
  const parts = serviceMonth.split('-')
  if (parts.length >= 2) {
    return ` - ${parts[0]}年${parseInt(parts[1])}月`
  }
  return serviceMonth
}

// 客戶相關
const getClientId = (client) => client.clientId || client.client_id || client.id
const getClientName = (client) => client.companyName || client.company_name || client.name

// 服務相關
const getServiceId = (service) => service.serviceId || service.service_id || service.id
const getServiceName = (service) => service.serviceName || service.service_name || service.name
const getServiceCode = (service) => service.serviceCode || service.service_code || ''

// 任務相關
const getTaskId = (task) => task.taskId || task.task_id || task.id
const getTaskName = (task) => task.taskName || task.task_name || task.name
const getTaskClientId = (task) => task.clientId || task.client_id
const getTaskServiceId = (task) => task.serviceId || task.service_id
const getTaskClientServiceId = (task) => task.clientServiceId || task.client_service_id
const getTaskStatus = (task) => task.status || 'pending'
const getDueDate = (task) => task.dueDate || task.due_date
const getPrerequisiteTaskId = (task) => task.prerequisiteTaskId || task.prerequisite_task_id

// 用戶相關
const getUserId = (user) => user.userId || user.user_id || user.id
const getUserName = (user) => user.name || user.userName || user.user_name || '未命名'

// SOP 相關
const getSOPId = (sop) => sop.sopId || sop.sop_id || sop.id
const getSOPTitle = (sop) => sop.title || sop.sopTitle || sop.sop_title || '未命名'
</script>


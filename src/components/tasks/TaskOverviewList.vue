<template>
  <div>
    <!-- 加載狀態 -->
    <div v-if="loading" style="text-align: center; padding: 60px 20px">
      <a-spin size="large" />
      <div style="margin-top: 16px; color: #6b7280">載入中...</div>
    </div>

    <!-- 空狀態 -->
    <a-empty
      v-else-if="!hasTasks"
      description="沒有找到符合條件的任務"
      style="padding: 60px 20px"
    >
      <template #image>
        <span style="font-size: 48px">📭</span>
      </template>
      <div style="color: #6b7280; font-size: 14px">請調整篩選條件後重試</div>
    </a-empty>

    <!-- 任務列表 -->
    <div v-else>
      <a-collapse
        :activeKey="activeClientKeys"
        :bordered="false"
        style="background: transparent"
        @change="handleClientChange"
      >
        <a-collapse-panel
          v-for="(clientGroup, clientId) in groupedTasks"
          :key="clientId"
          :class="getClientPanelClass(clientGroup)"
        >
          <template #header>
            <div style="display: flex; align-items: center; gap: 8px; width: 100%">
              <a-checkbox
                v-if="batchMode"
                :checked="isClientSelected ? isClientSelected(clientId) : false"
                @change="(e) => handleClientSelect(clientId, e.target.checked)"
                @click.stop
              />
              <span style="font-size: 16px; font-weight: 600">
                {{ clientGroup.clientInfo.companyName }}
              </span>
              <span v-if="clientGroup.clientInfo.taxId" style="color: #6b7280; font-size: 13px">
                {{ clientGroup.clientInfo.taxId }}
              </span>
              <span style="margin-left: 16px; font-size: 14px; color: #6b7280">
                {{ getClientStats(clientGroup) }}
              </span>
            </div>
          </template>

          <!-- 服務分組 -->
          <a-collapse
            :activeKey="getActiveServiceKeys(clientId)"
            :bordered="false"
            style="background: transparent"
            @change="(keys) => handleServiceChange(clientId, keys)"
          >
            <a-collapse-panel
              v-for="(serviceGroup, serviceKey) in clientGroup.services"
              :key="serviceKey"
            >
              <template #header>
                <div style="display: flex; align-items: center; gap: 8px; width: 100%">
                  <a-checkbox
                    v-if="batchMode"
                    :checked="isServiceSelected ? isServiceSelected(serviceKey) : false"
                    @change="(e) => handleServiceSelect(clientId, serviceKey, e.target.checked)"
                    @click.stop
                  />
                  <span style="font-weight: 600">
                    {{ serviceGroup.serviceInfo.serviceName }} · {{ formatMonth(serviceGroup.serviceInfo.serviceMonth) }}
                  </span>
                  <span style="color: #6b7280; font-size: 13px; margin-left: 12px">
                    {{ getServiceStats(serviceGroup) }}
                  </span>
                </div>
              </template>

              <!-- 任務卡片 -->
              <div>
                <TaskCard
                  v-for="task in serviceGroup.tasks"
                  :key="getTaskId(task)"
                  :task="task"
                  :batch-mode="batchMode"
                  :selected="isTaskSelected ? isTaskSelected(getTaskId(task)) : false"
                  @view-detail="handleViewDetail"
                  @select="(checked) => handleTaskSelect(getTaskId(task), checked)"
                  @status-change="handleStatusChange"
                  @adjust-due-date="handleAdjustDueDate"
                  @record-overdue-reason="handleRecordOverdueReason"
                />
              </div>
            </a-collapse-panel>
          </a-collapse>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import TaskCard from './TaskCard.vue'

const props = defineProps({
  groupedTasks: {
    type: Object,
    required: true,
    default: () => ({})
  },
  expandedClients: {
    type: Set,
    default: () => new Set()
  },
  expandedServices: {
    type: Set,
    default: () => new Set()
  },
  loading: {
    type: Boolean,
    default: false
  },
  batchMode: {
    type: Boolean,
    default: false
  },
  isTaskSelected: {
    type: Function,
    default: () => false
  },
  isClientSelected: {
    type: Function,
    default: () => false
  },
  isServiceSelected: {
    type: Function,
    default: () => false
  }
})

const emit = defineEmits(['toggle-client', 'toggle-service', 'select-client', 'select-service', 'select-task', 'view-detail', 'status-change', 'adjust-due-date', 'record-overdue-reason'])

// 展開的客戶 keys
const activeClientKeys = ref([])

// 展開的服務 keys (按客戶分組)
const activeServiceKeys = ref({})

// 是否有任務
const hasTasks = computed(() => {
  return Object.keys(props.groupedTasks).length > 0
})

// 監聽 expandedClients 變化
watch(() => props.expandedClients, (newSet) => {
  activeClientKeys.value = Array.from(newSet)
}, { deep: true, immediate: true })

// 處理客戶展開/折疊變化
const handleClientChange = (keys) => {
  const prevSet = new Set(Array.from(props.expandedClients))
  const currentSet = new Set(keys)
  
  // 找出變化的客戶並觸發 toggle
  prevSet.forEach(clientId => {
    if (!currentSet.has(clientId)) {
      // 被折疊了
      emit('toggle-client', clientId)
    }
  })
  
  currentSet.forEach(clientId => {
    if (!prevSet.has(clientId)) {
      // 被展開了
      emit('toggle-client', clientId)
    }
  })
  
  activeClientKeys.value = keys
}

// 監聽 expandedServices 變化
watch(() => props.expandedServices, (newSet) => {
  const keys = {}
  Object.keys(props.groupedTasks).forEach(clientId => {
    const clientGroup = props.groupedTasks[clientId]
    const serviceKeys = []
    Object.keys(clientGroup.services).forEach(serviceKey => {
      const fullKey = `${clientId}-${serviceKey}`
      if (newSet.has(fullKey)) {
        serviceKeys.push(serviceKey)
      }
    })
    if (serviceKeys.length > 0) {
      keys[clientId] = serviceKeys
    }
  })
  activeServiceKeys.value = keys
}, { deep: true, immediate: true })

// 處理服務展開/折疊變化
const handleServiceChange = (clientId, keys) => {
  const clientGroup = props.groupedTasks[clientId]
  if (!clientGroup) return
  
  const prevKeys = activeServiceKeys.value[clientId] || []
  const prevSet = new Set(prevKeys)
  const currentSet = new Set(keys)
  
  // 找出變化的服務並觸發 toggle
  Object.keys(clientGroup.services).forEach(serviceKey => {
    const fullKey = `${clientId}-${serviceKey}`
    const isActive = currentSet.has(serviceKey)
    const wasActive = prevSet.has(serviceKey)
    
    if (isActive !== wasActive) {
      emit('toggle-service', fullKey)
    }
  })
  
  activeServiceKeys.value[clientId] = keys
}

// 獲取客戶面板樣式類
const getClientPanelClass = (clientGroup) => {
  // 檢查是否有逾期任務
  let hasOverdue = false
  Object.values(clientGroup.services).forEach(serviceGroup => {
    if (serviceGroup.tasks.some(task => task.is_overdue || task.isOverdue)) {
      hasOverdue = true
    }
  })
  return hasOverdue ? 'has-overdue' : ''
}

// 獲取客戶統計
const getClientStats = (clientGroup) => {
  let total = 0
  let unfinished = 0
  let overdue = 0
  
  Object.values(clientGroup.services).forEach(serviceGroup => {
    total += serviceGroup.tasks.length
    serviceGroup.tasks.forEach(task => {
      const status = task.status || task.task_status
      if (status === 'pending' || status === 'in_progress') {
        unfinished++
      }
      if (task.is_overdue || task.isOverdue) {
        overdue++
      }
    })
  })
  
  let stats = `${total} 個任務 | ${unfinished} 未完成`
  if (overdue > 0) {
    stats += ` | <span style="color:#ef4444;font-weight:600;">${overdue} 逾期</span>`
  }
  return stats
}

// 獲取服務統計
const getServiceStats = (serviceGroup) => {
  const total = serviceGroup.tasks.length
  const completed = serviceGroup.tasks.filter(task => {
    const status = task.status || task.task_status
    return status === 'completed'
  }).length
  const inProgress = serviceGroup.tasks.filter(task => {
    const status = task.status || task.task_status
    return status === 'in_progress'
  }).length
  
  return `${total} 個任務: ${completed} 已完成, ${inProgress} 進行中`
}

// 格式化月份
const formatMonth = (month) => {
  if (!month) return ''
  const [year, monthNum] = month.split('-')
  return `${year}年${parseInt(monthNum)}月`
}

// 獲取任務 ID
const getTaskId = (task) => {
  return task.task_id || task.taskId || task.id
}

// 獲取活動的服務 keys
const getActiveServiceKeys = (clientId) => {
  return activeServiceKeys.value[clientId] || []
}


// 處理客戶選擇
const handleClientSelect = (clientId, checked) => {
  emit('select-client', clientId)
}

// 處理服務選擇
const handleServiceSelect = (clientId, serviceKey, checked) => {
  emit('select-service', serviceKey)
}

// 處理任務選擇
const handleTaskSelect = (taskId, checked) => {
  emit('select-task', taskId)
}

// 處理查看詳情
const handleViewDetail = (taskId) => {
  emit('view-detail', taskId)
}

// 處理狀態變更
const handleStatusChange = (taskId, status) => {
  emit('status-change', taskId, status)
}

// 處理調整到期日
const handleAdjustDueDate = (taskId) => {
  emit('adjust-due-date', taskId)
}

// 處理記錄逾期原因
const handleRecordOverdueReason = (taskId) => {
  emit('record-overdue-reason', taskId)
}
</script>

<style scoped>
:deep(.ant-collapse-item.has-overdue .ant-collapse-header) {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
}

:deep(.ant-collapse-item.has-overdue .ant-collapse-header:hover) {
  background: #fee2e2;
}

:deep(.ant-collapse-header) {
  padding: 16px !important;
}

:deep(.ant-collapse-content-box) {
  padding: 16px !important;
}
</style>


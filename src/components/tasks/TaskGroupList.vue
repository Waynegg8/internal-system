<template>
  <div style="margin-top: 16px">
    <a-spin :spinning="loading">
      <a-empty
        v-if="!loading && groupedTasks.length === 0"
        description="沒有符合條件的任務"
        style="padding: 48px"
      />
      
      <a-collapse
        v-else
        v-model:activeKey="expandedKeys"
        :bordered="false"
        style="background: transparent"
      >
        <a-collapse-panel
          v-for="clientGroup in groupedTasks"
          :key="`client-${clientGroup.clientId}`"
          :style="{
            marginBottom: '16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden'
          }"
        >
          <template #header>
            <div style="display: flex; align-items: center; gap: 12px">
              <strong style="font-size: 16px; color: #1f2937">
                {{ clientGroup.clientName }}
                <span v-if="clientGroup.clientTaxId && clientGroup.clientTaxId !== '—'" style="color: #6b7280; font-weight: normal">
                  ({{ clientGroup.clientTaxId }})
                </span>
              </strong>
            </div>
          </template>
          
          <div v-if="clientGroup.serviceGroups.length === 0" style="padding: 16px; text-align: center; color: #9ca3af; font-size: 14px">
            此客戶目前沒有任務
          </div>
          
          <a-collapse
            v-else
            v-model:activeKey="expandedServiceKeys[clientGroup.clientId]"
            :bordered="false"
            style="background: transparent"
          >
            <a-collapse-panel
              v-for="serviceGroup in clientGroup.serviceGroups"
              :key="`service-${serviceGroup.groupKey}`"
              :style="{
                marginBottom: '8px',
                borderBottom: '1px solid #f3f4f6'
              }"
            >
              <template #header>
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%">
                  <div style="display: flex; align-items: center; gap: 8px; flex: 1">
                    <strong style="font-size: 14px; color: #374151">
                      {{ serviceGroup.serviceTitle }}
                    </strong>
                    <span style="color: #9ca3af; font-size: 13px">
                      ({{ serviceGroup.total }}個任務: {{ serviceGroup.completed }}已完成, {{ serviceGroup.total - serviceGroup.completed }}未完成)
                    </span>
                  </div>
                  <a-button
                    type="primary"
                    size="small"
                    @click.stop="handleQuickAddTask(serviceGroup)"
                    style="margin-left: 8px"
                  >
                    新增任務
                  </a-button>
                </div>
              </template>
              
              <a-list :data-source="serviceGroup.tasks" :bordered="false">
                <template #renderItem="{ item: task }">
                  <a-list-item
                    :style="{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f9fafb',
                      cursor: 'pointer'
                    }"
                    @click="handleViewTask(getTaskId(task))"
                  >
                    <template #actions>
                      <a-button type="link" size="small" @click.stop="handleViewTask(getTaskId(task))">
                        查看詳情
                      </a-button>
                    </template>
                    
                    <a-list-item-meta>
                      <template #title>
                        <div style="display: flex; align-items: center; gap: 12px">
                          <a-checkbox
                            :checked="isTaskSelected(getTaskId(task))"
                            @click.stop
                            @change="(e) => handleTaskSelectionChange(getTaskId(task), e.target.checked)"
                          />
                          <div style="flex: 1">
                            <div style="font-weight: 500; color: #1f2937; margin-bottom: 4px">
                              {{ getTaskName(task) }}
                            </div>
                            <div v-if="getTaskProgress(task)" style="font-size: 12px; color: #6b7280">
                              進度：{{ getTaskProgress(task).completed }}/{{ getTaskProgress(task).total }}
                            </div>
                          </div>
                        </div>
                      </template>
                      
                      <template #description>
                        <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap">
                          <div style="font-size: 13px; color: #6b7280">
                            {{ getAssigneeName(task) || '未分配' }}
                          </div>
                          <div style="font-size: 13px; color: #4b5563">
                            {{ formatDueDate(getDueDate(task)) }}
                          </div>
                          <a-tag :color="getStatusColor(getTaskStatus(task))">
                            {{ getStatusText(getTaskStatus(task)) }}
                          </a-tag>
                        </div>
                      </template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
            </a-collapse-panel>
          </a-collapse>
        </a-collapse-panel>
      </a-collapse>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  clients: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  selectedTaskIds: {
    type: Array,
    default: () => []
  },
  hideCompleted: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['selection-change', 'view-task', 'quick-add-task'])

// 展開的客戶分組keys
const expandedKeys = ref([])

// 每個客戶的服務分組展開狀態
const expandedServiceKeys = reactive({})

// 按客戶和服務分組的任務
const groupedTasks = computed(() => {
  const grouped = new Map()
  
  // 先添加所有客戶
  const sortedClients = [...props.clients].sort((a, b) => {
    const nameA = getClientName(a) || ''
    const nameB = getClientName(b) || ''
    return nameA.localeCompare(nameB, 'zh-TW')
  })
  
  sortedClients.forEach(client => {
    const clientId = getClientId(client)
    if (!expandedServiceKeys[clientId]) {
      expandedServiceKeys[clientId] = []
    }
    grouped.set(clientId, {
      clientId,
      clientName: getClientName(client) || '未命名客戶',
      clientTaxId: getClientTaxId(client) || '—',
      serviceGroups: []
    })
  })
  
  // 添加任務（按服務+月份分組）
  props.tasks.forEach(task => {
    const clientId = getTaskClientId(task) || 'unknown'
    
    if (!grouped.has(clientId)) {
      if (!expandedServiceKeys[clientId]) {
        expandedServiceKeys[clientId] = []
      }
      grouped.set(clientId, {
        clientId,
        clientName: getTaskClientName(task) || '未命名客戶',
        clientTaxId: getTaskClientTaxId(task) || '—',
        serviceGroups: []
      })
    }
    
    const client = grouped.get(clientId)
    const serviceName = getTaskServiceName(task) || '一般任務'
    const serviceMonth = getTaskServiceMonth(task) || ''
    
    // 組合鍵：服務名 + 月份
    const groupKey = serviceMonth ? `${serviceName}|||${serviceMonth}` : serviceName
    
    let serviceGroup = client.serviceGroups.find(g => g.groupKey === groupKey)
    
    if (!serviceGroup) {
      // 格式化服務+月份標題
      const monthText = serviceMonth ? formatServiceMonth(serviceMonth) : ''
      const serviceTitle = monthText ? `${serviceName} - ${monthText}` : serviceName
      
      serviceGroup = {
        groupKey,
        serviceName,
        serviceMonth,
        serviceTitle,
        clientServiceId: getTaskClientServiceId(task),
        serviceId: getTaskServiceId(task),
        clientId: getTaskClientId(task),
        tasks: []
      }
      
      client.serviceGroups.push(serviceGroup)
    }
    
    serviceGroup.tasks.push(task)
  })
  
  // 如果勾選"隱藏已完成"，過濾掉全部完成的組
  if (props.hideCompleted) {
    grouped.forEach(client => {
      client.serviceGroups = client.serviceGroups.filter(group => {
        // 檢查是否有未完成任務
        const hasIncomplete = group.tasks.some(t => getTaskStatus(t) !== 'completed')
        // 只保留有未完成任務的組
        return hasIncomplete
      })
    })
  }
  
  // 排序服務組和任務
  grouped.forEach(client => {
    client.serviceGroups.sort((a, b) => {
      // 先按服務名排序
      const serviceCompare = a.serviceName.localeCompare(b.serviceName, 'zh-TW')
      if (serviceCompare !== 0) return serviceCompare
      
      // 再按月份降序排序（最新月份在前）
      return (b.serviceMonth || '').localeCompare(a.serviceMonth || '')
    })
    
    // 排序任務（按到期日期）
    client.serviceGroups.forEach(group => {
      group.tasks.sort((a, b) => {
        const dateA = getDueDate(a) ? new Date(getDueDate(a)) : new Date(0)
        const dateB = getDueDate(b) ? new Date(getDueDate(b)) : new Date(0)
        return dateA - dateB
      })
      
      // 計算完成情況
      const completed = group.tasks.filter(t => getTaskStatus(t) === 'completed').length
      const total = group.tasks.length
      group.completed = completed
      group.total = total
    })
  })
  
  // 轉換為數組並初始化展開keys
  const result = Array.from(grouped.values())
  
  // 初始化展開的客戶keys（展開第一個有任務的客戶）
  if (expandedKeys.value.length === 0 && result.length > 0) {
    const firstClientWithTasks = result.find(c => c.serviceGroups.length > 0)
    if (firstClientWithTasks) {
      expandedKeys.value = [`client-${firstClientWithTasks.clientId}`]
    }
  }
  
  return result
})

// 處理任務選擇變化
const handleTaskSelectionChange = (taskId, checked) => {
  const currentSelected = [...props.selectedTaskIds]
  
  if (checked) {
    if (!currentSelected.includes(taskId)) {
      currentSelected.push(taskId)
    }
  } else {
    const index = currentSelected.indexOf(taskId)
    if (index > -1) {
      currentSelected.splice(index, 1)
    }
  }
  
  emit('selection-change', currentSelected)
}

// 處理查看任務
const handleViewTask = (taskId) => {
  emit('view-task', taskId)
}

// 處理快速新增任務
const handleQuickAddTask = (serviceGroup) => {
  const context = {
    clientId: serviceGroup.clientId,
    clientServiceId: serviceGroup.clientServiceId,
    serviceId: serviceGroup.serviceId,
    serviceName: serviceGroup.serviceName,
    serviceMonth: serviceGroup.serviceMonth
  }
  emit('quick-add-task', context)
}

// 檢查任務是否被選中
const isTaskSelected = (taskId) => {
  return props.selectedTaskIds.includes(taskId)
}

// 格式化服務月份
const formatServiceMonth = (serviceMonth) => {
  if (!serviceMonth) return ''
  // 假設格式為 "YYYY-MM" 或類似
  const parts = serviceMonth.split('-')
  if (parts.length >= 2) {
    return `${parts[0]}年${parseInt(parts[1])}月`
  }
  return serviceMonth
}

// 格式化到期日期
const formatDueDate = (dueDate) => {
  if (!dueDate) return '—'
  // 只顯示月-日
  const date = new Date(dueDate)
  if (isNaN(date.getTime())) return dueDate
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

// 獲取狀態顏色
const getStatusColor = (status) => {
  const colors = {
    'in_progress': 'orange',
    'completed': 'green',
    'cancelled': 'red',
    'pending': 'blue'
  }
  return colors[status] || 'default'
}

// 獲取狀態文字
const getStatusText = (status) => {
  const texts = {
    'in_progress': '進行中',
    'completed': '已完成',
    'cancelled': '已取消',
    'pending': '待處理'
  }
  return texts[status] || status
}

// 客戶相關輔助函數
const getClientId = (client) => {
  return client.clientId || client.client_id || client.id
}

const getClientName = (client) => {
  return client.companyName || client.company_name || client.name
}

const getClientTaxId = (client) => {
  return client.taxId || client.tax_id
}

// 任務相關輔助函數
const getTaskId = (task) => {
  return task.taskId || task.task_id || task.id
}

const getTaskName = (task) => {
  return task.taskName || task.task_name || task.name || '未命名任務'
}

const getTaskStatus = (task) => {
  return task.status || 'pending'
}

const getTaskClientId = (task) => {
  return task.clientId || task.client_id
}

const getTaskClientName = (task) => {
  return task.clientName || task.client_name
}

const getTaskClientTaxId = (task) => {
  return task.clientTaxId || task.client_tax_id || task.taxId || task.tax_id
}

const getTaskServiceId = (task) => {
  return task.serviceId || task.service_id
}

const getTaskServiceName = (task) => {
  return task.serviceName || task.service_name
}

const getTaskServiceMonth = (task) => {
  return task.serviceMonth || task.service_month
}

const getTaskClientServiceId = (task) => {
  return task.clientServiceId || task.client_service_id
}

const getAssigneeName = (task) => {
  return task.assigneeName || task.assignee_name
}

const getDueDate = (task) => {
  return task.dueDate || task.due_date
}

const getTaskProgress = (task) => {
  if (task.progress) {
    return {
      completed: task.progress.completed || 0,
      total: task.progress.total || 0
    }
  }
  return null
}
</script>

<style scoped>
:deep(.ant-collapse-header) {
  background: #f9fafb;
  padding: 12px 16px !important;
}

:deep(.ant-collapse-header:hover) {
  background: #f3f4f6;
}

:deep(.ant-collapse-content-box) {
  padding: 0 !important;
}

:deep(.ant-list-item) {
  transition: background-color 0.2s;
}

:deep(.ant-list-item:hover) {
  background: #f9fafb;
}
</style>


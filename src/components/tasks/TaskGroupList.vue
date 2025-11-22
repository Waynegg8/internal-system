<template>
  <div class="task-group-list">
    <!-- 移除獨立的工具欄，全選客戶和一鍵展開/收合已移至 TaskFilters -->
    
    <a-spin :spinning="loading">
      <a-empty
        v-if="!loading && groupedTasks.length === 0"
        description="沒有符合條件的任務"
        style="padding: 48px"
      />
      
      <div v-else class="task-groups">
        <div
          v-for="clientGroup in groupedTasks"
          :key="`client-${clientGroup.clientId}`"
          class="client-group"
          :class="{ 'client-group-expanded': isClientExpanded(clientGroup.clientId) }"
        >
          <!-- 客戶標題（緊湊型） -->
          <div 
            class="client-header"
            @click="toggleClient(clientGroup.clientId)"
          >
            <div class="client-header-left">
              <a-checkbox
                :checked="isClientSelected(clientGroup.clientId)"
                @click.stop
                @change="(e) => handleClientSelectionChange(clientGroup.clientId, e.target.checked)"
                class="client-checkbox"
              />
              <span class="expand-icon" :class="{ 'expanded': isClientExpanded(clientGroup.clientId) }">
                <RightOutlined />
              </span>
              <strong class="client-name">
                {{ clientGroup.clientName }}
                <span v-if="clientGroup.clientTaxId && clientGroup.clientTaxId !== '—'" class="client-tax-id">
                  ({{ clientGroup.clientTaxId }})
                </span>
              </strong>
              <span class="client-task-count">
                {{ getClientTaskCount(clientGroup) }}個任務
              </span>
            </div>
          </div>
          
          <!-- 服務和任務列表（默認展開或根據狀態） -->
          <div 
            v-if="isClientExpanded(clientGroup.clientId)"
            class="client-content"
          >
            <div v-if="clientGroup.serviceGroups.length === 0" class="no-tasks">
              此客戶目前沒有任務
            </div>
            
            <div
              v-else
              v-for="serviceGroup in clientGroup.serviceGroups"
              :key="`service-${serviceGroup.groupKey}`"
              class="service-group"
            >
              <!-- 服務標題（可點擊收合） -->
              <div class="service-header" @click="toggleService(clientGroup.clientId, serviceGroup.groupKey)">
                <div class="service-header-left">
                  <span class="service-expand-icon" :class="{ 'expanded': isServiceExpanded(clientGroup.clientId, serviceGroup.groupKey) }">
                    <RightOutlined />
                  </span>
                  <span class="service-name">{{ serviceGroup.serviceTitle }}</span>
                  <span class="service-task-info">
                    ({{ serviceGroup.total }}個任務: {{ serviceGroup.completed }}已完成, {{ serviceGroup.total - serviceGroup.completed }}未完成)
                  </span>
                </div>
                <a-button
                  type="primary"
                  size="small"
                  @click.stop="handleQuickAddTask(serviceGroup)"
                  class="add-task-btn"
                >
                  新增任務
                </a-button>
              </div>
              
              <!-- 任務列表（根據展開狀態顯示） -->
              <div v-if="isServiceExpanded(clientGroup.clientId, serviceGroup.groupKey)" class="tasks-list">
                <!-- 按階段分組顯示任務 -->
                <div
                  v-for="stageGroup in getStageGroups(serviceGroup.tasks)"
                  :key="`stage-${stageGroup.stageOrder}`"
                  class="stage-group"
                >
                  <!-- 始終顯示階段標題，即使該階段沒有任務 -->
                  <div v-if="shouldShowStageHeader(stageGroup, serviceGroup.tasks)" class="stage-header">
                    {{ stageGroup.stageName || `階段 ${stageGroup.stageOrder}` }}
                    <span v-if="stageGroup.tasks.length > 0" class="stage-task-count">
                      ({{ stageGroup.tasks.length }}個任務)
                    </span>
                  </div>
                  <div class="stage-tasks" v-if="stageGroup.tasks.length > 0">
                    <div
                      v-for="task in stageGroup.tasks"
                      :key="getTaskId(task)"
                      class="task-item"
                      :class="getTaskItemClass(task)"
                      @click="handleViewTask(getTaskId(task))"
                    >
                      <a-checkbox
                        :checked="isTaskSelected(getTaskId(task))"
                        @click.stop
                        @change="(e) => handleTaskSelectionChange(getTaskId(task), e.target.checked)"
                        class="task-checkbox"
                      />
                      <div class="task-content">
                        <div class="task-name">
                          {{ getTaskName(task) }}
                          <span v-if="getTaskStageInfo(task)" class="task-stage-info">
                            {{ getTaskStageInfo(task) }}
                          </span>
                        </div>
                        <div class="task-meta">
                          <span class="task-assignee">{{ getAssigneeName(task) || '未分配' }}</span>
                          <span class="task-due">{{ formatDueDate(getDueDate(task)) }}</span>
                          <a-tag :color="getStatusColor(getTaskStatus(task))" size="small">
                            {{ getStatusText(getTaskStatus(task)) }}
                          </a-tag>
                        </div>
                      </div>
                      <a-button 
                        type="link" 
                        size="small" 
                        @click.stop="handleViewTask(getTaskId(task))"
                        class="view-detail-btn"
                      >
                        查看
                      </a-button>
                    </div>
                  </div>
                  <!-- 如果該階段沒有任務，顯示提示 -->
                  <div v-else class="stage-empty">
                    此階段暫無任務
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'

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
  },
  currentUser: {
    type: Object,
    default: null
  },
  myTasksFilter: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['selection-change', 'view-task', 'quick-add-task', 'toolbar-state-change'])

// 展開的客戶分組keys（默認展開所有有任務的客戶）
const expandedKeys = ref([])

// 選中的客戶IDs
const selectedClientIds = ref([])

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
        const monthA = String(a.serviceMonth || '')
        const monthB = String(b.serviceMonth || '')
        return monthB.localeCompare(monthA)
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
  
  // 默認展開所有有任務的客戶
  if (result.length > 0) {
    const clientsWithTasks = result
      .filter(c => c.serviceGroups.length > 0)
      .map(c => `client-${c.clientId}`)
    expandedKeys.value = clientsWithTasks
  }
  
  return result
})

// 初始化服務展開狀態（默認展開所有服務）
// 注意：expandedServiceKeys 中不存在的 key 表示展開，存在的 key 表示收合
// 所以默認展開所有服務時，應該保持 expandedServiceKeys 為空數組
const initializeServiceKeys = () => {
  groupedTasks.value.forEach(clientGroup => {
    if (!expandedServiceKeys[clientGroup.clientId]) {
      // 初始化為空數組，表示所有服務都展開
      expandedServiceKeys[clientGroup.clientId] = []
    }
    // 不需要主動添加服務 key，因為空數組表示所有服務都展開
  })
}

// 監聽 groupedTasks 變化，初始化服務展開狀態
watch(groupedTasks, () => {
  initializeServiceKeys()
}, { immediate: true, deep: true })

// 計算總任務數
const totalTaskCount = computed(() => {
  return props.tasks.length
})

// 判斷是否全選
const isAllSelected = computed(() => {
  if (groupedTasks.value.length === 0) return false
  const clientsWithTasks = groupedTasks.value.filter(c => c.serviceGroups.length > 0)
  if (clientsWithTasks.length === 0) return false
  return clientsWithTasks.every(c => selectedClientIds.value.includes(c.clientId))
})

// 判斷是否部分選中
const isIndeterminate = computed(() => {
  const clientsWithTasks = groupedTasks.value.filter(c => c.serviceGroups.length > 0)
  if (clientsWithTasks.length === 0) return false
  const selectedCount = clientsWithTasks.filter(c => selectedClientIds.value.includes(c.clientId)).length
  return selectedCount > 0 && selectedCount < clientsWithTasks.length
})

// 判斷客戶是否展開
const isClientExpanded = (clientId) => {
  return expandedKeys.value.includes(`client-${clientId}`)
}

// 切換客戶展開狀態
const toggleClient = (clientId) => {
  const key = `client-${clientId}`
  const index = expandedKeys.value.indexOf(key)
  if (index > -1) {
    expandedKeys.value.splice(index, 1)
  } else {
    expandedKeys.value.push(key)
  }
}

// 判斷服務是否展開
const isServiceExpanded = (clientId, serviceKey) => {
  if (!expandedServiceKeys[clientId]) {
    // 默認展開所有服務
    expandedServiceKeys[clientId] = []
    return true
  }
  // 如果數組中沒有該 key，表示展開（默認狀態）
  // 如果數組中有該 key，表示收起
  return !expandedServiceKeys[clientId].includes(serviceKey)
}

// 切換服務展開狀態
const toggleService = (clientId, serviceKey) => {
  if (!expandedServiceKeys[clientId]) {
    expandedServiceKeys[clientId] = []
  }
  const index = expandedServiceKeys[clientId].indexOf(serviceKey)
  if (index > -1) {
    // 從數組中移除，表示展開
    expandedServiceKeys[clientId].splice(index, 1)
  } else {
    // 添加到數組中，表示收起
    expandedServiceKeys[clientId].push(serviceKey)
  }
  // 通知父組件狀態變化
  emitToolbarState()
}

// 一鍵展開/收合
const isAllExpanded = computed(() => {
  const clientsWithTasks = groupedTasks.value.filter(c => c.serviceGroups.length > 0)
  if (clientsWithTasks.length === 0) return false
  // 檢查所有客戶是否展開，且所有服務是否展開
  const allClientsExpanded = clientsWithTasks.every(c => isClientExpanded(c.clientId))
  if (!allClientsExpanded) return false
  
  // 檢查所有服務是否都展開（即 expandedServiceKeys 中沒有該服務的 key）
  const allServicesExpanded = clientsWithTasks.every(c => {
    // 如果該客戶的 expandedServiceKeys 不存在或為空數組，表示所有服務都展開
    const serviceKeys = expandedServiceKeys[c.clientId]
    if (!serviceKeys || serviceKeys.length === 0) return true
    // 檢查該客戶下的所有服務是否都不在收合列表中
    return c.serviceGroups.every(service => 
      !serviceKeys.includes(service.groupKey)
    )
  })
  
  return allServicesExpanded
})

const handleExpandAll = () => {
  const clientsWithTasks = groupedTasks.value.filter(c => c.serviceGroups.length > 0)
  
  if (isAllExpanded.value) {
    // 收合所有客戶和服務
    expandedKeys.value = []
    // 收合所有服務 - 將所有服務 key 加入收合列表
    clientsWithTasks.forEach(client => {
      if (!expandedServiceKeys[client.clientId]) {
        expandedServiceKeys[client.clientId] = []
      }
      // 清空現有收合列表，然後添加所有服務
      expandedServiceKeys[client.clientId] = []
      client.serviceGroups.forEach(service => {
        if (!expandedServiceKeys[client.clientId].includes(service.groupKey)) {
          expandedServiceKeys[client.clientId].push(service.groupKey)
        }
      })
    })
  } else {
    // 展開所有客戶
    expandedKeys.value = clientsWithTasks.map(c => `client-${c.clientId}`)
    // 展開所有服務（清空收合列表，讓所有服務都展開）
    clientsWithTasks.forEach(client => {
      expandedServiceKeys[client.clientId] = []
    })
  }
  // 通知父組件狀態變化
  emitToolbarState()
}

// 全選/取消全選客戶
const handleSelectAll = (e) => {
  const clientsWithTasks = groupedTasks.value.filter(c => c.serviceGroups.length > 0)
  if (e.target.checked) {
    selectedClientIds.value = clientsWithTasks.map(c => c.clientId)
    // 選中該客戶下的所有任務
    const allTaskIds = []
    clientsWithTasks.forEach(client => {
      client.serviceGroups.forEach(service => {
        service.tasks.forEach(task => {
          const taskId = getTaskId(task)
          if (!allTaskIds.includes(taskId)) {
            allTaskIds.push(taskId)
          }
        })
      })
    })
    emit('selection-change', [...props.selectedTaskIds, ...allTaskIds.filter(id => !props.selectedTaskIds.includes(id))])
  } else {
    selectedClientIds.value = []
    // 取消選中該客戶下的所有任務
    const taskIdsToRemove = new Set()
    clientsWithTasks.forEach(client => {
      client.serviceGroups.forEach(service => {
        service.tasks.forEach(task => {
          taskIdsToRemove.add(getTaskId(task))
        })
      })
    })
    emit('selection-change', props.selectedTaskIds.filter(id => !taskIdsToRemove.has(id)))
  }
  // 通知父組件狀態變化
  emitToolbarState()
}

// 發送工具欄狀態變化
const emitToolbarState = () => {
  emit('toolbar-state-change', {
    allSelected: isAllSelected.value,
    indeterminate: isIndeterminate.value,
    allExpanded: isAllExpanded.value
  })
}

// 監聽狀態變化並通知父組件
watch([isAllSelected, isIndeterminate, isAllExpanded], () => {
  emitToolbarState()
}, { immediate: true })

// 判斷客戶是否被選中
const isClientSelected = (clientId) => {
  return selectedClientIds.value.includes(clientId)
}

// 處理客戶選擇變化
const handleClientSelectionChange = (clientId, checked) => {
  if (checked) {
    if (!selectedClientIds.value.includes(clientId)) {
      selectedClientIds.value.push(clientId)
    }
    // 選中該客戶下的所有任務
    const client = groupedTasks.value.find(c => c.clientId === clientId)
    if (client) {
      const taskIds = []
      client.serviceGroups.forEach(service => {
        service.tasks.forEach(task => {
          const taskId = getTaskId(task)
          if (!props.selectedTaskIds.includes(taskId)) {
            taskIds.push(taskId)
          }
        })
      })
      if (taskIds.length > 0) {
        emit('selection-change', [...props.selectedTaskIds, ...taskIds])
      }
    }
  } else {
    const index = selectedClientIds.value.indexOf(clientId)
    if (index > -1) {
      selectedClientIds.value.splice(index, 1)
    }
    // 取消選中該客戶下的所有任務
    const client = groupedTasks.value.find(c => c.clientId === clientId)
    if (client) {
      const taskIdsToRemove = new Set()
      client.serviceGroups.forEach(service => {
        service.tasks.forEach(task => {
          taskIdsToRemove.add(getTaskId(task))
        })
      })
      emit('selection-change', props.selectedTaskIds.filter(id => !taskIdsToRemove.has(id)))
    }
  }
}

// 獲取客戶任務數
const getClientTaskCount = (clientGroup) => {
  return clientGroup.serviceGroups.reduce((sum, service) => sum + service.tasks.length, 0)
}

// 獲取指定階段編號的階段名稱
const getStageNameForOrder = (tasks, stageOrder) => {
  for (const task of tasks) {
    if (task.stages && Array.isArray(task.stages)) {
      const stage = task.stages.find(s => 
        (s.stage_order || s.stageOrder) === stageOrder
      )
      if (stage) {
        return stage.stage_name || stage.stageName || null
      }
    }
  }
  return null
}

// 按階段分組任務 - 顯示所有階段的任務
// 根據需求：按階段編號（stage_order）分組，顯示「階段X/Y」
// 用戶需要能看到每個階段的所有任務，以掌握整個服務的流程
const getStageGroups = (tasks) => {
  if (!tasks || tasks.length === 0) {
    return []
  }
  
  const stageMap = new Map()
  const allStageOrders = new Set()
  
  // 首先收集所有任務涉及的所有階段
  tasks.forEach(task => {
    const totalStages = getTaskTotalStages(task)
    
    if (totalStages > 0 && task.stages && Array.isArray(task.stages) && task.stages.length > 0) {
      // 如果有 stages 陣列，收集所有階段
      task.stages.forEach(stage => {
        const stageOrder = stage.stage_order || stage.stageOrder || 0
        if (stageOrder > 0) {
          allStageOrders.add(stageOrder)
        }
      })
    } else if (totalStages > 0) {
      // 沒有 stages 陣列但有總階段數，創建所有階段
      for (let i = 1; i <= totalStages; i++) {
        allStageOrders.add(i)
      }
    }
  })
  
  // 為每個階段創建一個組（即使該階段沒有任務也要顯示）
  allStageOrders.forEach(stageOrder => {
    const stageName = getStageNameForOrder(tasks, stageOrder)
    stageMap.set(stageOrder, {
      stageOrder,
      stageName,
      tasks: []
    })
  })
  
  // 將任務分配到對應的階段組
  // 任務應該顯示在當前階段
  tasks.forEach(task => {
    const totalStages = getTaskTotalStages(task)
    const currentStage = getCurrentStage(task)
    
    if (totalStages > 0) {
      // 將任務放入當前階段組
      const stageOrder = currentStage > 0 ? currentStage : 1
      if (stageMap.has(stageOrder)) {
        stageMap.get(stageOrder).tasks.push(task)
      }
    } else {
      // 沒有階段信息的任務，歸類到階段 0
      if (!stageMap.has(0)) {
        stageMap.set(0, {
          stageOrder: 0,
          stageName: null,
          tasks: []
        })
      }
      stageMap.get(0).tasks.push(task)
    }
  })
  
  // 轉換為數組並排序
  return Array.from(stageMap.values()).sort((a, b) => a.stageOrder - b.stageOrder)
}

// 判斷是否顯示階段標題
const shouldShowStageHeader = (stageGroup, allTasks) => {
  // 只有當階段 order > 0 時才顯示
  if (stageGroup.stageOrder === 0) return false
  const stageGroups = getStageGroups(allTasks)
  // 如果有階段組，都顯示階段標題（即使該階段沒有任務也要顯示）
  return stageGroups.length > 0
}

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
  // 確保 serviceMonth 是字符串
  const monthStr = String(serviceMonth)
  // 假設格式為 "YYYY-MM" 或類似
  const parts = monthStr.split('-')
  if (parts.length >= 2) {
    return `${parts[0]}年${parseInt(parts[1])}月`
  }
  return monthStr
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

// 獲取任務是否可開始
const getTaskCanStart = (task) => {
  return task.canStart === true || task.can_start === true || task.canStart === 1 || task.can_start === 1
}

// 獲取任務總階段數
const getTaskTotalStages = (task) => {
  return task.totalStages || task.total_stages || (task.progress?.total || 0)
}

// 獲取當前階段（已完成階段數 + 1，如果所有階段都完成則顯示總階段數）
const getCurrentStage = (task) => {
  const progress = getTaskProgress(task)
  if (progress) {
    // 如果所有階段都完成，顯示總階段數
    if (progress.completed >= progress.total) {
      return progress.total
    }
    // 否則顯示當前階段（已完成階段數 + 1）
    return progress.completed + 1
  }
  // 如果沒有進度信息，但有總階段數，顯示 1
  const totalStages = getTaskTotalStages(task)
  return totalStages > 0 ? 1 : 0
}

// 獲取任務階段信息顯示文本（如 "階段1/3"）
const getTaskStageInfo = (task) => {
  const totalStages = getTaskTotalStages(task)
  if (totalStages > 0) {
    const currentStage = getCurrentStage(task)
    return `階段${currentStage}/${totalStages}`
  }
  return null
}

// 判斷任務是否屬於當前用戶
const isMyTask = (task) => {
  if (!props.currentUser || !props.myTasksFilter) {
    return false
  }
  
  const userId = props.currentUser.id || props.currentUser.userId || props.currentUser.user_id
  const taskAssigneeId = task.assigneeUserId || task.assignee_user_id || task.assignee?.id || task.assignee?.userId || task.assignee?.user_id
  
  if (!userId || !taskAssigneeId) {
    return false
  }
  
  return String(userId) === String(taskAssigneeId)
}

// 獲取任務項樣式類
const getTaskItemClass = (task) => {
  const status = getTaskStatus(task)
  const isOverdue = task.isOverdue || task.is_overdue
  const classes = []
  
  if (status === 'completed') {
    classes.push('task-completed')
  } else if (isOverdue) {
    classes.push('task-overdue')
  } else if (status === 'in_progress') {
    classes.push('task-in-progress')
  }
  
  return classes.join(' ')
}

// 獲取任務列表項樣式（保留以兼容）
const getTaskItemStyle = (task) => {
  const baseStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid #f9fafb',
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-left 0.2s, box-shadow 0.2s'
  }
  
  const canStart = getTaskCanStart(task)
  const status = getTaskStatus(task)
  const isMyTaskFlag = isMyTask(task)
  
  // 如果啟用了「我的任務」篩選，且任務屬於當前用戶，使用藍色背景高亮
  if (isMyTaskFlag && status !== 'completed' && status !== 'cancelled') {
    // 如果同時可開始，使用組合樣式（藍色背景 + 綠色邊框）
    if (canStart) {
      return {
        ...baseStyle,
        backgroundColor: '#eff6ff',
        borderLeft: '4px solid #3b82f6',
        paddingLeft: '12px',
        boxShadow: '0 0 0 1px #dbeafe inset'
      }
    }
    // 只是我的任務，使用藍色背景
    return {
      ...baseStyle,
      backgroundColor: '#eff6ff',
      borderLeft: '4px solid #3b82f6',
      paddingLeft: '12px'
    }
  }
  
  // 如果任務可開始，使用綠色背景高亮
  if (canStart && status !== 'completed' && status !== 'cancelled') {
    return {
      ...baseStyle,
      backgroundColor: '#f0fdf4',
      borderLeft: '4px solid #10b981',
      paddingLeft: '12px' // 調整左側 padding 以適應 border
    }
  }
  
  // 如果任務不可開始，使用灰色背景
  if (!canStart && status !== 'completed' && status !== 'cancelled') {
    return {
      ...baseStyle,
      backgroundColor: '#f9fafb',
      opacity: 0.7
    }
  }
  
  // 已完成或已取消的任務保持默認樣式
  return baseStyle
}

// 監聽 selectedTaskIds 變化，同步更新 selectedClientIds
watch(() => props.selectedTaskIds, (newIds) => {
  // 當任務選擇變化時，更新客戶選擇狀態
  const clientTaskMap = new Map()
  groupedTasks.value.forEach(client => {
    const taskIds = []
    client.serviceGroups.forEach(service => {
      service.tasks.forEach(task => {
        taskIds.push(getTaskId(task))
      })
    })
    clientTaskMap.set(client.clientId, taskIds)
  })
  
  // 檢查每個客戶的所有任務是否都被選中
  selectedClientIds.value = []
  clientTaskMap.forEach((taskIds, clientId) => {
    if (taskIds.length > 0 && taskIds.every(id => newIds.includes(id))) {
      selectedClientIds.value.push(clientId)
    }
  })
  
  // 通知父組件狀態變化
  emitToolbarState()
}, { deep: true })

// 暴露方法給父組件
defineExpose({
  handleSelectAll,
  handleExpandAll
})
</script>

<style scoped>
.task-group-list {
  margin-top: 0; /* 完全移除上邊距，讓布局更緊湊 */
}

/* 操作工具欄已移至 TaskFilters，移除相關樣式 */

/* 任務分組 */
.task-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.client-group {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  transition: all 0.2s ease;
}

.client-group:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

/* 客戶標題（緊湊型） */
.client-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  background: #fafafa;
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.2s ease;
}

.client-header:hover {
  background: #f0f0f0;
}

.client-group-expanded .client-header {
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.client-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.client-checkbox {
  flex-shrink: 0;
}

.expand-icon {
  font-size: 12px;
  color: #6b7280;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.client-name {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-tax-id {
  color: #6b7280;
  font-weight: normal;
  margin-left: 4px;
}

.client-task-count {
  font-size: 12px;
  color: #9ca3af;
  margin-left: 8px;
  flex-shrink: 0;
}

/* 客戶內容 */
.client-content {
  padding: 8px;
}

.no-tasks {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

/* 服務組（緊湊型） */
.service-group {
  margin-bottom: 12px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.service-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  padding: 4px 8px;
  margin: 0 -8px 8px -8px;
  border-radius: 4px;
}

.service-header:hover {
  background-color: #f5f5f5;
}

.service-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.service-expand-icon {
  font-size: 12px;
  color: #6b7280;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.service-expand-icon.expanded {
  transform: rotate(90deg);
}

.service-name {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.service-task-info {
  font-size: 12px;
  color: #9ca3af;
}

.add-task-btn {
  flex-shrink: 0;
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
}

/* 任務列表 */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 階段分組 */
.stage-group {
  margin-bottom: 8px;
}

.stage-header {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-task-count {
  font-size: 11px;
  font-weight: 400;
  color: #9ca3af;
}

.stage-empty {
  font-size: 12px;
  color: #9ca3af;
  padding: 8px;
  text-align: center;
  font-style: italic;
}

.stage-tasks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 8px;
}

/* 任務項（緊湊型） */
.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.task-item:hover {
  background: #f5f5f5;
  border-color: #e5e7eb;
}

.task-item.task-in-progress {
  border-left: 3px solid #fa8c16;
  background: #fff7e6;
}

.task-item.task-overdue {
  border-left: 3px solid #ef4444;
  background: #fff1f0;
}

.task-item.task-completed {
  opacity: 0.7;
  background: #f6ffed;
}

.task-checkbox {
  flex-shrink: 0;
}

.task-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.task-stage-info {
  font-size: 12px;
  font-weight: 500;
  color: #1890ff;
  background: #e6f7ff;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.task-assignee {
  color: #6b7280;
}

.task-due {
  color: #4b5563;
}

.view-detail-btn {
  flex-shrink: 0;
  padding: 0 8px;
  height: 24px;
  font-size: 12px;
}

/* 響應式 */
@media (max-width: 768px) {
  .client-header {
    padding: 6px 10px;
  }
  
  .client-name {
    font-size: 13px;
  }
  
  .service-group {
    padding: 6px;
  }
  
  .task-item {
    padding: 5px 6px;
  }
  
  .task-name {
    font-size: 12px;
  }
  
  .task-meta {
    font-size: 11px;
    gap: 8px;
  }
}
</style>

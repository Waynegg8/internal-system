<template>
  <div style="padding: 24px">
    <!-- 頁面標題區域 -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px">
      <div>
        <a-typography-text type="secondary" style="margin-top: 8px; display: block">
          按客戶和服務查看所有任務
        </a-typography-text>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
        <a-typography-text v-if="lastUpdateTime" type="secondary" style="font-size: 14px">
          🔄 最後更新: {{ formatUpdateTime(lastUpdateTime) }}
        </a-typography-text>
        <a-button type="primary" @click="handleRefresh" :loading="store.loading">
          立即刷新
        </a-button>
      </div>
    </div>

    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 警告提示 -->
    <a-alert
      v-if="warningMessage"
      type="warning"
      :message="warningMessage"
      show-icon
      closable
      @close="warningMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage || store.error"
      type="error"
      :message="errorMessage || store.error"
      show-icon
      closable
      @close="errorMessage = ''; handleCloseError()"
      style="margin-bottom: 16px"
    />

    <!-- 篩選器 -->
    <TaskOverviewFilters
      :filters="store.filters"
      :selected-months="store.selectedMonths"
      @update:filters="handleFiltersUpdate"
      @update:selected-months="handleSelectedMonthsUpdate"
      @apply="handleApplyFilters"
      @expand-all="handleExpandAll"
      @collapse-all="handleCollapseAll"
      @expand-overdue="handleExpandOverdue"
      @toggle-batch-mode="handleToggleBatchMode"
      style="margin-bottom: 16px"
    />

    <!-- 統計摘要 -->
    <TaskOverviewStats
      :stats="stats"
      :selected-months="store.selectedMonths"
      style="margin-bottom: 16px"
    />

    <!-- 批量操作欄 -->
    <BatchActionsBar
      v-if="batchMode"
      :selected-count="selectedTaskCount"
      @batch-status="handleBatchStatus"
      @batch-due-date="handleBatchDueDate"
      @batch-assignee="handleBatchAssignee"
      @clear="handleClearBatchSelection"
      style="margin-bottom: 16px"
    />

    <!-- 任務列表 -->
    <TaskOverviewList
      :grouped-tasks="groupedTasks"
      :expanded-clients="store.expandedClients"
      :expanded-services="store.expandedServices"
      :loading="store.loading"
      :batch-mode="batchMode"
      :is-task-selected="store.isTaskSelected"
      :is-client-selected="store.isClientSelected"
      :is-service-selected="store.isServiceSelected"
      @toggle-client="handleToggleClient"
      @toggle-service="handleToggleService"
      @select-client="handleClientSelect"
      @select-service="handleServiceSelect"
      @select-task="handleTaskSelect"
      @view-detail="handleViewDetail"
      @status-change="handleStatusChange"
      @adjust-due-date="handleAdjustDueDate"
      @record-overdue-reason="handleRecordOverdueReason"
    />

    <!-- 批量狀態彈窗 -->
    <BatchStatusModal
      v-model:visible="batchStatusModalVisible"
      :selected-count="selectedTaskCount"
      @submit="handleBatchStatusSubmit"
      @cancel="handleBatchStatusCancel"
    />

    <!-- 批量到期日彈窗 -->
    <BatchDueDateModal
      v-model:visible="batchDueDateModalVisible"
      :selected-count="selectedTaskCount"
      @submit="handleBatchDueDateSubmit"
      @cancel="handleBatchDueDateCancel"
    />

    <!-- 批量負責人彈窗 -->
    <BatchAssigneeModal
      v-model:visible="batchAssigneeModalVisible"
      :selected-count="selectedTaskCount"
      :users="allUsers"
      @submit="handleBatchAssigneeSubmit"
      @cancel="handleBatchAssigneeCancel"
    />

    <!-- 調整到期日彈窗 -->
    <AdjustDueDateModal
      v-model:visible="adjustDueDateModalVisible"
      :task="selectedTaskForAction"
      @submit="handleAdjustDueDateSubmit"
      @cancel="handleAdjustDueDateCancel"
    />

    <!-- 記錄逾期原因彈窗 -->
    <RecordOverdueReasonModal
      v-model:visible="recordOverdueReasonModalVisible"
      :task="selectedTaskForAction"
      @submit="handleRecordOverdueReasonSubmit"
      @cancel="handleRecordOverdueReasonCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { useTaskOverviewStore } from '@/stores/taskOverview'
import { fetchAllUsers } from '@/api/users'
import TaskOverviewFilters from '@/components/tasks/TaskOverviewFilters.vue'
import TaskOverviewStats from '@/components/tasks/TaskOverviewStats.vue'
import TaskOverviewList from '@/components/tasks/TaskOverviewList.vue'
import BatchActionsBar from '@/components/tasks/BatchActionsBar.vue'
import BatchStatusModal from '@/components/tasks/BatchStatusModal.vue'
import BatchDueDateModal from '@/components/tasks/BatchDueDateModal.vue'
import BatchAssigneeModal from '@/components/tasks/BatchAssigneeModal.vue'
import AdjustDueDateModal from '@/components/tasks/AdjustDueDateModal.vue'
import RecordOverdueReasonModal from '@/components/tasks/RecordOverdueReasonModal.vue'

const router = useRouter()
const store = useTaskOverviewStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 從 store 獲取響應式狀態
const { groupedTasks, stats, lastUpdateTime, selectedTaskCount } = storeToRefs(store)

// 本地狀態
const batchMode = ref(false)
const batchStatusModalVisible = ref(false)
const batchDueDateModalVisible = ref(false)
const batchAssigneeModalVisible = ref(false)
const adjustDueDateModalVisible = ref(false)
const recordOverdueReasonModalVisible = ref(false)
const selectedTaskForAction = ref(null)
const allUsers = ref([])

// 格式化更新時間
const formatUpdateTime = (time) => {
  if (!time) return '--'
  const date = new Date(time)
  return date.toLocaleTimeString('zh-TW')
}

// 處理篩選條件更新
const handleFiltersUpdate = (filters) => {
  store.setFilters(filters)
}

// 處理選中月份更新
const handleSelectedMonthsUpdate = (months) => {
  store.setSelectedMonths(months)
}

// 套用篩選
const handleApplyFilters = async () => {
  if (store.selectedMonths.length === 0) {
    showWarning('請至少選擇一個月份')
    return
  }
  
  try {
    await store.fetchTaskOverview()
    showSuccess('載入成功')
  } catch (error) {
    console.error('載入任務總覽失敗:', error)
  }
}

// 全部展開
const handleExpandAll = () => {
  store.expandAllClients(true)
}

// 全部折疊
const handleCollapseAll = () => {
  store.expandAllClients(false)
}

// 只展開逾期
const handleExpandOverdue = () => {
  store.expandOnlyOverdue()
}

// 切換批量操作模式
const handleToggleBatchMode = (enabled) => {
  batchMode.value = enabled
  if (!enabled) {
    store.clearBatchSelection()
  }
}

// 切換客戶展開/折疊
const handleToggleClient = (clientId) => {
  store.toggleClientExpanded(clientId)
}

// 切換服務展開/折疊
const handleToggleService = (serviceKey) => {
  store.toggleServiceExpanded(serviceKey)
}

// 查看任務詳情
const handleViewDetail = (taskId) => {
  router.push(`/tasks/${taskId}`)
}

// 立即刷新
const handleRefresh = async () => {
  try {
    await store.fetchTaskOverview()
    showSuccess('刷新成功')
  } catch (error) {
    console.error('刷新失敗:', error)
  }
}

// 清除錯誤
const handleCloseError = () => {
  store.clearError()
}

// 批量選擇相關
const handleTaskSelect = (taskId) => {
  store.toggleTaskSelection(taskId)
}

const handleClientSelect = (clientId) => {
  store.toggleClientSelection(clientId)
}

const handleServiceSelect = (serviceKey) => {
  store.toggleServiceSelection(serviceKey)
}

const handleClearBatchSelection = () => {
  store.clearBatchSelection()
}

// 批量操作
const handleBatchStatus = () => {
  if (selectedTaskCount.value === 0) {
    showWarning('請先選擇任務')
    return
  }
  batchStatusModalVisible.value = true
}

const handleBatchStatusSubmit = async (status) => {
  try {
    const selectedTaskIds = Array.from(store.batchSelectedTasks)
    await store.batchUpdateStatus(selectedTaskIds, status)
    showSuccess('批量更新狀態成功')
    batchStatusModalVisible.value = false
  } catch (error) {
    showError(error.message || '批量更新狀態失敗')
  }
}

const handleBatchStatusCancel = () => {
  batchStatusModalVisible.value = false
}

const handleBatchDueDate = () => {
  if (selectedTaskCount.value === 0) {
    showWarning('請先選擇任務')
    return
  }
  batchDueDateModalVisible.value = true
}

const handleBatchDueDateSubmit = async (dueDate, reason) => {
  try {
    const selectedTaskIds = Array.from(store.batchSelectedTasks)
    await store.batchUpdateDueDate(selectedTaskIds, dueDate, reason)
    showSuccess('批量調整到期日成功')
    batchDueDateModalVisible.value = false
  } catch (error) {
    showError(error.message || '批量調整到期日失敗')
  }
}

const handleBatchDueDateCancel = () => {
  batchDueDateModalVisible.value = false
}

const handleBatchAssignee = () => {
  if (selectedTaskCount.value === 0) {
    showWarning('請先選擇任務')
    return
  }
  batchAssigneeModalVisible.value = true
}

const handleBatchAssigneeSubmit = async (assigneeId) => {
  try {
    const selectedTaskIds = Array.from(store.batchSelectedTasks)
    await store.batchUpdateAssignee(selectedTaskIds, assigneeId)
    showSuccess('批量分配負責人成功')
    batchAssigneeModalVisible.value = false
  } catch (error) {
    showError(error.message || '批量分配負責人失敗')
  }
}

const handleBatchAssigneeCancel = () => {
  batchAssigneeModalVisible.value = false
}

// 單個任務操作
const handleStatusChange = async (taskId, status) => {
  try {
    await store.updateTaskStatus(taskId, status)
    showSuccess('更新狀態成功')
  } catch (error) {
    showError(error.message || '更新狀態失敗')
  }
}

const handleAdjustDueDate = (taskId) => {
  const task = store.tasks.find(t => {
    const id = t.task_id || t.taskId || t.id
    return id === taskId
  })
  selectedTaskForAction.value = task
  adjustDueDateModalVisible.value = true
}

const handleAdjustDueDateSubmit = async (taskId, dueDate, reason) => {
  try {
    await store.adjustTaskDueDate(taskId, dueDate, reason)
    showSuccess('調整到期日成功')
    adjustDueDateModalVisible.value = false
    selectedTaskForAction.value = null
  } catch (error) {
    showError(error.message || '調整到期日失敗')
  }
}

const handleAdjustDueDateCancel = () => {
  adjustDueDateModalVisible.value = false
  selectedTaskForAction.value = null
}

const handleRecordOverdueReason = (taskId) => {
  const task = store.tasks.find(t => {
    const id = t.task_id || t.taskId || t.id
    return id === taskId
  })
  selectedTaskForAction.value = task
  recordOverdueReasonModalVisible.value = true
}

const handleRecordOverdueReasonSubmit = async (taskId, reason) => {
  try {
    await store.recordOverdueReason(taskId, reason)
    showSuccess('記錄逾期原因成功')
    recordOverdueReasonModalVisible.value = false
    selectedTaskForAction.value = null
  } catch (error) {
    showError(error.message || '記錄逾期原因失敗')
  }
}

const handleRecordOverdueReasonCancel = () => {
  recordOverdueReasonModalVisible.value = false
  selectedTaskForAction.value = null
}

// 計算屬性
const selectedTaskIds = computed(() => {
  return Array.from(store.batchSelectedTasks)
})

// 初始化
onMounted(async () => {
  // 從 localStorage 恢復篩選條件
  store.restoreFilters()
  
  // 載入用戶列表
  try {
    const response = await fetchAllUsers()
    allUsers.value = response.data || []
  } catch (error) {
    console.error('載入用戶列表失敗:', error)
  }
  
  // 如果有保存的篩選條件，自動載入數據
  if (store.selectedMonths.length > 0) {
    try {
      await store.fetchTaskOverview()
    } catch (error) {
      console.error('自動載入失敗:', error)
    }
  }
})
</script>

<style scoped>
:deep(.ant-typography-title) {
  margin-bottom: 0;
}
</style>


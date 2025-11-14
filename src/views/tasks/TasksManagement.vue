<template>
  <div style="padding: 24px">
    <!-- 操作欄 -->
    <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 16px; gap: 12px; flex-wrap: wrap">
      <a-typography-text v-if="currentView === 'overview' && lastUpdateTime" type="secondary" style="font-size: 13px">
        最後更新: {{ formatUpdateTime(lastUpdateTime) }}
      </a-typography-text>
      <a-button type="primary" @click="handleRefresh" :loading="loading" size="small">
        刷新
      </a-button>
    </div>

    <!-- 視圖切換 Tab -->
    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-tabs v-model:activeKey="currentView" @change="handleViewChange" size="small">
        <a-tab-pane key="list" tab="任務列表">
          <!-- 列表視圖內容 -->
        </a-tab-pane>
        <a-tab-pane key="overview" tab="任務總覽">
          <!-- 總覽視圖內容 -->
        </a-tab-pane>
      </a-tabs>
    </a-card>

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
      v-if="errorMessage || error"
      type="error"
      :message="errorMessage || error"
      show-icon
      closable
      @close="errorMessage = ''; handleCloseError()"
      style="margin-bottom: 16px"
    />

    <!-- 列表視圖 -->
    <div v-if="currentView === 'list'">
      <!-- 篩選工具欄 -->
      <TaskFilters
        :filters="listFilters"
        :users="allUsers"
        :tags="allTags"
        :selected-task-ids="selectedTaskIds"
        @filters-change="handleListFiltersChange"
        @batch-assign="handleBatchAssign"
        @add-task="handleAddTask"
        style="margin-bottom: 16px"
      />
      
      <!-- 任務分組列表 -->
      <TaskGroupList
        :tasks="listTasks"
        :clients="allClients"
        :loading="loading"
        :selected-task-ids="selectedTaskIds"
        :hide-completed="listFilters.hide_completed"
        @selection-change="handleSelectionChange"
        @view-task="handleViewTask"
        @quick-add-task="handleQuickAddTask"
      />
    </div>

    <!-- 總覽視圖 -->
    <div v-if="currentView === 'overview'">
      <!-- 篩選器 -->
      <TaskOverviewFilters
        :filters="overviewFilters"
        :selected-months="selectedMonths"
        @update:filters="handleOverviewFiltersUpdate"
        @update:selected-months="handleSelectedMonthsUpdate"
        @apply="handleApplyOverviewFilters"
        @expand-all="handleExpandAll"
        @collapse-all="handleCollapseAll"
        @expand-overdue="handleExpandOverdue"
        @toggle-batch-mode="handleToggleBatchMode"
        style="margin-bottom: 16px"
      />

      <!-- 統計摘要 -->
      <TaskOverviewStats
        :stats="overviewStats"
        :selected-months="selectedMonths"
        style="margin-bottom: 16px"
      />

      <!-- 批量操作欄 -->
      <BatchActionsBar
        v-if="batchMode"
        :selected-count="overviewSelectedTaskCount"
        @batch-status="handleBatchStatus"
        @batch-due-date="handleBatchDueDate"
        @batch-assignee="handleBatchAssignee"
        @clear="handleClearBatchSelection"
        style="margin-bottom: 16px"
      />

      <!-- 任務列表 -->
      <TaskOverviewList
        :grouped-tasks="groupedTasks"
        :expanded-clients="expandedClients"
        :expanded-services="expandedServices"
        :loading="loading"
        :batch-mode="batchMode"
        :is-task-selected="isTaskSelected"
        :is-client-selected="isClientSelected"
        :is-service-selected="isServiceSelected"
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
    </div>
    
    <!-- 批量分配彈窗 -->
    <BatchAssignTaskModal
      v-model:visible="batchAssignModalVisible"
      :selected-task-ids="selectedTaskIds"
      :users="allUsers"
      @success="handleBatchAssignSuccess"
    />
    
    <!-- 快速新增任務彈窗 -->
    <QuickAddTaskModal
      v-model:visible="quickAddTaskModalVisible"
      :clients="allClients"
      :services="allServices"
      :service-items="allServiceItems"
      :users="allUsers"
      :tasks="listTasks"
      :sops="allSOPs"
      :quick-add-context="quickAddContext"
      @success="handleQuickAddTaskSuccess"
    />

    <!-- 批量狀態彈窗 -->
    <BatchStatusModal
      v-model:visible="batchStatusModalVisible"
      :selected-count="overviewSelectedTaskCount"
      @submit="handleBatchStatusSubmit"
      @cancel="handleBatchStatusCancel"
    />

    <!-- 批量到期日彈窗 -->
    <BatchDueDateModal
      v-model:visible="batchDueDateModalVisible"
      :selected-count="overviewSelectedTaskCount"
      @submit="handleBatchDueDateSubmit"
      @cancel="handleBatchDueDateCancel"
    />

    <!-- 批量負責人彈窗 -->
    <BatchAssigneeModal
      v-model:visible="batchAssigneeModalVisible"
      :selected-count="overviewSelectedTaskCount"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePageAlert } from '@/composables/usePageAlert'
import { useTaskStore } from '@/stores/tasks'
import { useTaskOverviewStore } from '@/stores/taskOverview'
import { fetchAllServices, fetchServiceItems } from '@/api/services'
import { fetchAllSOPs } from '@/api/sop'
import { useTaskApi } from '@/api/tasks'
import TaskFilters from '@/components/tasks/TaskFilters.vue'
import TaskGroupList from '@/components/tasks/TaskGroupList.vue'
import TaskOverviewFilters from '@/components/tasks/TaskOverviewFilters.vue'
import TaskOverviewStats from '@/components/tasks/TaskOverviewStats.vue'
import TaskOverviewList from '@/components/tasks/TaskOverviewList.vue'
import BatchActionsBar from '@/components/tasks/BatchActionsBar.vue'
import BatchAssignTaskModal from '@/components/tasks/BatchAssignTaskModal.vue'
import QuickAddTaskModal from '@/components/tasks/QuickAddTaskModal.vue'
import BatchStatusModal from '@/components/tasks/BatchStatusModal.vue'
import BatchDueDateModal from '@/components/tasks/BatchDueDateModal.vue'
import BatchAssigneeModal from '@/components/tasks/BatchAssigneeModal.vue'
import AdjustDueDateModal from '@/components/tasks/AdjustDueDateModal.vue'
import RecordOverdueReasonModal from '@/components/tasks/RecordOverdueReasonModal.vue'

const router = useRouter()
const route = useRoute()
const taskStore = useTaskStore()
const overviewStore = useTaskOverviewStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 設置頁面標題（根據視圖切換）
const updatePageTitle = () => {
  const title = currentView.value === 'list' ? '任務列表' : '任務總覽'
  document.title = `${title} - 內部管理系統`
}

// 視圖狀態
const currentView = ref('list') // 'list' 或 'overview'

// 列表視圖相關
const listTasks = computed(() => taskStore.tasks)
const listFilters = computed(() => taskStore.filters)
const selectedTaskIds = computed(() => taskStore.selectedTaskIds)
const allClients = computed(() => taskStore.allClients)
const allUsers = computed(() => taskStore.allUsers)
const allTags = computed(() => taskStore.allTags)
const allSOPs = computed(() => taskStore.allSOPs)
const loading = computed(() => taskStore.loading || overviewStore.loading)
const error = computed(() => taskStore.error || overviewStore.error)

// 總覽視圖相關
const groupedTasks = computed(() => overviewStore.groupedTasks)
const overviewStats = computed(() => overviewStore.stats)
const overviewFilters = computed(() => overviewStore.filters)
const selectedMonths = computed(() => overviewStore.selectedMonths)
const expandedClients = computed(() => overviewStore.expandedClients)
const expandedServices = computed(() => overviewStore.expandedServices)
const overviewSelectedTaskCount = computed(() => overviewStore.selectedTaskCount)
const isTaskSelected = computed(() => overviewStore.isTaskSelected)
const isClientSelected = computed(() => overviewStore.isClientSelected)
const isServiceSelected = computed(() => overviewStore.isServiceSelected)
const lastUpdateTime = computed(() => overviewStore.lastUpdateTime)
const batchSelectedTasks = computed(() => overviewStore.batchSelectedTasks)

// 本地狀態
const batchMode = ref(false)
const batchAssignModalVisible = ref(false)
const quickAddTaskModalVisible = ref(false)
const quickAddContext = ref(null)
const allServices = ref([])
const allServiceItems = ref([])
const batchStatusModalVisible = ref(false)
const batchDueDateModalVisible = ref(false)
const batchAssigneeModalVisible = ref(false)
const adjustDueDateModalVisible = ref(false)
const recordOverdueReasonModalVisible = ref(false)
const selectedTaskForAction = ref(null)

// 格式化更新時間
const formatUpdateTime = (time) => {
  if (!time) return '--'
  const date = new Date(time)
  return date.toLocaleTimeString('zh-TW')
}

// 視圖切換處理
const handleViewChange = (key) => {
  currentView.value = key
  updatePageTitle()
  
  // 切換視圖時載入對應數據
  if (key === 'list') {
    // 列表視圖：如果還沒有數據，載入數據
    if (listTasks.value.length === 0) {
      loadListData()
    }
  } else if (key === 'overview') {
    // 總覽視圖：恢復篩選條件並載入數據
    overviewStore.restoreFilters()
    if (selectedMonths.value.length > 0) {
      loadOverviewData()
    }
  }
}

// 載入列表視圖數據
const loadListData = async () => {
  try {
    await Promise.all([
      taskStore.fetchSupportData(),
      taskStore.fetchTasks(),
      loadServices(),
      loadServiceItems(),
      loadSOPs()
    ])
  } catch (err) {
    console.error('載入列表數據失敗:', err)
  }
}

// 載入總覽視圖數據
const loadOverviewData = async () => {
  try {
    await overviewStore.fetchTaskOverview()
  } catch (err) {
    console.error('載入總覽數據失敗:', err)
  }
}

// 載入服務列表
const loadServices = async () => {
  try {
    const response = await fetchAllServices()
    allServices.value = response.data || []
  } catch (err) {
    console.error('載入服務列表失敗:', err)
  }
}

// 載入服務項目列表
const loadServiceItems = async () => {
  try {
    const response = await fetchServiceItems()
    allServiceItems.value = response.data || []
  } catch (err) {
    console.error('載入服務項目列表失敗:', err)
  }
}

// 載入 SOP 列表
const loadSOPs = async () => {
  try {
    const response = await fetchAllSOPs({ perPage: 500, scope: 'task' })
    allSOPs.value = response.data || []
  } catch (err) {
    console.error('載入 SOP 列表失敗:', err)
  }
}

// 立即刷新
const handleRefresh = async () => {
  try {
    if (currentView.value === 'list') {
      await loadListData()
      showSuccess('刷新成功')
    } else {
      await loadOverviewData()
      showSuccess('刷新成功')
    }
  } catch (error) {
    console.error('刷新失敗:', error)
  }
}

// ========== 列表視圖處理函數 ==========

// 處理列表篩選條件變化
const handleListFiltersChange = (filters) => {
  taskStore.setFilters(filters)
  taskStore.fetchTasks()
}

// 處理任務選擇變化
const handleSelectionChange = (selectedIds) => {
  taskStore.setSelectedTaskIds(selectedIds)
}

// 處理查看任務
const handleViewTask = (taskId) => {
  router.push(`/tasks/${taskId}`)
}

// 處理批量分配
const handleBatchAssign = () => {
  if (selectedTaskIds.value.length === 0) {
    showWarning('請先選擇要分配的任務')
    return
  }
  batchAssignModalVisible.value = true
}

// 處理批量分配成功
const handleBatchAssignSuccess = async (assigneeUserId) => {
  try {
    await taskStore.batchUpdateTaskAssignee(selectedTaskIds.value, assigneeUserId)
    showSuccess('批量分配成功')
    taskStore.clearSelectedTaskIds()
    batchAssignModalVisible.value = false
  } catch (err) {
    showError(err.message || '批量分配失敗')
  }
}

// 處理新增任務（跳轉到新增頁面）
const handleAddTask = () => {
  router.push('/tasks/new')
}

// 處理快速新增任務（從服務組點擊）
const handleQuickAddTask = (context) => {
  quickAddContext.value = context
  quickAddTaskModalVisible.value = true
}

// 處理快速新增任務成功
const handleQuickAddTaskSuccess = async (payload) => {
  try {
    // 如果需要調整後續任務
    if (payload.adjust_subsequent_tasks) {
      const { task_ids, new_due_date } = payload.adjust_subsequent_tasks
      
      // 批量更新後續任務的到期日
      const updatePromises = task_ids.map(async (taskId) => {
        try {
          await useTaskApi().adjustTaskDueDate(taskId, {
            due_date: new_due_date,
            reason: '前置任務新增導致自動延後'
          })
        } catch (err) {
          console.error(`更新任務 ${taskId} 失敗:`, err)
        }
      })
      
      await Promise.all(updatePromises)
    }
    
    // 創建任務
    const { adjust_subsequent_tasks, ...createPayload } = payload
    await taskStore.createTask(createPayload)
    
    showSuccess('任務新增成功' + (payload.adjust_subsequent_tasks ? '，已自動延後後續任務' : ''))
    
    // 刷新任務列表
    await taskStore.fetchTasks()
    
    // 關閉彈窗
    quickAddTaskModalVisible.value = false
    quickAddContext.value = null
  } catch (err) {
    showError(err.message || '新增任務失敗')
  }
}

// ========== 總覽視圖處理函數 ==========

// 處理總覽篩選條件更新
const handleOverviewFiltersUpdate = (filters) => {
  overviewStore.setFilters(filters)
}

// 處理選中月份更新
const handleSelectedMonthsUpdate = (months) => {
  overviewStore.setSelectedMonths(months)
}

// 套用總覽篩選
const handleApplyOverviewFilters = async () => {
  if (selectedMonths.value.length === 0) {
    showWarning('請至少選擇一個月份')
    return
  }
  
  try {
    await overviewStore.fetchTaskOverview()
    showSuccess('載入成功')
  } catch (error) {
    console.error('載入任務總覽失敗:', error)
  }
}

// 全部展開
const handleExpandAll = () => {
  overviewStore.expandAllClients(true)
}

// 全部折疊
const handleCollapseAll = () => {
  overviewStore.expandAllClients(false)
}

// 只展開逾期
const handleExpandOverdue = () => {
  overviewStore.expandOnlyOverdue()
}

// 切換批量操作模式
const handleToggleBatchMode = (enabled) => {
  batchMode.value = enabled
  if (!enabled) {
    overviewStore.clearBatchSelection()
  }
}

// 切換客戶展開/折疊
const handleToggleClient = (clientId) => {
  overviewStore.toggleClientExpanded(clientId)
}

// 切換服務展開/折疊
const handleToggleService = (serviceKey) => {
  overviewStore.toggleServiceExpanded(serviceKey)
}

// 查看任務詳情
const handleViewDetail = (taskId) => {
  router.push(`/tasks/${taskId}`)
}

// 批量選擇相關
const handleTaskSelect = (taskId) => {
  overviewStore.toggleTaskSelection(taskId)
}

const handleClientSelect = (clientId) => {
  overviewStore.toggleClientSelection(clientId)
}

const handleServiceSelect = (serviceKey) => {
  overviewStore.toggleServiceSelection(serviceKey)
}

const handleClearBatchSelection = () => {
  overviewStore.clearBatchSelection()
}

// 批量操作
const handleBatchStatus = () => {
  if (overviewSelectedTaskCount.value === 0) {
    showWarning('請先選擇任務')
    return
  }
  batchStatusModalVisible.value = true
}

const handleBatchStatusSubmit = async (status) => {
  try {
    const selectedTaskIds = Array.from(batchSelectedTasks.value || [])
    await overviewStore.batchUpdateStatus(selectedTaskIds, status)
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
  if (overviewSelectedTaskCount.value === 0) {
    showWarning('請先選擇任務')
    return
  }
  batchDueDateModalVisible.value = true
}

const handleBatchDueDateSubmit = async (dueDate, reason) => {
  try {
    const selectedTaskIds = Array.from(batchSelectedTasks.value || [])
    await overviewStore.batchUpdateDueDate(selectedTaskIds, dueDate, reason)
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
  if (overviewSelectedTaskCount.value === 0) {
    showWarning('請先選擇任務')
    return
  }
  batchAssigneeModalVisible.value = true
}

const handleBatchAssigneeSubmit = async (assigneeId) => {
  try {
    const selectedTaskIds = Array.from(batchSelectedTasks.value || [])
    await overviewStore.batchUpdateAssignee(selectedTaskIds, assigneeId)
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
    await overviewStore.updateTaskStatus(taskId, status)
    showSuccess('更新狀態成功')
  } catch (error) {
    showError(error.message || '更新狀態失敗')
  }
}

const handleAdjustDueDate = (taskId) => {
  const task = overviewStore.tasks.find(t => {
    const id = t.task_id || t.taskId || t.id
    return id === taskId
  })
  selectedTaskForAction.value = task
  adjustDueDateModalVisible.value = true
}

const handleAdjustDueDateSubmit = async (taskId, dueDate, reason) => {
  try {
    await overviewStore.adjustTaskDueDate(taskId, dueDate, reason)
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
  const task = overviewStore.tasks.find(t => {
    const id = t.task_id || t.taskId || t.id
    return id === taskId
  })
  selectedTaskForAction.value = task
  recordOverdueReasonModalVisible.value = true
}

const handleRecordOverdueReasonSubmit = async (taskId, reason) => {
  try {
    await overviewStore.recordOverdueReason(taskId, reason)
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

// 處理關閉錯誤提示
const handleCloseError = () => {
  taskStore.error = null
  overviewStore.clearError()
}

// 初始化
onMounted(async () => {
  // 從 URL 參數判斷預設視圖
  const currentRoute = router.currentRoute.value
  if (currentRoute.query.view === 'overview') {
    currentView.value = 'overview'
    overviewStore.restoreFilters()
    if (selectedMonths.value.length > 0) {
      await loadOverviewData()
    }
  } else {
    // 預設載入列表視圖
    currentView.value = 'list'
    // 設置默認篩選條件：當前年份、全部月份、隱藏已完成
    const currentYear = new Date().getFullYear()
    taskStore.setFilters({
      service_year: currentYear,
      service_month: null,
      hide_completed: true
    })
    await loadListData()
  }
  
  // 設置初始頁面標題
  updatePageTitle()
})
</script>

<style scoped>
:deep(.ant-typography-title) {
  margin-bottom: 0;
}
</style>


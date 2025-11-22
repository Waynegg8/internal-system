<template>
  <div style="padding: 24px">
    <!-- 移除操作欄和視圖切換 Tab，根據需求合併為單一任務列表頁面 -->

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

    <!-- 任務列表（合併後的單一頁面） -->
    <div>
      <!-- 篩選工具欄 -->
      <TaskFilters
        :filters="listFilters"
        :users="allUsers"
        :tags="allTags"
        :services="allServices"
        :selected-task-ids="selectedTaskIds"
        :loading="loading"
        :stats="listStats"
        :stats-loading="statsLoading"
        :list-toolbar-all-selected="listToolbarAllSelected"
        :list-toolbar-indeterminate="listToolbarIndeterminate"
        :list-toolbar-all-expanded="listToolbarAllExpanded"
        @filters-change="handleListFiltersChange"
        @batch-assign="handleBatchAssign"
        @refresh="handleRefresh"
        @stat-click="handleStatClick"
        @select-all-clients="handleSelectAllClients"
        @expand-all-clients="handleExpandAllClients"
        style="margin-bottom: 16px"
      />
      
      <!-- 任務分組列表 -->
      <TaskGroupList
        ref="taskGroupListRef"
        :tasks="listTasks"
        :clients="allClients"
        :loading="loading"
        :selected-task-ids="selectedTaskIds"
        :hide-completed="listFilters.hide_completed"
        @selection-change="handleSelectionChange"
        @view-task="handleViewTask"
        @quick-add-task="handleQuickAddTask"
        @toolbar-state-change="handleToolbarStateChange"
      />
    </div>

    <!-- 總覽視圖已移除，合併為單一任務列表頁面 -->
    
    <!-- 批量分配彈窗 -->
    <BatchAssignTaskModal
      v-model:visible="batchAssignModalVisible"
      :selected-task-ids="selectedTaskIds"
      :users="allUsers"
      @success="handleBatchAssignSuccess"
    />
    
    <!-- 快速新增任務彈窗已移除，改為跳轉到客戶詳情頁 -->

    <!-- 批量狀態彈窗 -->
    <BatchStatusModal
      v-model:visible="batchStatusModalVisible"
      :selected-count="selectedTaskIds.length"
      @submit="handleBatchStatusSubmit"
      @cancel="handleBatchStatusCancel"
    />

    <!-- 批量到期日彈窗 -->
    <BatchDueDateModal
      v-model:visible="batchDueDateModalVisible"
      :selected-count="selectedTaskIds.length"
      @submit="handleBatchDueDateSubmit"
      @cancel="handleBatchDueDateCancel"
    />

    <!-- 批量負責人彈窗 -->
    <BatchAssigneeModal
      v-model:visible="batchAssigneeModalVisible"
      :selected-count="selectedTaskIds.length"
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
// 移除 useTaskOverviewStore，任務總覽已合併為單一任務列表頁面
import { fetchAllServices, fetchServiceItems } from '@/api/services'
import { fetchAllSOPs } from '@/api/sop'
import { useTaskApi } from '@/api/tasks'
import { extractApiArray } from '@/utils/apiHelpers'
import TaskFilters from '@/components/tasks/TaskFilters.vue'
import TaskGroupList from '@/components/tasks/TaskGroupList.vue'
// 移除總覽相關組件導入，任務總覽已合併為單一任務列表頁面
// import TaskOverviewFilters from '@/components/tasks/TaskOverviewFilters.vue'
// import TaskOverviewStats from '@/components/tasks/TaskOverviewStats.vue'
// import TaskOverviewList from '@/components/tasks/TaskOverviewList.vue'
// import BatchActionsBar from '@/components/tasks/BatchActionsBar.vue'
import BatchAssignTaskModal from '@/components/tasks/BatchAssignTaskModal.vue'
// import QuickAddTaskModal from '@/components/tasks/QuickAddTaskModal.vue' // 已移除，改為跳轉到客戶詳情頁
import BatchStatusModal from '@/components/tasks/BatchStatusModal.vue'
import BatchDueDateModal from '@/components/tasks/BatchDueDateModal.vue'
import BatchAssigneeModal from '@/components/tasks/BatchAssigneeModal.vue'
import AdjustDueDateModal from '@/components/tasks/AdjustDueDateModal.vue'
import RecordOverdueReasonModal from '@/components/tasks/RecordOverdueReasonModal.vue'

const router = useRouter()
const route = useRoute()
const taskStore = useTaskStore()
// 移除 overviewStore，任務總覽已合併為單一任務列表頁面
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 設置頁面標題
const updatePageTitle = () => {
  document.title = '任務列表 - 內部管理系統'
}

// 列表視圖相關
const listTasks = computed(() => taskStore.tasks)
const listFilters = computed(() => taskStore.filters)
const selectedTaskIds = computed(() => taskStore.selectedTaskIds)
const allClients = computed(() => taskStore.allClients)
const allUsers = computed(() => taskStore.allUsers)
const allTags = computed(() => taskStore.allTags)
const allSOPs = computed(() => taskStore.allSOPs)
const loading = computed(() => taskStore.loading)
const error = computed(() => taskStore.error)

// 總覽視圖相關已移除，合併為單一任務列表頁面

// 本地狀態
const batchMode = ref(false)
const batchAssignModalVisible = ref(false)
// const quickAddTaskModalVisible = ref(false) // 已移除
// const quickAddContext = ref(null) // 已移除
const allServices = ref([])
const allServiceItems = ref([])
const batchStatusModalVisible = ref(false)
const batchDueDateModalVisible = ref(false)
const batchAssigneeModalVisible = ref(false)
const adjustDueDateModalVisible = ref(false)
const recordOverdueReasonModalVisible = ref(false)
const selectedTaskForAction = ref(null)

// 列表視圖統計數據狀態
const listStats = ref({
  total: 0,
  in_progress: 0,
  completed: 0,
  overdue: 0,
  can_start: 0
})
const statsLoading = ref(false)

// 工具欄狀態
const listToolbarAllSelected = ref(false)
const listToolbarIndeterminate = ref(false)
const listToolbarAllExpanded = ref(false)

// TaskGroupList ref
const taskGroupListRef = ref(null)

// 格式化更新時間
const formatUpdateTime = (time) => {
  if (!time) return '--'
  const date = new Date(time)
  return date.toLocaleTimeString('zh-TW')
}

// 移除視圖切換處理，任務總覽已合併為單一任務列表頁面

// 載入任務列表數據
const loadListData = async () => {
  try {
    await Promise.all([
      taskStore.fetchSupportData(),
      taskStore.fetchTasks(),
      loadServices(),
      loadServiceItems(),
      loadSOPs(),
      loadListStats()
    ])
  } catch (err) {
    console.error('載入列表數據失敗:', err)
  }
}

// 載入服務列表
const loadServices = async () => {
  try {
    const response = await fetchAllServices()
    allServices.value = extractApiArray(response, [])
  } catch (err) {
    console.error('載入服務列表失敗:', err)
  }
}

// 載入服務項目列表
const loadServiceItems = async () => {
  try {
    const response = await fetchServiceItems()
    allServiceItems.value = extractApiArray(response, [])
  } catch (err) {
    console.error('載入服務項目列表失敗:', err)
  }
}

// 載入 SOP 列表
const loadSOPs = async () => {
  try {
    const response = await fetchAllSOPs({ perPage: 500, scope: 'task' })
    allSOPs.value = extractApiArray(response, [])
  } catch (err) {
    console.error('載入 SOP 列表失敗:', err)
  }
}

// 立即刷新
const handleRefresh = async () => {
  try {
    await loadListData()
    showSuccess('刷新成功')
  } catch (error) {
    console.error('刷新失敗:', error)
  }
}

// ========== 列表視圖處理函數 ==========

// 載入列表視圖統計數據
const loadListStats = async () => {
  try {
    statsLoading.value = true
    const filters = listFilters.value
    const params = {}
    
    // 構建查詢參數（與 taskStore.fetchTasks 邏輯保持一致）
    if (filters.q) params.q = filters.q
    if (filters.status) params.status = filters.status
    if (filters.assignee) params.assignee = filters.assignee
    
    // 處理標籤篩選（優先使用多選，否則使用單選）
    if (Array.isArray(filters.tags_multiple) && filters.tags_multiple.length > 0) {
      params.tags = filters.tags_multiple[0]
    } else if (filters.tags) {
      params.tags = filters.tags
    }
    
    // 處理月份區間篩選
    if (filters.service_month_start || filters.service_month_end) {
      if (filters.service_month_start) {
        const startMonth = filters.service_month_start
        if (typeof startMonth === 'string' && /^\d{4}-\d{2}$/.test(startMonth)) {
          const [year, month] = startMonth.split('-')
          params.service_year = year
          params.service_month = month
        }
      }
    } else if (filters.service_year) {
      params.service_year = filters.service_year
      if (filters.service_month) {
        params.service_month = filters.service_month
      }
    }
    
    if (filters.due) params.due = filters.due
    if (filters.hide_completed) params.hide_completed = '1'
    if (filters.can_start !== null && filters.can_start !== undefined) {
      params.can_start = filters.can_start ? 'true' : 'false'
    }
    
    // 調用統計 API
    const taskApi = useTaskApi()
    const stats = await taskApi.getTasksStats(params)
    
    listStats.value = {
      total: stats.total || 0,
      in_progress: stats.in_progress || 0,
      completed: stats.completed || 0,
      overdue: stats.overdue || 0,
      can_start: stats.can_start || 0
    }
  } catch (err) {
    console.error('載入統計數據失敗:', err)
    listStats.value = {
      total: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
      can_start: 0
    }
  } finally {
    statsLoading.value = false
  }
}

// 處理列表篩選條件變化
const handleListFiltersChange = async (filters) => {
  taskStore.setFilters(filters)
  await taskStore.fetchTasks()
  // 篩選條件變更時即時更新統計數據
  await loadListStats()
}

// 處理統計項點擊
const handleStatClick = (statType) => {
  const filters = { ...listFilters.value }
  
  // 根據點擊的統計類型設置對應的篩選條件
  if (statType === 'in_progress') {
    filters.status = 'in_progress'
  } else if (statType === 'completed') {
    filters.status = 'completed'
  } else if (statType === 'overdue') {
    filters.due = 'overdue'
  } else if (statType === 'can_start') {
    filters.can_start = true
  } else if (statType === 'total') {
    // 點擊總任務，清除所有狀態篩選
    filters.status = null
    filters.due = null
    filters.can_start = null
  }
  
  handleListFiltersChange(filters)
}

// 處理工具欄狀態變化
const handleToolbarStateChange = (state) => {
  listToolbarAllSelected.value = state.allSelected
  listToolbarIndeterminate.value = state.indeterminate
  listToolbarAllExpanded.value = state.allExpanded
}

// 處理全選客戶
const handleSelectAllClients = (checked) => {
  if (taskGroupListRef.value) {
    taskGroupListRef.value.handleSelectAll({ target: { checked } })
  }
}

// 處理一鍵展開/收合
const handleExpandAllClients = () => {
  if (taskGroupListRef.value) {
    taskGroupListRef.value.handleExpandAll()
  }
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

// 處理快速新增任務（從服務組點擊）- 根據需求應該跳轉到客戶服務配置頁面
const handleQuickAddTask = (context) => {
  // 根據用戶反饋和 requirements.md，應該跳轉到客戶服務配置頁面，讓用戶在客戶頁設定任務
  // 檢查是否有 clientId 和 clientServiceId
  if (context.clientId && context.clientServiceId) {
    // 跳轉到客戶服務配置頁面
    router.push({
      name: 'ClientServiceConfig',
      params: { 
        clientId: context.clientId,
        clientServiceId: context.clientServiceId 
      }
    })
  } else if (context.clientId) {
    // 如果只有 clientId，跳轉到客戶詳情頁的服務標籤
    router.push({
      name: 'ClientServices',
      params: { id: context.clientId },
      query: context.clientServiceId ? { serviceId: context.clientServiceId } : {}
    })
  } else {
    // 如果沒有 clientId，顯示錯誤
    showError('無法確定客戶資訊，請從客戶頁面設定任務')
  }
}

// 處理快速新增任務成功已移除，改為跳轉到客戶詳情頁

// ========== 總覽視圖處理函數已移除，合併為單一任務列表頁面 ==========

// 處理關閉錯誤提示
const handleCloseError = () => {
  taskStore.error = null
}

// 初始化
onMounted(async () => {
  // 設置默認篩選條件：不限制年份和月份，顯示所有任務，隱藏已完成
  // 確保 service_types 和 tags_multiple 為 undefined，而不是 null 或空數組
  // 使用 undefined 以確保 Ant Design Vue multiple mode 正確顯示 placeholder
  taskStore.setFilters({
    service_year: null,
    service_month: null,
    hide_completed: true,
    service_types: undefined,
    tags_multiple: undefined,
    service_month_start: null,
    service_month_end: null
  })
  await loadListData()
  
  // 設置初始頁面標題
  updatePageTitle()
})
</script>

<style scoped>
:deep(.ant-typography-title) {
  margin-bottom: 0;
}
</style>


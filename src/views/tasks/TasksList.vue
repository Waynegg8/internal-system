<template>
  <div style="padding: 24px">
    <a-card>
      
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
      
      <!-- 篩選工具欄 -->
      <TaskFilters
        :filters="store.filters"
        :users="store.allUsers"
        :tags="store.allTags"
        :services="allServices"
        :current-user="currentUser"
        :selected-task-ids="store.selectedTaskIds"
        @filters-change="handleFiltersChange"
        @batch-assign="handleBatchAssign"
        @add-task="handleAddTask"
      />
      
      <!-- 統計摘要 -->
      <TaskOverviewStats
        :stats="taskStats"
        :loading="statsLoading"
        style="margin-top: 16px; margin-bottom: 16px"
      />
      
      <!-- 批量操作工具欄 -->
      <BatchActionsBar
        :selected-count="store.selectedTaskIds.length"
        @batch-status="handleBatchStatus"
        @batch-due-date="handleBatchDueDate"
        @batch-assignee="handleBatchAssign"
        @clear="handleClearSelection"
        style="margin-top: 16px; margin-bottom: 16px"
      />
      
      <!-- 任務分組列表 -->
      <TaskGroupList
        :tasks="store.tasks"
        :clients="store.allClients"
        :loading="store.loading"
        :selected-task-ids="store.selectedTaskIds"
        :hide-completed="store.filters.hide_completed"
        :current-user="currentUser"
        :my-tasks-filter="store.filters.my_tasks"
        @selection-change="handleSelectionChange"
        @view-task="handleViewTask"
        @quick-add-task="handleQuickAddTask"
      />
    </a-card>
    
    <!-- 批量分配彈窗 -->
    <BatchAssignTaskModal
      v-model:visible="batchAssignModalVisible"
      :selected-task-ids="store.selectedTaskIds"
      :users="store.allUsers"
      @success="handleBatchAssignSuccess"
    />
    
    <!-- 批量更新狀態彈窗 -->
    <BatchStatusModal
      v-model:visible="batchStatusModalVisible"
      :selected-count="store.selectedTaskIds.length"
      @submit="handleBatchStatusSubmit"
      @cancel="handleBatchStatusCancel"
    />
    
    <!-- 批量調整到期日彈窗 -->
    <BatchDueDateModal
      v-model:visible="batchDueDateModalVisible"
      :selected-count="store.selectedTaskIds.length"
      @submit="handleBatchDueDateSubmit"
      @cancel="handleBatchDueDateCancel"
    />
    
    <!-- 快速新增任務彈窗 -->
    <QuickAddTaskModal
      v-model:visible="quickAddTaskModalVisible"
      :clients="store.allClients"
      :services="allServices"
      :service-items="allServiceItems"
      :users="store.allUsers"
      :tasks="store.tasks"
      :sops="allSOPs"
      :quick-add-context="quickAddContext"
      @success="handleQuickAddTaskSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import dayjs from 'dayjs'
import { usePageAlert } from '@/composables/usePageAlert'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import { fetchAllServices, fetchServiceItems } from '@/api/services'
import { fetchAllSOPs } from '@/api/sop'
import { useTaskApi } from '@/api/tasks'
import { extractApiArray } from '@/utils/apiHelpers'
import TaskFilters from '@/components/tasks/TaskFilters.vue'
import TaskGroupList from '@/components/tasks/TaskGroupList.vue'
import TaskOverviewStats from '@/components/tasks/TaskOverviewStats.vue'
import BatchAssignTaskModal from '@/components/tasks/BatchAssignTaskModal.vue'
import BatchActionsBar from '@/components/tasks/BatchActionsBar.vue'
import BatchStatusModal from '@/components/tasks/BatchStatusModal.vue'
import BatchDueDateModal from '@/components/tasks/BatchDueDateModal.vue'
import QuickAddTaskModal from '@/components/tasks/QuickAddTaskModal.vue'

const router = useRouter()
const store = useTaskStore()
const authStore = useAuthStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 從 store 獲取響應式狀態
const { error } = storeToRefs(store)

// 當前用戶
const currentUser = computed(() => authStore.user)

// 本地狀態
const batchAssignModalVisible = ref(false)
const batchStatusModalVisible = ref(false)
const batchDueDateModalVisible = ref(false)
const quickAddTaskModalVisible = ref(false)
const quickAddContext = ref(null)
const allServices = ref([])
const allServiceItems = ref([])
const allSOPs = ref([])

// 統計數據狀態
const taskStats = ref({
  total: 0,
  in_progress: 0,
  completed: 0,
  overdue: 0,
  can_start: 0
})
const statsLoading = ref(false)
const taskApi = useTaskApi()

// 載入數據
const loadData = async () => {
  try {
    await Promise.all([
      store.fetchSupportData(),
      store.fetchTasks(),
      loadServices(),
      loadServiceItems(),
      loadSOPs(),
      loadTaskStats()
    ])
    
    // 檢查是否需要觸發即時生成
    // 如果任務為空且指定了服務月份，嘗試觸發生成（所有用戶都可以觸發）
    const hasServiceMonth = store.filters.service_year && store.filters.service_month
    const hasNoTasks = store.tasks.length === 0
    const isLoggedIn = authStore.user && authStore.user.user_id
    
    // 只在首次載入且滿足條件時觸發，避免重複觸發
    if (isLoggedIn && hasServiceMonth && hasNoTasks && !store.generationTriggered) {
      // 觸發即時生成（異步，不阻塞）
      triggerOnDemandGeneration().catch(err => {
        console.error('觸發即時生成失敗:', err)
      })
    }
  } catch (err) {
    console.error('載入數據失敗:', err)
  }
}

// 觸發即時生成
const triggerOnDemandGeneration = async () => {
  try {
    const params = {
      service_year: store.filters.service_year,
      service_month: store.filters.service_month,
      trigger_generation: '1'
    }
    
    const response = await taskApi.fetchTasks(params)
    const meta = response?.meta || response?.data?.meta
    
    if (meta?.generationStatus === 'triggered') {
      showWarning(meta.message || '已觸發任務生成，請稍後刷新查看任務')
      // 3秒後自動刷新
      setTimeout(() => {
        store.fetchTasks()
      }, 3000)
    }
  } catch (err) {
    console.error('觸發即時生成失敗:', err)
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

// 計算預設日期範圍（客戶端計算）
const calculateDefaultDateRange = async () => {
  try {
    // 獲取所有未完成任務（不應用篩選條件）
    const allTasksResponse = await taskApi.fetchTasks({
      perPage: 10000
      // 不傳 status 參數，獲取所有狀態的任務
    })
    
    // 使用 extractApiArray 處理響應格式
    const tasks = extractApiArray(allTasksResponse, [])
    
    // 找出所有未完成任務的服務月份
    const incompleteMonths = new Set()
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    
    tasks.forEach(task => {
      // 只考慮未完成的任務（狀態不是 completed 或 cancelled）
      if (task.status && task.status !== 'completed' && task.status !== 'cancelled') {
        // 支持兩種字段名格式：serviceMonth（駝峰）或 service_month（下劃線）
        const serviceMonth = task.serviceMonth || task.service_month
        if (serviceMonth && /^\d{4}-\d{2}$/.test(serviceMonth)) {
          incompleteMonths.add(serviceMonth)
        }
      }
    })
    
    if (incompleteMonths.size === 0) {
      // 沒有未完成任務，返回當前月份
      return {
        start_month: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
        end_month: `${currentYear}-${String(currentMonth).padStart(2, '0')}`
      }
    }
    
    // 找出最早的月份
    const sortedMonths = Array.from(incompleteMonths).sort()
    const earliestMonth = sortedMonths[0]
    
    // 結束月份為當前月份
    const endMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    
    return {
      start_month: earliestMonth,
      end_month: endMonth
    }
  } catch (err) {
    console.error('計算預設日期範圍失敗:', err)
    // 如果計算失敗，返回當前月份
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    return {
      start_month: currentMonthStr,
      end_month: currentMonthStr
    }
  }
}

// 獲取預設日期範圍（優先使用 API，失敗則使用客戶端計算）
const getDefaultDateRange = async () => {
  try {
    // 優先調用後端 API
    const result = await taskApi.getDefaultDateRange()
    
    // 驗證返回結果格式
    if (result && result.start_month && result.end_month) {
      // 驗證日期格式（YYYY-MM）
      if (/^\d{4}-\d{2}$/.test(result.start_month) && /^\d{4}-\d{2}$/.test(result.end_month)) {
        return result
      } else {
        console.warn('API 返回的日期格式無效，使用客戶端計算:', result)
      }
    } else {
      console.warn('API 返回的數據不完整，使用客戶端計算:', result)
    }
  } catch (err) {
    // API 調用失敗（404、500 等），使用客戶端計算作為後備方案
    console.log('API 不可用，使用客戶端計算:', err.message || err)
  }
  
  // 使用客戶端計算作為後備方案
  return await calculateDefaultDateRange()
}

// 載入統計數據
const loadTaskStats = async () => {
  statsLoading.value = true
  try {
    // 構建查詢參數，與任務列表篩選條件保持一致
    const queryParams = {}
    
    if (store.filters.q) queryParams.q = store.filters.q
    if (store.filters.status) queryParams.status = store.filters.status
    if (store.filters.assignee) queryParams.assignee = store.filters.assignee
    if (store.filters.tags) queryParams.tags = store.filters.tags
    
    // 處理月份區間篩選（與 fetchTasks 邏輯保持一致）
    if (store.filters.service_month_start || store.filters.service_month_end) {
      if (store.filters.service_month_start) {
        const startMonth = store.filters.service_month_start
        if (typeof startMonth === 'string' && /^\d{4}-\d{2}$/.test(startMonth)) {
          const [year, month] = startMonth.split('-')
          queryParams.service_year = year
          queryParams.service_month = month
        } else if (startMonth && startMonth.format) {
          // dayjs 對象
          queryParams.service_year = startMonth.format('YYYY')
          queryParams.service_month = startMonth.format('MM')
        }
      }
    } else {
      // 使用舊的年份和月份篩選（向後兼容）
      if (store.filters.service_year) queryParams.service_year = store.filters.service_year
      if (store.filters.service_month) queryParams.service_month = store.filters.service_month
    }
    
    // 處理標籤篩選（優先使用多選，否則使用單選）
    if (Array.isArray(store.filters.tags_multiple) && store.filters.tags_multiple.length > 0) {
      queryParams.tags = store.filters.tags_multiple[0]
    } else if (store.filters.tags) {
      queryParams.tags = store.filters.tags
    }
    
    // 處理是否可開始篩選
    if (store.filters.can_start !== null && store.filters.can_start !== undefined) {
      queryParams.can_start = store.filters.can_start ? 'true' : 'false'
    }
    
    // 處理「我的任務」篩選
    if (store.filters.my_tasks && currentUser.value) {
      const userId = currentUser.value.id || currentUser.value.userId || currentUser.value.user_id
      if (userId && !store.filters.assignee) {
        queryParams.assignee = userId
      }
    }
    
    if (store.filters.due) queryParams.due = store.filters.due
    if (store.filters.hide_completed) queryParams.hide_completed = '1'
    
    const stats = await taskApi.getTasksStats(queryParams)
    taskStats.value = {
      total: stats.total || 0,
      in_progress: stats.in_progress || 0,
      completed: stats.completed || 0,
      overdue: stats.overdue || 0,
      can_start: stats.can_start || 0
    }
  } catch (err) {
    console.error('載入統計數據失敗:', err)
    // 不顯示錯誤，保持統計數據為 0
  } finally {
    statsLoading.value = false
  }
}

// 處理篩選條件變化
const handleFiltersChange = (filters) => {
  // 處理「我的任務」篩選：如果啟用且沒有指定負責人，自動設置為當前用戶
  if (filters.my_tasks && currentUser.value && !filters.assignee) {
    const userId = currentUser.value.id || currentUser.value.userId || currentUser.value.user_id
    if (userId) {
      filters.assignee = userId
    }
  }
  
  store.setFilters(filters)
  store.fetchTasks()
  // 篩選條件變更時即時更新統計數據
  loadTaskStats()
}

// 處理任務選擇變化
const handleSelectionChange = (selectedIds) => {
  store.setSelectedTaskIds(selectedIds)
}

// 處理查看任務
const handleViewTask = (taskId) => {
  router.push(`/tasks/${taskId}`)
}

// 處理清除選擇
const handleClearSelection = () => {
  store.clearSelectedTaskIds()
}

// 處理批量分配
const handleBatchAssign = () => {
  if (store.selectedTaskIds.length === 0) {
    showWarning('請先選擇要分配的任務')
    return
  }
  batchAssignModalVisible.value = true
}

// 處理批量分配成功
const handleBatchAssignSuccess = async (assigneeUserId) => {
  try {
    const taskApi = useTaskApi()
    const result = await taskApi.batchUpdateTasks({
      task_ids: store.selectedTaskIds,
      operation: 'assign_assignee',
      assignee_user_id: assigneeUserId
    })
    
    const successCount = result.success || 0
    const failedCount = result.failed || 0
    const totalCount = result.total || store.selectedTaskIds.length
    
    // 處理結果
    if (failedCount === 0) {
      // 全部成功
      showSuccess(`成功分配 ${successCount} 個任務的負責人`)
    } else if (successCount > 0) {
      // 部分成功
      const failedDetails = result.details?.failed || []
      let errorMessage = `部分成功：${successCount} 個任務已分配，${failedCount} 個任務分配失敗`
      
      // 如果有詳細錯誤信息，顯示前幾個
      if (failedDetails.length > 0) {
        const errorMessages = failedDetails.slice(0, 3).map(f => f.error || '未知錯誤').join('、')
        errorMessage += `\n失敗原因：${errorMessages}${failedDetails.length > 3 ? '...' : ''}`
      }
      
      showWarning(errorMessage)
    } else {
      // 全部失敗
      const failedDetails = result.details?.failed || []
      let errorMessage = `批量分配失敗：${failedCount} 個任務均無法分配`
      
      // 如果有詳細錯誤信息，顯示前幾個
      if (failedDetails.length > 0) {
        const errorMessages = failedDetails.slice(0, 3).map(f => f.error || '未知錯誤').join('、')
        errorMessage += `\n失敗原因：${errorMessages}${failedDetails.length > 3 ? '...' : ''}`
      }
      
      showError(errorMessage)
      // 如果全部失敗，不關閉彈窗，讓用戶可以重試
      return
    }
    
    // 只有成功或部分成功時才清除選擇和關閉彈窗
    if (successCount > 0) {
      store.clearSelectedTaskIds()
      batchAssignModalVisible.value = false
      // 刷新任務列表和統計數據
      await store.fetchTasks()
      await loadTaskStats()
    }
  } catch (err) {
    // API 調用失敗（網絡錯誤等）
    const errorMessage = err.response?.data?.message || err.message || '批量分配失敗'
    showError(errorMessage)
    console.error('批量分配失敗:', err)
  }
}

// 處理批量更新狀態
const handleBatchStatus = () => {
  if (store.selectedTaskIds.length === 0) {
    showWarning('請先選擇要更新狀態的任務')
    return
  }
  batchStatusModalVisible.value = true
}

// 處理批量更新狀態提交
const handleBatchStatusSubmit = async (status) => {
  try {
    const taskApi = useTaskApi()
    const result = await taskApi.batchUpdateTasks({
      task_ids: store.selectedTaskIds,
      operation: 'update_status',
      status: status
    })
    
    const successCount = result.success || 0
    const failedCount = result.failed || 0
    const totalCount = result.total || store.selectedTaskIds.length
    
    // 處理結果
    if (failedCount === 0) {
      // 全部成功
      showSuccess(`成功更新 ${successCount} 個任務的狀態`)
    } else if (successCount > 0) {
      // 部分成功
      const failedDetails = result.details?.failed || []
      let errorMessage = `部分成功：${successCount} 個任務已更新，${failedCount} 個任務更新失敗`
      
      // 如果有詳細錯誤信息，顯示前幾個
      if (failedDetails.length > 0) {
        const errorMessages = failedDetails.slice(0, 3).map(f => f.error || '未知錯誤').join('、')
        errorMessage += `\n失敗原因：${errorMessages}${failedDetails.length > 3 ? '...' : ''}`
      }
      
      showWarning(errorMessage)
    } else {
      // 全部失敗
      const failedDetails = result.details?.failed || []
      let errorMessage = `批量更新狀態失敗：${failedCount} 個任務均無法更新`
      
      // 如果有詳細錯誤信息，顯示前幾個
      if (failedDetails.length > 0) {
        const errorMessages = failedDetails.slice(0, 3).map(f => f.error || '未知錯誤').join('、')
        errorMessage += `\n失敗原因：${errorMessages}${failedDetails.length > 3 ? '...' : ''}`
      }
      
      showError(errorMessage)
      // 如果全部失敗，不關閉彈窗，讓用戶可以重試
      return
    }
    
    // 只有成功或部分成功時才清除選擇和關閉彈窗
    if (successCount > 0) {
      store.clearSelectedTaskIds()
      batchStatusModalVisible.value = false
      // 刷新任務列表和統計數據
      await store.fetchTasks()
      await loadTaskStats()
    }
  } catch (err) {
    // API 調用失敗（網絡錯誤等）
    const errorMessage = err.response?.data?.message || err.message || '批量更新狀態失敗'
    showError(errorMessage)
    console.error('批量更新狀態失敗:', err)
    // 網絡錯誤時關閉彈窗
    batchStatusModalVisible.value = false
  }
}

// 處理批量更新狀態取消
const handleBatchStatusCancel = () => {
  batchStatusModalVisible.value = false
}

// 處理批量調整到期日
const handleBatchDueDate = () => {
  if (store.selectedTaskIds.length === 0) {
    showWarning('請先選擇要調整到期日的任務')
    return
  }
  batchDueDateModalVisible.value = true
}

// 處理批量調整到期日提交
const handleBatchDueDateSubmit = async (dueDate, reason) => {
  try {
    const taskApi = useTaskApi()
    const result = await taskApi.batchUpdateTasks({
      task_ids: store.selectedTaskIds,
      operation: 'adjust_due_date',
      due_date: dueDate,
      reason: reason || '批量調整到期日'
    })
    
    const successCount = result.success || 0
    const failedCount = result.failed || 0
    const totalCount = result.total || store.selectedTaskIds.length
    
    // 處理結果
    if (failedCount === 0) {
      // 全部成功
      showSuccess(`成功調整 ${successCount} 個任務的到期日`)
    } else if (successCount > 0) {
      // 部分成功
      const failedDetails = result.details?.failed || []
      let errorMessage = `部分成功：${successCount} 個任務已調整，${failedCount} 個任務調整失敗`
      
      // 如果有詳細錯誤信息，顯示前幾個
      if (failedDetails.length > 0) {
        const errorMessages = failedDetails.slice(0, 3).map(f => f.error || '未知錯誤').join('、')
        errorMessage += `\n失敗原因：${errorMessages}${failedDetails.length > 3 ? '...' : ''}`
      }
      
      showWarning(errorMessage)
    } else {
      // 全部失敗
      const failedDetails = result.details?.failed || []
      let errorMessage = `批量調整到期日失敗：${failedCount} 個任務均無法調整`
      
      // 如果有詳細錯誤信息，顯示前幾個
      if (failedDetails.length > 0) {
        const errorMessages = failedDetails.slice(0, 3).map(f => f.error || '未知錯誤').join('、')
        errorMessage += `\n失敗原因：${errorMessages}${failedDetails.length > 3 ? '...' : ''}`
      }
      
      showError(errorMessage)
      // 如果全部失敗，不關閉彈窗，讓用戶可以重試
      return
    }
    
    // 只有成功或部分成功時才清除選擇和關閉彈窗
    if (successCount > 0) {
      store.clearSelectedTaskIds()
      batchDueDateModalVisible.value = false
      // 刷新任務列表和統計數據
      await store.fetchTasks()
      await loadTaskStats()
    }
  } catch (err) {
    // API 調用失敗（網絡錯誤等）
    const errorMessage = err.response?.data?.message || err.message || '批量調整到期日失敗'
    showError(errorMessage)
    console.error('批量調整到期日失敗:', err)
    // 網絡錯誤時關閉彈窗
    batchDueDateModalVisible.value = false
  }
}

// 處理批量調整到期日取消
const handleBatchDueDateCancel = () => {
  batchDueDateModalVisible.value = false
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
    await store.createTask(createPayload)
    
    showSuccess('任務新增成功' + (payload.adjust_subsequent_tasks ? '，已自動延後後續任務' : ''))
    
    // 刷新任務列表和統計數據
    await Promise.all([
      store.fetchTasks(),
      loadTaskStats()
    ])
    
    // 關閉彈窗
    quickAddTaskModalVisible.value = false
    quickAddContext.value = null
  } catch (err) {
    showError(err.message || '新增任務失敗')
  }
}

// 處理關閉錯誤提示
const handleCloseError = () => {
  store.error = null
}

// 初始化預設篩選條件
const initializeDefaultFilters = async () => {
  try {
    // 獲取預設日期範圍
    const dateRange = await getDefaultDateRange()
    
    if (dateRange.start_month && dateRange.end_month) {
      // 使用 dayjs 將字符串轉換為 dayjs 對象
      const startMonth = dayjs(dateRange.start_month)
      const endMonth = dayjs(dateRange.end_month)
      
      // 設置月份區間篩選條件
      store.setFilters({
        service_month_start: startMonth,
        service_month_end: endMonth,
        hide_completed: true
      })
    } else {
      // 如果沒有獲取到日期範圍，使用當前月份
      const currentMonth = dayjs()
      store.setFilters({
        service_month_start: currentMonth,
        service_month_end: currentMonth,
        hide_completed: true
      })
    }
  } catch (err) {
    console.error('初始化預設篩選條件失敗:', err)
    // 失敗時使用當前月份作為默認值
    const currentMonth = dayjs()
    store.setFilters({
      service_month_start: currentMonth,
      service_month_end: currentMonth,
      hide_completed: true
    })
  }
}

// 生命週期
onMounted(async () => {
  // 先初始化預設篩選條件
  await initializeDefaultFilters()
  
  // 然後載入數據（會使用已設置的篩選條件）
  loadData()
})
</script>


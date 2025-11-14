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
        :selected-task-ids="store.selectedTaskIds"
        @filters-change="handleFiltersChange"
        @batch-assign="handleBatchAssign"
        @add-task="handleAddTask"
      />
      
      <!-- 任務分組列表 -->
      <TaskGroupList
        :tasks="store.tasks"
        :clients="store.allClients"
        :loading="store.loading"
        :selected-task-ids="store.selectedTaskIds"
        :hide-completed="store.filters.hide_completed"
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { useTaskStore } from '@/stores/tasks'
import { fetchAllServices, fetchServiceItems } from '@/api/services'
import { fetchAllSOPs } from '@/api/sop'
import { useTaskApi } from '@/api/tasks'
import TaskFilters from '@/components/tasks/TaskFilters.vue'
import TaskGroupList from '@/components/tasks/TaskGroupList.vue'
import BatchAssignTaskModal from '@/components/tasks/BatchAssignTaskModal.vue'
import QuickAddTaskModal from '@/components/tasks/QuickAddTaskModal.vue'

const router = useRouter()
const store = useTaskStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 從 store 獲取響應式狀態
const { error } = storeToRefs(store)

// 本地狀態
const batchAssignModalVisible = ref(false)
const quickAddTaskModalVisible = ref(false)
const quickAddContext = ref(null)
const allServices = ref([])
const allServiceItems = ref([])
const allSOPs = ref([])

// 載入數據
const loadData = async () => {
  try {
    await Promise.all([
      store.fetchSupportData(),
      store.fetchTasks(),
      loadServices(),
      loadServiceItems(),
      loadSOPs()
    ])
  } catch (err) {
    console.error('載入數據失敗:', err)
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

// 處理篩選條件變化
const handleFiltersChange = (filters) => {
  store.setFilters(filters)
  store.fetchTasks()
}

// 處理任務選擇變化
const handleSelectionChange = (selectedIds) => {
  store.setSelectedTaskIds(selectedIds)
}

// 處理查看任務
const handleViewTask = (taskId) => {
  router.push(`/tasks/${taskId}`)
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
    await store.batchUpdateTaskAssignee(store.selectedTaskIds, assigneeUserId)
    showSuccess('批量分配成功')
    store.clearSelectedTaskIds()
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
    await store.createTask(createPayload)
    
    showSuccess('任務新增成功' + (payload.adjust_subsequent_tasks ? '，已自動延後後續任務' : ''))
    
    // 刷新任務列表
    await store.fetchTasks()
    
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

// 生命週期
onMounted(() => {
  // 設置默認篩選條件：當前年份、全部月份、隱藏已完成
  const currentYear = new Date().getFullYear()
  store.setFilters({
    service_year: currentYear,
    service_month: null,
    hide_completed: true
  })
  
  loadData()
})
</script>


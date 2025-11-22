<template>
  <div style="padding: 24px">
    <!-- 返回按鈕 -->
    <a-button type="link" @click="handleBack" style="margin-bottom: 16px; padding: 0">
      <template #icon>
        <ArrowLeftOutlined />
      </template>
      返回任務列表
    </a-button>

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
    
    <!-- 加載狀態 -->
    <a-spin :spinning="loading">
      <div v-if="task">
        <!-- 任務基本信息 -->
        <TaskBasicInfo
          :task="task"
          :users="store.allUsers"
          @update-status="handleUpdateStatus"
          @view-history="handleViewHistory"
          @update-assignee="handleUpdateAssignee"
        />

        <!-- 任務階段 -->
        <TaskStagesPanel
          :stages="taskStages"
          :loading="loading || store.stageUpdating"
        />

        <!-- 關聯的 SOP -->
        <TaskSOPList
          :task-id="taskId"
          :sops="store.taskSOPs"
          :all-sops="store.allSOPs"
          :loading="loading"
          @update="handleSOPUpdate"
        />

        <!-- 任務附件（任務文檔） -->
        <TaskAttachments
          :task-id="taskId"
          @attachment-click="handleAttachmentClick"
        />
      </div>
    </a-spin>

    <!-- 更新狀態說明彈窗 -->
    <UpdateStatusModal
      v-model:visible="updateStatusModalVisible"
      :task="task"
      @success="handleUpdateStatusSuccess"
    />

    <!-- 更新階段彈窗 -->
    <TaskStageUpdateModal
      v-model:open="stageModalVisible"
      :stage="selectedStage"
      :submitting="store.stageUpdating"
      @submit="handleStageSubmit"
    />

    <!-- 變更歷史彈窗 -->
    <AdjustmentHistoryModal
      v-model:visible="adjustmentHistoryModalVisible"
      :task-id="taskId"
      :loading="loading"
    />

    <!-- 階段同步確認彈窗 -->
    <StageSyncConfirmModal
      v-model:open="stageSyncConfirmVisible"
      :next-stage="pendingSyncStage"
      :confirming="store.stageUpdating"
      @confirm="handleStageSyncConfirm"
      @cancel="handleStageSyncCancel"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useTaskStore } from '@/stores/tasks'
import TaskBasicInfo from '@/components/tasks/TaskBasicInfo.vue'
import TaskSOPList from '@/components/tasks/TaskSOPList.vue'
import TaskAttachments from '@/components/tasks/TaskAttachments.vue'
import TaskStagesPanel from '@/components/tasks/TaskStagesPanel.vue'
import TaskStageUpdateModal from '@/components/tasks/TaskStageUpdateModal.vue'
import UpdateStatusModal from '@/components/tasks/UpdateStatusModal.vue'
import AdjustmentHistoryModal from '@/components/tasks/AdjustmentHistoryModal.vue'
import StageSyncConfirmModal from '@/components/tasks/StageSyncConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const store = useTaskStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { error, loading, currentTask: task } = storeToRefs(store)

// 獲取任務ID
const taskId = ref(null)

// 本地狀態
const updateStatusModalVisible = ref(false)
const adjustmentHistoryModalVisible = ref(false)
const stageModalVisible = ref(false)
const selectedStage = ref(null)
const stageSyncConfirmVisible = ref(false)
const pendingSyncStage = ref(null)
const pendingStageUpdate = ref(null) // 保存待確認的階段更新數據

// 載入數據
const loadData = async () => {
  if (!taskId.value) return

  try {
    await Promise.all([
      store.fetchSupportData(),
      store.fetchTaskDetail(taskId.value),
      store.fetchTaskSOPs(taskId.value),
    ])
  } catch (err) {
    // 處理 404 錯誤
    if (err.response?.status === 404 || err.message?.includes('404')) {
      showError('任務不存在')
      router.push('/tasks')
      return
    }
    console.error('載入數據失敗:', err)
  }
}

// 處理返回
const handleBack = () => {
  router.push('/tasks')
}

// 處理關閉錯誤提示
const handleCloseError = () => {
  store.error = null
}

// 處理更新狀態說明
const handleUpdateStatus = () => {
  updateStatusModalVisible.value = true
}

// 處理更新狀態成功
const handleUpdateStatusSuccess = async () => {
  if (taskId.value) {
    await store.fetchTaskDetail(taskId.value)
  }
  showSuccess('狀態更新成功')
}

// 處理查看變更歷史
const handleViewHistory = () => {
  adjustmentHistoryModalVisible.value = true
}

// 處理更新負責人
const handleUpdateAssignee = async ({ taskId: id, assigneeUserId }) => {
  try {
    await store.updateTaskAssignee(id, assigneeUserId)
    showSuccess('更新負責人成功')
  } catch (err) {
    showError(err.message || '更新負責人失敗')
  }
}

// 處理 SOP 更新
const handleSOPUpdate = async () => {
  if (taskId.value) {
    await store.fetchTaskSOPs(taskId.value)
  }
}


// 處理附件點擊
const handleAttachmentClick = (attachment) => {
  // 可以在這裡處理附件點擊事件，例如記錄日誌等
  console.log('附件被點擊:', attachment)
}

// 處理編輯階段
const taskStages = computed(() => store.currentTaskStages || [])

const handleEditStage = (stage) => {
  selectedStage.value = stage
  stageModalVisible.value = true
}

const handleStageSubmit = async ({ stageId, status, delay_days, notes, confirm_sync }) => {
  if (!taskId.value || !stageId) return
  try {
    await store.updateTaskStage(taskId.value, stageId, {
      status,
      delay_days,
      notes,
      confirm_sync
    })
    showSuccess('階段已更新')
    stageModalVisible.value = false
    stageSyncConfirmVisible.value = false
    pendingSyncStage.value = null
    pendingStageUpdate.value = null
  } catch (err) {
    // 檢查是否需要確認階段同步
    const errorResponse = err.response?.data || err
    const statusCode = err.response?.status || err.status
    
    // 檢查是否是 428 狀態碼或 SYNC_CONFIRMATION_REQUIRED 錯誤碼
    if (statusCode === 428 || errorResponse?.code === 'SYNC_CONFIRMATION_REQUIRED' || errorResponse?.errors?.requires_confirmation) {
      // 需要確認，顯示確認對話框
      const nextStageInfo = errorResponse?.errors?.next_stage || errorResponse?.data?.next_stage
      if (nextStageInfo) {
        pendingSyncStage.value = {
          stage_id: nextStageInfo.stage_id,
          stage_name: nextStageInfo.stage_name,
          stage_order: nextStageInfo.stage_order,
          message: errorResponse?.errors?.message || errorResponse?.message || '需要確認階段同步'
        }
        pendingStageUpdate.value = { stageId, status, delay_days, notes }
        stageSyncConfirmVisible.value = true
        // 不關閉階段更新彈窗，等待用戶確認
        return
      }
    }
    // 其他錯誤
    showError(err.message || store.stageError || '更新階段失敗')
  }
}

// 處理階段同步確認
const handleStageSyncConfirm = async () => {
  if (!pendingStageUpdate.value) return
  
  try {
    await handleStageSubmit({
      ...pendingStageUpdate.value,
      confirm_sync: true
    })
  } catch (err) {
    showError(err.message || store.stageError || '階段同步失敗')
  }
}

// 處理階段同步取消
const handleStageSyncCancel = () => {
  pendingSyncStage.value = null
  pendingStageUpdate.value = null
  stageSyncConfirmVisible.value = false
  // 關閉階段更新彈窗
  stageModalVisible.value = false
}

// 監聽路由參數變化
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      taskId.value = newId
      loadData()
    }
  },
  { immediate: true }
)

// 生命週期
onMounted(() => {
  taskId.value = route.params.id
  if (!taskId.value) {
    showError('缺少任務ID')
    router.push('/tasks')
    return
  }
  loadData()
})
</script>


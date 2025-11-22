<template>
  <a-card title="基本信息" style="margin-bottom: 24px">
    <a-descriptions :column="2" bordered>
      <a-descriptions-item label="任務名稱" :span="2">
        {{ task.task_name || task.taskName || '-' }}
      </a-descriptions-item>

      <a-descriptions-item label="狀態">
        <a-tag :color="getStatusColor(task.status)">
          {{ getStatusText(task.status) }}
        </a-tag>
        <a-typography-text type="secondary" :style="{ fontSize: '12px', marginLeft: '8px' }">
          ✋ 狀態為唯讀，請使用下方按鈕更新
        </a-typography-text>
      </a-descriptions-item>

      <a-descriptions-item label="負責人">
        <a-select
          :value="task.assignee_user_id || task.assigneeUserId"
          :options="userOptions"
          placeholder="選擇負責人"
          style="width: 100%"
          @change="handleAssigneeChange"
        />
      </a-descriptions-item>

      <a-descriptions-item label="客戶">
        <a-button
          v-if="task.client_id || task.clientId"
          type="link"
          @click="handleViewClient"
        >
          {{ task.client_name || task.clientName || '-' }}
        </a-button>
        <span v-else>-</span>
      </a-descriptions-item>

      <a-descriptions-item label="服務">
        {{ task.service_name || task.serviceName || '-' }}
      </a-descriptions-item>

      <a-descriptions-item label="前置任務">
        <span v-if="task.prerequisite_task_name || task.prerequisiteTaskName">
          {{ task.prerequisite_task_name || task.prerequisiteTaskName }}
        </span>
        <span v-else style="color: #9ca3af">無前置任務</span>
        <a-typography-text type="secondary" :style="{ fontSize: '12px', display: 'block', marginTop: '4px' }">
          此任務依賴的前置任務
        </a-typography-text>
      </a-descriptions-item>

      <a-descriptions-item label="進度">
        <div style="display: flex; align-items: center; gap: 12px">
          <a-progress
            :percent="progress"
            :format="() => `${completedStages}/${totalStages}`"
            style="flex: 1"
          />
        </div>
      </a-descriptions-item>

      <a-descriptions-item label="到期日">
        {{ formatDate(task.due_date || task.dueDate) || '-' }}
        <div v-if="task.due_date_adjusted || task.dueDateAdjusted" style="margin-top: 4px">
          <a-badge
            :count="`已調整 ${task.adjustment_count || task.adjustmentCount || 1} 次`"
            :number-style="{ backgroundColor: '#fef3c7', color: '#92400e' }"
          />
          <a-typography-text
            v-if="task.last_adjustment_date || task.lastAdjustmentDate"
            type="secondary"
            :style="{ fontSize: '12px', marginLeft: '8px' }"
          >
            最後調整：{{ formatDate(task.last_adjustment_date || task.lastAdjustmentDate) }}
          </a-typography-text>
        </div>
      </a-descriptions-item>

      <a-descriptions-item label="原始到期日">
        {{ formatDate(task.original_due_date || task.originalDueDate || task.due_date || task.dueDate) || '-' }}
        <a-typography-text type="secondary" :style="{ fontSize: '12px', display: 'block', marginTop: '4px' }">
          系統最初設定的到期日
        </a-typography-text>
      </a-descriptions-item>

      <a-descriptions-item label="最新狀態說明" :span="2">
        <a-typography-paragraph
          :style="{
            background: '#f9fafb',
            padding: '8px 12px',
            borderRadius: '4px',
            margin: 0,
            minHeight: '60px'
          }"
        >
          {{ task.status_note || task.statusNote || '尚未填寫狀態說明' }}
        </a-typography-paragraph>
        <a-typography-text type="secondary" :style="{ fontSize: '12px', display: 'block', marginTop: '4px' }">
          此內容透過「更新狀態說明」按鈕來更新
        </a-typography-text>
      </a-descriptions-item>
    </a-descriptions>

    <!-- 阻礙原因 -->
    <a-alert
      v-if="task.status === 'blocked' && (task.blocker_reason || task.blockerReason)"
      type="error"
      :message="'阻礙原因'"
      style="margin-top: 16px"
    >
      <template #description>
        {{ task.blocker_reason || task.blockerReason }}
      </template>
    </a-alert>

    <!-- 逾期原因 -->
    <a-alert
      v-if="task.overdue_reason || task.overdueReason"
      type="warning"
      :message="'逾期原因'"
      style="margin-top: 16px"
    >
      <template #description>
        {{ task.overdue_reason || task.overdueReason }}
      </template>
    </a-alert>

    <!-- 操作按鈕 -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px">
      <a-button type="primary" @click="handleUpdateStatus">
        更新狀態說明
      </a-button>
      <a-button @click="handleViewHistory">
        查看變更歷史
      </a-button>
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate, getTaskStatusText } from '@/utils/formatters'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  users: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update-status', 'view-history', 'update-assignee'])

const router = useRouter()

// 用戶選項
const userOptions = computed(() => {
  return props.users.map(user => ({
    label: user.name || user.userName,
    value: user.id || user.userId || user.user_id
  }))
})

// 進度計算
const completedStages = computed(() => {
  return props.task.completed_stages || props.task.completedStages || 0
})

const totalStages = computed(() => {
  return props.task.total_stages || props.task.totalStages || 0
})

const progress = computed(() => {
  if (totalStages.value > 0) {
    return Math.round((completedStages.value / totalStages.value) * 100)
  }
  // 如果沒有階段，根據狀態計算
  if (props.task.status === 'completed') {
    return 100
  }
  return 0
})

// 獲取狀態文字
const getStatusText = (status) => {
  return getTaskStatusText(status) || status
}

// 獲取狀態顏色
const getStatusColor = (status) => {
  const colorMap = {
    pending: 'processing',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'default',
    blocked: 'error'
  }
  return colorMap[status] || 'default'
}

// 處理負責人變更
const handleAssigneeChange = (value) => {
  const taskId = props.task.id || props.task.taskId || props.task.task_id
  emit('update-assignee', { taskId, assigneeUserId: value })
}

// 處理查看客戶
const handleViewClient = () => {
  const clientId = props.task.client_id || props.task.clientId
  if (clientId) {
    router.push(`/clients/${clientId}`)
  }
}

// 處理更新狀態說明
const handleUpdateStatus = () => {
  emit('update-status')
}

// 處理查看變更歷史
const handleViewHistory = () => {
  emit('view-history')
}
</script>


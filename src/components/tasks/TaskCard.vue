<template>
  <a-card
    :class="cardClass"
    :style="cardStyle"
    size="small"
    style="margin-bottom: 8px"
  >
    <div style="display: flex; justify-content: space-between; align-items: start">
      <div style="flex: 1">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap">
          <a-checkbox
            v-if="batchMode"
            :checked="isSelected"
            @change="handleSelect"
            @click.stop
          />
          
          <TaskStatusDropdown
            :task="task"
            @status-change="handleStatusChange"
          />
          
          <strong style="font-size: 15px">{{ taskName }}</strong>
          
          <a-tag :color="sourceColor">
            {{ sourceText }}
          </a-tag>
          
          <a-tag v-if="isOverdue" color="red">
            已逾期
          </a-tag>
        </div>

        <a-descriptions :column="2" size="small" :bordered="false">
          <a-descriptions-item label="負責人">
            <strong>{{ assigneeName || '未指派' }}</strong>
          </a-descriptions-item>
          <a-descriptions-item label="到期日">
            <strong>{{ dueDate || '-' }}</strong>
          </a-descriptions-item>
          <a-descriptions-item v-if="isOverdue" label="逾期天數">
            <span style="color: #ef4444">{{ overdueDays }} 天</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="hasProgress" label="進度">
            <strong>{{ completedStages }}/{{ totalStages }} 階段</strong>
          </a-descriptions-item>
          <a-descriptions-item label="任務ID">
            {{ taskId }}
          </a-descriptions-item>
        </a-descriptions>

        <div v-if="notes" style="margin-top: 8px; font-size: 13px; color: #6b7280">
          {{ notes }}
        </div>

        <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap">
          <a-button size="small" type="primary" @click="handleViewDetail">
            查看詳情
          </a-button>
          <a-button size="small" @click="handleAdjustDueDate">
            調整到期日
          </a-button>
          <a-button v-if="isOverdue" size="small" danger @click="handleRecordOverdueReason">
            記錄逾期原因
          </a-button>
        </div>
      </div>
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { calculateOverdueDays } from '@/utils/date'
import TaskStatusDropdown from './TaskStatusDropdown.vue'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  batchMode: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['view-detail', 'select', 'status-change', 'adjust-due-date', 'record-overdue-reason'])

const router = useRouter()

// 任務信息
const taskId = computed(() => {
  return props.task.task_id || props.task.taskId || props.task.id
})

const taskName = computed(() => {
  return props.task.task_name || props.task.taskName || props.task.name || '未命名任務'
})

const status = computed(() => {
  return props.task.status || props.task.task_status || 'pending'
})

const statusText = computed(() => {
  const statusMap = {
    pending: '待處理',
    in_progress: '進行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status.value] || status.value
})

const statusColor = computed(() => {
  const colorMap = {
    pending: 'orange',
    in_progress: 'blue',
    completed: 'green',
    cancelled: 'default'
  }
  return colorMap[status.value] || 'default'
})

const isAuto = computed(() => {
  return !!(props.task.component_id || props.task.componentId)
})

const sourceText = computed(() => {
  return isAuto.value ? '自動生成' : '手動建立'
})

const sourceColor = computed(() => {
  return isAuto.value ? 'blue' : 'green'
})

const isOverdue = computed(() => {
  return !!(props.task.is_overdue || props.task.isOverdue)
})

const overdueDays = computed(() => {
  const dueDate = props.task.due_date || props.task.dueDate
  if (!dueDate) return 0
  return calculateOverdueDays(dueDate)
})

const assigneeName = computed(() => {
  return props.task.assignee_name || props.task.assigneeName || props.task.assignee?.name
})

const dueDate = computed(() => {
  return props.task.due_date || props.task.dueDate
})

const totalStages = computed(() => {
  return props.task.total_stages || props.task.totalStages || 0
})

const completedStages = computed(() => {
  return props.task.completed_stages || props.task.completedStages || 0
})

const hasProgress = computed(() => {
  return totalStages.value > 0
})

const notes = computed(() => {
  return props.task.notes || props.task.note || props.task.description
})

// 卡片樣式
const cardClass = computed(() => {
  const classes = []
  if (isOverdue.value) {
    classes.push('overdue')
  } else if (isAuto.value) {
    classes.push('auto-generated')
  } else {
    classes.push('manual-created')
  }
  return classes.join(' ')
})

const cardStyle = computed(() => {
  const style = {}
  if (isOverdue.value) {
    style.borderLeft = '4px solid #ef4444'
    style.backgroundColor = '#fef2f2'
  } else if (isAuto.value) {
    style.borderLeft = '4px solid #3b82f6'
    style.backgroundColor = '#f0f9ff'
  } else {
    style.borderLeft = '4px solid #10b981'
    style.backgroundColor = '#f0fdf4'
  }
  return style
})

const isSelected = computed(() => {
  return props.selected
})

// 事件處理
const handleViewDetail = () => {
  emit('view-detail', taskId.value)
  router.push(`/tasks/${taskId.value}`)
}

const handleSelect = (e) => {
  emit('select', e.target.checked)
}

const handleStatusChange = (taskId, status) => {
  emit('status-change', taskId, status)
}

const handleAdjustDueDate = () => {
  emit('adjust-due-date', taskId.value)
}

const handleRecordOverdueReason = () => {
  emit('record-overdue-reason', taskId.value)
}
</script>

<style scoped>
:deep(.ant-card-body) {
  padding: 12px;
}
</style>


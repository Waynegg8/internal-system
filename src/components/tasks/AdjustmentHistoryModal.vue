<template>
  <a-modal
    v-model:visible="modalVisible"
    title="變更歷史"
    :width="650"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <a-empty v-if="!loading && historyList.length === 0" description="尚無變更歷史" />

      <a-timeline v-else>
        <a-timeline-item
          v-for="(item, index) in historyList"
          :key="index"
          :color="getTimelineColor(item.type)"
        >
          <template #dot>
            <component :is="getTimelineIcon(item.type)" />
          </template>

          <!-- 到期日調整記錄 -->
          <div v-if="item.type === 'due_date_adjustment' || item.record_type === 'due_date'">
            <div style="margin-bottom: 8px">
              <a-tag :color="getAdjustmentTypeColor(item.adjustment_type)">
                {{ getAdjustmentTypeText(item.adjustment_type) }}
              </a-tag>
              <span style="margin-left: 8px; font-weight: 500">到期日調整</span>
            </div>
            
            <div style="margin-bottom: 8px; color: #6b7280">
              <div>
                <span>調整前：</span>
                <span style="font-weight: 500">{{ formatDate(item.old_due_date || item.oldDueDate) }}</span>
              </div>
              <div style="margin-top: 4px">
                <span>調整後：</span>
                <span style="font-weight: 500">{{ formatDate(item.new_due_date || item.newDueDate) }}</span>
              </div>
            </div>

            <div v-if="item.days_diff !== undefined && item.days_diff !== null" style="margin-bottom: 8px">
              <a-tag :color="item.days_diff > 0 ? 'red' : 'green'">
                {{ item.days_diff > 0 ? '+' : '' }}{{ item.days_diff }} 天
              </a-tag>
            </div>

            <div v-if="item.reason" style="margin-bottom: 8px; padding: 8px; background: #f9fafb; border-radius: 4px">
              <span style="font-weight: 500">調整原因：</span>
              <span>{{ item.reason }}</span>
            </div>

            <div style="font-size: 12px; color: #9ca3af">
              {{ formatDateTimeForHistory(item.created_at || item.createdAt || item.requested_at) }}
              <span v-if="item.operator_name || item.operatorName || item.requested_by_name">
                • {{ item.operator_name || item.operatorName || item.requested_by_name || '系統' }}
              </span>
            </div>
          </div>

          <!-- 狀態更新記錄 -->
          <div v-else-if="item.type === 'status_update' || item.record_type === 'status_update'">
            <div style="margin-bottom: 8px">
              <a-tag color="green">狀態更新</a-tag>
            </div>

            <div style="margin-bottom: 8px; color: #6b7280">
              <span>狀態變化：</span>
              <a-tag :color="getStatusColor(item.old_status || item.oldStatus)" style="margin: 0 4px">
                {{ getStatusText(item.old_status || item.oldStatus) }}
              </a-tag>
              <span>→</span>
              <a-tag :color="getStatusColor(item.new_status || item.newStatus)" style="margin: 0 4px">
                {{ getStatusText(item.new_status || item.newStatus) }}
              </a-tag>
            </div>

            <div v-if="item.progress_note || item.progressNote" style="margin-bottom: 8px; padding: 8px; background: #f9fafb; border-radius: 4px">
              <span style="font-weight: 500">進度說明：</span>
              <span>{{ item.progress_note || item.progressNote }}</span>
            </div>

            <div v-if="item.overdue_reason || item.overdueReason" style="margin-bottom: 8px; padding: 8px; background: #fef2f2; border-radius: 4px">
              <span style="font-weight: 500; color: #dc2626">逾期原因：</span>
              <span>{{ item.overdue_reason || item.overdueReason }}</span>
            </div>

            <div v-if="item.blocker_reason || item.blockerReason" style="margin-bottom: 8px; padding: 8px; background: #fef2f2; border-radius: 4px">
              <span style="font-weight: 500; color: #dc2626">阻礙原因：</span>
              <span>{{ item.blocker_reason || item.blockerReason }}</span>
            </div>

            <div style="font-size: 12px; color: #9ca3af">
              {{ formatDateTimeForHistory(item.created_at || item.createdAt || item.requested_at) }}
              <span v-if="item.operator_name || item.operatorName || item.requested_by_name">
                • {{ item.operator_name || item.operatorName || item.requested_by_name || '系統' }}
              </span>
            </div>
          </div>
        </a-timeline-item>
      </a-timeline>
    </a-spin>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ClockCircleOutlined, EditOutlined, RobotOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { useTaskStore } from '@/stores/tasks'
import { formatDate, formatDateTimeForHistory, getTaskStatusText } from '@/utils/formatters'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  taskId: {
    type: [String, Number],
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible'])

const store = useTaskStore()

// 彈窗顯示狀態
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 歷史記錄列表
const historyList = ref([])
const loading = ref(false)

// 監聽 visible 變化，載入歷史記錄
watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      await loadHistory()
    }
  }
)

// 載入歷史記錄
const loadHistory = async () => {
  if (!props.taskId) return

  loading.value = true
  try {
    const history = await store.fetchTaskAdjustmentHistory(props.taskId)
    
    // 格式化歷史記錄
    historyList.value = Array.isArray(history) ? history.map(formatHistoryItem) : []
  } catch (err) {
    console.error('載入變更歷史失敗:', err)
    historyList.value = []
  } finally {
    loading.value = false
  }
}

// 格式化歷史記錄項
const formatHistoryItem = (item) => {
  // 計算天數差（如果是到期日調整）
  if (item.type === 'due_date_adjustment' || item.record_type === 'due_date' || item.adjustment_type) {
    const oldDate = item.old_due_date || item.oldDueDate
    const newDate = item.new_due_date || item.newDueDate
    
    if (oldDate && newDate) {
      const old = new Date(oldDate)
      const new_ = new Date(newDate)
      const diffTime = new_ - old
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      item.days_diff = diffDays
    } else if (item.days_changed !== undefined) {
      // 如果 API 已經提供了天數變化，直接使用
      item.days_diff = item.days_changed
    }
  }
  
  // 統一處理類型字段
  if (!item.type) {
    if (item.record_type === 'due_date') {
      item.type = 'due_date_adjustment'
    } else if (item.record_type === 'status_update') {
      item.type = 'status_update'
    }
  }
  
  return item
}

// 獲取時間軸顏色
const getTimelineColor = (type) => {
  if (type === 'due_date_adjustment') return 'blue'
  if (type === 'status_update') return 'green'
  return 'gray'
}

// 獲取時間軸圖標
const getTimelineIcon = (type) => {
  if (type === 'due_date_adjustment') return EditOutlined
  if (type === 'status_update') return ClockCircleOutlined
  return ClockCircleOutlined
}

// 獲取調整類型顏色
const getAdjustmentTypeColor = (type) => {
  const colorMap = {
    initial_create: 'blue',
    manual_adjust: 'orange',
    system_auto: 'purple',
    overdue_adjust: 'red'
  }
  return colorMap[type] || 'default'
}

// 獲取調整類型文字
const getAdjustmentTypeText = (type) => {
  const textMap = {
    initial_create: '初始創建',
    manual_adjust: '手動調整',
    system_auto: '系統自動',
    overdue_adjust: '逾期調整'
  }
  return textMap[type] || type
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

// 獲取狀態文字
const getStatusText = (status) => {
  return getTaskStatusText(status) || status
}

// 處理取消
const handleCancel = () => {
  modalVisible.value = false
}
</script>


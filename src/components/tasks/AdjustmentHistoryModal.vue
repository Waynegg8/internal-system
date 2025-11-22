<template>
  <a-modal
    v-model:visible="modalVisible"
    title="變更歷史"
    :width="700"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <a-empty v-if="!loading && historyList.length === 0" description="尚無變更歷史" />

      <a-timeline v-else>
        <a-timeline-item
          v-for="(item, index) in historyList"
          :key="item.id || index"
          :color="getTimelineColor(item.type)"
        >
          <template #dot>
            <component :is="getTimelineIcon(item.type)" />
          </template>

          <!-- 狀態變更記錄 -->
          <div v-if="item.type === 'status'">
            <div style="margin-bottom: 8px">
              <a-tag color="blue">
                <CheckCircleOutlined style="margin-right: 4px" />
                狀態變更
              </a-tag>
            </div>

            <div style="margin-bottom: 8px; color: #6b7280">
              <span>狀態變化：</span>
              <a-tag :color="getStatusColor(item.old_status)" style="margin: 0 4px">
                {{ getStatusText(item.old_status) }}
              </a-tag>
              <span>→</span>
              <a-tag :color="getStatusColor(item.new_status)" style="margin: 0 4px">
                {{ getStatusText(item.new_status) }}
              </a-tag>
            </div>

            <div v-if="item.progress_note" style="margin-bottom: 8px; padding: 8px; background: #f0f9ff; border-radius: 4px">
              <span style="font-weight: 500">進度說明：</span>
              <span>{{ item.progress_note }}</span>
            </div>

            <div v-if="item.overdue_reason" style="margin-bottom: 8px; padding: 8px; background: #fef2f2; border-radius: 4px">
              <span style="font-weight: 500; color: #dc2626">逾期原因：</span>
              <span>{{ item.overdue_reason }}</span>
            </div>

            <div v-if="item.blocker_reason" style="margin-bottom: 8px; padding: 8px; background: #fef2f2; border-radius: 4px">
              <span style="font-weight: 500; color: #dc2626">阻礙原因：</span>
              <span>{{ item.blocker_reason }}</span>
            </div>

            <div v-if="item.expected_completion_date" style="margin-bottom: 8px; color: #6b7280">
              <span>預期完成日期：</span>
              <span style="font-weight: 500">{{ formatDate(item.expected_completion_date) }}</span>
            </div>

            <div style="font-size: 12px; color: #9ca3af">
              {{ formatDateTimeForHistory(item.time) }}
              <span v-if="item.user_name">
                • {{ item.user_name }}
              </span>
            </div>
          </div>

          <!-- 階段狀態變更記錄 -->
          <div v-else-if="item.type === 'stage_status' || item.type === 'stage'">
            <div style="margin-bottom: 8px">
              <a-tag color="purple">
                <SyncOutlined style="margin-right: 4px" />
                階段狀態變更
              </a-tag>
            </div>

            <div v-if="item.payload?.stage_name" style="margin-bottom: 8px; color: #6b7280">
              <span>階段：</span>
              <span style="font-weight: 500">{{ item.payload.stage_name }}</span>
            </div>

            <div style="margin-bottom: 8px; color: #6b7280">
              <span>狀態變化：</span>
              <a-tag :color="getStatusColor(item.payload?.old_status)" style="margin: 0 4px">
                {{ getStatusText(item.payload?.old_status) || '未設置' }}
              </a-tag>
              <span>→</span>
              <a-tag :color="getStatusColor(item.payload?.new_status || item.payload?.status)" style="margin: 0 4px">
                {{ getStatusText(item.payload?.new_status || item.payload?.status) }}
              </a-tag>
            </div>

            <div v-if="item.payload?.notes" style="margin-bottom: 8px; padding: 8px; background: #f0f9ff; border-radius: 4px">
              <span style="font-weight: 500">備註：</span>
              <span>{{ item.payload.notes }}</span>
            </div>

            <div v-if="item.payload?.delay_days" style="margin-bottom: 8px">
              <a-tag :color="item.payload.delay_days > 0 ? 'red' : 'green'">
                {{ item.payload.delay_days > 0 ? '+' : '' }}{{ item.payload.delay_days }} 天延遲
              </a-tag>
            </div>

            <div style="font-size: 12px; color: #9ca3af">
              {{ formatDateTimeForHistory(item.time) }}
              <span v-if="item.user_name">
                • {{ item.user_name }}
              </span>
            </div>
          </div>

          <!-- 到期日調整記錄 -->
          <div v-else-if="item.type === 'due_date'">
            <div style="margin-bottom: 8px">
              <a-tag :color="getAdjustmentTypeColor(item.adjustment_type)">
                <ClockCircleOutlined style="margin-right: 4px" />
                {{ getAdjustmentTypeText(item.adjustment_type) }}
              </a-tag>
              <span style="margin-left: 8px; font-weight: 500">到期日調整</span>
            </div>
            
            <div style="margin-bottom: 8px; color: #6b7280">
              <div>
                <span>調整前：</span>
                <span style="font-weight: 500">{{ formatDate(item.old_due_date) }}</span>
              </div>
              <div style="margin-top: 4px">
                <span>調整後：</span>
                <span style="font-weight: 500">{{ formatDate(item.new_due_date) }}</span>
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
              {{ formatDateTimeForHistory(item.time) }}
              <span v-if="item.user_name">
                • {{ item.user_name }}
              </span>
            </div>
          </div>

          <!-- 負責人變更記錄 -->
          <div v-else-if="item.type === 'assignee' || item.event_type === 'assignee_changed'">
            <div style="margin-bottom: 8px">
              <a-tag color="orange">
                <UserOutlined style="margin-right: 4px" />
                負責人變更
              </a-tag>
            </div>

            <div style="margin-bottom: 8px; color: #6b7280">
              <div v-if="item.payload?.old_assignee_name || item.payload?.new_assignee_name">
                <span>負責人變化：</span>
                <span v-if="item.payload?.old_assignee_name" style="font-weight: 500; margin: 0 4px">
                  {{ item.payload.old_assignee_name }}
                </span>
                <span v-else style="color: #9ca3af; margin: 0 4px">未分配</span>
                <span>→</span>
                <span v-if="item.payload?.new_assignee_name" style="font-weight: 500; margin: 0 4px">
                  {{ item.payload.new_assignee_name }}
                </span>
                <span v-else style="color: #9ca3af; margin: 0 4px">未分配</span>
              </div>
              <div v-else-if="item.payload?.old_assignee_id || item.payload?.new_assignee_id" style="margin-top: 4px">
                <span>負責人 ID：</span>
                <span v-if="item.payload?.old_assignee_id" style="font-weight: 500; margin: 0 4px">
                  用戶 ID {{ item.payload.old_assignee_id }}
                </span>
                <span v-else style="color: #9ca3af; margin: 0 4px">未分配</span>
                <span>→</span>
                <span v-if="item.payload?.new_assignee_id" style="font-weight: 500; margin: 0 4px">
                  用戶 ID {{ item.payload.new_assignee_id }}
                </span>
                <span v-else style="color: #9ca3af; margin: 0 4px">未分配</span>
              </div>
            </div>

            <div style="font-size: 12px; color: #9ca3af">
              {{ formatDateTimeForHistory(item.time) }}
              <span v-if="item.user_name">
                • {{ item.user_name }}
              </span>
            </div>
          </div>

          <!-- SOP 關聯變更記錄 -->
          <div v-else-if="item.type === 'sop' || item.event_type === 'sop_association_changed'">
            <div style="margin-bottom: 8px">
              <a-tag color="cyan">
                <BookOutlined style="margin-right: 4px" />
                SOP 關聯變更
              </a-tag>
            </div>

            <div v-if="item.payload?.added_sop_titles && item.payload.added_sop_titles.length > 0" style="margin-bottom: 8px">
              <div style="font-weight: 500; color: #059669; margin-bottom: 4px">新增 SOP：</div>
              <div style="padding: 8px; background: #f0fdf4; border-radius: 4px">
                <a-tag v-for="(title, idx) in item.payload.added_sop_titles" :key="idx" color="success" style="margin: 2px">
                  {{ title }}
                </a-tag>
              </div>
            </div>

            <div v-if="item.payload?.removed_sop_titles && item.payload.removed_sop_titles.length > 0" style="margin-bottom: 8px">
              <div style="font-weight: 500; color: #dc2626; margin-bottom: 4px">移除 SOP：</div>
              <div style="padding: 8px; background: #fef2f2; border-radius: 4px">
                <a-tag v-for="(title, idx) in item.payload.removed_sop_titles" :key="idx" color="error" style="margin: 2px">
                  {{ title }}
                </a-tag>
              </div>
            </div>

            <div v-if="(!item.payload?.added_sop_titles || item.payload.added_sop_titles.length === 0) && 
                       (!item.payload?.removed_sop_titles || item.payload.removed_sop_titles.length === 0)" 
                 style="margin-bottom: 8px; color: #6b7280">
              <span>無變更</span>
            </div>

            <div style="font-size: 12px; color: #9ca3af">
              {{ formatDateTimeForHistory(item.time) }}
              <span v-if="item.user_name">
                • {{ item.user_name }}
              </span>
            </div>
          </div>

          <!-- 文檔變更記錄 -->
          <div v-else-if="item.type === 'document' || item.event_type === 'document_changed'">
            <div style="margin-bottom: 8px">
              <a-tag :color="getDocumentActionColor(item.payload?.action)">
                <FileOutlined style="margin-right: 4px" />
                {{ getDocumentActionText(item.payload?.action) }}
              </a-tag>
            </div>

            <div v-if="item.payload?.file_name" style="margin-bottom: 8px; padding: 8px; background: #f9fafb; border-radius: 4px">
              <span style="font-weight: 500">文檔名稱：</span>
              <span>{{ item.payload.file_name }}</span>
            </div>

            <div v-if="item.payload?.document_id" style="margin-bottom: 8px; color: #6b7280">
              <span>文檔 ID：</span>
              <span style="font-weight: 500">{{ item.payload.document_id }}</span>
            </div>

            <div style="font-size: 12px; color: #9ca3af">
              {{ formatDateTimeForHistory(item.time) }}
              <span v-if="item.user_name">
                • {{ item.user_name }}
              </span>
            </div>
          </div>

          <!-- 未知類型（向後兼容） -->
          <div v-else>
            <div style="margin-bottom: 8px">
              <a-tag color="default">
                <EditOutlined style="margin-right: 4px" />
                {{ getTypeLabel(item.type) }}
              </a-tag>
            </div>

            <div v-if="item.content" style="margin-bottom: 8px; padding: 8px; background: #f9fafb; border-radius: 4px; white-space: pre-line">
              {{ item.content }}
            </div>

            <div style="font-size: 12px; color: #9ca3af">
              {{ formatDateTimeForHistory(item.time || item.created_at || item.updated_at || item.requested_at) }}
              <span v-if="item.user_name || item.operator_name || item.requested_by_name">
                • {{ item.user_name || item.operator_name || item.requested_by_name }}
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
import { 
  ClockCircleOutlined, 
  EditOutlined, 
  CheckCircleOutlined,
  SyncOutlined,
  UserOutlined,
  BookOutlined,
  FileOutlined
} from '@ant-design/icons-vue'
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
    
    // 確保按時間倒序排列
    historyList.value.sort((a, b) => {
      const timeA = a.time || a.created_at || a.updated_at || a.requested_at
      const timeB = b.time || b.created_at || b.updated_at || b.requested_at
      if (!timeA && !timeB) return 0
      if (!timeA) return 1
      if (!timeB) return -1
      return new Date(timeB) - new Date(timeA)
    })
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
  if (item.type === 'due_date') {
    const oldDate = item.old_due_date
    const newDate = item.new_due_date
    
    if (oldDate && newDate) {
      const old = new Date(oldDate)
      const new_ = new Date(newDate)
      const diffTime = new_ - old
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      item.days_diff = diffDays
    }
  }
  
  // 統一處理類型字段（向後兼容）
  if (!item.type) {
    if (item.record_type === 'due_date') {
      item.type = 'due_date'
    } else if (item.record_type === 'status_update') {
      item.type = 'status'
    }
  }
  
  // 確保 payload 是對象
  if (item.payload && typeof item.payload === 'string') {
    try {
      item.payload = JSON.parse(item.payload)
    } catch (e) {
      item.payload = {}
    }
  }
  
  return item
}

// 獲取時間軸顏色
const getTimelineColor = (type) => {
  const colorMap = {
    status: 'blue',
    stage_status: 'purple',
    stage: 'purple',
    due_date: 'orange',
    assignee: 'orange',
    sop: 'cyan',
    document: 'green'
  }
  return colorMap[type] || 'gray'
}

// 獲取時間軸圖標
const getTimelineIcon = (type) => {
  const iconMap = {
    status: CheckCircleOutlined,
    stage_status: SyncOutlined,
    stage: SyncOutlined,
    due_date: ClockCircleOutlined,
    assignee: UserOutlined,
    sop: BookOutlined,
    document: FileOutlined
  }
  return iconMap[type] || EditOutlined
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
  return textMap[type] || type || '調整'
}

// 獲取狀態顏色
const getStatusColor = (status) => {
  if (!status) return 'default'
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
  if (!status) return '未設置'
  return getTaskStatusText(status) || status
}

// 獲取文檔操作顏色
const getDocumentActionColor = (action) => {
  const colorMap = {
    upload: 'success',
    delete: 'error'
  }
  return colorMap[action] || 'default'
}

// 獲取文檔操作文字
const getDocumentActionText = (action) => {
  const textMap = {
    upload: '文檔上傳',
    delete: '文檔刪除',
    change: '文檔變更'
  }
  return textMap[action] || '文檔變更'
}

// 獲取類型標籤
const getTypeLabel = (type) => {
  const labelMap = {
    status: '狀態變更',
    stage_status: '階段狀態變更',
    stage: '階段狀態變更',
    due_date: '到期日調整',
    assignee: '負責人變更',
    sop: 'SOP 關聯變更',
    document: '文檔變更'
  }
  return labelMap[type] || type || '變更'
}

// 處理取消
const handleCancel = () => {
  modalVisible.value = false
}
</script>

<style scoped>
:deep(.ant-timeline-item-content) {
  margin-top: -4px;
}
</style>

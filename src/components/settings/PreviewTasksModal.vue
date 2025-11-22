<template>
  <a-modal
    :open="visible"
    :title="modalTitle"
    width="1200px"
    :footer="null"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <div v-if="!loading && services.length === 0" style="text-align: center; padding: 40px; color: #999">
        {{ targetMonth || '該月份' }}不會生成任何任務
      </div>
      
      <div v-else>
        <!-- 統計信息 -->
        <div v-if="summary" style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px">
          <a-row :gutter="16">
            <a-col :span="6">
              <div style="text-align: center">
                <div style="font-size: 24px; font-weight: 500; color: #1890ff">
                  {{ summary.total_services || 0 }}
                </div>
                <div style="font-size: 12px; color: #666">服務數量</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div style="text-align: center">
                <div style="font-size: 24px; font-weight: 500; color: #52c41a">
                  {{ summary.total_tasks || 0 }}
                </div>
                <div style="font-size: 12px; color: #666">任務數量</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div style="text-align: center">
                <div style="font-size: 24px; font-weight: 500; color: #faad14">
                  {{ summary.will_generate_services || 0 }}
                </div>
                <div style="font-size: 12px; color: #666">將生成服務</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div style="text-align: center">
                <div style="font-size: 24px; font-weight: 500; color: #faad14">
                  {{ summary.will_generate_tasks || 0 }}
                </div>
                <div style="font-size: 12px; color: #666">將生成任務</div>
              </div>
            </a-col>
          </a-row>
        </div>

        <!-- 服務列表 -->
        <a-collapse v-model:activeKey="activeKeys" :bordered="false">
          <a-collapse-panel
            v-for="(service, index) in services"
            :key="index"
            :header="getServiceHeader(service)"
          >
            <div v-if="service.tasks && service.tasks.length > 0">
              <a-alert
                v-if="service.already_generated"
                type="warning"
                message="此服務的任務已生成"
                show-icon
                style="margin-bottom: 12px"
              />
              
              <a-table
                :columns="taskColumns"
                :data-source="service.tasks"
                :pagination="false"
                size="small"
                :row-key="(record, idx) => record.config_id || idx"
              >
                <template #bodyCell="{ column, record }">
                  <!-- 階段編號 -->
                  <template v-if="column.key === 'stage_order'">
                    <a-tag color="blue" style="font-weight: 500">
                      階段 {{ record.stage_order || '-' }}
                    </a-tag>
                  </template>

                  <!-- 任務名稱 -->
                  <template v-if="column.key === 'task_name'">
                    <div>
                      <div style="font-weight: 500; color: #1e40af">
                        {{ record.task_name || '未命名任務' }}
                      </div>
                      <div v-if="record.task_description" style="font-size: 12px; color: #6b7280; margin-top: 2px">
                        {{ record.task_description }}
                      </div>
                    </div>
                  </template>

                  <!-- 生成時間 -->
                  <template v-if="column.key === 'generation_time'">
                    <div v-if="record.generation_time">
                      <div style="font-weight: 500; color: #059669">
                        {{ formatDate(record.generation_time) }}
                      </div>
                      <div v-if="record.generation_time_error" style="font-size: 12px; color: #ef4444; margin-top: 2px">
                        {{ record.generation_time_error }}
                      </div>
                    </div>
                    <div v-else style="color: #9ca3af">
                      <span v-if="record.generation_time_error">
                        {{ record.generation_time_error }}
                      </span>
                      <span v-else>無法計算</span>
                    </div>
                  </template>

                  <!-- 到期日 -->
                  <template v-if="column.key === 'due_date'">
                    <div v-if="record.due_date">
                      <div style="font-weight: 500; color: #dc2626">
                        {{ formatDate(record.due_date) }}
                      </div>
                      <div v-if="record.due_date_error" style="font-size: 12px; color: #ef4444; margin-top: 2px">
                        {{ record.due_date_error }}
                      </div>
                      <div v-if="record.is_fixed_deadline" style="margin-top: 4px">
                        <a-tag color="red" size="small">
                          固定期限
                        </a-tag>
                      </div>
                    </div>
                    <div v-else style="color: #9ca3af">
                      <span v-if="record.due_date_error">
                        {{ record.due_date_error }}
                      </span>
                      <span v-else>無法計算</span>
                    </div>
                  </template>

                  <!-- 負責人 -->
                  <template v-if="column.key === 'assignee'">
                    {{ record.assignee_name || '未指派' }}
                  </template>
                </template>
              </a-table>
            </div>
            <a-empty v-else description="此服務沒有任務配置" />
          </a-collapse-panel>
        </a-collapse>
      </div>
    </a-spin>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useTaskApi } from '@/api/tasks'
import { formatDate } from '@/utils/formatters'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  targetMonth: {
    type: String,
    default: ''
  },
  tasks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

const taskApi = useTaskApi()
const loading = ref(false)
const services = ref([])
const summary = ref(null)
const activeKeys = ref([])

// 模態框標題
const modalTitle = computed(() => {
  if (props.targetMonth) {
    return `${props.targetMonth} 預計生成任務預覽（完整月份視圖）`
  }
  return '預計生成任務預覽（完整月份視圖）'
})

// 任務表格列定義
const taskColumns = [
  {
    title: '階段',
    key: 'stage_order',
    dataIndex: 'stage_order',
    width: 100,
    align: 'center'
  },
  {
    title: '任務名稱',
    key: 'task_name',
    dataIndex: 'task_name',
    width: 250
  },
  {
    title: '生成時間',
    key: 'generation_time',
    dataIndex: 'generation_time',
    width: 150
  },
  {
    title: '到期日',
    key: 'due_date',
    dataIndex: 'due_date',
    width: 150
  },
  {
    title: '負責人',
    key: 'assignee',
    width: 120
  }
]

// 獲取服務標題
const getServiceHeader = (service) => {
  const parts = []
  if (service.client_name) {
    parts.push(service.client_name)
  }
  if (service.service_name) {
    parts.push(service.service_name)
  }
  const header = parts.join(' - ') || '未知服務'
  const taskCount = service.tasks ? service.tasks.length : 0
  const status = service.already_generated ? '（已生成）' : ''
  return `${header}（${taskCount} 個任務）${status}`
}

// 載入預覽數據
const loadPreview = async () => {
  if (!props.visible) return

  loading.value = true
  try {
    // 確定目標月份
    let targetMonth = props.targetMonth
    if (!targetMonth) {
      // 如果沒有提供，使用下個月
      const now = new Date()
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      targetMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
    }

    // 調用增強的預覽 API
    const response = await taskApi.fetchTaskGenerationPreview({ target_month: targetMonth })
    const data = response.data || response

    if (data.services) {
      services.value = data.services
      summary.value = data.summary || null
      
      // 自動展開所有服務
      activeKeys.value = services.value.map((_, index) => index)
    } else {
      services.value = []
      summary.value = null
    }
  } catch (err) {
    console.error('載入預覽數據失敗:', err)
    message.error('載入預覽數據失敗：' + (err.message || '未知錯誤'))
    services.value = []
    summary.value = null
  } finally {
    loading.value = false
  }
}

// 監聽 visible 變化，載入數據
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadPreview()
    } else {
      // 關閉時重置數據
      services.value = []
      summary.value = null
      activeKeys.value = []
    }
  },
  { immediate: true }
)

// 監聽 targetMonth 變化，重新載入數據
watch(
  () => props.targetMonth,
  () => {
    if (props.visible) {
      loadPreview()
    }
  }
)

// 處理關閉
const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
.preview-task-item {
  width: 100%;
  padding: 8px 0;
}

.task-name {
  font-weight: 500;
  margin-bottom: 8px;
}

.task-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
}

.meta-item .label {
  font-weight: 500;
  margin-right: 4px;
}

:deep(.ant-collapse-header) {
  font-weight: 500;
}

:deep(.ant-table-small) {
  font-size: 13px;
}
</style>


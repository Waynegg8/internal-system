<template>
  <div class="task-generation-history">
    <a-page-header
      title="任務生成歷史"
      sub-title="查看任務自動生成的歷史記錄"
      style="margin-bottom: 16px"
    >
      <template #extra>
        <a-button
          type="primary"
          :icon="h(ReloadOutlined)"
          :loading="loading"
          @click="handleRefresh"
        >
          刷新
        </a-button>
      </template>
    </a-page-header>

    <!-- 篩選器 -->
    <a-card style="margin-bottom: 16px">
      <a-form
        :model="filters"
        layout="inline"
        @submit.prevent="handleSearch"
      >
        <a-form-item label="時間範圍">
          <a-range-picker
            v-model:value="dateRange"
            format="YYYY-MM-DD"
            style="width: 240px"
            @change="handleDateRangeChange"
          />
        </a-form-item>

        <a-form-item label="客戶">
          <a-select
            v-model:value="filters.client_id"
            placeholder="選擇客戶"
            allow-clear
            show-search
            :filter-option="filterOption"
            style="width: 200px"
            @change="handleFilterChange"
          >
            <a-select-option
              v-for="client in clients"
              :key="client.client_id"
              :value="client.client_id"
            >
              {{ client.company_name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="服務類型">
          <a-select
            v-model:value="filters.service_type"
            placeholder="選擇服務類型"
            allow-clear
            style="width: 150px"
            @change="handleFilterChange"
          >
            <a-select-option value="recurring">定期服務</a-select-option>
            <a-select-option value="one-time">一次性服務</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="生成狀態">
          <a-select
            v-model:value="filters.status"
            placeholder="選擇狀態"
            allow-clear
            style="width: 120px"
            @change="handleFilterChange"
          >
            <a-select-option value="success">成功</a-select-option>
            <a-select-option value="failed">失敗</a-select-option>
            <a-select-option value="partial">部分成功</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="服務年月">
          <a-input-group compact>
            <a-input-number
              v-model:value="filters.service_year"
              placeholder="年份"
              :min="2000"
              :max="2100"
              style="width: 100px"
              @change="handleFilterChange"
            />
            <a-input-number
              v-model:value="filters.service_month"
              placeholder="月份"
              :min="1"
              :max="12"
              style="width: 80px"
              @change="handleFilterChange"
            />
          </a-input-group>
        </a-form-item>

        <a-form-item>
          <a-input
            v-model:value="filters.search"
            placeholder="搜索客戶名稱或服務名稱"
            allow-clear
            style="width: 250px"
            @press-enter="handleSearch"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="loading">
            <template #icon>
              <SearchOutlined />
            </template>
            搜索
          </a-button>
          <a-button style="margin-left: 8px" @click="handleReset">
            重置
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 表格 -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="historyList"
        :loading="loading"
        :pagination="pagination"
        :row-key="record => record.history_id"
        :scroll="{ x: 'max-content' }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 生成時間 -->
          <template v-if="column.key === 'generation_time'">
            <div>
              <div style="font-weight: 500">
                {{ formatDateTime(record.generation_time) }}
              </div>
              <div style="font-size: 12px; color: #9ca3af; margin-top: 2px">
                {{ formatDate(record.generation_time) }}
              </div>
            </div>
          </template>

          <!-- 服務年月 -->
          <template v-if="column.key === 'service_year_month'">
            <a-tag color="blue">
              {{ record.service_year }}年{{ record.service_month }}月
            </a-tag>
          </template>

          <!-- 客戶和服務 -->
          <template v-if="column.key === 'client_service'">
            <div>
              <div style="font-weight: 500; color: #1e40af">
                {{ record.client_name || '未知客戶' }}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px">
                {{ record.service_name || '未知服務' }}
              </div>
              <div v-if="record.service_type" style="margin-top: 4px">
                <a-tag :color="record.service_type === 'recurring' ? 'green' : 'orange'" size="small">
                  {{ record.service_type === 'recurring' ? '定期服務' : '一次性服務' }}
                </a-tag>
              </div>
            </div>
          </template>

          <!-- 生成狀態 -->
          <template v-if="column.key === 'generation_status'">
            <a-tag
              :color="getStatusColor(record.generation_status)"
            >
              {{ getStatusText(record.generation_status) }}
            </a-tag>
          </template>

          <!-- 統計信息 -->
          <template v-if="column.key === 'stats'">
            <div>
              <div>
                <CheckCircleOutlined style="color: #52c41a; margin-right: 4px" />
                成功：{{ record.generated_count || 0 }}
              </div>
              <div v-if="record.skipped_count > 0" style="margin-top: 4px">
                <CloseCircleOutlined style="color: #ff4d4f; margin-right: 4px" />
                跳過：{{ record.skipped_count || 0 }}
              </div>
            </div>
          </template>

          <!-- 操作 -->
          <template v-if="column.key === 'actions'">
            <a-button
              type="link"
              size="small"
              @click="handleToggleExpand(record.history_id)"
            >
              {{ expandedRows.has(record.history_id) ? '收起' : '展開' }}
            </a-button>
          </template>
        </template>

        <!-- 展開行 -->
        <template #expandedRowRender="{ record }">
          <div v-if="expandedRows.has(record.history_id)" class="expanded-row">
            <a-descriptions :column="2" bordered size="small">
              <a-descriptions-item label="生成時間" :span="2">
                {{ formatDateTime(record.generation_time) }}
              </a-descriptions-item>
              <a-descriptions-item label="服務年月">
                {{ record.service_year }}年{{ record.service_month }}月
              </a-descriptions-item>
              <a-descriptions-item label="服務類型">
                <a-tag :color="record.service_type === 'recurring' ? 'green' : 'orange'">
                  {{ record.service_type === 'recurring' ? '定期服務' : '一次性服務' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="生成狀態">
                <a-tag :color="getStatusColor(record.generation_status)">
                  {{ getStatusText(record.generation_status) }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="成功生成">
                {{ record.generated_count || 0 }} 個任務
              </a-descriptions-item>
              <a-descriptions-item label="跳過">
                {{ record.skipped_count || 0 }} 個任務
              </a-descriptions-item>
            </a-descriptions>

            <!-- 生成的任務列表 -->
            <div v-if="record.generated_tasks && record.generated_tasks.length > 0" style="margin-top: 16px">
              <h4 style="margin-bottom: 12px">生成的任務列表</h4>
              <a-table
                :columns="taskColumns"
                :data-source="record.generated_tasks"
                :pagination="false"
                size="small"
                :row-key="(task, index) => task.task_id || index"
              >
                <template #bodyCell="{ column, record: task }">
                  <template v-if="column.key === 'task_name'">
                    <div>
                      <div style="font-weight: 500">{{ task.task_name || '未命名任務' }}</div>
                      <div v-if="task.task_id" style="font-size: 12px; color: #9ca3af; margin-top: 2px">
                        ID: {{ task.task_id }}
                      </div>
                    </div>
                  </template>
                  <template v-if="column.key === 'generation_time'">
                    {{ task.generation_time ? formatDate(task.generation_time) : '-' }}
                  </template>
                  <template v-if="column.key === 'due_date'">
                    {{ task.due_date ? formatDate(task.due_date) : '-' }}
                  </template>
                  <template v-if="column.key === 'is_fixed_deadline'">
                    <a-tag v-if="task.is_fixed_deadline" color="red" size="small">
                      固定期限
                    </a-tag>
                    <span v-else>-</span>
                  </template>
                </template>
              </a-table>
            </div>

            <!-- 錯誤訊息 -->
            <div v-if="record.error_message" style="margin-top: 16px">
              <a-alert
                type="error"
                message="錯誤訊息"
                :description="formatErrorMessage(record.error_message)"
                show-icon
              />
            </div>
          </div>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons-vue'
import { useTaskApi } from '@/api/tasks'
import { formatDate, formatDateTime } from '@/utils/formatters'
import dayjs from 'dayjs'

const taskApi = useTaskApi()

// 數據狀態
const loading = ref(false)
const historyList = ref([])
const clients = ref([])
const expandedRows = ref(new Set())

// 篩選條件
const dateRange = ref(null)
const filters = reactive({
  client_id: undefined,
  service_type: undefined,
  status: undefined,
  service_year: undefined,
  service_month: undefined,
  search: undefined
})

// 分頁
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 條記錄`
})

// 表格列定義
const columns = [
  {
    title: '生成時間',
    key: 'generation_time',
    dataIndex: 'generation_time',
    width: 180,
    sorter: true
  },
  {
    title: '服務年月',
    key: 'service_year_month',
    width: 120
  },
  {
    title: '客戶 / 服務',
    key: 'client_service',
    width: 250
  },
  {
    title: '生成狀態',
    key: 'generation_status',
    dataIndex: 'generation_status',
    width: 120,
    filters: [
      { text: '成功', value: 'success' },
      { text: '失敗', value: 'failed' },
      { text: '部分成功', value: 'partial' }
    ]
  },
  {
    title: '統計',
    key: 'stats',
    width: 150
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right'
  }
]

// 任務列表列定義
const taskColumns = [
  {
    title: '任務名稱',
    key: 'task_name',
    dataIndex: 'task_name'
  },
  {
    title: '生成時間',
    key: 'generation_time',
    dataIndex: 'generation_time',
    width: 120
  },
  {
    title: '到期日',
    key: 'due_date',
    dataIndex: 'due_date',
    width: 120
  },
  {
    title: '固定期限',
    key: 'is_fixed_deadline',
    dataIndex: 'is_fixed_deadline',
    width: 100
  }
]

// 載入客戶列表
const loadClients = async () => {
  try {
    const response = await fetch('/api/v2/clients')
    const data = await response.json()
    if (data.ok && data.data) {
      clients.value = Array.isArray(data.data) ? data.data : []
    }
  } catch (err) {
    console.error('載入客戶列表失敗:', err)
  }
}

// 載入歷史記錄
const loadHistory = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize
    }

    // 時間範圍
    if (dateRange.value && dateRange.value.length === 2) {
      params.date_from = dateRange.value[0].format('YYYY-MM-DD')
      params.date_to = dateRange.value[1].format('YYYY-MM-DD')
    }

    // 其他篩選條件
    if (filters.client_id) params.client_id = filters.client_id
    if (filters.service_type) params.service_type = filters.service_type
    if (filters.status) params.status = filters.status
    if (filters.service_year) params.service_year = filters.service_year
    if (filters.service_month) params.service_month = filters.service_month
    if (filters.search) params.search = filters.search

    const response = await taskApi.fetchTaskGenerationHistory(params)
    const data = response.data || response

    if (data.history) {
      historyList.value = data.history
      pagination.total = data.pagination?.total || 0
    } else {
      historyList.value = []
      pagination.total = 0
    }
  } catch (err) {
    console.error('載入歷史記錄失敗:', err)
    message.error('載入歷史記錄失敗：' + (err.message || '未知錯誤'))
    historyList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 處理搜索
const handleSearch = () => {
  pagination.current = 1
  loadHistory()
}

// 處理重置
const handleReset = () => {
  dateRange.value = null
  filters.client_id = undefined
  filters.service_type = undefined
  filters.status = undefined
  filters.service_year = undefined
  filters.service_month = undefined
  filters.search = undefined
  pagination.current = 1
  loadHistory()
}

// 處理日期範圍變化
const handleDateRangeChange = () => {
  handleSearch()
}

// 處理篩選條件變化
const handleFilterChange = () => {
  handleSearch()
}

// 處理表格變化（排序、分頁等）
const handleTableChange = (pag, filters, sorter) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadHistory()
}

// 處理展開/收起
const handleToggleExpand = (historyId) => {
  if (expandedRows.value.has(historyId)) {
    expandedRows.value.delete(historyId)
  } else {
    expandedRows.value.add(historyId)
  }
}

// 處理表格展開事件
const handleExpand = (expanded, record) => {
  if (expanded) {
    expandedRows.value.add(record.history_id)
  } else {
    expandedRows.value.delete(record.history_id)
  }
  loadHistory()
}

// 處理刷新
const handleRefresh = () => {
  loadHistory()
}

// 獲取狀態顏色
const getStatusColor = (status) => {
  switch (status) {
    case 'success':
      return 'green'
    case 'failed':
      return 'red'
    case 'partial':
      return 'orange'
    default:
      return 'default'
  }
}

// 獲取狀態文字
const getStatusText = (status) => {
  switch (status) {
    case 'success':
      return '成功'
    case 'failed':
      return '失敗'
    case 'partial':
      return '部分成功'
    default:
      return status
  }
}

// 格式化錯誤訊息
const formatErrorMessage = (errorMessage) => {
  if (!errorMessage) return ''
  try {
    const parsed = typeof errorMessage === 'string' ? JSON.parse(errorMessage) : errorMessage
    if (Array.isArray(parsed)) {
      return parsed.map(err => err.error || err.message || JSON.stringify(err)).join('\n')
    }
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
  } catch (e) {
    return errorMessage
  }
}

// 客戶選擇器過濾
const filterOption = (input, option) => {
  return option.children[0].children.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 初始化
onMounted(async () => {
  await loadClients()
  await loadHistory()
})
</script>

<style scoped>
.task-generation-history {
  padding: 24px;
}

.expanded-row {
  padding: 16px;
  background: #fafafa;
}

.expanded-row :deep(.ant-descriptions-item-label) {
  font-weight: 500;
  width: 120px;
}
</style>


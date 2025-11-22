<template>
  <div class="billing-plan-list">
    <!-- 操作欄 -->
    <div class="action-bar" v-if="showActions">
      <a-space>
        <a-select
          v-model:value="localBillingTypeFilter"
          placeholder="篩選類型"
          style="width: 150px"
          allow-clear
          aria-label="篩選收費類型"
          @change="handleFilterChange"
        >
          <a-select-option value="">全部</a-select-option>
          <a-select-option value="recurring">定期服務</a-select-option>
          <a-select-option value="one-time">一次性服務</a-select-option>
        </a-select>
        <a-popconfirm
          title="確定要刪除選中的收費計劃嗎？"
          ok-text="確定"
          cancel-text="取消"
          @confirm="handleBatchDelete"
        >
          <a-button 
            danger 
            :disabled="selectedRowKeys.length === 0" 
            :loading="isDeleting"
            :aria-label="`批量刪除 ${selectedRowKeys.length} 筆收費計劃`"
          >
            批量刪除 ({{ selectedRowKeys.length }})
          </a-button>
        </a-popconfirm>
        <a-button 
          type="primary" 
          @click="handleAdd"
          aria-label="新增收費計劃"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          新增收費計劃
        </a-button>
      </a-space>
    </div>

    <!-- 統計資訊 -->
    <div 
      class="statistics-bar" 
      v-if="showStatistics && filteredPlans.length > 0"
      role="region"
      aria-label="收費計劃統計資訊"
    >
      <a-space>
        <a-statistic
          title="定期服務"
          :value="recurringCount"
          :value-style="{ color: '#1890ff' }"
          :prefix="null"
        />
        <a-statistic
          title="一次性服務"
          :value="oneTimeCount"
          :value-style="{ color: '#52c41a' }"
          :prefix="null"
        />
        <a-statistic
          title="年度總計"
          :value="formatCurrency(totalAmount)"
          :value-style="{ color: '#722ed1', fontWeight: 'bold' }"
          :prefix="null"
        />
      </a-space>
    </div>

    <!-- 表格 -->
    <a-table
      :dataSource="paginatedData"
      :columns="columns"
      :loading="loading"
      :pagination="paginationConfig"
      :rowSelection="rowSelectionConfig"
      :rowKey="(record) => record.billingPlanId"
      :scroll="{ x: 'max-content', y: enableVirtualScroll ? 600 : undefined }"
      size="middle"
      class="billing-plan-table"
      :row-class-name="getRowClassName"
      :locale="{ emptyText: '尚無收費計劃' }"
      role="table"
      aria-label="收費計劃列表"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <!-- 類型列 -->
        <template v-if="column.key === 'billingType'">
          <a-tag 
            :color="record.billingType === 'recurring' ? 'blue' : 'green'"
            :aria-label="`收費類型：${record.billingType === 'recurring' ? '定期服務' : '一次性服務'}`"
          >
            <template #icon>
              <ClockCircleOutlined v-if="record.billingType === 'recurring'" />
              <CheckCircleOutlined v-else />
            </template>
            {{ record.billingType === 'recurring' ? '定期服務' : '一次性服務' }}
          </a-tag>
        </template>

        <!-- 年度總計列 -->
        <template v-else-if="column.key === 'yearTotal'">
          <span class="amount-cell" :aria-label="`年度總計：${formatCurrency(record.yearTotal || 0)}`">
            {{ formatCurrency(record.yearTotal || 0) }}
          </span>
        </template>

        <!-- 關聯服務列 -->
        <template v-else-if="column.key === 'services'">
          <a-space wrap>
            <a-tag
              v-for="service in record.services"
              :key="service.clientServiceId"
              :color="record.billingType === 'recurring' ? 'blue' : 'green'"
              :aria-label="`關聯服務：${service.serviceName}`"
            >
              {{ service.serviceName }}
            </a-tag>
            <span 
              v-if="!record.services || record.services.length === 0" 
              class="text-muted"
              aria-label="無關聯服務"
            >
              無關聯服務
            </span>
          </a-space>
        </template>

        <!-- 月份/日期列 -->
        <template v-else-if="column.key === 'months'">
          <div v-if="record.billingType === 'recurring'">
            <a-tooltip :title="getMonthsTooltip(record.months)">
              <a-tag color="blue">
                {{ record.months.length }} 個月
              </a-tag>
            </a-tooltip>
            <div class="month-details" v-if="showMonthDetails">
              <a-space wrap size="small">
                <span
                  v-for="month in record.months.slice(0, 6)"
                  :key="month.month"
                  class="month-badge"
                >
                  {{ month.month }}月
                </span>
                <span v-if="record.months.length > 6" class="text-muted">
                  +{{ record.months.length - 6 }} 個月
                </span>
              </a-space>
            </div>
          </div>
          <div v-else>
            <a-tag color="green">
              {{ formatDate(record.billingDate) }}
            </a-tag>
            <div v-if="record.description" class="text-muted" style="font-size: 12px; margin-top: 4px">
              {{ record.description }}
            </div>
          </div>
        </template>

        <!-- 付款期限列 -->
        <template v-else-if="column.key === 'paymentDueDays'">
          <span :aria-label="`付款期限：${record.paymentDueDays || '-'} 天`">
            {{ record.paymentDueDays ? `${record.paymentDueDays} 天` : '-' }}
          </span>
        </template>

        <!-- 備註列 -->
        <template v-else-if="column.key === 'notes'">
          <a-typography-paragraph
            :ellipsis="{ rows: 2, expandable: true, symbol: '展開' }"
            :content="record.notes || '-'"
            style="margin: 0; max-width: 300px"
          />
        </template>

        <!-- 操作列 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="handleEdit(record)"
              :aria-label="`編輯收費計劃 ${record.billingPlanId}`"
            >
              <template #icon>
                <EditOutlined />
              </template>
              編輯
            </a-button>
            <a-popconfirm
              title="確定要刪除此收費計劃嗎？"
              ok-text="確定"
              cancel-text="取消"
              @confirm="handleDelete(record.billingPlanId)"
            >
              <a-button
                type="link"
                danger
                size="small"
                :loading="isDeleting && deletingId === record.billingPlanId"
                :aria-label="`刪除收費計劃 ${record.billingPlanId}`"
              >
                <template #icon>
                  <DeleteOutlined />
                </template>
                刪除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>

      <!-- 空狀態 -->
      <template #emptyText>
        <a-empty
          description="尚無收費計劃"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        >
          <template #description>
            <span>尚無收費計劃</span>
            <div v-if="billingTypeFilter" class="text-muted" style="margin-top: 8px; font-size: 12px">
              當前篩選：{{ billingTypeFilter === 'recurring' ? '定期服務' : '一次性服務' }}
            </div>
          </template>
        </a-empty>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'
import { Empty } from 'ant-design-vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  plans: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  billingTypeFilter: {
    type: String,
    default: ''
  },
  showActions: {
    type: Boolean,
    default: true
  },
  showStatistics: {
    type: Boolean,
    default: true
  },
  showMonthDetails: {
    type: Boolean,
    default: false
  },
  pageSize: {
    type: Number,
    default: 20
  },
  enablePagination: {
    type: Boolean,
    default: true
  },
  enableVirtualScroll: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'batch-delete', 'add', 'filter-change'])

// 本地狀態
const localBillingTypeFilter = ref(props.billingTypeFilter)
const selectedRowKeys = ref([])
const isDeleting = ref(false)
const deletingId = ref(null)
const currentPage = ref(1)
const currentPageSize = ref(props.pageSize)

// 同步外部篩選器
watch(() => props.billingTypeFilter, (newVal) => {
  localBillingTypeFilter.value = newVal
})

// 篩選後的計劃列表
const filteredPlans = computed(() => {
  if (!localBillingTypeFilter.value) {
    return props.plans || []
  }
  return (props.plans || []).filter(
    plan => plan.billingType === localBillingTypeFilter.value
  )
})

// 分頁後的資料
const paginatedData = computed(() => {
  if (!props.enablePagination) {
    return filteredPlans.value
  }
  const start = (currentPage.value - 1) * currentPageSize.value
  const end = start + currentPageSize.value
  return filteredPlans.value.slice(start, end)
})

// 統計資訊
const recurringCount = computed(() => {
  return filteredPlans.value.filter(p => p.billingType === 'recurring').length
})

const oneTimeCount = computed(() => {
  return filteredPlans.value.filter(p => p.billingType === 'one-time').length
})

const totalAmount = computed(() => {
  return filteredPlans.value.reduce((sum, plan) => sum + (plan.yearTotal || 0), 0)
})

// 表格列定義
const columns = computed(() => [
  {
    title: '類型',
    key: 'billingType',
    width: 120,
    fixed: 'left'
  },
  {
    title: '年度總計',
    key: 'yearTotal',
    width: 150,
    align: 'right',
    sorter: (a, b) => (a.yearTotal || 0) - (b.yearTotal || 0)
  },
  {
    title: '關聯服務',
    key: 'services',
    ellipsis: true,
    minWidth: 200
  },
  {
    title: '月份/日期',
    key: 'months',
    width: 200
  },
  {
    title: '付款期限',
    dataIndex: 'paymentDueDays',
    key: 'paymentDueDays',
    width: 120,
    align: 'center'
  },
  {
    title: '備註',
    dataIndex: 'notes',
    key: 'notes',
    ellipsis: true,
    minWidth: 200
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right'
  }
])

// 分頁配置
const paginationConfig = computed(() => {
  if (!props.enablePagination) {
    return false
  }
  return {
    current: currentPage.value,
    pageSize: currentPageSize.value,
    total: filteredPlans.value.length,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 條，共 ${total} 條`,
    pageSizeOptions: ['10', '20', '50', '100'],
    onChange: (page, size) => {
      currentPage.value = page
      currentPageSize.value = size
    },
    onShowSizeChange: (current, size) => {
      currentPage.value = 1
      currentPageSize.value = size
    }
  }
})

// 行選擇配置
const rowSelectionConfig = computed(() => {
  if (!props.showActions) {
    return null
  }
  return {
    selectedRowKeys: selectedRowKeys.value,
    onChange: (keys) => {
      selectedRowKeys.value = keys
    },
    getCheckboxProps: (record) => ({
      'aria-label': `選擇收費計劃 ${record.billingPlanId}`
    })
  }
})

// 行類名（用於視覺區分）
const getRowClassName = (record) => {
  return `billing-plan-row billing-plan-row-${record.billingType}`
}

// 月份提示文字
const getMonthsTooltip = (months) => {
  if (!months || months.length === 0) {
    return '無月份明細'
  }
  const monthList = months.map(m => `${m.month}月 (${formatCurrency(m.amount || 0)})`).join('、')
  return `月份明細：${monthList}`
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW')
}

// 處理篩選變化
const handleFilterChange = (value) => {
  localBillingTypeFilter.value = value
  currentPage.value = 1 // 重置到第一頁
  selectedRowKeys.value = [] // 清空選擇
  emit('filter-change', value)
}

// 處理表格變化（排序、篩選等）
const handleTableChange = (pagination, filters, sorter) => {
  // 處理分頁變化
  if (pagination) {
    currentPage.value = pagination.current || 1
    currentPageSize.value = pagination.pageSize || props.pageSize
  }
  
  // 處理排序（如果需要服務端排序，可以在這裡處理）
  if (sorter && sorter.field) {
    // 前端排序已由 Ant Design Table 自動處理
    // 如果需要服務端排序，可以在這裡發送請求
  }
}

// 處理編輯
const handleEdit = (record) => {
  emit('edit', record)
}

// 處理刪除
const handleDelete = async (planId) => {
  deletingId.value = planId
  isDeleting.value = true
  try {
    await emit('delete', planId)
    // 清空選擇（如果刪除的是選中的項目）
    selectedRowKeys.value = selectedRowKeys.value.filter(id => id !== planId)
  } finally {
    isDeleting.value = false
    deletingId.value = null
  }
}

// 處理批量刪除
const handleBatchDelete = () => {
  if (selectedRowKeys.value.length === 0) {
    return
  }
  const keysToDelete = [...selectedRowKeys.value]
  selectedRowKeys.value = [] // 先清空選擇，避免 UI 延遲
  emit('batch-delete', keysToDelete)
}

// 處理新增
const handleAdd = () => {
  emit('add')
}

// 暴露方法
defineExpose({
  clearSelection: () => {
    selectedRowKeys.value = []
  },
  getSelectedRows: () => {
    return filteredPlans.value.filter(plan => selectedRowKeys.value.includes(plan.billingPlanId))
  }
})
</script>

<style scoped>
.billing-plan-list {
  width: 100%;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.statistics-bar {
  margin-bottom: 16px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
}

.billing-plan-table {
  width: 100%;
}

/* 行樣式區分 */
:deep(.billing-plan-row-recurring) {
  background-color: #f0f7ff;
}

:deep(.billing-plan-row-recurring:hover) {
  background-color: #e6f4ff !important;
}

:deep(.billing-plan-row-one-time) {
  background-color: #f6ffed;
}

:deep(.billing-plan-row-one-time:hover) {
  background-color: #f0f9e8 !important;
}

.amount-cell {
  font-weight: 500;
  color: #1890ff;
}

.month-details {
  margin-top: 4px;
  font-size: 12px;
}

.month-badge {
  display: inline-block;
  padding: 2px 6px;
  background: #e6f4ff;
  border-radius: 2px;
  color: #1890ff;
  font-size: 11px;
}

.text-muted {
  color: #8c8c8c;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .action-bar :deep(.ant-space) {
    width: 100%;
    justify-content: space-between;
  }

  .statistics-bar :deep(.ant-space) {
    flex-wrap: wrap;
  }
}

/* 可訪問性增強 */
:deep(.ant-table-row) {
  cursor: pointer;
}

:deep(.ant-table-row:focus) {
  outline: 2px solid #1890ff;
  outline-offset: -2px;
}

:deep(.ant-btn-link) {
  padding: 0 4px;
}
</style>


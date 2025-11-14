<template>
  <div class="table-container">
    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="clients"
      :loading="loading"
      :row-selection="rowSelection"
      :row-key="(record) => record.clientId || record.client_id || record.id"
      :pagination="false"
      size="middle"
      class="responsive-table"
    >
      <template #emptyText>
        <div class="empty-state-wrapper">
          <a-empty description="暫無客戶數據">
            <template #image>
              <InboxOutlined style="font-size: 48px; color: #d9d9d9" />
            </template>
          </a-empty>
        </div>
      </template>
      <!-- 客戶編號 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'clientId'">
          <span class="table-cell-mono">
            {{ record.clientId || record.client_id }}
          </span>
        </template>
        
        <!-- 公司名稱 -->
        <template v-else-if="column.key === 'companyName'">
          <a
            :href="`/clients/${record.clientId || record.client_id || record.id}`"
            @click.prevent="handleViewClient(record.clientId || record.client_id || record.id)"
            class="table-cell-link"
          >
            {{ record.companyName || record.company_name }}
          </a>
        </template>
        
        <!-- 聯絡人 -->
        <template v-else-if="column.key === 'contact_person_1'">
          {{ record.contact_person_1 || record.contactPerson1 || '' }}
        </template>
        
        <!-- 負責人 -->
        <template v-else-if="column.key === 'assigneeName'">
          {{ record.assigneeName || record.assignee_name || '未分配' }}
        </template>
        
        <!-- 標籤 -->
        <template v-else-if="column.key === 'tags'">
          <div v-if="getTags(record).length > 0" style="display: flex; flex-wrap: wrap; gap: 2px">
            <a-tag
              v-for="(tag, index) in getTags(record).slice(0, 2)"
              :key="index"
              :color="getTagColor(tag)"
              style="margin: 0; font-size: 11px; padding: 0 4px; line-height: 18px"
            >
              {{ getTagName(tag) }}
            </a-tag>
            <a-tag v-if="getTags(record).length > 2" color="default" style="margin: 0; font-size: 11px; padding: 0 4px">
              +{{ getTags(record).length - 2 }}
            </a-tag>
          </div>
          <span v-else style="color: #999; font-size: 12px">-</span>
        </template>
        
        <!-- 服務數量 -->
        <template v-else-if="column.key === 'services_count'">
          <a-tag v-if="getServiceCount(record) > 0" color="blue">
            {{ getServiceCount(record) }}
          </a-tag>
          <span v-else style="color: #999">無</span>
        </template>
        
        <!-- 全年收費 -->
        <template v-else-if="column.key === 'year_total'">
          <span v-if="getYearTotal(record) > 0" style="color: #52c41a; font-size: 12px">
            {{ formatCurrency(getYearTotal(record)) }}
          </span>
          <span v-else style="color: #999; font-size: 12px">-</span>
        </template>
        
        <!-- 操作 -->
        <template v-else-if="column.key === 'action'">
          <a-popconfirm
            title="確定要刪除此客戶嗎？"
            description="刪除後將無法復原。"
            ok-text="確定"
            cancel-text="取消"
            @confirm="handleDeleteClient(record.clientId || record.client_id || record.id)"
          >
            <a-button type="link" size="small" danger>
              刪除
            </a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>
    
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { InboxOutlined } from '@ant-design/icons-vue'
import { formatCurrency, formatDate } from '@/utils/formatters'

const props = defineProps({
  clients: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    default: () => ({
      current: 1,
      pageSize: 50,
      total: 0
    })
  },
  selectedClientIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'selection-change',
  'page-change',
  'view-client',
  'delete-client'
])

// 本地分頁狀態
const currentPage = ref(props.pagination.current)
const currentPageSize = ref(props.pagination.pageSize)

// 同步 props 變化
watch(() => props.pagination.current, (val) => {
  currentPage.value = val
})

watch(() => props.pagination.pageSize, (val) => {
  currentPageSize.value = val
})

// 表格列定義 - 優化欄位寬度配置
const columns = [
  {
    title: '客戶編號',
    dataIndex: 'clientId',
    key: 'clientId',
    width: 95,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '公司名稱',
    dataIndex: 'companyName',
    key: 'companyName',
    width: 180,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '統編',
    dataIndex: 'taxId',
    key: 'taxId',
    width: 90,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '聯絡人',
    dataIndex: 'contact_person_1',
    key: 'contact_person_1',
    width: 80,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '電話',
    dataIndex: 'phone',
    key: 'phone',
    width: 110,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '負責人',
    dataIndex: 'assigneeName',
    key: 'assigneeName',
    width: 80,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '標籤',
    key: 'tags',
    width: 130,
    ellipsis: {
      showTitle: false
    }
  },
  {
    title: '服務',
    key: 'services_count',
    width: 60,
    align: 'center'
  },
  {
    title: '收費',
    key: 'year_total',
    width: 90,
    align: 'right'
  },
  {
    title: '操作',
    key: 'action',
    width: 70,
    align: 'center',
    fixed: 'right'
  }
]

// 行選擇配置
const rowSelection = computed(() => ({
  selectedRowKeys: props.selectedClientIds,
  onChange: (selectedRowKeys) => {
    emit('selection-change', selectedRowKeys)
  }
}))

// 獲取標籤列表
const getTags = (record) => {
  if (Array.isArray(record.tags)) {
    return record.tags
  } else if (typeof record.tags === 'string' && record.tags.trim() !== '') {
    // 兼容後端以 "id:name:color|id:name:color" 傳回的格式
    return record.tags.split('|').map(part => {
      const [id, name, color] = part.split(':')
      return {
        tag_id: id,
        tag_name: name,
        tag_color: color || '#999'
      }
    })
  }
  return []
}

// 獲取標籤名稱
const getTagName = (tag) => {
  if (typeof tag === 'string') return tag
  return tag.tag_name || tag.tagName || ''
}

// 獲取標籤顏色
const getTagColor = (tag) => {
  if (typeof tag === 'string') return '#999'
  const color = tag.tag_color || tag.tagColor || '#999'
  // 如果已經是 hex 格式，直接返回；否則返回默認值
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#999'
}

// 獲取服務數量
const getServiceCount = (record) => {
  return Number(record.services_count || record.servicesCount || (Array.isArray(record.services) ? record.services.length : 0)) || 0
}

// 獲取全年收費
const getYearTotal = (record) => {
  return Number(record.year_total || record.yearTotal || 0) || 0
}

// 格式化日期（只顯示日期部分）
const formatDateOnly = (dateStr) => {
  if (!dateStr) return ''
  // 如果包含時間，只取日期部分
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0]
  }
  if (dateStr.includes(' ')) {
    return dateStr.split(' ')[0]
  }
  return dateStr
}

// 處理分頁變化
const handlePageChange = (page, pageSize) => {
  currentPage.value = page
  currentPageSize.value = pageSize
  emit('page-change', page, pageSize)
}

// 處理查看客戶
const handleViewClient = (clientId) => {
  emit('view-client', clientId)
}

// 處理刪除客戶
const handleDeleteClient = (clientId) => {
  emit('delete-client', clientId)
}
</script>

<style scoped>
/* 表格容器 - 防止水平滾動和雙重滾動條 */
.table-container {
  width: 100%;
  overflow: visible;
}

/* 响应式表格样式 */
.responsive-table {
  width: 100%;
}

.responsive-table :deep(.ant-table) {
  font-size: 13px;
}

.responsive-table :deep(.ant-table-container) {
  overflow: visible;
}

.responsive-table :deep(.ant-table-content) {
  overflow: visible !important;
}

.responsive-table :deep(.ant-table-body) {
  overflow-y: visible !important;
  overflow-x: hidden !important;
}

.responsive-table :deep(.ant-table-thead > tr > th) {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  background-color: var(--color-bg-hover);
  padding: 10px 6px;
  white-space: nowrap;
}

.responsive-table :deep(.ant-table-tbody > tr > td) {
  padding: 10px 6px;
  font-size: 13px;
  color: var(--color-text-regular);
}

.responsive-table :deep(.ant-table-tbody > tr:hover > td) {
  background-color: var(--color-table-row-hover);
}

/* 表格单元格样式 */
.table-cell-mono {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.table-cell-link {
  color: var(--color-primary);
  transition: var(--transition-base);
}

.table-cell-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

/* 标签容器 */
.responsive-table :deep(.ant-tag) {
  margin: 0 2px 4px 0;
  font-size: 12px;
  padding: 2px 8px;
  line-height: 20px;
}

/* 操作按钮 */
.responsive-table :deep(.ant-btn-link) {
  padding: 0 4px;
  height: auto;
  font-size: 14px;
}

/* 空状态置中样式 */
.empty-state-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
}

.responsive-table :deep(.ant-empty) {
  margin: 0 auto;
}

/* 响应式隐藏列 */
@media (max-width: 1200px) {
  .responsive-table :deep(.ant-table-thead > tr > th[data-responsive]),
  .responsive-table :deep(.ant-table-tbody > tr > td[data-responsive]) {
    display: none;
  }
}
</style>


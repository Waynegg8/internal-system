<template>
  <div>
    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="receipts"
      :loading="loading"
      :row-key="(record) => record.receiptId || record.receipt_id || record.id"
      :pagination="false"
      size="middle"
      class="responsive-table"
    >
      <!-- 收據編號 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'receiptId'">
          <span class="table-cell-mono">
            {{ record.receiptId || record.receipt_id }}
          </span>
        </template>
        
        <!-- 客戶名稱 -->
        <template v-else-if="column.key === 'clientName'">
          <span>
            {{ record.clientName || record.client_name || '—' }}
          </span>
        </template>
        
        <!-- 統一編號 -->
        <template v-else-if="column.key === 'clientTaxId'">
          {{ record.clientTaxId || record.client_tax_id || '—' }}
        </template>
        
        <!-- 收據日期 -->
        <template v-else-if="column.key === 'receiptDate'">
          {{ formatDate(record.receiptDate || record.receipt_date) }}
        </template>
        
        <!-- 到期日期 -->
        <template v-else-if="column.key === 'dueDate'">
          <span :style="isOverdue(record) ? { color: '#ef4444' } : {}">
            {{ formatDate(record.dueDate || record.due_date) }}
          </span>
        </template>
        
        <!-- 總金額 -->
        <template v-else-if="column.key === 'totalAmount'">
          <span class="table-cell-amount">
            {{ formatCurrency(record.totalAmount || record.total_amount || 0) }}
          </span>
        </template>
        
        <!-- 狀態 -->
        <template v-else-if="column.key === 'status'">
          <a-tag :color="getStatusColor(record)">
            {{ getStatusText(record) }}
          </a-tag>
        </template>
        
        <!-- 收據類型 -->
        <template v-else-if="column.key === 'receiptType'">
          <a-tag :color="getReceiptTypeColor(record)">
            {{ getReceiptTypeText(record) }}
          </a-tag>
        </template>
        
        <!-- 操作 -->
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleViewReceipt(record.receiptId || record.receipt_id || record.id)">
            查看
          </a-button>
        </template>
      </template>
    </a-table>
    
    <!-- 分頁 -->
    <div v-if="!loading && receipts.length > 0" style="margin-top: 16px; text-align: right">
      <a-pagination
        v-model:current="currentPage"
        v-model:page-size="currentPageSize"
        :total="pagination.total"
        :show-total="(total) => `共 ${total} 筆`"
        :show-size-changer="true"
        :page-size-options="['20', '50', '100']"
        @change="handlePageChange"
        @show-size-change="handlePageChange"
      />
    </div>
    
    <!-- 空狀態 -->
    <a-empty
      v-if="!loading && receipts.length === 0"
      description="暫無收據數據"
      style="padding: 40px 0"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { formatCurrency, formatDate } from '@/utils/formatters'
import dayjs from 'dayjs'

const props = defineProps({
  receipts: {
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
  }
})

const emit = defineEmits(['page-change', 'view-receipt'])

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

// 表格列定義 - 优化列宽，避免水平滚动
const columns = [
  {
    title: '收據編號',
    dataIndex: 'receiptId',
    key: 'receiptId',
    width: 100,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '客戶名稱',
    dataIndex: 'clientName',
    key: 'clientName',
    width: '20%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '統一編號',
    dataIndex: 'clientTaxId',
    key: 'clientTaxId',
    width: 100,
    ellipsis: {
      showTitle: true
    },
    responsive: ['lg']
  },
  {
    title: '收據日期',
    key: 'receiptDate',
    width: 100
  },
  {
    title: '到期日期',
    key: 'dueDate',
    width: 100
  },
  {
    title: '總金額',
    key: 'totalAmount',
    width: 110,
    align: 'right'
  },
  {
    title: '狀態',
    key: 'status',
    width: 100,
    align: 'center'
  },
  {
    title: '類型',
    key: 'receiptType',
    width: 90,
    align: 'center',
    responsive: ['lg']
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    align: 'center'
  }
]

// 判斷是否已逾期
const isOverdue = (record) => {
  const dueDate = record.dueDate || record.due_date
  if (!dueDate) return false
  
  const status = record.status
  const today = dayjs().startOf('day')
  const due = dayjs(dueDate).startOf('day')
  
  // 如果到期日期小於今天且狀態為未付款或部分付款，則為已逾期
  return due.isBefore(today) && (status === 'unpaid' || status === 'partial')
}

// 獲取狀態顏色
const getStatusColor = (record) => {
  const status = record.status
  
  // 如果已逾期，返回紅色
  if (isOverdue(record)) {
    return 'error'
  }
  
  // 根據狀態返回顏色
  switch (status) {
    case 'unpaid':
      return 'error'
    case 'partial':
      return 'warning'
    case 'paid':
      return 'success'
    case 'cancelled':
      return 'default'
    case 'overdue':
      return 'error'
    default:
      return 'default'
  }
}

// 獲取狀態文字
const getStatusText = (record) => {
  const status = record.status
  
  // 如果已逾期，顯示「已逾期」
  if (isOverdue(record)) {
    return '已逾期'
  }
  
  // 根據狀態返回文字
  switch (status) {
    case 'unpaid':
      return '未付款'
    case 'partial':
      return '部分付款'
    case 'paid':
      return '已付款'
    case 'cancelled':
      return '已取消'
    case 'overdue':
      return '已逾期'
    default:
      return status || '—'
  }
}

// 獲取收據類型顏色
const getReceiptTypeColor = (record) => {
  const type = record.receiptType || record.receipt_type
  switch (type) {
    case 'normal':
      return 'processing'
    case 'prepayment':
      return 'cyan'
    case 'deposit':
      return 'purple'
    default:
      return 'default'
  }
}

// 獲取收據類型文字
const getReceiptTypeText = (record) => {
  const type = record.receiptType || record.receipt_type
  switch (type) {
    case 'normal':
      return '一般收據'
    case 'prepayment':
      return '預收款'
    case 'deposit':
      return '押金'
    default:
      return type || '—'
  }
}

// 處理分頁變化
const handlePageChange = (page, pageSize) => {
  currentPage.value = page
  currentPageSize.value = pageSize
  emit('page-change', page, pageSize)
}

// 處理查看收據
const handleViewReceipt = (receiptId) => {
  emit('view-receipt', receiptId)
}
</script>


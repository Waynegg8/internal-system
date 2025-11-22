<template>
  <a-table
    :columns="columns"
    :data-source="records"
    :loading="loading"
    :row-key="getRowKey"
    :pagination="false"
    class="responsive-table"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <!-- 項目名稱 -->
      <template v-if="column.key === 'costName'">
        {{ getCostName(record) }}
      </template>
      
      <!-- 金額 -->
      <template v-else-if="column.key === 'amount'">
        <span class="table-cell-amount">
          {{ formatCurrency(getAmount(record)) }}
        </span>
      </template>
      
      <!-- 備註 -->
      <template v-else-if="column.key === 'notes'">
        {{ getNotes(record) || '—' }}
      </template>
      
      <!-- 錄入人 -->
      <template v-else-if="column.key === 'createdBy'">
        {{ getCreatedBy(record) || '—' }}
      </template>
      
      <!-- 操作 -->
      <template v-else-if="column.key === 'action'">
        <a-button type="link" size="small" @click="handleEdit(record)">
          編輯
        </a-button>
        <a-button type="link" size="small" danger @click="handleDelete(record)">刪除</a-button>
      </template>
    </template>
    
    <template #emptyText>
      <a-empty description="尚無資料" />
    </template>
  </a-table>
</template>

<script setup>
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete'])

// 表格列定義 - 优化列宽，避免水平滚动
const columns = [
  {
    title: '項目名稱',
    key: 'costName',
    dataIndex: 'costName',
    width: '25%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '金額',
    key: 'amount',
    width: 110,
    align: 'right'
  },
  {
    title: '備註',
    key: 'notes',
    width: '30%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    },
    responsive: ['lg']
  },
  {
    title: '錄入人',
    key: 'createdBy',
    width: 100,
    ellipsis: {
      showTitle: true
    },
    responsive: ['lg']
  },
  {
    title: '操作',
    key: 'action',
    width: 120,
    align: 'center'
  }
]

// 獲取行鍵
const getRowKey = (record) => {
  return record.id || record.costId || record.cost_id || record.overheadCostId
}

// 獲取項目名稱
const getCostName = (record) => {
  return record.costName || record.cost_name || record.costTypeName || record.cost_type_name || '—'
}

// 獲取金額
const getAmount = (record) => {
  return record.amount || 0
}

// 獲取備註
const getNotes = (record) => {
  return record.notes || ''
}

// 獲取錄入人
const getCreatedBy = (record) => {
  return (
    record.recordedBy ||
    record.recorded_by ||
    record.createdBy ||
    record.created_by ||
    record.creatorName ||
    record.creator_name ||
    ''
  )
}

// 處理編輯
const handleEdit = (record) => {
  emit('edit', record)
}

// 處理刪除
const handleDelete = (record) => {
  const costId = record.id || record.costId || record.cost_id || record.overheadCostId
  emit('delete', costId)
}
</script>


<template>
  <div class="overhead-costs-table">
    <a-table
      :columns="columns"
      :data-source="costs"
      :pagination="pagination"
      :loading="loading"
      :scroll="{ x: 800 }"
      size="small"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'amount'">
          {{ formatCurrency(record.amount) }}
        </template>
        <template v-if="column.key === 'costTypeName'">
          <a-tag :color="getAllocationMethodColor(record.allocation_method)">
            {{ record.costTypeName || record.cost_name }}
          </a-tag>
        </template>
        <template v-if="column.key === 'allocationMethod'">
          {{ getAllocationMethodName(record.allocation_method) }}
        </template>
        <template v-if="column.key === 'actions'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="handleEdit(record)"
            >
              編輯
            </a-button>
            <a-button
              type="link"
              size="small"
              danger
              @click="handleDelete(record)"
            >
              刪除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  costs: {
    type: Array,
    default: () => []
  },
  costTypes: {
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
      pageSize: 10,
      total: 0,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 條，共 ${total} 條`
    })
  }
})

// Emits
const emit = defineEmits(['edit', 'delete', 'change'])

// Table columns
const columns = [
  {
    title: '成本項目',
    dataIndex: 'costTypeName',
    key: 'costTypeName',
    width: 200,
    ellipsis: true
  },
  {
    title: '分攤方式',
    dataIndex: 'allocationMethod',
    key: 'allocationMethod',
    width: 150
  },
  {
    title: '金額',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right'
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    align: 'center',
    fixed: 'right'
  }
]

// Methods
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const getAllocationMethodName = (method) => {
  const methodNames = {
    per_employee: '按員工數分攤',
    per_hour: '按工時分攤',
    per_revenue: '按收入分攤'
  }
  return methodNames[method] || method
}

const getAllocationMethodColor = (method) => {
  const colors = {
    per_employee: 'blue',
    per_hour: 'green',
    per_revenue: 'orange'
  }
  return colors[method] || 'default'
}

const handleEdit = (record) => {
  emit('edit', record)
}

const handleDelete = (record) => {
  emit('delete', record)
}

const handleTableChange = (pagination, filters, sorter) => {
  emit('change', { pagination, filters, sorter })
}
</script>

<style scoped>
.overhead-costs-table {
  width: 100%;
}
</style>
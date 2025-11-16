<template>
  <a-card v-if="items && items.length > 0" title="收據明細">
    <a-table
      :columns="columns"
      :data-source="items"
      :pagination="false"
      :row-key="(record, index) => index"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'serviceName'">
          <span style="font-weight: 600">
            {{ record.serviceName || record.service_name || '—' }}
          </span>
        </template>
        
        <template v-else-if="column.key === 'quantity'">
          <span style="text-align: center; display: block">
            {{ record.quantity || 0 }}
          </span>
        </template>
        
        <template v-else-if="column.key === 'unitPrice'">
          <span style="text-align: right; display: block">
            {{ formatCurrency(record.unitPrice || record.unit_price || 0) }}
          </span>
        </template>
        
        <template v-else-if="column.key === 'subtotal'">
          <span style="text-align: right; display: block; font-weight: 700; font-size: 15px">
            {{ formatCurrency(record.subtotal || 0) }}
          </span>
        </template>
        
        <template v-else-if="column.key === 'notes'">
          <span style="color: #64748b">
            {{ record.notes || '—' }}
          </span>
        </template>
      </template>
    </a-table>
  </a-card>
</template>

<script setup>
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

// 表格列定義
const columns = [
  {
    title: '服務項目',
    key: 'serviceName',
    width: 200
  },
  {
    title: '數量',
    key: 'quantity',
    width: 100,
    align: 'center'
  },
  {
    title: '單價',
    key: 'unitPrice',
    width: 120,
    align: 'right'
  },
  {
    title: '小計',
    key: 'subtotal',
    width: 120,
    align: 'right'
  },
  {
    title: '備註',
    key: 'notes',
    width: 200,
    ellipsis: true
  }
]
</script>







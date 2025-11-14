<template>
  <a-card title="收款記錄">
    <a-table
      v-if="payments && payments.length > 0"
      :columns="columns"
      :data-source="payments"
      :pagination="false"
      :row-key="(record, index) => record.id || index"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'paymentDate'">
          <span style="font-weight: 600">
            {{ formatDate(record.paymentDate || record.payment_date) }}
          </span>
        </template>
        
        <template v-else-if="column.key === 'paymentAmount'">
          <span style="color: #10b981; font-weight: 700; font-size: 15px; text-align: right; display: block">
            {{ formatCurrency(record.paymentAmount || record.payment_amount || 0) }}
          </span>
        </template>
        
        <template v-else-if="column.key === 'paymentMethod'">
          {{ getPaymentMethodText(record.paymentMethod || record.payment_method) }}
        </template>
        
        <template v-else-if="column.key === 'referenceNumber'">
          <span style="color: #64748b">
            {{ record.referenceNumber || record.reference_number || '—' }}
          </span>
        </template>
        
        <template v-else-if="column.key === 'createdBy'">
          {{ record.created_by_name || record.createdBy || record.created_by || '—' }}
        </template>
        
        <template v-else-if="column.key === 'notes'">
          <span style="color: #64748b">
            {{ record.notes || '—' }}
          </span>
        </template>
      </template>
    </a-table>
    
    <a-empty
      v-else
      description="尚無收款記錄"
      style="padding: 40px 0"
    />
  </a-card>
</template>

<script setup>
import { formatCurrency, formatDate, formatPaymentMethod } from '@/utils/formatters'

const props = defineProps({
  payments: {
    type: Array,
    default: () => []
  }
})

// 表格列定義
const columns = [
  {
    title: '收款日期',
    key: 'paymentDate',
    width: 120
  },
  {
    title: '收款金額',
    key: 'paymentAmount',
    width: 120,
    align: 'right'
  },
  {
    title: '收款方式',
    key: 'paymentMethod',
    width: 120
  },
  {
    title: '參考號碼',
    key: 'referenceNumber',
    width: 150
  },
  {
    title: '記錄人',
    key: 'createdBy',
    width: 120
  },
  {
    title: '備註',
    key: 'notes',
    width: 200,
    ellipsis: true
  }
]

// 獲取收款方式文字
const getPaymentMethodText = (method) => {
  if (!method) return '—'
  
  const methodMap = {
    'cash': '現金',
    'transfer': '轉帳',
    'check': '支票',
    'other': '其他'
  }
  
  return methodMap[method] || formatPaymentMethod(method) || method
}
</script>


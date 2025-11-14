<template>
  <a-card>
    <template #title>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <a-typography-title :level="3" style="margin: 0">
          收據 {{ receipt?.receiptId || receipt?.receipt_id || '—' }}
        </a-typography-title>
        <a-tag :color="statusColor">
          {{ statusText }}
        </a-tag>
      </div>
    </template>
    
    <a-descriptions :column="{ xs: 1, sm: 2, md: 3, lg: 4 }" bordered>
      <a-descriptions-item label="客戶名稱">
        {{ receipt?.clientName || receipt?.client_name || '—' }}
      </a-descriptions-item>
      
      <a-descriptions-item label="統一編號">
        {{ receipt?.clientTaxId || receipt?.client_tax_id || '—' }}
      </a-descriptions-item>
      
      <a-descriptions-item label="開立日期">
        {{ formatDate(receipt?.receiptDate || receipt?.receipt_date) }}
      </a-descriptions-item>
      
      <a-descriptions-item label="到期日期">
        {{ formatDate(receipt?.dueDate || receipt?.due_date) || '—' }}
      </a-descriptions-item>
      
      <a-descriptions-item label="收據類型">
        {{ getReceiptTypeText(receipt?.receiptType || receipt?.receipt_type) }}
      </a-descriptions-item>

      <a-descriptions-item label="應計月份">
        {{ receipt?.serviceMonth || receipt?.service_month || '—' }}
      </a-descriptions-item>

      <a-descriptions-item label="服務期間">
        <template v-if="servicePeriod">
          {{ servicePeriod }}
        </template>
        <template v-else>
          —
        </template>
      </a-descriptions-item>

      <a-descriptions-item label="服務類型" :span="serviceTypeNames.length > 0 ? 2 : 1">
        <template v-if="serviceTypeNames.length">
          <a-space wrap>
            <a-tag v-for="name in serviceTypeNames" :key="name">{{ name }}</a-tag>
          </a-space>
        </template>
        <template v-else>
          —
        </template>
      </a-descriptions-item>
      
      <a-descriptions-item label="總金額">
        <a-typography-title :level="4" style="margin: 0; color: #0f172a">
          {{ formatCurrency(receipt?.totalAmount || receipt?.total_amount || 0) }}
        </a-typography-title>
      </a-descriptions-item>
      
      <a-descriptions-item label="已收金額">
        <span style="color: #10b981; font-size: 20px; font-weight: 700">
          {{ formatCurrency(receipt?.paidAmount || receipt?.paid_amount || 0) }}
        </span>
      </a-descriptions-item>
      
      <a-descriptions-item label="未收金額">
        <span style="color: #ef4444; font-size: 20px; font-weight: 700">
          {{ formatCurrency(receipt?.outstandingAmount || receipt?.outstanding_amount || 0) }}
        </span>
      </a-descriptions-item>
      
      <a-descriptions-item label="扣繳金額">
        {{ formatCurrency(receipt?.withholdingAmount || receipt?.withholding_amount || 0) }}
      </a-descriptions-item>
      
      <a-descriptions-item label="建立人">
        {{ receipt?.createdByName || receipt?.created_by_name || '—' }}
      </a-descriptions-item>
      
      <a-descriptions-item label="建立時間">
        {{ formatDateTime(receipt?.createdAt || receipt?.created_at) || '—' }}
      </a-descriptions-item>
      
      <a-descriptions-item v-if="receipt?.notes" label="備註" :span="4">
        <div style="white-space: pre-wrap; color: #475569">
          {{ receipt.notes }}
        </div>
      </a-descriptions-item>
    </a-descriptions>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters'

const props = defineProps({
  receipt: {
    type: Object,
    default: null
  }
})

const servicePeriod = computed(() => {
  if (!props.receipt) return ''
  const start = props.receipt.serviceStartMonth || props.receipt.service_start_month
  const end = props.receipt.serviceEndMonth || props.receipt.service_end_month
  if (start && end) {
    return start === end ? start : `${start} ~ ${end}`
  }
  if (start || end) {
    return start || end
  }
  return ''
})

const serviceTypeNames = computed(() => {
  if (!props.receipt) return []
  const types = props.receipt.serviceTypes || props.receipt.service_types || []
  return types
    .map((item) => item?.service_name || item?.serviceName || '')
    .filter((name) => name)
})

// 判斷是否已逾期
const isOverdue = computed(() => {
  if (!props.receipt) return false
  
  const dueDate = props.receipt.dueDate || props.receipt.due_date
  if (!dueDate) return false
  
  const status = props.receipt.status
  const today = dayjs().startOf('day')
  const due = dayjs(dueDate).startOf('day')
  
  // 如果到期日期小於今天且狀態為未付款或部分付款，則為已逾期
  return due.isBefore(today) && (status === 'unpaid' || status === 'partial')
})

// 獲取狀態顏色
const statusColor = computed(() => {
  if (!props.receipt) return 'default'
  
  const status = props.receipt.status
  
  // 如果已逾期，返回紅色
  if (isOverdue.value) {
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
})

// 獲取狀態文字
const statusText = computed(() => {
  if (!props.receipt) return '—'
  
  const status = props.receipt.status
  
  // 如果已逾期，顯示「已逾期」
  if (isOverdue.value) {
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
      return '已作廢'
    case 'overdue':
      return '已逾期'
    default:
      return status || '—'
  }
})

// 獲取收據類型文字
const getReceiptTypeText = (type) => {
  if (!type) return '—'
  
  switch (type) {
    case 'normal':
      return '一般收據'
    case 'prepayment':
      return '預收款'
    case 'deposit':
      return '押金'
    default:
      return type
  }
}
</script>


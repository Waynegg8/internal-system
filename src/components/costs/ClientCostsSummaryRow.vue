<template>
  <a-card style="margin-top: 16px">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-statistic
          title="總成本"
          :value="displayTotalCost"
          :value-style="{ color: '#1890ff' }"
        />
      </a-col>
      <a-col :span="6">
        <a-statistic
          title="總收入"
          :value="displayTotalRevenue"
          :value-style="{ color: '#52c41a' }"
        />
      </a-col>
      <a-col :span="6">
        <a-statistic
          title="總利潤"
          :value="displayTotalProfit"
          :value-style="{ color: profitColor }"
        />
      </a-col>
      <a-col :span="6">
        <a-statistic
          title="平均利潤率"
          :value="displayAvgMargin"
          :value-style="{ color: '#722ed1' }"
        />
      </a-col>
    </a-row>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  summary: {
    type: Object,
    default: null
  },
  totalCost: {
    type: Number,
    default: null
  },
  totalRevenue: {
    type: Number,
    default: null
  },
  totalProfit: {
    type: Number,
    default: null
  },
  avgMargin: {
    type: Number,
    default: null
  }
})

// 獲取總成本
const computedTotalCost = computed(() => {
  if (props.summary && props.summary.totalCost !== undefined) {
    return props.summary.totalCost
  }
  if (props.totalCost !== null && props.totalCost !== undefined) {
    return props.totalCost
  }
  return null
})

// 獲取總收入
const computedTotalRevenue = computed(() => {
  if (props.summary && props.summary.totalRevenue !== undefined) {
    return props.summary.totalRevenue
  }
  if (props.totalRevenue !== null && props.totalRevenue !== undefined) {
    return props.totalRevenue
  }
  return null
})

// 獲取總利潤
const computedTotalProfit = computed(() => {
  if (props.summary && props.summary.totalProfit !== undefined) {
    return props.summary.totalProfit
  }
  if (props.totalProfit !== null && props.totalProfit !== undefined) {
    return props.totalProfit
  }
  return null
})

// 獲取平均利潤率
const computedAvgMargin = computed(() => {
  if (props.summary && props.summary.avgMargin !== undefined) {
    return props.summary.avgMargin
  }
  if (props.avgMargin !== null && props.avgMargin !== undefined) {
    return props.avgMargin
  }
  return null
})

// 顯示總成本
const displayTotalCost = computed(() => {
  if (computedTotalCost.value !== null) {
    return formatCurrency(computedTotalCost.value)
  }
  return '—'
})

// 顯示總收入
const displayTotalRevenue = computed(() => {
  if (computedTotalRevenue.value !== null) {
    return formatCurrency(computedTotalRevenue.value)
  }
  return '—'
})

// 顯示總利潤
const displayTotalProfit = computed(() => {
  if (computedTotalProfit.value !== null) {
    return formatCurrency(computedTotalProfit.value)
  }
  return '—'
})

// 利潤顏色
const profitColor = computed(() => {
  const profit = computedTotalProfit.value
  if (profit === null || profit === undefined) return '#666'
  return profit >= 0 ? '#52c41a' : '#ff4d4f'
})

// 顯示平均利潤率
const displayAvgMargin = computed(() => {
  if (computedAvgMargin.value !== null && computedAvgMargin.value !== undefined) {
    return (Number(computedAvgMargin.value) * 100).toFixed(1) + '%'
  }
  return '—'
})
</script>













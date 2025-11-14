<template>
  <a-card title="統計摘要" style="margin-bottom: 16px">
    <a-row :gutter="16">
      <a-col :span="8">
        <a-statistic
          title="本月總管理費用"
          :value="displayTotal"
          :value-style="{ color: '#1890ff' }"
        >
          <template #formatter="{ value }">
            {{ formatStatValue(value) }}
          </template>
        </a-statistic>
      </a-col>
      <a-col :span="8">
        <a-statistic
          title="固定費用"
          :value="displayTotalFixed"
          :value-style="{ color: '#52c41a' }"
        >
          <template #formatter="{ value }">
            {{ formatStatValue(value) }}
          </template>
        </a-statistic>
      </a-col>
      <a-col :span="8">
        <a-statistic
          title="變動費用"
          :value="displayTotalVariable"
          :value-style="{ color: '#faad14' }"
        >
          <template #formatter="{ value }">
            {{ formatStatValue(value) }}
          </template>
        </a-statistic>
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
  total: {
    type: Number,
    default: null
  },
  totalFixed: {
    type: Number,
    default: null
  },
  totalVariable: {
    type: Number,
    default: null
  }
})

// 顯示總費用
const displayTotal = computed(() => {
  if (props.summary && props.summary.total !== undefined) {
    return props.summary.total
  }
  if (props.total !== null && props.total !== undefined) {
    return props.total
  }
  return null
})

// 顯示固定費用
const displayTotalFixed = computed(() => {
  if (props.summary && props.summary.totalFixed !== undefined) {
    return props.summary.totalFixed
  }
  if (props.totalFixed !== null && props.totalFixed !== undefined) {
    return props.totalFixed
  }
  return null
})

// 顯示變動費用
const displayTotalVariable = computed(() => {
  if (props.summary && props.summary.totalVariable !== undefined) {
    return props.summary.totalVariable
  }
  if (props.totalVariable !== null && props.totalVariable !== undefined) {
    return props.totalVariable
  }
  return null
})

const formatStatValue = (value) => {
  if (value === null || value === undefined) {
    return '—'
  }
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return '—'
  }
  if (Math.abs(num) < 1e-6) {
    return '-'
  }
  return formatCurrency(num)
}
</script>


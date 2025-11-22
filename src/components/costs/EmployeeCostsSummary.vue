<template>
  <a-card style="margin-top: 16px">
    <a-row :gutter="16">
      <a-col :span="24">
        <a-statistic
          title="本月總計"
          :value="displayTotalCost"
          :value-style="{ color: '#1890ff', fontSize: '24px' }"
        />
      </a-col>
    </a-row>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  totalCost: {
    type: Number,
    default: null
  }
})

// 顯示總成本
const displayTotalCost = computed(() => {
  if (props.totalCost !== null && props.totalCost !== undefined) {
    return formatCurrency(props.totalCost)
  }
  return '—'
})
</script>













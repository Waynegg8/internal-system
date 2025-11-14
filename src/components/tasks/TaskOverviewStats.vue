<template>
  <a-card>
    <template #title>
      <span>統計摘要</span>
    </template>

    <a-row :gutter="[16, 16]">
      <a-col :xs="12" :sm="8" :md="6" :lg="4">
        <a-statistic title="總任務數" :value="stats.total" />
      </a-col>
      <a-col :xs="12" :sm="8" :md="6" :lg="4">
        <a-statistic title="未完成數" :value="stats.unfinished" />
      </a-col>
      <a-col :xs="12" :sm="8" :md="6" :lg="4">
        <a-statistic title="已完成數" :value="stats.completed" />
      </a-col>
      <a-col :xs="12" :sm="8" :md="6" :lg="4">
        <a-statistic
          title="逾期數"
          :value="stats.overdue"
          :value-style="{ color: '#ef4444' }"
        />
      </a-col>
      <a-col :xs="12" :sm="8" :md="6" :lg="4">
        <a-statistic title="自動生成數" :value="stats.auto" />
      </a-col>
      <a-col :xs="12" :sm="8" :md="6" :lg="4">
        <a-statistic title="手動建立數" :value="stats.manual" />
      </a-col>
    </a-row>

    <div v-if="selectedMonths.length > 0" style="margin-top: 16px; color: #6b7280; font-size: 14px">
      選中月份: {{ formatMonths(selectedMonths) }}
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({
      total: 0,
      unfinished: 0,
      completed: 0,
      overdue: 0,
      auto: 0,
      manual: 0
    })
  },
  selectedMonths: {
    type: Array,
    default: () => []
  }
})

// 格式化月份顯示
const formatMonths = (months) => {
  return months.map(month => {
    const [year, monthNum] = month.split('-')
    return `${year}年${parseInt(monthNum)}月`
  }).join(', ')
}
</script>



<template>
  <a-card>
    <a-statistic
      title="本月總工時"
      :value="formattedTotal"
      suffix="小時"
    />
    <div class="hours-meta">
      <span>正常：{{ formattedNormal }}</span>
      <span class="separator">｜</span>
      <span>加班：{{ formattedOvertime }}</span>
      <span class="separator">｜</span>
      <span>達成率：{{ formattedCompletionRate }}</span>
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { fmtNum, fmtPct } from '@/utils/formatters'

const props = defineProps({
  hours: {
    type: Object,
    default: () => ({
      total: 0,
      normal: 0,
      overtime: 0,
      completionRate: 0
    })
  }
})

const formattedTotal = computed(() => {
  return fmtNum(props.hours?.total || 0)
})

const formattedNormal = computed(() => {
  return fmtNum(props.hours?.normal || 0)
})

const formattedOvertime = computed(() => {
  return fmtNum(props.hours?.overtime || 0)
})

const formattedCompletionRate = computed(() => {
  return fmtPct(props.hours?.completionRate || 0)
})
</script>

<style scoped>
:deep(.ant-card) {
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

:deep(.ant-card-head) {
  padding: 0 12px;
  min-height: 40px;
  flex-shrink: 0;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.ant-card-head-title) {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

:deep(.ant-card-body) {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.ant-statistic-title) {
  font-size: 13px;
  margin-bottom: 8px;
}

:deep(.ant-statistic-content) {
  font-size: 24px;
}

.hours-meta {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.separator {
  margin: 0 6px;
  color: #999;
}
</style>


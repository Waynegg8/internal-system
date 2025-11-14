<template>
  <a-card title="假期餘額">
    <div class="leaves-balance">
      <div class="balance-item">
        <span class="balance-label">特休剩餘</span>
        <span class="balance-value">{{ formattedAnnual }} 天</span>
      </div>
      <div class="balance-item">
        <span class="balance-label">病假剩餘</span>
        <span class="balance-value">{{ formattedSick }} 天</span>
      </div>
      <div class="balance-item">
        <span class="balance-label">補休</span>
        <span class="balance-value">{{ formattedCompHours }} 小時</span>
      </div>
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { fmtNum } from '@/utils/formatters'

const props = defineProps({
  leaves: {
    type: Object,
    default: () => ({
      balances: {
        annual: 0,
        sick: 0,
        compHours: 0
      }
    })
  }
})

const formattedAnnual = computed(() => {
  return fmtNum(props.leaves?.balances?.annual || 0)
})

const formattedSick = computed(() => {
  return fmtNum(props.leaves?.balances?.sick || 0)
})

const formattedCompHours = computed(() => {
  return fmtNum(props.leaves?.balances?.compHours || 0)
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

.leaves-balance {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.balance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}

.balance-item:last-child {
  border-bottom: none;
}

.balance-label {
  font-size: 13px;
  color: #666;
}

.balance-value {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
</style>




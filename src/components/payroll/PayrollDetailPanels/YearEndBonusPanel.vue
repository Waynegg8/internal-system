<template>
  <div class="year-end-bonus-panel">
    <div v-if="yearEndItems.length > 0" class="year-end-block">
      <div class="year-end-block__header">
        <span class="year-end-block__title">年終獎金明細</span>
        <span class="year-end-block__total">{{ formatCurrency(yearEndTotal / 100) }}</span>
      </div>
      <div class="year-end-block__body">
        <div
          v-for="item in yearEndItems"
          :key="item.id || item.name"
          class="year-end-row"
        >
          <span class="year-end-row__label">{{ item.name }}</span>
          <span class="year-end-row__value">
            {{ formatCurrency((item.amountCents || item.amount_cents || 0) / 100) }}
          </span>
        </div>
      </div>
    </div>
    <a-empty v-else description="無年終獎金記錄" :image="false" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  record: {
    type: Object,
    required: true
  }
})

// 獲取字段值
const getField = (camelKey, snakeKey) => {
  return props.record[camelKey] ?? props.record[snakeKey] ?? null
}

// 年終獎金項目
const yearEndItems = computed(() => {
  return getField('yearEndBonusItems', 'year_end_bonus_items') || []
})

// 年終獎金總額（分）
const yearEndTotal = computed(() => {
  return yearEndItems.value.reduce((sum, item) => {
    return sum + (item.amountCents || item.amount_cents || 0)
  }, 0)
})
</script>

<style scoped>
.year-end-bonus-panel {
  padding: 0;
}

.year-end-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.92em;
  color: #374151;
}

.year-end-block__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-weight: 600;
  color: #4b5563;
}

.year-end-block__total {
  color: #0f766e;
}

.year-end-block__body {
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.year-end-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.year-end-row__label {
  color: #1f2937;
}

.year-end-row__value {
  font-weight: 600;
  color: #1f2937;
}
</style>



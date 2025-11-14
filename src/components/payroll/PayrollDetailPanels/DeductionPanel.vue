<template>
  <div class="deduction-panel">
    <div v-if="deductionItems.length > 0" style="font-size: 0.9em;">
      <div style="margin-bottom: 4px;">
        <span v-for="(item, idx) in deductionItems" :key="item.id || item.name">
          {{ item.name }}{{ formatCurrency((item.amountCents || item.amount_cents || 0) / 100) }}<span v-if="idx < deductionItems.length - 1">、</span>
        </span>
      </div>
      <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb; font-weight: 600; color: #dc2626; text-align: right;">
        小計：{{ formatCurrency(deductionCents / 100) }}
      </div>
    </div>
    <a-empty v-else description="無固定扣款" :image="false" />
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

// 固定扣款項目
const deductionItems = computed(() => {
  return getField('deductionItems', 'deduction_items') || []
})

// 固定扣款總額（分）
const deductionCents = computed(() => {
  return getField('deductionCents', 'deduction_cents') || 0
})
</script>

<style scoped>
.deduction-panel {
  padding: 0;
}
</style>



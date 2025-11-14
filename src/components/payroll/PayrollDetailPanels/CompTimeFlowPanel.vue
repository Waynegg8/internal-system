<template>
  <div class="comp-time-flow-panel">
    <div class="process-card">
      <div class="section-title">補休與加班費計算流程</div>

      <div class="step-list">
        <div class="step-card is-positive">
          <div class="step-card__title">步驟 1：本月加班累積補休</div>
          <div class="step-card__value">+ {{ formatHours(totalCompGenerated) }}h</div>
          <div class="step-card__note">所有加班統一轉為補休（依各加班類型倍率計算）。</div>
        </div>

        <div class="step-card is-negative">
          <div class="step-card__title">步驟 2：本月使用補休（FIFO）</div>
          <div v-if="totalCompUsed > 0" class="step-card__value">- {{ formatHours(totalCompUsed) }}h</div>
          <div v-else class="step-card__note is-muted">本月未使用補休。</div>
        </div>

        <div class="step-card is-warning">
          <div class="step-card__title">步驟 3：到期未使用補休轉加班費</div>
          <template v-if="unusedCompHours > 0 || expiredComp > 0">
            <div class="step-card__note">
              未使用時數：<strong>{{ formatHours(unusedCompHours) }}h</strong>
            </div>
            <div class="step-card__value text-strong">{{ formatCurrency(expiredComp / 100) }}</div>
            <div class="step-card__note">
              到期補休依原始加班倍率乘以時薪換算為加班費。
            </div>
          </template>
          <div v-else class="step-card__note is-muted">本月補休已全數使用或無需轉換。</div>
        </div>
      </div>
    </div>

    <div v-if="expiredCompDetails.length > 0 || expiredComp > 0" class="summary-card">
      <div class="section-title">本月加班費合計</div>
      <div v-if="expiredCompDetails.length > 0" class="summary-body">
        <div
          v-for="detail in expiredCompDetails"
          :key="detail.date + detail.workType"
          class="summary-row"
        >
          <div class="summary-row__label">
            {{ detail.date }} · {{ detail.workType }}
          </div>
          <div class="summary-row__value">
            {{ formatHours(detail.hours) }}h × {{ detail.multiplier }}倍
            = {{ formatHours(detail.hours * detail.multiplier) }}h × {{ hourlyRateDisplay }}
            = {{ formatCurrency(detail.amountCents / 100) }}
          </div>
        </div>
      </div>
      <div class="summary-total">
        總計：{{ formatCurrency(expiredComp / 100) }}
      </div>
    </div>

    <div v-if="mealDays.length > 0" class="summary-card">
      <div class="section-title">本月誤餐費</div>
      <div class="summary-body">
        <div v-for="day in mealDays" :key="day.date" class="summary-row">
          <div class="summary-row__label">{{ day.date }}</div>
          <div class="summary-row__value">平日加班 {{ formatHours(day.hours) }}h</div>
        </div>
      </div>
      <div class="summary-total">
        {{ mealDays.length }} 天 × {{ formatCurrency(mealAllowanceCents / mealDays.length / 100) }}
        = {{ formatCurrency(mealAllowanceCents / 100) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency, formatHours } from '@/utils/formatters'
import { centsToTwd } from '@/utils/payrollUtils'

const props = defineProps({
  record: {
    type: Object,
    required: true
  },
  hourlyRate: {
    type: Number,
    default: 0
  }
})

// 獲取字段值
const getField = (camelKey, snakeKey) => {
  return props.record[camelKey] ?? props.record[snakeKey] ?? 0
}

// 補休產生總時數
const totalCompGenerated = computed(() => {
  return getField('totalCompHoursGenerated', 'total_comp_hours_generated') || 0
})

// 補休使用總時數
const totalCompUsed = computed(() => {
  return getField('totalCompHoursUsed', 'total_comp_hours_used') || 0
})

// 未使用補休時數
const unusedCompHours = computed(() => {
  return getField('unusedCompHours', 'unused_comp_hours') || 0
})

// 到期補休轉加班費（分）
const expiredComp = computed(() => {
  return getField('expiredCompPayCents', 'expired_comp_pay_cents') || 0
})

// 到期補休明細
const expiredCompDetails = computed(() => {
  return getField('expiredCompDetails', 'expired_comp_details') || []
})

// 誤餐費天數列表
const mealDays = computed(() => {
  return getField('mealAllowanceDays', 'meal_allowance_days') || []
})

// 誤餐費總額（分）
const mealAllowanceCents = computed(() => {
  return getField('mealAllowanceCents', 'meal_allowance_cents') || 0
})

// 時薪顯示
const hourlyRateDisplay = computed(() => {
  return centsToTwd(props.hourlyRate)
})
</script>

<style scoped>
.comp-time-flow-panel {
  padding: 0;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  align-items: start;
}

.process-card {
  grid-column: 1 / -1;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.section-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
  font-size: 0.92em;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-card {
  background: #fff;
  border-radius: 6px;
  border-left: 3px solid #d1d5db;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9em;
  color: #374151;
}

.step-card.is-positive {
  border-left-color: #16a34a;
}

.step-card.is-negative {
  border-left-color: #dc2626;
}

.step-card.is-warning {
  border-left-color: #f59e0b;
}

.step-card__title {
  font-weight: 600;
  color: #1f2937;
}

.step-card__value {
  font-weight: 600;
  font-size: 1.02em;
}

.step-card__note {
  font-size: 0.8em;
  color: #6b7280;
  line-height: 1.35;
}

.step-card__note.is-muted {
  color: #9ca3af;
}

.text-strong {
  color: #047857;
}

.summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.92em;
  color: #374151;
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.summary-row__label {
  font-weight: 600;
  color: #1f2937;
}

.summary-row__value {
  flex: 1;
  text-align: right;
}

.summary-total {
  font-weight: 600;
  color: #0f766e;
  text-align: right;
}
</style>



<template>
  <div class="leave-and-deduction-panel">
    <div class="panel-grid">
      <div class="panel-block">
        <div class="block-title">請假扣款明細</div>
        <div v-if="leaveDetails.length > 0" class="block-body">
          <div v-if="sickLeaves.length > 0" class="block-section">
            <div class="block-section__title">病假（扣 50%）</div>
            <div class="block-section__list">
              <div
                v-for="leave in sickLeaves"
                :key="leave.id || leave.startDate"
                class="block-row"
              >
                <span class="block-row__label">{{ formatDateRange(leave) }}</span>
                <span class="block-row__value">
                  {{ formatHours(leave) }}h × {{ hourlyRateDisplay }} × 50%
                  = {{ formatCurrency(calculateDeduction(leave, 0.5) / 100) }}
                  <span v-if="leave.reason" class="block-row__note">（{{ leave.reason }}）</span>
                </span>
              </div>
            </div>
            <div class="block-subtotal">
              小計：{{ formatCurrency(sickTotal / 100) }}
            </div>
          </div>

          <div v-if="personalLeaves.length > 0" class="block-section">
            <div class="block-section__title">事假（扣 100%）</div>
            <div class="block-section__list">
              <div
                v-for="leave in personalLeaves"
                :key="leave.id || leave.startDate"
                class="block-row"
              >
                <span class="block-row__label">{{ formatDateRange(leave) }}</span>
                <span class="block-row__value">
                  {{ formatHours(leave) }}h × {{ hourlyRateDisplay }} × 100%
                  = {{ formatCurrency(calculateDeduction(leave, 1.0) / 100) }}
                  <span v-if="leave.reason" class="block-row__note">（{{ leave.reason }}）</span>
                </span>
              </div>
            </div>
            <div class="block-subtotal">
              小計：{{ formatCurrency(personalTotal / 100) }}
            </div>
          </div>

          <div v-if="menstrualLeaves.length > 0" class="block-section">
            <div class="block-section__title">生理假（扣 50%）</div>
            <div class="block-section__list">
              <div
                v-for="leave in menstrualLeaves"
                :key="leave.id || leave.startDate"
                class="block-row"
              >
                <span class="block-row__label">{{ formatDateRange(leave) }}</span>
                <span class="block-row__value">
                  {{ formatHours(leave) }}h × {{ hourlyRateDisplay }} × 50%
                  = {{ formatCurrency(calculateDeduction(leave, 0.5) / 100) }}
                </span>
              </div>
            </div>
            <div class="block-subtotal">
              小計：{{ formatCurrency(menstrualTotal / 100) }}
            </div>
            <div class="block-footnote" v-if="menstrualFreeDays > 0">
              前 {{ menstrualFreeDays }} 天獨立計算，不併入病假額度。
            </div>
            <div class="block-footnote" v-if="menstrualMergedDays > 0">
              另有 {{ menstrualMergedDays }} 天併入病假額度。
            </div>
            <div class="block-footnote">生理假不影響全勤。</div>
          </div>

          <div class="block-total">
            請假扣款小計：{{ formatCurrency(leaveDeductionCents / 100) }}
          </div>
        </div>
        <a-empty
          v-else
          description="本月無請假記錄"
          :image="false"
          class="empty-state"
        />
      </div>

      <div class="panel-block">
        <div class="block-title">固定扣款</div>
        <div v-if="deductionItems.length > 0" class="block-body">
          <div class="block-section">
            <div class="block-section__list">
              <div
                v-for="item in deductionItems"
                :key="item.id || item.name"
                class="block-row"
              >
                <span class="block-row__label">{{ item.name }}</span>
                <span class="block-row__value">
                  {{ formatCurrency((item.amountCents || item.amount_cents || 0) / 100) }}
                </span>
              </div>
            </div>
            <div class="block-subtotal danger">
              固定扣款小計：{{ formatCurrency(deductionCents / 100) }}
            </div>
          </div>
        </div>
        <a-empty
          v-else
          description="無固定扣款"
          :image="false"
          class="empty-state"
        />
      </div>

    </div>
    <div class="grand-total" v-if="leaveDeductionCents || deductionCents">
      <div class="grand-total__label">合計扣款</div>
      <div class="grand-total__value">{{ formatCurrency(overallDeduction / 100) }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'
import { calculateHourlyRate, centsToTwd } from '@/utils/payrollUtils'

// 時薪顯示
const hourlyRateDisplay = computed(() => {
  return centsToTwd(hourlyRate.value)
})

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

// 請假明細
const leaveDetails = computed(() => {
  return getField('leaveDetails', 'leave_details') || []
})

// 病假列表
const sickLeaves = computed(() => {
  return leaveDetails.value.filter(l => {
    const type = l.leaveType || l.leave_type
    return type === 'sick'
  })
})

// 事假列表
const personalLeaves = computed(() => {
  return leaveDetails.value.filter(l => {
    const type = l.leaveType || l.leave_type
    return type === 'personal'
  })
})

// 生理假列表
const menstrualLeaves = computed(() => {
  return leaveDetails.value.filter(l => {
    const type = l.leaveType || l.leave_type
    return type === 'menstrual'
  })
})

// 病假總時數
const sickHours = computed(() => {
  return getField('sickHours', 'sick_hours') || 0
})

// 事假總時數
const personalHours = computed(() => {
  return getField('personalHours', 'personal_hours') || 0
})

// 生理假總時數
const menstrualHours = computed(() => {
  return getField('menstrualHours', 'menstrual_hours') || 0
})

// 生理假免費天數
const menstrualFreeDays = computed(() => {
  return getField('menstrualFreeDays', 'menstrual_free_days') || 0
})

// 生理假合併天數
const menstrualMergedDays = computed(() => {
  return getField('menstrualMergedDays', 'menstrual_merged_days') || 0
})

// 請假扣款總額（分）
const leaveDeductionCents = computed(() => {
  return getField('leaveDeductionCents', 'leave_deduction_cents') || 0
})

// 固定扣款項目
const deductionItems = computed(() => {
  return getField('deductionItems', 'deduction_items') || []
})

// 固定扣款總額（分）
const deductionCents = computed(() => {
  return getField('deductionCents', 'deduction_cents') || 0
})

// 總扣款
const overallDeduction = computed(() => {
  return leaveDeductionCents.value + deductionCents.value
})

// 計算時薪
const baseSalaryCents = computed(() => {
  return getField('baseSalaryCents', 'base_salary_cents') || 0
})

const hourlyRate = computed(() => {
  return calculateHourlyRate(baseSalaryCents.value, 240)
})

// 計算扣款
const calculateDeduction = (leave, rate) => {
  const hours = formatHours(leave)
  return Math.floor(hours * (hourlyRate.value / 100) * rate * 100)
}

// 病假總扣款
const sickTotal = computed(() => {
  return Math.floor(sickHours.value * (hourlyRate.value / 100) * 0.5 * 100)
})

// 事假總扣款
const personalTotal = computed(() => {
  return Math.floor(personalHours.value * (hourlyRate.value / 100) * 100)
})

// 生理假總扣款
const menstrualTotal = computed(() => {
  return Math.floor(menstrualHours.value * (hourlyRate.value / 100) * 0.5 * 100)
})

// 格式化日期範圍
const formatDateRange = (leave) => {
  const start = leave.startDate || leave.start_date
  const end = leave.endDate || leave.end_date
  return start === end ? start : `${start} ~ ${end}`
}

// 格式化小時數
const formatHours = (leave) => {
  const unit = leave.unit || 'hour'
  const amount = leave.amount || 0
  return unit === 'day' ? amount * 8 : amount
}
</script>

<style scoped>
.leave-and-deduction-panel {
  padding: 0;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  align-items: flex-start;
}

.panel-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.92em;
  color: #374151;
}

.block-title {
  font-weight: 600;
  font-size: 0.9em;
  color: #4b5563;
}

.block-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
}

.block-section:first-of-type {
  border-top: none;
  padding-top: 0;
}

.block-section__title {
  font-weight: 600;
  color: #1f2937;
}

.block-section__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.block-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.45;
}

.block-row__label {
  font-weight: 600;
  color: #1f2937;
}

.block-row__value {
  flex: 1;
  text-align: right;
}

.block-row__note {
  color: #6b7280;
}

.block-subtotal {
  font-weight: 600;
  color: #dc2626;
  text-align: right;
}

.block-subtotal.danger {
  color: #b91c1c;
}

.block-footnote {
  font-size: 0.78em;
  color: #6b7280;
  line-height: 1.4;
}

.block-total {
  font-weight: 600;
  color: #dc2626;
  text-align: right;
}

.grand-total {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  align-items: baseline;
  font-size: 0.95em;
  color: #374151;
}

.grand-total__label {
  font-weight: 600;
}

.grand-total__value {
  font-weight: 700;
  color: #0f766e;
}

.total-summary {
  border-top: 1px solid #e5e7eb;
  padding-top: 6px;
  font-weight: 600;
  color: #b91c1c;
  text-align: right;
}

.total-summary.danger {
  color: #b91c1c;
}

.empty-state {
  margin-top: 8px;
}

.combined-summary {
  flex: 1 1 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px 12px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.92em;
  color: #374151;
}

.combined-summary__row,
.combined-summary__total {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.combined-summary__total {
  font-weight: 700;
  color: #0f766e;
}
</style>


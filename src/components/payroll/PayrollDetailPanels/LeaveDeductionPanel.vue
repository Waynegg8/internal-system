<template>
  <div class="leave-deduction-panel">
    <div v-if="leaveDetails.length > 0">
      <div style="font-size: 0.9em;">
        <!-- 病假 -->
        <div v-if="sickLeaves.length > 0" style="margin-bottom: 6px;">
          <span style="font-weight: 600;">病假(50%)：</span>
          <span v-for="(leave, idx) in sickLeaves" :key="leave.id || leave.startDate">
            {{ formatDateRange(leave) }}({{ formatHours(leave) }}h){{ formatCurrency(calculateDeduction(leave, 0.5) / 100) }}<span v-if="idx < sickLeaves.length - 1">、</span>
          </span>
          <span style="color: #dc2626; font-weight: 600; margin-left: 8px;">小計{{ formatCurrency(sickTotal / 100) }}</span>
        </div>

        <!-- 事假 -->
        <div v-if="personalLeaves.length > 0" style="margin-bottom: 6px;">
          <span style="font-weight: 600;">事假(100%)：</span>
          <span v-for="(leave, idx) in personalLeaves" :key="leave.id || leave.startDate">
            {{ formatDateRange(leave) }}({{ formatHours(leave) }}h){{ formatCurrency(calculateDeduction(leave, 1.0) / 100) }}<span v-if="idx < personalLeaves.length - 1">、</span>
          </span>
          <span style="color: #dc2626; font-weight: 600; margin-left: 8px;">小計{{ formatCurrency(personalTotal / 100) }}</span>
        </div>

        <!-- 生理假 -->
        <div v-if="menstrualLeaves.length > 0" style="margin-bottom: 6px;">
          <span style="font-weight: 600;">生理假(50%)：</span>
          <span v-for="(leave, idx) in menstrualLeaves" :key="leave.id || leave.startDate">
            {{ formatDateRange(leave) }}({{ formatHours(leave) }}h){{ formatCurrency(calculateDeduction(leave, 0.5) / 100) }}<span v-if="idx < menstrualLeaves.length - 1">、</span>
          </span>
          <span style="color: #f59e0b; font-weight: 600; margin-left: 8px;">小計{{ formatCurrency(menstrualTotal / 100) }}</span>
          <span v-if="menstrualFreeDays > 0 || menstrualMergedDays > 0" style="color: #6b7280; font-size: 0.85em; margin-left: 8px;">
            （前{{ menstrualFreeDays }}天獨立，{{ menstrualMergedDays }}天併入病假，不影響全勤）
          </span>
        </div>
      </div>

      <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-weight: 600; color: #dc2626; text-align: right; font-size: 0.9em;">
        總扣款：{{ formatCurrency(leaveDeductionCents / 100) }}
      </div>
    </div>
    <a-empty v-else description="無請假記錄" :image="false" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'
import { calculateHourlyRate, centsToTwd } from '@/utils/payrollUtils'

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

// 計算時薪
const baseSalaryCents = computed(() => {
  return getField('baseSalaryCents', 'base_salary_cents') || 0
})

const hourlyRate = computed(() => {
  return calculateHourlyRate(baseSalaryCents.value, 240)
})

const hourlyRateDisplay = computed(() => {
  return centsToTwd(hourlyRate.value)
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
.leave-deduction-panel {
  padding: 0;
}
</style>



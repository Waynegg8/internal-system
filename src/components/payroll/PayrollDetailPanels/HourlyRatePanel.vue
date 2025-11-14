<template>
  <div class="hourly-rate-panel">
    <div style="display: flex; gap: 16px; align-items: center; font-size: 0.9em; margin-bottom: 8px;">
      <span style="color: #6b7280;">底薪：</span>
      <strong>{{ baseSalaryDisplay }}</strong>
      <span style="color: #6b7280; margin-left: 8px;">÷ 240小時 =</span>
      <strong style="color: #059669;">{{ hourlyRateDisplay }}</strong>
      <span style="color: #9ca3af; font-size: 0.85em; margin-left: 8px;">（僅以底薪計算）</span>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 0.9em;">
      <span style="color: #6b7280; margin-right: 8px;">全勤：</span>
      <span v-if="isFullAttendance" style="color: #059669; font-weight: 600;">
        達標
        <span v-if="menstrualDays > 0" style="color: #6b7280; font-weight: normal; font-size: 0.85em; margin-left: 4px;">
          （生理假{{ menstrualDays }}天不影響）
        </span>
      </span>
      <span v-else style="color: #dc2626; font-weight: 600;">
        未達標
        <span v-if="sickLeaves.length > 0 || personalLeaves.length > 0" style="color: #6b7280; font-weight: normal; font-size: 0.85em; margin-left: 4px;">
          （<span v-if="sickLeaves.length > 0">病假{{ sickLeaves.length }}筆</span><span v-if="sickLeaves.length > 0 && personalLeaves.length > 0">、</span><span v-if="personalLeaves.length > 0">事假{{ personalLeaves.length }}筆</span>）
        </span>
      </span>
    </div>
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

// 獲取字段值（支持 snake_case 和 camelCase）
const getField = (camelKey, snakeKey) => {
  return props.record[camelKey] ?? props.record[snakeKey] ?? 0
}

// 底薪顯示
const baseSalaryDisplay = computed(() => {
  const baseSalaryCents = getField('baseSalaryCents', 'base_salary_cents')
  return formatCurrency(baseSalaryCents / 100)
})

// 計算時薪顯示
const hourlyRateDisplay = computed(() => {
  const baseSalaryCents = getField('baseSalaryCents', 'base_salary_cents')
  const hourlyRate = calculateHourlyRate(baseSalaryCents, 240)
  return centsToTwd(hourlyRate)
})

// 檢查是否全勤
const isFullAttendance = computed(() => {
  return getField('isFullAttendance', 'is_full_attendance') === true
})

// 獲取生理假天數
const menstrualDays = computed(() => {
  return getField('menstrualDays', 'menstrual_days') || 0
})

// 獲取請假明細
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
</script>

<style scoped>
.hourly-rate-panel {
  padding: 0;
}
</style>



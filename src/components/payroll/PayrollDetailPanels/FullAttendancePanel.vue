<template>
  <div class="full-attendance-panel">
    <div v-if="isFullAttendance" style="color: #059669; font-weight: 600;">
      全勤達標
      <span v-if="menstrualDays > 0" style="color: #6b7280; font-weight: normal; font-size: 0.9em; margin-left: 8px;">
        （生理假 {{ menstrualDays }} 天不影響全勤）
      </span>
    </div>
    <div v-else>
      <div style="color: #dc2626; font-weight: 600; margin-bottom: 6px;">未達全勤標準</div>
      <div v-if="sickLeaves.length > 0" style="margin-bottom: 6px; font-size: 0.9em;">
        <span style="color: #6b7280;">病假：</span>
        <span v-for="(leave, idx) in sickLeaves" :key="leave.id || leave.startDate">
          {{ formatDateRange(leave) }}({{ formatHours(leave) }}h)<span v-if="idx < sickLeaves.length - 1">、</span>
        </span>
      </div>
      <div v-if="personalLeaves.length > 0" style="font-size: 0.9em;">
        <span style="color: #6b7280;">事假：</span>
        <span v-for="(leave, idx) in personalLeaves" :key="leave.id || leave.startDate">
          {{ formatDateRange(leave) }}({{ formatHours(leave) }}h)<span v-if="idx < personalLeaves.length - 1">、</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  record: {
    type: Object,
    required: true
  }
})

// 獲取字段值（支持 snake_case 和 camelCase）
const getField = (camelKey, snakeKey) => {
  return props.record[camelKey] ?? props.record[snakeKey] ?? null
}

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
.full-attendance-panel {
  padding: 0;
}
</style>



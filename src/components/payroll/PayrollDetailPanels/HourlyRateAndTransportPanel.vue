<template>
  <div class="hourly-rate-and-transport-panel">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <!-- 左側：時薪計算基礎與全勤 -->
      <div>
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 0.9em; color: #6b7280;">時薪計算基礎與全勤</div>
        <div style="display: flex; gap: 8px; align-items: center; font-size: 0.85em; margin-bottom: 6px; flex-wrap: wrap;">
          <span style="color: #6b7280;">底薪：</span>
          <strong>{{ baseSalaryDisplay }}</strong>
          <span style="color: #6b7280; margin-left: 8px;">÷ 240小時 =</span>
          <strong style="color: #059669;">{{ hourlyRateDisplay }}</strong>
          <span style="color: #9ca3af; font-size: 0.85em; margin-left: 8px;">（僅以底薪計算）</span>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 6px; font-size: 0.85em;">
          <span style="color: #6b7280; margin-right: 8px;">全勤：</span>
          <span v-if="isFullAttendance" style="color: #059669; font-weight: 600;">
            達標
            <span v-if="menstrualDays > 0" style="color: #6b7280; font-weight: normal; font-size: 0.85em; margin-left: 4px;">
              （生理假{{ menstrualDays }}天不影響）
            </span>
          </span>
          <span v-else style="color: #dc2626; font-weight: 600;">
            未達標
            <span v-if="sickLeaves.length > 0 || personalLeaves.length > 0" style="color: #6b7280; font-weight: normal; font-size: 0.85em; margin-left: 4px; display: block; margin-top: 4px;">
              <span v-if="sickLeaves.length > 0">病假：{{ sickLeaves.map(l => {
                const startDate = l.startDate || l.start_date
                const endDate = l.endDate || l.end_date
                const dateRange = startDate === endDate ? startDate : `${startDate}~${endDate}`
                const unit = l.unit || 'hour'
                const amount = l.amount || 0
                const hours = unit === 'day' ? amount * 8 : amount
                return `${dateRange}(${hours}h)`
              }).join('、') }}</span>
              <span v-if="sickLeaves.length > 0 && personalLeaves.length > 0">；</span>
              <span v-if="personalLeaves.length > 0">事假：{{ personalLeaves.map(l => {
                const startDate = l.startDate || l.start_date
                const endDate = l.endDate || l.end_date
                const dateRange = startDate === endDate ? startDate : `${startDate}~${endDate}`
                const unit = l.unit || 'hour'
                const amount = l.amount || 0
                const hours = unit === 'day' ? amount * 8 : amount
                return `${dateRange}(${hours}h)`
              }).join('、') }}</span>
            </span>
            <span v-else-if="leaveDetails.length === 0" style="color: #6b7280; font-weight: normal; font-size: 0.85em; margin-left: 4px; display: block; margin-top: 4px;">
              （無請假記錄，請檢查全勤計算邏輯）
            </span>
          </span>
        </div>
      </div>

      <!-- 右側：交通補貼明細 -->
      <div>
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 0.9em; color: #6b7280;">交通補貼明細</div>
        <div v-if="tripDetails.length > 0" style="font-size: 0.85em;">
          <div v-for="trip in tripDetails" :key="trip.id || trip.tripId || trip.date" style="margin-bottom: 2px;">
            {{ trip.date || trip.tripDate }} {{ trip.destination || trip.destinationName || trip.destination_name }} {{ trip.distance || trip.distanceKm || trip.distance_km }}km → {{ trip.intervals || trip.intervalCount || trip.interval_count }}區間×{{ formatAmountPerInterval(trip) }}={{ formatCurrency(getTripTotalAmount(trip)) }}
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-weight: 600; color: #059669; text-align: right; font-size: 0.9em;">
            總計：{{ totalKm }}km，{{ transportIntervals }}區間 = {{ formatCurrency(transportCents / 100) }}
          </div>
        </div>
        <div v-else-if="transportCents > 0 && (totalKm > 0 || transportIntervals > 0)" style="font-size: 0.85em; color: #6b7280;">
          <div>總計：{{ totalKm }}km，{{ transportIntervals }}區間 = {{ formatCurrency(transportCents / 100) }}</div>
          <div style="margin-top: 4px; font-size: 0.8em; color: #9ca3af;">（明細數據載入中或未提供）</div>
        </div>
        <div v-else-if="transportCents > 0 && totalKm === 0 && transportIntervals === 0" style="font-size: 0.85em; color: #6b7280;">
          <div>總計：{{ formatCurrency(transportCents / 100) }}</div>
          <div style="margin-top: 4px; font-size: 0.8em; color: #dc2626;">（警告：有交通補貼金額但無明細數據，請檢查後端 API 是否返回 tripDetails）</div>
        </div>
        <a-empty v-else description="本月無外出記錄" :image="false" style="margin-top: 8px;" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
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
  return props.record[camelKey] ?? props.record[snakeKey] ?? null
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

// 外出記錄明細
const tripDetails = computed(() => {
  return getField('tripDetails', 'trip_details') || []
})

// 總公里數
const totalKm = computed(() => {
  return getField('totalKm', 'total_km') || 0
})

// 總區間數
const transportIntervals = computed(() => {
  return getField('transportIntervals', 'transport_intervals') || 0
})

// 交通費總額（分）
const transportCents = computed(() => {
  return getField('transportCents', 'transport_cents') || 0
})

// 獲取每區間金額（元）- 從總金額和總區間數計算（參考舊系統：總計是對的，所以從總計反推）
const getAmountPerInterval = computed(() => {
  // 直接從 record 獲取，確保數據正確
  const totalCents = getField('transportCents', 'transport_cents') || 0
  const totalIntervals = getField('transportIntervals', 'transport_intervals') || 0
  
  if (totalCents > 0 && totalIntervals > 0) {
    const result = (totalCents / 100) / totalIntervals
    return result
  }
  return 60 // 默認值
})

// 格式化每區間金額（參考舊系統：總計是對的，所以直接從總金額反推，不依賴 trip.amount）
const formatAmountPerInterval = (trip) => {
  // 直接從 record 獲取總金額和總區間數，確保數據正確
  const totalCents = getField('transportCents', 'transport_cents') || 0
  const totalIntervals = getField('transportIntervals', 'transport_intervals') || 0
  
  if (totalCents > 0 && totalIntervals > 0) {
    const amountPerInterval = (totalCents / 100) / totalIntervals
    return formatCurrency(amountPerInterval)
  }
  
  // 如果總金額或總區間數為 0，使用默認值
  return formatCurrency(60)
}

// 獲取單個 trip 的總金額（元）- 從總金額計算（參考舊系統：總計是對的，所以從總計計算）
const getTripTotalAmount = (trip) => {
  const intervals = trip.intervals ?? trip.intervalCount ?? trip.interval_count ?? 1
  
  // 直接從 record 獲取總金額和總區間數，確保數據正確
  const totalCents = getField('transportCents', 'transport_cents') || 0
  const totalIntervals = getField('transportIntervals', 'transport_intervals') || 0
  
  if (totalCents > 0 && totalIntervals > 0) {
    const amountPerInterval = (totalCents / 100) / totalIntervals
    return intervals * amountPerInterval
  }
  
  // 如果總金額或總區間數為 0，使用默認值
  return intervals * 60
}

</script>

<style scoped>
.hourly-rate-and-transport-panel {
  padding: 0;
}
</style>


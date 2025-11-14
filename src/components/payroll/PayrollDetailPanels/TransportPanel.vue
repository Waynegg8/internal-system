<template>
  <div class="transport-panel">
    <div v-if="tripDetails.length > 0">
      <div style="font-size: 0.9em; margin-bottom: 4px;">
        <div v-for="trip in tripDetails" :key="trip.id || trip.date" style="margin-bottom: 2px;">
          {{ trip.date }} {{ trip.destination || trip.destination_name }} {{ trip.distance || trip.distance_km }}km → {{ trip.intervals || trip.interval_count }}區間×{{ formatAmountPerInterval(trip) }}={{ formatCurrency(getTripTotalAmount(trip)) }}
        </div>
      </div>
      <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-weight: 600; color: #059669; text-align: right; font-size: 0.9em;">
        總計：{{ totalKm }}km，{{ transportIntervals }}區間 = {{ formatCurrency(transportCents / 100) }}
      </div>
    </div>
    <a-empty v-else description="本月無外出記錄" :image="false" />
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

// 獲取每區間金額（元）- 從總金額和總區間數計算
const getAmountPerInterval = computed(() => {
  const totalCents = transportCents.value || 0
  const totalIntervals = transportIntervals.value || 0
  
  if (totalCents > 0 && totalIntervals > 0) {
    return (totalCents / 100) / totalIntervals
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

// 獲取單個 trip 的總金額（元）- 從總金額計算
const getTripTotalAmount = (trip) => {
  const intervals = trip.intervals || trip.interval_count || 1
  
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
.transport-panel {
  padding: 0;
}
</style>



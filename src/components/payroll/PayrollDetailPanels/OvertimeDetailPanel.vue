<template>
  <div class="overtime-detail-panel">
    <div v-if="dailyOvertime.length > 0">
      <!-- 每日加班記錄 -->
      <div v-for="day in dailyOvertime" :key="day.date" style="border-bottom: 1px solid #e5e7eb; padding: 6px 0; margin-bottom: 6px;">
        <div style="font-weight: 600; font-size: 0.9em; margin-bottom: 4px;">
          {{ formatDateDisplay(day) }}
        </div>

        <!-- 固定8h類型說明 -->
        <div v-if="hasFixedTypeItems(day)" style="font-size: 0.85em; color: #92400e; margin-bottom: 4px; padding: 4px; background: #fef3c7; border-radius: 2px;">
          {{ getFixedTypeName(day) }}：不論工時，固定8h加權+補休
        </div>

        <!-- 加班項目列表 -->
        <div v-for="item in day.items" :key="item.id || item.workTypeId" style="margin-left: 12px; margin-bottom: 4px; font-size: 0.85em;">
          <OvertimeItemDetail :item="item" :hourlyRate="hourlyRate" />
        </div>

            <!-- 誤餐費 -->
            <div v-if="getMealDayInfo(day.date)" style="margin-left: 12px; font-size: 0.85em; color: #92400e;">
              誤餐費：平日加班 {{ formatHours(getMealDayInfo(day.date).hours) }}h >= 1.5h
            </div>
      </div>

      <!-- 補休與加班費計算流程 -->
      <CompTimeFlowPanel :record="record" :hourlyRate="hourlyRate" />
    </div>
    <a-empty v-else description="本月無加班記錄" :image="false" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency, formatHours } from '@/utils/formatters'
import { calculateHourlyRate, centsToTwd } from '@/utils/payrollUtils'
import OvertimeItemDetail from './OvertimeItemDetail.vue'
import CompTimeFlowPanel from './CompTimeFlowPanel.vue'

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

// 獲取每日加班記錄
const dailyOvertime = computed(() => {
  return getField('dailyOvertime', 'daily_overtime') || []
})

// 計算時薪
const hourlyRate = computed(() => {
  const baseSalaryCents = getField('baseSalaryCents', 'base_salary_cents') || 0
  return calculateHourlyRate(baseSalaryCents, 240)
})

// 格式化日期顯示
const formatDateDisplay = (day) => {
  const date = day.date
  const dayOfWeek = day.dayOfWeek || day.day_of_week || ''
  const holidayName = day.holidayName || day.holiday_name || ''
  if (holidayName) {
    return `${date} (周${dayOfWeek}，${holidayName})`
  }
  return `${date} (周${dayOfWeek})`
}

// 檢查是否有固定8h類型項目
const hasFixedTypeItems = (day) => {
  const fixedItems = (day.items || []).filter(item => item.isFixedType || item.is_fixed_type)
  return fixedItems.length > 1 && fixedItems[0]?.totalDailyHours
}

// 獲取固定類型名稱
const getFixedTypeName = (day) => {
  const fixedItems = (day.items || []).filter(item => item.isFixedType || item.is_fixed_type)
  return fixedItems[0]?.workType || ''
}

// 獲取固定類型說明
const getFixedTypeDescription = (day) => {
  const fixedItems = (day.items || []).filter(item => item.isFixedType || item.is_fixed_type)
  if (fixedItems.length === 0) return ''
  
  const firstItem = fixedItems[0]
  const totalDailyHours = firstItem.totalDailyHours || firstItem.total_daily_hours || 0
  const isRestDay = (firstItem.workTypeId || firstItem.work_type_id) === 10
  const compHours = isRestDay ? '16h' : '8h'
  const lawArticle = isRestDay ? '第40條' : '第39條'
  
  return `當天共工作 ${totalDailyHours}h（分${fixedItems.length}筆記錄，用於客戶成本核算）<br>
依勞基法${lawArticle}：不論實際工時，統一給付 2日工資（原本1日+加班1日）${isRestDay ? ' + 另給1日補休' : ''}<br>
月薪已含原本1日，加班費計算：8h×1倍=8h加權工時 + ${compHours}補休<br>
以下各筆記錄按比例分配補休時數`
}

// 獲取誤餐費日期信息
const getMealDayInfo = (date) => {
  const mealDays = getField('mealAllowanceDays', 'meal_allowance_days') || []
  return mealDays.find(m => m.date === date)
}
</script>

<style scoped>
.overtime-detail-panel {
  padding: 0;
}
</style>



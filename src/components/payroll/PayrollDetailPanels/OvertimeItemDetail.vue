<template>
  <div class="overtime-item-detail" :style="{ borderLeftColor: borderColor }">
    <div class="item-header">
      <strong class="item-title">{{ item.workType || item.work_type }}</strong>
      <span class="item-badge">{{ multiplier }}倍</span>
    </div>

    <div v-if="rule" class="item-rule">
      {{ rule }}
    </div>

    <div class="item-line">
      <span class="item-label">實際工時</span>
      <span class="item-value">{{ formatHours(originalHours) }}h</span>
    </div>

    <template v-if="isFixedType">
      <div class="item-line">
        <span class="item-label">法定給付</span>
        <span class="item-value">
          固定分配 8h 加權工時
          <span v-if="hasRatio" class="item-note">
            （當日合計 {{ formatHours(totalDailyHours) }}h，本筆佔 {{ ratio }}%）
          </span>
        </span>
      </div>
      <div class="item-line">
        <span class="item-label">補休產生</span>
        <span class="item-value text-positive">{{ formatHours(compHoursGenerated) }}h</span>
      </div>
      <div class="item-line">
        <span class="item-label">加班加權</span>
        <span class="item-value">
          {{ formatHours(originalWeighted) }}h
          <span v-if="originalWeighted !== originalHours" class="item-note">
            （非依實際 {{ formatHours(originalHours) }}h 計算）
          </span>
        </span>
      </div>
    </template>

    <template v-else>
      <div class="item-line">
        <span class="item-label">補休產生</span>
        <span class="item-value text-positive">{{ formatHours(compHoursGenerated) }}h</span>
      </div>
      <div class="item-line">
        <span class="item-label">加班加權</span>
        <span class="item-value">
          {{ formatHours(originalHours) }}h × {{ multiplier }}倍
          = <span class="text-positive">{{ formatHours(originalWeighted) }}h</span>
        </span>
      </div>
    </template>

    <div v-if="compDeducted > 0" class="item-deduction">
      <span class="item-label">扣除補休</span>
      <span class="item-value">
        {{ formatHours(compDeducted) }}h →
        <span v-if="isFixedType">
          剩餘 {{ formatHours(effectiveWeighted) }}h 有效加權
        </span>
        <span v-else>
          剩餘 {{ formatHours(remainingHours) }}h × {{ multiplier }}倍 = {{ formatHours(effectiveWeighted) }}h 有效加權
        </span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatHours } from '@/utils/formatters'

const props = defineProps({
  item: {
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
  return props.item[camelKey] ?? props.item[snakeKey] ?? 0
}

// 工作類型ID
const workTypeId = computed(() => {
  return getField('workTypeId', 'work_type_id')
})

// 倍率
const multiplier = computed(() => {
  return getField('multiplier') || 1.0
})

// 實際工時
const originalHours = computed(() => {
  return getField('originalHours', 'original_hours') || 0
})

// 加權工時
const originalWeighted = computed(() => {
  return getField('originalWeighted', 'original_weighted') || 0
})

// 有效加權工時
const effectiveWeighted = computed(() => {
  return getField('effectiveWeighted', 'effective_weighted') || 0
})

// 補休產生時數
const compHoursGenerated = computed(() => {
  return getField('compHoursGenerated', 'comp_hours_generated') || 0
})

// 補休扣除時數
const compDeducted = computed(() => {
  return getField('compDeducted', 'comp_deducted') || 0
})

// 剩餘工時
const remainingHours = computed(() => {
  return getField('remainingHours', 'remaining_hours') || 0
})

// 是否為固定類型
const isFixedType = computed(() => {
  return getField('isFixedType', 'is_fixed_type') === true
})

// 當天總工時
const totalDailyHours = computed(() => {
  return getField('totalDailyHours', 'total_daily_hours') || 0
})

// 是否有比例
const hasRatio = computed(() => {
  return totalDailyHours.value > originalHours.value
})

// 比例
const ratio = computed(() => {
  if (!hasRatio.value) return 0
  const ratio = (originalHours.value / totalDailyHours.value) * 100
  return ratio === 0 ? '-' : ratio.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
})

// 邊框顏色
const borderColor = computed(() => {
  if (workTypeId.value >= 10) return '#dc2626'
  if (workTypeId.value >= 7) return '#f59e0b'
  return '#3b82f6'
})

// 法規依據
const ruleMap = {
  2: '勞基法第24條：平日延長工時第1-2小時，加給1/3以上',
  3: '勞基法第24條：平日延長工時第3-4小時，加給2/3以上',
  4: '勞基法第24條：休息日前2小時，加給1/3以上',
  5: '勞基法第24條：休息日第3-8小時，加給2/3以上',
  6: '勞基法第24條：休息日第9-12小時，加給5/3以上',
  7: '勞基法第39條：國定假日出勤，加倍發給工資（原本1日+加班1日=共2日），月薪已含原本1日，加班費計算額外1日',
  8: '勞基法第24條：國定假日超過8h部分，按平日延長工時計算（1.34倍）',
  9: '勞基法第24條：國定假日超過10h部分，按平日延長工時計算（1.67倍）',
  10: '勞基法第40條：例假日出勤，加倍發給工資（原本1日+加班1日=共2日），月薪已含原本1日，加班費計算額外1日',
  11: '勞基法第40條：例假日超過8h部分，每小時加倍發給（原本1+加班1=共2），月薪已含原本1，加班費計算額外1'
}

const rule = computed(() => {
  return ruleMap[workTypeId.value] || ''
})
</script>

<style scoped>
.overtime-item-detail {
  border-left: 3px solid #3b82f6;
  padding-left: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.92em;
  color: #4b5563;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-title {
  color: #1f2937;
  font-weight: 600;
}

.item-badge {
  background: #3b82f6;
  color: #fff;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75em;
  font-weight: 600;
}

.item-rule {
  color: #6b7280;
  font-size: 0.78em;
  padding-bottom: 4px;
  border-bottom: 1px dashed #d1d5db;
}

.item-line {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}

.item-label {
  font-weight: 600;
  color: #1f2937;
}

.item-value {
  flex: 1;
  text-align: right;
}

.item-note {
  display: block;
  font-size: 0.78em;
  color: #6b7280;
  margin-top: 2px;
}

.item-deduction {
  border-top: 1px dashed #fecaca;
  padding-top: 6px;
  color: #b91c1c;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.text-positive {
  color: #047857;
  font-weight: 600;
}
</style>


<template>
  <a-card>
    <template #title>
      <div class="card-title-row">
        <span>各員工工時</span>
        <a-select
          v-model:value="selectedMonth"
          style="width: 150px;"
          @change="handleMonthChange"
        >
          <a-select-option
            v-for="option in monthOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-select-option>
        </a-select>
      </div>
    </template>
    <a-list
      :data-source="employeeHours"
      :loading="false"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <div class="employee-hour-item">
            <template v-if="item.expectedNormalHours !== undefined">
              <span class="employee-name">{{ item.name || '未命名' }}</span>
              <div class="hour-info-horizontal">
                <span class="meta-label">正常工時:</span>
                <span :class="['meta-value', getNormalHoursStatus(item)]">{{ formattedNormal(item) }}</span>
                <span class="meta-separator">｜</span>
                <span class="meta-label">請假:</span>
                <span class="meta-value">{{ formattedLeave(item) }}</span>
                <span class="meta-separator">｜</span>
                <span class="meta-label">應有:</span>
                <span class="meta-value expected">{{ formattedExpected(item) }}</span>
                <span class="meta-separator">｜</span>
                <span class="meta-label">尚缺:</span>
                <span :class="['meta-value', getMissingHoursStatus(item)]">{{ formattedMissing(item) }}</span>
                <span class="meta-separator">｜</span>
                <span class="meta-label">加班:</span>
                <span class="meta-value overtime">{{ formattedOvertime(item) }}</span>
                <span class="meta-separator">｜</span>
                <span class="meta-label">總計:</span>
                <span class="meta-value total">{{ formattedTotal(item) }}</span>
                <span class="hour-unit">小時</span>
                <template v-if="item.missingNormalHours > 0 || (item.missingDates && item.missingDates.length > 0)">
                  <span class="meta-separator">｜</span>
                  <span class="meta-label">缺工時日期:</span>
                  <a-popover
                    v-if="item.missingDates && item.missingDates.length > 0"
                    placement="bottomRight"
                    trigger="click"
                    :overlay-style="{ maxWidth: '400px' }"
                  >
                    <template #title>
                      <span>缺工時日期詳細</span>
                    </template>
                    <template #content>
                      <div class="missing-dates-popover">
                        <div
                          v-for="(dateItem, index) in item.missingDates"
                          :key="index"
                          class="missing-date-item"
                        >
                          {{ formatMissingDateItem(dateItem) }}
                        </div>
                      </div>
                    </template>
                    <span class="missing-dates-trigger">
                      {{ formatMissingDatesSummary(item.missingDates) }}
                    </span>
                  </a-popover>
                  <span v-else class="missing-dates">日期計算中...</span>
                </template>
              </div>
            </template>
            <template v-else>
              <span class="employee-name">{{ item.name || '未命名' }}</span>
              <span class="no-hours">尚無資料</span>
            </template>
          </div>
        </a-list-item>
      </template>
      <template #empty>
        <div style="padding: 8px 0; text-align: center; color: #999; font-size: 12px;">尚無員工資料</div>
      </template>
    </a-list>
  </a-card>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { fmtNum } from '@/utils/formatters'
import { formatYm, getCurrentYm } from '@/utils/formatters'

const props = defineProps({
  employeeHours: {
    type: Array,
    default: () => []
  },
  currentYm: {
    type: String,
    default: () => getCurrentYm()
  }
})

const emit = defineEmits(['month-change'])

const selectedMonth = ref(props.currentYm)

watch(() => props.currentYm, (newYm) => {
  selectedMonth.value = newYm
})

// 生成最近12个月的选项
const monthOptions = computed(() => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = formatYm(ym)
    options.push({ value: ym, label })
  }
  return options
})

const formattedTotal = (item) => {
  return fmtNum(item.total || 0)
}

const formattedNormal = (item) => {
  // 正常工時需要保留小數點，因為可能出現 69.5 這樣的值
  const normal = item.normal || 0
  if (normal === 0) return '0'
  // 如果是整數，不顯示小數點；否則保留 1 位小數
  if (Number.isInteger(normal)) {
    return String(Math.round(normal))
  }
  return normal.toFixed(1)
}

const formattedLeave = (item) => {
  return fmtNum(item.leaveHours || 0)
}

const formattedExpected = (item) => {
  return fmtNum(item.expectedNormalHours || 0)
}

const formattedOvertime = (item) => {
  return fmtNum(item.overtime || 0)
}

const formattedMissing = (item) => {
  const missing = item.missingNormalHours
  if (missing === undefined || missing === null || isNaN(missing)) {
    return '—'
  }
  const value = Number(missing) || 0
  // 如果值為0，顯示0；否則格式化顯示（四捨五入到整數）
  if (Math.abs(value) < 0.01) {
    return '0'
  }
  // 使用 formatHours 或自定義格式化，保留小數但如果是整數不顯示小數點
  const rounded = Math.round(value * 10) / 10
  if (Number.isInteger(rounded)) {
    return String(Math.round(rounded))
  }
  return rounded.toFixed(1)
}

// 格式化單個缺少工時的日期項目（用於 Popover 內容）
const formatMissingDateItem = (item) => {
  if (!item) return ''
  
  // 判斷 item 是字串還是物件
  const isObject = typeof item === 'object' && item.date
  const dateStr = isObject ? item.date : item
  const missingHours = isObject ? (item.missingHours || 0) : null
  
  const parts = dateStr.split('-')
  const dateFormatted = `${parts[1]}-${parts[2]}`
  
  // 如果有缺少小時數，顯示「日期(缺X小時)」，否則只顯示日期
  if (missingHours !== null && missingHours > 0) {
    const hoursFormatted = missingHours % 1 === 0 
      ? String(Math.round(missingHours)) 
      : missingHours.toFixed(1)
    return `${dateFormatted} (缺${hoursFormatted}小時)`
  }
  return dateFormatted
}

// 格式化缺少工時的日期摘要（用於 Popover 觸發器）
const formatMissingDatesSummary = (dates) => {
  if (!dates || dates.length === 0) return ''
  
  const count = dates.length
  
  // 如果只有1-3個日期，顯示前3個的簡短格式
  if (count <= 3) {
    const formatted = dates.slice(0, 3).map(item => {
      const isObject = typeof item === 'object' && item.date
      const dateStr = isObject ? item.date : item
      const parts = dateStr.split('-')
      return `${parts[1]}-${parts[2]}`
    })
    return formatted.join('、')
  }
  
  // 如果超過3個，顯示前3個 + "(共X天)"
  const formatted = dates.slice(0, 3).map(item => {
    const isObject = typeof item === 'object' && item.date
    const dateStr = isObject ? item.date : item
    const parts = dateStr.split('-')
    return `${parts[1]}-${parts[2]}`
  })
  return formatted.join('、') + ` (共${count}天)`
}

// 格式化缺少工時的日期（保留原函數以向後兼容，但現在主要用於 Popover）
const formatMissingDates = (dates) => {
  return formatMissingDatesSummary(dates)
}

// 判斷正常工時是否填寫完整
const getNormalHoursStatus = (item) => {
  const normal = item.normal || 0
  const leave = item.leaveHours || 0
  const expected = item.expectedNormalHours || 0
  const totalFilled = normal + leave
  
  if (totalFilled >= expected) {
    return 'status-complete'
  } else if (totalFilled >= expected * 0.8) {
    return 'status-warning'
  } else {
    return 'status-incomplete'
  }
}

// 判斷尚缺工時的狀態顏色
const getMissingHoursStatus = (item) => {
  const missing = item.missingNormalHours || 0
  if (missing === 0) {
    return 'status-complete'
  } else if (missing <= 16) {
    return 'status-warning'
  } else {
    return 'status-incomplete'
  }
}

const handleMonthChange = (value) => {
  selectedMonth.value = value
  emit('month-change', value)
}
</script>

<style scoped>
.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.employee-hour-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: nowrap;
}

.employee-hour-item:last-child {
  border-bottom: none;
}

.employee-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  min-width: 80px;
  flex-shrink: 0;
}

.hour-info-horizontal {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: flex-end;
  flex-wrap: nowrap;
  font-size: 12px;
  color: #6b7280;
  overflow-x: auto;
  overflow-y: hidden;
}

.hour-info-horizontal::-webkit-scrollbar {
  height: 4px;
}

.hour-info-horizontal::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.hour-info-horizontal::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 2px;
}

.hour-info-horizontal::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.meta-label {
  font-weight: 500;
  color: #4b5563;
}

.meta-value {
  font-weight: 600;
  color: #1f2937;
}

.meta-value.status-complete {
  color: #059669;
}

.meta-value.status-warning {
  color: #d97706;
}

.meta-value.status-incomplete {
  color: #dc2626;
}

.meta-value.expected {
  color: #6366f1;
}

.meta-value.overtime {
  color: #7c3aed;
}

.meta-value.total {
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
}

.meta-separator {
  color: #9ca3af;
  margin: 0 2px;
}

.missing-dates {
  color: #dc2626;
  font-weight: 500;
  font-size: 11px;
}

.missing-dates-trigger {
  color: #dc2626;
  font-weight: 500;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
}

.missing-dates-trigger:hover {
  color: #b91c1c;
}

.missing-dates-popover {
  max-height: 300px;
  overflow-y: auto;
}

.missing-date-item {
  padding: 4px 0;
  font-size: 13px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.missing-date-item:last-child {
  border-bottom: none;
}

.hour-unit {
  font-size: 12px;
  color: #6b7280;
}

:deep(.ant-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.ant-card-head) {
  padding: 0 12px;
  min-height: 40px;
  flex-shrink: 0;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.ant-card-head-title) {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

:deep(.ant-card-body) {
  padding: 12px;
}

:deep(.ant-empty) {
  padding: 8px 0;
  margin: 0;
}

:deep(.ant-list-item) {
  padding: 0;
}

.no-hours {
  color: #9ca3af;
}
</style>




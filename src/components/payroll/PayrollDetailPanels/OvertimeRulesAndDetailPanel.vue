<template>
  <div class="overtime-rules-and-detail-panel">
    <div class="panel-grid">
      <!-- 左側：加班費明細 -->
      <div class="panel-column">
        <div class="section-title">加班費摘要與明細</div>
        <div v-if="dailyOvertime.length > 0" class="section-body">
          <!-- 每日加班記錄 -->
          <div v-for="day in dailyOvertime" :key="day.date" class="daily-card">
            <div class="daily-card__header">
              <div class="daily-card__date">
                {{ formatDateDisplay(day) }}
              </div>
              <div class="daily-card__metrics">
                <span class="metric-badge">
                  加班 {{ formatHours(getDayOriginalHours(day)) }}h
                </span>
                <span class="metric-badge" v-if="getDayWeightedHours(day) !== getDayOriginalHours(day)">
                  加權 {{ formatHours(getDayWeightedHours(day)) }}h
                </span>
                <span class="metric-badge" v-if="getMealDayInfo(day.date)">
                  誤餐費
                </span>
                <span class="metric-badge metric-badge--highlight" v-if="hasFixedTypeItems(day)">
                  固定 8h 規則
                </span>
              </div>
            </div>

            <div v-if="hasFixedTypeItems(day)" class="daily-card__fixed-row">
              <div class="fixed-label">{{ getFixedTypeName(day) }}</div>
              <div class="fixed-content">
                當日總工時 {{ formatHours(getTotalDailyHours(day)) }}h，依勞基法{{ getLawArticle(day) }}，統一給付 2日工資並轉換 {{ getCompHours(day) }} 補休。
              </div>
            </div>

            <!-- 加班項目列表 -->
            <div class="daily-card__items">
              <OvertimeItemDetail
                v-for="item in day.items"
                :key="item.id || item.workTypeId"
                :item="item"
                :hourlyRate="hourlyRate"
              />
            </div>

            <div class="daily-card__footer">
              <div class="footer-total">
                本日補休：<strong>{{ formatHours(getDayCompHours(day)) }}h</strong>
              </div>
              <div class="footer-total" v-if="getMealDayInfo(day.date)">
                誤餐費：{{ formatCurrency(getMealAmount(day.date)) }}
              </div>
            </div>
          </div>

        </div>
        <a-empty
          v-else
          description="本月無加班記錄"
          :image="false"
          class="empty-state"
        />
      </div>

      <!-- 右側：加班費計算規則總覽 -->
      <div class="panel-column">
        <div class="section-title">加班費計算規則總覽</div>
        <a-table
          class="rules-table"
          :columns="ruleColumns"
          :data-source="ruleData"
          :pagination="false"
          size="small"
          :bordered="false"
        />
        <div class="note-block">
          <div class="note-title">重要說明</div>
          <ul class="note-list">
            <li>"加倍發給"指總共給2日工資（原本1日 + 加班1日），月薪已含原本1日，加班費只計算額外1日</li>
            <li>國定假日與例假日 8 小時內：即使只工作 1 小時，也須給付完整 8 小時加權與 8 小時補休</li>
            <li>多客戶成本核算：同一天服務多個客戶時，固定 8 小時加權按比例分配</li>
          </ul>
          <div class="note-subtitle">補休規則：FIFO（先進先出），使用補休不計入加班費，未使用部分轉為加班費發放。</div>
        </div>

        <CompTimeFlowPanel class="flow-panel" :record="record" :hourlyRate="hourlyRate" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { calculateHourlyRate } from '@/utils/payrollUtils'
import { formatCurrency, formatHours } from '@/utils/formatters'
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

// 獲取固定類型數量
const getFixedTypeCount = (day) => {
  const fixedItems = (day.items || []).filter(item => item.isFixedType || item.is_fixed_type)
  return fixedItems.length
}

// 加班日補休統計
const getDayCompHours = (day) => {
  return (day.items || []).reduce((sum, item) => {
    const value = item.compHoursGenerated ?? item.comp_hours_generated ?? 0
    return sum + Number(value)
  }, 0)
}

// 獲取當天總工時
const getTotalDailyHours = (day) => {
  const fixedItems = (day.items || []).filter(item => item.isFixedType || item.is_fixed_type)
  return fixedItems[0]?.totalDailyHours || fixedItems[0]?.total_daily_hours || 0
}

// 獲取法條
const getLawArticle = (day) => {
  const fixedItems = (day.items || []).filter(item => item.isFixedType || item.is_fixed_type)
  const workTypeId = fixedItems[0]?.workTypeId || fixedItems[0]?.work_type_id
  const isRestDay = workTypeId === 10
  return isRestDay ? '第40條' : '第39條'
}

// 是否為例假日
const isRestDay = (day) => {
  const fixedItems = (day.items || []).filter(item => item.isFixedType || item.is_fixed_type)
  const workTypeId = fixedItems[0]?.workTypeId || fixedItems[0]?.work_type_id
  return workTypeId === 10
}

const mealAllowanceDays = computed(() => getField('mealAllowanceDays', 'meal_allowance_days') || [])
const mealAllowanceCents = computed(() => Number(getField('mealAllowanceCents', 'meal_allowance_cents') || 0))

// 獲取補休時數
const getCompHours = (day) => {
  const fixedItems = (day.items || []).filter(item => item.isFixedType || item.is_fixed_type)
  const workTypeId = fixedItems[0]?.workTypeId || fixedItems[0]?.work_type_id
  return workTypeId === 10 ? '16h' : '8h'
}

// 獲取誤餐費日期信息
const getMealDayInfo = (date) => {
  return mealAllowanceDays.value.find(m => m.date === date)
}

const getMealAmount = (date) => {
  const info = getMealDayInfo(date)
  if (info) {
    const amount = info.amountCents ?? info.amount_cents
    if (amount != null && amount !== 0) {
      return Number(amount) / 100
    }
  }
  const dayCount = mealAllowanceDays.value.length || 1
  if (mealAllowanceCents.value > 0) {
    return mealAllowanceCents.value / dayCount / 100
  }
  return 90
}

// 計算每日原始與加權工時
const getDayOriginalHours = (day) => {
  return (day.items || []).reduce((sum, item) => {
    const hours = item.originalHours ?? item.original_hours ?? item.hours ?? 0
    return sum + Number(hours)
  }, 0)
}

const getDayWeightedHours = (day) => {
  return (day.items || []).reduce((sum, item) => {
    const weighted = item.originalWeighted ?? item.original_weighted ?? item.weighted_hours ?? 0
    return sum + Number(weighted)
  }, 0)
}

// 規則表格列定義
const ruleColumns = [
  {
    title: '類型',
    dataIndex: 'type',
    key: 'type',
    width: '30%'
  },
  {
    title: '倍率',
    dataIndex: 'multiplier',
    key: 'multiplier',
    width: '15%',
    align: 'center'
  },
  {
    title: '說明',
    dataIndex: 'description',
    key: 'description',
    width: '55%'
  }
]

// 規則數據
const ruleData = [
  {
    key: '1',
    type: '平日加班（前2小時）',
    multiplier: '1.34倍',
    description: '勞基法第24條：加給1/3以上'
  },
  {
    key: '2',
    type: '平日加班（後2小時）',
    multiplier: '1.67倍',
    description: '勞基法第24條：加給2/3以上'
  },
  {
    key: '3',
    type: '休息日（前2小時）',
    multiplier: '1.34倍',
    description: '勞基法第24條：加給1/3以上'
  },
  {
    key: '4',
    type: '休息日（第3-8小時）',
    multiplier: '1.67倍',
    description: '勞基法第24條：加給2/3以上'
  },
  {
    key: '5',
    type: '休息日（第9-12小時）',
    multiplier: '2.67倍',
    description: '勞基法第24條：加給5/3以上'
  },
  {
    key: '6',
    type: '國定假日（8小時內）',
    multiplier: '1.0倍',
    description: '不論工時，固定8小時加權與8小時補休'
  },
  {
    key: '7',
    type: '國定假日（第9-10小時）',
    multiplier: '1.34倍',
    description: '按平日延長工時計算'
  },
  {
    key: '8',
    type: '國定假日（第11-12小時）',
    multiplier: '1.67倍',
    description: '按平日延長工時計算'
  },
  {
    key: '9',
    type: '例假日（8小時內）',
    multiplier: '1.0倍',
    description: '不論工時，固定8小時加權與8小時補休'
  },
  {
    key: '10',
    type: '例假日（第9-10小時）',
    multiplier: '1.34倍',
    description: '與國定假日相同'
  },
  {
    key: '11',
    type: '例假日（第11-12小時）',
    multiplier: '1.67倍',
    description: '與國定假日相同'
  }
]
</script>

<style scoped>
.overtime-rules-and-detail-panel {
  padding: 0;
}

.panel-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.panel-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-weight: 600;
  font-size: 0.9em;
  color: #4b5563;
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 0.95em;
}

.daily-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px 14px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.daily-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.daily-card__date {
  font-weight: 600;
  color: #1f2937;
}

.daily-card__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.metric-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 0.78em;
  font-weight: 600;
}

.metric-badge--highlight {
  background: #fee2e2;
  color: #991b1b;
}

.daily-card__fixed-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px;
  padding: 6px 10px;
  background: #fefce8;
  border-radius: 4px;
  border-left: 3px solid #f59e0b;
}

.fixed-label {
  font-weight: 600;
  color: #92400e;
}

.fixed-content {
  color: #7c2d12;
  font-size: 0.88em;
  line-height: 1.5;
}

.daily-card__items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.daily-card__footer {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
  font-size: 0.85em;
  color: #374151;
}

.footer-total {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.empty-state {
  margin-top: 8px;
}

.rules-table {
  font-size: 0.85em;
}

.note-block {
  font-size: 0.8em;
  color: #6b7280;
  line-height: 1.5;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-title {
  font-weight: 600;
  color: #4b5563;
}

.note-list {
  padding-left: 18px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.note-subtitle {
  color: #4b5563;
}

.flow-panel {
  margin-top: 12px;
  width: 100%;
}
</style>


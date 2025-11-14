<template>
  <div class="payroll-detail-row">
    <a-collapse v-model:activeKey="activeKeys" :bordered="false">
      <!-- 加班費計算規則與明細 -->
      <a-collapse-panel key="overtimeRulesAndDetail" header="加班費計算規則與明細">
        <OvertimeRulesAndDetailPanel :record="record" />
      </a-collapse-panel>

      <!-- 時薪計算基礎與全勤 + 交通補貼 -->
      <a-collapse-panel key="hourlyRateAndTransport" header="時薪計算基礎與全勤 / 交通補貼">
        <HourlyRateAndTransportPanel :record="record" />
      </a-collapse-panel>

      <!-- 請假扣款與固定扣款 -->
      <a-collapse-panel key="leaveAndDeduction" header="請假扣款與固定扣款">
        <LeaveAndDeductionPanel :record="record" />
      </a-collapse-panel>

      <!-- 年終獎金明細 -->
      <a-collapse-panel v-if="hasYearEndBonus" key="yearEnd" header="年終獎金明細">
        <YearEndBonusPanel :record="record" />
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'
import OvertimeRulesAndDetailPanel from './PayrollDetailPanels/OvertimeRulesAndDetailPanel.vue'
import HourlyRateAndTransportPanel from './PayrollDetailPanels/HourlyRateAndTransportPanel.vue'
import LeaveAndDeductionPanel from './PayrollDetailPanels/LeaveAndDeductionPanel.vue'
import YearEndBonusPanel from './PayrollDetailPanels/YearEndBonusPanel.vue'

const props = defineProps({
  record: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    default: 0
  }
})

// 獲取字段值（支持 snake_case 和 camelCase）
const getField = (record, camelKey, snakeKey) => {
  return record[camelKey] ?? record[snakeKey] ?? null
}

// 檢查是否有年終獎金
const hasYearEndBonus = computed(() => {
  const yearEndItems = getField(props.record, 'yearEndBonusItems', 'year_end_bonus_items') || []
  return yearEndItems.length > 0
})

// 默認展開的面板
const activeKeys = ref(['overtimeRulesAndDetail', 'hourlyRateAndTransport'])
</script>

<style scoped>
.payroll-detail-row {
  padding: 8px;
  background: #fafafa;
}

:deep(.ant-collapse) {
  background: transparent;
  border: none;
}

:deep(.ant-collapse-item) {
  margin-bottom: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 2px;
  background: #ffffff;
}

:deep(.ant-collapse-header) {
  padding: 8px 12px !important;
  font-size: 0.9em;
}

:deep(.ant-collapse-content) {
  padding: 8px 12px !important;
}

:deep(.ant-collapse-content-box) {
  padding: 0 !important;
}
</style>


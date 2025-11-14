<template>
  <section class="report-block employee-performance-report">
    <header class="report-header">
      <h2>月度員工產值分析</h2>
    </header>

    <div class="summary-grid">
      <div
        v-for="item in performanceSummary"
        :key="item.label"
        class="summary-item"
      >
        <span class="summary-label">{{ item.label }}</span>
        <span class="summary-value">{{ formatSummaryValue(item) }}</span>
      </div>
    </div>

    <p class="report-note">
      採用應計制確認收入，跨月服務依工時比例分攤，以便檢視員工產值與成本。
    </p>

    <a-spin :spinning="reportsStore.loading">
      <a-table
        v-if="employeeTableData.length > 0"
        :columns="columns"
        :data-source="employeeTableData"
        :row-key="getRowKey"
        :pagination="false"
        size="small"
        class="data-table compact-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            {{ record.name }}
          </template>
          <template v-else-if="column.key === 'hoursDifference'">
            <span
              class="numeric-cell"
              :class="record.hoursDifference >= 0 ? 'negative' : 'positive'"
            >
              {{ formatHoursDifference(record.hoursDifference) }}
            </span>
          </template>
          <template v-else-if="column.key === 'profit'">
            <span
              class="numeric-cell"
              :class="record.profit >= 0 ? 'positive' : 'negative'"
            >
              {{ formatCurrency(record.profit) }}
            </span>
          </template>
          <template v-else-if="column.key === 'profitMargin'">
            <span class="numeric-cell">
              {{ formatPercent(record.profitMargin / 100) }}
            </span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="handleViewClientDistribution(record)">
              查看客戶分布
            </a-button>
          </template>
          <template v-else>
            <span class="numeric-cell">
              {{ hoursColumns.has(column.key) ? formatHours(record[column.key]) : formatCurrency(record[column.key]) }}
            </span>
          </template>
        </template>
      </a-table>

      <a-empty
        v-else-if="!reportsStore.loading"
        description="本月無工時記錄"
        class="empty-state"
      />
    </a-spin>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useReportsStore } from '@/stores/reports'
import { formatCurrency, formatPercent } from '@/utils/formatters'

const props = defineProps({
  onViewClientDistribution: {
    type: Function,
    default: () => {}
  }
})

const reportsStore = useReportsStore()

const columns = [
  { title: '姓名', key: 'name' },
  { title: '標準工時', key: 'standardHours', align: 'right' },
  { title: '加權工時', key: 'weightedHours', align: 'right' },
  { title: '工時差異', key: 'hoursDifference', align: 'right' },
  { title: '產生收入', key: 'generatedRevenue', align: 'right' },
  { title: '總成本', key: 'totalCost', align: 'right' },
  { title: '毛利', key: 'profit', align: 'right' },
  { title: '毛利率', key: 'profitMargin', align: 'right' },
  { title: '操作', key: 'action', align: 'center' }
]

const employeeTableData = computed(() => {
  const data = reportsStore.monthlyEmployeePerformance
  if (!data || !data.employeePerformance) {
    return []
  }

  return data.employeePerformance.map((item) => ({
    userId: item.userId || item.user_id,
    name: item.name || '',
    standardHours: item.standardHours || item.standard_hours || 0,
    weightedHours: item.weightedHours || item.weighted_hours || 0,
    hoursDifference: item.hoursDifference || item.hours_difference || 0,
    generatedRevenue: item.generatedRevenue || item.generated_revenue || 0,
    laborCost: item.laborCost || item.labor_cost || 0,
    totalCost: item.totalCost || item.total_cost || 0,
    profit: item.profit || 0,
    profitMargin: item.profitMargin || item.profit_margin || 0,
    clientDistribution: item.clientDistribution || item.client_distribution || []
  }))
})

const getRowKey = (record) => {
  return record.userId || record.user_id || record.id || Math.random()
}

const formatHours = (hours) => {
  return `${Number(hours).toFixed(1)}h`
}

const formatHoursDifference = (difference) => {
  const value = Number(difference)
  if (Number.isNaN(value)) {
    return '-'
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}h`
}

const handleViewClientDistribution = (record) => {
  if (props.onViewClientDistribution) {
    props.onViewClientDistribution(record.name, record.clientDistribution)
  }
}

const hoursColumns = new Set(['standardHours', 'weightedHours'])

const performanceSummary = computed(() => {
  const list = employeeTableData.value
  if (!list.length) {
    return [
      { label: '員工人數', value: 0, format: 'number' },
      { label: '標準工時', value: 0, format: 'hours' },
      { label: '加權工時', value: 0, format: 'hours' },
      { label: '總產生收入', value: 0, format: 'currency' },
      { label: '總成本', value: 0, format: 'currency' },
      { label: '總毛利', value: 0, format: 'currency' },
      { label: '平均毛利率', value: 0, format: 'percent' }
    ]
  }

  const totals = list.reduce(
    (acc, item) => {
      acc.count += 1
      acc.standardHours += item.standardHours || 0
      acc.weightedHours += item.weightedHours || 0
      acc.generatedRevenue += item.generatedRevenue || 0
      acc.totalCost += item.totalCost || 0
      acc.profit += item.profit || 0
      return acc
    },
    {
      count: 0,
      standardHours: 0,
      weightedHours: 0,
      generatedRevenue: 0,
      totalCost: 0,
      profit: 0
    }
  )

  const profitMargin =
    totals.generatedRevenue > 0 ? (totals.profit / totals.generatedRevenue) * 100 : 0

  return [
    { label: '員工人數', value: totals.count, format: 'number' },
    { label: '標準工時', value: totals.standardHours, format: 'hours' },
    { label: '加權工時', value: totals.weightedHours, format: 'hours' },
    { label: '總產生收入', value: totals.generatedRevenue, format: 'currency' },
    { label: '總成本', value: totals.totalCost, format: 'currency' },
    { label: '總毛利', value: totals.profit, format: 'currency' },
    { label: '平均毛利率', value: profitMargin, format: 'percent' }
  ]
})

const formatSummaryValue = (item) => {
  switch (item.format) {
    case 'currency':
      return formatCurrency(item.value)
    case 'hours': {
      const number = Number(item.value)
      if (!Number.isFinite(number) || number === 0) {
        return '-'
      }
      return `${number.toFixed(1)}h`
    }
    case 'percent': {
      const number = Number(item.value)
      if (!Number.isFinite(number) || number === 0) {
        return '-'
      }
      return `${number.toFixed(1)}%`
    }
    case 'number': {
      const number = Number(item.value)
      if (!Number.isFinite(number) || number === 0) {
        return '-'
      }
      return new Intl.NumberFormat('zh-TW', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(number)
    }
    default:
      return item.value ?? '-'
  }
}
</script>

<style scoped>
.report-block {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(15, 23, 42, 0.05);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
}

.report-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.summary-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  min-width: 140px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.04);
}

.summary-label {
  font-size: 12px;
  color: #4b5563;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.report-note {
  margin: 0 0 12px;
  font-size: 12px;
  color: #6b7280;
}

.data-table {
  margin-top: 12px;
}

.numeric-cell {
  display: block;
  text-align: right;
}

.numeric-cell.positive {
  color: #16a34a;
}

.numeric-cell.negative {
  color: #dc2626;
}

.empty-state {
  padding: 40px 0;
}

.compact-table :deep(.ant-table-thead > tr > th),
.compact-table :deep(.ant-table-tbody > tr > td) {
  padding: 6px 8px;
  font-size: 12px;
  white-space: nowrap;
}
</style>


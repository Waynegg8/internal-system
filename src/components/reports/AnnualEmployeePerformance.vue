<template>
  <section class="report-block annual-employee-performance">
    <header class="report-header">
      <h2>年度員工產值分析</h2>
      <a-tag v-if="status === 'loading'" color="processing">載入中</a-tag>
      <a-tag v-else-if="status === 'success'" color="success">已載入</a-tag>
      <a-tag v-else-if="status === 'error'" color="error">載入失敗</a-tag>
    </header>

    <div class="summary-grid">
      <div v-for="item in summaryItems" :key="item.label" class="summary-item">
        <span class="summary-label">{{ item.label }}</span>
        <span class="summary-value">{{ item.value }}</span>
      </div>
    </div>

    <a-spin :spinning="status === 'loading'">
      <a-table
        v-if="employeeTableData.length > 0"
        :columns="columns"
        :data-source="employeeTableData"
        :row-key="getRowKey"
        :pagination="false"
        size="small"
        class="compact-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            {{ record.name }}
          </template>
          <template v-else-if="hoursColumns.has(column.key)">
            <span class="numeric-cell">{{ formatHours(record[column.key]) }}</span>
          </template>
          <template v-else-if="column.key === 'hoursDifference'">
            <span
              class="numeric-cell"
              :class="record.hoursDifference >= 0 ? 'negative' : 'positive'"
            >
              {{ formatHoursDifference(record.hoursDifference) }}
            </span>
          </template>
          <template v-else-if="currencyColumns.has(column.key)">
            <span class="numeric-cell">{{ formatCurrency(record[column.key]) }}</span>
          </template>
          <template v-else-if="column.key === 'annualProfitMargin'">
            <span class="numeric-cell">{{ formatPercent(record.annualProfitMargin / 100) }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="handleViewTrend(record)">趨勢</a-button>
              <a-button type="link" @click="handleViewDistribution(record)">客戶分布</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <a-empty
        v-else-if="status !== 'loading'"
        description="本年無員工工時記錄"
        class="empty-state"
      />
    </a-spin>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency, formatPercent } from '@/utils/formatters'

const props = defineProps({
  data: {
    type: Object,
    default: null
  },
  status: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['view-trend', 'view-distribution'])

// 表格列定義
const columns = [
  {
    title: '姓名',
    key: 'name',
    width: 120,
  },
  {
    title: '全年標準工時',
    key: 'annualStandardHours',
    width: 150,
    align: 'right'
  },
  {
    title: '全年加權工時',
    key: 'annualWeightedHours',
    width: 150,
    align: 'right'
  },
  {
    title: '工時差異',
    key: 'hoursDifference',
    width: 120,
    align: 'right'
  },
  {
    title: '產生收入',
    key: 'annualRevenue',
    width: 150,
    align: 'right'
  },
  {
    title: '年度成本',
    key: 'annualCost',
    width: 150,
    align: 'right'
  },
  {
    title: '年度毛利',
    key: 'annualProfit',
    width: 150,
    align: 'right'
  },
  {
    title: '毛利率',
    key: 'annualProfitMargin',
    width: 120,
    align: 'right'
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
  }
]

// 員工產值表格數據
const employeeTableData = computed(() => {
  if (!props.data || !props.data.employeeSummary) {
    return []
  }

  return props.data.employeeSummary.map(item => ({
    userId: item.userId || item.user_id,
    name: item.name || '',
    annualStandardHours: item.annualStandardHours || item.annual_standard_hours || 0,
    annualWeightedHours: item.annualWeightedHours || item.annual_weighted_hours || 0,
    hoursDifference: item.hoursDifference || item.hours_difference || 0,
    annualRevenue: item.annualRevenue || item.annual_revenue || 0,
    annualCost: item.annualCost || item.annual_cost || 0,
    annualProfit: item.annualProfit || item.annual_profit || 0,
    annualProfitMargin: item.annualProfitMargin || item.annual_profit_margin || 0,
    monthlyTrend: item.monthlyTrend || item.monthly_trend || [],
    clientDistribution: item.clientDistribution || item.client_distribution || []
  }))
})

const summaryItems = computed(() => {
  const list = employeeTableData.value
  if (!list.length) {
    return [
      { label: '員工人數', value: '-' },
      { label: '全年標準工時', value: '-' },
      { label: '全年加權工時', value: '-' },
      { label: '總產生收入', value: '-' },
      { label: '總成本', value: '-' },
      { label: '總毛利', value: '-' },
      { label: '平均毛利率', value: '-' }
    ]
  }

  const aggregates = list.reduce(
    (acc, item) => {
      acc.count += 1
      acc.standardHours += item.annualStandardHours || 0
      acc.weightedHours += item.annualWeightedHours || 0
      acc.revenue += item.annualRevenue || 0
      acc.cost += item.annualCost || 0
      acc.profit += item.annualProfit || 0
      return acc
    },
    {
      count: 0,
      standardHours: 0,
      weightedHours: 0,
      revenue: 0,
      cost: 0,
      profit: 0
    }
  )

  const avgMargin = aggregates.revenue > 0 ? (aggregates.profit / aggregates.revenue) * 100 : 0

  return [
    { label: '員工人數', value: formatNumber(aggregates.count) },
    { label: '全年標準工時', value: formatHours(aggregates.standardHours) },
    { label: '全年加權工時', value: formatHours(aggregates.weightedHours) },
    { label: '總產生收入', value: formatCurrency(aggregates.revenue) },
    { label: '總成本', value: formatCurrency(aggregates.cost) },
    { label: '總毛利', value: formatCurrency(aggregates.profit) },
    { label: '平均毛利率', value: aggregates.revenue > 0 ? `${avgMargin.toFixed(1)}%` : '-' }
  ]
})

// 獲取行鍵
const getRowKey = (record) => {
  return record.userId || record.user_id || record.id || Math.random()
}

const formatHours = (hours) => {
  const number = Number(hours)
  if (!Number.isFinite(number) || number === 0) {
    return '-'
  }
  return `${number.toFixed(1)}h`
}

const formatHoursDifference = (difference) => {
  const value = Number(difference)
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}h`
}

const formatNumber = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) {
    return '-'
  }
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number)
}

// 處理查看趨勢
const handleViewTrend = (record) => {
  emit('view-trend', record.name, record.monthlyTrend)
}

// 處理查看客戶分布
const handleViewDistribution = (record) => {
  emit('view-distribution', record.name, record.clientDistribution)
}

const hoursColumns = new Set(['annualStandardHours', 'annualWeightedHours'])
const currencyColumns = new Set(['annualRevenue', 'annualCost', 'annualProfit'])
</script>

<style scoped>
.annual-employee-performance {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.report-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.summary-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  overflow-x: auto;
}

.summary-item {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
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
  padding: 32px 0;
}

.compact-table :deep(.ant-table-thead > tr > th),
.compact-table :deep(.ant-table-tbody > tr > td) {
  padding: 6px 8px;
  font-size: 12px;
  white-space: nowrap;
}
</style>


<template>
  <section class="report-block annual-client-profitability">
    <header class="report-header">
      <h2>年度客戶毛利分析</h2>
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

    <section class="sub-section">
      <h3 class="section-title">客戶年度彙總</h3>
      <a-spin :spinning="status === 'loading'">
        <a-table
          v-if="clientSummaryData.length > 0"
          :columns="clientSummaryColumns"
          :data-source="clientSummaryData"
          :row-key="getRowKey"
          :pagination="false"
          size="small"
          class="compact-table"
          :expandable="expandableConfig"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'clientName'">
              {{ record.clientName }}
            </template>
            <template v-else-if="hoursColumns.has(column.key)">
              <span class="numeric-cell">{{ formatHours(record[column.key]) }}</span>
            </template>
            <template v-else-if="column.key === 'annualProfit'">
              <span
                class="numeric-cell"
                :class="record.annualProfit >= 0 ? 'positive' : 'negative'"
              >
                {{ formatCurrency(record.annualProfit) }}
              </span>
            </template>
            <template v-else-if="column.key === 'annualProfitMargin'">
              <span class="numeric-cell">{{ formatPercent(record.annualProfitMargin / 100) }}</span>
            </template>
            <template v-else-if="currencyColumns.has(column.key)">
              <span class="numeric-cell">{{ formatCurrency(record[column.key]) }}</span>
            </template>
          </template>

          <template #expandedRowRender="{ record }">
            <div class="service-table-wrapper">
              <a-table
                v-if="record.serviceDetails && record.serviceDetails.length > 0"
                :columns="serviceColumns"
                :data-source="record.serviceDetails"
                :pagination="false"
                size="small"
                :row-key="(r) => r.serviceId || r.service_id || r.id || Math.random()"
                class="compact-table"
              >
                <template #bodyCell="{ column, record: serviceRecord }">
                  <template v-if="column.key === 'serviceType'">
                    {{ getServiceTypeName(serviceRecord) }}
                  </template>
                  <template v-else-if="hoursColumns.has(column.key)">
                    <span class="numeric-cell">{{ formatHours(getServiceValue(serviceRecord, column.key)) }}</span>
                  </template>
                  <template v-else-if="column.key === 'revenuePercentage'">
                    <span class="numeric-cell">
                      {{ formatPercent(getServiceValue(serviceRecord, column.key) / 100) }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="numeric-cell">
                      {{ formatCurrency(getServiceValue(serviceRecord, column.key)) }}
                    </span>
                  </template>
                </template>
              </a-table>
              <div v-else class="service-empty">暫無服務類型明細</div>
            </div>
          </template>
        </a-table>
        <a-empty
          v-else-if="status !== 'loading'"
          description="本年無客戶成本記錄"
          class="empty-state"
        />
      </a-spin>
    </section>

    <section class="sub-section">
      <h3 class="section-title">服務類型彙總</h3>
      <a-spin :spinning="status === 'loading'">
        <a-table
          v-if="serviceTypeSummaryData.length > 0"
          :columns="serviceTypeSummaryColumns"
          :data-source="serviceTypeSummaryData"
          :row-key="(record) => record.serviceName"
          :pagination="false"
          size="small"
          class="compact-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'serviceName'">
              {{ record.serviceName }}
            </template>
            <template v-else-if="hoursColumns.has(column.key)">
              <span class="numeric-cell">{{ formatHours(record[column.key]) }}</span>
            </template>
            <template v-else-if="currencyColumns.has(column.key)">
              <span class="numeric-cell">{{ formatCurrency(record[column.key]) }}</span>
            </template>
          </template>
        </a-table>
        <a-empty
          v-else-if="status !== 'loading'"
          description="本年無服務記錄"
          class="empty-state"
        />
      </a-spin>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency, formatPercent, formatNumber } from '@/utils/formatters'

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

const clientSummaryColumns = [
  { title: '客戶名稱', key: 'clientName' },
  { title: '全年工時', key: 'annualHours', align: 'right' },
  { title: '加權工時', key: 'annualWeightedHours', align: 'right' },
  { title: '總成本', key: 'annualCost', align: 'right' },
  { title: '全年收入', key: 'annualRevenue', align: 'right' },
  { title: '毛利', key: 'annualProfit', align: 'right' },
  { title: '毛利率', key: 'annualProfitMargin', align: 'right' },
  { title: '月均收入', key: 'avgMonthlyRevenue', align: 'right' }
]

const serviceColumns = [
  { title: '服務類型', key: 'serviceType' },
  { title: '工時', key: 'hours', align: 'right' },
  { title: '加權工時', key: 'weightedHours', align: 'right' },
  { title: '收入', key: 'revenue', align: 'right' },
  { title: '收入占比', key: 'revenuePercentage', align: 'right' }
]

const serviceTypeSummaryColumns = [
  { title: '服務類型', key: 'serviceName' },
  { title: '全年工時', key: 'totalHours', align: 'right' },
  { title: '加權工時', key: 'weightedHours', align: 'right' }
]

const hoursColumns = new Set(['annualHours', 'annualWeightedHours', 'hours', 'weightedHours', 'totalHours'])
const currencyColumns = new Set(['annualCost', 'annualRevenue', 'annualProfit', 'avgMonthlyRevenue', 'revenue'])

const clientSummaryData = computed(() => {
  if (!props.data || !props.data.clientSummary) {
    return []
  }

  return props.data.clientSummary.map((item) => ({
    clientId: item.clientId || item.client_id,
    clientName: item.clientName || item.client_name || '',
    annualWeightedHours: item.annualWeightedHours || item.annual_weighted_hours || 0,
    annualHours: item.annualHours || item.annual_hours || 0,
    annualCost: item.annualCost || item.annual_cost || 0,
    annualRevenue: item.annualRevenue || item.annual_revenue || 0,
    annualProfit: item.annualProfit || item.annual_profit || 0,
    annualProfitMargin: item.annualProfitMargin || item.annual_profit_margin || 0,
    avgMonthlyRevenue: item.avgMonthlyRevenue || item.avg_monthly_revenue || 0,
    serviceDetails: item.serviceDetails || item.service_details || []
  }))
})

const serviceTypeSummaryData = computed(() => {
  if (!props.data || !props.data.serviceTypeSummary) {
    return []
  }

  return props.data.serviceTypeSummary.map((item) => ({
    serviceName: item.serviceName || item.service_name || '',
    totalHours: item.totalHours || item.total_hours || 0,
    weightedHours: item.weightedHours || item.weighted_hours || 0
  }))
})

const summaryItems = computed(() => {
  const list = clientSummaryData.value
  if (!list.length) {
    return [
      { label: '客戶數', value: '-' },
      { label: '全年標準工時', value: '-' },
      { label: '全年加權工時', value: '-' },
      { label: '總收入', value: '-' },
      { label: '總成本', value: '-' },
      { label: '總毛利', value: '-' },
      { label: '平均毛利率', value: '-' }
    ]
  }

  const aggregates = list.reduce(
    (acc, item) => {
      acc.count += 1
      acc.standardHours += item.annualHours || 0
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
    { label: '客戶數', value: formatNumber(aggregates.count) },
    { label: '全年標準工時', value: formatHours(aggregates.standardHours) },
    { label: '全年加權工時', value: formatHours(aggregates.weightedHours) },
    { label: '總收入', value: formatCurrency(aggregates.revenue) },
    { label: '總成本', value: formatCurrency(aggregates.cost) },
    { label: '總毛利', value: formatCurrency(aggregates.profit) },
    { label: '平均毛利率', value: aggregates.revenue > 0 ? `${avgMargin.toFixed(1)}%` : '-' }
  ]
})

const expandableConfig = {
  rowExpandable: (record) => Array.isArray(record.serviceDetails) && record.serviceDetails.length > 0
}

const getRowKey = (record) => record.clientId || record.client_id || record.id || Math.random()

const formatHours = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) {
    return '-'
  }
  return `${number.toFixed(1)}h`
}

const getServiceTypeName = (service) => {
  return service.serviceName || service.service_name || service.serviceType || service.service_type || '-'
}

const getServiceValue = (service, key) => {
  switch (key) {
    case 'hours':
      return service.hours || service.totalHours || service.total_hours || 0
    case 'weightedHours':
      return service.weightedHours || service.weighted_hours || 0
    case 'revenue':
      return service.revenue || 0
    case 'revenuePercentage':
      return service.revenuePercentage || service.revenue_percentage || 0
    default:
      return 0
  }
}

const formatMonth = (month) => `${month}月`
</script>

<style scoped>
.report-block {
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

.sub-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: #111827;
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

.service-table-wrapper {
  background-color: #f8fafc;
  padding: 16px;
  margin-left: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.service-empty {
  padding: 16px;
  text-align: center;
  color: #6b7280;
}

.compact-table :deep(.ant-table-thead > tr > th),
.compact-table :deep(.ant-table-tbody > tr > td) {
  padding: 6px 8px;
  font-size: 12px;
  white-space: nowrap;
}

.empty-state {
  padding: 32px 0;
}
</style>


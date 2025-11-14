<template>
  <section class="report-block client-profit-report">
    <header class="report-header">
      <h2>月度客戶毛利分析</h2>
    </header>

    <div class="summary-grid">
      <div
        v-for="item in profitabilitySummary"
        :key="item.label"
        class="summary-item"
      >
        <span class="summary-label">{{ item.label }}</span>
        <span class="summary-value">{{ formatSummaryValue(item) }}</span>
      </div>
    </div>

    <p class="report-note">
      已依應計制將跨月服務按工時比例攤提，顯示每位客戶的收入、成本與毛利表現。
    </p>

    <a-spin :spinning="reportsStore.loading">
      <a-table
        v-if="clientTableData.length > 0"
        :columns="columns"
        :data-source="clientTableData"
        :row-key="getRowKey"
        :pagination="false"
        size="small"
        class="data-table compact-table"
        :expandable="expandableConfig"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'clientName'">
            {{ record.clientName }}
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
          <template v-else>
            <span class="numeric-cell">
              {{ hoursColumns.has(column.key) ? formatHours(record[column.key]) : formatCurrency(record[column.key]) }}
            </span>
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
                <template v-else-if="column.key === 'profit'">
                  <span
                    class="numeric-cell"
                    :class="getServiceProfit(serviceRecord) >= 0 ? 'positive' : 'negative'"
                  >
                    {{ formatCurrency(getServiceProfit(serviceRecord)) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'profitMargin'">
                  <span class="numeric-cell">
                    {{ formatPercent(getServiceProfitMargin(serviceRecord) / 100) }}
                  </span>
                </template>
                <template v-else>
                  <span class="numeric-cell">
                    {{ getServiceValue(serviceRecord, column.key) }}
                  </span>
                </template>
              </template>
            </a-table>
            <div v-else class="service-empty">暫無服務類型明細</div>
          </div>
        </template>
      </a-table>

      <a-empty
        v-else-if="!reportsStore.loading"
        description="本月無客戶成本記錄"
        class="empty-state"
      />
    </a-spin>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useReportsStore } from '@/stores/reports'
import { formatCurrency, formatPercent } from '@/utils/formatters'

const reportsStore = useReportsStore()

const columns = [
  { title: '客戶名稱', key: 'clientName' },
  { title: '總工時', key: 'totalHours', align: 'right' },
  { title: '加權工時', key: 'weightedHours', align: 'right' },
  { title: '平均時薪', key: 'avgHourlyRate', align: 'right' },
  { title: '本月收入', key: 'revenue', align: 'right' },
  { title: '總成本', key: 'totalCost', align: 'right' },
  { title: '毛利', key: 'profit', align: 'right' },
  { title: '毛利率', key: 'profitMargin', align: 'right' }
]

const serviceColumns = [
  { title: '服務類型', key: 'serviceType' },
  { title: '工時', key: 'hours', align: 'right' },
  { title: '加權工時', key: 'weightedHours', align: 'right' },
  { title: '平均時薪', key: 'avgHourlyRate', align: 'right' },
  { title: '總成本', key: 'totalCost', align: 'right' },
  { title: '收入', key: 'revenue', align: 'right' },
  { title: '毛利', key: 'profit', align: 'right' },
  { title: '毛利率', key: 'profitMargin', align: 'right' }
]

const expandableConfig = {
  expandedRowRender: () => true,
  rowExpandable: (record) => Array.isArray(record.serviceDetails) && record.serviceDetails.length > 0
}

const clientTableData = computed(() => {
  const data = reportsStore.monthlyClientProfitability
  if (!data || !data.clients) {
    return []
  }

  return data.clients.map((item) => ({
    clientId: item.clientId || item.client_id,
    clientName: item.clientName || item.client_name || '',
    totalHours: item.totalHours || item.total_hours || 0,
    weightedHours: item.weightedHours || item.weighted_hours || 0,
    avgHourlyRate: item.avgHourlyRate || item.avg_hourly_rate || 0,
    revenue: item.revenue || 0,
    totalCost: item.totalCost || item.total_cost || 0,
    profit: item.profit || 0,
    profitMargin: item.profitMargin || item.profit_margin || 0,
    serviceDetails: item.serviceDetails || item.service_details || []
  }))
})

const getRowKey = (record) => {
  return record.clientId || record.client_id || record.id || Math.random()
}

const formatHours = (hours) => {
  return `${Number(hours).toFixed(1)}h`
}

const getServiceTypeName = (service) => {
  return service.serviceName || service.service_name || service.serviceType || service.service_type || '-'
}

const getServiceHours = (service) => {
  return service.hours || service.totalHours || service.total_hours || 0
}

const getServiceWeightedHours = (service) => {
  return service.weightedHours || service.weighted_hours || 0
}

const getServiceAvgHourlyRate = (service) => {
  return service.avgHourlyRate || service.avg_hourly_rate || 0
}

const getServiceTotalCost = (service) => {
  return service.totalCost || service.total_cost || 0
}

const getServiceRevenue = (service) => {
  return service.revenue || service.revenue_amount || 0
}

const getServiceProfit = (service) => {
  return getServiceRevenue(service) - getServiceTotalCost(service)
}

const getServiceProfitMargin = (service) => {
  const revenue = getServiceRevenue(service)
  const profit = getServiceProfit(service)
  return revenue > 0 ? (profit / revenue) * 100 : 0
}

const getServiceValue = (service, key) => {
  switch (key) {
    case 'hours':
      return formatHours(getServiceHours(service))
    case 'weightedHours':
      return formatHours(getServiceWeightedHours(service))
    case 'avgHourlyRate':
    case 'totalCost':
    case 'revenue':
      return formatCurrency(service[key] || service[camelToSnake(key)] || 0)
    default:
      return formatCurrency(0)
  }
}

const camelToSnake = (key) => key.replace(/([A-Z])/g, '_$1').toLowerCase()

const hoursColumns = new Set(['totalHours', 'weightedHours'])

const profitabilitySummary = computed(() => {
  const list = clientTableData.value
  if (!list.length) {
    return [
      { label: '客戶數', value: 0, format: 'number' },
      { label: '總收入', value: 0, format: 'currency' },
      { label: '總成本', value: 0, format: 'currency' },
      { label: '總毛利', value: 0, format: 'currency' },
      { label: '平均毛利率', value: 0, format: 'percent' }
    ]
  }

  const totals = list.reduce(
    (acc, item) => {
      acc.count += 1
      acc.totalHours += item.totalHours || 0
      acc.weightedHours += item.weightedHours || 0
      acc.revenue += item.revenue || 0
      acc.cost += item.totalCost || 0
      acc.profit += item.profit || 0
      return acc
    },
    {
      count: 0,
      totalHours: 0,
      weightedHours: 0,
      revenue: 0,
      cost: 0,
      profit: 0
    }
  )

  const profitMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

  return [
    { label: '客戶數', value: totals.count, format: 'number' },
    { label: '總工時', value: totals.totalHours, format: 'hours' },
    { label: '加權工時', value: totals.weightedHours, format: 'hours' },
    { label: '總收入', value: totals.revenue, format: 'currency' },
    { label: '總成本', value: totals.cost, format: 'currency' },
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

.service-table-wrapper {
  background-color: #f8fafc;
  padding: 16px;
  margin-left: 16px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.05);
}

.service-empty {
  padding: 16px;
  text-align: center;
  color: #6b7280;
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


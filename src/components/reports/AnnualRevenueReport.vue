<template>
  <section class="report-block annual-revenue-report">
    <header class="report-header">
      <h2>年度收款報表</h2>
      <a-tag v-if="status === 'loading'" color="processing">載入中</a-tag>
      <a-tag v-else-if="status === 'success'" color="success">已載入</a-tag>
      <a-tag v-else-if="status === 'error'" color="error">載入失敗</a-tag>
    </header>

    <p class="report-note">
      以收據開立月份彙總年度數據：全年應收代表於該年度開立的收據總額，全年期限內實收／未收為這些收據在當年度的回款與尚未收回金額；全年逾期收回與年末逾期未收則代表歷史收據在本年度追回與年底仍未收回的逾期餘額。
    </p>

    <div class="summary-grid">
      <div v-for="item in summaryItems" :key="item.label" class="summary-item">
        <span class="summary-label">{{ item.label }}</span>
        <span class="summary-value" :class="{ danger: item.danger }">{{ item.value }}</span>
      </div>
    </div>

    <section class="sub-section">
      <h3 class="section-title">月度收款趨勢</h3>
      <a-spin :spinning="status === 'loading'">
        <a-table
          v-if="monthlyTrendData.length > 0"
          :columns="monthlyTrendColumns"
          :data-source="monthlyTrendData"
          :row-key="(record) => record.month"
          :pagination="false"
          size="small"
          class="compact-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'month'">
              {{ formatMonth(record.month) }}
            </template>
            <template v-else>
              <span class="numeric-cell">{{ formatCurrency(record[column.key]) }}</span>
            </template>
          </template>
        </a-table>
        <a-empty v-else-if="status !== 'loading'" description="本年無收款記錄" class="empty-state" />
      </a-spin>
    </section>

    <section class="sub-section">
      <h3 class="section-title">客戶年度彙總</h3>
      <a-spin :spinning="status === 'loading'">
        <a-table
          v-if="clientSummaryData.length > 0"
          :columns="clientSummaryColumns"
          :data-source="clientSummaryData"
          :row-key="(record) => record.key"
          :pagination="false"
          size="small"
          class="compact-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'clientName'">
              <span :class="['name-cell', { 'is-detail': record.isDetail }]">
                {{ record.clientName }}
              </span>
            </template>
            <template v-else>
              <span class="numeric-cell">{{ formatDisplayCurrency(record[column.key]) }}</span>
            </template>
          </template>
        </a-table>
        <a-empty v-else-if="status !== 'loading'" description="本年無客戶記錄" class="empty-state" />
      </a-spin>
    </section>

    <section class="sub-section">
      <h3 class="section-title">服務類型彙總</h3>
      <a-spin :spinning="status === 'loading'">
        <a-table
          v-if="serviceTypeSummaryData.length > 0"
          :columns="serviceTypeSummaryColumns"
          :data-source="serviceTypeSummaryData"
          :row-key="(record) => record.key"
          :pagination="false"
          size="small"
          class="compact-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'serviceName'">
              <span :class="['name-cell', { 'is-detail': record.isDetail }]">
                {{ record.serviceName }}
              </span>
            </template>
            <template v-else>
              <span class="numeric-cell">{{ formatDisplayCurrency(record[column.key]) }}</span>
            </template>
          </template>
        </a-table>
        <a-empty v-else-if="status !== 'loading'" description="本年無服務記錄" class="empty-state" />
      </a-spin>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'

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

const monthlyTrendColumns = [
  { title: '月份', key: 'month' },
  { title: '本月應收', key: 'currentReceivable', align: 'right' },
  { title: '本月期限內實收', key: 'currentReceived', align: 'right' },
  { title: '本月期限內未收', key: 'currentOutstanding', align: 'right' },
  { title: '逾期收回', key: 'overdueRecovered', align: 'right' },
  { title: '逾期未收', key: 'overdueOutstanding', align: 'right' },
  { title: '總未收', key: 'totalOutstanding', align: 'right' }
]

const clientSummaryColumns = [
  { title: '客戶名稱', key: 'clientName' },
  { title: '全年應收', key: 'currentReceivable', align: 'right' },
  { title: '全年期限內實收', key: 'currentReceived', align: 'right' },
  { title: '全年期限內未收', key: 'currentOutstanding', align: 'right' },
  { title: '全年逾期收回', key: 'overdueRecovered', align: 'right' },
  { title: '年末逾期未收', key: 'overdueOutstanding', align: 'right' },
  { title: '年末總未收', key: 'totalOutstanding', align: 'right' }
]

const serviceTypeSummaryColumns = [
  { title: '服務類型', key: 'serviceName' },
  { title: '全年應收', key: 'currentReceivable', align: 'right' },
  { title: '全年期限內實收', key: 'currentReceived', align: 'right' },
  { title: '全年期限內未收', key: 'currentOutstanding', align: 'right' },
  { title: '全年逾期收回', key: 'overdueRecovered', align: 'right' },
  { title: '年末逾期未收', key: 'overdueOutstanding', align: 'right' },
  { title: '年末總未收', key: 'totalOutstanding', align: 'right' }
]

const summaryItems = computed(() => {
  const summary = props.data?.summary || {
    currentReceivable: 0,
    currentReceived: 0,
    currentOutstanding: 0,
    overdueRecovered: 0,
    overdueOutstanding: 0,
    totalOutstanding: 0
  }
  return [
    { label: '全年應收金額', value: formatCurrency(summary.currentReceivable) },
    { label: '全年期限內實收', value: formatCurrency(summary.currentReceived) },
    { label: '全年期限內未收', value: formatCurrency(summary.currentOutstanding), danger: (summary.currentOutstanding || 0) > 0 },
    {
      label: '全年逾期收回',
      value: formatCurrency(summary.overdueRecovered)
    },
    {
      label: '年末逾期未收',
      value: formatCurrency(summary.overdueOutstanding),
      danger: (summary.overdueOutstanding || 0) > 0
    },
    {
      label: '年末總未收',
      value: formatCurrency(summary.totalOutstanding),
      danger: (summary.totalOutstanding || 0) > 0
    }
  ]
})

const monthlyTrendData = computed(() => props.data?.monthlyTrend || [])

const clientSummaryData = computed(() => {
  const clients = props.data?.clientSummary || []
  return clients.map((client) => {
    const serviceDetails = Array.isArray(client.serviceDetails) ? client.serviceDetails : []
    const detailRows = serviceDetails.map((detail, index) => ({
      key: `detail-${client.clientId || 'c'}-${detail.monthNum || detail.month}-${detail.serviceName || index}`,
      isDetail: true,
      clientName: `${formatMonth(detail.monthNum || detail.month)} ${detail.serviceName || '-'}`,
      currentReceivable: detail.currentReceivable || 0,
      currentReceived: detail.currentReceived || 0,
      currentOutstanding: detail.currentOutstanding || 0,
      overdueRecovered: detail.overdueRecovered || 0,
      overdueOutstanding: detail.overdueOutstanding || 0,
      totalOutstanding: detail.totalOutstanding || 0
    }))

    return {
      key: `client-${client.clientId || client.clientName || Math.random()}`,
      clientId: client.clientId,
      clientName: client.clientName || '-',
      currentReceivable: client.currentReceivable || 0,
      currentReceived: client.currentReceived || 0,
      currentOutstanding: client.currentOutstanding || 0,
      overdueRecovered: client.overdueRecovered || 0,
      overdueOutstanding: client.overdueOutstanding || 0,
      totalOutstanding: client.totalOutstanding || 0,
      children: detailRows.length > 0 ? detailRows : undefined
    }
  })
})

const serviceTypeSummaryData = computed(() => {
  const services = props.data?.serviceTypeSummary || []
  return services.map((service) => {
    const monthlyDetails = Array.isArray(service.monthlyDetails) ? service.monthlyDetails : []
    const detailRows = monthlyDetails.map((detail, index) => ({
      key: `detail-${service.serviceName || 's'}-${detail.monthNum || detail.month}-${detail.clientId || detail.clientName || index}`,
      isDetail: true,
      serviceName: `${formatMonth(detail.monthNum || detail.month)} ${detail.clientName || '-'}`,
      currentReceivable: detail.currentReceivable || 0,
      currentReceived: detail.currentReceived || 0,
      currentOutstanding: detail.currentOutstanding || 0,
      overdueRecovered: detail.overdueRecovered || 0,
      overdueOutstanding: detail.overdueOutstanding || 0,
      totalOutstanding: detail.totalOutstanding || 0
    }))

    return {
      key: `service-${service.serviceName || Math.random()}`,
      serviceName: service.serviceName || '-',
      currentReceivable: service.currentReceivable || 0,
      currentReceived: service.currentReceived || 0,
      currentOutstanding: service.currentOutstanding || 0,
      overdueRecovered: service.overdueRecovered || 0,
      overdueOutstanding: service.overdueOutstanding || 0,
      totalOutstanding: service.totalOutstanding || 0,
      children: detailRows.length > 0 ? detailRows : undefined
    }
  })
})

const formatMonth = (month) => `${month}月`

const formatDisplayCurrency = (value) => {
  if (value == null) {
    return '-'
  }
  const number = Number(value)
  if (Number.isNaN(number) || number === 0) {
    return '-'
  }
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number)
}

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
  flex-wrap: wrap;
  gap: 12px;
}

.report-note {
  margin-top: -4px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
}

.summary-item {
  display: flex;
  flex-direction: column;
  min-width: 160px;
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

.summary-value.danger {
  color: #dc2626;
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

.compact-table :deep(.ant-table-thead > tr > th),
.compact-table :deep(.ant-table-tbody > tr > td) {
  padding: 6px 8px;
  font-size: 12px;
  white-space: nowrap;
}

.nested-table {
  margin-top: 12px;
}

/* 展開表格對齊主表格的列寬 */
.nested-table-aligned :deep(.ant-table) {
  table-layout: fixed;
  width: 100%;
}

/* 確保展開表格的數字列與主表格對齊 */
.nested-table-aligned :deep(.ant-table-tbody > tr > td:nth-child(3)),
.nested-table-aligned :deep(.ant-table-tbody > tr > td:nth-child(4)),
.nested-table-aligned :deep(.ant-table-tbody > tr > td:nth-child(5)),
.nested-table-aligned :deep(.ant-table-tbody > tr > td:nth-child(6)),
.nested-table-aligned :deep(.ant-table-tbody > tr > td:nth-child(7)),
.nested-table-aligned :deep(.ant-table-tbody > tr > td:nth-child(8)),
.nested-table-aligned :deep(.ant-table-tbody > tr > td:nth-child(9)) {
  text-align: right;
  padding-right: 8px;
}

.nested-table :deep(.ant-table-thead > tr > th),
.nested-table :deep(.ant-table-tbody > tr > td) {
  padding: 4px 6px;
  font-size: 12px;
}

.empty-state {
  padding: 32px 0;
}

.name-cell {
  display: block;
}

.name-cell.is-detail {
  padding-left: 24px;
  color: #1f2937;
}
</style>




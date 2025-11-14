<template>
  <section class="report-block revenue-report">
    <header class="report-header">
      <h2>月度收款報表</h2>
    </header>

    <p class="report-note">
      匯總基準：以收據開立日期統計本月應收，並追蹤當月追回的逾期款。「本月應收」表示於本月開立的收據；「本月期限內實收／未收」為這些收據於本月的回款與尚未收回金額；「逾期收回／逾期未收」則是歷史收據在本月的收款與仍未收回的逾期餘額。
    </p>

    <div class="summary-grid">
      <div
        v-for="item in revenueSummary"
        :key="item.label"
        class="summary-item"
      >
        <span class="summary-label">{{ item.label }}</span>
        <span
          class="summary-value"
          :class="{
            danger: item.variant === 'danger',
            muted: isDisplayEmpty(item)
          }"
        >
          {{ formatSummaryValue(item) }}
        </span>
      </div>
    </div>

    <a-spin :spinning="reportsStore.loading">
      <a-table
        v-if="clientTableData.length > 0"
        :columns="columns"
        :data-source="clientTableData"
        :row-key="getRowKey"
        :pagination="false"
        size="small"
        class="data-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'clientName'">
            <span :class="['name-cell', { 'is-receipt': record.isReceipt }]">
              {{ record.clientName }}
            </span>
          </template>
          <template v-else>
            <span class="numeric-cell">{{ formatDisplayCurrency(record[column.key]) }}</span>
          </template>
        </template>
      </a-table>

      <a-empty
        v-else-if="!reportsStore.loading"
        description="請選擇月份後載入資料"
        class="empty-state"
      />
    </a-spin>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useReportsStore } from '@/stores/reports'
import { formatCurrency } from '@/utils/formatters'

const reportsStore = useReportsStore()

const columns = [
  { title: '客戶名稱', key: 'clientName' },
  { title: '本月應收', key: 'currentReceivable', align: 'right' },
  { title: '本月期限內實收', key: 'currentReceived', align: 'right' },
  { title: '本月期限內未收', key: 'currentOutstanding', align: 'right' },
  { title: '逾期收回', key: 'overdueRecovered', align: 'right' },
  { title: '逾期未收', key: 'overdueOutstanding', align: 'right' },
  { title: '總未收', key: 'totalOutstanding', align: 'right' }
]

watch(
  () => reportsStore.monthlyRevenue,
  (value) => {
    if (value) {
      console.debug('[MonthlyRevenueReport] summary', value.summary)
      console.debug('[MonthlyRevenueReport] sample client', (value.clients || [])[0])
    }
  },
  { immediate: true }
)

const revenueSummary = computed(() => {
  const summary = reportsStore.monthlyRevenue?.summary || {
    currentReceivable: 0,
    currentReceived: 0,
    currentOutstanding: 0,
    overdueRecovered: 0,
    overdueOutstanding: 0,
    totalOutstanding: 0
  }

  return [
    {
      label: '本月應收（於本月開立收據）',
      value: summary.currentReceivable,
      format: 'currency'
    },
    {
      label: '本月期限內實收',
      value: summary.currentReceived,
      format: 'currency'
    },
    {
      label: '本月期限內未收',
      value: summary.currentOutstanding,
      format: 'currency',
      variant: summary.currentOutstanding > 0 ? 'danger' : 'default'
    },
    {
      label: '本月逾期收回',
      value: summary.overdueRecovered,
      format: 'currency'
    },
    {
      label: '逾期未收餘額',
      value: summary.overdueOutstanding,
      format: 'currency',
      variant: summary.overdueOutstanding > 0 ? 'danger' : 'default'
    },
    {
      label: '總未收餘額',
      value: summary.totalOutstanding,
      format: 'currency',
      variant: summary.totalOutstanding > 0 ? 'danger' : 'default'
    }
  ]
})

const clientTableData = computed(() => {
  const data = reportsStore.monthlyRevenue
  if (!data || !Array.isArray(data.clients)) {
    return []
  }

  return data.clients.map((client) => {
    const receipts = Array.isArray(client.receipts) ? client.receipts : []
    const receiptRows = receipts.map((receipt, index) => ({
      key: `receipt-${client.clientId || client.client_id || 'c'}-${receipt.receiptId || index}`,
      isReceipt: true,
      clientName: `收據 ${receipt.receiptId || ''}`,
      currentReceivable: receipt.currentReceivable,
      currentReceived: receipt.currentReceived,
      currentOutstanding: receipt.currentOutstanding,
      overdueRecovered: receipt.overdueRecovered,
      overdueOutstanding: receipt.overdueOutstanding,
      totalOutstanding: receipt.currentOutstanding + receipt.overdueOutstanding
    }))

    return {
      key: `client-${client.clientId || client.client_id || Math.random()}`,
      clientName: client.clientName || client.client_name || '-',
      currentReceivable: client.currentReceivable || 0,
      currentReceived: client.currentReceived || 0,
      currentOutstanding: client.currentOutstanding || 0,
      overdueRecovered: client.overdueRecovered || 0,
      overdueOutstanding: client.overdueOutstanding || 0,
      totalOutstanding: client.totalOutstanding || 0,
      children: receiptRows.length > 0 ? receiptRows : undefined
    }
  })
})

const getRowKey = (record) => record.key || Math.random()

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

const formatSummaryValue = (item) => {
  if (item.format === 'currency') {
    return formatCurrency(item.value)
  }
  return item.value ?? '-'
}

const isDisplayEmpty = (item) => {
  const value = item.value
  return value == null || Number.isNaN(Number(value)) || Number(value) === 0
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
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.04);
}

.summary-label {
  font-size: 13px;
  color: #4b5563;
  font-weight: 500;
}

.summary-value {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.summary-value.danger {
  color: #dc2626;
}

.summary-value.muted {
  color: #94a3b8;
}

.data-table {
  margin-top: 12px;
}

.report-note {
  margin-top: -4px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
}

.numeric-cell {
  display: block;
  text-align: right;
}

.name-cell {
  padding-left: 24px;
}

.name-cell.is-receipt {
  padding-left: 48px;
}

.empty-state {
  padding: 40px 0;
}
</style>


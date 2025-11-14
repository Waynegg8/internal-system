<template>
  <section class="report-block annual-payroll-report">
    <header class="report-header">
      <h2>年度薪資報表</h2>
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
      <h3 class="section-title">月度薪資趨勢</h3>
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
            <template v-else-if="column.key === 'employeeCount'">
              <span class="numeric-cell">{{ formatNumber(record.employeeCount) }}</span>
            </template>
            <template v-else-if="currencyColumns.has(column.key)">
              <span class="numeric-cell">{{ formatCurrency(record[column.key]) }}</span>
            </template>
            <template v-else>
              <span class="numeric-cell">{{ formatNumber(record[column.key]) }}</span>
            </template>
          </template>
        </a-table>
        <a-empty
          v-else-if="status !== 'loading'"
          description="本年無薪資記錄"
          class="empty-state"
        />
      </a-spin>
    </section>

    <section class="sub-section">
      <h3 class="section-title">按員工年度彙總</h3>
      <a-spin :spinning="status === 'loading'">
        <a-table
          v-if="employeeSummaryData.length > 0"
          :columns="employeeSummaryColumns"
          :data-source="employeeSummaryData"
          :row-key="(record) => record.userId"
          :pagination="false"
          size="small"
          class="compact-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              {{ record.name }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" @click="handleViewDetails(record)">
                查看明細
              </a-button>
            </template>
            <template v-else-if="currencyColumns.has(column.key)">
              <span class="numeric-cell">{{ formatCurrency(record[column.key]) }}</span>
            </template>
            <template v-else>
              <span class="numeric-cell">{{ formatNumber(record[column.key]) }}</span>
            </template>
          </template>
        </a-table>
        <a-empty
          v-else-if="status !== 'loading'"
          description="本年無員工記錄"
          class="empty-state"
        />
      </a-spin>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency, formatNumber } from '@/utils/formatters'

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

const emit = defineEmits(['view-details'])

// 月度趨勢表格列定義
const monthlyTrendColumns = [
  {
    title: '月份',
    key: 'month',
    width: 100
  },
  {
    title: '總應發',
    key: 'totalGrossSalary',
    width: 150,
    align: 'right'
  },
  {
    title: '總實發',
    key: 'totalNetSalary',
    width: 150,
    align: 'right'
  },
  {
    title: '人數',
    key: 'employeeCount',
    width: 100,
    align: 'right'
  },
  {
    title: '平均應發',
    key: 'avgGrossSalary',
    width: 150,
    align: 'right'
  }
]

// 員工彙總表格列定義
const employeeSummaryColumns = [
  {
    title: '姓名',
    key: 'name',
    width: 120
  },
  {
    title: '全年應發',
    key: 'annualGrossSalary',
    width: 150,
    align: 'right'
  },
  {
    title: '全年實發',
    key: 'annualNetSalary',
    width: 150,
    align: 'right'
  },
  {
    title: '月均應發',
    key: 'avgMonthlySalary',
    width: 150,
    align: 'right'
  },
  {
    title: '加班費總計',
    key: 'totalOvertimePay',
    width: 150,
    align: 'right'
  },
  {
    title: '績效總計',
    key: 'totalPerformanceBonus',
    width: 150,
    align: 'right'
  },
  {
    title: '年終獎',
    key: 'totalYearEndBonus',
    width: 150,
    align: 'right'
  },
  {
    title: '操作',
    key: 'action',
    width: 100
  }
]

// 統計數據
const summaryItems = computed(() => {
  const summary = props.data?.summary || {}
  return [
    { label: '全年總應發', value: formatCurrency(summary.annualGrossSalary) },
    { label: '全年總實發', value: formatCurrency(summary.annualNetSalary) },
    { label: '月均應發', value: formatCurrency(summary.avgMonthlySalary) },
    { label: '平均人數', value: formatNumber(summary.avgEmployeeCount) }
  ]
})

// 月度趨勢數據
const monthlyTrendData = computed(() => {
  if (!props.data || !props.data.monthlyTrend) {
    return []
  }
  return props.data.monthlyTrend || []
})

// 員工彙總數據
const employeeSummaryData = computed(() => {
  if (!props.data || !props.data.employeeSummary) {
    return []
  }
  return props.data.employeeSummary || []
})

const formatStatisticCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return '-'
  }
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value))
}

// 格式化月份
const formatMonth = (month) => {
  return `${month}月`
}

const currencyColumns = new Set([
  'totalGrossSalary',
  'totalNetSalary',
  'avgGrossSalary',
  'annualGrossSalary',
  'annualNetSalary',
  'avgMonthlySalary',
  'totalOvertimePay',
  'totalPerformanceBonus',
  'totalYearEndBonus'
])

// 處理查看明細
const handleViewDetails = (record) => {
  emit('view-details', record.name, record.monthlyDetails || [])
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
  gap: 24px;
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

.summary-item {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 10px 14px;
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




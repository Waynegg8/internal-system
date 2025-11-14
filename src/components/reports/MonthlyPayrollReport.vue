<template>
  <section class="report-block payroll-report">
    <header class="report-header">
      <h2>月度薪資報表</h2>
    </header>

    <div class="summary-grid">
      <div
        v-for="item in payrollSummary"
        :key="item.label"
        class="summary-item"
      >
        <span class="summary-label">{{ item.label }}</span>
        <span class="summary-value">{{ formatSummaryValue(item) }}</span>
      </div>
    </div>

    <a-spin :spinning="reportsStore.loading">
      <a-table
        v-if="payrollTableData.length > 0"
        :columns="columns"
        :data-source="payrollTableData"
        :row-key="getRowKey"
        :pagination="false"
        size="small"
        class="data-table compact-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            {{ record.name }}
          </template>
          <template v-else>
            <span class="numeric-cell">{{ formatCurrency(record[column.key]) }}</span>
          </template>
        </template>
      </a-table>

      <a-empty
        v-else-if="!reportsStore.loading"
        description="本月無薪資記錄"
        class="empty-state"
      />
    </a-spin>

    <section class="sub-section">
      <h3 class="section-title">薪資構成分析</h3>
      <a-spin :spinning="reportsStore.loading">
        <a-table
          v-if="compositionData.length > 0"
          :columns="compositionColumns"
          :data-source="compositionData"
          :row-key="(record) => record.key"
          :pagination="false"
          size="small"
          class="compact-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'item'">
              {{ record.name }}
            </template>
            <template v-else-if="column.key === 'amount'">
              <span class="numeric-cell">{{ formatCurrency(record.value) }}</span>
            </template>
            <template v-else-if="column.key === 'percentage'">
              <span class="numeric-cell">
                {{ formatPercent(record.percentage / 100) }}
              </span>
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
  </section>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useReportsStore } from '@/stores/reports'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { calculatePayrollComposition } from '@/utils/reports'

const reportsStore = useReportsStore()

const toArray = (value) => (Array.isArray(value) ? value : [])
const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
const isTruthy = (value) => value === true || value === 1 || value === '1' || value === 'true'
const normalizeBonusAmount = (bonus) => {
  if (!bonus) {
    return 0
  }
  if (bonus.amount != null) {
    const amount = Number(bonus.amount)
    if (Number.isFinite(amount)) {
      return amount
    }
  }
  const cents = bonus.amountCents ?? bonus.amount_cents
  if (cents != null) {
    const number = Number(cents)
    if (Number.isFinite(number)) {
      return number / 100
    }
  }
  return 0
}
const calculateFullAttendanceFromItems = (item) => {
  const isFullAttendance = isTruthy(item?.isFullAttendance ?? item?.is_full_attendance)
  if (!isFullAttendance) {
    return 0
  }
  const bonusItems = toArray(item?.regularBonusItems ?? item?.regular_bonus_items)
  if (bonusItems.length === 0) {
    return 0
  }

  const total = bonusItems
    .filter((bonus) => {
      const shouldPay = bonus?.shouldPay ?? bonus?.should_pay
      const isFull = bonus?.isFullAttendanceBonus ?? bonus?.is_full_attendance_bonus
      return isTruthy(shouldPay) && isTruthy(isFull)
    })
    .reduce((sum, bonus) => sum + normalizeBonusAmount(bonus), 0)

  return Number(total.toFixed(2))
}

watch(
  () => reportsStore.monthlyPayroll?.payrollDetails,
  (value) => {
    if (Array.isArray(value) && value.length) {
      console.debug(
        '[MonthlyPayrollReport] payrollDetails sample',
        value.map((item) => ({
          name: item.name || item.username,
          fullAttendanceBonus: item.fullAttendanceBonus ?? item.full_attendance_bonus,
          regularBonus: item.regularBonus ?? item.regular_bonus,
          isFullAttendance: item.isFullAttendance ?? item.is_full_attendance,
          regularBonusItems: (item.regularBonusItems ?? item.regular_bonus_items ?? []).map((bonus) => ({
            name: bonus?.name,
            amount: bonus?.amount ?? bonus?.amountCents ?? bonus?.amount_cents,
            shouldPay: bonus?.shouldPay ?? bonus?.should_pay,
            isFullAttendanceBonus: bonus?.isFullAttendanceBonus ?? bonus?.is_full_attendance_bonus
          }))
        }))
      )
    }
  },
  { immediate: true }
)

const columns = [
  { title: '員工', key: 'name' },
  { title: '底薪', key: 'baseSalary', align: 'right' },
  { title: '加給', key: 'regularAllowance', align: 'right' },
  { title: '津貼', key: 'irregularAllowance', align: 'right' },
  { title: '全勤獎金', key: 'fullAttendanceBonus', align: 'right' },
  { title: '加班費', key: 'overtimePay', align: 'right' },
  { title: '誤餐費', key: 'mealAllowance', align: 'right' },
  { title: '交通補貼', key: 'transportSubsidy', align: 'right' },
  { title: '績效獎金', key: 'performanceBonus', align: 'right' },
  { title: '年終獎金', key: 'yearEndBonus', align: 'right' },
  { title: '請假扣款', key: 'leaveDeduction', align: 'right' },
  { title: '應發', key: 'grossSalary', align: 'right' },
  { title: '固定扣款', key: 'fixedDeduction', align: 'right' },
  { title: '實發', key: 'netSalary', align: 'right' }
]

const compositionColumns = [
  { title: '項目', key: 'item' },
  { title: '金額', key: 'amount', align: 'right' },
  { title: '占比（應發）', key: 'percentage', align: 'right' }
]

const statistics = computed(() => {
  const summary = reportsStore.monthlyPayroll?.summary
  if (!summary) {
    return {
      totalGrossSalary: 0,
      totalNetSalary: 0,
      employeeCount: 0,
      avgGrossSalary: 0,
      avgNetSalary: 0
    }
  }

  return {
    totalGrossSalary: summary.totalGrossSalary || 0,
    totalNetSalary: summary.totalNetSalary || 0,
    employeeCount: summary.employeeCount || 0,
    avgGrossSalary: summary.avgGrossSalary || 0,
    avgNetSalary: summary.avgNetSalary || 0
  }
})

const payrollSummary = computed(() => [
  {
    label: '總應發',
    value: statistics.value.totalGrossSalary,
    format: 'currency'
  },
  {
    label: '總實發',
    value: statistics.value.totalNetSalary,
    format: 'currency'
  },
  {
    label: '平均應發',
    value: statistics.value.avgGrossSalary,
    format: 'currency'
  },
  {
    label: '平均實發',
    value: statistics.value.avgNetSalary,
    format: 'currency'
  },
  {
    label: '員工人數',
    value: statistics.value.employeeCount,
    format: 'number'
  }
])

const payrollTableData = computed(() => {
  const details = reportsStore.monthlyPayroll?.payrollDetails
  if (!Array.isArray(details)) {
    return []
  }

  return details.map((item) => {
    const baseSalary = item.baseSalary ?? item.base_salary ?? 0
    const regularAllowance = item.regularAllowance ?? item.regular_allowance ?? 0
    const irregularAllowance = item.irregularAllowance ?? item.irregular_allowance ?? 0
    const mealAllowance = item.mealAllowance ?? item.meal_allowance ?? 0
    const transportSubsidy = item.transportSubsidy ?? item.transport_subsidy ?? 0
    const performanceBonus = item.performanceBonus ?? item.performance_bonus ?? 0
    const yearEndBonus = item.yearEndBonus ?? item.year_end_bonus ?? 0
    const overtimePay = item.overtimePay ?? item.overtime_pay ?? 0

    const rawFullAttendance =
      item.fullAttendanceBonus ??
      item.full_attendance_bonus ??
      item.fullAttendanceBonusAmount ??
      item.full_attendance_bonus_amount ??
      0
    const fallbackFullAttendance = calculateFullAttendanceFromItems(item)
    const fullAttendanceBonus = Number((toNumber(rawFullAttendance) || fallbackFullAttendance).toFixed(2))

    const leaveDeduction = Number(item.leaveDeduction ?? item.leave_deduction ?? 0) || 0
    const fixedDeduction = Number(item.fixedDeduction ?? item.fixed_deduction ?? 0) || 0

    const grossBefore =
      item.grossSalary ??
      item.gross_salary ??
      baseSalary +
        regularAllowance +
        irregularAllowance +
        fullAttendanceBonus +
        overtimePay +
        mealAllowance +
        transportSubsidy +
        performanceBonus +
        yearEndBonus

    const grossSalary = Math.max(grossBefore - leaveDeduction, 0)
    const netSalary =
      item.netSalary ??
      item.net_salary ??
      Math.max(grossSalary - fixedDeduction, 0)

    return {
      userId: item.userId || item.user_id,
      name: item.name || item.username || '',
      baseSalary,
      regularAllowance,
      irregularAllowance,
      fullAttendanceBonus,
      overtimePay,
      mealAllowance,
      transportSubsidy,
      performanceBonus,
      yearEndBonus,
      leaveDeduction,
      grossSalary,
      fixedDeduction,
      netSalary
    }
  })
})

const compositionData = computed(() => {
  if (!reportsStore.monthlyPayroll) {
    return []
  }
  return calculatePayrollComposition(reportsStore.monthlyPayroll)
})

const getRowKey = (record) => record.userId || record.id || Math.random()

const formatSummaryValue = (item) => {
  if (item.format === 'currency') {
    return formatCurrency(item.value)
  }
  if (item.format === 'number') {
    const number = Number(item.value)
    if (!Number.isFinite(number) || number === 0) {
      return '-'
    }
    return new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(number)
  }
  return item.value ?? '-'
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
  margin-bottom: 16px;
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

.data-table {
  margin-top: 12px;
  margin-bottom: 24px;
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

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 12px;
}

.empty-state {
  padding: 40px 0;
}
</style>


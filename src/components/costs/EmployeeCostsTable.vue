<template>
  <a-table
    :columns="columns"
    :data-source="employees"
    :loading="loading"
    :row-key="getRowKey"
    :pagination="false"
    size="middle"
    class="responsive-table"
  >
    <template #bodyCell="{ column, record }">
      <!-- 姓名 -->
      <template v-if="column.key === 'name'">
        {{ getName(record) }}
      </template>
      
      <!-- 底薪 -->
      <template v-else-if="column.key === 'baseSalary'">
        <span style="text-align: right; display: block;">
          {{ formatCurrency(getBaseSalary(record)) }}
        </span>
      </template>
      
      <!-- 本月工時 -->
      <template v-else-if="column.key === 'monthHours'">
        <span style="text-align: right; display: block;">
          {{ formatNumber(getMonthHours(record), 1) }}
        </span>
      </template>
      
      <!-- 產生補休 -->
      <template v-else-if="column.key === 'totalCompHoursGenerated'">
        <span style="text-align: right; display: block;">
          {{ formatNumber(getTotalCompHoursGenerated(record), 1) }}
        </span>
      </template>
      
      <!-- 使用補休 -->
      <template v-else-if="column.key === 'totalCompHoursUsed'">
        <span style="text-align: right; display: block;">
          {{ formatNumber(getTotalCompHoursUsed(record), 1) }}
        </span>
      </template>
      
      <!-- 未使用補休 -->
      <template v-else-if="column.key === 'unusedCompHours'">
        <span style="text-align: right; display: block; color: #ff4d4f;">
          {{ formatNumber(getUnusedCompHours(record), 1) }}
        </span>
      </template>
      
      <!-- 補休轉加班費 -->
      <template v-else-if="column.key === 'expiredCompPay'">
        <span style="text-align: right; display: block; color: #ff4d4f;">
          {{ formatCurrency(getExpiredCompPay(record)) }}
        </span>
      </template>
      
      <!-- 薪資成本 -->
      <template v-else-if="column.key === 'laborCost'">
        <a-tooltip :title="getLaborCostTooltip(record)">
          <span style="text-align: right; display: block; font-weight: bold;">
            {{ formatCurrency(getLaborCost(record)) }}
          </span>
        </a-tooltip>
      </template>
      
      <!-- 分攤管理費 -->
      <template v-else-if="column.key === 'overheadAllocation'">
        <span style="text-align: right; display: block;">
          {{ formatCurrency(getOverheadAllocation(record)) }}
        </span>
      </template>
      
      <!-- 本月總成本 -->
      <template v-else-if="column.key === 'totalCost'">
        <span style="text-align: right; display: block; font-weight: bold; color: #52c41a;">
          {{ formatCurrency(getTotalCost(record)) }}
        </span>
      </template>
      
      <!-- 實際時薪 -->
      <template v-else-if="column.key === 'actualHourlyRate'">
        <span style="text-align: right; display: block; font-weight: bold; color: #1890ff;">
          {{ formatHourlyRate(getActualHourlyRate(record)) }}
        </span>
      </template>
    </template>
    
    <template #emptyText>
      <a-empty description="尚無資料" />
    </template>
  </a-table>
</template>

<script setup>
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  employees: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// 表格列定義 - 优化列宽，避免水平滚动
const columns = [
  {
    title: '姓名',
    key: 'name',
    width: 100,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '底薪',
    key: 'baseSalary',
    width: 100,
    align: 'right'
  },
  {
    title: '本月工時',
    key: 'monthHours',
    width: 90,
    align: 'right'
  },
  {
    title: '產生補休',
    key: 'totalCompHoursGenerated',
    width: 90,
    align: 'right',
    responsive: ['lg']
  },
  {
    title: '使用補休',
    key: 'totalCompHoursUsed',
    width: 90,
    align: 'right',
    responsive: ['lg']
  },
  {
    title: '未使用補休',
    key: 'unusedCompHours',
    width: 100,
    align: 'right',
    responsive: ['xl']
  },
  {
    title: '補休轉加班費',
    key: 'expiredCompPay',
    width: 110,
    align: 'right',
    responsive: ['xl']
  },
  {
    title: '薪資成本',
    key: 'laborCost',
    width: 110,
    align: 'right'
  },
  {
    title: '分攤管理費',
    key: 'overheadAllocation',
    width: 110,
    align: 'right',
    responsive: ['lg']
  },
  {
    title: '本月總成本',
    key: 'totalCost',
    width: 110,
    align: 'right'
  },
  {
    title: '實際時薪',
    key: 'actualHourlyRate',
    width: 110,
    align: 'right',
    responsive: ['xl']
  }
]

// 格式化數字（保留小數位）
const formatNumber = (value, decimals = 0) => {
  if (value == null || value === undefined) return '0'
  return Number(value).toFixed(decimals)
}

// 格式化時薪
const formatHourlyRate = (value) => {
  if (value == null || value === undefined) return '—'
  return formatCurrency(value) + '/時'
}

// 獲取行鍵
const getRowKey = (record) => {
  return record.id || record.employeeId || record.employee_id || record.userId || record.user_id
}

// 獲取姓名
const getName = (record) => {
  return record.name || record.userName || record.user_name || record.employeeName || record.employee_name || '—'
}

// 獲取底薪
const getBaseSalary = (record) => {
  return record.baseSalary || record.base_salary || 0
}

// 獲取本月工時
const getMonthHours = (record) => {
  return record.monthHours || record.month_hours || 0
}

// 獲取產生補休
const getTotalCompHoursGenerated = (record) => {
  return record.totalCompHoursGenerated || record.total_comp_hours_generated || 0
}

// 獲取使用補休
const getTotalCompHoursUsed = (record) => {
  return record.totalCompHoursUsed || record.total_comp_hours_used || 0
}

// 獲取未使用補休
const getUnusedCompHours = (record) => {
  return record.unusedCompHours || record.unused_comp_hours || 0
}

// 獲取補休轉加班費
const getExpiredCompPay = (record) => {
  return record.expiredCompPay || record.expired_comp_pay || 0
}

// 獲取薪資成本
const getLaborCost = (record) => {
  return record.laborCost || record.labor_cost || 0
}

// 獲取薪資成本 tooltip 說明
const getLaborCostTooltip = (record) => {
  const baseSalary = getBaseSalary(record)
  const salaryItemsAmount = record.salaryItemsAmount || record.salary_items_amount || 0
  const expiredCompPay = getExpiredCompPay(record)
  const leaveDeduction = record.leaveDeduction || record.leave_deduction || 0
  
  return `計算公式：底薪 + 津貼獎金 + 補休轉加班費 - 請假扣款\n` +
         `= ${formatCurrency(baseSalary)} + ${formatCurrency(salaryItemsAmount)} + ${formatCurrency(expiredCompPay)} - ${formatCurrency(leaveDeduction)}\n` +
         `= ${formatCurrency(getLaborCost(record))}`
}

// 獲取分攤管理費
const getOverheadAllocation = (record) => {
  return record.overheadAllocation || record.overhead_allocation || 0
}

// 獲取本月總成本
const getTotalCost = (record) => {
  return record.totalCost || record.total_cost || 0
}

// 獲取實際時薪
const getActualHourlyRate = (record) => {
  return record.actualHourlyRate || record.actual_hourly_rate || 0
}
</script>


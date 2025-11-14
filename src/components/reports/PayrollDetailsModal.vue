<template>
  <a-modal
    :visible="visible"
    :title="`${employeeName} - 月度薪資明細`"
    width="800px"
    @cancel="handleCancel"
    :footer="null"
  >
    <a-table
      v-if="monthlyDetails && monthlyDetails.length > 0"
      :columns="columns"
      :data-source="monthlyDetails"
      :row-key="getRowKey"
      :pagination="false"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <!-- 月份 -->
        <template v-if="column.key === 'month'">
          {{ formatMonth(record.month) }}
        </template>
        
        <!-- 應發薪資 -->
        <template v-else-if="column.key === 'grossSalary'">
          <span style="text-align: right; display: block;">
            {{ formatCurrency(getGrossSalary(record)) }}
          </span>
        </template>
        
        <!-- 實發薪資 -->
        <template v-else-if="column.key === 'netSalary'">
          <span style="text-align: right; display: block;">
            {{ formatCurrency(getNetSalary(record)) }}
          </span>
        </template>
        
        <!-- 加班費 -->
        <template v-else-if="column.key === 'overtimePay'">
          <span style="text-align: right; display: block;">
            {{ formatCurrency(getOvertimePay(record)) }}
          </span>
        </template>
        
        <!-- 績效獎金 -->
        <template v-else-if="column.key === 'performanceBonus'">
          <span style="text-align: right; display: block;">
            {{ formatCurrency(getPerformanceBonus(record)) }}
          </span>
        </template>
        
        <!-- 年終獎金 -->
        <template v-else-if="column.key === 'yearEndBonus'">
          <span style="text-align: right; display: block;">
            {{ formatCurrency(getYearEndBonus(record)) }}
          </span>
        </template>
      </template>
    </a-table>
    
    <!-- 空狀態 -->
    <a-empty
      v-else
      description="本年無薪資記錄"
      style="padding: 40px 0;"
    />
  </a-modal>
</template>

<script setup>
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  employeeName: {
    type: String,
    default: ''
  },
  monthlyDetails: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['cancel'])

// 表格列定義
const columns = [
  {
    title: '月份',
    key: 'month',
    width: 100
  },
  {
    title: '應發薪資',
    key: 'grossSalary',
    width: 150,
    align: 'right'
  },
  {
    title: '實發薪資',
    key: 'netSalary',
    width: 150,
    align: 'right'
  },
  {
    title: '加班費',
    key: 'overtimePay',
    width: 150,
    align: 'right'
  },
  {
    title: '績效獎金',
    key: 'performanceBonus',
    width: 150,
    align: 'right'
  },
  {
    title: '年終獎金',
    key: 'yearEndBonus',
    width: 150,
    align: 'right'
  }
]

// 處理取消事件
const handleCancel = () => {
  emit('cancel')
}

// 獲取行鍵
const getRowKey = (record) => {
  return record.month || Math.random()
}

// 格式化月份
const formatMonth = (month) => {
  return `${month}月`
}

// 獲取應發薪資
const getGrossSalary = (record) => {
  return record.grossSalary || record.gross_salary || 0
}

// 獲取實發薪資
const getNetSalary = (record) => {
  return record.netSalary || record.net_salary || 0
}

// 獲取加班費
const getOvertimePay = (record) => {
  return record.overtimePay || record.overtime_pay || 0
}

// 獲取績效獎金
const getPerformanceBonus = (record) => {
  return record.performanceBonus || record.performance_bonus || 0
}

// 獲取年終獎金
const getYearEndBonus = (record) => {
  return record.yearEndBonus || record.year_end_bonus || 0
}
</script>

<style scoped>
</style>






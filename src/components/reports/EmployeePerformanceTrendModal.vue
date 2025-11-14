<template>
  <a-modal
    :visible="visible"
    :title="`${employeeName} - 月度產值趨勢`"
    width="900px"
    @cancel="handleCancel"
    :footer="null"
  >
    <a-table
      v-if="monthlyTrend && monthlyTrend.length > 0"
      :columns="columns"
      :data-source="monthlyTrend"
      :row-key="getRowKey"
      :pagination="false"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <!-- 月份 -->
        <template v-if="column.key === 'month'">
          {{ formatMonth(record.month) }}
        </template>
        
        <!-- 標準工時 -->
        <template v-else-if="column.key === 'standardHours'">
          <span style="text-align: right; display: block;">
            {{ formatHours(getStandardHours(record)) }}
          </span>
        </template>
        
        <!-- 加權工時 -->
        <template v-else-if="column.key === 'weightedHours'">
          <span style="text-align: right; display: block;">
            {{ formatHours(getWeightedHours(record)) }}
          </span>
        </template>
        
        <!-- 產生收入 -->
        <template v-else-if="column.key === 'revenue'">
          <span style="text-align: right; display: block;">
            {{ formatCurrency(getRevenue(record)) }}
          </span>
        </template>
        
        <!-- 成本 -->
        <template v-else-if="column.key === 'cost'">
          <span style="text-align: right; display: block;">
            {{ formatCurrency(getCost(record)) }}
          </span>
        </template>
        
        <!-- 毛利 -->
        <template v-else-if="column.key === 'profit'">
          <span
            :style="{
              textAlign: 'right',
              display: 'block',
              color: getProfit(record) >= 0 ? '#16a34a' : '#dc2626'
            }"
          >
            {{ formatCurrency(getProfit(record)) }}
          </span>
        </template>
        
        <!-- 毛利率 -->
        <template v-else-if="column.key === 'profitMargin'">
          <span style="text-align: right; display: block;">
            {{ formatPercent(getProfitMargin(record) / 100) }}
          </span>
        </template>
      </template>
    </a-table>
    
    <!-- 空狀態 -->
    <a-empty
      v-else
      description="本年無產值記錄"
      style="padding: 40px 0;"
    />
  </a-modal>
</template>

<script setup>
import { formatCurrency, formatPercent } from '@/utils/formatters'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  employeeName: {
    type: String,
    default: ''
  },
  monthlyTrend: {
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
    title: '標準工時',
    key: 'standardHours',
    width: 120,
    align: 'right'
  },
  {
    title: '加權工時',
    key: 'weightedHours',
    width: 120,
    align: 'right'
  },
  {
    title: '產生收入',
    key: 'revenue',
    width: 150,
    align: 'right'
  },
  {
    title: '成本',
    key: 'cost',
    width: 150,
    align: 'right'
  },
  {
    title: '毛利',
    key: 'profit',
    width: 150,
    align: 'right'
  },
  {
    title: '毛利率',
    key: 'profitMargin',
    width: 120,
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

// 格式化工時
const formatHours = (hours) => {
  return `${Number(hours).toFixed(1)}h`
}

// 獲取標準工時
const getStandardHours = (record) => {
  return record.standardHours || record.standard_hours || 0
}

// 獲取加權工時
const getWeightedHours = (record) => {
  return record.weightedHours || record.weighted_hours || 0
}

// 獲取產生收入
const getRevenue = (record) => {
  return record.revenue || 0
}

// 獲取成本
const getCost = (record) => {
  return record.cost || 0
}

// 獲取毛利
const getProfit = (record) => {
  return record.profit || 0
}

// 獲取毛利率
const getProfitMargin = (record) => {
  return record.profitMargin || record.profit_margin || 0
}
</script>

<style scoped>
</style>






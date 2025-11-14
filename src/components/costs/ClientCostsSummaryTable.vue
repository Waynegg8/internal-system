<template>
  <a-table
    :columns="columns"
    :data-source="clients"
    :loading="loading"
    :row-key="getRowKey"
    :pagination="false"
    size="middle"
    class="responsive-table"
    :expandable="expandableConfig"
  >
    <template #bodyCell="{ column, record }">
      <!-- 客戶名稱 -->
      <template v-if="column.key === 'clientName'">
        {{ getClientName(record) }}
      </template>
      
      <!-- 總工時 -->
      <template v-else-if="column.key === 'totalHours'">
        <span class="table-cell-amount">
          {{ formatNumber(getTotalHours(record), 1) }}
        </span>
      </template>
      
      <!-- 加權工時 -->
      <template v-else-if="column.key === 'weightedHours'">
        <span class="table-cell-amount">
          {{ formatNumber(getWeightedHours(record), 1) }}
        </span>
      </template>
      
      <!-- 平均時薪 -->
      <template v-else-if="column.key === 'avgHourlyRate'">
        <span class="table-cell-amount" style="color: var(--color-primary);">
          {{ formatHourlyRate(getAvgHourlyRate(record)) }}
        </span>
      </template>
      
      <!-- 總成本 -->
      <template v-else-if="column.key === 'totalCost'">
        <span class="table-cell-amount">
          {{ formatCurrency(getTotalCost(record)) }}
        </span>
      </template>
      
      <!-- 本月收入 -->
      <template v-else-if="column.key === 'revenue'">
        <span class="table-cell-amount">
          {{ formatCurrency(getRevenue(record)) }}
        </span>
      </template>
      
      <!-- 利潤 -->
      <template v-else-if="column.key === 'profit'">
        <span class="table-cell-amount" :class="getProfit(record) >= 0 ? 'positive' : 'negative'">
          {{ formatCurrency(getProfit(record)) }}
        </span>
      </template>
      
      <!-- 利潤率 -->
      <template v-else-if="column.key === 'margin'">
        <span class="table-cell-amount">
          {{ formatPercentage(getMargin(record)) }}
        </span>
      </template>
    </template>
    
    <template #expandedRowRender="{ record }">
      <div style="background-color: #f8fafc; padding: 16px; margin-left: 24px;">
        <a-table
          :columns="employeeColumns"
          :data-source="getEmployeeDetails(record)"
          :pagination="false"
          size="small"
          :row-key="(r) => r.employeeId || r.employee_id || r.id"
        >
          <template #bodyCell="{ column, record: empRecord }">
            <template v-if="column.key === 'employeeName'">
              {{ getEmployeeName(empRecord) }}
            </template>
            <template v-else-if="column.key === 'hours'">
              <span style="text-align: right; display: block;">
                {{ formatNumber(getEmployeeHours(empRecord), 1) }}
              </span>
            </template>
            <template v-else-if="column.key === 'weightedHours'">
              <span style="text-align: right; display: block;">
                {{ formatNumber(getEmployeeWeightedHours(empRecord), 1) }}
              </span>
            </template>
            <template v-else-if="column.key === 'hourlyRate'">
              <span style="text-align: right; display: block;">
                {{ formatHourlyRate(getEmployeeHourlyRate(empRecord)) }}
              </span>
            </template>
            <template v-else-if="column.key === 'cost'">
              <span style="text-align: right; display: block;">
                {{ formatCurrency(getEmployeeCost(empRecord)) }}
              </span>
            </template>
          </template>
        </a-table>
      </div>
    </template>
    
    <template #emptyText>
      <a-empty description="尚無資料" />
    </template>
  </a-table>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  clients: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['expand'])

// 表格列定義 - 优化列宽，避免水平滚动
const columns = [
  {
    title: '客戶名稱',
    key: 'clientName',
    width: '25%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '總工時',
    key: 'totalHours',
    width: 100,
    align: 'right'
  },
  {
    title: '加權工時',
    key: 'weightedHours',
    width: 100,
    align: 'right',
    responsive: ['lg']
  },
  {
    title: '平均時薪',
    key: 'avgHourlyRate',
    width: 110,
    align: 'right'
  },
  {
    title: '總成本',
    key: 'totalCost',
    width: 110,
    align: 'right'
  },
  {
    title: '本月收入',
    key: 'revenue',
    width: 110,
    align: 'right'
  },
  {
    title: '利潤',
    key: 'profit',
    width: 110,
    align: 'right'
  },
  {
    title: '利潤率',
    key: 'margin',
    width: 100,
    align: 'right',
    responsive: ['lg']
  }
]

// 員工明細表格列定義
const employeeColumns = [
  {
    title: '員工名稱',
    key: 'employeeName',
    width: 150
  },
  {
    title: '工時',
    key: 'hours',
    width: 100,
    align: 'right'
  },
  {
    title: '加權工時',
    key: 'weightedHours',
    width: 120,
    align: 'right'
  },
  {
    title: '實際時薪',
    key: 'hourlyRate',
    width: 140,
    align: 'right'
  },
  {
    title: '總成本',
    key: 'cost',
    width: 140,
    align: 'right'
  }
]

// 展開行配置
const expandableConfig = {
  onExpand: (expanded, record) => {
    if (expanded) {
      const clientId = getClientId(record)
      emit('expand', clientId)
    }
  }
}

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

// 格式化百分比
const formatPercentage = (value) => {
  if (value == null || value === undefined) return '—'
  return (Number(value) * 100).toFixed(1) + '%'
}

// 獲取行鍵
const getRowKey = (record) => {
  return record.id || record.clientId || record.client_id || record.clientId_id
}

// 獲取客戶 ID
const getClientId = (record) => {
  return record.id || record.clientId || record.client_id || record.clientId_id
}

// 獲取客戶名稱
const getClientName = (record) => {
  return record.clientName || record.client_name || record.companyName || record.company_name || '—'
}

// 獲取總工時
const getTotalHours = (record) => {
  return record.totalHours || record.total_hours || 0
}

// 獲取加權工時
const getWeightedHours = (record) => {
  return record.weightedHours || record.weighted_hours || 0
}

// 獲取平均時薪
const getAvgHourlyRate = (record) => {
  return record.avgHourlyRate || record.avg_hourly_rate || 0
}

// 獲取總成本
const getTotalCost = (record) => {
  return record.totalCost || record.total_cost || 0
}

// 獲取本月收入
const getRevenue = (record) => {
  return record.revenue || 0
}

// 獲取利潤
const getProfit = (record) => {
  return record.profit || 0
}

// 獲取利潤率
const getMargin = (record) => {
  return record.margin || 0
}

// 獲取員工明細
const getEmployeeDetails = (record) => {
  const details = record.employeeDetails || record.employee_details || []
  return Array.isArray(details) ? details : []
}

// 獲取員工名稱
const getEmployeeName = (record) => {
  return record.employeeName || record.employee_name || record.name || '—'
}

// 獲取員工工時
const getEmployeeHours = (record) => {
  return record.hours || 0
}

// 獲取員工加權工時
const getEmployeeWeightedHours = (record) => {
  return record.weightedHours || record.weighted_hours || 0
}

// 獲取員工實際時薪
const getEmployeeHourlyRate = (record) => {
  return record.hourlyRate || record.hourly_rate || record.actualHourlyRate || record.actual_hourly_rate || 0
}

// 獲取員工成本
const getEmployeeCost = (record) => {
  return record.cost || record.totalCost || record.total_cost || 0
}
</script>


<template>
  <a-table
    :columns="columns"
    :data-source="tasks"
    :loading="loading"
    :row-key="getRowKey"
    :pagination="false"
    size="middle"
    class="responsive-table"
  >
    <template #bodyCell="{ column, record }">
      <!-- 客戶名稱 -->
      <template v-if="column.key === 'clientName'">
        {{ getClientName(record) }}
      </template>
      
      <!-- 服務項目 -->
      <template v-else-if="column.key === 'serviceName'">
        {{ getServiceName(record) }}
      </template>
      
      <!-- 任務標題 -->
      <template v-else-if="column.key === 'taskName'">
        {{ getTaskName(record) }}
      </template>
      
      <!-- 負責人 -->
      <template v-else-if="column.key === 'assigneeName'">
        {{ getAssigneeName(record) }}
      </template>
      
      <!-- 工時 -->
      <template v-else-if="column.key === 'hours'">
        <span style="text-align: right; display: block;">
          {{ formatNumber(getHours(record), 1) }}
        </span>
      </template>
      
      <!-- 加權工時 -->
      <template v-else-if="column.key === 'weightedHours'">
        <span style="text-align: right; display: block;">
          {{ formatNumber(getWeightedHours(record), 1) }}
        </span>
      </template>
      
      <!-- 實際時薪 -->
      <template v-else-if="column.key === 'actualHourlyRate'">
        <span style="text-align: right; display: block; color: #1890ff;">
          {{ formatHourlyRate(getActualHourlyRate(record)) }}
        </span>
      </template>
      
      <!-- 總成本 -->
      <template v-else-if="column.key === 'totalCost'">
        <span style="text-align: right; display: block;">
          {{ formatCurrency(getTotalCost(record)) }}
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
  tasks: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  serviceItemsMap: {
    type: Map,
    default: () => new Map()
  }
})

// 表格列定義 - 优化列宽，避免水平滚动
const columns = [
  {
    title: '客戶名稱',
    key: 'clientName',
    width: '20%',
    minWidth: 120,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '服務項目',
    key: 'serviceName',
    width: '15%',
    minWidth: 100,
    ellipsis: {
      showTitle: true
    },
    responsive: ['lg']
  },
  {
    title: '任務標題',
    key: 'taskName',
    width: '25%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '負責人',
    key: 'assigneeName',
    width: 100,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '工時',
    key: 'hours',
    width: 80,
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
    title: '實際時薪',
    key: 'actualHourlyRate',
    width: 110,
    align: 'right',
    responsive: ['xl']
  },
  {
    title: '總成本',
    key: 'totalCost',
    width: 110,
    align: 'right'
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
  return record.id || record.taskId || record.task_id || record.taskId_id
}

// 獲取客戶名稱
const getClientName = (record) => {
  return record.clientName || record.client_name || record.companyName || record.company_name || '—'
}

// 獲取服務名稱
const getServiceName = (record) => {
  // 優先從 serviceItemsMap 獲取
  const serviceItemId = record.serviceItemId || record.service_item_id || record.serviceId || record.service_id
  if (serviceItemId && props.serviceItemsMap.has(serviceItemId)) {
    const serviceItem = props.serviceItemsMap.get(serviceItemId)
    return serviceItem.serviceName || serviceItem.service_name || '—'
  }
  // 如果沒有，使用任務對象中的服務名稱字段
  return record.serviceName || record.service_name || record.serviceItemName || record.service_item_name || '—'
}

// 獲取任務名稱
const getTaskName = (record) => {
  return record.taskName || record.task_name || record.title || '—'
}

// 獲取負責人
const getAssigneeName = (record) => {
  return record.assigneeName || record.assignee_name || record.assignee || '—'
}

// 獲取工時
const getHours = (record) => {
  return record.hours || 0
}

// 獲取加權工時
const getWeightedHours = (record) => {
  return record.weightedHours || record.weighted_hours || 0
}

// 獲取實際時薪
const getActualHourlyRate = (record) => {
  return record.actualHourlyRate || record.actual_hourly_rate || 0
}

// 獲取總成本
const getTotalCost = (record) => {
  return record.totalCost || record.total_cost || 0
}
</script>


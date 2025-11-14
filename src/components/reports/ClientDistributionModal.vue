<template>
  <a-modal
    :visible="visible"
    :title="`${employeeName} - ${isAnnual ? '年度' : '月度'}客戶分布明細`"
    width="800px"
    @cancel="handleCancel"
    :footer="null"
  >
    <a-table
      v-if="distribution && distribution.length > 0"
      :columns="columns"
      :data-source="distribution"
      :row-key="getRowKey"
      :pagination="false"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <!-- 客戶名稱 -->
        <template v-if="column.key === 'clientName'">
          {{ getClientName(record) }}
        </template>
        
        <!-- 服務類型 -->
        <template v-else-if="column.key === 'serviceType'">
          {{ getServiceType(record) }}
        </template>
        
        <!-- 工時 -->
        <template v-else-if="column.key === 'hours'">
          <span style="text-align: right; display: block;">
            {{ formatHours(getHours(record)) }}
          </span>
        </template>
        
        <!-- 加權工時（僅月度模式顯示） -->
        <template v-else-if="column.key === 'weightedHours' && !isAnnual">
          <span style="text-align: right; display: block;">
            {{ formatHours(getWeightedHours(record)) }}
          </span>
        </template>
        
        <!-- 產生收入 -->
        <template v-else-if="column.key === 'generatedRevenue'">
          <span style="text-align: right; display: block;">
            {{ formatCurrency(getGeneratedRevenue(record)) }}
          </span>
        </template>
        
        <!-- 占比 -->
        <template v-else-if="column.key === 'revenuePercentage'">
          <span style="text-align: right; display: block;">
            {{ getRevenuePercentage(record) }}
          </span>
        </template>
      </template>
    </a-table>
    
    <!-- 空狀態 -->
    <a-empty
      v-else
      description="無客戶分布資料"
      style="padding: 40px 0;"
    />
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'
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
  distribution: {
    type: Array,
    default: () => []
  },
  isAnnual: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel'])

// 表格列定義（根據 isAnnual 顯示不同的列）
const columns = computed(() => {
  if (props.isAnnual) {
    // 年度模式
    return [
      {
        title: '客戶名稱',
        key: 'clientName',
        width: 200
      },
      {
        title: '服務類型',
        key: 'serviceType',
        width: 150
      },
      {
        title: '全年工時',
        key: 'hours',
        width: 120,
        align: 'right'
      },
      {
        title: '產生收入',
        key: 'generatedRevenue',
        width: 150,
        align: 'right'
      },
      {
        title: '占比',
        key: 'revenuePercentage',
        width: 120,
        align: 'right'
      }
    ]
  } else {
    // 月度模式
    return [
      {
        title: '客戶名稱',
        key: 'clientName',
        width: 200
      },
      {
        title: '服務類型',
        key: 'serviceType',
        width: 150
      },
      {
        title: '工時',
        key: 'hours',
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
        key: 'generatedRevenue',
        width: 150,
        align: 'right'
      },
      {
        title: '占比',
        key: 'revenuePercentage',
        width: 120,
        align: 'right'
      }
    ]
  }
})

// 處理取消事件
const handleCancel = () => {
  emit('cancel')
}

// 獲取行鍵
const getRowKey = (record) => {
  return record.clientId || record.client_id || record.id || Math.random()
}

// 獲取客戶名稱
const getClientName = (record) => {
  return record.clientName || record.client_name || record.name || '-'
}

// 獲取服務類型
const getServiceType = (record) => {
  return record.serviceName || record.service_name || record.serviceType || record.service_type || '-'
}

// 獲取工時
const getHours = (record) => {
  return record.hours || 0
}

// 獲取加權工時
const getWeightedHours = (record) => {
  return record.weightedHours || record.weighted_hours || 0
}

// 獲取產生收入
const getGeneratedRevenue = (record) => {
  return record.generatedRevenue || record.generated_revenue || 0
}

// 格式化工時
const formatHours = (hours) => {
  return `${Number(hours).toFixed(1)}h`
}

// 獲取收入占比
const getRevenuePercentage = (record) => {
  const percentage = record.revenuePercentage || record.revenue_percentage
  if (percentage == null || percentage === undefined) {
    return '—'
  }
  return `${Number(percentage).toFixed(2)}%`
}
</script>

<style scoped>
</style>


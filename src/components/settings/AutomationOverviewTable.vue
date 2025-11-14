<template>
  <a-table
    :columns="columns"
    :data-source="components"
    :loading="loading"
    :pagination="false"
    :row-key="getRowKey"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'client_name'">
        <router-link :to="getClientDetailLink(record)">
          {{ getClientName(record) }}
        </router-link>
      </template>

      <template v-else-if="column.key === 'service_name'">
        {{ getServiceName(record) }}
      </template>

      <template v-else-if="column.key === 'component'">
        <div>
          <div>{{ getComponentName(record) }}</div>
          <div style="font-size: 12px; color: #999; margin-top: 4px">
            頻率：{{ getFrequencyText(record) }}
          </div>
        </div>
      </template>

      <template v-else-if="column.key === 'tasks'">
        <a-button size="small" @click="handleViewTasks(record)">
          檢視任務配置
        </a-button>
      </template>

      <template v-else-if="column.key === 'rule'">
        <div>
          <div>{{ getDueRuleText(record) }}</div>
          <div v-if="getAdvanceDays(record)" style="font-size: 12px; color: #999; margin-top: 4px">
            提前 {{ getAdvanceDays(record) }} 天
          </div>
        </div>
      </template>

      <template v-else-if="column.key === 'assignee'">
        <span v-if="getAssigneeName(record)">{{ getAssigneeName(record) }}</span>
        <span v-else style="color: #999">未指派</span>
      </template>

      <template v-else-if="column.key === 'actions'">
        <router-link :to="getClientDetailLink(record)">
          <a-button size="small">前往設定</a-button>
        </router-link>
      </template>
    </template>

    <template #emptyText>
      <a-empty description="尚未設定任何自動生成任務的服務" />
    </template>
  </a-table>
</template>

<script setup>
const props = defineProps({
  components: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['view-tasks'])

// 表格列定義
const columns = [
  {
    title: '客戶名稱',
    key: 'client_name',
    width: 150
  },
  {
    title: '服務名稱',
    key: 'service_name',
    width: 150
  },
  {
    title: '組成部分',
    key: 'component',
    width: 200
  },
  {
    title: '將生成的任務',
    key: 'tasks',
    width: 150,
    align: 'center'
  },
  {
    title: '生成規則',
    key: 'rule',
    width: 200
  },
  {
    title: '負責人',
    key: 'assignee',
    width: 120
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    align: 'center'
  }
]

// 獲取行 key
const getRowKey = (record) => {
  return getComponentId(record)
}

// 獲取組成部分 ID（處理字段名差異）
const getComponentId = (record) => {
  return record.component_id || record.componentId || record.id
}

// 獲取客戶 ID（處理字段名差異）
const getClientId = (record) => {
  return record.client_id || record.clientId
}

// 獲取客戶名稱
const getClientName = (record) => {
  return record.client_name || record.clientName || '—'
}

// 獲取服務名稱
const getServiceName = (record) => {
  return record.service_name || record.serviceName || '—'
}

// 獲取組成部分名稱
const getComponentName = (record) => {
  return record.component_name || record.componentName || '—'
}

// 獲取頻率文字
const getFrequencyText = (record) => {
  const frequency = record.delivery_frequency || record.deliveryFrequency
  const frequencyMap = {
    monthly: '每月',
    quarterly: '每季',
    yearly: '每年'
  }
  return frequencyMap[frequency] || frequency || '—'
}

// 獲取到期規則文字
const getDueRuleText = (record) => {
  const rule = record.due_date_rule || record.dueDateRule
  const dueValue = record.due_date_value || record.dueDateValue
  
  if (rule === 'end_of_month') {
    return '月底'
  } else if (rule === 'day_of_month') {
    return `每月 ${dueValue} 號`
  } else if (rule === 'days_from_start') {
    return `服務開始後 ${dueValue} 天`
  }
  return '—'
}

// 獲取提前天數
const getAdvanceDays = (record) => {
  return record.advance_days || record.advanceDays || null
}

// 獲取負責人姓名
const getAssigneeName = (record) => {
  return record.assignee_name || record.assigneeName || null
}

// 獲取客戶詳情頁鏈接
const getClientDetailLink = (record) => {
  const clientId = getClientId(record)
  if (clientId) {
    return `/clients/${clientId}`
  }
  return '#'
}

// 處理檢視任務配置
const handleViewTasks = (record) => {
  const componentId = getComponentId(record)
  const componentName = getComponentName(record)
  const companyName = getClientName(record)
  emit('view-tasks', componentId, componentName, companyName)
}
</script>

<style scoped>
/* 表格樣式已由 Ant Design Vue 提供 */
</style>


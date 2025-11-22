<template>
  <a-table
    :columns="columns"
    :data-source="costTypes"
    :loading="loading"
    :row-key="getRowKey"
    :pagination="false"
    class="responsive-table"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <!-- 成本代碼 -->
      <template v-if="column.key === 'costCode'">
        <span class="cost-code">{{ getCostCode(record) }}</span>
      </template>

      <!-- 成本名稱 -->
      <template v-else-if="column.key === 'costName'">
        {{ getCostName(record) }}
      </template>
      
      <!-- 類別 -->
      <template v-else-if="column.key === 'category'">
        <a-tag :color="getCategoryColor(record)">
          {{ getCategoryText(record) }}
        </a-tag>
      </template>
      
      <!-- 分攤方式 -->
      <template v-else-if="column.key === 'allocationMethod'">
        {{ getAllocationMethodText(record) }}
      </template>
      
      <!-- 描述 -->
      <template v-else-if="column.key === 'description'">
        {{ getDescription(record) || '—' }}
      </template>
      
      <!-- 狀態 -->
      <!-- 操作 -->
      <template v-else-if="column.key === 'action'">
        <a-space :size="8" wrap class="cost-type-actions">
          <a-button type="link" size="small" @click="handleEdit(record)">
            編輯
          </a-button>
          <a-button type="link" size="small" @click="handleTemplate(record)">
            自動生成
          </a-button>
          <a-popconfirm
            title="此操作將永久刪除成本項目與模板，確認刪除？"
            ok-text="刪除"
            cancel-text="取消"
            placement="topRight"
            @confirm="handleRemove(record)"
          >
            <a-button type="link" size="small" danger>
              刪除
            </a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </template>
    
    <template #emptyText>
      <a-empty description="尚無資料" />
    </template>
  </a-table>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  costTypes: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'template', 'remove'])

// 表格列定義 - 优化列宽，避免水平滚动
const columns = [
  {
    title: '成本代碼',
    key: 'costCode',
    dataIndex: 'costCode',
    width: 120,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '成本名稱',
    key: 'costName',
    dataIndex: 'costName',
    width: '25%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '類別',
    key: 'category',
    width: 100,
    align: 'center'
  },
  {
    title: '分攤方式',
    key: 'allocationMethod',
    width: 120,
    ellipsis: {
      showTitle: true
    },
    responsive: ['lg']
  },
  {
    title: '描述',
    key: 'description',
    width: '30%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    },
    responsive: ['xl']
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    align: 'center'
  }
]

// 獲取行鍵
const getRowKey = (record) => {
  return record.id || record.costTypeId || record.cost_type_id || record.costType_id
}

// 獲取成本代碼
const getCostCode = (record) => {
  return record.costCode || record.cost_code || record.code || ''
}

// 獲取成本名稱
const getCostName = (record) => {
  return record.costName || record.cost_name || ''
}

// 獲取類別文字
const getCategoryText = (record) => {
  const category = record.category || record.cost_type
  const categoryMap = {
    'fixed': '固定',
    'variable': '變動'
  }
  return categoryMap[category] || category || '—'
}

// 獲取類別顏色
const getCategoryColor = (record) => {
  const category = record.category || record.cost_type
  return category === 'fixed' ? 'blue' : 'orange'
}

// 獲取分攤方式文字
const getAllocationMethodText = (record) => {
  const method = record.allocationMethod || record.allocation_method
  const methodMap = {
    'per_employee': '按員工數',
    'per_hour': '按工時',
    'per_revenue': '按收入'
  }
  return methodMap[method] || method || '—'
}

// 獲取描述
const getDescription = (record) => {
  return record.description || ''
}

// 處理編輯
const handleEdit = (record) => {
  emit('edit', record)
}

// 處理自動生成模板
const handleTemplate = (record) => {
  const costTypeId = record.id || record.costTypeId || record.cost_type_id || record.costType_id
  emit('template', costTypeId)
}

// 處理停用
const handleRemove = (record) => {
  const costTypeId = record.id || record.costTypeId || record.cost_type_id || record.costType_id
  emit('remove', costTypeId)
}
</script>

<style scoped>
.cost-type-actions {
  display: inline-flex;
}

.cost-type-actions :deep(.ant-btn-link) {
  padding: 0;
  height: auto;
  text-align: left;
}

.cost-code {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', 'Courier New', monospace;
  font-weight: 500;
  color: #1890ff;
}
</style>


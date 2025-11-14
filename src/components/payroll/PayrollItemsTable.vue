<template>
  <a-spin :spinning="loading">
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :pagination="false"
      :row-key="(record) => record.itemTypeId || record.item_type_id"
    >
      <!-- 項目代碼 -->
      <template #itemCode="{ record }">
        <code>{{ record.itemCode || record.item_code || '-' }}</code>
      </template>

      <!-- 項目名稱 -->
      <template #itemName="{ record }">
        <strong>{{ record.itemName || record.item_name || '-' }}</strong>
      </template>

      <!-- 類別 -->
      <template #category="{ record }">
        <a-tag :color="getCategoryColor(record.category)">
          {{ getCategoryLabel(record.category) }}
        </a-tag>
      </template>

      <!-- 狀態 -->
      <template #status="{ record }">
        <a-tag :color="getStatusColor(record.isActive !== undefined ? record.isActive : record.is_active)">
          {{ getStatusLabel(record.isActive !== undefined ? record.isActive : record.is_active) }}
        </a-tag>
      </template>

      <!-- 操作 -->
      <template #actions="{ record }">
        <a-space>
          <a-button type="link" size="small" @click="handleEdit(record)">
            編輯
          </a-button>
          <a-button type="link" size="small" danger @click="handleDelete(record)">
            刪除
          </a-button>
        </a-space>
      </template>

      <!-- 空狀態 -->
      <template #emptyText>
        <a-empty description="沒有符合條件的資料" />
      </template>
    </a-table>
  </a-spin>
</template>

<script setup>
import { getCategoryLabel, getCategoryColor } from '@/utils/payrollUtils'

const props = defineProps({
  dataSource: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete'])

// 表格列定義
const columns = [
  {
    title: '項目名稱',
    dataIndex: 'itemName',
    key: 'itemName',
    slots: { customRender: 'itemName' },
    width: 200
  },
  {
    title: '類別',
    dataIndex: 'category',
    key: 'category',
    slots: { customRender: 'category' },
    width: 150
  },
  {
    title: '狀態',
    dataIndex: 'status',
    key: 'status',
    slots: { customRender: 'status' },
    width: 100
  },
  {
    title: '操作',
    key: 'actions',
    slots: { customRender: 'actions' },
    width: 150,
    align: 'center'
  }
]

// 獲取狀態標籤
const getStatusLabel = (isActive) => {
  return isActive ? '啟用' : '停用'
}

// 獲取狀態顏色
const getStatusColor = (isActive) => {
  return isActive ? 'green' : 'default'
}

// 處理編輯
const handleEdit = (record) => {
  emit('edit', record)
}

// 處理刪除
const handleDelete = (record) => {
  const itemTypeId = record.itemTypeId || record.item_type_id
  emit('delete', itemTypeId)
}
</script>

<style scoped>
code {
  font-family: 'Courier New', Courier, monospace;
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}
</style>


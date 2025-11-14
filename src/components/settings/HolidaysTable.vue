<template>
  <a-table
    :columns="columns"
    :data-source="holidays"
    :loading="loading"
    :pagination="false"
    row-key="holiday_date"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'actions'">
        <a-space>
          <a-button size="small" @click="handleEdit(record)">編輯</a-button>
          <a-button size="small" danger @click="handleDelete(record.holiday_date)">刪除</a-button>
        </a-space>
      </template>
    </template>

    <template #emptyText>
      <a-empty description="暫無國定假日" />
    </template>
  </a-table>
</template>

<script setup>
import { QuestionCircleOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  holidays: {
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
    title: '日期',
    dataIndex: 'holiday_date',
    key: 'holiday_date',
    width: 150
  },
  {
    title: '假日名稱',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    align: 'center'
  }
]

// 處理編輯
const handleEdit = (holiday) => {
  emit('edit', holiday)
}

// 處理刪除
const handleDelete = (date) => {
  emit('delete', date)
}
</script>

<style scoped>
/* 表格樣式已由 Ant Design Vue 提供 */
</style>


<template>
  <div>
    <a-table
      :columns="columns"
      :data-source="lifeEvents"
      :loading="loading"
      :row-key="(record) => record.eventId || record.event_id || record.id"
      :pagination="false"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <!-- 事件類型 -->
        <template v-if="column.key === 'eventType'">
          {{ getLifeEventTypeText(record.eventType || record.event_type) }}
        </template>

        <!-- 事件日期 -->
        <template v-else-if="column.key === 'eventDate'">
          {{ formatDate(record.eventDate || record.event_date) }}
        </template>

        <!-- 對應假別 -->
        <template v-else-if="column.key === 'leaveType'">
          <span v-if="record.leaveType || record.leave_type">
            {{ getLeaveTypeText(record.leaveType || record.leave_type) }}
          </span>
          <span v-else style="color: rgba(15, 23, 42, 0.4)">—</span>
        </template>

        <!-- 操作 -->
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" danger @click="handleDelete(record.eventId || record.event_id || record.id)">
            刪除
          </a-button>
        </template>
      </template>

      <template #emptyText>
        <a-empty description="無生活事件記錄" />
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getLeaveTypeText, getLifeEventTypeText } from '@/constants/leaveTypes'
import { formatLocalDate as formatDate } from '@/utils/formatters'

const props = defineProps({
  lifeEvents: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['delete'])

// 表格列定義
const columns = computed(() => [
  {
    title: '事件',
    key: 'eventType',
    dataIndex: 'eventType',
    width: 200
  },
  {
    title: '日期',
    key: 'eventDate',
    dataIndex: 'eventDate',
    width: 120
  },
  {
    title: '假別',
    key: 'leaveType',
    dataIndex: 'leaveType',
    width: 150
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    align: 'center'
  }
])

// 處理刪除
const handleDelete = (eventId) => {
  emit('delete', eventId)
}
</script>


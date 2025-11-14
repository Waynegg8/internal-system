<template>
  <div>
    <a-table
      :columns="columns"
      :data-source="leaves"
      :loading="loading"
      :row-key="(record) => record.leaveId || record.leave_id || record.id"
      :pagination="false"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <!-- 員工姓名 -->
        <template v-if="column.key === 'userName'">
          {{ record.userName || record.user_name || '-' }}
        </template>
        
        <!-- 假別 -->
        <template v-else-if="column.key === 'type'">
          {{ getLeaveTypeText(record.type) }}
        </template>

        <!-- 日期時間 -->
        <template v-else-if="column.key === 'dateTime'">
          <div>
            <div>{{ formatDate(record.start || record.start_date) }}</div>
            <div v-if="record.startTime && record.endTime" style="font-size: 12px; color: rgba(15, 23, 42, 0.6)">
              {{ record.startTime }}-{{ record.endTime }}
            </div>
          </div>
        </template>

        <!-- 時數 -->
        <template v-else-if="column.key === 'amount'">
          {{ record.amount }} 小時
        </template>

        <!-- 申請日期 -->
        <template v-else-if="column.key === 'submittedAt'">
          {{ formatDate(record.submittedAt || record.submitted_at) }}
        </template>

        <!-- 操作 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="handleEdit(record)">
              編輯
            </a-button>
            <a-button type="link" size="small" danger @click="handleDelete(record.leaveId || record.leave_id || record.id)">
              刪除
            </a-button>
          </a-space>
        </template>
      </template>

      <template #emptyText>
        <a-empty description="無假期記錄" />
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getLeaveTypeText } from '@/constants/leaveTypes'
import { formatLocalDate as formatDate } from '@/utils/formatters'

const props = defineProps({
  leaves: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  showUserName: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete'])

// 表格列定義
const columns = computed(() => {
  const cols = []
  
  // 員工姓名（僅管理員可見）
  if (props.showUserName) {
    cols.push({
      title: '員工',
      key: 'userName',
      dataIndex: 'userName',
      width: 100
    })
  }
  
  cols.push(
    {
      title: '假別',
      key: 'type',
      dataIndex: 'type',
      width: 120
    },
    {
      title: '日期與時間',
      key: 'dateTime',
      dataIndex: 'start',
      width: 200
    },
    {
      title: '時數',
      key: 'amount',
      dataIndex: 'amount',
      width: 100,
      align: 'right'
    },
    {
      title: '提交日期',
      key: 'submittedAt',
      dataIndex: 'submittedAt',
      width: 120
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center'
    }
  )
  
  return cols
})

// 處理編輯
const handleEdit = (record) => {
  emit('edit', record)
}

// 處理刪除
const handleDelete = (leaveId) => {
  emit('delete', leaveId)
}
</script>


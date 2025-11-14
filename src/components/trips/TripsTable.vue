<template>
  <div>
    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="trips"
      :loading="loading"
      :row-key="(record) => record.trip_id || record.tripId || record.id"
      :pagination="false"
      size="middle"
      class="responsive-table"
    >
      <template #bodyCell="{ column, record }">
        <!-- 日期 -->
        <template v-if="column.key === 'trip_date'">
          {{ formatDate(record.trip_date || record.tripDate) }}
        </template>
        
        <!-- 員工 -->
        <template v-else-if="column.key === 'user_name'">
          {{ record.user_name || record.userName || '—' }}
        </template>
        
        <!-- 客戶 -->
        <template v-else-if="column.key === 'client_name'">
          {{ record.client_name || record.clientName || '無' }}
        </template>
        
        <!-- 目的地 -->
        <template v-else-if="column.key === 'destination'">
          <div>
            <div style="font-weight: 500; color: #1f2937">
              {{ record.destination || '—' }}
            </div>
            <div v-if="record.purpose" style="font-size: 12px; color: #6b7280; margin-top: 4px">
              {{ record.purpose }}
            </div>
          </div>
        </template>
        
        <!-- 距離 -->
        <template v-else-if="column.key === 'distance_km'">
          <a-tag>
            {{ (record.distance_km || record.distanceKm || 0).toFixed(1) }} km
          </a-tag>
        </template>
        
        <!-- 交通補貼 -->
        <template v-else-if="column.key === 'transport_subsidy_twd'">
          <span class="table-cell-amount">
            {{ formatCurrency(record.transport_subsidy_twd || record.transportSubsidyTwd || 0) }}
          </span>
        </template>
        
        <!-- 操作 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              v-if="canEdit(record)"
              type="link"
              size="small"
              @click="handleEdit(record)"
            >
              編輯
            </a-button>
            <a-button
              v-if="canEdit(record)"
              type="link"
              size="small"
              danger
              @click="handleDelete(record)"
            >
              刪除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
    
    <!-- 分頁 -->
    <div v-if="!loading && trips.length > 0" style="margin-top: 16px; text-align: right">
      <a-pagination
        v-model:current="currentPage"
        v-model:page-size="currentPageSize"
        :total="pagination.total"
        :show-total="(total) => `共 ${total} 筆`"
        :show-size-changer="true"
        :page-size-options="['20', '50', '100']"
        @change="handlePageChange"
        @show-size-change="handlePageChange"
      />
    </div>
    
    <!-- 空狀態 -->
    <a-empty
      v-if="!loading && trips.length === 0"
      description="暫無外出登記數據"
      style="padding: 40px 0"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { formatCurrency, formatDate } from '@/utils/formatters'

const props = defineProps({
  trips: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  currentUser: {
    type: Object,
    required: true
  },
  pagination: {
    type: Object,
    default: () => ({
      current: 1,
      pageSize: 20,
      total: 0
    })
  }
})

const emit = defineEmits(['edit', 'delete', 'page-change'])

// 本地分頁狀態
const currentPage = ref(props.pagination.current)
const currentPageSize = ref(props.pagination.pageSize)

// 同步 props 變化
watch(() => props.pagination.current, (val) => {
  currentPage.value = val
})

watch(() => props.pagination.pageSize, (val) => {
  currentPageSize.value = val
})

// 判斷是否可以編輯（只有創建者或管理員可以編輯/刪除）
const canEdit = (trip) => {
  if (!props.currentUser) return false
  
  const currentUserId = props.currentUser.userId || props.currentUser.user_id || props.currentUser.id
  const tripUserId = trip.user_id || trip.userId
  const isAdmin = props.currentUser.isAdmin || props.currentUser.is_admin || false
  
  return tripUserId === currentUserId || isAdmin
}

// 表格列定義 - 优化列宽，避免水平滚动
const columns = [
  {
    title: '日期',
    dataIndex: 'trip_date',
    key: 'trip_date',
    width: 100
  },
  {
    title: '員工',
    dataIndex: 'user_name',
    key: 'user_name',
    width: 100,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '客戶',
    dataIndex: 'client_name',
    key: 'client_name',
    width: '20%',
    minWidth: 120,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '目的地',
    dataIndex: 'destination',
    key: 'destination',
    width: '25%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '距離',
    dataIndex: 'distance_km',
    key: 'distance_km',
    width: 90,
    align: 'right',
    responsive: ['lg']
  },
  {
    title: '交通補貼',
    dataIndex: 'transport_subsidy_twd',
    key: 'transport_subsidy_twd',
    width: 110,
    align: 'right'
  },
  {
    title: '操作',
    key: 'action',
    width: 120,
    align: 'center'
  }
]

// 處理編輯
const handleEdit = (trip) => {
  emit('edit', trip)
}

// 處理刪除
const handleDelete = (trip) => {
  const tripId = trip.trip_id || trip.tripId || trip.id
  emit('delete', tripId)
}

// 處理分頁變化
const handlePageChange = (page, pageSize) => {
  currentPage.value = page
  currentPageSize.value = pageSize
  emit('page-change', page, pageSize)
}
</script>


<template>
  <div style="padding: 12px">
    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage || store.error"
      type="error"
      :message="errorMessage || store.error"
      show-icon
      closable
      @close="errorMessage = ''; handleCloseError()"
      style="margin-bottom: 16px"
    />
    
    <!-- 篩選與操作區域 -->
    <a-card :bordered="false" style="margin-bottom: 12px">
      <a-row :gutter="[12, 12]" align="middle">
        <!-- 月份選擇 -->
        <a-col :xs="24" :sm="8" :md="5" :lg="4">
          <a-date-picker
            v-model:value="selectedMonth"
            picker="month"
            format="YYYY-MM"
            placeholder="選擇月份"
            style="width: 100%"
            @change="handleMonthChange"
          />
        </a-col>
        
        <!-- 員工篩選（僅管理員可見） -->
        <a-col :xs="12" :sm="8" :md="5" :lg="4" v-if="isAdmin">
          <a-select
            v-model:value="selectedUserId"
            placeholder="全部員工"
            allow-clear
            style="width: 100%"
            show-search
            :filter-option="filterUserOption"
            @change="handleUserIdChange"
          >
            <a-select-option
              v-for="user in store.users"
              :key="user.userId || user.user_id || user.id"
              :value="user.userId || user.user_id || user.id"
            >
              {{ user.name || user.userName || user.user_name }}
            </a-select-option>
          </a-select>
        </a-col>
        
        <!-- 客戶篩選 -->
        <a-col :xs="12" :sm="8" :md="5" :lg="4">
          <a-select
            v-model:value="selectedClientId"
            placeholder="全部客戶"
            allow-clear
            style="width: 100%"
            show-search
            :filter-option="filterClientOption"
            @change="handleClientIdChange"
          >
            <a-select-option
              v-for="client in store.clients"
              :key="client.clientId || client.client_id || client.id"
              :value="client.clientId || client.client_id || client.id"
            >
              {{ client.name || client.companyName || client.company_name }}
            </a-select-option>
          </a-select>
        </a-col>
        
        <!-- 操作按鈕：右對齊，與左側元素在同一行 -->
        <a-col :xs="24" :sm="24" :md="9" :lg="12" style="display: flex; justify-content: flex-end">
          <a-space wrap>
            <a-button @click="handleResetFilters">
              重置篩選
            </a-button>
            <a-button type="primary" @click="handleAddTrip">
              <template #icon>
                <PlusOutlined />
              </template>
              新增外出登記
            </a-button>
          </a-space>
        </a-col>
      </a-row>
    </a-card>
    
    <!-- 統計摘要 -->
    <TripsSummary :summary="store.tripsSummary" />
    
    <!-- 外出登記列表 -->
    <TripsTable
      :trips="store.trips"
      :loading="store.loading"
      :current-user="currentUser"
      :pagination="pagination"
      @edit="handleEditTrip"
      @delete="handleDeleteTrip"
      @page-change="handlePageChange"
    />
    
    <!-- 表單彈窗 -->
    <TripFormModal
      :visible="formModalVisible"
      :editing-trip="editingTrip"
      :clients="store.clients"
      @submit="handleFormSubmit"
      @cancel="handleFormCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useTripStore } from '@/stores/trips'
import { useAuthStore } from '@/stores/auth'
import { usePageAlert } from '@/composables/usePageAlert'
import { getCurrentYm } from '@/utils/formatters'
import dayjs from 'dayjs'
import TripsSummary from '@/components/trips/TripsSummary.vue'
import TripsTable from '@/components/trips/TripsTable.vue'
import TripFormModal from '@/components/trips/TripFormModal.vue'

const tripStore = useTripStore()
const authStore = useAuthStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const store = tripStore
const { user } = storeToRefs(authStore)

// 當前用戶
const currentUser = computed(() => user.value)

// 是否為管理員
const isAdmin = computed(() => {
  return authStore.isAdmin || user.value?.isAdmin || user.value?.is_admin || false
})

// 本地狀態
const selectedMonth = ref(dayjs(getCurrentYm(), 'YYYY-MM'))
const selectedUserId = ref(null)
const selectedClientId = ref(null)
const formModalVisible = ref(false)
const editingTrip = ref(null)
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// 構建篩選參數
const filterParams = computed(() => {
  const params = {
    month: selectedMonth.value ? dayjs(selectedMonth.value).format('YYYY-MM') : getCurrentYm()
  }
  
  if (selectedUserId.value) {
    params.user_id = selectedUserId.value
  }
  
  if (selectedClientId.value) {
    params.client_id = selectedClientId.value
  }
  
  return params
})

// 載入外出登記列表
const loadTrips = async () => {
  try {
    const params = {
      ...filterParams.value,
      page: pagination.value.current,
      per_page: pagination.value.pageSize
    }
    
    const response = await store.getTrips(params)
    
    // 更新分頁信息
    if (response.meta) {
      pagination.value.total = response.meta.total || 0
    } else if (response.total !== undefined) {
      pagination.value.total = response.total
    } else {
      pagination.value.total = store.trips.length
    }
  } catch (error) {
    console.error('載入外出登記列表失敗:', error)
  }
}

// 載入統計摘要
const loadSummary = async () => {
  try {
    const params = {
      month: selectedMonth.value ? dayjs(selectedMonth.value).format('YYYY-MM') : getCurrentYm()
    }
    
    if (selectedUserId.value) {
      params.user_id = selectedUserId.value
    }
    
    await store.getTripsSummary(params)
  } catch (error) {
    console.error('載入統計摘要失敗:', error)
  }
}

// 載入用戶列表（僅管理員）
const loadUsers = async () => {
  if (!isAdmin.value) return
  
  try {
    await store.fetchUsers()
  } catch (error) {
    console.error('載入用戶列表失敗:', error)
  }
}

// 載入客戶列表
const loadClients = async () => {
  try {
    await store.fetchClients()
  } catch (error) {
    console.error('載入客戶列表失敗:', error)
  }
}

// 處理月份變化
const handleMonthChange = () => {
  pagination.value.current = 1
  loadTrips()
  loadSummary()
}

// 處理用戶篩選變化
const handleUserIdChange = (userId) => {
  selectedUserId.value = userId
  pagination.value.current = 1
  loadTrips()
  loadSummary()
}

// 處理客戶篩選變化
const handleClientIdChange = (clientId) => {
  selectedClientId.value = clientId
  pagination.value.current = 1
  loadTrips()
}

// 處理重置篩選
const handleResetFilters = () => {
  selectedUserId.value = null
  selectedClientId.value = null
  pagination.value.current = 1
  loadTrips()
  loadSummary()
}

// 篩選選項過濾函數
const filterUserOption = (input, option) => {
  const userName = option.children?.[0]?.children || option.children || ''
  return userName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

const filterClientOption = (input, option) => {
  const clientName = option.children?.[0]?.children || option.children || ''
  return clientName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 處理新增外出登記
const handleAddTrip = () => {
  editingTrip.value = null
  formModalVisible.value = true
}

// 處理編輯外出登記
const handleEditTrip = (trip) => {
  editingTrip.value = trip
  formModalVisible.value = true
}

// 處理刪除外出登記
const handleDeleteTrip = async (tripId) => {
  try {
    await store.deleteTrip(tripId)
    showSuccess('刪除成功')
    loadTrips()
    loadSummary()
  } catch (error) {
    showError('刪除失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理表單提交
const handleFormSubmit = async (data, isEdit) => {
  try {
    if (isEdit) {
      const tripId = editingTrip.value.trip_id || editingTrip.value.tripId || editingTrip.value.id
      await store.updateTrip(tripId, data)
      showSuccess('更新成功')
    } else {
      await store.createTrip(data)
      showSuccess('新增成功')
    }
    
    formModalVisible.value = false
    editingTrip.value = null
    
    // 重新載入數據
    loadTrips()
    loadSummary()
  } catch (error) {
    showError((isEdit ? '更新' : '新增') + '失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理取消表單
const handleFormCancel = () => {
  formModalVisible.value = false
  editingTrip.value = null
}

// 處理分頁變化
const handlePageChange = (page, pageSize) => {
  pagination.value.current = page
  pagination.value.pageSize = pageSize
  loadTrips()
}

// 處理關閉錯誤提示
const handleCloseError = () => {
  store.clearError()
}

// 生命週期
onMounted(async () => {
  // 檢查登入狀態
  if (!authStore.isAuthenticated) {
    await authStore.checkSession()
  }
  
  // 設置默認月份為當前月份
  selectedMonth.value = dayjs(getCurrentYm(), 'YYYY-MM')
  
  // 並行載入數據
  await Promise.all([
    loadUsers(),
    loadClients(),
    loadTrips(),
    loadSummary()
  ])
})
</script>

<style scoped>
/* 樣式可以根據需要添加 */
</style>


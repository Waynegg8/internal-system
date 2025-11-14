<template>
  <div style="padding: 24px">
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
    
    <!-- 工具欄區域 -->
    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 24px">
      <!-- 員工選擇器（僅管理員可見） -->
      <a-select
        v-if="store.isAdmin"
        v-model:value="selectedUserId"
        placeholder="選擇員工"
        style="min-width: 180px"
        allow-clear
        @change="handleUserChange"
      >
        <a-select-option value="">全部員工</a-select-option>
        <a-select-option
          v-for="user in users"
          :key="user.user_id || user.id"
          :value="user.user_id || user.id"
        >
          {{ user.name }}
        </a-select-option>
      </a-select>

      <!-- 年份篩選器 -->
      <a-select
        v-model:value="selectedYear"
        placeholder="請選擇年份"
        style="min-width: 150px"
        @change="handleYearChange"
      >
        <a-select-option
          v-for="year in yearOptions"
          :key="year"
          :value="year"
        >
          {{ year }}年
        </a-select-option>
      </a-select>

      <!-- 月份篩選器 -->
      <a-select
        v-model:value="selectedMonth"
        placeholder="全年"
        style="min-width: 150px"
        allow-clear
        @change="handleMonthChange"
      >
        <a-select-option value="">全年</a-select-option>
        <a-select-option
          v-for="month in monthOptions"
          :key="month.value"
          :value="month.value"
        >
          {{ month.label }}
        </a-select-option>
      </a-select>

      <!-- 假別篩選器 -->
      <a-select
        v-model:value="selectedType"
        placeholder="全部假別"
        style="min-width: 180px"
        allow-clear
        @change="handleTypeChange"
      >
        <a-select-option value="">全部假別</a-select-option>
        <a-select-option
          v-for="(label, type) in LEAVE_TYPES"
          :key="type"
          :value="type"
        >
          {{ label }}
        </a-select-option>
      </a-select>

      <!-- 申請假期按鈕 -->
      <a-button type="primary" @click="handleApplyLeave">
        申請假期
      </a-button>

      <!-- 登記生活事件按鈕 -->
      <a-button @click="handleRegisterEvent">
        登記生活事件
      </a-button>
    </div>

    <!-- 主內容區域 -->
    <a-spin :spinning="store.loading">
      <!-- 餘額總覽組件（佔位符） -->
      <a-card style="margin-bottom: 16px">
        <div v-if="store.balances.length === 0" style="color: rgba(15, 23, 42, 0.7)">
          無餘額資料
        </div>
        <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px">
          <div
            v-for="balance in store.balances"
            :key="balance.type"
            style="padding: 16px; border: 1px solid rgba(15, 23, 42, 0.15); border-radius: 8px"
          >
            <div style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600">
              {{ getLeaveTypeText(balance.type) }}
            </div>
            <p v-if="balance.type === 'comp'" style="margin: 0; font-size: 13px">
              當月剩餘 {{ balance.remain }} 小時<br>
              <small style="color: rgba(15, 23, 42, 0.6)">次月轉加班費</small>
            </p>
            <p v-else style="margin: 0; font-size: 13px">
              剩餘 {{ balance.remain }} / 額度 {{ balance.total }} 天
            </p>
          </div>
        </div>
      </a-card>

      <!-- 假期記錄列表組件 -->
      <a-card style="margin-bottom: 16px">
        <LeaveRecords
          :leaves="filteredLeaves"
          :loading="store.loading"
          :show-user-name="store.isAdmin"
          @edit="handleEditLeave"
          @delete="handleDeleteLeave"
        />
      </a-card>

      <!-- 生活事件記錄列表組件 -->
      <a-card>
        <LifeEventRecords
          :life-events="store.lifeEvents"
          :loading="store.loading"
          @delete="handleDeleteEvent"
        />
      </a-card>
    </a-spin>

    <!-- 申請假期彈窗 -->
    <ApplyLeaveModal
      v-model:visible="applyLeaveModalVisible"
      :editing-leave="editingLeave"
      :gender="userGender"
      :balances="store.balances"
      @submit="handleLeaveSubmit"
      @cancel="handleLeaveCancel"
    />

    <!-- 登記生活事件彈窗 -->
    <RegisterEventModal
      v-model:visible="registerEventModalVisible"
      :gender="userGender"
      @submit="handleEventSubmit"
      @cancel="handleEventCancel"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { useLeavesStore } from '@/stores/leaves'
import { useAuthStore } from '@/stores/auth'
import { fetchAllUsers } from '@/api/users'
import { LEAVE_TYPES, getLeaveTypeText } from '@/constants/leaveTypes'
import LeaveRecords from '@/components/leaves/LeaveRecords.vue'
import LifeEventRecords from '@/components/leaves/LifeEventRecords.vue'
import ApplyLeaveModal from '@/components/leaves/ApplyLeaveModal.vue'
import RegisterEventModal from '@/components/leaves/RegisterEventModal.vue'

const router = useRouter()
const store = useLeavesStore()
const authStore = useAuthStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { loading, error } = storeToRefs(store)

// 本地狀態
const selectedUserId = ref('')
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(null)
const selectedType = ref(null)
const users = ref([])
const applyLeaveModalVisible = ref(false)
const registerEventModalVisible = ref(false)
const editingLeave = ref(null)

// 年份選項（2020-2030）
const yearOptions = computed(() => {
  const years = []
  for (let year = 2020; year <= 2030; year++) {
    years.push(year)
  }
  return years
})

// 月份選項（1-12月）
const monthOptions = computed(() => {
  return [
    { value: 1, label: '1月' },
    { value: 2, label: '2月' },
    { value: 3, label: '3月' },
    { value: 4, label: '4月' },
    { value: 5, label: '5月' },
    { value: 6, label: '6月' },
    { value: 7, label: '7月' },
    { value: 8, label: '8月' },
    { value: 9, label: '9月' },
    { value: 10, label: '10月' },
    { value: 11, label: '11月' },
    { value: 12, label: '12月' }
  ]
})

// 載入員工列表（僅管理員）
const loadUsers = async () => {
  if (!store.isAdmin) return
  try {
    const response = await fetchAllUsers()
    // 處理響應格式
    if (response && response.data && Array.isArray(response.data)) {
      users.value = response.data
    } else if (response && response.ok && response.data) {
      users.value = response.data
    } else if (Array.isArray(response)) {
      users.value = response
    }
  } catch (err) {
    console.error('載入員工列表失敗:', err)
    showError('載入員工列表失敗')
  }
}

// 載入數據
const loadData = async () => {
  try {
    const userId = store.isAdmin && selectedUserId.value ? selectedUserId.value : null
    const year = selectedYear.value || new Date().getFullYear()

    // 並行載入數據
    await Promise.all([
      store.fetchBalances(year, userId),
      store.fetchLeaves(),
      store.fetchLifeEvents(userId)
    ])
  } catch (err) {
    console.error('載入數據失敗:', err)
    // 錯誤已在 store 中處理
  }
}

// 處理員工選擇變化
const handleUserChange = (value) => {
  selectedUserId.value = value || ''
  // 只有當選擇了特定員工時才傳遞 userId，空字符串表示全部員工
  store.setFilters({ userId: selectedUserId.value || null })
  loadData()
}

// 處理年份變化
const handleYearChange = (value) => {
  selectedYear.value = value
  store.setFilters({ year: selectedYear.value })
  loadData()
}

// 處理月份變化
const handleMonthChange = (value) => {
  selectedMonth.value = value || null
  store.setFilters({ month: selectedMonth.value })
  loadData()
}

// 處理假別變化
const handleTypeChange = (value) => {
  selectedType.value = value || null
  store.setFilters({ type: selectedType.value })
  loadData()
}

// 用戶性別
const userGender = computed(() => {
  return authStore.user?.gender || null
})

// 過濾後的假期記錄（根據年月和假別）
const filteredLeaves = computed(() => {
  let filtered = [...store.leaves]

  // 根據年份過濾
  if (selectedYear.value) {
    filtered = filtered.filter(leave => {
      const leaveDate = leave.start || leave.start_date
      if (!leaveDate) return false
      const year = new Date(leaveDate).getFullYear()
      return year === selectedYear.value
    })
  }

  // 根據月份過濾
  if (selectedMonth.value) {
    filtered = filtered.filter(leave => {
      const leaveDate = leave.start || leave.start_date
      if (!leaveDate) return false
      const month = new Date(leaveDate).getMonth() + 1
      return month === selectedMonth.value
    })
  }

  // 根據假別過濾
  if (selectedType.value) {
    filtered = filtered.filter(leave => {
      return (leave.type || leave.leave_type) === selectedType.value
    })
  }

  return filtered
})

// 處理申請假期按鈕點擊
const handleApplyLeave = () => {
  editingLeave.value = null
  applyLeaveModalVisible.value = true
}

// 處理登記生活事件按鈕點擊
const handleRegisterEvent = () => {
  registerEventModalVisible.value = true
}

// 處理編輯假期
const handleEditLeave = (leave) => {
  editingLeave.value = leave
  applyLeaveModalVisible.value = true
}

// 處理刪除假期
const handleDeleteLeave = async (leaveId) => {
  try {
    await store.deleteLeave(leaveId)
    showSuccess('已成功刪除')
  } catch (error) {
    showError(error.message || '刪除失敗')
  }
}

// 處理刪除生活事件
const handleDeleteEvent = async (eventId) => {
  try {
    await store.deleteLifeEvent(eventId)
    showSuccess('已成功刪除')
  } catch (error) {
    showError(error.message || '刪除失敗')
  }
}

// 處理假期提交
const handleLeaveSubmit = async (payload, isEdit) => {
  try {
    if (isEdit && editingLeave.value) {
      const leaveId = editingLeave.value.leaveId || editingLeave.value.leave_id || editingLeave.value.id
      await store.updateLeave(leaveId, payload)
      showSuccess('已更新')
    } else {
      await store.createLeave(payload)
      showSuccess('申請成功')
    }
    applyLeaveModalVisible.value = false
    editingLeave.value = null
  } catch (error) {
    showError(error.message || '操作失敗')
  }
}

// 處理假期取消
const handleLeaveCancel = () => {
  editingLeave.value = null
}

// 處理生活事件提交
const handleEventSubmit = async (payload) => {
  try {
    await store.createLifeEvent(payload)
    showSuccess('登記成功')
    registerEventModalVisible.value = false
    // 重新獲取假期餘額以顯示新的生活事件假期
    await store.fetchBalances(selectedYear.value, selectedUserId.value || null)
  } catch (error) {
    showError(error.message || '登記失敗')
  }
}

// 處理生活事件取消
const handleEventCancel = () => {
  // 取消操作，不需要額外處理
}

// 處理關閉錯誤提示
const handleCloseError = () => {
  store.clearError()
}

// 初始化
onMounted(async () => {
  // 檢查用戶是否已登入
  if (!authStore.isAuthenticated) {
    await authStore.checkSession()
    if (!authStore.isAuthenticated) {
      router.push({
        path: '/login',
        query: { redirect: router.currentRoute.value.fullPath }
      })
      return
    }
  }

  // 初始化篩選條件（年份為當前年份）
  selectedYear.value = new Date().getFullYear()
  selectedUserId.value = ''
  store.setFilters({
    year: selectedYear.value,
    month: null,
    type: null,
    userId: null
  })

  // 載入員工列表（如果是管理員）
  await loadUsers()

  // 載入數據
  await loadData()
})
</script>


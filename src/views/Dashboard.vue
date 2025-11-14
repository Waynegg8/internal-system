<template>
  <div class="dashboard-content">
    <a-spin :spinning="loading">
      <!-- 錯誤提示 -->
      <a-alert
        v-if="error"
        type="error"
        :message="error"
        show-icon
        closable
        @close="handleCloseError"
        style="margin-bottom: 12px"
      />
      
      <!-- 頁面標題區域 -->
      <div class="dashboard-header">
        <div class="header-welcome">
          <span class="welcome-text">
            歡迎回來，<span class="user-name">{{ userName }}</span>
          </span>
          <span class="separator">•</span>
          <span class="current-date">{{ currentDate }}</span>
        </div>
      </div>
      
      <!-- 通知欄區域 -->
      <DashboardNotices :notices="notices" />

      <!-- 內容區域 -->
      <div class="dashboard-main">
        <EmployeeDashboard
          v-if="!isAdmin"
          :employee-data="employeeData"
        />
        <AdminDashboard
          v-else
          :admin-data="adminData"
          :current-ym="currentYm"
          :finance-mode="financeMode"
          :finance-ym="financeYm"
          :activity-filters="activityFilters"
          @activity-filter-change="handleActivityFilterChange"
          @task-month-change="handleTaskMonthChange"
          @hour-month-change="handleHourMonthChange"
          @finance-mode-change="handleFinanceModeChange"
          @finance-month-change="handleFinanceMonthChange"
        />
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { formatLocalDate } from '@/utils/formatters'
import DashboardNotices from '@/components/dashboard/DashboardNotices.vue'
import DashboardAlertsPanel from '@/components/dashboard/DashboardAlertsPanel.vue'
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard.vue'
import AdminDashboard from '@/components/dashboard/AdminDashboard.vue'

const router = useRouter()
const dashboardStore = useDashboardStore()
const authStore = useAuthStore()

// 從 store 獲取響應式狀態
const store = dashboardStore
const {
  notices,
  loading,
  error,
  isAdmin,
  currentYm,
  financeMode,
  financeYm,
  activityDays,
  activityUserId,
  activityType,
  dashboardData,
  alerts,
  dailySummary,
  alertsLoading
} = storeToRefs(dashboardStore)

// 當前日期
const currentDate = ref('')

// 用戶名稱
const userName = computed(() => {
  return authStore.userName || authStore.user?.name || authStore.user?.username || '—'
})

// 自動刷新定時器
let refreshTimer = null

// 載入數據
const loadData = async () => {
  // 避免重複請求
  if (loading.value) {
    return
  }

  try {
    await store.fetchDashboardData()
  } catch (err) {
    console.error('載入儀表板數據失敗:', err)
  }

  try {
    await store.fetchDashboardAlerts()
  } catch (err) {
    console.error('載入儀表板提醒失敗:', err)
  }
}

// 處理關閉錯誤
const handleCloseError = () => {
  store.clearError()
}

// 員工數據
const employeeData = computed(() => {
  if (!dashboardData.value) return {}
  const role = dashboardData.value.role || (isAdmin.value ? 'admin' : 'employee')
  if (role === 'employee') {
    return dashboardData.value.employee || {}
  }
  return {}
})

// 管理員數據
const adminData = computed(() => {
  if (!dashboardData.value) return {}
  const role = dashboardData.value.role || (isAdmin.value ? 'admin' : 'employee')
  if (role === 'admin') {
    return dashboardData.value.admin || {}
  }
  return {}
})

const alertsList = computed(() => {
  return Array.isArray(alerts.value) ? alerts.value : []
})

const dailySummaryData = computed(() => dailySummary.value || null)

const handleViewTask = (item) => {
  if (!item) return
  if (item.taskId) {
    router.push({ path: '/tasks/detail', query: { id: item.taskId } })
  } else if (item.configId) {
    router.push({ path: '/tasks', query: { highlightConfig: item.configId } })
  }
}

// 活動篩選條件
const activityFilters = computed(() => {
  return {
    type: activityType.value || '',
    userId: activityUserId.value || '',
    days: activityDays.value || 7
  }
})

// 處理活動篩選變化
const handleActivityFilterChange = (filters) => {
  store.setActivityFilters({
    type: filters.type,
    userId: filters.userId,
    days: filters.days
  })
  loadData()
}

// 處理任務月份變化
const handleTaskMonthChange = (ym) => {
  store.setCurrentYm(ym)
  loadData()
}

// 處理工時月份變化
const handleHourMonthChange = (ym) => {
  store.setCurrentYm(ym)
  loadData()
}

// 處理財務模式變化
const handleFinanceModeChange = (mode) => {
  store.setFinanceMode(mode)
  if (mode === 'ytd') {
    // 如果切换到年度模式，确保financeYm是当年的12月
    const currentYear = financeYm.value.split('-')[0]
    store.setFinanceYm(`${currentYear}-12`)
  }
  loadData()
}

// 處理財務月份變化
const handleFinanceMonthChange = (ym) => {
  store.setFinanceYm(ym)
  store.setFinanceMode('month') // 选择月份时自动切换回月度模式
  loadData()
}

// 啟動自動刷新
const startAutoRefresh = () => {
  // 清除現有定時器
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  
  // 每5分鐘刷新一次
  refreshTimer = setInterval(() => {
    loadData()
  }, 5 * 60 * 1000)
  
  // 頁面獲得焦點時自動刷新
  window.addEventListener('focus', handleFocusRefresh)
}

// 處理頁面焦點刷新
const handleFocusRefresh = () => {
  loadData()
}

// 停止自動刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  window.removeEventListener('focus', handleFocusRefresh)
}

// 初始化
onMounted(async () => {
  // 檢查用戶是否已登入
  if (!authStore.isAuthenticated) {
    // 嘗試從 session 恢復登入狀態
    const isAuthenticated = await authStore.checkSession()
    if (!isAuthenticated) {
      router.push({
        path: '/login',
        query: { redirect: router.currentRoute.value.fullPath }
      })
      return
    }
  }
  
  // 更新當前日期
  currentDate.value = formatLocalDate(new Date())
  
  // 初始化當前年月
  store.initCurrentYm()
  
  // 載入數據
  await loadData()
  // 強制拉取一次提醒，避免節流阻擋第一次取得
  await store.fetchDashboardAlerts({ force: true })
  
  // 啟動自動刷新
  startAutoRefresh()
})

// 清理
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.dashboard-content {
  padding: 16px;
  min-height: calc(100vh - 64px);
}

.dashboard-header {
  margin-bottom: 12px;
}

.header-welcome {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.welcome-text {
  color: #333;
}

.user-name {
  font-weight: 600;
  color: #1890ff;
}

.separator {
  color: #999;
}

.current-date {
  color: #666;
}

.dashboard-main {
  margin-top: 12px;
}
</style>


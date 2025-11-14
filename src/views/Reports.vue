<template>
  <div class="reports-content">
    <!-- 權限檢查提示 -->
    <a-alert
      v-if="!isAdmin"
      type="error"
      message="權限不足"
      description="您沒有權限訪問此頁面，僅管理員可以訪問報表分析。"
      show-icon
      closable
      style="margin-bottom: 24px"
    />

    <!-- 錯誤提示 -->
    <a-alert
      v-if="reportsStore.error"
      type="error"
      :message="reportsStore.error"
      show-icon
      closable
      @close="reportsStore.clearError()"
      style="margin-bottom: 24px"
    />

    <!-- 標籤導航和內容區域 -->
    <template v-if="isAdmin">
      <a-tabs
        v-model:activeKey="activeTab"
        @change="handleTabChange"
        class="reports-tabs"
      >
        <a-tab-pane key="monthly" tab="月度報表" />
        <a-tab-pane key="annual" tab="年度報表" />
      </a-tabs>

      <!-- 路由出口 -->
      <div class="reports-router-view">
        <router-view />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useReportsStore } from '@/stores/reports'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const reportsStore = useReportsStore()

// 從 store 獲取用戶信息
const { isAuthenticated } = storeToRefs(authStore)
const isAdmin = computed(() => authStore.isAdmin)

// 標籤與路由的映射
const tabRouteMap = {
  monthly: '/reports/monthly',
  annual: '/reports/annual'
}

// 路由與標籤的映射（反向）
const routeTabMap = {
  '/reports/monthly': 'monthly',
  '/reports/annual': 'annual'
}

// 根據當前路由獲取活動標籤
const getActiveTabFromRoute = () => {
  const currentPath = route.path
  return routeTabMap[currentPath] || 'monthly'
}

// 當前活動標籤
const activeTab = ref(getActiveTabFromRoute())

// 處理標籤切換
const handleTabChange = (key) => {
  const targetRoute = tabRouteMap[key]
  if (targetRoute && route.path !== targetRoute) {
    router.push(targetRoute)
  }
}

// 監聽路由變化，確保標籤同步
watch(
  () => route.path,
  (newPath) => {
    activeTab.value = getActiveTabFromRoute()
  }
)

// 檢查登入狀態和權限
onMounted(async () => {
  // 檢查是否已登入
  if (!isAuthenticated.value) {
    // 嘗試從 session 恢復登入狀態
    await authStore.checkSession()
    
    if (!isAuthenticated.value) {
      router.push({
        path: '/login',
        query: { redirect: route.fullPath }
      })
      return
    }
  }

  // 檢查是否為管理員
  if (!isAdmin.value) {
    // 非管理員已經通過路由守衛處理，這裡只是額外檢查
    // 如果路由守衛沒有攔截，這裡會顯示權限提示
    return
  }
})
</script>

<style scoped>
.reports-content {
  padding: 24px;
  min-height: 100vh;
}

.reports-tabs {
  margin-bottom: 16px;
}

.reports-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 12px;
  background: #ffffff;
  border-radius: 8px 8px 0 0;
  min-height: 36px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}

.reports-tabs :deep(.ant-tabs-nav::before) {
  border-bottom: none;
}

.reports-tabs :deep(.ant-tabs-tab) {
  padding: 6px 12px;
  font-size: 13px;
  line-height: 20px;
  min-height: 36px;
}

.reports-router-view {
  margin-top: 0;
}
</style>




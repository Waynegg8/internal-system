<template>
  <div class="payroll-content">
    <!-- 權限檢查提示 -->
    <a-alert
      v-if="!isAdmin"
      type="error"
      message="權限不足"
      description="您沒有權限訪問此頁面，僅管理員可以訪問薪資管理。"
      show-icon
      closable
      style="margin-bottom: 24px"
    />

    <!-- 標籤導航和內容區域 -->
    <template v-if="isAdmin">
      <a-tabs
        v-model:activeKey="activeTab"
        @change="handleTabChange"
        class="payroll-tabs"
      >
        <a-tab-pane key="calc" tab="薪資計算" />
        <a-tab-pane key="items" tab="薪資項目設定" />
        <a-tab-pane key="emp" tab="員工薪資設定" />
        <a-tab-pane key="bonus" tab="績效獎金調整" />
        <a-tab-pane key="yearend" tab="年終獎金" />
        <a-tab-pane key="settings" tab="系統設定" />
        <a-tab-pane key="punch" tab="打卡記錄上傳" />
      </a-tabs>

      <!-- 路由出口 -->
      <div class="payroll-router-view">
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
import { usePayrollStore } from '@/stores/payroll'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 從 store 獲取用戶信息
const { user, isAuthenticated } = storeToRefs(authStore)
const isAdmin = computed(() => authStore.isAdmin)

// 標籤與路由的映射
const tabRouteMap = {
  calc: '/payroll/calc',
  items: '/payroll/items',
  emp: '/payroll/emp',
  bonus: '/payroll/bonus',
  yearend: '/payroll/yearend',
  settings: '/payroll/settings',
  punch: '/payroll/punch'
}

// 路由與標籤的映射（反向）
const routeTabMap = {
  '/payroll/calc': 'calc',
  '/payroll/items': 'items',
  '/payroll/emp': 'emp',
  '/payroll/bonus': 'bonus',
  '/payroll/yearend': 'yearend',
  '/payroll/settings': 'settings',
  '/payroll/punch': 'punch'
}

// 根據當前路由獲取活動標籤
const getActiveTabFromRoute = () => {
  const currentPath = route.path
  return routeTabMap[currentPath] || 'calc'
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
.payroll-content {
  padding: 24px;
  min-height: 100vh;
}

.payroll-tabs {
  margin-bottom: 24px;
}

.payroll-router-view {
  margin-top: 24px;
}
</style>



<template>
  <div class="settings-content">
    <!-- 權限檢查提示 -->
    <a-alert
      v-if="!isAdmin"
      type="error"
      message="權限不足"
      description="您沒有權限訪問此頁面，僅管理員可以訪問系統設定。"
      show-icon
      closable
      style="margin-bottom: 8px"
    />

    <!-- 標籤導航和內容區域 -->
    <template v-if="isAdmin">
      <a-tabs
        v-model:activeKey="activeTab"
        @change="handleTabChange"
        class="settings-tabs"
      >
        <a-tab-pane key="services" tab="服務項目" />
        <a-tab-pane key="templates" tab="任務模板" />
        <a-tab-pane key="users" tab="用戶" />
        <a-tab-pane key="company" tab="公司資訊" />
        <a-tab-pane key="automation" tab="自動化規則" />
        <a-tab-pane key="holidays" tab="國定假日" />
      </a-tabs>

      <!-- 路由出口 -->
      <div class="settings-router-view">
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

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 從 store 獲取用戶信息
const { user, isAuthenticated } = storeToRefs(authStore)
const isAdmin = computed(() => authStore.isAdmin)

// 標籤與路由的映射
const tabRouteMap = {
  services: '/settings/services',
  templates: '/settings/templates',
  users: '/settings/users',
  company: '/settings/company',
  automation: '/settings/automation',
  holidays: '/settings/holidays'
}

// 路由與標籤的映射（反向）
const routeTabMap = {
  '/settings/services': 'services',
  '/settings/templates': 'templates',
  '/settings/users': 'users',
  '/settings/company': 'company',
  '/settings/automation': 'automation',
  '/settings/holidays': 'holidays'
}

// 根據當前路由獲取活動標籤
const getActiveTabFromRoute = () => {
  const currentPath = route.path
  return routeTabMap[currentPath] || 'services'
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
.settings-content {
  padding: 12px;
  min-height: 100vh;
}

.settings-tabs {
  margin-bottom: 12px;
}

.settings-router-view {
  margin-top: 0;
}
</style>


<template>
  <a-layout-header class="app-navbar">
    <div class="navbar-container">
      <!-- Logo -->
      <router-link to="/dashboard" class="navbar-brand">
        <img 
          src="/assets/images/logo-white.png" 
          alt="HorgosCPA" 
          class="navbar-logo"
          @error="handleImageError"
        />
      </router-link>

      <!-- 移動端切換按鈕 -->
      <button 
        class="mobile-toggle" 
        @click="toggleMobileMenu"
        aria-label="開啟選單"
      >
        <MenuOutlined />
      </button>

      <!-- 導航連結 -->
      <nav 
        class="navbar-links" 
        :class="{ 'mobile-open': mobileMenuOpen }"
        @click="closeMobileMenu"
      >
        <router-link 
          v-for="item in menuItems" 
          :key="item.path"
          :to="item.path" 
          class="navbar-link"
          :class="{ 'active': isActive(item.path) }"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <!-- 用戶信息 -->
      <div class="navbar-user">
        <span class="user-name">{{ userName }}</span>
        <a-button 
          type="text" 
          class="logout-btn"
          @click="handleLogout"
        >
          登出
        </a-button>
      </div>
    </div>
  </a-layout-header>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MenuOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { message } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const mobileMenuOpen = ref(false)

// 導航菜單項
const menuItems = computed(() => {
  const items = [
    { path: '/dashboard', label: '儀表板' },
    { path: '/clients', label: '客戶' },
    { path: '/timesheets', label: '工時' },
    { path: '/leaves', label: '假期' },
    { path: '/trips', label: '外出' },
    { path: '/tasks', label: '任務' },
    { path: '/receipts', label: '收據' }
  ]

  // 管理員專用菜單
  if (authStore.isAdmin) {
    items.push(
      { path: '/payroll', label: '薪資' },
      { path: '/costs', label: '成本' },
      { path: '/knowledge', label: '知識庫' },
      { path: '/reports', label: '報表' },
      { path: '/settings', label: '設定' }
    )
  }

  return items
})

// 用戶名稱
const userName = computed(() => {
  return authStore.userName || authStore.user?.name || authStore.user?.username || '—'
})

// 檢查當前路由是否激活
const isActive = (path) => {
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path.startsWith(path)
}

// 切換移動端菜單
const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

// 關閉移動端菜單
const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

// 處理登出
const handleLogout = async () => {
  try {
    await authStore.logout()
    message.success('已登出')
    router.push('/login')
  } catch (error) {
    console.error('登出失敗:', error)
    message.error('登出失敗')
  }
}

// 處理圖片加載錯誤
const handleImageError = (e) => {
  e.target.src = '/vite.svg' // Fallback image
}

// 監聽路由變化，關閉移動端菜單
watch(() => route.path, () => {
  closeMobileMenu()
})
</script>

<style scoped>
.app-navbar {
  background: #001529;
  padding: 0;
  height: 64px;
  line-height: 64px;
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.navbar-container {
  display: flex;
  align-items: center;
  height: 100%;
  max-width: 100%;
  padding: 0 16px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  margin-right: 16px;
  text-decoration: none;
  flex-shrink: 0;
}

.navbar-logo {
  height: 32px;
  width: auto;
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.navbar-links {
  display: flex;
  flex: 1;
  gap: 4px;
  overflow: hidden;
  flex-wrap: nowrap;
}

.navbar-link {
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  padding: 0 12px;
  white-space: nowrap;
  transition: all 0.3s;
  border-radius: 4px;
  font-size: 14px;
  flex-shrink: 0;
}

.navbar-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.navbar-link.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 12px;
  color: #fff;
  flex-shrink: 0;
}

.user-name {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  white-space: nowrap;
}

.logout-btn {
  color: rgba(255, 255, 255, 0.65);
  border: none;
  flex-shrink: 0;
}

.logout-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

/* 中屏幕響應式 */
@media (max-width: 1200px) {
  .navbar-container {
    padding: 0 12px;
  }
  
  .navbar-brand {
    margin-right: 12px;
  }
  
  .navbar-links {
    gap: 2px;
  }
  
  .navbar-link {
    padding: 0 10px;
    font-size: 13px;
  }
  
  .navbar-user {
    gap: 8px;
    margin-left: 8px;
  }
}

/* 小屏幕響應式 - 使用漢堡菜單 */
@media (max-width: 992px) {
  .mobile-toggle {
    display: block;
  }

  .navbar-links {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    background: #001529;
    flex-direction: column;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    gap: 0;
  }

  .navbar-links.mobile-open {
    max-height: 80vh;
    overflow-y: auto;
    padding: 8px 0;
  }

  .navbar-link {
    display: block;
    padding: 12px 24px;
    border-radius: 0;
    font-size: 14px;
  }

  .navbar-user {
    margin-left: auto;
  }

  .user-name {
    display: none;
  }
}
</style>


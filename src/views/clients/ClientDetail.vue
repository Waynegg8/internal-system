<template>
  <div class="client-detail-page">
    <!-- 返回按鈕和頁面標題 -->
    <div style="margin-bottom: 24px; display: flex; align-items: center; gap: 16px">
      <a-button type="link" @click="handleBack">
        <template #icon>
          <ArrowLeftOutlined />
        </template>
        返回列表
      </a-button>
    </div>

    <!-- 加載狀態 -->
    <a-spin :spinning="loading">
      <div v-if="error" style="margin-bottom: 24px">
        <a-alert type="error" :message="error" show-icon />
      </div>

      <!-- Tabs 導航 -->
      <a-tabs
        v-model:activeKey="activeTab"
        @change="handleTabChange"
        class="client-detail-tabs"
      >
        <a-tab-pane key="basic" tab="基本資訊" />
        <a-tab-pane key="services" tab="服務" />
        <a-tab-pane key="billing" tab="收費設定" />
      </a-tabs>

      <!-- 子路由視圖 -->
      <router-view />
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useClientStore } from '@/stores/clients'

const route = useRoute()
const router = useRouter()
const clientStore = useClientStore()

// 從 store 獲取響應式狀態
const { currentClient, loading, error } = storeToRefs(clientStore)

// 當前活動的 Tab
const activeTab = ref('basic')

// 處理 Tab 切換
const handleTabChange = (key) => {
  const clientId = route.params.id
  if (key === 'basic') {
    router.push(`/clients/${clientId}`)
  } else if (key === 'services') {
    router.push(`/clients/${clientId}/services`)
  } else if (key === 'billing') {
    router.push(`/clients/${clientId}/billing`)
  }
}

// 處理返回
const handleBack = () => {
  router.push('/clients')
}

// 監聽路由變化，同步 Tab 狀態
watch(
  () => route.path,
  (newPath) => {
    const clientId = route.params.id
    if (newPath === `/clients/${clientId}`) {
      activeTab.value = 'basic'
    } else if (newPath === `/clients/${clientId}/services`) {
      activeTab.value = 'services'
    } else if (newPath === `/clients/${clientId}/billing`) {
      activeTab.value = 'billing'
    }
  },
  { immediate: true }
)

// 加載客戶詳情（帶性能優化）
const loadClientDetail = async (forceRefresh = false) => {
  const clientId = route.params.id
  if (clientId) {
    try {
      // 使用 forceRefresh 參數控制是否強制刷新
      // 當客戶 ID 變化時強制刷新，否則重用緩存
      await clientStore.fetchClientDetail(clientId, { 
        forceRefresh,
        skipCache: false // 允許重用進行中的請求
      })
    } catch (err) {
      console.error('載入客戶詳情失敗:', err)
    }
  }
}

// 組件掛載時獲取客戶詳情
onMounted(() => {
  const clientId = route.params.id
  // 如果已經有相同客戶的數據，不需要重新載入
  const isLoaded = clientStore.isCurrentClientLoaded(clientId)
  loadClientDetail(!isLoaded)
})

// 監聽路由參數變化，當客戶 ID 變化時重新加載
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      // 客戶 ID 變化時強制刷新
      loadClientDetail(true)
    }
  }
)
</script>

<style scoped>
.client-detail-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>


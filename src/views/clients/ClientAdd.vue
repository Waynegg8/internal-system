<template>
  <a-layout class="client-add-page">
    <a-layout-content style="padding: 24px">
      <a-card>
        <!-- 頁面標題和返回按鈕 -->
        <div style="margin-bottom: 24px; display: flex; align-items: center; gap: 16px">
          <a-button type="link" @click="handleBack">
            <template #icon>
              <ArrowLeftOutlined />
            </template>
            返回
          </a-button>
        </div>

        <!-- Tabs 導航 -->
        <a-tabs
          v-model:activeKey="activeTab"
          @change="handleTabChange"
          class="client-add-tabs"
        >
          <a-tab-pane key="basic" tab="基本信息" />
          <a-tab-pane key="services" tab="客戶服務" />
          <a-tab-pane key="billing" tab="收費設定" />
        </a-tabs>

        <!-- 成功提示 -->
        <a-alert
          v-if="successMessage"
          type="success"
          :message="successMessage"
          show-icon
          closable
          @close="successMessage = ''"
          style="margin-bottom: 16px; margin-top: 24px"
        />
        
        <!-- 錯誤提示 -->
        <a-alert
          v-if="errorMessage"
          type="error"
          :message="errorMessage"
          show-icon
          closable
          @close="errorMessage = ''"
          style="margin-bottom: 16px; margin-top: 24px"
        />
        
        <!-- 子路由視圖 -->
        <div style="margin-top: 24px">
          <router-view />
        </div>

        <!-- 操作按鈕 -->
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between">
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" :loading="store.loading" @click="handleSubmit">
            提交
          </a-button>
        </div>
      </a-card>

      <!-- 進度提示覆蓋層（僅在非錯誤狀態時顯示） -->
      <a-modal
        v-model:open="progressModalVisible"
        :title="store.progress.text"
        :footer="null"
        :closable="false"
        :mask-closable="false"
        :keyboard="false"
        width="500px"
      >
        <div style="text-align: center; padding: 24px 0">
          <a-progress
            :percent="store.progress.percent"
            :status="store.progress.status"
          />
          <div style="margin-top: 16px; color: #6b7280">
            {{ store.progress.text }}
          </div>
        </div>
      </a-modal>
    </a-layout-content>
  </a-layout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useClientAddStore } from '@/stores/clientAdd'
import { usePageAlert } from '@/composables/usePageAlert'

const route = useRoute()
const router = useRouter()
const store = useClientAddStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 當前活動的 Tab
const activeTab = ref('basic')

// 進度 modal 顯示狀態（僅在非錯誤狀態時顯示）
const progressModalVisible = computed({
  get: () => store.progress.visible && store.progress.status !== 'exception',
  set: (value) => {
    if (!value) {
      store.updateProgress(false, 0, 'active', '')
    }
  }
})

// 處理 Tab 切換
const handleTabChange = (key) => {
  router.push(`/clients/add/${key}`)
}

// 處理返回
const handleBack = () => {
  router.push('/clients')
}

// 處理取消
const handleCancel = () => {
  store.resetFormData()
  router.push('/clients')
}

// 處理提交
const handleSubmit = async () => {
  try {
    await store.submitClient()
    showSuccess('客戶創建成功！')
    router.push(`/clients/${store.createdClientId}`)
  } catch (error) {
    console.error('提交失敗:', error)
    // 確保進度 modal 關閉
    store.updateProgress(false, 0, 'active', '')
    // 顯示非阻塞式錯誤提示
    showError(error.message || '提交失敗，請檢查輸入')
  }
}

// 監聽路由變化，同步 Tab 狀態
watch(
  () => route.path,
  (newPath) => {
    // 從路徑中提取當前 tab
    const match = newPath.match(/\/clients\/add\/(\w+)/)
    if (match) {
      activeTab.value = match[1]
    } else if (newPath === '/clients/add') {
      activeTab.value = 'basic'
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.client-add-page {
  min-height: 100vh;
}
</style>


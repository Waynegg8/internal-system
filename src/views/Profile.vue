<template>
  <div class="profile-content">
    <a-spin :spinning="loading">
      <!-- 頁面提示 -->
      <PageAlerts
        v-model:success="successMessage"
        v-model:error="errorMessage"
        v-model:info="infoMessage"
      />
      
      <!-- 返回按鈕區域 -->
      <div style="margin-bottom: 24px">
        <a-button @click="handleBack">
          <template #icon>
            <left-outlined />
          </template>
          返回
        </a-button>
      </div>

      <!-- 錯誤提示（來自本地狀態） -->
      <a-alert
        v-if="error"
        type="error"
        :message="error"
        show-icon
        closable
        @close="error = null"
        style="margin-bottom: 24px"
      />

      <!-- 個人資料組件 -->
      <ProfileInfo
        v-if="userProfile"
        ref="profileInfoRef"
        :user="userProfile"
        :loading="loading"
        @submit="handleSaveProfile"
      />

      <!-- 修改密碼組件（只有查看自己資料時才顯示） -->
      <ChangePassword
        v-if="isViewingOwnProfile"
        ref="changePasswordRef"
        :loading="passwordLoading"
        @submit="handleChangePassword"
      />
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LeftOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useAuthApi } from '@/api/auth'
import { useSettingsApi } from '@/api/settings'
import { recalculateLeaveBalances } from '@/api/leaves'
import { usePageAlert } from '@/composables/usePageAlert'
import { getId } from '@/utils/fieldHelper'
import PageAlerts from '@/components/shared/PageAlerts.vue'
import ProfileInfo from '@/components/profile/ProfileInfo.vue'
import ChangePassword from '@/components/profile/ChangePassword.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { successMessage, errorMessage, infoMessage, showSuccess, showError, showWarning, showInfo } = usePageAlert()

// 從 store 獲取響應式狀態
const { user: currentUser, isAdmin } = storeToRefs(authStore)

// 本地狀態
const targetUserId = ref(null)
const isViewingOwnProfile = ref(true)
const userProfile = ref(null)
const loading = ref(false)
const passwordLoading = ref(false)
const error = ref(null)

// 組件引用
const profileInfoRef = ref(null)
const changePasswordRef = ref(null)

// 載入用戶資料
const loadUserProfile = async () => {
  loading.value = true
  error.value = null

  try {
    // 檢查登入狀態
    if (!authStore.isAuthenticated) {
      await authStore.checkSession()
      if (!authStore.isAuthenticated) {
        router.push('/login')
        return
      }
    }

    // 從路由參數中獲取 user_id
    const userIdParam = route.query.id || route.query.user_id

    // 判斷是否查看自己的資料
    if (userIdParam && isAdmin.value) {
      // 管理員查看指定用戶的資料
      targetUserId.value = parseInt(userIdParam)
      const currentUserId = getId(currentUser.value, 'userId', 'user_id', 'id')
      isViewingOwnProfile.value = targetUserId.value === parseInt(currentUserId)
    } else {
      // 查看自己的資料
      const currentUserId = getId(currentUser.value, 'userId', 'user_id', 'id')
      targetUserId.value = parseInt(currentUserId)
      isViewingOwnProfile.value = true
    }

    // 載入用戶資料
    const settingsApi = useSettingsApi()
    const response = await settingsApi.getUserById(targetUserId.value)

    if (response.ok && response.data) {
      userProfile.value = response.data
    } else {
      error.value = response.message || '載入用戶資料失敗'
    }
  } catch (err) {
    console.error('載入用戶資料失敗:', err)
    error.value = err.message || '載入用戶資料失敗'
    
    // 如果是 403 錯誤，顯示權限錯誤
    if (err.response?.status === 403) {
      error.value = '沒有權限查看此用戶資料'
    }
  } finally {
    loading.value = false
  }
}

// 保存個人資料
const handleSaveProfile = async (data) => {
  loading.value = true
  error.value = null

  try {
    const settingsApi = useSettingsApi()
    let response

    if (isViewingOwnProfile.value) {
      // 更新自己的資料
      response = await settingsApi.updateMyProfile(data)
    } else {
      // 管理員更新其他用戶的資料
      response = await settingsApi.updateUser(targetUserId.value, data)
    }

    if (response.ok) {
      showSuccess('個人資料儲存成功！')

      // 如果更新了自己的資料，刷新當前用戶信息
      if (isViewingOwnProfile.value) {
        await authStore.checkSession()
      } else {
        // 重新載入用戶資料
        await loadUserProfile()
      }

      // 提示用戶可以重新計算假期額度（不再使用確認對話框）
      showInfo('個人資料已更新。如需重新計算假期額度，請聯繫管理員。')
    } else {
      error.value = response.message || '儲存失敗'
      showError(response.message || '儲存失敗')
    }
  } catch (err) {
    console.error('儲存個人資料失敗:', err)
    error.value = err.message || '儲存失敗'
    showError(err.message || '儲存失敗')
  } finally {
    loading.value = false
  }
}

// 修改密碼
const handleChangePassword = async (data) => {
  passwordLoading.value = true
  error.value = null

  try {
    const authApi = useAuthApi()
    const response = await authApi.changePassword(data)

    if (response.ok) {
      showSuccess('密碼修改成功！下次登入請使用新密碼。')
      // 重置密碼表單
      changePasswordRef.value?.resetForm()
    } else {
      error.value = response.message || '修改失敗'
      showError(response.message || '修改失敗')
    }
  } catch (err) {
    console.error('修改密碼失敗:', err)
    error.value = err.message || '修改失敗'
    showError(err.message || '修改失敗')
  } finally {
    passwordLoading.value = false
  }
}

// 返回處理
const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/dashboard')
  }
}

// 初始化
onMounted(async () => {
  await loadUserProfile()
})
</script>

<style scoped>
.profile-content {
  padding: 24px;
  background: #fafafa;
  min-height: calc(100vh - 64px);
}
</style>


<template>
  <div class="login-page">
    <div class="login-background">
      <div class="login-pattern"></div>
    </div>
    
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <h1 class="login-title">霍爾果斯會計師事務所</h1>
      </div>
      
      <a-form
        :model="form"
        :rules="rules"
        @finish="handleLogin"
        @finishFailed="handleLoginFailed"
        class="login-form"
        autocomplete="on"
      >
        <a-form-item name="username">
          <a-input
            v-model:value="form.username"
            placeholder="請輸入帳號"
            size="large"
            autocomplete="username"
            @input="handleUsernameInput"
            @change="clearError"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
          <a-typography-text type="secondary" class="login-hint-text">僅限英文字母、數字和底線</a-typography-text>
        </a-form-item>
        
        <a-form-item name="password">
          <a-input-password
            v-model:value="form.password"
            placeholder="請輸入密碼"
            size="large"
            autocomplete="current-password"
            @change="clearError"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>
        
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
            :disabled="loading"
            class="login-submit"
          >
            {{ loading ? '登入中…' : '登入' }}
          </a-button>
        </a-form-item>
        
        <a-alert
          v-if="error"
          :message="error"
          type="error"
          show-icon
          closable
          @close="clearError"
          class="login-error"
        />
        
        <a-typography-text type="secondary" class="login-hint">此頁面僅供內部使用。</a-typography-text>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAuthApi } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const authApi = useAuthApi()

// 表單數據
const form = reactive({
  username: '',
  password: ''
})

// 表單驗證規則
const rules = {
  username: [
    { required: true, message: '請輸入帳號', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '帳號僅限英文字母、數字和底線', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '請輸入密碼', trigger: 'blur' }
  ]
}

// 狀態
const loading = ref(false)
const error = ref('')

// 處理帳號輸入（限制為英文字母、數字和底線）
const handleUsernameInput = (e) => {
  const value = e.target.value
  const filtered = value.replace(/[^a-zA-Z0-9_]/g, '')
  if (value !== filtered) {
    form.username = filtered
    // 重置游標位置
    const input = e.target
    const cursorPos = input.selectionStart - (value.length - filtered.length)
    setTimeout(() => {
      input.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }
  clearError()
}

// 清除錯誤
const clearError = () => {
  error.value = ''
  authStore.clearError()
}

// 獲取重定向目標（使用 API 中的工具函數）
const getRedirectTarget = () => {
  const redirect = authApi.getRedirectTarget()
  return redirect || '/dashboard'
}

// 處理登入
const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const username = form.username.trim()
    const password = form.password
    
    if (!username) {
      error.value = '請輸入帳號'
      loading.value = false
      return
    }
    
    if (!password) {
      error.value = '請輸入密碼'
      loading.value = false
      return
    }
    
    // 調用登入 API
    const result = await authStore.login(username, password)
    
    if (result.ok) {
      // 登入成功
      message.success('登入成功')
      
      // 獲取重定向目標
      const redirect = getRedirectTarget()
      
      // 短暫延遲後跳轉（讓用戶看到成功提示）
      setTimeout(() => {
        router.push(redirect)
      }, 300)
    } else {
      // 登入失敗
      let errorMsg = result.message || '登入失敗，請稍後再試'
      
      // 根據錯誤代碼顯示不同的錯誤訊息
      if (result.code === 'UNAUTHORIZED') {
        errorMsg = '帳號或密碼錯誤'
      }
      
      error.value = errorMsg
    }
  } catch (err) {
    console.error('登入錯誤:', err)
    error.value = err.message || '網路或伺服器異常，請稍後再試'
  } finally {
    loading.value = false
  }
}

// 處理登入失敗（表單驗證失敗）
const handleLoginFailed = (errorInfo) => {
  console.log('表單驗證失敗:', errorInfo)
}

// 處理圖片載入錯誤
const handleImageError = (e) => {
  // 如果 logo 載入失敗，隱藏圖片或使用備用方案
  e.target.style.display = 'none'
}

// 檢查是否已登入
onMounted(async () => {
  // 如果已經登入，直接跳轉到儀表板
  await authStore.checkSession()
  if (authStore.isAuthenticated) {
    const redirect = getRedirectTarget()
    router.push(redirect)
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 24px;
  background: #001529;
}

.login-background {
  position: absolute;
  inset: 0;
  background: #001529;
  z-index: 0;
}

.login-pattern {
  position: absolute;
  inset: 0;
  background-image: none;
}

.login-card {
  width: 100%;
  max-width: 480px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.6s ease-out;
  overflow: hidden;
  background: #ffffff;
  padding: 48px 40px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 48px;
  padding: 0;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 auto;
  letter-spacing: 2px;
  line-height: 1.4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft JhengHei', sans-serif;
  white-space: nowrap;
  text-align: center;
  width: 100%;
}

.login-form {
  padding: 0;
}

.login-hint-text {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 6px;
  margin-bottom: 0;
}

.login-submit {
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  background: #1890ff;
  border: none;
  transition: all 0.3s ease;
  margin-top: 8px;
}

.login-submit:hover:not(:disabled) {
  background: #40a9ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.login-submit:active:not(:disabled) {
  transform: translateY(0);
}

.login-error {
  margin-top: 20px;
  margin-bottom: 0;
}

.login-hint {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  margin: 20px 0 0 0;
}

/* 響應式設計 */
@media (max-width: 480px) {
  .login-card {
    max-width: 100%;
    margin: 0;
  }
  
  .login-card {
    padding: 32px 24px;
  }
  
  .login-company {
    font-size: 1.5rem;
  }
}
</style>


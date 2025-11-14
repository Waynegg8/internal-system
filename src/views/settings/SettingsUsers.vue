<template>
  <div class="settings-users">

    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 8px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage || error"
      type="error"
      :message="errorMessage || error"
      show-icon
      closable
      @close="errorMessage = ''; handleCloseError()"
      style="margin-bottom: 8px"
    />
    
    <!-- 管理員視圖 -->
    <template v-if="isAdmin">
      <!-- 操作欄 -->
      <div class="action-bar" style="margin-bottom: 12px">
        <a-button type="primary" @click="handleAddUser">
          <template #icon>
            <plus-outlined />
          </template>
          新增用戶
        </a-button>
      </div>

      <!-- 用戶表單（條件顯示） -->
      <UserForm
        v-if="formVisible"
        ref="userFormRef"
        :editing-user="editingUser"
        :loading="store.loading"
        @submit="handleFormSubmit"
        @cancel="handleFormCancel"
      />

      <!-- 用戶列表表格 -->
      <a-card>
        <UsersTable
          :users="store.users"
          :loading="store.loading"
          @edit="handleEditUser"
          @delete="handleDeleteUser"
          @reset-password="handleResetPassword"
        />
      </a-card>
    </template>

    <!-- 員工視圖 -->
    <template v-else>
      <a-row :gutter="24">
        <a-col :span="12">
          <EmployeeProfile
            ref="employeeProfileRef"
            :user="currentUser"
            @update:form-data="handleProfileDataChange"
          />
          <div class="form-actions">
            <a-button type="primary" :loading="store.loading" @click="handleProfileSubmit">
              更新個人資料
            </a-button>
          </div>
        </a-col>
        <a-col :span="12">
          <PasswordChange
            ref="passwordChangeRef"
            :loading="passwordLoading"
            @submit="handlePasswordSubmit"
          />
        </a-col>
      </a-row>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { useAuthApi } from '@/api/auth'
import UserForm from '@/components/settings/UserForm.vue'
import UsersTable from '@/components/settings/UsersTable.vue'
import EmployeeProfile from '@/components/settings/EmployeeProfile.vue'
import PasswordChange from '@/components/settings/PasswordChange.vue'

const store = useSettingsStore()
const authStore = useAuthStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { error } = storeToRefs(store)
const { user: currentUser, isAdmin } = storeToRefs(authStore)

// 本地狀態（管理員視圖）
const formVisible = ref(false)
const editingUser = ref(null)
const userFormRef = ref(null)

// 本地狀態（員工視圖）
const myProfile = reactive({
  hire_date: null,
  gender: '',
  email: ''
})
const passwordLoading = ref(false)
const employeeProfileRef = ref(null)
const passwordChangeRef = ref(null)

// 載入數據
const loadData = async () => {
  try {
    if (isAdmin.value) {
      await store.getUsers()
    } else {
      // 員工視圖：載入個人資料
      if (currentUser.value) {
        myProfile.hire_date = currentUser.value.hire_date || null
        myProfile.gender = currentUser.value.gender || ''
        myProfile.email = currentUser.value.email || ''
      }
    }
  } catch (err) {
    console.error('載入數據失敗:', err)
    // 錯誤已由 store 處理
  }
}

// 管理員視圖：新增用戶
const handleAddUser = () => {
  editingUser.value = null
  formVisible.value = true
  setTimeout(() => {
    userFormRef.value?.resetForm()
  }, 0)
}

// 管理員視圖：編輯用戶
const handleEditUser = (user) => {
  editingUser.value = user
  formVisible.value = true
}

// 管理員視圖：刪除用戶
const handleDeleteUser = async (userId) => {
  try {
    const response = await store.deleteUser(userId)
    if (response.ok) {
      showSuccess('刪除成功')
    } else {
      showError(response.message || '刪除失敗')
    }
  } catch (err) {
    console.error('刪除用戶失敗:', err)
    showError(err.message || '刪除失敗')
  }
}

// 管理員視圖：重置密碼
const handleResetPassword = async (userId, newPassword) => {
  try {
    const response = await store.resetUserPassword(userId, newPassword)
    if (response.ok) {
      // 獲取用戶資料以顯示更詳細的成功訊息
      const user = store.users.find(u => 
        (u.user_id || u.userId || u.id) === userId
      )
      const userName = user?.name || `用戶 ${userId}`
      showSuccess(`已重置 ${userName} 的密碼`)
    } else {
      showError(response.message || '重置密碼失敗')
    }
  } catch (err) {
    console.error('重置密碼失敗:', err)
    showError(err.message || '重置密碼失敗')
  }
}

// 管理員視圖：表單提交
const handleFormSubmit = async (data, isEdit) => {
  try {
    let response
    if (isEdit) {
      // 編輯模式
      const userId = editingUser.value.user_id || editingUser.value.userId || editingUser.value.id
      response = await store.updateUser(userId, data)
      if (response.ok) {
        showSuccess('更新成功')
        formVisible.value = false
        editingUser.value = null
      } else {
        showError(response.message || '更新失敗')
      }
    } else {
      // 新增模式
      response = await store.createUser(data)
      if (response.ok) {
        showSuccess('新增成功')
        formVisible.value = false
        editingUser.value = null
      } else {
        showError(response.message || '新增失敗')
      }
    }
  } catch (err) {
    console.error('提交表單失敗:', err)
    showError(err.message || '新增失敗')
  }
}

// 管理員視圖：表單取消
const handleFormCancel = () => {
  formVisible.value = false
  editingUser.value = null
}

// 員工視圖：個人資料變更
const handleProfileDataChange = (data) => {
  Object.keys(myProfile).forEach(key => {
    if (data.hasOwnProperty(key)) {
      myProfile[key] = data[key]
    }
  })
}

// 員工視圖：個人資料提交
const handleProfileSubmit = async () => {
  // 驗證表單
  const isValid = await employeeProfileRef.value?.validate()
  if (!isValid) {
    showError('請檢查表單輸入')
    return
  }

  try {
    const response = await store.updateMyProfile(myProfile)
    if (response.ok) {
      showSuccess('更新成功')
      // 更新 auth store 中的用戶信息
      await authStore.checkSession()
    } else {
      showError(response.message || '更新失敗')
    }
  } catch (err) {
    console.error('更新個人資料失敗:', err)
    showError(err.message || '更新失敗')
  }
}

// 員工視圖：密碼修改
const handlePasswordSubmit = async (data) => {
  passwordLoading.value = true
  try {
    const authApi = useAuthApi()
    const response = await authApi.changePassword(data)
    if (response.ok) {
      showSuccess('密碼修改成功')
      passwordChangeRef.value?.resetForm()
    } else {
      showError(response.message || '密碼修改失敗')
    }
  } catch (err) {
    console.error('修改密碼失敗:', err)
    showError(err.message || '修改密碼失敗')
  } finally {
    passwordLoading.value = false
  }
}

// 清除錯誤
const handleCloseError = () => {
  store.clearError()
}

// 載入
onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.settings-users {
  padding: 12px 0;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.action-bar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.form-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>


<template>
  <a-table
    :columns="columns"
    :data-source="users"
    :loading="loading"
    :pagination="false"
    :row-key="getRowKey"
    size="middle"
    class="responsive-table"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'role'">
        <a-tag :color="getRoleColor(record)">
          {{ getRoleText(record) }}
        </a-tag>
      </template>

      <template v-else-if="column.key === 'status'">
        <a-tag color="green">啟用</a-tag>
      </template>

      <template v-else-if="column.key === 'actions'">
        <a-space>
          <router-link :to="`/profile?id=${getUserId(record)}`">
            <a-button size="small">檢視</a-button>
          </router-link>
          <a-button size="small" @click="handleEdit(record)">編輯</a-button>
          <a-button size="small" @click="handleViewPasswordClick(record)">查看密碼</a-button>
          <a-button size="small" @click="handleResetPasswordClick(record)">重置密碼</a-button>
          <a-button v-if="getUserId(record) !== 1" size="small" danger @click="handleDelete(getUserId(record))">刪除</a-button>
        </a-space>
      </template>
    </template>

    <template #emptyText>
      <a-empty description="暫無用戶" />
    </template>
  </a-table>

  <!-- 查看密碼彈窗 -->
  <a-modal
    v-model:open="viewPasswordModalVisible"
    title="查看用戶密碼"
    :footer="null"
    @cancel="handleViewPasswordCancel"
  >
    <a-spin :spinning="viewPasswordLoading">
      <div v-if="viewPasswordData">
        <a-descriptions bordered :column="1">
          <a-descriptions-item label="姓名">{{ viewPasswordData.name }}</a-descriptions-item>
          <a-descriptions-item label="帳號">{{ viewPasswordData.username }}</a-descriptions-item>
          <a-descriptions-item label="密碼">
            <span v-if="viewPasswordData.password" style="font-family: monospace; font-weight: bold; color: #f5222d;">
              {{ viewPasswordData.password }}
            </span>
            <a-alert 
              v-else 
              type="warning" 
              :message="viewPasswordData.message || '無密碼記錄'" 
              show-icon 
            />
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-spin>
  </a-modal>

  <!-- 重置密碼彈窗 -->
  <a-modal
    v-model:open="resetPasswordModalVisible"
    title="重置密碼"
    @ok="handleResetPasswordConfirm"
    @cancel="handleResetPasswordCancel"
    :ok-button-props="{ disabled: !isPasswordValid }"
  >
    <a-form :model="resetPasswordForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
      <a-form-item label="新密碼" :rules="[{ required: true, message: '請輸入新密碼' }, { min: 6, message: '密碼至少需要 6 個字符' }]">
        <a-input-password
          v-model:value="resetPasswordForm.newPassword"
          placeholder="請輸入新密碼（至少 6 個字符）"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import { message } from 'ant-design-vue'

const settingsStore = useSettingsStore()

const props = defineProps({
  users: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'reset-password'])

// 查看密碼相關狀態
const viewPasswordModalVisible = ref(false)
const viewPasswordLoading = ref(false)
const viewPasswordData = ref(null)

// 重置密碼相關狀態
const resetPasswordModalVisible = ref(false)
const resetPasswordForm = ref({
  userId: null,
  newPassword: ''
})

// 表格列定義 - 优化列宽，避免水平滚动
const columns = [
  {
    title: 'ID',
    dataIndex: 'user_id',
    key: 'user_id',
    width: 80,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
    width: '20%',
    minWidth: 120,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '帳號',
    dataIndex: 'username',
    key: 'username',
    width: '20%',
    minWidth: 120,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '角色',
    key: 'role',
    width: 100,
    align: 'center'
  },
  {
    title: '狀態',
    key: 'status',
    width: 100,
    align: 'center',
    responsive: ['lg']
  },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    align: 'center'
  }
]

// 獲取用戶 ID（處理字段名差異）
const getUserId = (record) => {
  return record.user_id || record.userId || record.id
}

// 獲取行 key
const getRowKey = (record) => {
  return getUserId(record)
}

// 獲取角色文字
const getRoleText = (record) => {
  const isAdmin = record.is_admin !== undefined ? record.is_admin : (record.isAdmin !== undefined ? record.isAdmin : false)
  return isAdmin ? '管理員' : '員工'
}

// 獲取角色顏色
const getRoleColor = (record) => {
  const isAdmin = record.is_admin !== undefined ? record.is_admin : (record.isAdmin !== undefined ? record.isAdmin : false)
  return isAdmin ? 'red' : 'blue'
}

// 處理編輯
const handleEdit = (user) => {
  emit('edit', user)
}

// 處理刪除
const handleDelete = (userId) => {
  emit('delete', userId)
}

// 處理查看密碼點擊
const handleViewPasswordClick = async (user) => {
  const userId = getUserId(user)
  viewPasswordData.value = null
  viewPasswordModalVisible.value = true
  viewPasswordLoading.value = true
  
  try {
    const response = await settingsStore.getUserPassword(userId)
    if (response.ok && response.data) {
      viewPasswordData.value = response.data
    } else {
      message.error(response.message || '查詢密碼失敗')
      viewPasswordModalVisible.value = false
    }
  } catch (error) {
    console.error('查詢密碼失敗:', error)
    message.error(error.message || '查詢密碼失敗')
    viewPasswordModalVisible.value = false
  } finally {
    viewPasswordLoading.value = false
  }
}

// 處理查看密碼取消
const handleViewPasswordCancel = () => {
  viewPasswordModalVisible.value = false
  viewPasswordData.value = null
}

// 處理重置密碼點擊
const handleResetPasswordClick = (user) => {
  resetPasswordForm.value.userId = getUserId(user)
  resetPasswordForm.value.newPassword = ''
  resetPasswordModalVisible.value = true
}

// 驗證密碼是否有效
const isPasswordValid = computed(() => {
  const password = resetPasswordForm.value.newPassword?.trim()
  return password && password.length >= 6
})

// 處理重置密碼確認
const handleResetPasswordConfirm = async () => {
  const newPassword = resetPasswordForm.value.newPassword?.trim()
  if (!newPassword || newPassword.length < 6) {
    return
  }
  
  // 發送重置密碼事件
  emit('reset-password', resetPasswordForm.value.userId, newPassword)
  
  // 等待一下讓父組件處理完成
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 關閉對話框並清空表單
  resetPasswordModalVisible.value = false
  resetPasswordForm.value.userId = null
  resetPasswordForm.value.newPassword = ''
}

// 處理重置密碼取消
const handleResetPasswordCancel = () => {
  resetPasswordModalVisible.value = false
  resetPasswordForm.value.userId = null
  resetPasswordForm.value.newPassword = ''
}
</script>

<style scoped>
/* 表格樣式已由 Ant Design Vue 提供 */
</style>


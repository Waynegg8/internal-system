<template>
  <a-modal
    v-model:open="localVisible"
    title="批量分配負責人"
    :width="600"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
      v-model:warning="warningMessage"
    />
    
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <!-- 已選擇客戶列表 -->
      <a-form-item label="已選擇客戶" style="margin-bottom: 16px">
        <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; max-height: 200px; overflow-y: auto">
          <div v-if="selectedClients.length === 0" style="color: #999">暫無選中的客戶</div>
          <a-list
            v-else
            :data-source="displayClients"
            size="small"
            :bordered="false"
          >
            <template #renderItem="{ item }">
              <a-list-item style="padding: 6px 0; border-bottom: 1px solid #e0e0e0">
                <div style="width: 100%">
                  <div style="font-weight: 500; color: #1a1a1a">{{ item.companyName }}</div>
                  <div style="font-size: 13px; color: #666; margin-top: 2px">
                    客戶編號：<span style="color: #2563eb">{{ item.clientId }}</span>
                    <span v-if="item.assigneeName" style="margin-left: 12px">
                      當前負責人：<span style="color: #2563eb">{{ item.assigneeName }}</span>
                    </span>
                  </div>
                </div>
              </a-list-item>
            </template>
          </a-list>
          <div v-if="selectedClients.length > maxDisplayCount" style="margin-top: 8px; color: #666; font-size: 13px">
            還有 {{ selectedClients.length - maxDisplayCount }} 個客戶...
          </div>
        </div>
      </a-form-item>

      <!-- 負責人選擇 -->
      <a-form-item label="新的負責人員" name="assigneeUserId" required>
        <a-select
          v-model:value="formData.assigneeUserId"
          placeholder="請選擇負責人員"
          :loading="usersLoading"
        >
          <a-select-option
            v-for="user in users"
            :key="getId(user, 'user_id', 'id')"
            :value="getId(user, 'user_id', 'id')"
          >
            {{ user.name }}{{ user.is_admin || user.isAdmin ? ' (管理員)' : '' }}
          </a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useClientStore } from '@/stores/clients'
import { fetchAllUsers } from '@/api/users'
import { getId } from '@/utils/fieldHelper'
import PageAlerts from '@/components/shared/PageAlerts.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  selectedClients: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'success'])

const store = useClientStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

const formRef = ref(null)
const loading = ref(false)
const usersLoading = ref(false)
const users = ref([])
const maxDisplayCount = 10

// 本地狀態
const localVisible = ref(props.visible)

// 表單數據
const formData = ref({
  assigneeUserId: undefined
})

// 表單驗證規則
const rules = {
  assigneeUserId: [
    { required: true, message: '請選擇負責人員', trigger: 'change' }
  ]
}

// 顯示的客戶列表（限制數量）
const displayClients = computed(() => {
  return props.selectedClients.slice(0, maxDisplayCount)
})

// 同步 props 變化
watch(() => props.visible, (val) => {
  localVisible.value = val
  if (val) {
    loadUsers()
    // 重置表單
    formData.value.assigneeUserId = undefined
    formRef.value?.resetFields()
  }
})

// 監聽本地狀態變化，同步到父組件
watch(localVisible, (val) => {
  emit('update:visible', val)
})

// 載入用戶列表
const loadUsers = async () => {
  if (users.value.length > 0) return // 已載入過，不需要重複載入
  
  usersLoading.value = true
  try {
    const response = await fetchAllUsers()
    if (response.data && Array.isArray(response.data)) {
      users.value = response.data
    }
  } catch (err) {
    console.error('載入用戶列表失敗:', err)
    showError('載入用戶列表失敗')
  } finally {
    usersLoading.value = false
  }
}

// 處理提交
const handleSubmit = async () => {
  try {
    // 驗證表單
    await formRef.value.validate()
    
    if (props.selectedClients.length === 0) {
      showWarning('請先選擇要分配的客戶')
      return
    }
    
    // 獲取選中的客戶ID數組
    const clientIds = props.selectedClients.map(client => {
      return getId(client, 'clientId', 'client_id', 'id')
    })
    
    // 獲取選擇的負責人ID
    const assigneeUserId = formData.value.assigneeUserId
    
    if (!assigneeUserId) {
      showWarning('請選擇負責人員')
      return
    }
    
    loading.value = true
    
    // 調用 store 的批量分配方法
    await store.batchAssignClients(clientIds, assigneeUserId)
    
    showSuccess(`已成功分配 ${clientIds.length} 個客戶`)
    
    // 觸發成功事件
    emit('success')
    
    // 關閉彈窗
    localVisible.value = false
    
    // 重置表單
    formData.value.assigneeUserId = undefined
    formRef.value?.resetFields()
  } catch (err) {
    if (err.errorFields) {
      // 表單驗證錯誤
      return
    }
    // API 錯誤
    showError(err.message || '分配失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

// 處理取消
const handleCancel = () => {
  localVisible.value = false
  formData.value.assigneeUserId = undefined
  formRef.value?.resetFields()
}
</script>


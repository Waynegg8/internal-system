<template>
  <a-modal
    v-model:open="localVisible"
    title="快速移轉負責人"
    :width="700"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    ok-text="執行移轉"
    cancel-text="取消"
  >
    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 警告提示 -->
    <a-alert
      v-if="warningMessage"
      type="warning"
      :message="warningMessage"
      show-icon
      closable
      @close="warningMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <!-- 目前負責人選擇 -->
      <a-form-item label="目前負責人">
        <a-select
          v-model:value="formData.fromAssigneeUserId"
          placeholder="請選擇目前負責人（可選）"
          allow-clear
          :loading="usersLoading"
          @change="handleFromAssigneeChange"
        >
          <a-select-option :value="null">未分配</a-select-option>
          <a-select-option
            v-for="user in users"
            :key="user.userId || user.user_id || user.id"
            :value="user.userId || user.user_id || user.id"
          >
            {{ user.name }}{{ user.isAdmin || user.is_admin ? ' (管理員)' : '' }}
          </a-select-option>
        </a-select>
        <div style="margin-top: 8px">
          <a-checkbox v-model:checked="formData.includeUnassigned">
            包含未分配客戶
          </a-checkbox>
        </div>
      </a-form-item>

      <!-- 新負責人選擇 -->
      <a-form-item label="新負責人" name="toAssigneeUserId" required>
        <a-select
          v-model:value="formData.toAssigneeUserId"
          placeholder="請選擇新負責人"
          :loading="usersLoading"
          @change="handleToAssigneeChange"
        >
          <a-select-option
            v-for="user in users"
            :key="user.userId || user.user_id || user.id"
            :value="user.userId || user.user_id || user.id"
          >
            {{ user.name }}{{ user.isAdmin || user.is_admin ? ' (管理員)' : '' }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- 標籤篩選（多選） -->
      <a-form-item label="標籤（可多選）">
        <a-checkbox-group v-model:value="formData.selectedTagIds" style="width: 100%">
          <div style="display: flex; flex-wrap: wrap; gap: 8px">
            <a-checkbox
              v-for="tag in tags"
              :key="tag.tag_id || tag.id"
              :value="tag.tag_id || tag.id"
            >
              {{ tag.tag_name || tag.name }}
            </a-checkbox>
          </div>
        </a-checkbox-group>
      </a-form-item>

      <!-- 關鍵字篩選 -->
      <a-form-item label="關鍵字">
        <a-input
          v-model:value="formData.searchKeyword"
          placeholder="例如：有限公司、245…"
          allow-clear
        />
      </a-form-item>

      <!-- 預覽按鈕和結果 -->
      <a-form-item label="預覽">
        <div>
          <a-button
            type="default"
            :loading="previewLoading"
            @click="handlePreview"
          >
            預覽符合名單
          </a-button>
          <span v-if="previewData" style="margin-left: 12px; color: #555">
            符合 {{ previewData.match_count || 0 }} 筆
          </span>
        </div>
        
        <!-- 預覽結果列表 -->
        <div
          v-if="previewData && previewData.sample && previewData.sample.length > 0"
          style="margin-top: 12px; max-height: 160px; overflow-y: auto; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; background: #fafafa"
        >
          <div
            v-for="(client, index) in previewData.sample"
            :key="index"
            style="padding: 4px 0"
          >
            • {{ client.company_name || client.companyName }}（{{ client.client_id || client.clientId }}）
          </div>
          <div v-if="previewData.match_count > previewData.sample.length" style="padding: 4px 0; color: #999">
            ... 還有 {{ previewData.match_count - previewData.sample.length }} 個客戶
          </div>
        </div>
        
        <a-alert
          v-else-if="previewData && previewData.match_count === 0"
          type="info"
          message="沒有符合條件的客戶"
          style="margin-top: 12px"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useClientStore } from '@/stores/clients'
import { usePageAlert } from '@/composables/usePageAlert'
import { fetchAllUsers } from '@/api/users'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  users: {
    type: Array,
    default: () => []
  },
  tags: {
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
const previewLoading = ref(false)
const users = ref([])

// 本地狀態
const localVisible = ref(props.visible)

// 表單數據
const formData = ref({
  fromAssigneeUserId: null,
  includeUnassigned: false,
  toAssigneeUserId: undefined,
  selectedTagIds: [],
  searchKeyword: ''
})

// 預覽數據
const previewData = ref(null)

// 表單驗證規則
const rules = {
  toAssigneeUserId: [
    { required: true, message: '請選擇新負責人', trigger: 'change' }
  ]
}

// 同步 props 變化
watch(() => props.visible, (val) => {
  localVisible.value = val
  if (val) {
    loadUsers()
    // 重置表單
    resetForm()
  }
})

// 同步 users props
watch(() => props.users, (val) => {
  if (val && val.length > 0) {
    users.value = val
  }
}, { immediate: true })

// 監聽本地狀態變化，同步到父組件
watch(localVisible, (val) => {
  emit('update:visible', val)
})

// 載入用戶列表
const loadUsers = async () => {
  // 如果 props 有傳入 users，優先使用
  if (props.users && props.users.length > 0) {
    users.value = props.users
    return
  }
  
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

// 重置表單
const resetForm = () => {
  formData.value = {
    fromAssigneeUserId: null,
    includeUnassigned: false,
    toAssigneeUserId: undefined,
    selectedTagIds: [],
    searchKeyword: ''
  }
  previewData.value = null
  formRef.value?.resetFields()
}

// 處理目前負責人變化
const handleFromAssigneeChange = (value) => {
  console.log('[QuickMigrate] 目前負責人已選擇:', value)
  formData.value.fromAssigneeUserId = value
}

// 處理新負責人變化
const handleToAssigneeChange = (value) => {
  console.log('[QuickMigrate] 新負責人已選擇:', value)
  formData.value.toAssigneeUserId = value
}

// 處理預覽
const handlePreview = async () => {
  // 驗證：至少需要選擇目前負責人或勾選包含未分配
  if (!formData.value.fromAssigneeUserId && !formData.value.includeUnassigned) {
    showWarning('請選擇目前負責人，或勾選「包含未分配客戶」')
    return
  }
  
  previewLoading.value = true
  try {
    // 構建預覽參數
    const params = {
      from_assignee_user_id: formData.value.fromAssigneeUserId || null,
      include_unassigned: formData.value.includeUnassigned,
      assignee_user_id: -1, // 預覽模式
      dry_run: true
    }
    
    // 添加標籤篩選（如果有）
    if (formData.value.selectedTagIds && formData.value.selectedTagIds.length > 0) {
      params.tag_ids = formData.value.selectedTagIds
    }
    
    // 添加關鍵字篩選（如果有）
    if (formData.value.searchKeyword && formData.value.searchKeyword.trim()) {
      params.q = formData.value.searchKeyword.trim()
    }
    
    // 調用 store 的預覽方法
    const response = await store.previewMigrateClients(params)
    
    // 設置預覽數據
    previewData.value = response.data || {
      match_count: 0,
      sample: []
    }
  } catch (err) {
    showError(err.message || '預覽失敗，請稍後再試')
    previewData.value = null
  } finally {
    previewLoading.value = false
  }
}

// 處理提交
const handleSubmit = async () => {
  try {
    console.log('[QuickMigrate] 提交表單，當前數據:', JSON.parse(JSON.stringify(formData.value)))
    
    // 驗證表單
    await formRef.value.validate()
    
    // 驗證：至少需要選擇目前負責人或勾選包含未分配
    if (!formData.value.fromAssigneeUserId && !formData.value.includeUnassigned) {
      showWarning('請選擇目前負責人，或勾選「包含未分配客戶」')
      return
    }
    
    // 驗證：新負責人不能和目前負責人相同
    if (formData.value.fromAssigneeUserId && formData.value.toAssigneeUserId === formData.value.fromAssigneeUserId) {
      showWarning('新負責人不能和目前負責人相同')
      return
    }
    
    // 直接執行移轉
    loading.value = true
    try {
      // 構建移轉參數（與預覽參數類似，但不包含 dry_run，assignee_user_id 為實際的新負責人ID）
      const params = {
        from_assignee_user_id: formData.value.fromAssigneeUserId || null,
        include_unassigned: formData.value.includeUnassigned,
        assignee_user_id: formData.value.toAssigneeUserId
      }
      
      // 添加標籤篩選（如果有）
      if (formData.value.selectedTagIds && formData.value.selectedTagIds.length > 0) {
        params.tag_ids = formData.value.selectedTagIds
      }
      
      // 添加關鍵字篩選（如果有）
      if (formData.value.searchKeyword && formData.value.searchKeyword.trim()) {
        params.q = formData.value.searchKeyword.trim()
      }
      
      // 調用 store 的移轉方法
      const response = await store.migrateClients(params)
      
      const updatedCount = response.data?.updated_count || 0
      
      showSuccess(`已完成移轉，更新 ${updatedCount} 筆`)
      
      // 觸發成功事件
      emit('success')
      
      // 關閉彈窗
      localVisible.value = false
      
      // 重置表單
      resetForm()
    } catch (err) {
      if (err.errorFields) {
        // 表單驗證錯誤
        return
      }
      // API 錯誤
      showError(err.message || '移轉失敗，請稍後再試')
    } finally {
      loading.value = false
    }
  } catch (err) {
    if (err.errorFields) {
      // 表單驗證錯誤
      return
    }
  }
}

// 處理取消
const handleCancel = () => {
  localVisible.value = false
  resetForm()
}
</script>


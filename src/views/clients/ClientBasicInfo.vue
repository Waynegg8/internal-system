<template>
  <a-card title="基本信息">
    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
      v-model:info="infoMessage"
    />
    <a-form :model="formState" layout="vertical" :rules="formRules" ref="formRef">
      <a-row :gutter="24">
        <!-- 統一編號（只讀，作為客戶唯一識別碼） -->
        <a-col :span="12">
          <a-form-item label="統一編號">
            <a-input
              :value="formatTaxRegistrationNumber(formState.taxId || formState.tax_registration_number)"
              disabled
              style="font-family: monospace"
            >
              <template #suffix>
                <span style="font-size: 12px; color: #9ca3af">🔒 不可修改</span>
              </template>
            </a-input>
            <template #help>
              <span style="color: #6b7280; font-size: 12px">個人客戶可不填寫統一編號</span>
            </template>
          </a-form-item>
        </a-col>

        <!-- 公司名稱 -->
        <a-col :span="12">
          <a-form-item label="公司名稱" name="companyName" :rules="[{ required: true, message: '請輸入公司名稱' }]">
            <a-input v-model:value="formState.companyName" placeholder="請輸入公司名稱" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="24">
        <!-- 聯絡人1 -->
        <a-col :span="12">
          <a-form-item label="公司聯絡人1" name="contactPerson1">
            <a-input v-model:value="formState.contactPerson1" placeholder="例如：張先生" allow-clear />
          </a-form-item>
        </a-col>

        <!-- 聯絡人2 -->
        <a-col :span="12">
          <a-form-item label="公司聯絡人2" name="contactPerson2">
            <a-input v-model:value="formState.contactPerson2" placeholder="例如：李小姐" allow-clear />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="24">
        <!-- 負責人員 -->
        <a-col :span="12">
          <a-form-item label="負責人員" name="assigneeUserId">
            <a-select
              v-model:value="formState.assigneeUserId"
              placeholder="請選擇負責人員"
              :loading="loadingUsers"
              allow-clear
            >
              <a-select-option
                v-for="user in allUsers"
                :key="getId(user, 'user_id', 'id')"
                :value="getId(user, 'user_id', 'id')"
              >
                {{ user.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>

        <!-- 聯絡電話 -->
        <a-col :span="12">
          <a-form-item label="聯絡電話" name="phone">
            <a-input v-model:value="formState.phone" type="tel" allow-clear />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="24">
        <!-- Email -->
        <a-col :span="12">
          <a-form-item label="Email" name="email">
            <a-input v-model:value="formState.email" type="email" allow-clear />
          </a-form-item>
        </a-col>

        <!-- 主要聯絡方式 -->
        <a-col :span="12">
          <a-form-item label="主要聯絡方式">
            <a-select
              v-model:value="formState.primaryContactMethod"
              placeholder="請選擇主要聯絡方式"
              allow-clear
            >
              <a-select-option value="line">LINE</a-select-option>
              <a-select-option value="phone">電話</a-select-option>
              <a-select-option value="email">Email</a-select-option>
              <a-select-option value="other">其他</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="24">
        <!-- LINE ID -->
        <a-col :span="12">
          <a-form-item label="LINE ID">
            <a-input v-model:value="formState.lineId" placeholder="請輸入 LINE ID" allow-clear />
          </a-form-item>
        </a-col>

        <!-- 標籤管理 -->
        <a-col :span="12">
          <a-form-item label="標籤管理">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 8px">
              <template v-if="selectedTags.length === 0">
                <span style="color: #9ca3af">尚未設定標籤</span>
              </template>
              <template v-else>
                <a-tag
                  v-for="tag in selectedTags"
                  :key="tag.tag_id"
                  :style="{
                    background: getTagColor(tag.tag_color),
                    borderColor: getTagColor(tag.tag_color),
                    color: 'white'
                  }"
                >
                  {{ tag.tag_name }}
                </a-tag>
              </template>
            </div>
            <a-button v-if="canManageTags" size="small" @click="showTagsModal = true">+ 管理標籤</a-button>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="24">
        <!-- 公司負責人 -->
        <a-col :span="12">
          <a-form-item label="公司負責人">
            <a-input v-model:value="formState.companyOwner" placeholder="請輸入公司負責人姓名" allow-clear />
          </a-form-item>
        </a-col>

        <!-- 公司地址 -->
        <a-col :span="12">
          <a-form-item label="公司地址">
            <a-input v-model:value="formState.companyAddress" placeholder="請輸入公司地址" allow-clear />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="24">
        <!-- 資本額 -->
        <a-col :span="12">
          <a-form-item label="資本額（新台幣元）">
            <a-input-number
              v-model:value="formState.capitalAmount"
              :min="0"
              :precision="0"
              placeholder="請輸入資本額"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 股東持股資訊 -->
      <a-row>
        <a-col :span="24">
          <a-form-item>
            <ShareholdersEditor v-model="formState.shareholders" />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 董監事資訊 -->
      <a-row>
        <a-col :span="24">
          <a-form-item>
            <DirectorsSupervisorsEditor v-model="formState.directorsSupervisors" />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 協作人員管理（僅管理員或客戶負責人可見） -->
      <a-row v-if="canManageCollaborators">
        <a-col :span="24">
          <a-form-item label="協作人員">
            <div style="margin-bottom: 8px">
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 8px">
                <template v-if="collaborators.length === 0">
                  <span style="color: #9ca3af">暫無協作人員</span>
                </template>
                <template v-else>
                  <a-tag
                    v-for="collaborator in collaborators"
                    :key="collaborator.collaboration_id"
                    closable
                    @close="handleRemoveCollaborator(collaborator.collaboration_id)"
                  >
                    {{ collaborator.user_name }}
                  </a-tag>
                </template>
              </div>
              <a-button size="small" @click="showCollaboratorModal = true">+ 添加協作人員</a-button>
            </div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 4px">
              💡 協作人員可以為此客戶填寫工時
            </div>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 客戶備註 -->
      <a-row>
        <a-col :span="24">
          <a-form-item label="客戶備註" name="clientNotes">
            <a-textarea v-model:value="formState.clientNotes" :rows="3" allow-clear />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 收款備註 -->
      <a-row>
        <a-col :span="24">
          <a-form-item label="收款備註" name="paymentNotes">
            <a-textarea v-model:value="formState.paymentNotes" :rows="3" allow-clear />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 表單操作按鈕 -->
      <a-form-item>
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" :loading="isSaving" @click="handleSave">儲存變更</a-button>
        </a-space>
      </a-form-item>
    </a-form>

    <!-- TagsModal 組件 -->
    <TagsModal
      v-model:selectedTagIds="formState.tagIds"
      v-model:visible="showTagsModal"
      :allow-create="isAdmin"
    />

    <!-- 添加協作人員 Modal -->
    <a-modal
      v-model:visible="showCollaboratorModal"
      title="添加協作人員"
      :width="500"
      :confirm-loading="loadingCollaborators"
      @ok="handleAddCollaborator"
      @cancel="handleCancelCollaboratorModal"
    >
      <a-form layout="vertical">
        <a-form-item label="選擇員工">
          <a-select
            v-model:value="selectedCollaboratorUserId"
            placeholder="請選擇要添加的員工"
            show-search
            :filter-option="filterUserOption"
            :loading="loadingUsers"
          >
            <a-select-option
              v-for="user in availableUsersForCollaboration"
              :key="getId(user, 'user_id', 'id')"
              :value="getId(user, 'user_id', 'id')"
            >
              {{ user.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { useClientStore } from '@/stores/clients'
import { updateClientTags, useClientApi } from '@/api/clients'
import { fetchAllUsers } from '@/api/users'
import { fetchAllTags } from '@/api/tags'
import { useAuthApi } from '@/api/auth'
import { extractApiArray, extractApiData, extractApiError } from '@/utils/apiHelpers'
import { getId, getField } from '@/utils/fieldHelper'
import PageAlerts from '@/components/shared/PageAlerts.vue'
import TagsModal from '@/components/shared/TagsModal.vue'
import ShareholdersEditor from '@/components/clients/ShareholdersEditor.vue'
import DirectorsSupervisorsEditor from '@/components/clients/DirectorsSupervisorsEditor.vue'

const route = useRoute()
const clientStore = useClientStore()

// 頁面提示
const { successMessage, errorMessage, infoMessage, showSuccess, showError, showInfo } = usePageAlert()

// 從 store 獲取響應式狀態
const { currentClient } = storeToRefs(clientStore)

// 表單引用
const formRef = ref(null)

// 表單狀態
const formState = reactive({
  clientId: '',
  companyName: '',
  taxId: '',
  contactPerson1: '',
  contactPerson2: '',
  assigneeUserId: null,
  phone: '',
  email: '',
  clientNotes: '',
  paymentNotes: '',
  tagIds: [],
  // 新增欄位
  companyOwner: '',
  companyAddress: '',
  capitalAmount: null,
  shareholders: null,
  directorsSupervisors: null,
  primaryContactMethod: '',
  lineId: ''
})

// 表單驗證規則
const formRules = {
  companyName: [{ required: true, message: '請輸入公司名稱', trigger: 'blur' }]
}

// 用戶列表
const allUsers = ref([])
const loadingUsers = ref(false)

// 標籤相關
const showTagsModal = ref(false)
const allTags = ref([]) // 所有標籤列表，用於顯示標籤詳情

// 協作人員相關
const showCollaboratorModal = ref(false)
const collaborators = ref([])
const selectedCollaboratorUserId = ref(null)
const loadingCollaborators = ref(false)
const clientApi = useClientApi()

// 當前用戶信息
const currentUser = ref(null)
const isAdmin = ref(false)

// 檢查是否可以管理協作人員（管理員或客戶負責人）
const canManageCollaborators = computed(() => {
  if (isAdmin.value) return true
  if (!currentUser.value || !currentClient.value) return false
  const userId = getId(currentUser.value, 'user_id', 'id', 'userId')
  const assigneeId = getId(currentClient.value, 'assignee_user_id', 'assigneeUserId', 'assignee_id')
  return userId && assigneeId && String(userId) === String(assigneeId)
})

// 檢查是否可以管理標籤（與協作人員相同規則：管理員或客戶負責人）
const canManageTags = computed(() => {
  if (isAdmin.value) return true
  if (!currentUser.value || !currentClient.value) return false
  const userId = getId(currentUser.value, 'user_id', 'id', 'userId')
  const assigneeId = getId(currentClient.value, 'assignee_user_id', 'assigneeUserId', 'assignee_id')
  return userId && assigneeId && String(userId) === String(assigneeId)
})

// 保存狀態
const isSaving = ref(false)

// 顏色映射
const colorMap = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6'
}

// 獲取標籤顏色
const getTagColor = (color) => {
  if (!color) return colorMap.blue
  return colorMap[color] || color
}

// 格式化統一編號顯示（企業客戶去掉前綴00顯示8碼，個人客戶顯示10碼）
const formatTaxRegistrationNumber = (taxId) => {
  if (!taxId) return ''
  const taxIdStr = String(taxId)
  // 如果是10碼且以00開頭，則為企業客戶，去掉前綴00顯示8碼
  if (taxIdStr.length === 10 && taxIdStr.startsWith('00')) {
    return taxIdStr.substring(2)
  }
  // 否則顯示完整10碼（個人客戶或已經是8碼的企業客戶）
  return taxIdStr
}

// 已選標籤（從 formState.tagIds 計算）
const selectedTags = computed(() => {
  const tagIds = formState.tagIds || []
  if (tagIds.length === 0) return []

  // 優先從 allTags 中獲取（包含所有可選標籤）
  // 如果 allTags 還沒有加載，則從 currentClient.tags 中獲取
  const tagsSource = allTags.value.length > 0 ? allTags.value : (currentClient.value?.tags || [])
  
  return tagsSource.filter((tag) => {
    const tagId = getId(tag, 'tag_id', 'id')
    return tagId && tagIds.includes(tagId)
  })
})

// 加載用戶列表
const loadAllUsers = async () => {
  loadingUsers.value = true
  try {
    const response = await fetchAllUsers()
    // 處理響應格式
    allUsers.value = extractApiArray(response, [])
  } catch (error) {
    console.error('載入用戶列表失敗:', error)
    showError('載入用戶列表失敗')
    allUsers.value = []
  } finally {
    loadingUsers.value = false
  }
}

// 加載所有標籤
const loadAllTags = async () => {
  try {
    const response = await fetchAllTags()
    // 處理響應格式
    allTags.value = extractApiArray(response, [])
  } catch (error) {
    console.error('載入標籤列表失敗:', error)
    // 不顯示錯誤訊息，因為 TagsModal 會自己處理
    allTags.value = []
  }
}

// 載入協作人員列表
const loadCollaborators = async () => {
  const clientId = route.params.id
  if (!clientId) return

  loadingCollaborators.value = true
  try {
    const response = await clientApi.getCollaborators(clientId)
    console.log('協作人員 API 響應:', response)
    
    // 後端返回格式：{ ok: true, data: [...] }
    const data = extractApiData(response, null)
    console.log('提取的數據:', data)
    
    if (Array.isArray(data)) {
      collaborators.value = data
    } else if (data && Array.isArray(data.items)) {
      collaborators.value = data.items
    } else {
      collaborators.value = extractApiArray(response, [])
    }
    
    console.log('協作人員列表:', collaborators.value)
  } catch (error) {
    console.error('載入協作人員失敗:', error)
    // 如果是 403 錯誤（無權限），不顯示錯誤訊息
    if (error.status !== 403 && error.status !== 404) {
      showError('載入協作人員失敗: ' + (error.message || '未知錯誤'))
    }
    collaborators.value = []
  } finally {
    loadingCollaborators.value = false
  }
}

// 可用的協作人員選項（排除負責人和已添加的協作人員）
const availableUsersForCollaboration = computed(() => {
  const assigneeId = formState.assigneeUserId
  const collaboratorIds = new Set(collaborators.value.map(c => c.user_id))
  
  const available = allUsers.value.filter(user => {
    const userId = getId(user, 'user_id', 'id')
    return userId && userId !== assigneeId && !collaboratorIds.has(userId)
  })
  
  console.log('可用協作人員選項:', {
    totalUsers: allUsers.value.length,
    assigneeId,
    collaboratorIds: Array.from(collaboratorIds),
    available: available.length,
    availableUsers: available.map(u => ({ id: getId(u, 'user_id', 'id'), name: u.name }))
  })
  
  return available
})

// 過濾用戶選項
const filterUserOption = (input, option) => {
  const userName = option.children?.[0]?.children || option.children || ''
  return String(userName).toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 添加協作人員
const handleAddCollaborator = async () => {
  console.log('handleAddCollaborator 被調用', { selectedUserId: selectedCollaboratorUserId.value })
  
  if (!selectedCollaboratorUserId.value) {
    showError('請選擇要添加的員工')
    return // 不關閉 Modal
  }

  const clientId = route.params.id
  console.log('準備添加協作人員', { clientId, userId: selectedCollaboratorUserId.value })
  
  loadingCollaborators.value = true
  try {
    const response = await clientApi.addCollaborator(clientId, selectedCollaboratorUserId.value)
    console.log('添加協作人員響應:', response)
    
    if (response.ok) {
      showSuccess('已添加協作人員')
      selectedCollaboratorUserId.value = null
      // 重新載入協作人員列表
      await loadCollaborators()
      // 手動關閉 Modal
      showCollaboratorModal.value = false
    } else {
      const status = response.status || response.code
      if (status === 403 || response.code === 'FORBIDDEN') {
        showError('無權限管理協作人員')
        // 權限不足時直接關閉 Modal，避免誤操作
        showCollaboratorModal.value = false
      } else {
        const errorMsg = response.message || extractApiError(response, '添加失敗')
        console.error('添加失敗:', errorMsg)
        showError(errorMsg)
      }
      console.error('添加失敗:', errorMsg)
      // 不關閉 Modal，讓用戶可以重試
    }
  } catch (error) {
    console.error('添加協作人員失敗:', error)
    const status = error.status || error.response?.status
    if (status === 403) {
      showError('無權限管理協作人員')
      showCollaboratorModal.value = false
    } else {
      const errorMsg = error.message || error.response?.data?.message || '添加失敗'
      showError(errorMsg)
    }
    // 不關閉 Modal，讓用戶可以重試
  } finally {
    loadingCollaborators.value = false
  }
}

// 取消添加協作人員 Modal
const handleCancelCollaboratorModal = () => {
  showCollaboratorModal.value = false
  selectedCollaboratorUserId.value = null
}

// 移除協作人員
const handleRemoveCollaborator = async (collaborationId) => {
  const clientId = route.params.id
  loadingCollaborators.value = true
  try {
    const response = await clientApi.removeCollaborator(clientId, collaborationId)
    console.log('移除協作人員響應:', response)
    
    if (response.ok) {
      showSuccess('已移除協作人員')
      // 重新載入協作人員列表
      await loadCollaborators()
    } else {
      const status = response.status || response.code
      if (status === 403 || response.code === 'FORBIDDEN') {
        showError('無權限移除此協作人員')
      } else {
        const errorMsg = response.message || extractApiError(response, '移除失敗')
        showError(errorMsg)
      }
    }
  } catch (error) {
    console.error('移除協作人員失敗:', error)
    const status = error.status || error.response?.status
    if (status === 403) {
      showError('無權限移除此協作人員')
    } else {
      const errorMsg = error.message || error.response?.data?.message || '移除失敗'
      showError(errorMsg)
    }
  } finally {
    loadingCollaborators.value = false
  }
}

// 從 currentClient 初始化表單
const initFormState = () => {
  if (!currentClient.value) return

  const client = currentClient.value

  // 深拷貝客戶數據到表單狀態（兼容多種字段命名格式）
  formState.clientId = getId(client, 'clientId', 'client_id', 'id') || route.params.id
  formState.companyName = getField(client, 'companyName', 'company_name', '')
  formState.taxId = getField(client, 'taxId', 'tax_registration_number', '') || getField(client, 'tax_id', null, '')
  formState.contactPerson1 = getField(client, 'contactPerson1', 'contact_person_1', '')
  formState.contactPerson2 = getField(client, 'contactPerson2', 'contact_person_2', '')
  formState.assigneeUserId = getId(client, 'assigneeUserId', 'assignee_user_id', null) || getId(client, 'assignee_id', null, null)
  formState.phone = getField(client, 'phone', null, '')
  formState.email = getField(client, 'email', null, '')
  formState.clientNotes = getField(client, 'clientNotes', 'client_notes', '')
  formState.paymentNotes = getField(client, 'paymentNotes', 'payment_notes', '')
  // 新增欄位
  formState.companyOwner = getField(client, 'companyOwner', 'company_owner', '')
  formState.companyAddress = getField(client, 'companyAddress', 'company_address', '')
  const capitalAmount = getField(client, 'capitalAmount', 'capital_amount', null)
  formState.capitalAmount = capitalAmount !== null && capitalAmount !== undefined ? Number(capitalAmount) : null
  formState.primaryContactMethod = getField(client, 'primaryContactMethod', 'primary_contact_method', '')
  formState.lineId = getField(client, 'lineId', 'line_id', '')
  
  // 處理 JSON 欄位
  const shareholders = getField(client, 'shareholders', null, null)
  if (shareholders) {
    // 如果已經是數組，直接使用；如果是字符串，嘗試解析
    if (Array.isArray(shareholders)) {
      formState.shareholders = shareholders
    } else if (typeof shareholders === 'string') {
      try {
        formState.shareholders = JSON.parse(shareholders)
      } catch (e) {
        formState.shareholders = null
      }
    } else {
      formState.shareholders = null
    }
  } else {
    formState.shareholders = null
  }
  
  const directorsSupervisors = getField(client, 'directorsSupervisors', 'directors_supervisors', null)
  if (directorsSupervisors) {
    // 如果已經是數組，直接使用；如果是字符串，嘗試解析
    if (Array.isArray(directorsSupervisors)) {
      formState.directorsSupervisors = directorsSupervisors
    } else if (typeof directorsSupervisors === 'string') {
      try {
        formState.directorsSupervisors = JSON.parse(directorsSupervisors)
      } catch (e) {
        formState.directorsSupervisors = null
      }
    } else {
      formState.directorsSupervisors = null
    }
  } else {
    formState.directorsSupervisors = null
  }

  // 處理標籤 IDs
  if (client.tags && Array.isArray(client.tags)) {
    formState.tagIds = client.tags.map((tag) => getId(tag, 'tag_id', 'id')).filter(Boolean)
  } else {
    formState.tagIds = []
  }
}

// 監聽 currentClient 變化，初始化表單
watch(
  () => currentClient.value,
  (newClient) => {
    if (newClient) {
      initFormState()
    }
  },
  { immediate: true, deep: true }
)

// 監聽路由參數變化，當客戶 ID 變化時重置表單
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      // 客戶 ID 變化時，等待 currentClient 更新後再初始化表單
      // initFormState 會在上面的 watch 中自動執行
      loadCollaborators() // 重新載入協作人員
    }
  }
)

// 保存表單
const handleSave = async () => {
  try {
    // 表單驗證
    await formRef.value.validate()

    // 統一編號為唯讀，不允許在此處修改或校驗（避免覆蓋原值）

    isSaving.value = true
    const clientId = route.params.id

    // 準備更新數據（轉換為 API 期望的 snake_case 格式）
    const { tagIds, ...formData } = formState
    
    // 輔助函數：確保字串字段不是 undefined
    const ensureString = (value) => {
      const trimmed = (value || '').trim()
      return trimmed || null
    }
    
    const updateData = {
      company_name: (formData.companyName || '').trim() || '',
      contact_person_1: ensureString(formData.contactPerson1),
      contact_person_2: ensureString(formData.contactPerson2),
      assignee_user_id: formData.assigneeUserId || null,
      phone: ensureString(formData.phone),
      email: ensureString(formData.email),
      client_notes: ensureString(formData.clientNotes),
      payment_notes: ensureString(formData.paymentNotes),
      company_owner: ensureString(formData.companyOwner),
      company_address: ensureString(formData.companyAddress),
      capital_amount: formData.capitalAmount !== null && formData.capitalAmount !== undefined ? Number(formData.capitalAmount) : null,
      shareholders: formData.shareholders || null,
      directors_supervisors: formData.directorsSupervisors || null,
      primary_contact_method: ensureString(formData.primaryContactMethod),
      line_id: ensureString(formData.lineId)
    }

    // 更新客戶基本信息
    await clientStore.updateClient(clientId, updateData)

    // 更新客戶標籤
    await updateClientTags(clientId, tagIds || [])

    // 刷新客戶詳情和標籤列表
    await Promise.all([
      clientStore.fetchClientDetail(clientId),
      loadAllTags() // 重新加載標籤列表，以獲取最新創建的標籤
    ])

    showSuccess('儲存成功')
  } catch (error) {
    console.error('儲存失敗:', error)
    if (error.errorFields) {
      // 表單驗證錯誤
      showError('請檢查表單輸入')
    } else {
      showError(error.message || '儲存失敗，請稍後再試')
    }
  } finally {
    isSaving.value = false
  }
}

// 取消編輯
const handleCancel = () => {
  // 從 currentClient 重新初始化表單
  initFormState()
  showInfo('已取消編輯')
}

// 載入當前用戶信息
const loadCurrentUser = async () => {
  try {
    const response = await useAuthApi().checkSession()
    if (response && response.ok && response.data) {
      currentUser.value = response.data
      isAdmin.value = response.data.isAdmin || response.data.is_admin || false
    }
  } catch (error) {
    console.error('獲取當前用戶失敗:', error)
  }
}

// 組件掛載時加載用戶列表和標籤列表
onMounted(async () => {
  await loadCurrentUser()
  loadAllUsers()
  loadAllTags()
  if (canManageCollaborators.value) {
    loadCollaborators()
  }
})

// 監聽 canManageCollaborators 變化，如果變為 true 則載入協作人員
watch(canManageCollaborators, (canManage) => {
  if (canManage) {
    loadCollaborators()
  }
})
</script>

<style scoped>
/* 可以添加自定義樣式 */
</style>


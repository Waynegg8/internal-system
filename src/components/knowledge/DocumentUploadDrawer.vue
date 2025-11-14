<template>
  <a-drawer
    v-model:open="drawerVisible"
    title="上傳文檔"
    :width="800"
    @close="handleClose"
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
    
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
      @finish="handleSubmit"
    >
      <!-- 文檔標題 -->
      <a-form-item label="文檔標題" name="title">
        <a-input
          v-model:value="formData.title"
          placeholder="請輸入文檔標題"
          :maxlength="200"
          show-count
        />
      </a-form-item>

      <!-- 服務類型分類 -->
      <a-form-item label="服務類型分類" name="category">
        <a-select
          v-model:value="formData.category"
          placeholder="請選擇服務類型"
          :filter-option="filterOption"
          style="width: 100%"
        >
          <a-select-option
            v-for="service in services"
            :key="getServiceId(service)"
            :value="getServiceId(service)"
          >
            {{ getServiceName(service) }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- 資源適用層級 -->
      <a-form-item label="資源適用層級" name="scope">
        <a-select
          v-model:value="formData.scope"
          placeholder="請選擇適用層級"
          style="width: 100%"
        >
          <a-select-option value="service">服務層級</a-select-option>
          <a-select-option value="task">任務層級</a-select-option>
        </a-select>
      </a-form-item>

      <!-- 客戶 -->
      <a-form-item label="客戶" name="client_id">
        <a-select
          v-model:value="formData.client_id"
          placeholder="請選擇客戶（可選）"
          allow-clear
          show-search
          :filter-option="filterOption"
          style="width: 100%"
        >
          <a-select-option
            v-for="client in clients"
            :key="getClientId(client)"
            :value="getClientId(client)"
          >
            {{ getClientName(client) }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- 年月 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="年份" name="year">
            <a-select
              v-model:value="formData.year"
              placeholder="請選擇年份（可選）"
              allow-clear
              style="width: 100%"
            >
              <a-select-option
                v-for="year in yearOptions"
                :key="year"
                :value="year"
              >
                {{ year }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="月份" name="month">
            <a-select
              v-model:value="formData.month"
              placeholder="請選擇月份（可選）"
              allow-clear
              style="width: 100%"
            >
              <a-select-option
                v-for="month in monthOptions"
                :key="month.value"
                :value="month.value"
              >
                {{ month.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 標籤 -->
      <a-form-item label="標籤" name="tags">
        <a-checkbox-group v-model:value="formData.tags" style="width: 100%">
          <a-row>
            <a-col
              v-for="tag in tags"
              :key="tag"
              :span="8"
              style="margin-bottom: 8px"
            >
              <a-checkbox :value="tag">{{ tag }}</a-checkbox>
            </a-col>
          </a-row>
        </a-checkbox-group>
        <div v-if="tags.length === 0" style="color: #999; margin-top: 8px">
          暫無標籤，請先在「管理標籤」中新增標籤
        </div>
      </a-form-item>

      <!-- 選擇文件 -->
      <a-form-item label="選擇文件" name="file">
        <a-upload
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :custom-request="handleCustomRequest"
          :remove="handleRemove"
          :max-count="1"
          :accept="acceptedFileTypes"
          :multiple="false"
          :show-upload-list="false"
          drag
          @drop="handleDrop"
          @dragover="handleDragOver"
        >
          <div class="upload-trigger">
            <div class="upload-icon-wrapper">
              <InboxOutlined class="upload-icon" />
            </div>
            <div class="upload-text">
              <div class="upload-title">點擊或拖拽文件到此區域上傳</div>
              <div class="upload-hint">支持 PDF、Word、Excel、PowerPoint、圖片等格式，最大 25MB</div>
            </div>
            <a-button type="primary" size="small" :disabled="loading">選擇文件</a-button>
          </div>
          <div v-if="fileList.length > 0" class="upload-file-name">
            <FileOutlined style="margin-right: 6px" />
            <span>{{ fileList[0].name }}</span>
          </div>
        </a-upload>
      </a-form-item>

      <!-- 上傳進度條 -->
      <a-form-item v-if="uploadProgress > 0 && uploadProgress < 100">
        <a-progress :percent="uploadProgress" status="active" />
      </a-form-item>

      <!-- 表單操作按鈕 -->
      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="loading" :disabled="uploadProgress > 0 && uploadProgress < 100">
            上傳
          </a-button>
          <a-button @click="handleClose">取消</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { InboxOutlined, FileOutlined } from '@ant-design/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'

// Page Alert
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close', 'success', 'update:visible'])

// Store
const knowledgeStore = useKnowledgeStore()
const { services, clients, tags, documentLoading } = storeToRefs(knowledgeStore)

// Form ref
const formRef = ref(null)

// Loading state
const loading = computed(() => documentLoading.value)

// Drawer visibility
const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
  }
})

// File list
const fileList = ref([])

// Upload progress
const uploadProgress = ref(0)

// Accepted file types
const acceptedFileTypes = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp'

// Year options
const currentYear = new Date().getFullYear()
const yearOptions = []
for (let i = currentYear - 5; i <= currentYear + 5; i++) {
  yearOptions.push(i)
}

// Month options
const monthOptions = [
  { value: '01', label: '1月' },
  { value: '02', label: '2月' },
  { value: '03', label: '3月' },
  { value: '04', label: '4月' },
  { value: '05', label: '5月' },
  { value: '06', label: '6月' },
  { value: '07', label: '7月' },
  { value: '08', label: '8月' },
  { value: '09', label: '9月' },
  { value: '10', label: '10月' },
  { value: '11', label: '11月' },
  { value: '12', label: '12月' }
]

// Form data
const formData = ref({
  title: '',
  category: undefined,
  scope: undefined,
  client_id: undefined,
  year: undefined,
  month: undefined,
  tags: []
})

// Form rules
const formRules = {
  title: [
    { required: true, message: '請輸入文檔標題', trigger: 'blur' },
    { max: 200, message: '標題長度不能超過 200 個字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '請選擇服務類型', trigger: 'change' }
  ],
  scope: [
    { required: true, message: '請選擇適用層級', trigger: 'change' }
  ],
  file: [
    { 
      required: true, 
      message: '請選擇文件', 
      trigger: 'change',
      validator: (rule, value) => {
        if (fileList.value && fileList.value.length > 0) {
          return Promise.resolve()
        }
        return Promise.reject(new Error('請選擇文件'))
      }
    }
  ]
}

// 獲取服務 ID
const getServiceId = (service) => {
  return service.id || service.serviceId || service.service_id || service
}

// 獲取服務名稱
const getServiceName = (service) => {
  if (typeof service === 'string') return service
  return service.name || service.serviceName || service.service_name || service.title || service.service_title || String(service)
}

// 獲取客戶 ID
const getClientId = (client) => {
  return client.id || client.clientId || client.client_id
}

// 獲取客戶名稱
const getClientName = (client) => {
  return client.name || client.clientName || client.client_name || client.companyName || client.company_name || String(client)
}

// 下拉選項過濾函數
const filterOption = (input, option) => {
  const children = option.children || option.label || ''
  return children.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 文件上傳前驗證
const beforeUpload = (file) => {
  // 文件大小限制（25MB）
  const maxSize = 25 * 1024 * 1024
  if (file.size > maxSize) {
    showError('文件大小不能超過 25MB')
    return false
  }

  // 文件類型驗證
  const fileName = file.name.toLowerCase()
  const validExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.bmp']
  const isValid = validExtensions.some(ext => fileName.endsWith(ext))
  
  if (!isValid) {
    showError('不支持的文件類型，請上傳 PDF、Word、Excel、PowerPoint 或圖片文件')
    return false
  }

  // 返回 true 允許文件添加到列表，但使用 customRequest 控制上傳
  // 文件添加後觸發表單驗證
  setTimeout(() => {
    if (formRef.value) {
      formRef.value.validateFields(['file']).catch(() => {
        // 忽略驗證錯誤，因為文件已經添加
      })
    }
  }, 100)
  
  return true
}

// 自定義上傳請求（阻止自動上傳）
const handleCustomRequest = (options) => {
  // 不執行任何操作，文件已經添加到 fileList
  // 實際的上傳將在表單提交時進行
  const { onSuccess } = options
  if (onSuccess) {
    onSuccess('ok')
  }
}

// 處理拖拽放下
const handleDrop = (e) => {
  e.preventDefault()
  e.stopPropagation()
}

// 處理拖拽懸停
const handleDragOver = (e) => {
  e.preventDefault()
  e.stopPropagation()
}

// 移除文件
const handleRemove = () => {
  fileList.value = []
  // 觸發表單驗證
  setTimeout(() => {
    if (formRef.value) {
      formRef.value.validateFields(['file']).catch(() => {
        // 忽略驗證錯誤
      })
    }
  }, 100)
  return true
}

// 初始化表單數據
const initFormData = () => {
  formData.value = {
    title: '',
    category: undefined,
    scope: undefined,
    client_id: undefined,
    year: undefined,
    month: undefined,
    tags: []
  }
  fileList.value = []
  uploadProgress.value = 0
}

// 重置表單
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  initFormData()
}

// 提交表單
const handleSubmit = async () => {
  try {
    // 驗證表單
    await formRef.value.validate()

    // 檢查文件
    if (fileList.value.length === 0) {
      showError('請選擇文件')
      return
    }

    // 獲取文件對象（兼容 Ant Design Vue 4.x）
    const fileItem = fileList.value[0]
    if (!fileItem) {
      showError('請選擇文件')
      return
    }
    
    // Ant Design Vue 4.x 中，文件對象可能在多個位置
    let file = null
    if (fileItem.originFileObj) {
      file = fileItem.originFileObj
    } else if (fileItem.originFile) {
      file = fileItem.originFile
    } else if (fileItem.file) {
      file = fileItem.file
    } else if (fileItem instanceof File) {
      file = fileItem
    } else if (fileItem.response && fileItem.response.file) {
      file = fileItem.response.file
    }
    
    if (!file || !(file instanceof File)) {
      console.error('文件對象結構:', fileItem)
      showError('無法獲取文件對象，請重新選擇文件')
      return
    }

    // 構建 FormData
    const formDataToSend = new FormData()
    formDataToSend.append('file', file)
    formDataToSend.append('title', formData.value.title.trim())
    formDataToSend.append('category', formData.value.category || '')
    formDataToSend.append('scope', formData.value.scope)

    // 可選字段
    if (formData.value.client_id) {
      formDataToSend.append('client_id', formData.value.client_id)
    }

    if (formData.value.year) {
      formDataToSend.append('doc_year', formData.value.year)
    }

    if (formData.value.month) {
      formDataToSend.append('doc_month', formData.value.month)
    }

    if (formData.value.tags && formData.value.tags.length > 0) {
      const tagsStr = Array.isArray(formData.value.tags) 
        ? formData.value.tags.join(',') 
        : formData.value.tags
      formDataToSend.append('tags', tagsStr)
    }

    // 調試：檢查 FormData 內容
    console.log('準備上傳文件:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      title: formData.value.title,
      category: formData.value.category,
      scope: formData.value.scope
    })

    // 上傳進度回調
    const onProgress = (percent) => {
      uploadProgress.value = percent
      console.log('上傳進度:', percent + '%')
    }

    // 設置 loading 狀態
    uploadProgress.value = 1

    // 上傳
    try {
    const response = await knowledgeStore.uploadDocument(formDataToSend, onProgress)
      uploadProgress.value = 100
    showSuccess('文檔上傳成功')
    
    // 觸發成功事件
    emit('success')
    handleClose()
    } catch (uploadError) {
      console.error('上傳文檔 Store 錯誤:', uploadError)
      throw uploadError
    }
  } catch (error) {
    uploadProgress.value = 0
    if (error.errorFields) {
      showError('請檢查表單輸入')
    } else {
      console.error('上傳文檔失敗:', error)
      const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || '上傳文檔失敗'
      showError(errorMessage)
    }
  }
}

// 關閉抽屜
const handleClose = () => {
  resetForm()
  emit('close')
}

// 監聽 visible 變化，初始化表單
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      initFormData()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
/* 優化拖拽上傳區域樣式 */
:deep(.ant-upload-drag) {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background-color: #fafafa;
  transition: all 0.3s ease;
}

:deep(.ant-upload-drag:hover) {
  border-color: #1890ff;
  background-color: #f0f7ff;
}

:deep(.ant-upload-drag.ant-upload-drag-hover) {
  border-color: #1890ff;
  background-color: #e6f7ff;
}

:deep(.ant-upload-drag-icon) {
  display: none;
}

:deep(.ant-upload-text) {
  display: none;
}

:deep(.ant-upload-hint) {
  display: none;
}

.upload-trigger {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px dashed #c5c5c5;
  border-radius: 8px;
  background-color: #fafafa;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.upload-trigger:hover {
  border-color: #1890ff;
  background-color: #f0f7ff;
}

.upload-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: #e6f4ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  font-size: 28px;
  color: #1890ff;
}

.upload-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.upload-title {
  font-weight: 500;
  color: #1f2937;
}

.upload-hint {
  font-size: 12px;
  color: #707070;
}

.upload-file-name {
  margin-top: 12px;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #1f2937;
  word-break: break-all;
}
</style>


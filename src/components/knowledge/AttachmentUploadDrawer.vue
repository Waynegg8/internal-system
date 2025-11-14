<template>
  <a-drawer
    v-model:open="drawerVisible"
    title="上傳附件"
    :width="600"
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
      <!-- 提示信息 -->
      <a-alert
        type="info"
        message="提示"
        description="附件會自動關聯到相關的任務、客戶或收據。如果沒有關聯，將作為獨立附件保存。"
        show-icon
        style="margin-bottom: 24px"
      />

      <!-- 文件 -->
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

      <!-- 標題 -->
      <a-form-item label="標題" name="title">
        <a-input
          v-model:value="formData.title"
          placeholder="留空則使用檔名（可選）"
          :maxlength="200"
          show-count
        />
      </a-form-item>

      <!-- 描述 -->
      <a-form-item label="描述" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="請輸入附件描述（可選）"
          :rows="4"
          :maxlength="500"
          show-count
        />
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
const { attachmentLoading } = storeToRefs(knowledgeStore)

// Form ref
const formRef = ref(null)

// Loading state
const loading = computed(() => attachmentLoading.value)

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

// Form data
const formData = ref({
  title: '',
  description: ''
})

// Form rules
const formRules = {
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

// Accepted file types
const acceptedFileTypes = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*'

// 文件上傳前驗證
const beforeUpload = (file) => {
  // 文件大小限制（25MB）
  const maxSize = 25 * 1024 * 1024
  if (file.size > maxSize) {
    showError('文件大小不能超過 25MB')
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
    description: ''
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
    
    // 如果標題為空，使用檔名
    const title = formData.value.title.trim() || file.name
    formDataToSend.append('title', title)

    if (formData.value.description) {
      formDataToSend.append('description', formData.value.description.trim())
    }

    // 調試：檢查 FormData 內容
    console.log('準備上傳附件:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      title: title
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
    const response = await knowledgeStore.uploadAttachment(formDataToSend, onProgress)
      uploadProgress.value = 100
    showSuccess('附件上傳成功')
    
    // 觸發成功事件
    emit('success')
    handleClose()
    } catch (uploadError) {
      console.error('上傳附件 Store 錯誤:', uploadError)
      throw uploadError
    }
  } catch (error) {
    uploadProgress.value = 0
    if (error.errorFields) {
      showError('請檢查表單輸入')
    } else {
      console.error('上傳附件失敗:', error)
      const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || '上傳附件失敗'
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
  color: #1890ff;
  font-size: 48px;
  margin-bottom: 16px;
}

:deep(.ant-upload-text) {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

:deep(.ant-upload-hint) {
  font-size: 14px;
  color: #999;
}

/* 新增的上傳觸發區域樣式 */
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


<template>
  <a-drawer
    v-model:open="drawerVisible"
    :title="title"
    :width="width"
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
        v-if="showInfoAlert"
        type="info"
        message="提示"
        :description="computedInfoDescription"
        show-icon
        style="margin-bottom: 24px"
      />

      <!-- 文件上傳 -->
      <a-form-item label="選擇文件" name="file">
        <a-upload
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :custom-request="handleCustomRequest"
          :remove="handleRemove"
          :max-count="maxCount"
          :accept="acceptedFileTypes"
          :multiple="multiple"
          :show-upload-list="showUploadList"
          :drag="drag"
          @drop="handleDrop"
          @dragover="handleDragOver"
        >
          <div class="upload-trigger">
            <div class="upload-icon-wrapper">
              <InboxOutlined class="upload-icon" />
            </div>
            <div class="upload-text">
              <div class="upload-title">{{ uploadTitle }}</div>
              <div class="upload-hint">{{ uploadHint }}</div>
            </div>
            <a-button type="primary" size="small" :disabled="loading || isUploading">選擇文件</a-button>
          </div>
        </a-upload>
      </a-form-item>

      <!-- 文件列表與進度 -->
      <a-form-item v-if="fileList.length > 0">
        <div class="file-list">
          <div
            v-for="(fileItem, index) in fileList"
            :key="fileItem.uid || index"
            class="file-item"
          >
            <div class="file-info">
              <FileOutlined style="margin-right: 8px; color: #1890ff" />
              <span class="file-name">{{ getFileName(fileItem) }}</span>
              <span class="file-size">({{ formatFileSize(getFileSize(fileItem)) }})</span>
            </div>
            <div class="file-actions">
              <!-- 進度條 -->
              <div v-if="uploadProgressMap[fileItem.uid]" class="file-progress">
                <a-progress
                  :percent="uploadProgressMap[fileItem.uid]"
                  :status="getProgressStatus(fileItem.uid)"
                  :stroke-width="6"
                  size="small"
                />
              </div>
              <!-- 取消按鈕 -->
              <a-button
                v-if="uploadProgressMap[fileItem.uid] && uploadProgressMap[fileItem.uid] < 100 && uploadProgressMap[fileItem.uid] > 0"
                type="link"
                size="small"
                danger
                @click="handleCancelUpload(fileItem.uid)"
                :disabled="loading"
              >
                取消
              </a-button>
              <!-- 移除按鈕 -->
              <a-button
                v-if="!uploadProgressMap[fileItem.uid] || uploadProgressMap[fileItem.uid] === 100 || uploadProgressMap[fileItem.uid] === 0"
                type="link"
                size="small"
                danger
                @click="handleRemoveFile(fileItem.uid)"
                :disabled="loading || isUploading"
              >
                移除
              </a-button>
            </div>
          </div>
        </div>
      </a-form-item>

      <!-- 表單操作按鈕 -->
      <a-form-item>
        <a-space>
          <a-button
            type="primary"
            html-type="submit"
            :loading="loading"
            :disabled="isUploading || fileList.length === 0"
          >
            上傳 ({{ fileList.length }})
          </a-button>
          <a-button @click="handleClose" :disabled="isUploading">取消</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { InboxOutlined, FileOutlined } from '@ant-design/icons-vue'
import { uploadAttachment } from '@/api/attachments'
import { 
  validateFile, 
  validateFileSize, 
  validateFileType,
  getAcceptFileTypes,
  getAcceptMimeTypes,
  MAX_FILE_SIZE,
  ALLOWED_FILE_EXTENSIONS
} from '@/utils/fileValidation'

/**
 * 通用附件上傳組件
 * 支持多檔並行上傳、獨立進度條、取消上傳等功能
 * 
 * @component AttachmentUploadDrawer
 */

// Page Alert
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// Props
const props = defineProps({
  /**
   * 抽屜顯示狀態
   */
  visible: {
    type: Boolean,
    default: false
  },
  /**
   * 附件關聯的實體類型（'task' | 'client' | 'sop' | 'receipt'）
   * @required
   */
  entityType: {
    type: String,
    required: true,
    default: 'task',
    validator: (value) => value === 'task' // 附件系統專為任務服務
  },
  /**
   * 附件關聯的實體 ID
   * @required
   */
  entityId: {
    type: [String, Number],
    required: true
  },
  /**
   * 抽屜標題
   */
  title: {
    type: String,
    default: '上傳附件'
  },
  /**
   * 抽屜寬度
   */
  width: {
    type: [String, Number],
    default: 600
  },
  /**
   * 最大文件數量
   */
  maxCount: {
    type: Number,
    default: 5
  },
  /**
   * 是否支持多選
   */
  multiple: {
    type: Boolean,
    default: true
  },
  /**
   * 是否顯示上傳列表
   */
  showUploadList: {
    type: Boolean,
    default: true
  },
  /**
   * 是否支持拖拽上傳
   */
  drag: {
    type: Boolean,
    default: true
  },
  /**
   * 是否顯示提示信息
   */
  showInfoAlert: {
    type: Boolean,
    default: true
  },
  /**
   * 自定義提示信息描述
   */
  infoDescription: {
    type: String,
    default: ''
  },
  /**
   * 自定義上傳標題
   */
  uploadTitle: {
    type: String,
    default: '點擊或拖拽文件到此區域上傳'
  },
  /**
   * 自定義上傳提示
   */
  uploadHint: {
    type: String,
    default: '支持 PDF、Word、Excel、PowerPoint、圖片等格式，最大 25MB，最多 5 個文件'
  }
})

// Emits
const emit = defineEmits(['close', 'success', 'update:visible', 'update:open'])

// Form ref
const formRef = ref(null)

// Loading state
const loading = ref(false)

// Drawer visibility - 支持 v-model:open 和 v-model:visible
const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
    emit('update:open', value) // 同時支持 open 和 visible
  }
})

// File list
const fileList = ref([])

// Upload progress map: fileUid -> progress percent
const uploadProgressMap = ref({})

// Abort controllers for canceling uploads
const abortControllersMap = ref({})

// Maximum concurrent uploads
const MAX_CONCURRENT_UPLOADS = 5

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

// Accepted file types - 使用文件驗證工具函數
const acceptedFileTypes = getAcceptFileTypes()

// Computed properties
const isUploading = computed(() => {
  return Object.values(uploadProgressMap.value).some(progress => progress > 0 && progress < 100)
})

// Computed info description
const computedInfoDescription = computed(() => {
  if (props.infoDescription) {
    return props.infoDescription
  }
  // 附件系統專為任務服務
  if (props.entityType === 'task' && props.entityId) {
    return `附件將關聯到任務 (ID: ${props.entityId})`
  }
  return '請選擇要上傳的附件文件'
})

// Helper functions - 附件系統專為任務服務
const getEntityTypeName = (type) => {
  // 附件系統專為任務服務，只返回任務
  return type === 'task' ? '任務' : type
}

const getFileName = (fileItem) => {
  return fileItem.name || fileItem.fileName || '未知文件'
}

const getFileSize = (fileItem) => {
  if (fileItem.originFileObj) {
    return fileItem.originFileObj.size
  } else if (fileItem.originFile) {
    return fileItem.originFile.size
  } else if (fileItem.file) {
    return fileItem.file.size
  } else if (fileItem instanceof File) {
    return fileItem.size
  }
  return fileItem.size || 0
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getProgressStatus = (uid) => {
  const progress = uploadProgressMap.value[uid]
  if (progress === 100) return 'success'
  if (progress === -1) return 'exception' // error
  return 'active'
}

// 獲取文件對象
const getFileObject = (fileItem) => {
  if (fileItem.originFileObj) {
    return fileItem.originFileObj
  } else if (fileItem.originFile) {
    return fileItem.originFile
  } else if (fileItem.file) {
    return fileItem.file
  } else if (fileItem instanceof File) {
    return fileItem
  }
  return null
}

// 文件上傳前驗證
const beforeUpload = (file, fileList) => {
  // 檢查文件數量限制
  if (fileList.length >= props.maxCount) {
    showError(`最多只能上傳 ${props.maxCount} 個文件`)
    return false
  }

  // 使用文件驗證工具函數進行綜合驗證
  const validation = validateFile(file, MAX_FILE_SIZE, ALLOWED_FILE_EXTENSIONS)
  
  if (!validation.valid) {
    showError(validation.error || '文件驗證失敗')
    return false
  }

  // 初始化進度
  const uid = file.uid || `${Date.now()}-${Math.random()}`
  uploadProgressMap.value[uid] = 0

  // 返回 true 允許文件添加到列表，但使用 customRequest 控制上傳
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

// 移除單個文件
const handleRemoveFile = (uid) => {
  const index = fileList.value.findIndex(item => item.uid === uid)
  if (index !== -1) {
    // 如果正在上傳，取消上傳
    if (uploadProgressMap.value[uid] && uploadProgressMap.value[uid] > 0 && uploadProgressMap.value[uid] < 100) {
      handleCancelUpload(uid)
    }
    fileList.value.splice(index, 1)
    delete uploadProgressMap.value[uid]
    delete abortControllersMap.value[uid]
  }
  // 觸發表單驗證
  setTimeout(() => {
    if (formRef.value) {
      formRef.value.validateFields(['file']).catch(() => {
        // 忽略驗證錯誤
      })
    }
  }, 100)
}

// 移除文件（Ant Design Upload 的回調）
const handleRemove = (file) => {
  handleRemoveFile(file.uid)
  return true
}

// 取消上傳
const handleCancelUpload = (uid) => {
  const controller = abortControllersMap.value[uid]
  if (controller) {
    controller.abort()
    delete abortControllersMap.value[uid]
  }
  uploadProgressMap.value[uid] = 0
  showError('上傳已取消')
}

// 初始化表單數據
const initFormData = () => {
  formData.value = {
    title: '',
    description: ''
  }
  fileList.value = []
  uploadProgressMap.value = {}
  abortControllersMap.value = {}
}

// 重置表單
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  initFormData()
}

// 上傳單個文件
const uploadSingleFile = async (fileItem, entityType, entityId) => {
  const file = getFileObject(fileItem)
  if (!file || !(file instanceof File)) {
    throw new Error('無法獲取文件對象')
  }

  const uid = fileItem.uid
  const abortController = new AbortController()
  abortControllersMap.value[uid] = abortController

  try {
    // 進度回調
    const onProgress = (percent) => {
      uploadProgressMap.value[uid] = percent
    }

    // 上傳文件
    const response = await uploadAttachment(
      file,
      entityType,
      entityId,
      onProgress,
      abortController.signal
    )

    uploadProgressMap.value[uid] = 100
    return { success: true, file: fileItem, response }
  } catch (error) {
    if (error.message === '上傳已取消') {
      uploadProgressMap.value[uid] = 0
      return { success: false, file: fileItem, error: '已取消', cancelled: true }
    }
    uploadProgressMap.value[uid] = -1 // 標記為錯誤
    return { success: false, file: fileItem, error: error.message || '上傳失敗' }
  } finally {
    delete abortControllersMap.value[uid]
  }
}

// 提交表單 - 支持多檔並行上傳
const handleSubmit = async () => {
  try {
    // 驗證 entityType 和 entityId - 附件系統專為任務服務
    if (props.entityType !== 'task') {
      showError('附件系統專為任務服務，entity_type 必須為 "task"')
      return
    }

    if (!props.entityId) {
      showError('請指定有效的附件關聯實體 ID')
      return
    }

    // 驗證表單
    await formRef.value.validate()

    // 檢查文件
    if (fileList.value.length === 0) {
      showError('請選擇文件')
      return
    }

    // 驗證文件數量
    if (fileList.value.length > props.maxCount) {
      showError(`最多只能上傳 ${props.maxCount} 個文件`)
      return
    }

    // 獲取所有有效的文件
    const filesToUpload = []
    for (const fileItem of fileList.value) {
      const file = getFileObject(fileItem)
      if (file && file instanceof File) {
        // 再次驗證文件
        const validation = validateFile(file, MAX_FILE_SIZE, ALLOWED_FILE_EXTENSIONS)
        if (!validation.valid) {
          showError(`${file.name}: ${validation.error}`)
          continue
        }
        filesToUpload.push(fileItem)
        // 初始化進度
        uploadProgressMap.value[fileItem.uid] = 0
      }
    }

    if (filesToUpload.length === 0) {
      showError('沒有有效的文件可以上傳')
      return
    }

    loading.value = true

    // 並行上傳，但限制同時上傳的數量
    const results = []
    let currentIndex = 0

    const processNext = async () => {
      while (currentIndex < filesToUpload.length) {
        const fileItem = filesToUpload[currentIndex]
        const uid = fileItem.uid
        const index = currentIndex++

        try {
          const result = await uploadSingleFile(fileItem, props.entityType, String(props.entityId))
          results.push(result)
        } catch (error) {
          console.error('Upload error:', error)
          results.push({ success: false, file: fileItem, error: error.message || '上傳失敗' })
        }
      }
    }

    // 啟動並行上傳（最多 MAX_CONCURRENT_UPLOADS 個同時上傳）
    const uploadPromises = []
    const concurrentCount = Math.min(MAX_CONCURRENT_UPLOADS, filesToUpload.length)
    for (let i = 0; i < concurrentCount; i++) {
      uploadPromises.push(processNext())
    }

    await Promise.all(uploadPromises)

    // 統計結果
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success && !r.cancelled).length
    const cancelledCount = results.filter(r => r.cancelled).length

    if (successCount === filesToUpload.length) {
      showSuccess(`成功上傳 ${successCount} 個附件`)
      emit('success', results.filter(r => r.success).map(r => r.response))
      handleClose()
    } else if (successCount > 0) {
      const message = `部分上傳成功：${successCount} 個成功，${failCount} 個失敗${cancelledCount > 0 ? `，${cancelledCount} 個已取消` : ''}`
      showError(message)
      emit('success', results.filter(r => r.success).map(r => r.response))
    } else if (failCount > 0) {
      const failedFiles = results.filter(r => !r.success && !r.cancelled).map(r => getFileName(r.file)).join('、')
      showError(`上傳失敗：${failedFiles}`)
    }
  } catch (error) {
    console.error('上傳附件失敗:', error)
    if (error.errorFields) {
      showError('請檢查表單輸入')
    } else {
      const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || '上傳附件失敗'
      showError(errorMessage)
    }
  } finally {
    loading.value = false
  }
}

// 關閉抽屜
const handleClose = () => {
  // 取消所有正在進行的上傳
  Object.keys(abortControllersMap.value).forEach(uid => {
    const controller = abortControllersMap.value[uid]
    if (controller) {
      controller.abort()
    }
  })
  resetForm()
  drawerVisible.value = false // 更新 computed 會觸發 emit
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

// 監聽 entityType 和 entityId 變化，驗證 - 附件系統專為任務服務
watch(
  () => [props.entityType, props.entityId],
  ([newType, newId]) => {
    if (props.visible) {
      if (newType !== 'task') {
        console.warn('附件系統專為任務服務，Invalid entityType:', newType)
      }
      if (!newId) {
        console.warn('Invalid entityId:', newId)
      }
    }
  }
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

/* 文件列表樣式 */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.file-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background-color: #fafafa;
  transition: all 0.2s ease;
}

.file-item:hover {
  border-color: #d9d9d9;
  background-color: #f5f5f5;
}

.file-info {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #1f2937;
}

.file-name {
  flex: 1;
  word-break: break-all;
  margin-right: 8px;
}

.file-size {
  color: #8c8c8c;
  font-size: 12px;
  white-space: nowrap;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-progress {
  flex: 1;
  min-width: 0;
}

:deep(.ant-upload-list) {
  margin-top: 12px;
}

:deep(.ant-upload-list-item) {
  margin-top: 8px;
}
</style>


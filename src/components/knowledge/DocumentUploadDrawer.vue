<template>
  <a-drawer
    v-model:open="drawerVisible"
    :title="isEditMode ? '編輯文檔' : '上傳文檔'"
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
    
    <!-- 載入中狀態 -->
    <a-spin v-if="loadingDocument" :spinning="loadingDocument" tip="載入文檔數據..." style="min-height: 400px; display: flex; align-items: center; justify-content: center" />
    
    <a-form
      v-else
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
      <a-form-item 
        :label="isEditMode ? '更換文件（可選）' : '選擇文件'" 
        name="file"
      >
        <a-upload
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :custom-request="handleCustomRequest"
          :remove="handleRemove"
          :accept="acceptedFileTypes"
          :multiple="!isEditMode"
          :max-count="isEditMode ? 1 : undefined"
          :show-upload-list="true"
          drag
          @drop="handleDrop"
          @dragover="handleDragOver"
          @change="handleFileChange"
        >
          <div class="upload-trigger">
            <div class="upload-icon-wrapper">
              <InboxOutlined class="upload-icon" />
            </div>
            <div class="upload-text">
              <div class="upload-title">{{ isEditMode ? '點擊或拖拽文件到此區域更換文件' : '點擊或拖拽文件到此區域上傳' }}</div>
              <div class="upload-hint">
                {{ isEditMode 
                  ? '支持 PDF、Word、Excel、PowerPoint、圖片等格式，最大 25MB。不選擇文件則僅更新元數據' 
                  : '支持 PDF、Word、Excel、PowerPoint、圖片等格式，最大 25MB，可同時上傳多個文件' 
                }}
              </div>
            </div>
            <a-button type="primary" size="small" :disabled="loading || isUploading">
              {{ isEditMode ? '選擇文件' : '選擇文件' }}
            </a-button>
          </div>
        </a-upload>
        <!-- 編輯模式下顯示當前文件名 -->
        <div v-if="isEditMode && currentFileName && fileList.length === 0" style="margin-top: 8px; color: #666; font-size: 14px">
          當前文件：{{ currentFileName }}
        </div>
      </a-form-item>

      <!-- 多文件上傳進度條 -->
      <a-form-item v-if="fileUploadProgress.length > 0">
        <div class="upload-progress-list">
          <div 
            v-for="(progress, index) in fileUploadProgress" 
            :key="index" 
            class="upload-progress-item"
          >
            <div class="upload-progress-header">
              <FileOutlined style="margin-right: 8px" />
              <span class="upload-progress-filename">{{ progress.fileName }}</span>
              <a-tag 
                :color="getProgressTagColor(progress.status)" 
                style="margin-left: auto"
              >
                {{ getProgressStatusText(progress.status) }}
              </a-tag>
            </div>
            <a-progress 
              :percent="progress.percent" 
              :status="progress.status === 'error' ? 'exception' : progress.status === 'success' ? 'success' : 'active'"
              :show-info="true"
            />
            <div v-if="progress.error" class="upload-progress-error">
              {{ progress.error }}
            </div>
          </div>
        </div>
      </a-form-item>

      <!-- 表單操作按鈕 -->
      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="loading" :disabled="isUploading">
            {{ isEditMode ? '更新' : `上傳${fileList.length > 1 ? ` (${fileList.length} 個文件)` : ''}` }}
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
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import { fetchDocument } from '@/api/knowledge'
import { getAcceptFileTypes, validateFile, MAX_FILE_SIZE, ALLOWED_FILE_EXTENSIONS } from '@/utils/fileValidation'

// Page Alert
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  documentId: {
    type: [String, Number],
    default: null
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

// Upload progress - 單個進度（保留用於向後兼容）
const uploadProgress = ref(0)

// 多文件上傳進度 - 每個文件的獨立進度
const fileUploadProgress = ref([])

// 是否正在上傳
const isUploading = computed(() => {
  return fileUploadProgress.value.some(p => p.status === 'uploading')
})

// 是否為編輯模式
const isEditMode = computed(() => {
  return !!props.documentId
})

// 當前文件名（編輯模式）
const currentFileName = ref('')

// 載入中狀態
const loadingDocument = ref(false)

// Accepted file types - 使用文件驗證工具函數以保持一致性
const acceptedFileTypes = getAcceptFileTypes()

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
const formRules = computed(() => {
  const rules = {
    title: [
      { required: true, message: '請輸入文檔標題', trigger: 'blur' },
      { max: 200, message: '標題長度不能超過 200 個字符', trigger: 'blur' }
    ],
    category: [
      { required: true, message: '請選擇服務類型', trigger: 'change' }
    ],
    scope: [
      { required: true, message: '請選擇適用層級', trigger: 'change' }
    ]
  }

  // 編輯模式下文件是可選的，創建模式下文件是必填的
  if (!isEditMode.value) {
    rules.file = [
      { 
        required: true, 
        message: '請選擇至少一個文件', 
        trigger: 'change',
        validator: (rule, value) => {
          if (fileList.value && fileList.value.length > 0) {
            return Promise.resolve()
          }
          return Promise.reject(new Error('請選擇至少一個文件'))
        }
      }
    ]
  }

  return rules
})

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
const beforeUpload = (file, fileList) => {
  console.log('[DocumentUploadDrawer] beforeUpload called:', file.name, file.size, 'fileList length:', fileList?.length)
  
  // 使用文件驗證工具函數進行綜合驗證
  const validation = validateFile(file, MAX_FILE_SIZE, ALLOWED_FILE_EXTENSIONS)
  
  if (!validation.valid) {
    console.error('[DocumentUploadDrawer] 文件驗證失敗:', validation.error)
    showError(validation.error || '文件驗證失敗')
    return false
  }

  console.log('[DocumentUploadDrawer] 文件驗證通過，允許添加到列表')
  
  // 返回 true 允許文件添加到列表，但使用 customRequest 控制上傳
  // 文件添加後觸發表單驗證
  setTimeout(() => {
    if (formRef.value) {
      formRef.value.validateFields(['file']).catch(() => {
        // 忽略驗證錯誤，因為文件已經添加
      })
    }
  }, 100)
  
  // 返回 true 允許文件添加到 fileList，customRequest 會處理上傳
  return true
}

// 自定義上傳請求（阻止自動上傳）
const handleCustomRequest = (options) => {
  console.log('[DocumentUploadDrawer] handleCustomRequest called:', options.file?.name)
  
  // 不執行任何操作，文件已經添加到 fileList
  // 實際的上傳將在表單提交時進行
  const { onSuccess, onError, file } = options
  
  // 立即調用 onSuccess 以確保文件選擇流程完成
  // 這樣文件會被標記為"已上傳"狀態，但實際上傳在表單提交時進行
  if (onSuccess) {
    console.log('[DocumentUploadDrawer] 調用 onSuccess，文件已添加到列表')
    onSuccess('ok', file)
  }
}

// 處理文件列表變化
const handleFileChange = (info) => {
  console.log('[DocumentUploadDrawer] handleFileChange called:', {
    fileList: info.fileList?.length,
    file: info.file?.name,
    event: info.event
  })
  
  // v-model:file-list 已經會自動同步，這裡只需要觸發表單驗證
  // 確保文件對象正確保存
  if (info.fileList) {
    info.fileList.forEach(fileItem => {
      // 確保文件對象被正確保存
      if (fileItem.originFileObj && !fileItem.originFile) {
        fileItem.originFile = fileItem.originFileObj
      }
    })
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
const handleRemove = (file) => {
  // 使用文件的 uid 或 name 作為唯一標識
  const fileId = file.uid || file.name
  
  // 移除對應的進度條（使用 fileName 匹配）
  const progressIndex = fileUploadProgress.value.findIndex(p => {
    const progressFileId = p.fileId || p.fileName
    return progressFileId === fileId || progressFileId === file.name
  })
  
  if (progressIndex >= 0) {
    fileUploadProgress.value.splice(progressIndex, 1)
  }
  
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
  fileUploadProgress.value = []
  currentFileName.value = ''
}

// 載入現有文檔數據（編輯模式）
const loadDocumentData = async () => {
  if (!props.documentId) {
    return
  }

  loadingDocument.value = true
  try {
    console.log('載入文檔數據:', props.documentId)
    const response = await fetchDocument(props.documentId)
    
    // 處理 API 響應格式
    let document = null
    if (response && typeof response === 'object') {
      if (response.ok && response.data) {
        document = response.data
      } else if (response.document_id || response.id) {
        document = response
      } else {
        document = response
      }
    } else {
      document = response
    }

    console.log('載入的文檔數據:', document)

    if (document) {
      // 填充表單數據
      formData.value = {
        title: document.title || document.document_title || '',
        category: document.category || document.service_type || undefined,
        scope: document.scope || undefined,
        client_id: document.client_id || document.clientId || undefined,
        year: document.doc_year || document.docYear || document.year || undefined,
        month: document.doc_month || document.docMonth || document.month || undefined,
        tags: Array.isArray(document.tags) 
          ? document.tags 
          : (document.tags ? String(document.tags).split(',').map(t => t.trim()).filter(Boolean) : [])
      }

      // 設置當前文件名
      currentFileName.value = document.file_name || document.fileName || document.name || ''
    }
  } catch (error) {
    console.error('載入文檔數據失敗:', error)
    showError(error.message || '載入文檔數據失敗')
  } finally {
    loadingDocument.value = false
  }
}

// 重置表單
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  initFormData()
}

// 獲取文件對象（兼容 Ant Design Vue 4.x）
const getFileFromItem = (fileItem) => {
  if (!fileItem) {
    console.warn('[DocumentUploadDrawer] getFileFromItem: fileItem is null')
    return null
  }
  
  console.log('[DocumentUploadDrawer] getFileFromItem: fileItem structure:', {
    name: fileItem.name,
    uid: fileItem.uid,
    hasOriginFileObj: !!fileItem.originFileObj,
    hasOriginFile: !!fileItem.originFile,
    hasFile: !!fileItem.file,
    isFile: fileItem instanceof File
  })
  
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
    console.error('[DocumentUploadDrawer] 無法獲取有效的文件對象，fileItem:', fileItem)
    return null
  }
  
  console.log('[DocumentUploadDrawer] 成功獲取文件對象:', file.name, file.size)
  return file
}

// 上傳單個文件（創建模式）
const uploadSingleFile = async (file, fileIndex, fileName, fileId) => {
  // 初始化進度條
  const progressItem = {
    fileIndex,
    fileName,
    fileId: fileId || fileName, // 使用唯一標識
    percent: 0,
    status: 'uploading',
    error: null
  }
  fileUploadProgress.value.push(progressItem)

  try {
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

    // 上傳進度回調
    const onProgress = (percent) => {
      progressItem.percent = percent
    }

    // 上傳
    const response = await knowledgeStore.uploadDocument(formDataToSend, onProgress)
    
    // 上傳成功
    progressItem.percent = 100
    progressItem.status = 'success'
    
    return { success: true, file: fileName, response }
  } catch (error) {
    // 上傳失敗
    progressItem.status = 'error'
    progressItem.percent = 0
    const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || '上傳失敗'
    progressItem.error = errorMessage
    
    console.error(`上傳文件 ${fileName} 失敗:`, error)
    return { success: false, file: fileName, error: errorMessage }
  }
}

// 更新文檔（編輯模式）
const updateDocumentData = async () => {
  try {
    // 檢查是否有新文件要上傳
    const hasNewFile = fileList.value.length > 0
    const fileItem = hasNewFile ? fileList.value[0] : null
    const file = fileItem ? getFileFromItem(fileItem) : null
    
    let updateData
    let response
    
    if (file && hasNewFile) {
      // 有文件更換：使用 FormData 上傳
      const formDataToSend = new FormData()
      formDataToSend.append('file', file)
      formDataToSend.append('title', formData.value.title.trim())
      formDataToSend.append('category', formData.value.category || '')
      formDataToSend.append('scope', formData.value.scope || '')
      
      // 可選字段
      if (formData.value.client_id !== undefined) {
        formDataToSend.append('client_id', formData.value.client_id || '')
      }
      if (formData.value.year !== undefined) {
        formDataToSend.append('doc_year', formData.value.year || '')
      }
      if (formData.value.month !== undefined) {
        formDataToSend.append('doc_month', formData.value.month || '')
      }
      if (formData.value.tags && formData.value.tags.length > 0) {
        const tagsStr = Array.isArray(formData.value.tags) 
          ? formData.value.tags.join(',') 
          : String(formData.value.tags)
        formDataToSend.append('tags', tagsStr)
      }
      
      // 調用 store 的 updateDocument action，傳入 FormData
      response = await knowledgeStore.updateDocument(props.documentId, formDataToSend, (percent) => {
        uploadProgress.value = percent
      })
    } else {
      // 僅更新元數據：使用 JSON
      updateData = {
        title: formData.value.title.trim(),
        category: formData.value.category || '',
        scope: formData.value.scope || null
      }

      // 可選字段
      if (formData.value.client_id !== undefined) {
        updateData.client_id = formData.value.client_id || null
      }
      if (formData.value.year !== undefined) {
        updateData.doc_year = formData.value.year || null
      }
      if (formData.value.month !== undefined) {
        updateData.doc_month = formData.value.month || null
      }
      if (formData.value.tags && formData.value.tags.length > 0) {
        updateData.tags = Array.isArray(formData.value.tags) 
          ? formData.value.tags 
          : String(formData.value.tags).split(',').map(t => t.trim()).filter(Boolean)
      } else {
        updateData.tags = []
      }

      // 調用 store 的 updateDocument action
      response = await knowledgeStore.updateDocument(props.documentId, updateData)
    }

    console.log('更新文檔響應:', response)
    return { success: true, response }
  } catch (error) {
    console.error('更新文檔失敗:', error)
    const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || '更新失敗'
    throw new Error(errorMessage)
  }
}

// 提交表單
const handleSubmit = async () => {
  try {
    // 驗證表單
    await formRef.value.validate()

    // 編輯模式：調用更新 API
    if (isEditMode.value) {
      // 編輯模式下，文件是可選的
      // 如果有新文件，會上傳並更換文件；否則僅更新元數據
      
      try {
        const result = await updateDocumentData()
        
        if (result.success) {
          const hasFile = fileList.value.length > 0
          const message = hasFile ? '文檔更新成功（包含文件更換）' : '文檔更新成功'
          showSuccess(message)
          emit('success')
          handleClose()
        }
      } catch (error) {
        console.error('更新文檔失敗:', error)
        const errorMessage = error.message || '更新文檔失敗'
        showError(errorMessage)
        
        // 不關閉抽屜，讓用戶可以重試
      }
      return
    }

    // 創建模式：檢查文件
    if (fileList.value.length === 0) {
      showError('請選擇文件')
      return
    }

    // 初始化進度條數組
    fileUploadProgress.value = []
    
    // 獲取所有有效的文件
    const filesToUpload = []
    for (let i = 0; i < fileList.value.length; i++) {
      const fileItem = fileList.value[i]
      const file = getFileFromItem(fileItem)
      
      if (file) {
        const fileId = fileItem.uid || fileItem.name || file.name
        filesToUpload.push({
          file,
          fileIndex: i,
          fileName: file.name,
          fileId
        })
      }
    }

    if (filesToUpload.length === 0) {
      showError('無法獲取文件對象，請重新選擇文件')
      return
    }

    console.log(`準備上傳 ${filesToUpload.length} 個文件`)

    // 依次上傳每個文件（避免並發過多）
    const results = []
    let successCount = 0
    let failCount = 0

    for (const { file, fileIndex, fileName, fileId } of filesToUpload) {
      const result = await uploadSingleFile(file, fileIndex, fileName, fileId)
      results.push(result)
      
      if (result.success) {
        successCount++
      } else {
        failCount++
      }
    }

    // 顯示結果
    if (successCount > 0 && failCount === 0) {
      showSuccess(`成功上傳 ${successCount} 個文件`)
      emit('success')
      handleClose()
    } else if (successCount > 0 && failCount > 0) {
      showError(`部分文件上傳失敗：成功 ${successCount} 個，失敗 ${failCount} 個`)
      // 不關閉抽屜，讓用戶查看失敗的文件
      emit('success') // 仍然觸發成功事件，因為有文件成功上傳
    } else {
      showError('所有文件上傳失敗')
    }
  } catch (error) {
    if (error.errorFields) {
      showError('請檢查表單輸入')
    } else {
      console.error('提交失敗:', error)
      const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || (isEditMode.value ? '更新文檔失敗' : '上傳文檔失敗')
      showError(errorMessage)
    }
  }
}

// 關閉抽屜
const handleClose = () => {
  resetForm()
  emit('close')
}

// 獲取進度條標籤顏色
const getProgressTagColor = (status) => {
  switch (status) {
    case 'success':
      return 'success'
    case 'error':
      return 'error'
    case 'uploading':
      return 'processing'
    default:
      return 'default'
  }
}

// 獲取進度條狀態文字
const getProgressStatusText = (status) => {
  switch (status) {
    case 'success':
      return '上傳成功'
    case 'error':
      return '上傳失敗'
    case 'uploading':
      return '上傳中'
    default:
      return '等待上傳'
  }
}

// 監聽 visible 變化，初始化表單或載入數據
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      if (isEditMode.value && props.documentId) {
        // 編輯模式：載入現有數據
        await loadDocumentData()
      } else {
        // 創建模式：初始化表單
        initFormData()
      }
    }
  },
  { immediate: true }
)

// 監聽 documentId 變化，載入數據
watch(
  () => props.documentId,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal && props.visible) {
      await loadDocumentData()
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

.upload-progress-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-progress-item {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background-color: #fafafa;
}

.upload-progress-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.upload-progress-filename {
  flex: 1;
  margin-right: 8px;
  word-break: break-all;
  color: #1f2937;
}

.upload-progress-error {
  margin-top: 8px;
  font-size: 12px;
  color: #ff4d4f;
}
</style>


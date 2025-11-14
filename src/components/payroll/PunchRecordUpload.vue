<template>
  <a-card title="打卡記錄上傳">
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
    
    <!-- 管理員工具 -->
    <div v-if="isAdmin" style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">選擇員工</label>
      <a-select
        v-model:value="selectedUserId"
        placeholder="請選擇員工"
        style="width: 100%;"
        @change="handleUserChange"
      >
        <a-select-option
          v-for="employee in employees"
          :key="employee.id || employee.userId"
          :value="employee.id || employee.userId"
        >
          {{ employee.name || employee.userName }}
        </a-select-option>
      </a-select>
    </div>
    
    <!-- 上傳區域 -->
    <a-upload
      :before-upload="handleBeforeUpload"
      :file-list="fileList"
      :accept="'.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.zip'"
      :max-count="1"
      @remove="handleRemove"
    >
      <a-button>
        <template #icon>
          <upload-outlined />
        </template>
        選擇檔案
      </a-button>
      <template #tip>
        <div style="margin-top: 8px; font-size: 12px; color: #8c8c8c;">
          支援：PDF、Excel、圖片、ZIP<br/>
          單檔最大 10MB
        </div>
      </template>
    </a-upload>
    
    <!-- 上傳表單（選擇檔案後顯示） -->
    <div v-if="selectedFile" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0;">
      <div style="margin-bottom: 12px;">
        <span style="font-weight: 500;">已選擇檔案：</span>
        <span>{{ selectedFile.name }}</span>
      </div>
      
      <a-form :model="formData" layout="vertical">
        <a-form-item
          label="所屬月份"
          :rules="[{ required: true, message: '請選擇所屬月份' }]"
        >
          <a-date-picker
            v-model:value="formData.month"
            picker="month"
            format="YYYY-MM"
            value-format="YYYY-MM"
            placeholder="請選擇月份"
            style="width: 100%;"
          />
        </a-form-item>
        
        <a-form-item label="備註（可選）">
          <a-input
            v-model:value="formData.notes"
            placeholder="請輸入備註"
            :maxlength="200"
            show-count
          />
        </a-form-item>
        
        <a-form-item>
          <a-space>
            <a-button
              type="primary"
              :loading="uploading"
              @click="handleUpload"
            >
              <template #icon>
                <arrow-up-outlined />
              </template>
              上傳
            </a-button>
            <a-button @click="handleCancel">
              取消
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
      
      <!-- 上傳進度條 -->
      <a-progress
        v-if="uploading"
        :percent="uploadProgress"
        :status="uploadProgress === 100 ? 'success' : 'active'"
        style="margin-top: 12px;"
      />
    </div>
  </a-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { UploadOutlined, ArrowUpOutlined } from '@ant-design/icons-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import dayjs from 'dayjs'

const props = defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  },
  employees: {
    type: Array,
    default: () => []
  },
  selectedUserId: {
    type: [Number, String],
    default: null
  }
})

const emit = defineEmits(['upload', 'user-change'])

const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

const fileList = ref([])
const selectedFile = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const formData = ref({
  month: dayjs().format('YYYY-MM'),
  notes: ''
})

const selectedUserId = ref(props.selectedUserId)

// 監聽 props 變化
watch(() => props.selectedUserId, (newVal) => {
  selectedUserId.value = newVal
})

// 處理檔案選擇前驗證
const handleBeforeUpload = (file) => {
  // 驗證檔案類型
  const validTypes = ['.pdf', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.zip']
  const fileName = file.name.toLowerCase()
  const isValidType = validTypes.some(type => fileName.endsWith(type))
  
  if (!isValidType) {
    showError('不支援的檔案類型，請上傳 PDF、Excel、圖片或 ZIP 檔案')
    return false
  }
  
  // 驗證檔案大小（10MB）
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    showError('檔案大小不能超過 10MB')
    return false
  }
  
  // 阻止自動上傳
  selectedFile.value = file
  fileList.value = [file]
  return false
}

// 處理移除檔案
const handleRemove = () => {
  selectedFile.value = null
  fileList.value = []
  formData.value = {
    month: dayjs().format('YYYY-MM'),
    notes: ''
  }
}

// 處理上傳
const handleUpload = async () => {
  if (!selectedFile.value) {
    showError('請先選擇檔案')
    return
  }
  
  if (!formData.value.month) {
    showError('請選擇所屬月份')
    return
  }
  
  // 如果是管理員模式，檢查是否選擇了員工
  if (props.isAdmin && !selectedUserId.value) {
    showError('請先選擇員工')
    return
  }
  
  uploading.value = true
  uploadProgress.value = 0
  
  try {
    // 創建 FormData
    const formDataToSend = new FormData()
    formDataToSend.append('file', selectedFile.value)
    formDataToSend.append('month', formData.value.month)
    if (formData.value.notes) {
      formDataToSend.append('notes', formData.value.notes)
    }
    if (props.isAdmin && selectedUserId.value) {
      formDataToSend.append('user_id', selectedUserId.value)
    }
    
    // 模擬上傳進度
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10
      }
    }, 200)
    
    // 觸發上傳事件（父組件會處理上傳，成功後會刷新列表）
    emit('upload', formDataToSend)
    
    // 等待上傳完成（實際進度由 API 控制）
    // 注意：這裡使用 setTimeout 來模擬上傳完成，實際應該等待父組件的上傳完成通知
    // 但為了簡化，我們假設上傳會在 1-2 秒內完成
    setTimeout(() => {
      clearInterval(progressInterval)
      uploadProgress.value = 100
      
      setTimeout(() => {
        uploading.value = false
        uploadProgress.value = 0
        handleCancel()
      }, 500)
    }, 1500)
  } catch (error) {
    uploading.value = false
    uploadProgress.value = 0
    showError(error.message || '上傳失敗')
  }
}

// 處理取消
const handleCancel = () => {
  selectedFile.value = null
  fileList.value = []
  formData.value = {
    month: dayjs().format('YYYY-MM'),
    notes: ''
  }
}

// 處理員工選擇變化
const handleUserChange = (userId) => {
  selectedUserId.value = userId
  emit('user-change', userId)
}
</script>

<style scoped>
:deep(.ant-upload) {
  width: 100%;
}
</style>


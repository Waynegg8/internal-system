<template>
  <a-card style="min-height: calc(100vh - 280px);">
    <template #title>
      <span>預覽</span>
    </template>
    
    <div v-if="!record" class="preview-empty">
      <a-empty description="點擊左側檔案查看預覽" />
    </div>
    
    <div v-else-if="loading" class="preview-loading">
      <a-spin size="large" tip="載入中..." />
    </div>
    
    <div v-else-if="error" class="preview-error">
      <a-result
        status="error"
        :title="error"
        sub-title="無法載入預覽，請稍後再試"
      >
        <template #extra>
          <a-button type="primary" @click="loadPreview">
            重試
          </a-button>
        </template>
      </a-result>
    </div>
    
    <div v-else-if="previewType === 'pdf'" class="preview-content">
      <iframe
        :src="previewUrl"
        style="width: 100%; height: calc(100vh - 320px); min-height: 800px; border: none;"
        frameborder="0"
      />
    </div>
    
    <div v-else-if="previewType === 'image'" class="preview-content">
      <div style="text-align: center; padding: 20px;">
        <img
          :src="previewUrl"
          :alt="getField(record, 'fileName', 'file_name')"
          style="max-width: 100%; height: auto; object-fit: contain;"
        />
      </div>
    </div>
    
    <div v-else class="preview-unsupported">
      <a-result
        status="info"
        title="不支援預覽此檔案類型"
        :sub-title="`檔案：${getField(record, 'fileName', 'file_name')}`"
      >
        <template #extra>
          <a-button type="primary" @click="handleDownloadClick">
            <template #icon>
              <download-outlined />
            </template>
            下載檔案
          </a-button>
        </template>
      </a-result>
    </div>
  </a-card>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import { usePayrollApi } from '@/api/payroll'

const props = defineProps({
  record: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['download'])

// 處理下載事件
const handleDownloadClick = async () => {
  if (!props.record) return
  
  const recordId = getField(props.record, 'recordId', 'record_id')
  const fileName = getField(props.record, 'fileName', 'file_name')
  
  if (recordId) {
    emit('download', recordId, fileName)
  }
}

const loading = ref(false)
const error = ref(null)
const previewUrl = ref(null)
const previewType = ref(null)
let currentBlobUrl = null

// 獲取字段值（支持 snake_case 和 camelCase）
const getField = (record, camelKey, snakeKey) => {
  if (!record) return ''
  return record[camelKey] || record[snakeKey] || ''
}

// 判斷檔案類型
const getFileType = (record) => {
  const fileType = getField(record, 'fileType', 'file_type') || ''
  const fileName = getField(record, 'fileName', 'file_name') || ''
  const lowerFileName = fileName.toLowerCase()
  
  // PDF
  if (fileType.includes('pdf') || lowerFileName.endsWith('.pdf')) {
    return 'pdf'
  }
  
  // 圖片
  if (fileType.includes('image') || 
      fileType.startsWith('image/') ||
      lowerFileName.endsWith('.jpg') ||
      lowerFileName.endsWith('.jpeg') ||
      lowerFileName.endsWith('.png') ||
      lowerFileName.endsWith('.gif')) {
    return 'image'
  }
  
  return 'unsupported'
}

// 載入預覽
const loadPreview = async () => {
  if (!props.record) {
    previewType.value = null
    previewUrl.value = null
    return
  }
  
  const recordId = getField(props.record, 'recordId', 'record_id')
  if (!recordId) {
    error.value = '無效的記錄 ID'
    return
  }
  
  // 判斷檔案類型
  const fileType = getFileType(props.record)
  previewType.value = fileType
  
  // 如果不支持預覽，直接返回
  if (fileType === 'unsupported') {
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    // 釋放之前的 blob URL
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl)
      currentBlobUrl = null
    }
    
    // 獲取檔案 blob
    const response = await usePayrollApi().previewPunchRecord(recordId)
    
    // 創建 blob URL
    const blob = new Blob([response], { 
      type: fileType === 'pdf' ? 'application/pdf' : 'image/*'
    })
    currentBlobUrl = URL.createObjectURL(blob)
    previewUrl.value = currentBlobUrl
    
    loading.value = false
  } catch (err) {
    loading.value = false
    error.value = err.message || '載入預覽失敗'
    previewType.value = null
    previewUrl.value = null
  }
}

// 監聽 record 變化
watch(() => props.record, (newRecord) => {
  if (newRecord) {
    loadPreview()
  } else {
    // 釋放 blob URL
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl)
      currentBlobUrl = null
    }
    previewUrl.value = null
    previewType.value = null
    error.value = null
    loading.value = false
  }
}, { immediate: true })

// 組件卸載時釋放 blob URL
onUnmounted(() => {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }
})
</script>

<style scoped>
.preview-empty,
.preview-loading,
.preview-error,
.preview-unsupported {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 800px;
}

.preview-content {
  min-height: 800px;
}
</style>


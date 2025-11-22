<template>
  <div class="document-preview">
    <a-spin :spinning="loading || loadingPreviewUrl" tip="載入中...">
      <!-- PDF 預覽 -->
      <div v-if="fileType === 'pdf' && pdfData" class="preview-container">
        <PdfViewer :data="pdfData" :file-name="getFileName(document)" />
      </div>

      <!-- 圖片預覽 -->
      <div v-else-if="fileType === 'image' && blobUrl" class="preview-container">
        <img
          :src="blobUrl"
          alt="文檔預覽"
          class="preview-image"
        />
      </div>

      <!-- Office 文件預覽 -->
      <div v-else-if="fileType === 'office' && previewUrl" class="preview-container">
        <iframe
          :src="googleDocsViewerUrl"
          class="preview-iframe"
          frameborder="0"
          allowfullscreen
        />
      </div>

      <!-- Office 文件預覽失敗或載入中 -->
      <div v-else-if="fileType === 'office' && !previewUrl && !error" class="preview-other">
        <div class="file-icon">
          <FileOutlined style="font-size: 64px; color: #999" />
        </div>
        <div class="file-name">{{ getFileName(document) }}</div>
        <div class="file-size">{{ formatFileSize(document) }}</div>
        <a-button type="primary" @click="handleDownload" :loading="downloading">
          下載文件
        </a-button>
      </div>

      <!-- 不支持預覽的文件類型 -->
      <div v-else-if="fileType === 'other' && document" class="preview-other">
        <div class="file-icon">
          <FileOutlined style="font-size: 64px; color: #999" />
        </div>
        <div class="file-name">{{ getFileName(document) }}</div>
        <div class="file-size">{{ formatFileSize(document) }}</div>
        <a-button type="primary" @click="handleDownload" :loading="downloading">
          下載文件
        </a-button>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else-if="error" class="preview-error">
        <a-alert type="error" :message="error" show-icon />
        <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center;">
          <a-button type="primary" @click="handleRetry">
            重試
          </a-button>
          <a-button v-if="document" @click="handleDownload" :loading="downloading">
            下載文件
          </a-button>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-else class="preview-empty">
        <a-empty description="暫無文檔" />
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { FileOutlined } from '@ant-design/icons-vue'
import { downloadDocument, getPreviewUrl } from '@/api/knowledge'
import PdfViewer from '@/components/shared/PdfViewer.vue'

const props = defineProps({
  document: {
    type: Object,
    default: null
  }
})

const loading = ref(false)
const error = ref(null)
const blobUrl = ref(null)
const downloading = ref(false)
const pdfData = ref(null)
const previewUrl = ref(null)
const loadingPreviewUrl = ref(false)

const fileType = computed(() => {
  if (!props.document) return null

  const fileName = getFileName(props.document).toLowerCase()
  const type = props.document.fileType || props.document.file_type || props.document.type || ''

  if (fileName.endsWith('.pdf') || type.includes('pdf')) {
    return 'pdf'
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
  if (imageExtensions.some(ext => fileName.endsWith(ext)) || imageTypes.some(t => type.includes(t))) {
    return 'image'
  }

  // Office 文件類型判斷
  const officeExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
  const officeTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
  if (officeExtensions.some(ext => fileName.endsWith(ext)) || officeTypes.some(t => type.includes(t))) {
    return 'office'
  }

  return 'other'
})

const getFileName = (doc) => {
  return doc.fileName || doc.file_name || doc.name || doc.title || doc.document_title || '未知文件'
}

const formatFileSize = (doc) => {
  const size = doc.fileSize || doc.file_size || doc.size || 0
  if (size === 0) return '未知大小'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

const releaseBlob = () => {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = null
  }
}

const resetData = () => {
  releaseBlob()
  pdfData.value = null
  previewUrl.value = null
}

// Google Docs Viewer URL
const googleDocsViewerUrl = computed(() => {
  if (!previewUrl.value) return ''
  // 編碼預覽 URL 並傳遞給 Google Docs Viewer
  const encodedUrl = encodeURIComponent(previewUrl.value)
  return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`
})

const loadPreviewUrl = async () => {
  if (!props.document) {
    previewUrl.value = null
    return
  }

  const docId = props.document.id || props.document.documentId || props.document.document_id
  if (!docId) {
    previewUrl.value = null
    return
  }

  loadingPreviewUrl.value = true
  error.value = null

  try {
    const response = await getPreviewUrl(docId)
    // 響應格式: { ok: true, data: { previewUrl, expiresAt, expiresIn }, message, code, meta }
    // axios interceptor 返回 response.data，所以這裡 response 已經是 { ok, data, message, code, meta }
    if (response?.data?.previewUrl) {
      previewUrl.value = response.data.previewUrl
    } else if (response?.previewUrl) {
      // 兼容不同的響應格式
      previewUrl.value = response.previewUrl
    } else {
      throw new Error('無法獲取預覽 URL')
    }
  } catch (err) {
    error.value = err.message || '獲取預覽 URL 失敗'
    console.error('獲取預覽 URL 失敗:', err)
    previewUrl.value = null
  } finally {
    loadingPreviewUrl.value = false
  }
}

const loadDocument = async () => {
  if (!props.document) {
    resetData()
    error.value = null
    return
  }

  // Office 文件需要獲取預覽 URL
  if (fileType.value === 'office') {
    resetData()
    error.value = null
    await loadPreviewUrl()
    return
  }

  if (fileType.value === 'other') {
    resetData()
    error.value = null
    return
  }

  loading.value = true
  error.value = null

  try {
    const docId = props.document.id || props.document.documentId || props.document.document_id
    const blob = await downloadDocument(docId)

    if (!blob || blob.size === 0) {
      throw new Error('載入文檔失敗，檔案為空')
    }

    resetData()

    if (blob.type === 'application/json' || blob.type === 'text/json') {
      const textResult = await blob.text()
      try {
        const json = JSON.parse(textResult)
        throw new Error(json.message || json.error || '載入文檔失敗')
      } catch (e) {
        throw new Error('載入文檔失敗')
      }
    }

    if (fileType.value === 'pdf') {
      const arrayBuffer = await blob.arrayBuffer()
      pdfData.value = new Uint8Array(arrayBuffer)
    } else if (fileType.value === 'image') {
      blobUrl.value = URL.createObjectURL(blob)
    }
  } catch (err) {
    error.value = err.message || '載入文檔失敗'
    console.error('載入文檔失敗:', err)
  } finally {
    loading.value = false
  }
}

const handleDownload = async () => {
  if (!props.document) return

  downloading.value = true
  try {
    const docId = props.document.id || props.document.documentId || props.document.document_id
    const blob = await downloadDocument(docId)

    if (!blob || blob.size === 0) {
      throw new Error('下載文檔失敗，檔案為空')
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getFileName(props.document)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('下載文檔失敗:', err)
  } finally {
    downloading.value = false
  }
}

const handleRetry = () => {
  if (fileType.value === 'office') {
    loadPreviewUrl()
  } else {
    loadDocument()
  }
}

watch(
  () => props.document,
  () => {
    loadDocument()
  },
  { immediate: true }
)

onUnmounted(() => {
  resetData()
})
</script>

<style scoped>
.document-preview {
  width: 100% !important;
  min-height: 1000px !important; /* 直接設置最小高度，不依賴父容器 */
  height: 100% !important; /* 如果有空間則填充父容器 */
  display: flex !important;
  flex-direction: column !important;
  padding: 0 !important; /* 移除 padding，讓預覽內容完全填充空間 */
  flex: 1 !important; /* 確保填充父容器 */
}

.document-preview :deep(.ant-spin-container) {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 1000px !important; /* 確保 spin 容器也有最小高度 */
  height: 100% !important;
}

.document-preview :deep(.ant-spin-nested-loading) {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 1000px !important; /* 確保 spin 容器也有最小高度 */
  height: 100% !important;
}

.preview-container {
  width: 100% !important;
  min-height: 1000px !important; /* 確保預覽容器至少有 1000px 高度 */
  height: 100% !important; /* 確保填充父容器 */
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  position: relative !important;
  overflow: hidden !important;
}

.preview-image {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  border-radius: 4px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  min-height: 1000px !important; /* 確保 iframe 至少有 1000px 高度 */
  border: none;
  border-radius: 4px;
}

.preview-other,
.preview-error,
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
}

.file-icon {
  margin-bottom: 16px;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.file-size {
  font-size: 14px;
  color: #999;
  margin-bottom: 24px;
}
</style>

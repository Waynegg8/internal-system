<template>
  <div class="document-preview">
    <a-spin :spinning="loading" tip="載入中...">
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
        <a-button type="primary" style="margin-top: 16px" @click="handleRetry">
          重試
        </a-button>
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
import { downloadDocument } from '@/api/knowledge'
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
}

const loadDocument = async () => {
  if (!props.document) {
    resetData()
    error.value = null
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
  loadDocument()
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
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
  min-height: 0;
}

.document-preview :deep(.ant-spin-container) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.document-preview :deep(.ant-spin-nested-loading) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-container {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
  overflow: hidden;
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

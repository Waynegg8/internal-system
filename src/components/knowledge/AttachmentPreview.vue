<template>
  <div class="attachment-preview">
    <a-spin :spinning="loading" tip="載入中...">
      <!-- PDF 預覽 -->
      <div v-if="fileType === 'pdf' && pdfData" class="preview-container">
        <PdfViewer :data="pdfData" :file-name="getAttachmentName(attachment)" />
      </div>

      <!-- 圖片預覽 -->
      <div v-else-if="fileType === 'image' && blobUrl" class="preview-container">
        <img :src="blobUrl" alt="附件預覽" class="preview-image" />
      </div>

      <!-- 文本預覽 -->
      <div v-else-if="fileType === 'text' && textContent" class="preview-container">
        <div class="text-preview">
          <pre>{{ textContent }}</pre>
        </div>
      </div>

      <!-- 不支援類型 -->
      <div v-else-if="fileType === 'other' && attachment" class="preview-other">
        <div class="file-icon">
          <FileOutlined style="font-size: 64px; color: #1890ff" />
        </div>
        <div class="file-info">
          <div class="file-name">{{ getAttachmentName(attachment) }}</div>
          <div class="file-size">{{ formatFileSize(attachment) }}</div>
          <div class="file-type">{{ getFileExtension(attachment) }}</div>
        </div>
        <a-button type="primary" @click="handleDownload" :loading="downloading">
          <DownloadOutlined />
          下載附件
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
        <a-empty description="請選擇附件進行預覽" />
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { FileOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import PdfViewer from '@/components/shared/PdfViewer.vue'

const props = defineProps({
  attachment: {
    type: Object,
    default: null
  }
})

const knowledgeStore = useKnowledgeStore()

const loading = ref(false)
const error = ref(null)
const blobUrl = ref(null)
const textContent = ref('')
const downloading = ref(false)
const pdfData = ref(null)

const fileType = computed(() => {
  if (!props.attachment) return null

  const fileName = getAttachmentName(props.attachment).toLowerCase()
  const mimeType = (
    props.attachment.mime_type ||
    props.attachment.type ||
    props.attachment.contentType ||
    props.attachment.content_type ||
    ''
  ).toLowerCase()

  if (fileName.endsWith('.pdf') || mimeType.includes('pdf')) {
    return 'pdf'
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg']
  if (imageExtensions.some(ext => fileName.endsWith(ext)) || imageTypes.some(type => mimeType.includes(type))) {
    return 'image'
  }

  const textExtensions = ['.txt', '.md', '.json', '.xml', '.csv', '.log']
  const textTypes = ['text/', 'application/json', 'application/xml']
  if (textExtensions.some(ext => fileName.endsWith(ext)) || textTypes.some(type => mimeType.includes(type))) {
    return 'text'
  }

  return 'other'
})

const getAttachmentName = (attachment) => {
  return attachment.name || attachment.filename || attachment.original_name || attachment.title || '未知附件'
}

const getFileExtension = (attachment) => {
  const name = getAttachmentName(attachment)
  const lastDot = name.lastIndexOf('.')
  if (lastDot === -1) return '未知格式'
  return name.substring(lastDot + 1).toUpperCase()
}

const formatFileSize = (attachment) => {
  const size = attachment.size || attachment.file_size || 0
  if (size === 0) return '未知大小'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

const loadAttachment = async () => {
  console.log('[AttachmentPreview] loadAttachment called, attachment:', props.attachment)
  
  if (!props.attachment) {
    console.log('[AttachmentPreview] No attachment, clearing state')
    blobUrl.value = null
    textContent.value = ''
    pdfData.value = null
    error.value = null
    return
  }

  if (fileType.value === 'other') {
    console.log('[AttachmentPreview] File type is other, skipping load')
    blobUrl.value = null
    textContent.value = ''
    pdfData.value = null
    error.value = null
    return
  }

  loading.value = true
  error.value = null

  try {
    // 使用統一的 getAttachmentId 函數
    const attachmentId = getAttachmentId(props.attachment)
    console.log('[AttachmentPreview] loadAttachment - attachmentId:', attachmentId, 'attachment:', props.attachment, 'fileType:', fileType.value)
    
    if (!attachmentId) {
      throw new Error('無法獲取附件 ID')
    }

    const blob = await knowledgeStore.downloadAttachment(attachmentId)
    if (!blob || blob.size === 0) {
      throw new Error('附件為空或下載失敗')
    }

    if (blob.type === 'application/json' || blob.type === 'text/json') {
      const textResult = await blob.text()
      try {
        const json = JSON.parse(textResult)
        throw new Error(json.message || json.error || '附件下載失敗')
      } catch (e) {
        throw new Error('附件下載失敗')
      }
    }

    if (blobUrl.value && blobUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl.value)
    }
    blobUrl.value = null
    textContent.value = ''
    pdfData.value = null

    if (fileType.value === 'pdf') {
      const arrayBuffer = await blob.arrayBuffer()
      pdfData.value = new Uint8Array(arrayBuffer)
    } else if (fileType.value === 'image') {
      blobUrl.value = URL.createObjectURL(blob)
    } else if (fileType.value === 'text') {
      textContent.value = await blob.text()
    }
  } catch (err) {
    error.value = err.message || '載入附件失敗'
    console.error('[AttachmentPreview] 載入附件失敗:', err)
  } finally {
    loading.value = false
  }
}

const handleDownload = async () => {
  if (!props.attachment) return

  downloading.value = true
  try {
    // 使用統一的 getAttachmentId 函數
    const attachmentId = getAttachmentId(props.attachment)
    console.log('[AttachmentPreview] handleDownload - attachmentId:', attachmentId)
    
    if (!attachmentId) {
      throw new Error('無法獲取附件 ID')
    }

    const blob = await knowledgeStore.downloadAttachment(attachmentId)
    if (!blob || blob.size === 0) {
      throw new Error('附件為空或下載失敗')
    }

    const fileName = getAttachmentName(props.attachment)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    error.value = err.message || '下載附件失敗'
    console.error('下載附件失敗:', err)
  } finally {
    downloading.value = false
  }
}

const handleRetry = () => {
  loadAttachment()
}

// 支持多種 ID 字段名稱的輔助函數
const getAttachmentId = (attachment) => {
  if (!attachment) return null
  return attachment.id || 
         attachment.attachment_id || 
         attachment.document_id || 
         attachment.file_id
}

watch(
  () => props.attachment,
  (newAttachment, oldAttachment) => {
    const newId = getAttachmentId(newAttachment)
    const oldId = getAttachmentId(oldAttachment)
    
    console.log('[AttachmentPreview] watch attachment change - newId:', newId, 'oldId:', oldId, 'newAttachment:', newAttachment)
    
    if (newId !== oldId || (newAttachment && !oldAttachment)) {
      console.log('[AttachmentPreview] Triggering loadAttachment, newId:', newId)
      loadAttachment()
    }
  },
  { immediate: true, deep: true }
)

onUnmounted(() => {
  if (blobUrl.value && blobUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = null
  }
  pdfData.value = null
})
</script>

<style scoped>
.attachment-preview {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 0 !important;
  min-height: 0 !important;
  flex: 1 !important;
}

.attachment-preview :deep(.ant-spin-container),
.attachment-preview :deep(.ant-spin-nested-loading) {
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

.text-preview {
  width: 100%;
  height: 100%;
  flex: 1;
  background: #fafafa;
  border: none;
  border-radius: 4px;
  padding: 12px;
  overflow: auto;
}

.text-preview pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
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
  margin-bottom: 24px;
}

.file-info {
  text-align: center;
  margin-bottom: 24px;
}

.file-name {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
  word-break: break-all;
}

.file-size {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.file-type {
  font-size: 12px;
  color: #999;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}
</style>

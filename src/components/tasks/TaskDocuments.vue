<template>
  <a-card style="margin-bottom: 24px">
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
    
    <template #title>
      <span>任務文檔</span>
    </template>
    <template #extra>
      <a-upload
        :before-upload="handleBeforeUpload"
        :custom-request="handleUpload"
        :show-upload-list="false"
        accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc"
      >
        <a-button type="primary" size="small">
          <template #icon>
            <UploadOutlined />
          </template>
          上傳文檔
        </a-button>
      </a-upload>
    </template>

    <a-spin :spinning="loading">
      <a-empty v-if="!loading && documents.length === 0" description="尚無文檔" />

      <a-table
        v-else
        :data-source="documents"
        :columns="columns"
        :pagination="false"
        :row-key="(record) => record.document_id || record.documentId || record.id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'fileSize'">
            {{ formatFileSize(record.file_size || record.fileSize || 0) }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTime(record.created_at || record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space size="small">
              <a-button type="link" size="small" @click="handleDownload(record)">
                下載
              </a-button>
              <a-button type="link" size="small" @click="handleViewInKnowledge(record)">
                查看知識庫
              </a-button>
              <a-button type="link" danger size="small" @click="handleDelete(record)">
                刪除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-spin>
  </a-card>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePageAlert } from '@/composables/usePageAlert'
import { UploadOutlined } from '@ant-design/icons-vue'
import { useTaskStore } from '@/stores/tasks'
import { formatFileSize, formatDateTime } from '@/utils/formatters'

const props = defineProps({
  taskId: {
    type: [String, Number],
    required: true
  },
  documents: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['upload-success', 'delete-success'])

const store = useTaskStore()
const router = useRouter()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 上傳進度
const uploadProgress = ref(0)

// 表格列定義
const columns = [
  {
    title: '文件名稱',
    dataIndex: 'file_name',
    key: 'fileName',
    width: 200,
    ellipsis: true
  },
  {
    title: '文件類型',
    dataIndex: 'file_type',
    key: 'fileType',
    width: 100
  },
  {
    title: '文件大小',
    key: 'fileSize',
    width: 100
  },
  {
    title: '上傳時間',
    key: 'createdAt',
    width: 150
  },
  {
    title: '上傳人',
    dataIndex: 'uploader_name',
    key: 'uploaderName',
    width: 120
  },
  {
    title: '操作',
    key: 'action',
    width: 220,
  }
]

// 上傳前驗證
const handleBeforeUpload = (file) => {
  // 驗證文件類型
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
  
  const isValidType = allowedTypes.includes(file.type) || 
    /\.(pdf|jpg|jpeg|png|xlsx|xls|docx|doc)$/i.test(file.name)
  
  if (!isValidType) {
    showError('不支持的文件類型，請上傳 PDF、圖片、Excel 或 Word 文檔')
    return false
  }
  
  // 驗證文件大小（50MB）
  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    showError('文件大小不能超過 50MB')
    return false
  }
  
  return true
}

// 處理上傳
const handleUpload = async ({ file, onProgress, onSuccess, onError }) => {
  try {
    uploadProgress.value = 0
    
    // 創建進度回調
    const progressCallback = (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        uploadProgress.value = percent
        onProgress({ percent })
      }
    }
    
    await store.uploadTaskDocument(props.taskId, file, progressCallback)
    showSuccess('上傳成功')
    onSuccess()
    emit('upload-success')
  } catch (err) {
    showError(err.message || '上傳失敗')
    onError(err)
  }
}

// 處理下載
const handleDownload = async (record) => {
  try {
    const fileUrl = record.file_url || record.fileUrl
    const fileName = record.file_name || record.fileName || 'file'
    
    if (!fileUrl) {
      showError('文件 URL 不存在')
      return
    }
    
    // 創建下載連結
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    showError('下載失敗：' + err.message)
  }
}

// 處理刪除
const handleDelete = async (record) => {
  try {
    const documentId = record.document_id || record.documentId || record.id
    await store.deleteTaskDocument(props.taskId, documentId)
    showSuccess('刪除成功')
    emit('delete-success')
  } catch (err) {
    showError(err.message || '刪除失敗')
  }
}
const handleViewInKnowledge = (record) => {
  const query = {
    taskId: props.taskId ? String(props.taskId) : undefined,
    returnTo: `/tasks/${props.taskId}`,
  }

  Object.keys(query).forEach((key) => {
    if (query[key] === undefined || query[key] === null) {
      delete query[key]
    }
  })

  router.push({ path: '/knowledge/attachments', query })
}
</script>


<template>
  <div class="attachment-list">
    <!-- 表格 -->
    <a-table
      v-if="!loading && attachments.length > 0"
      :columns="columns"
      :data-source="attachments"
      :loading="loading"
      :row-key="getRowKey"
      :pagination="false"
      :row-class-name="getRowClassName"
      :custom-row="customRow"
      size="middle"
      class="attachment-table"
    >
      <!-- 文件名稱 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'filename'">
          <div class="filename-cell">
            <FileOutlined class="file-icon" />
            <span class="filename-text" :title="getFilename(record)">
              {{ getFilename(record) }}
            </span>
          </div>
        </template>
      </template>
    </a-table>
    
    <!-- 分頁 -->
    <div 
      v-if="!loading && attachments.length > 0 && pagination.total > pagination.pageSize" 
      class="pagination-wrapper"
    >
      <a-pagination
        v-model:current="currentPage"
        v-model:page-size="currentPageSize"
        :total="pagination.total"
        :show-total="(total) => `共 ${total} 筆`"
        :show-size-changer="true"
        :page-size-options="['10', '20', '50', '100']"
        @change="handlePageChange"
        @show-size-change="handlePageSizeChange"
      />
    </div>
    
    <!-- 空狀態 - 只在沒有附件時顯示，避免與表格的 No data 重複 -->
    <a-empty
      v-if="!loading && attachments.length === 0"
      description="尚無附件"
      style="padding: 40px 0"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { FileOutlined } from '@ant-design/icons-vue'
import { formatFileSize as formatFileSizeUtil, formatDateTime as formatDateTimeUtil } from '@/utils/formatters'

const props = defineProps({
  attachments: {
    type: Array,
    required: true,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    required: true,
    default: () => ({
      current: 1,
      pageSize: 20,
      total: 0
    })
  },
  selectedAttachmentId: {
    type: [String, Number],
    default: undefined
  }
})

const emit = defineEmits(['attachment-click', 'page-change', 'page-size-change'])

// 本地分頁狀態
const currentPage = ref(props.pagination.current)
const currentPageSize = ref(props.pagination.pageSize)

// 同步 props 變化
watch(() => props.pagination.current, (val) => {
  currentPage.value = val
})

watch(() => props.pagination.pageSize, (val) => {
  currentPageSize.value = val
})

// 表格列定義 - 只顯示文件名稱
const columns = [
  {
    title: '文件名稱',
    key: 'filename',
    dataIndex: 'filename',
    ellipsis: {
      showTitle: true
    }
  }
]

// 獲取行 key
const getRowKey = (record) => {
  return record.attachment_id || record.id || record.document_id || record.file_id
}

// 獲取行類名（用於高亮選中行）
const getRowClassName = (record) => {
  const id = getRowKey(record)
  const selectedId = props.selectedAttachmentId
  if (selectedId !== undefined && String(id) === String(selectedId)) {
    return 'attachment-row-selected'
  }
  return 'attachment-row'
}

// 處理行點擊
const handleRowClick = (record) => {
  console.log('[AttachmentList] handleRowClick called:', record)
  emit('attachment-click', record)
}

// 自定義行屬性 - 使用 customRow 確保點擊事件正確觸發
const customRow = (record) => {
  return {
    onClick: () => {
      console.log('[AttachmentList] customRow onClick triggered:', record)
      handleRowClick(record)
    }
  }
}

// 獲取文件名稱
const getFilename = (record) => {
  return record.filename || record.name || record.file_name || record.original_name || '未命名附件'
}

// 獲取實體類型標籤
const getEntityTypeLabel = (record) => {
  const type = record.entity_type || record.entityType
  const labels = {
    task: '任務',
    client: '客戶',
    sop: 'SOP',
    receipt: '收據'
  }
  return labels[type] || type || '—'
}

// 獲取實體類型顏色
const getEntityTypeColor = (record) => {
  const type = record.entity_type || record.entityType
  const colors = {
    task: 'blue',
    client: 'cyan',
    sop: 'orange',
    receipt: 'green'
  }
  return colors[type] || 'default'
}

// 獲取實體ID
const getEntityId = (record) => {
  return record.entity_id || record.entityId || '—'
}

// 獲取上傳者名稱
const getUploaderName = (record) => {
  return record.uploader_name || record.uploaderName || '—'
}

// 格式化文件大小
const formatFileSize = (record) => {
  const size = record.size_bytes || record.sizeBytes || record.size || record.file_size || 0
  return formatFileSizeUtil(size)
}

// 格式化日期時間
const formatDateTime = (record) => {
  const dateStr = record.uploaded_at || record.uploadedAt || record.created_at || record.createdAt
  if (!dateStr) return '—'
  return formatDateTimeUtil(dateStr)
}

// 獲取文件類型標籤
const getContentTypeLabel = (record) => {
  const contentType = record.content_type || record.contentType || record.mime_type || record.type || ''
  const filename = getFilename(record)
  
  // 從文件名提取擴展名
  const ext = filename.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || ''
  
  // 根據 content_type 或擴展名判斷類型
  if (contentType.includes('pdf') || ext === 'pdf') return 'PDF'
  if (contentType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '圖片'
  if (contentType.includes('excel') || contentType.includes('spreadsheet') || ['xls', 'xlsx'].includes(ext)) return 'Excel'
  if (contentType.includes('word') || contentType.includes('document') || ['doc', 'docx'].includes(ext)) return 'Word'
  if (contentType.includes('text') || ext === 'txt') return '文字'
  
  return ext.toUpperCase() || '未知'
}

// 處理分頁變更
const handlePageChange = (page, pageSize) => {
  currentPage.value = page
  currentPageSize.value = pageSize
  emit('page-change', { page, pageSize })
}

// 處理每頁顯示筆數變更
const handlePageSizeChange = (current, size) => {
  currentPage.value = 1 // 切換頁大小時重置到第一頁
  currentPageSize.value = size
  emit('page-size-change', { page: 1, pageSize: size })
}
</script>

<style scoped>
.attachment-list {
  width: 100%;
}

.attachment-table {
  width: 100%;
}

.attachment-table :deep(.ant-table-tbody > tr.attachment-row) {
  cursor: pointer;
  transition: background-color 0.2s;
}

.attachment-table :deep(.ant-table-tbody > tr.attachment-row:hover) {
  background-color: #f5f5f5;
}

.attachment-table :deep(.ant-table-tbody > tr.attachment-row-selected) {
  background-color: #e6f7ff;
}

.attachment-table :deep(.ant-table-tbody > tr.attachment-row-selected:hover) {
  background-color: #bae7ff;
}

.filename-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 16px;
  color: #1890ff;
  flex-shrink: 0;
}

.filename-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-family: 'Courier New', monospace;
  color: #666;
}

.pagination-wrapper {
  margin-top: 16px;
  text-align: right;
  padding: 0 8px;
}
</style>

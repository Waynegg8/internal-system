<template>
  <a-card title="已上傳記錄">
    <template #extra>
      <a-button size="small" @click="handleRefresh">
        <template #icon>
          <reload-outlined />
        </template>
        刷新
      </a-button>
    </template>
    
    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="records"
        :pagination="false"
        :row-key="getRowKey"
        size="small"
        :scroll="{ y: 600 }"
        :row-class-name="getRowClassName"
        :custom-row="customRow"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'month'">
            {{ record.month }}
          </template>
          
          <template v-else-if="column.key === 'file'">
            <div>
              <div style="font-weight: 500; font-size: 0.875rem;">
                {{ getField(record, 'fileName', 'file_name') }}
              </div>
              <div style="font-size: 0.75rem; color: #6b7280; margin-top: 2px;">
                {{ formatFileSize(getField(record, 'fileSizeBytes', 'file_size_bytes')) }}
                <span v-if="getField(record, 'notes')">
                  • {{ getField(record, 'notes') }}
                </span>
              </div>
            </div>
          </template>
          
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                type="link"
                size="small"
                @click.stop="handleDownload(record)"
              >
                <template #icon>
                  <download-outlined />
                </template>
              </a-button>
              <a-button
                type="link"
                size="small"
                danger
                @click.stop="handleDelete(record)"
              >
                <template #icon>
                  <delete-outlined />
                </template>
              </a-button>
            </a-space>
          </template>
        </template>
        
        <template #emptyText>
          <a-empty description="尚無上傳記錄" />
        </template>
      </a-table>
    </a-spin>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { ReloadOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { formatFileSize } from '@/utils/formatters'

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['preview', 'download', 'delete', 'refresh'])

// 表格列定義
const columns = [
  {
    title: '月份',
    key: 'month',
    dataIndex: 'month',
    width: 100
  },
  {
    title: '檔案',
    key: 'file',
    dataIndex: 'file',
    ellipsis: true
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    align: 'center'
  }
]

// 獲取行 key
const getRowKey = (record) => {
  return record.recordId || record.record_id || record.id
}

// 獲取字段值（支持 snake_case 和 camelCase）
const getField = (record, camelKey, snakeKey) => {
  return record[camelKey] || record[snakeKey] || ''
}

// 判斷是否支持預覽
const canPreview = (record) => {
  const fileType = getField(record, 'fileType', 'file_type') || ''
  const fileName = getField(record, 'fileName', 'file_name') || ''
  
  // PDF 或圖片類型
  if (fileType.includes('pdf') || fileType.includes('image') || fileType.startsWith('image/')) {
    return true
  }
  
  // 根據檔案名稱判斷
  const lowerFileName = fileName.toLowerCase()
  if (lowerFileName.endsWith('.pdf') || 
      lowerFileName.endsWith('.jpg') || 
      lowerFileName.endsWith('.jpeg') || 
      lowerFileName.endsWith('.png')) {
    return true
  }
  
  return false
}

// 處理行點擊
const handleRowClick = (record) => {
  if (canPreview(record)) {
    emit('preview', record)
  }
}

// 自定義行屬性
const customRow = (record) => {
  return {
    onClick: () => handleRowClick(record)
  }
}

// 處理下載
const handleDownload = (record) => {
  const recordId = getField(record, 'recordId', 'record_id')
  const fileName = getField(record, 'fileName', 'file_name')
  emit('download', recordId, fileName)
}

// 處理刪除
const handleDelete = (record) => {
  const recordId = getField(record, 'recordId', 'record_id')
  emit('delete', recordId)
}

// 處理刷新
const handleRefresh = () => {
  emit('refresh')
}

// 獲取行的 class name（用於可點擊行的樣式）
const getRowClassName = (record) => {
  return canPreview(record) ? 'clickable-row' : ''
}
</script>

<style scoped>
:deep(.ant-table-tbody > tr) {
  cursor: default;
}

:deep(.ant-table-tbody > tr:hover) {
  background-color: #f5f5f5;
}

:deep(.ant-table-tbody > tr.clickable-row) {
  cursor: pointer;
}

:deep(.ant-table-tbody > tr.clickable-row:hover) {
  background-color: #e6f7ff;
}
</style>


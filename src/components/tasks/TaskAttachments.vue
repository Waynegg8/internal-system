<template>
  <a-card style="margin-bottom: 24px">
    <template #title>
      <span>任務附件</span>
    </template>
    <template #extra>
      <a-space>
        <!-- 上傳附件按鈕 -->
        <a-button type="primary" size="small" @click="handleOpenUploadDrawer">
          <template #icon>
            <UploadOutlined />
          </template>
          上傳附件
        </a-button>
        <!-- 查看知識庫按鈕 - 只在有附件時顯示 -->
        <a-button 
          v-if="hasAttachments" 
          size="small" 
          @click="handleViewInKnowledge"
        >
          <template #icon>
            <FileTextOutlined />
          </template>
          查看知識庫
        </a-button>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <!-- 附件列表組件 -->
      <AttachmentList
        :attachments="attachments"
        :loading="loading"
        :pagination="{
          current: pagination.page,
          pageSize: pagination.perPage,
          total: pagination.total
        }"
        :selected-attachment-id="selectedAttachmentId"
        @attachment-click="handleAttachmentClick"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      />
    </a-spin>

    <!-- 附件預覽 Modal -->
    <a-modal
      v-model:open="previewModalVisible"
      :title="currentAttachment ? getAttachmentTitle(currentAttachment) : '附件預覽'"
      :width="800"
      :footer="null"
      @cancel="handleClosePreview"
    >
      <template #extra v-if="currentAttachment">
        <a-space>
          <a-button type="primary" size="small" @click="handleDownload(currentAttachment)">
            下載
          </a-button>
        </a-space>
      </template>
      
      <div v-if="currentAttachment" style="min-height: 400px">
        <AttachmentPreview :attachment="currentAttachment" />
      </div>
    </a-modal>

    <!-- 附件上傳抽屜 -->
    <AttachmentUploadDrawer
      :visible="uploadDrawerVisible"
      :entity-type="'task'"
      :entity-id="String(props.taskId)"
      :title="'上傳任務附件'"
      @update:visible="uploadDrawerVisible = $event"
      @close="handleUploadDrawerClose"
      @success="handleUploadSuccess"
    />
  </a-card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { FileTextOutlined, UploadOutlined } from '@ant-design/icons-vue'
import AttachmentList from '@/components/attachments/AttachmentList.vue'
import AttachmentPreview from '@/components/knowledge/AttachmentPreview.vue'
import AttachmentUploadDrawer from '@/components/attachments/AttachmentUploadDrawer.vue'
import { fetchAttachments, downloadAttachment } from '@/api/attachments'
import { extractApiData, extractApiArray } from '@/utils/apiHelpers'
import { usePageAlert } from '@/composables/usePageAlert'

const props = defineProps({
  taskId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['attachment-click'])

const router = useRouter()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 狀態
const loading = ref(false)
const attachments = ref([])
const pagination = ref({
  page: 1,
  perPage: 20,
  total: 0
})
const selectedAttachmentId = ref(undefined)
const currentAttachment = ref(null)
const previewModalVisible = ref(false)
const uploadDrawerVisible = ref(false)

// 計算是否有附件
const hasAttachments = computed(() => attachments.value && attachments.value.length > 0)

// 載入附件列表
const loadAttachments = async () => {
  if (!props.taskId) return

  loading.value = true
  try {
    const response = await fetchAttachments({
      entity_type: 'task',
      entity_id: String(props.taskId),
      page: pagination.value.page,
      perPage: pagination.value.perPage
    })

    // 處理 API 響應格式
    const responseData = response?.data || response
    let attachmentsData = []
    let total = 0
    let page = 1
    let perPage = 20

    if (responseData?.attachments && Array.isArray(responseData.attachments)) {
      attachmentsData = responseData.attachments
      total = responseData.total || 0
      page = responseData.page || pagination.value.page
      perPage = responseData.perPage || responseData.per_page || pagination.value.perPage
    } else if (Array.isArray(responseData)) {
      attachmentsData = responseData
      total = responseData.length
    } else {
      attachmentsData = extractApiArray(response, [])
      total = response?.meta?.total || response?.total || attachmentsData.length
    }

    attachments.value = attachmentsData
    pagination.value.page = page
    pagination.value.perPage = perPage
    pagination.value.total = total
  } catch (error) {
    console.error('載入任務附件列表失敗:', error)
    showError('載入附件列表失敗')
    attachments.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

// 處理附件點擊
const handleAttachmentClick = (attachment) => {
  currentAttachment.value = attachment
  selectedAttachmentId.value = getAttachmentId(attachment)
  previewModalVisible.value = true
  emit('attachment-click', attachment)
}

// 處理關閉預覽
const handleClosePreview = () => {
  previewModalVisible.value = false
  currentAttachment.value = null
  selectedAttachmentId.value = undefined
}

// 處理下載
const handleDownload = async (attachment) => {
  try {
    const attachmentId = getAttachmentId(attachment)
    if (!attachmentId) {
      showError('附件 ID 不存在')
      return
    }

    const blob = await downloadAttachment(attachmentId)
    
    if (!blob || blob.size === 0) {
      showError('下載失敗：文件為空')
      return
    }
    
    // 創建下載連結
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getAttachmentTitle(attachment)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    showSuccess('下載成功')
  } catch (error) {
    console.error('下載附件失敗:', error)
    showError('下載失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理分頁變更
const handlePageChange = ({ page, pageSize }) => {
  pagination.value.page = page
  pagination.value.perPage = pageSize
  loadAttachments()
}

// 處理每頁顯示筆數變更
const handlePageSizeChange = ({ page, pageSize }) => {
  pagination.value.page = page
  pagination.value.perPage = pageSize
  loadAttachments()
}

// 處理打開上傳抽屜
const handleOpenUploadDrawer = () => {
  if (!props.taskId) {
    showError('任務 ID 不存在')
    return
  }
  uploadDrawerVisible.value = true
}

// 處理上傳抽屜關閉
const handleUploadDrawerClose = () => {
  uploadDrawerVisible.value = false
}

// 處理上傳成功
const handleUploadSuccess = async () => {
  showSuccess('附件上傳成功')
  // 重新載入附件列表
  await loadAttachments()
}

// 處理查看知識庫 - 只在有附件時顯示
const handleViewInKnowledge = () => {
  if (!props.taskId) {
    showError('任務 ID 不存在')
    return
  }

  const query = {
    taskId: String(props.taskId),
    returnTo: `/tasks/${props.taskId}`,
    tab: 'attachments'
  }

  // 跳轉到知識庫附件頁面，帶上 taskId 參數以自動篩選該任務的附件
  // 附件系統專為任務服務，自動跳轉到知識庫附件tab並篩選該任務的附件
  router.push({ path: '/knowledge/attachments', query })
}

// 獲取附件標題
const getAttachmentTitle = (attachment) => {
  return attachment.filename || attachment.name || attachment.file_name || attachment.original_name || '未命名附件'
}

// 獲取附件ID
const getAttachmentId = (attachment) => {
  if (!attachment) return undefined
  return attachment.attachment_id || attachment.id || attachment.document_id || attachment.file_id
}

// 監聽 taskId 變化
watch(
  () => props.taskId,
  (newTaskId) => {
    if (newTaskId) {
      pagination.value.page = 1
      loadAttachments()
    }
  },
  { immediate: true }
)

// 組件掛載時載入數據
onMounted(() => {
  if (props.taskId) {
    loadAttachments()
  }
})
</script>

<style scoped>
/* 可以添加自定義樣式 */
</style>

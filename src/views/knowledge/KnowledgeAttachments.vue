<template>
  <div class="knowledge-attachments-content">
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

    <!-- 任務篩選橫幅 - 從任務詳情頁跳轉過來時顯示 -->
    <div v-if="taskFilterId" class="task-filter-banner">
      <a-space size="small">
        <a-tag color="blue">任務 {{ taskFilterId }}</a-tag>
        <span>目前僅顯示此任務的附件</span>
        <a-button size="small" type="primary" @click="handleReturnToTask">
          <template #icon>
            <ArrowLeftOutlined />
          </template>
          回到任務
        </a-button>
      </a-space>
    </div>
    
    <!-- 收起狀態的展開按鈕 -->
    <div v-if="listCollapsed" class="collapsed-toggle">
      <a-button
        type="primary"
        :icon="h(MenuUnfoldOutlined)"
        @click="toggleListCollapse"
        size="small"
      >
        展開列表
      </a-button>
    </div>
    
    <a-row :gutter="8" class="attachments-row">
      <!-- 左側：附件列表 -->
      <a-col v-if="!listCollapsed" :span="listColSpan" class="attachment-list-col">
        <a-card :bordered="false">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>附件列表</span>
              <a-button
                type="text"
                :icon="h(MenuFoldOutlined)"
                @click="toggleListCollapse"
              />
            </div>
          </template>

          <!-- 附件列表組件 -->
          <AttachmentList
            :attachments="attachments"
            :loading="attachmentLoading"
            :pagination="{
              current: attachmentPagination.page,
              pageSize: attachmentPagination.perPage,
              total: attachmentPagination.total
            }"
            :selected-attachment-id="currentAttachment ? getAttachmentId(currentAttachment) : undefined"
            @attachment-click="handleViewAttachment"
            @page-change="handlePaginationChange"
            @page-size-change="handlePageSizeChange"
          />
        </a-card>
      </a-col>

      <!-- 右側：預覽區域 -->
      <a-col :span="previewColSpan" class="attachment-preview-col">
        <a-card :bordered="false">
          <template #title>
            <div v-if="currentAttachment">
              <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ getAttachmentTitle(currentAttachment) }}</span>
            </div>
            <span v-else>附件詳情</span>
          </template>
          
          <!-- 操作按鈕區域 -->
          <template #extra v-if="currentAttachment">
            <a-space>
              <a-button type="primary" size="small" @click="handleDownloadAttachment(currentAttachment)">
                下載
              </a-button>
              <a-button danger size="small" @click="handleDeleteAttachment(currentAttachment)">刪除</a-button>
            </a-space>
          </template>

          <!-- 預覽內容 -->
          <div v-if="currentAttachment" class="attachment-preview-wrapper">
            <AttachmentPreview :attachment="currentAttachment" />
          </div>

          <!-- 空狀態 -->
          <a-empty
            v-else
            description="點擊左側附件查看詳情，支援線上預覽 PDF、圖片等格式"
            style="padding: 40px 0"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 附件上傳抽屜 - 已移除，附件系統專為任務服務，必須從任務詳情頁上傳 -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { FileOutlined, MenuFoldOutlined, MenuUnfoldOutlined, ArrowLeftOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import AttachmentPreview from '@/components/knowledge/AttachmentPreview.vue'
// 附件上傳功能已移除 - 附件系統專為任務服務，必須從任務詳情頁上傳
import AttachmentList from '@/components/attachments/AttachmentList.vue'

// Store
const knowledgeStore = useKnowledgeStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()
const {
  attachments,
  currentAttachment,
  attachmentPagination,
  attachmentLoading,
  attachmentFilters: storeAttachmentFilters
} = storeToRefs(knowledgeStore)

// 附件上傳功能已移除 - 附件系統專為任務服務
// const addAttachmentTrigger = inject('addAttachmentTrigger', ref(0))

// Local state
const listCollapsed = ref(false)
// const drawerVisible = ref(false) // 已移除上傳功能
const route = useRoute()
const router = useRouter()

// 確保 storeAttachmentFilters 存在且有值
const safeAttachmentFilters = computed(() => {
  if (!storeAttachmentFilters || !storeAttachmentFilters.value) {
    return { q: '', client: '', type: '', taskId: '' }
  }
  return storeAttachmentFilters.value
})

// 列表列寬度（左側 8 列，右側 16 列，右側佔約 67% 以舒適顯示 A4 文件）
const listColSpan = computed(() => listCollapsed.value ? 0 : 8)
const previewColSpan = computed(() => listCollapsed.value ? 24 : 16)
const taskFilterId = computed(() => safeAttachmentFilters.value?.taskId || '')
const returnToTaskPath = computed(() => route.query.returnTo || (taskFilterId.value ? `/tasks/${taskFilterId.value}` : ''))


// 切換列表收合
const toggleListCollapse = () => {
  listCollapsed.value = !listCollapsed.value
}

// 獲取附件標題（支持多種字段名格式）
const getAttachmentTitle = (attachment) => {
  return attachment.name || attachment.filename || attachment.title || attachment.original_name || '未命名附件'
}

// 獲取附件ID（支持多種字段名格式）
const getAttachmentId = (attachment) => {
  if (!attachment) return undefined
  return attachment.attachment_id || attachment.id || attachment.document_id || attachment.file_id
}

// 獲取附件類型
const getAttachmentType = (attachment) => {
  return attachment.type || attachment.attachment_type || attachment.category
}

// 獲取附件類型標籤
const getAttachmentTypeLabel = (attachment) => {
  const type = getAttachmentType(attachment)
  const typeLabels = {
    task: '任務附件',
    client: '客戶附件',
    service: '服務附件',
    other: '其他'
  }
  return typeLabels[type] || type
}

// 格式化文件大小
const formatFileSize = (attachment) => {
  const size = attachment.size || attachment.file_size || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// 格式化上傳時間
const formatUploadTime = (attachment) => {
  const time = attachment.created_at || attachment.upload_time || attachment.updated_at
  if (!time) return '未知時間'
  return new Date(time).toLocaleString('zh-TW')
}

// 獲取附件關聯信息
const getAttachmentRelation = (attachment) => {
  if (attachment.task_name) return `任務: ${attachment.task_name}`
  if (attachment.client_name) return `客戶: ${attachment.client_name}`
  if (attachment.service_name) return `服務: ${attachment.service_name}`
  return ''
}

// 檢查是否為當前附件
const isCurrentAttachment = (attachment) => {
  if (!currentAttachment.value) return false
  return getAttachmentId(attachment) === getAttachmentId(currentAttachment.value)
}

// 處理查看附件
const handleViewAttachment = (attachment) => {
  console.log('[KnowledgeAttachments] handleViewAttachment called:', attachment)
  if (!attachment) {
    console.warn('[KnowledgeAttachments] No attachment provided')
    return
  }
  
  // 使用 store 的方法設置當前附件
  knowledgeStore.setCurrentAttachment(attachment)
  console.log('[KnowledgeAttachments] currentAttachment set to:', knowledgeStore.currentAttachment)
  console.log('[KnowledgeAttachments] Attachment ID:', getAttachmentId(attachment))
}

// 處理下載附件
const handleDownloadAttachment = async (attachment) => {
  try {
    const attachmentId = getAttachmentId(attachment)
    const blob = await knowledgeStore.downloadAttachment(attachmentId)
    
    // 創建下載鏈接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getAttachmentTitle(attachment)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    showSuccess('附件下載成功')
  } catch (error) {
    console.error('下載附件失敗:', error)
    showError(error.message || '下載附件失敗')
  }
}

// 處理刪除附件
const handleDeleteAttachment = async (attachment) => {
  try {
    const attachmentId = getAttachmentId(attachment)
    await knowledgeStore.deleteAttachment(attachmentId)
    showSuccess('附件刪除成功')
    // 如果刪除的是當前選中的附件，清除選中
    if (currentAttachment.value && getAttachmentId(currentAttachment.value) === attachmentId) {
      currentAttachment.value = null
    }
    // 重新載入列表
    await loadAttachments()
  } catch (error) {
    console.error('刪除附件失敗:', error)
    showError(error.message || '刪除附件失敗')
  }
}

// 附件上傳功能已移除 - 附件系統專為任務服務
// 抽屜關閉
// const handleDrawerClose = () => {
//   drawerVisible.value = false
// }

// 抽屜上傳成功
// const handleDrawerSuccess = async () => {
//   // 重置分頁到第一頁，確保能看到新上傳的附件
//   knowledgeStore.setAttachmentPagination({ page: 1 })
//   // 延遲重新載入列表，讓上傳的附件對象有時間被添加到 store
//   setTimeout(async () => {
//     await loadAttachments()
//   }, 100)
// }

// 監聽 KnowledgeLayout 的篩選變化（通過 store 的 filters）
// 附件系統專為任務服務，只使用關鍵字篩選
// 任務篩選通過 URL 參數 taskId 自動設置，不需要用戶手動選擇
const { filters: layoutFilters, activeTab } = storeToRefs(knowledgeStore)

watch(
  () => layoutFilters.value,
  async (newFilters) => {
    // 只在附件 tab 且沒有任務篩選時才響應全局關鍵字篩選
    // 當有任務篩選時，優先使用任務篩選
    if (activeTab.value === 'attachments' && !taskFilterId.value && newFilters) {
      knowledgeStore.setAttachmentFilters({
        q: newFilters.q || ''
      })
      knowledgeStore.setAttachmentPagination({ page: 1 })
      await loadAttachments()
    }
  },
  { deep: true }
)

// 監聽附件列表變化，當從任務詳情頁跳轉過來時自動選中第一個附件進行預覽
watch(
  () => attachments.value,
  (newAttachments) => {
    // 當有任務篩選且附件列表載入完成時，自動選中第一個附件進行預覽
    if (taskFilterId.value && newAttachments && newAttachments.length > 0 && !currentAttachment.value) {
      // 延遲一下確保 DOM 已更新
      setTimeout(() => {
        handleViewAttachment(newAttachments[0])
      }, 100)
    }
  },
  { immediate: true }
)

// 處理分頁變更
const handlePaginationChange = ({ page, pageSize }) => {
  knowledgeStore.setAttachmentPagination({ page, perPage: pageSize })
  loadAttachments()
}

// 處理每頁顯示筆數變更
const handlePageSizeChange = ({ page, pageSize }) => {
  knowledgeStore.setAttachmentPagination({ page, perPage: pageSize })
  loadAttachments()
}

// 載入附件列表
const loadAttachments = async () => {
  try {
    await knowledgeStore.fetchAttachments()
  } catch (error) {
    console.error('載入附件列表失敗:', error)
    showError('載入附件列表失敗')
  }
}

// 附件上傳功能已移除 - 附件系統專為任務服務
// 監聽 addAttachmentTrigger 變化，打開上傳抽屜
// watch(
//   () => addAttachmentTrigger.value,
//   () => {
//     if (addAttachmentTrigger.value > 0) {
//       drawerVisible.value = true
//     }
//   }
// )


const applyTaskFilterFromQuery = async () => {
  const taskIdParam = route.query.taskId
  if (taskIdParam) {
    // 設置任務篩選條件 - 附件系統專為任務服務
    knowledgeStore.setAttachmentFilters({
      taskId: String(taskIdParam),
      type: 'task',
      q: safeAttachmentFilters.value?.q || ''
    })
    knowledgeStore.setAttachmentPagination({ page: 1 })
    await loadAttachments()
    
    // 如果有附件，自動選中第一個進行預覽
    if (attachments.value && attachments.value.length > 0 && !currentAttachment.value) {
      handleViewAttachment(attachments.value[0])
    }
  }
}

// 附件系統專為任務服務，不提供清除任務篩選功能
// 用戶必須通過「回到任務」按鈕返回任務詳情頁
// const clearTaskFilter = async () => {
//   const newQuery = { ...route.query }
//   delete newQuery.taskId
//   delete newQuery.returnTo
//   router.replace({ path: route.path, query: newQuery })
//   knowledgeStore.setAttachmentFilters({ taskId: '', type: '' })
//   knowledgeStore.setAttachmentPagination({ page: 1 })
//   await loadAttachments()
// }

const handleReturnToTask = () => {
  if (!taskFilterId.value) return
  const path = returnToTaskPath.value || `/tasks/${taskFilterId.value}`
  router.push(path)
}

watch(
  () => route.query.taskId,
  async (newTaskId, oldTaskId) => {
    if (newTaskId && newTaskId !== oldTaskId) {
      await applyTaskFilterFromQuery()
    }
    if (!newTaskId && oldTaskId) {
      knowledgeStore.setAttachmentFilters({ taskId: '' })
      await loadAttachments()
    }
  }
)

// 載入數據
onMounted(async () => {
  // 如果有 taskId 查詢參數，自動應用任務篩選
  if (route.query.taskId) {
    await applyTaskFilterFromQuery()
  } else {
    await loadAttachments()
  }
})

// 監聽路由查詢參數變化，特別是 tab 參數
watch(
  () => [route.query.tab, route.query.taskId],
  (newValues, oldValues) => {
    const [newTab, newTaskId] = newValues || []
    const [oldTab, oldTaskId] = oldValues || []
    if (newTab === 'attachments' && newTaskId && newTaskId !== oldTaskId) {
      // 當切換到附件 tab 且有 taskId 時，自動應用任務篩選
      applyTaskFilterFromQuery()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.knowledge-attachments-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
}

.task-filter-banner {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f0f7ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  display: inline-block;
}

.collapsed-toggle {
  position: absolute;
  top: 72px; /* 移到標題下方，避免遮擋 */
  left: 16px;
  z-index: 10;
}

/* 確保展開按鈕不會擋住任何內容 */
.collapsed-toggle button {
  margin: 0;
}

.attachments-row {
  flex: 1;
  display: flex;
  gap: 12px;
  align-items: stretch;
  min-height: 0;
}

.attachment-list-col,
.attachment-preview-col {
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.attachment-preview-col :deep(.ant-card) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.attachment-preview-col :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.attachment-item-active {
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.attachment-preview-wrapper {
  flex: 1;
  min-height: 1000px; /* 確保預覽區域至少有 1000px 高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 由內部組件處理滾動 */
}
</style>


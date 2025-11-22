<template>
  <div class="knowledge-resources-content">
    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 16px; flex-shrink: 0"
    />

    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px; flex-shrink: 0"
    />

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

    <a-row :gutter="8" class="resources-row">
      <!-- 左側：文檔列表 -->
      <a-col v-if="!listCollapsed" :span="listColSpan" class="document-list-col">
        <a-card :bordered="false" style="height: 100%">
          <template #title>
            <div class="card-title">
              <span>文檔列表</span>
              <a-space>
                <span v-if="selectedDocumentIds.length > 0" style="color: #1890ff; font-weight: 500">
                  已選擇 {{ selectedDocumentIds.length }} 項
                </span>
                <a-button
                  type="text"
                  :icon="h(MenuFoldOutlined)"
                  @click="toggleListCollapse"
                />
              </a-space>
            </div>
          </template>

          <!-- 批量操作工具欄 -->
          <template #extra v-if="selectedDocumentIds.length > 0">
            <a-space>
              <a-button 
                danger 
                size="small" 
                :icon="h(DeleteOutlined)"
                @click="handleBatchDelete"
                :loading="documentLoading"
              >
                批量刪除 ({{ selectedDocumentIds.length }})
              </a-button>
              <a-button size="small" @click="clearSelection">
                取消選擇
              </a-button>
            </a-space>
          </template>

          <a-spin :spinning="documentLoading">
            <a-list
              v-if="documents.length > 0"
              :data-source="documents"
              :bordered="false"
            >
              <template #renderItem="{ item }">
                <a-list-item
                  :class="{ 
                    'document-item-active': isCurrentDocument(item),
                    'document-item-selected': isDocumentSelected(item)
                  }"
                  class="document-list-item"
                >
                  <template #actions>
                    <a-checkbox
                      :checked="isDocumentSelected(item)"
                      @change="(e) => handleDocumentSelectChange(item, e.target.checked)"
                      @click.stop
                    />
                  </template>
                  <a-list-item-meta @click="handleViewDocument(item)">
                    <template #avatar>
                      <FileOutlined style="font-size: 24px; color: #1890ff" />
                    </template>
                    <template #title>
                      <div class="document-item-header">
                        <span class="document-item-title">{{ getDocumentTitle(item) }}</span>
                        <div class="document-item-tags">
                          <a-tag
                            v-if="getDocumentScopeLabel(item)"
                            color="orange"
                            style="margin: 0"
                          >
                            {{ getDocumentScopeLabel(item) }}
                          </a-tag>
                          <a-tag
                            v-if="getDocumentCategory(item)"
                            color="cyan"
                            style="margin: 0"
                          >
                            {{ getDocumentCategory(item) }}
                          </a-tag>
                          <a-tag
                            v-if="getDocumentYearMonth(item)"
                            color="blue"
                            style="margin: 0"
                          >
                            {{ getDocumentYearMonth(item) }}
                          </a-tag>
                          <a-tag
                            v-if="formatFileSize(item)"
                            color="green"
                            style="margin: 0"
                          >
                            {{ formatFileSize(item) }}
                          </a-tag>
                        </div>
                      </div>
                    </template>
                    <template #description>
                      <div class="document-item-description">
                        <span v-if="item.uploaderName">上傳者：{{ item.uploaderName }}</span>
                        <span v-if="formatUploadTime(item)">
                          上傳時間：{{ formatUploadTime(item) }}
                        </span>
                      </div>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>

            <!-- 空狀態 -->
            <a-empty
              v-else
              description="尚無文檔，請點擊右上角「+ 新增」按鈕上傳"
              style="padding: 40px 0"
            />

            <!-- 分頁 -->
            <div
              v-if="documentPagination.total > documentPagination.perPage"
              style="margin-top: 16px; text-align: center"
            >
              <a-pagination
                v-model:current="documentPagination.page"
                v-model:page-size="documentPagination.perPage"
                :total="documentPagination.total"
                :page-size-options="['10', '20', '50', '100']"
                show-size-changer
                show-total
                @change="handlePaginationChange"
                @show-size-change="handlePaginationChange"
              />
            </div>
          </a-spin>
        </a-card>
      </a-col>

      <!-- 右側：預覽區域 -->
      <a-col :span="previewColSpan" class="document-preview-col">
        <a-card :bordered="false">
          <template #title>
            <div v-if="currentDocument">
              <span class="document-preview-title">{{ getDocumentTitle(currentDocument) }}</span>
            </div>
            <span v-else>文檔詳情</span>
          </template>

          <template #extra v-if="currentDocument">
            <a-space>
              <a-button type="primary" size="small" @click="handleEditDocument(currentDocument)" v-if="canEditDocument(currentDocument)">
                編輯
              </a-button>
              <a-button size="small" @click="handleDownloadDocument(currentDocument)">
                下載
              </a-button>
              <a-button danger size="small" @click="handleDeleteDocument(currentDocument)">
                刪除
              </a-button>
            </a-space>
          </template>

          <div v-if="currentDocument" class="attachment-preview-wrapper">
            <DocumentPreview :document="currentDocument" />
          </div>

          <a-empty
            v-else
            description="點擊左側文檔查看詳情，支援線上預覽 PDF、圖片等格式"
            style="padding: 40px 0"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 文檔上傳抽屜 -->
    <DocumentUploadDrawer
      v-model:visible="drawerVisible"
      :document-id="editingDocumentId"
      @close="handleDrawerClose"
      @success="handleDrawerSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch, h } from 'vue'
import { FileOutlined, MenuFoldOutlined, MenuUnfoldOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { Modal } from 'ant-design-vue'
import DocumentUploadDrawer from '@/components/knowledge/DocumentUploadDrawer.vue'
import DocumentPreview from '@/components/knowledge/DocumentPreview.vue'

const knowledgeStore = useKnowledgeStore()
const authStore = useAuthStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()
const {
  documents,
  currentDocument,
  documentPagination,
  documentLoading,
  filters,
  services
} = storeToRefs(knowledgeStore)

// Inject and local state
const addDocumentTrigger = inject('addDocumentTrigger', ref(0))
const listCollapsed = ref(false)
const drawerVisible = ref(false)
const editingDocumentId = ref(null)
const selectedDocumentIds = ref([])

const listColSpan = computed(() => (listCollapsed.value ? 0 : 8))
const previewColSpan = computed(() => (listCollapsed.value ? 24 : 16))

const toggleListCollapse = () => {
  listCollapsed.value = !listCollapsed.value
}

const getDocumentId = (doc) => doc?.document_id || doc?.documentId || doc?.id

const getDocumentTitle = (doc) => {
  return doc?.title || doc?.document_title || doc?.fileName || doc?.file_name || doc?.name || '無標題'
}

const getDocumentYearMonth = (doc) => {
  if (!doc) return null
  if (doc.docYear && doc.docMonth) {
    return `${doc.docYear}-${String(doc.docMonth).padStart(2, '0')}`
  }
  if (doc.docYear && doc.doc_month) {
    return `${doc.docYear}-${String(doc.doc_month).padStart(2, '0')}`
  }
  if (doc.doc_year && doc.doc_month) {
    return `${doc.doc_year}-${String(doc.doc_month).padStart(2, '0')}`
  }
  if (doc.yearMonth || doc.year_month) {
    return doc.yearMonth || doc.year_month
  }
  return null
}

const getDocumentCategory = (doc) => {
  if (!doc) return null
  const categoryId = doc.category || doc.category_id || doc.service_id
  if (!categoryId) return null

  const service = services.value.find((serviceItem) => {
    const id = serviceItem.id || serviceItem.serviceId || serviceItem.service_id
    return String(id) === String(categoryId)
  })

  if (service) {
    if (typeof service === 'string') return service
    return service.name || service.serviceName || service.service_name || service.title || service.service_title || String(service)
  }

  return null
}

const getDocumentScopeLabel = (doc) => {
  const scope = doc?.scope || doc?.document_scope
  if (scope === 'service') return '服務層級'
  if (scope === 'task') return '任務層級'
  return null
}

const formatFileSize = (doc) => {
  const size = doc?.fileSize ?? doc?.file_size ?? doc?.size ?? 0
  if (!size) return null
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const formatUploadTime = (doc) => {
  const time = doc?.createdAt || doc?.created_at || doc?.updatedAt || doc?.updated_at
  if (!time) return null
  try {
    return new Date(time).toLocaleString('zh-TW')
  } catch (error) {
    return time
  }
}

const isCurrentDocument = (doc) => {
  if (!doc || !currentDocument.value) return false
  return String(getDocumentId(doc)) === String(getDocumentId(currentDocument.value))
}

const handleViewDocument = async (doc) => {
  const docId = getDocumentId(doc)
  if (!docId) return
  try {
    if (currentDocument.value && String(getDocumentId(currentDocument.value)) === String(docId)) {
      return
    }
    await knowledgeStore.fetchDocument(docId)
  } catch (error) {
    console.error('載入文檔詳情失敗:', error)
    knowledgeStore.setCurrentDocument(doc)
  }
}

const handleDownloadDocument = async (doc) => {
  try {
    const docId = getDocumentId(doc)
    if (!docId) {
      throw new Error('無法獲取文檔 ID')
    }
    const blob = await knowledgeStore.downloadDocument(docId)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getDocumentTitle(doc)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showSuccess('文檔下載成功')
  } catch (error) {
    console.error('下載文檔失敗:', error)
    showError(error.message || '下載文檔失敗')
  }
}

const handleDeleteDocument = async (doc) => {
  const docId = getDocumentId(doc)
  if (!docId) return
  try {
    await knowledgeStore.deleteDocument(docId)
    showSuccess('文檔已刪除')
    await loadDocuments()
  } catch (error) {
    console.error('刪除文檔失敗:', error)
    showError(error.message || '刪除文檔失敗')
  }
}

// 獲取文檔上傳者 ID
const getDocumentUploadedBy = (doc) => {
  if (!doc) return null
  return doc.uploaded_by || doc.uploadedBy || doc.uploader_id || doc.uploaderId || null
}

// 判斷當前使用者是否可以編輯文檔
// 只有上傳者或管理員可以編輯
const canEditDocument = (doc) => {
  if (!doc || !authStore.user) return false
  
  const currentUserId = authStore.userId
  const docUploadedBy = getDocumentUploadedBy(doc)
  
  return authStore.isAdmin || (currentUserId && String(currentUserId) === String(docUploadedBy))
}

// 處理編輯文檔
const handleEditDocument = (doc) => {
  const docId = getDocumentId(doc)
  if (!docId) {
    showError('無法獲取文檔 ID')
    return
  }
  
  // 檢查權限
  if (!canEditDocument(doc)) {
    showError('無權編輯此文檔')
    return
  }
  
  // 設置編輯的文檔 ID 並打開抽屜
  editingDocumentId.value = docId
  drawerVisible.value = true
}

// 判斷文檔是否被選中
const isDocumentSelected = (doc) => {
  const docId = getDocumentId(doc)
  if (!docId) return false
  return selectedDocumentIds.value.includes(Number(docId)) || selectedDocumentIds.value.includes(String(docId))
}

// 處理文檔選擇變化
const handleDocumentSelectChange = (doc, checked) => {
  const docId = getDocumentId(doc)
  if (!docId) return
  
  const docIdNum = Number(docId)
  const docIdStr = String(docId)
  
  if (checked) {
    // 添加選擇
    if (!selectedDocumentIds.value.includes(docIdNum) && !selectedDocumentIds.value.includes(docIdStr)) {
      selectedDocumentIds.value.push(docIdNum)
    }
  } else {
    // 移除選擇
    const indexNum = selectedDocumentIds.value.indexOf(docIdNum)
    const indexStr = selectedDocumentIds.value.indexOf(docIdStr)
    const index = indexNum > -1 ? indexNum : indexStr
    if (index > -1) {
      selectedDocumentIds.value.splice(index, 1)
    }
  }
}

// 清除選擇
const clearSelection = () => {
  selectedDocumentIds.value = []
}

// 處理批量刪除
const handleBatchDelete = () => {
  if (selectedDocumentIds.value.length === 0) {
    showError('請選擇要刪除的文檔')
    return
  }
  
  // 顯示確認對話框
  Modal.confirm({
    title: '確認批量刪除',
    content: `確定要刪除選中的 ${selectedDocumentIds.value.length} 個文檔嗎？此操作無法復原。`,
    okText: '確認刪除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        const result = await knowledgeStore.batchDeleteDocuments(selectedDocumentIds.value)
        
        // 顯示結果統計
        const successCount = result.success_count || 0
        const failedCount = result.failed_count || 0
        
        if (successCount > 0 && failedCount === 0) {
          showSuccess(`成功刪除 ${successCount} 個文檔`)
        } else if (successCount > 0 && failedCount > 0) {
          const message = `部分刪除失敗：成功 ${successCount} 個，失敗 ${failedCount} 個`
          if (result.unauthorized_ids && result.unauthorized_ids.length > 0) {
            showError(`${message}（${result.unauthorized_ids.length} 個無權限）`)
          } else if (result.not_found_ids && result.not_found_ids.length > 0) {
            showError(`${message}（${result.not_found_ids.length} 個不存在）`)
          } else {
            showError(message)
          }
        } else {
          showError('批量刪除失敗')
        }
        
        // 清除選擇
        clearSelection()
        
        // 重新載入列表
        await loadDocuments()
        
        // 如果當前文檔被刪除，清除當前選中
        if (currentDocument.value) {
          const currentId = getDocumentId(currentDocument.value)
          const currentIdNum = Number(currentId)
          if (result.success_ids && result.success_ids.includes(currentIdNum)) {
            knowledgeStore.setCurrentDocument(null)
          }
        }
        
        // 如果沒有當前文檔且列表有數據，設置第一個為當前文檔
        if (!currentDocument.value && documents.value.length > 0) {
          knowledgeStore.setCurrentDocument(documents.value[0])
        }
      } catch (error) {
        console.error('批量刪除失敗:', error)
        showError(error.message || '批量刪除失敗')
      }
    },
    onCancel: () => {
      // 取消操作，不做任何事
    },
  })
}

const handleDrawerClose = () => {
  drawerVisible.value = false
  editingDocumentId.value = null
}

const handleDrawerSuccess = async (uploadedDocument) => {
  // 如果是編輯模式，刷新當前文檔詳情
  if (editingDocumentId.value) {
    const docId = editingDocumentId.value
    editingDocumentId.value = null
    
    // 重新載入當前文檔詳情
    try {
      await knowledgeStore.fetchDocument(docId)
    } catch (error) {
      console.error('載入更新後的文檔詳情失敗:', error)
    }
  } else {
    // 創建模式：重置分頁並設置新文檔
    knowledgeStore.setDocumentPagination({ page: 1 })
    if (uploadedDocument) {
      knowledgeStore.setCurrentDocument(uploadedDocument)
    }
  }
  
  // 重新載入列表
  await loadDocuments()
  
  // 如果沒有當前文檔且列表有數據，設置第一個為當前文檔
  if (!currentDocument.value && documents.value.length > 0) {
    knowledgeStore.setCurrentDocument(documents.value[0])
  }
}

const handlePaginationChange = (page, pageSize) => {
  knowledgeStore.setDocumentPagination({ page, perPage: pageSize })
  loadDocuments()
}

const loadDocuments = async () => {
  try {
    await knowledgeStore.fetchDocuments()
  } catch (error) {
    console.error('載入文檔列表失敗:', error)
    showError('載入文檔列表失敗')
  }
}

onMounted(async () => {
  try {
    await knowledgeStore.fetchServices()
  } catch (error) {
    console.error('載入服務類型失敗:', error)
  }
  await loadDocuments()
})

watch(
  () => filters.value,
  () => {
    knowledgeStore.setDocumentPagination({ page: 1 })
    loadDocuments()
  },
  { deep: true }
)

watch(
  () => addDocumentTrigger.value,
  () => {
    if (addDocumentTrigger.value > 0) {
      drawerVisible.value = true
    }
  }
)

// 當文檔列表變化時，清除已刪除文檔的選擇
watch(
  () => documents.value,
  (newDocs, oldDocs) => {
    if (oldDocs && selectedDocumentIds.value.length > 0) {
      const currentDocIds = newDocs.map(doc => getDocumentId(doc))
      selectedDocumentIds.value = selectedDocumentIds.value.filter(id => 
        currentDocIds.includes(Number(id)) || currentDocIds.includes(String(id))
      )
    }
  },
  { deep: true }
)
</script>

<style scoped>
.knowledge-resources-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
}

.collapsed-toggle {
  position: absolute;
  top: 72px; /* 移到標題下方，避免遮擋 */
  left: 16px;
  z-index: 10;
}

.resources-row {
  flex: 1;
  display: flex;
  gap: 12px;
  align-items: stretch;
  min-height: 0;
}

.document-list-col,
.document-preview-col {
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.document-list-item {
  cursor: pointer;
  padding: 6px;
}

.document-item-active {
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.document-item-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.document-item-title {
  font-weight: 500;
  color: #1f2937;
}

.document-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.document-item-description {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #6b7280;
}

.document-preview-col :deep(.ant-card) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.document-preview-col :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.attachment-preview-wrapper {
  flex: 1;
  min-height: 1000px; /* 確保預覽區域至少有 1000px 高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 由內部組件處理滾動 */
}

.document-preview-title {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>


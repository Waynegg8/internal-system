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
        <a-card :bordered="false">
          <template #title>
            <div class="card-title">
              <span>文檔列表</span>
              <a-button
                type="text"
                :icon="h(MenuFoldOutlined)"
                @click="toggleListCollapse"
              />
            </div>
          </template>

          <a-spin :spinning="documentLoading">
            <a-list
              v-if="documents.length > 0"
              :data-source="documents"
              :bordered="false"
            >
              <template #renderItem="{ item }">
                <a-list-item
                  :class="{ 'document-item-active': isCurrentDocument(item) }"
                  @click="handleViewDocument(item)"
                  class="document-list-item"
                >
                  <a-list-item-meta>
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
              <a-button type="primary" size="small" @click="handleDownloadDocument(currentDocument)">
                下載
              </a-button>
              <a-button danger size="small" @click="handleDeleteDocument(currentDocument)">
                刪除
              </a-button>
            </a-space>
          </template>

          <div v-if="currentDocument" class="document-preview-wrapper">
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
      @close="handleDrawerClose"
      @success="handleDrawerSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch, h } from 'vue'
import { FileOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import DocumentUploadDrawer from '@/components/knowledge/DocumentUploadDrawer.vue'
import DocumentPreview from '@/components/knowledge/DocumentPreview.vue'

const knowledgeStore = useKnowledgeStore()
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

const handleDrawerClose = () => {
  drawerVisible.value = false
}

const handleDrawerSuccess = async (uploadedDocument) => {
  knowledgeStore.setDocumentPagination({ page: 1 })
  if (uploadedDocument) {
    knowledgeStore.setCurrentDocument(uploadedDocument)
  }
  await loadDocuments()
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
</script>

<style scoped>
.knowledge-resources-content {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.collapsed-toggle {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
}

.resources-row {
  flex: 1;
  display: flex !important;
  gap: 12px !important;
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

.document-preview-col :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.document-preview-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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


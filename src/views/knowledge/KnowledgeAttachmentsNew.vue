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
    
    <a-row :gutter="16" style="height: 100%">
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
      
      <!-- 左側：附件列表 -->
      <a-col :span="listColSpan" class="attachment-list-col">
        <a-card :bordered="false" style="height: 100%">
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

          <!-- 附件專用篩選區域 -->
          <div style="margin-bottom: 16px">
            <a-select
              v-model:value="attachmentFilters.type"
              placeholder="附件類型"
              allow-clear
              style="width: 100%"
              @change="handleFilterChange"
            >
              <a-select-option value="">全部類型</a-select-option>
              <a-select-option value="task">任務附件</a-select-option>
              <a-select-option value="client">客戶附件</a-select-option>
              <a-select-option value="service">服務附件</a-select-option>
              <a-select-option value="other">其他</a-select-option>
            </a-select>
          </div>

          <a-spin :spinning="attachmentLoading">
            <!-- 附件列表 -->
            <a-list
              v-if="attachments.length > 0"
              :data-source="attachments"
              :bordered="false"
            >
              <template #renderItem="{ item }">
                <a-list-item
                  :class="{ 'attachment-item-active': isCurrentAttachment(item) }"
                  @click="handleViewAttachment(item)"
                  style="cursor: pointer; padding: 12px"
                >
                  <a-list-item-meta>
                    <template #avatar>
                      <FileOutlined style="font-size: 24px; color: #1890ff" />
                    </template>
                    <template #title>
                      <div style="display: flex; flex-direction: column; gap: 4px">
                        <span style="font-weight: 500">{{ getAttachmentTitle(item) }}</span>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap">
                          <a-tag
                            v-if="getAttachmentType(item)"
                            color="blue"
                            style="margin: 0"
                          >
                            {{ getAttachmentTypeLabel(item) }}
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
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>

            <!-- 空狀態 -->
            <a-empty
              v-else
              description="尚無附件，請點擊右上角「上傳附件」按鈕上傳"
              style="padding: 40px 0"
            />

            <!-- 分頁 -->
            <div
              v-if="attachmentPagination.total > attachmentPagination.perPage"
              style="margin-top: 16px; text-align: center"
            >
              <a-pagination
                v-model:current="attachmentPagination.page"
                v-model:page-size="attachmentPagination.perPage"
                :total="attachmentPagination.total"
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
      <a-col :span="previewColSpan" class="attachment-preview-col">
        <a-card :bordered="false" style="height: 100%">
          <template #title>
            <div v-if="currentAttachment" style="display: flex; justify-content: space-between; align-items: center">
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
          <div v-if="currentAttachment" class="attachment-preview">
            <!-- 附件信息 -->
            <div class="attachment-info">
              <div class="info-item">
                <span class="label">檔案名稱：</span>
                <span class="value">{{ getAttachmentTitle(currentAttachment) }}</span>
              </div>
              <div class="info-item">
                <span class="label">檔案大小：</span>
                <span class="value">{{ formatFileSize(currentAttachment) }}</span>
              </div>
              <div class="info-item">
                <span class="label">上傳時間：</span>
                <span class="value">{{ formatUploadTime(currentAttachment) }}</span>
              </div>
              <div class="info-item" v-if="getAttachmentType(currentAttachment)">
                <span class="label">附件類型：</span>
                <span class="value">{{ getAttachmentTypeLabel(currentAttachment) }}</span>
              </div>
              <div class="info-item" v-if="getAttachmentRelation(currentAttachment)">
                <span class="label">關聯信息：</span>
                <span class="value">{{ getAttachmentRelation(currentAttachment) }}</span>
              </div>
            </div>

            <!-- 預覽區域 -->
            <div class="preview-area">
              <AttachmentPreview :attachment="currentAttachment" />
            </div>
          </div>
          
          <!-- 空狀態 -->
          <div v-else class="empty-preview">
            <a-empty description="請從左側列表選擇附件進行預覽" />
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { FileOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import AttachmentPreview from '@/components/knowledge/AttachmentPreview.vue'

// Store
const knowledgeStore = useKnowledgeStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()
const {
  attachments,
  currentAttachment,
  attachmentPagination,
  attachmentLoading
} = storeToRefs(knowledgeStore)

// Local state
const listCollapsed = ref(false)
const attachmentFilters = ref({
  type: ''
})

// 列表列寬度
const listColSpan = computed(() => listCollapsed.value ? 0 : 9)
const previewColSpan = computed(() => listCollapsed.value ? 24 : 15)

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
  return attachment.document_id || attachment.id || attachment.attachment_id || attachment.file_id
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
  knowledgeStore.setCurrentAttachment(attachment)
}

// 處理下載附件
const handleDownloadAttachment = async (attachment) => {
  try {
    await knowledgeStore.downloadAttachment(getAttachmentId(attachment))
    showSuccess('附件下載成功')
  } catch (error) {
    console.error('下載附件失敗:', error)
    showError('下載附件失敗')
  }
}

// 處理刪除附件
const handleDeleteAttachment = async (attachment) => {
  try {
    await knowledgeStore.deleteAttachment(getAttachmentId(attachment))
    showSuccess('附件刪除成功')
  } catch (error) {
    console.error('刪除附件失敗:', error)
    showError('刪除附件失敗')
  }
}

// 處理篩選變更
const handleFilterChange = () => {
  // 實現篩選邏輯
  console.log('篩選變更:', attachmentFilters.value)
}

// 處理分頁變更
const handlePaginationChange = (page, pageSize) => {
  attachmentPagination.value.page = page
  attachmentPagination.value.perPage = pageSize
  // 重新載入數據
}

// 載入數據
onMounted(async () => {
  try {
    await knowledgeStore.fetchAttachments()
  } catch (error) {
    console.error('載入附件失敗:', error)
    showError('載入附件失敗')
  }
})
</script>

<style scoped>
.knowledge-attachments-content {
  padding: 0;
  min-height: calc(100vh - 400px);
  height: auto;
  position: relative;
}

.collapsed-toggle {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
}

.attachment-list-col {
  transition: all 0.3s;
  overflow: hidden;
}

.attachment-preview-col {
  transition: all 0.3s;
}

.attachment-item-active {
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.attachment-preview {
  padding: 16px 0;
}

.attachment-info {
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  margin-bottom: 12px;
  align-items: flex-start;
}

.info-item .label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
  flex-shrink: 0;
}

.info-item .value {
  color: #333;
  word-break: break-all;
}

.preview-area {
  text-align: center;
  padding: 40px 0;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
}

.file-icon {
  margin-bottom: 16px;
}

.preview-tip {
  color: #666;
  margin: 0;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}
</style>

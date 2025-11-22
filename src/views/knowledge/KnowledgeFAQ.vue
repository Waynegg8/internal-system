<template>
  <div class="knowledge-faq-content">
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
    
    <a-row :gutter="8" style="height: 100%">
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
      
      <!-- 左側：FAQ 列表 -->
      <a-col :span="listColSpan" class="faq-list-col">
        <a-card :bordered="false" style="height: 100%">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>FAQ 列表</span>
              <a-button
                type="text"
                :icon="h(MenuFoldOutlined)"
                @click="toggleListCollapse"
              />
            </div>
          </template>

          <a-spin :spinning="faqLoading">
            <!-- FAQ 列表 -->
            <a-list
              v-if="faqs.length > 0"
              :data-source="faqs"
              :bordered="false"
            >
              <template #renderItem="{ item }">
                <a-list-item
                  :class="{ 'faq-item-active': isCurrentFAQ(item) }"
                  @click="handleViewFAQ(item)"
                  style="cursor: pointer; padding: 6px"
                >
                  <a-list-item-meta>
                    <template #title>
                      <span
                        style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                      >
                        {{ getFAQQuestion(item) }}
                      </span>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>

            <!-- 空狀態 -->
            <a-empty
              v-else
              description="尚無 FAQ，請點擊右上角「+ 新增」按鈕建立"
              style="padding: 40px 0"
            />

            <!-- 分頁 -->
            <div
              v-if="faqPagination.total > faqPagination.perPage"
              style="margin-top: 16px; text-align: center"
            >
              <a-pagination
                v-model:current="faqPagination.page"
                v-model:page-size="faqPagination.perPage"
                :total="faqPagination.total"
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

      <!-- 右側：預覽/編輯區域 -->
      <a-col :span="previewColSpan" class="faq-preview-col">
        <a-card :bordered="false" style="height: 100%">
          <template #title>
            <div v-if="currentFAQ" style="display: flex; align-items: center; gap: 8px">
              <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ getFAQQuestion(currentFAQ) }}</span>
            </div>
            <span v-else>FAQ 詳情</span>
          </template>
          
          <!-- 操作按鈕區域 -->
          <template #extra v-if="currentFAQ">
            <a-space v-if="canEditFAQ(currentFAQ)">
              <a-button type="primary" size="small" @click="handleEditFAQ(currentFAQ)">
                編輯
              </a-button>
              <a-button danger size="small" @click="handleDeleteFAQ(currentFAQ)">刪除</a-button>
            </a-space>
          </template>

          <!-- 預覽內容 -->
          <div v-if="currentFAQ" class="faq-preview">
            <!-- 標籤區域 -->
            <div style="margin-bottom: 16px">
              <a-tag
                v-if="getFAQCategory(currentFAQ)"
                color="blue"
                style="margin-right: 8px"
              >
                {{ getFAQCategory(currentFAQ) }}
              </a-tag>
              <a-tag
                v-for="tag in getFAQTags(currentFAQ)"
                :key="tag"
                color="gold"
                style="margin-right: 8px"
              >
                {{ tag }}
              </a-tag>
            </div>

            <!-- 問題標題 -->
            <div style="margin-bottom: 16px">
              <h2 style="display: flex; align-items: center; gap: 8px; margin: 0; font-size: 20px; font-weight: 600">
                <span>{{ getFAQQuestion(currentFAQ) }}</span>
              </h2>
            </div>

            <!-- 建立者資訊 -->
            <div style="margin-bottom: 16px; padding: 12px; background-color: #f8f9fa; border-radius: 6px; border-left: 3px solid #1890ff">
              <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap">
                <div style="display: flex; align-items: center; gap: 8px">
                  <span style="font-weight: 500; color: #666">建立者：</span>
                  <span style="font-weight: 600; color: #1890ff">{{ getFAQCreatedByName(currentFAQ) }}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px">
                  <span style="font-weight: 500; color: #666">建立時間：</span>
                  <span style="font-weight: 600">{{ getFAQCreatedAtFormatted(currentFAQ) }}</span>
                </div>
              </div>
            </div>

            <!-- 回答標題 -->
            <div style="margin-bottom: 12px">
              <h3 style="display: flex; align-items: center; gap: 8px; margin: 0; font-size: 16px; font-weight: 500; color: #666">
                <span>回答</span>
              </h3>
            </div>

            <!-- FAQ 回答內容 -->
            <div
              class="ql-editor faq-answer"
              v-html="renderFAQAnswer(currentFAQ)"
            ></div>
          </div>

          <!-- 空狀態 -->
          <a-empty
            v-else
            description="點擊左側 FAQ 查看內容"
            style="padding: 40px 0"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- FAQ 編輯抽屜 -->
    <FAQEditDrawer
      v-model:visible="drawerVisible"
      :faq="editingFAQ"
      @close="handleDrawerClose"
      @success="handleDrawerSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { formatDateTime } from '@/utils/formatters'
import { renderRichText, isHtmlContent, textToHtml } from '@/utils/richText'
import { ExpandOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import { Modal } from 'ant-design-vue'
import FAQEditDrawer from '@/components/knowledge/FAQEditDrawer.vue'

// Store
const knowledgeStore = useKnowledgeStore()
const authStore = useAuthStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()
const {
  faqs,
  currentFAQ,
  faqPagination,
  faqLoading,
  filters,
  services,
  clients
} = storeToRefs(knowledgeStore)

// Local state
const listCollapsed = ref(false)
const drawerVisible = ref(false)
const editingFAQ = ref(null)

// 列表列寬度（左側 360px 約為 9 列，右側 15 列）
const listColSpan = computed(() => listCollapsed.value ? 0 : 9)
const previewColSpan = computed(() => listCollapsed.value ? 24 : 15)

// 切換列表收合
const toggleListCollapse = () => {
  listCollapsed.value = !listCollapsed.value
}

// 獲取 FAQ 問題（支持多種字段名格式）
const getFAQQuestion = (faq) => {
  return faq.question || faq.faq_question || faq.title || faq.faq_title || '無問題'
}

// 獲取 FAQ 分類名稱
const getFAQCategory = (faq) => {
  const categoryId = faq.category || faq.category_id || faq.service_id
  if (!categoryId) return null

  const service = services.value.find(s => {
    const id = s.id || s.serviceId || s.service_id
    return id === categoryId
  })

  if (service) {
    if (typeof service === 'string') return service
    return service.name || service.serviceName || service.service_name || service.title || service.service_title || String(service)
  }

  return null
}

// 獲取 FAQ 標籤（支持多種格式）
const getFAQTags = (faq) => {
  if (Array.isArray(faq.tags)) {
    return faq.tags
  }
  if (typeof faq.tags === 'string' && faq.tags) {
    return faq.tags.split(',').map(t => t.trim()).filter(t => t)
  }
  return []
}

// 獲取 FAQ 回答（支持多種字段名格式）
const getFAQAnswer = (faq) => {
  return faq.answer || faq.faq_answer || faq.content || faq.faq_content || ''
}

// 獲取 FAQ 建立者名稱
const getFAQCreatedByName = (faq) => {
  if (!faq) return '未知'
  return faq.createdByName || faq.created_by_name || faq.creatorName || faq.creator_name || '未知'
}

// 獲取 FAQ 建立時間並格式化（YYYY-MM-DD HH:mm）
const getFAQCreatedAtFormatted = (faq) => {
  if (!faq) return ''
  const createdAt = faq.createdAt || faq.created_at || faq.createdAtFormatted || faq.created_at_formatted
  if (!createdAt) return ''
  try {
    return formatDateTime(createdAt)
  } catch (error) {
    console.warn('格式化建立時間失敗:', error, createdAt)
    return createdAt
  }
}

// 渲染 FAQ 答案（支援富文本）
const renderFAQAnswer = (faq) => {
  const answer = getFAQAnswer(faq)
  if (!answer) return ''

  try {
    if (isHtmlContent(answer)) {
      return renderRichText(answer)
    } else {
      // 純文本轉換為簡單 HTML（保留換行）
      return textToHtml(answer)
    }
  } catch (error) {
    console.warn('渲染 FAQ 答案失敗:', error, answer)
    return textToHtml(answer)
  }
}

// 判斷是否為當前選中的 FAQ
const isCurrentFAQ = (faq) => {
  if (!currentFAQ.value) return false
  const faqId = faq.id || faq.faqId || faq.faq_id
  const currentId = currentFAQ.value.id || currentFAQ.value.faqId || currentFAQ.value.faq_id
  return faqId === currentId
}

// 獲取 FAQ 建立者 ID（支持多種字段名格式）
const getFAQCreatedBy = (faq) => {
  if (!faq) return null
  return faq.created_by || faq.createdBy || faq.creator_id || faq.creatorId || null
}

// 判斷當前使用者是否可以編輯/刪除 FAQ
// 只有建立者或管理員可以編輯/刪除
const canEditFAQ = (faq) => {
  if (!faq || !authStore.user) return false
  
  const currentUserId = authStore.userId
  const faqCreatedBy = getFAQCreatedBy(faq)
  const isAdmin = authStore.isAdmin
  
  // 如果是管理員，可以編輯/刪除
  if (isAdmin) return true
  
  // 如果是建立者，可以編輯/刪除
  if (currentUserId && faqCreatedBy) {
    return String(currentUserId) === String(faqCreatedBy)
  }
  
  return false
}

// 查看 FAQ
const handleViewFAQ = async (faq) => {
  const faqId = faq.id || faq.faqId || faq.faq_id
  try {
    // 如果已經載入詳情，直接設置
    if (currentFAQ.value && (currentFAQ.value.id || currentFAQ.value.faqId || currentFAQ.value.faq_id) === faqId) {
      return
    }

    // 載入詳情
    await knowledgeStore.fetchFAQ(faqId)
  } catch (error) {
    console.error('載入 FAQ 詳情失敗:', error)
    // 如果載入失敗，至少設置基本信息
    knowledgeStore.setCurrentFAQ(faq)
  }
}

// 編輯 FAQ
const handleEditFAQ = (faq) => {
  editingFAQ.value = faq
  drawerVisible.value = true
}

// 刪除 FAQ
const handleDeleteFAQ = async (faq) => {
  const faqId = faq.id || faq.faqId || faq.faq_id
  const faqQuestion = getFAQQuestion(faq)
  
  // 顯示確認對話框
  Modal.confirm({
    title: '確認刪除 FAQ',
    content: `確定要刪除「${faqQuestion}」嗎？此操作無法復原。`,
    okText: '確認刪除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await knowledgeStore.deleteFAQ(faqId)
        showSuccess('FAQ 已刪除')
        // 重新載入列表
        loadFAQs()
      } catch (error) {
        console.error('刪除 FAQ 失敗:', error)
        showError(error.message || '刪除 FAQ 失敗')
      }
    }
  })
}

// 抽屜關閉
const handleDrawerClose = () => {
  drawerVisible.value = false
  editingFAQ.value = null
}

// 抽屜保存成功
const handleDrawerSuccess = () => {
  // 重新載入列表
  loadFAQs()
  // 如果編輯的是當前 FAQ，重新載入詳情
  if (editingFAQ.value && currentFAQ.value) {
    const editingId = editingFAQ.value.id || editingFAQ.value.faqId || editingFAQ.value.faq_id
    const currentId = currentFAQ.value.id || currentFAQ.value.faqId || currentFAQ.value.faq_id
    if (editingId === currentId) {
      handleViewFAQ(editingFAQ.value)
    }
  }
  editingFAQ.value = null
}

// 分頁變化
const handlePaginationChange = () => {
  loadFAQs()
}

// 載入 FAQ 列表
const loadFAQs = async () => {
  try {
    await knowledgeStore.fetchFAQs()
  } catch (error) {
    console.error('載入 FAQ 列表失敗:', error)
  }
}

// 組件掛載時載入數據
onMounted(() => {
  loadFAQs()
})

// 監聽篩選條件變化，重新載入列表
watch(
  () => filters.value,
  () => {
    // 重置分頁到第一頁
    knowledgeStore.setFAQPagination({ page: 1 })
    loadFAQs()
  },
  { deep: true }
)

// FAQ 頁面不需要處理新增觸發器，這由 KnowledgeLayout 處理

// 新增 FAQ
const handleAddFAQ = () => {
  editingFAQ.value = null
  drawerVisible.value = true
}
</script>

<style scoped>
.knowledge-faq-content {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.collapsed-toggle {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
}

.faq-list-col {
  transition: all 0.3s;
  overflow: hidden;
}

.faq-preview-col {
  transition: all 0.3s;
}

.faq-item-active {
  background-color: #fffbe6;
  border-left: 3px solid #faad14;
}

.faq-preview {
  min-height: 400px;
  max-height: calc(100vh - 350px);
  overflow-y: auto;
}

/* Quill 編輯器內容樣式 */
.faq-answer {
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}

.faq-answer :deep(h1),
.faq-answer :deep(h2),
.faq-answer :deep(h3),
.faq-answer :deep(h4),
.faq-answer :deep(h5),
.faq-answer :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.faq-answer :deep(p) {
  margin-bottom: 1em;
}

.faq-answer :deep(ul),
.faq-answer :deep(ol) {
  margin-bottom: 1em;
  padding-left: 2em;
}

.faq-answer :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  table-layout: auto;
}

.faq-answer :deep(table td),
.faq-answer :deep(table th) {
  border: 1px solid #ddd;
  padding: 8px 12px;
  min-width: 50px;
  text-align: left;
}

.faq-answer :deep(table th) {
  background-color: #f5f5f5;
  font-weight: 600;
}

.faq-answer :deep(table tr:hover) {
  background-color: #fafafa;
}

/* 響應式表格 */
@media (max-width: 768px) {
  .faq-answer :deep(table) {
    font-size: 12px;
  }
  
  .faq-answer :deep(table td),
  .faq-answer :deep(table th) {
    padding: 6px 8px;
  }
}

.faq-answer :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>

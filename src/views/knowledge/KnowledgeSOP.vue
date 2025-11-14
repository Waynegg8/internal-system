<template>
  <div class="knowledge-sop-content">
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
      
      <!-- 左側：SOP 列表 -->
      <a-col :span="listColSpan" class="sop-list-col">
        <a-card :bordered="false" style="height: 100%">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>SOP 列表</span>
              <a-button
                type="text"
                :icon="h(MenuFoldOutlined)"
                @click="toggleListCollapse"
              />
            </div>
          </template>

          <a-spin :spinning="sopLoading">
            <!-- SOP 列表 -->
            <a-list
              v-if="sops.length > 0"
              :data-source="sops"
              :bordered="false"
            >
              <template #renderItem="{ item }">
                <a-list-item
                  :class="{ 'sop-item-active': isCurrentSOP(item) }"
                  @click="handleViewSOP(item)"
                  style="cursor: pointer; padding: 6px"
                >
                  <a-list-item-meta>
                    <template #title>
                      <div style="display: flex; justify-content: space-between; align-items: center">
                        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                          {{ getSOPTitle(item) }}
                        </span>
                        <a-tag
                          v-if="getSOPVersion(item)"
                          color="blue"
                          style="margin-left: 8px; flex-shrink: 0"
                        >
                          v{{ getSOPVersion(item) }}
                        </a-tag>
                      </div>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>

            <!-- 空狀態 -->
            <a-empty
              v-else
              description="尚無 SOP，請點擊右上角「+ 新增」按鈕建立"
              style="padding: 40px 0"
            />

            <!-- 分頁 -->
            <div
              v-if="sopPagination.total > sopPagination.perPage"
              style="margin-top: 16px; text-align: center"
            >
              <a-pagination
                v-model:current="sopPagination.page"
                v-model:page-size="sopPagination.perPage"
                :total="sopPagination.total"
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
      <a-col :span="previewColSpan" class="sop-preview-col">
        <a-card :bordered="false" style="height: 100%">
          <template #title>
            <div v-if="currentSOP" style="display: flex; justify-content: space-between; align-items: center">
              <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ getSOPTitle(currentSOP) }}</span>
            </div>
            <span v-else>SOP 詳情</span>
          </template>
          
          <!-- 操作按鈕區域 -->
          <template #extra v-if="currentSOP">
            <a-space>
              <a-button type="primary" size="small" @click="handleEditSOP(currentSOP)">
                編輯
              </a-button>
              <a-button danger size="small" @click="handleDeleteSOP(currentSOP)">刪除</a-button>
            </a-space>
          </template>

          <!-- 預覽內容 -->
          <div v-if="currentSOP" class="sop-preview">
            <!-- 標籤區域 -->
            <div style="margin-bottom: 16px">
              <a-tag
                v-if="getSOPCategory(currentSOP)"
                color="blue"
                style="margin-right: 8px"
              >
                {{ getSOPCategory(currentSOP) }}
              </a-tag>
              <a-tag
                v-for="tag in getSOPTags(currentSOP)"
                :key="tag"
                style="margin-right: 8px"
              >
                {{ tag }}
              </a-tag>
            </div>

            <!-- SOP 內容 -->
            <div
              class="ql-editor sop-content"
              v-html="getSOPContent(currentSOP)"
            ></div>
          </div>

          <!-- 空狀態 -->
          <a-empty
            v-else
            description="點擊左側 SOP 查看內容"
            style="padding: 40px 0"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- SOP 編輯抽屜 -->
    <SOPEditDrawer
      v-model:visible="drawerVisible"
      :sop="editingSOP"
      @close="handleDrawerClose"
      @success="handleDrawerSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { ExpandOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import SOPEditDrawer from '@/components/knowledge/SOPEditDrawer.vue'

// Store
const knowledgeStore = useKnowledgeStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()
const {
  sops,
  currentSOP,
  sopPagination,
  sopLoading,
  filters,
  services,
  clients
} = storeToRefs(knowledgeStore)

// Inject addSOPTrigger from parent
const addSOPTrigger = inject('addSOPTrigger', ref(0))

// Local state
const listCollapsed = ref(false)
const drawerVisible = ref(false)
const editingSOP = ref(null)

// 列表列寬度
const listColSpan = computed(() => listCollapsed.value ? 0 : 6)
const previewColSpan = computed(() => listCollapsed.value ? 24 : 18)

// 切換列表收合
const toggleListCollapse = () => {
  listCollapsed.value = !listCollapsed.value
}

// 獲取 SOP 標題（支持多種字段名格式）
const getSOPTitle = (sop) => {
  return sop.title || sop.sop_title || sop.name || sop.sop_name || '無標題'
}

// 獲取 SOP 版本號（支持多種字段名格式）
const getSOPVersion = (sop) => {
  return sop.version || sop.sop_version || sop.ver || 1
}

// 獲取 SOP 分類名稱
const getSOPCategory = (sop) => {
  const categoryId = sop.category || sop.category_id || sop.service_id
  if (!categoryId) return null

  const service = services.value.find(s => {
    const id = s.service_id || s.id || s.serviceId || s.name || s.service_name
    return id === categoryId || String(id) === String(categoryId)
  })

  if (service) {
    if (typeof service === 'string') return service
    return service.service_name || service.name || service.serviceName || service.title || service.service_title || String(service)
  }

  return null
}

// 獲取 SOP 標籤（支持多種格式）
const getSOPTags = (sop) => {
  if (Array.isArray(sop.tags)) {
    return sop.tags
  }
  if (typeof sop.tags === 'string' && sop.tags) {
    return sop.tags.split(',').map(t => t.trim()).filter(t => t)
  }
  return []
}

// 獲取 SOP 內容（支持多種字段名格式）
const getSOPContent = (sop) => {
  return sop.content || sop.sop_content || sop.body || sop.description || ''
}

// 判斷是否為當前選中的 SOP
const isCurrentSOP = (sop) => {
  if (!currentSOP.value) return false
  const sopId = sop.id || sop.sopId || sop.sop_id
  const currentId = currentSOP.value.id || currentSOP.value.sopId || currentSOP.value.sop_id
  return sopId === currentId
}

// 查看 SOP
const handleViewSOP = async (sop) => {
  const sopId = sop.id || sop.sopId || sop.sop_id
  try {
    // 如果已經載入詳情，直接設置
    if (currentSOP.value && (currentSOP.value.id || currentSOP.value.sopId || currentSOP.value.sop_id) === sopId) {
      return
    }

    // 載入詳情
    await knowledgeStore.fetchSOP(sopId)
  } catch (error) {
    console.error('載入 SOP 詳情失敗:', error)
    // 如果載入失敗，至少設置基本信息
    knowledgeStore.setCurrentSOP(sop)
  }
}

// 編輯 SOP
const handleEditSOP = (sop) => {
  editingSOP.value = sop
  drawerVisible.value = true
}

// 刪除 SOP
const handleDeleteSOP = async (sop) => {
  const sopId = sop.id || sop.sopId || sop.sop_id
  try {
    await knowledgeStore.deleteSOP(sopId)
    showSuccess('SOP 已刪除')
    // 重新載入列表
    loadSOPs()
  } catch (error) {
    console.error('刪除 SOP 失敗:', error)
    showError(error.message || '刪除 SOP 失敗')
  }
}

// 抽屜關閉
const handleDrawerClose = () => {
  drawerVisible.value = false
  editingSOP.value = null
}

// 抽屜保存成功
const handleDrawerSuccess = () => {
  // 重新載入列表
  loadSOPs()
  // 如果編輯的是當前 SOP，重新載入詳情
  if (editingSOP.value && currentSOP.value) {
    const editingId = editingSOP.value.id || editingSOP.value.sopId || editingSOP.value.sop_id
    const currentId = currentSOP.value.id || currentSOP.value.sopId || currentSOP.value.sop_id
    if (editingId === currentId) {
      handleViewSOP(editingSOP.value)
    }
  }
  editingSOP.value = null
}

// 分頁變化
const handlePaginationChange = () => {
  loadSOPs()
}

// 載入 SOP 列表
const loadSOPs = async () => {
  try {
    await knowledgeStore.fetchSOPs()
  } catch (error) {
    console.error('載入 SOP 列表失敗:', error)
  }
}

// 組件掛載時載入數據
onMounted(async () => {
  await loadSOPs()
  
  // 檢查 URL 參數中是否有 sop_id
  const urlParams = new URLSearchParams(window.location.search)
  const sopId = urlParams.get('sop_id')
  
  if (sopId) {
    try {
      // 嘗試載入對應的 SOP
      await knowledgeStore.fetchSOP(sopId)
    } catch (error) {
      console.error('自動載入 SOP 失敗:', error)
    }
  }
})

// 監聽篩選條件變化，重新載入列表
watch(
  () => filters.value,
  () => {
    // 重置分頁到第一頁
    knowledgeStore.setSOPPagination({ page: 1 })
    loadSOPs()
  },
  { deep: true }
)

// 監聽 addSOPTrigger 變化，打開新增抽屜
watch(
  () => addSOPTrigger.value,
  () => {
    if (addSOPTrigger.value > 0) {
      handleAddSOP()
    }
  }
)

// 新增 SOP
const handleAddSOP = () => {
  editingSOP.value = null
  drawerVisible.value = true
}
</script>

<style scoped>
.knowledge-sop-content {
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

.sop-list-col {
  transition: all 0.3s;
  overflow: hidden;
}

.sop-preview-col {
  transition: all 0.3s;
}

.sop-item-active {
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.sop-preview {
  min-height: 400px;
  max-height: calc(100vh - 350px);
  overflow-y: auto;
  padding-right: 8px; /* 給滾動條留出空間 */
}

/* Quill 編輯器內容樣式 */
.sop-content {
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  overflow: visible !important; /* 防止 Quill 編輯器產生額外的滾動條 */
}

/* 確保 Quill 編輯器本身不產生滾動條 */
.sop-content :deep(.ql-editor) {
  overflow: visible !important;
  max-height: none !important;
  height: auto !important;
}

.sop-content :deep(h1),
.sop-content :deep(h2),
.sop-content :deep(h3),
.sop-content :deep(h4),
.sop-content :deep(h5),
.sop-content :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.sop-content :deep(p) {
  margin-bottom: 1em;
}

.sop-content :deep(ul),
.sop-content :deep(ol) {
  margin-bottom: 1em;
  padding-left: 2em;
}

.sop-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  table-layout: auto;
}

.sop-content :deep(table td),
.sop-content :deep(table th) {
  border: 1px solid #ddd;
  padding: 8px 12px;
  min-width: 50px;
  text-align: left;
}

.sop-content :deep(table th) {
  background-color: #f5f5f5;
  font-weight: 600;
}

.sop-content :deep(table tr:hover) {
  background-color: #fafafa;
}

/* 響應式表格 */
@media (max-width: 768px) {
  .sop-content :deep(table) {
    font-size: 12px;
  }
  
  .sop-content :deep(table td),
  .sop-content :deep(table th) {
    padding: 6px 8px;
  }
}

.sop-content :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>

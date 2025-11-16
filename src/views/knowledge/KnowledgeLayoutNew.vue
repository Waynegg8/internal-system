<template>
  <div class="knowledge-layout">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">知識庫</h1>
    </div>

    <!-- 標籤頁 -->
    <div class="tabs-container">
      <a-tabs 
        v-model:activeKey="activeTab" 
        @change="handleTabChange"
        class="knowledge-tabs"
      >
        <a-tab-pane key="sop" tab="SOP" />
        <a-tab-pane key="faq" tab="FAQ" />
        <a-tab-pane key="resources" tab="資源中心" />
        <a-tab-pane key="attachments" tab="附件" />
      </a-tabs>
    </div>

    <!-- 工具欄 -->
    <div class="toolbar-container">
      <div class="toolbar-card">
        <!-- 篩選區域 -->
        <div class="filter-section">
          <div class="filter-row">
            <!-- 搜尋 -->
            <div class="filter-item search-item">
              <label class="filter-label">搜尋</label>
              <a-input
                v-model:value="filters.q"
                placeholder="關鍵字"
                allow-clear
                @input="handleSearchInput"
                @pressEnter="handleSearch"
                class="filter-input search-input"
              >
                <template #suffix>
                  <SearchOutlined />
                </template>
              </a-input>
            </div>

            <!-- 服務類型 -->
            <div class="filter-item service-item">
              <label class="filter-label">服務類型</label>
              <a-select
                v-model:value="filters.category"
                placeholder="請選擇"
                allow-clear
                show-search
                :filter-option="filterOption"
                class="filter-input select-input"
                @change="handleFilterChange"
              >
                <template #suffixIcon>
                  <AppstoreOutlined />
                </template>
                <a-select-option
                  v-for="service in services"
                  :key="getServiceId(service)"
                  :value="getServiceId(service)"
                >
                  {{ getServiceName(service) }}
                </a-select-option>
              </a-select>
            </div>

            <!-- 層級 -->
            <div class="filter-item level-item">
              <label class="filter-label">層級</label>
              <a-select
                v-model:value="filters.scope"
                placeholder="請選擇"
                allow-clear
                class="filter-input select-input"
                @change="handleFilterChange"
              >
                <template #suffixIcon>
                  <BranchesOutlined />
                </template>
                <a-select-option value="">全部</a-select-option>
                <a-select-option value="service">服務層級</a-select-option>
                <a-select-option value="task">任務層級</a-select-option>
              </a-select>
            </div>

            <!-- 客戶 -->
            <div class="filter-item client-item">
              <label class="filter-label">客戶</label>
              <a-select
                v-model:value="filters.client"
                placeholder="請選擇"
                allow-clear
                show-search
                :filter-option="filterOption"
                class="filter-input select-input"
                @change="handleFilterChange"
              >
                <template #suffixIcon>
                  <TeamOutlined />
                </template>
                <a-select-option
                  v-for="client in clients"
                  :key="getClientId(client)"
                  :value="getClientId(client)"
                >
                  {{ getClientName(client) }}
                </a-select-option>
              </a-select>
            </div>

            <!-- 日期 -->
            <div class="filter-item date-item">
              <label class="filter-label">日期</label>
              <a-date-picker
                v-model:value="datePicker"
                picker="month"
                format="YYYY-MM"
                placeholder="選擇年月"
                class="filter-input date-input"
                @change="handleDateChange"
                allow-clear
              />
            </div>
          </div>

          <!-- 標籤和操作按鈕行 -->
          <div class="filter-row">
            <!-- 標籤 -->
            <div class="filter-item tags-item">
              <label class="filter-label">標籤</label>
              <a-select
                v-model:value="filters.tags"
                mode="multiple"
                placeholder="請選擇"
                allow-clear
                class="filter-input select-input tags-select"
                @change="handleFilterChange"
              >
                <template #suffixIcon>
                  <TagOutlined />
                </template>
                <a-select-option
                  v-for="tag in tags"
                  :key="tag"
                  :value="tag"
                >
                  {{ tag }}
                </a-select-option>
              </a-select>
            </div>

            <!-- 操作按鈕 -->
            <div class="action-buttons">
              <a-button 
                :icon="h(SettingOutlined)" 
                @click="handleOpenTagManager"
                class="action-btn"
              >
                管理標籤
              </a-button>
              <a-button 
                type="primary" 
                :icon="h(PlusOutlined)" 
                @click="handleAddNew"
                class="action-btn primary-btn"
              >
                新增 {{ tabName }}
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 內容區域 -->
    <div class="content-container">
      <router-view />
    </div>

    <!-- 標籤管理模態框 -->
    <TagManagerModal
      v-model:visible="tagManagerVisible"
      :tags="tags"
      @update="handleTagsUpdate"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import TagManagerModal from '@/components/knowledge/TagManagerModal.vue'
import { debounce } from 'lodash'
import {
  SearchOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  TeamOutlined,
  TagOutlined,
  SettingOutlined,
  PlusOutlined
} from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const knowledgeStore = useKnowledgeStore()

const { services, clients, tags } = storeToRefs(knowledgeStore)

// 響應式數據
const activeTab = ref('sop')
const tagManagerVisible = ref(false)
const datePicker = ref(null)
const filters = ref({
  q: '',
  category: '',
  scope: '',
  client: '',
  tags: []
})

// 計算屬性
const tabName = computed(() => {
  const tabNames = {
    sop: 'SOP',
    faq: 'FAQ',
    resources: '資源',
    attachments: '附件'
  }
  return tabNames[activeTab.value] || 'SOP'
})

// 防抖搜索
const debouncedSearch = debounce(() => {
  handleSearch()
}, 300)

// 方法
const handleTabChange = (key) => {
  activeTab.value = key
  router.push(`/knowledge/${key}`)
}

const handleSearchInput = () => {
  debouncedSearch()
}

const handleSearch = () => {
  console.log('搜索:', filters.value.q)
  // 實現搜索邏輯
}

const handleFilterChange = () => {
  console.log('篩選變更:', filters.value)
  // 實現篩選邏輯
}

const handleDateChange = (date) => {
  console.log('日期變更:', date)
  // 實現日期篩選邏輯
}

const handleOpenTagManager = () => {
  tagManagerVisible.value = true
}

const handleAddNew = () => {
  const actions = {
    sop: () => router.push('/knowledge/sop/new'),
    faq: () => router.push('/knowledge/faq/new'),
    resources: () => router.push('/knowledge/resources/new'),
    attachments: () => router.push('/knowledge/attachments/new')
  }
  
  const action = actions[activeTab.value]
  if (action) {
    action()
  }
}

const handleTagsUpdate = async (newTags) => {
  try {
    await knowledgeStore.saveTags(newTags)
    await knowledgeStore.fetchTags()
    tagManagerVisible.value = false
  } catch (error) {
    console.error('更新標籤失敗:', error)
  }
}

// 輔助函數
const filterOption = (input, option) => {
  return option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

const getServiceId = (service) => {
  return typeof service === 'string' ? service : service?.id || service?.name
}

const getServiceName = (service) => {
  return typeof service === 'string' ? service : service?.name || service?.id
}

const getClientId = (client) => {
  return typeof client === 'string' ? client : client?.id || client?.name
}

const getClientName = (client) => {
  return typeof client === 'string' ? client : client?.name || client?.id
}

// 生命週期
onMounted(async () => {
  // 根據路由設置活動標籤
  const pathSegments = route.path.split('/')
  const tabFromPath = pathSegments[2]
  if (tabFromPath && ['sop', 'faq', 'resources', 'attachments'].includes(tabFromPath)) {
    activeTab.value = tabFromPath
  }

  // 載入數據
  try {
    await Promise.all([
      knowledgeStore.fetchServices(),
      knowledgeStore.fetchClients(),
      knowledgeStore.fetchTags()
    ])
  } catch (error) {
    console.error('載入數據失敗:', error)
  }
})

onUnmounted(() => {
  debouncedSearch.cancel()
})
</script>

<style scoped>
.knowledge-layout {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  margin: 0;
}

.tabs-container {
  margin-bottom: 24px;
}

.knowledge-tabs :deep(.ant-tabs-nav) {
  background: #fff;
  border-radius: 8px 8px 0 0;
  padding: 0 24px;
  margin: 0;
}

.knowledge-tabs :deep(.ant-tabs-tab) {
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 500;
}

.toolbar-container {
  margin-bottom: 24px;
}

.toolbar-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 8px;
  white-space: nowrap;
}

.filter-input {
  height: 40px;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
  transition: all 0.2s ease;
}

.filter-input:hover {
  border-color: #40a9ff;
}

.filter-input:focus,
.filter-input.ant-input-focused {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 欄位寬度 */
.search-item {
  flex: 0 0 200px;
}

.service-item {
  flex: 0 0 240px;
}

.level-item {
  flex: 0 0 160px;
}

.client-item {
  flex: 0 0 280px;
}

.date-item {
  flex: 0 0 160px;
}

.tags-item {
  flex: 0 0 300px;
}

/* 選擇器樣式重置 */
.select-input :deep(.ant-select-selector) {
  height: 40px !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 11px !important;
  display: flex !important;
  align-items: center !important;
  background: transparent !important;
}

.select-input :deep(.ant-select-selection-item),
.select-input :deep(.ant-select-selection-placeholder) {
  line-height: 38px !important;
  height: 38px !important;
  display: flex !important;
  align-items: center !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* 多選標籤樣式 */
.tags-select :deep(.ant-select-selection-item) {
  background: #f0f2f5 !important;
  border: 1px solid #d9d9d9 !important;
  border-radius: 4px !important;
  padding: 2px 8px !important;
  margin: 2px 4px 2px 0 !important;
  font-size: 12px !important;
  color: #333 !important;
  height: auto !important;
  line-height: 20px !important;
  max-width: 120px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.tags-select :deep(.ant-select-selection-item-content) {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.tags-select :deep(.ant-select-selection-item-remove) {
  margin-left: 4px !important;
  color: #999 !important;
  font-size: 10px !important;
}

.tags-select :deep(.ant-select-selection-item-remove:hover) {
  color: #ff4d4f !important;
}

.tags-select :deep(.ant-select-selector) {
  min-height: 40px !important;
  padding: 4px 11px !important;
  flex-wrap: wrap !important;
}

/* 日期選擇器樣式 */
.date-input :deep(.ant-picker) {
  height: 40px !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 11px !important;
  display: flex !important;
  align-items: center !important;
  background: transparent !important;
}

.date-input :deep(.ant-picker-input) {
  height: 38px !important;
  line-height: 38px !important;
}

/* 操作按鈕 */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-left: auto;
  align-items: flex-end;
}

.action-btn {
  height: 40px !important;
  padding: 0 16px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.primary-btn {
  background: #1890ff !important;
  border-color: #1890ff !important;
}

.primary-btn:hover {
  background: #40a9ff !important;
  border-color: #40a9ff !important;
}

/* 內容區域 */
.content-container {
  background: #fff;
  border-radius: 8px;
  min-height: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .filter-row {
    flex-wrap: wrap;
  }
  
  .search-item,
  .service-item,
  .level-item,
  .client-item,
  .date-item,
  .tags-item {
    flex: 1 1 200px;
    min-width: 200px;
  }
  
  .action-buttons {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .knowledge-layout {
    padding: 16px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-item {
    width: 100%;
  }
  
  .action-buttons {
    justify-content: stretch;
  }
  
  .action-btn {
    flex: 1;
  }
}
</style>




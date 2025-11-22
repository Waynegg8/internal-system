<template>
  <div class="knowledge-layout">
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
            <div class="filter-item search-item inline-filter">
              <label class="filter-label">搜尋</label>
              <a-input
                v-model:value="filterQ"
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
            <div class="filter-item service-item inline-filter">
              <label class="filter-label">服務類型</label>
              <a-select
                v-model:value="filterCategory"
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
                  v-for="(service, index) in safeServices"
                  :key="getServiceId(service) || `service-${index}`"
                  :value="getServiceId(service)"
                >
                  {{ getServiceName(service) || '未知服務' }}
                </a-select-option>
              </a-select>
            </div>

            <!-- 層級 -->
            <div class="filter-item level-item inline-filter">
              <label class="filter-label">層級</label>
              <a-select
                v-model:value="filterScope"
                placeholder="請選擇"
                allow-clear
                class="filter-input select-input"
                :dropdown-match-select-width="false"
                :dropdown-style="{ minWidth: '120px' }"
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
            <div class="filter-item client-item inline-filter">
              <label class="filter-label">客戶</label>
              <a-select
                v-model:value="filterClient"
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
                  v-for="(client, index) in safeClients"
                  :key="getClientId(client) || `client-${index}`"
                  :value="getClientId(client)"
                >
                  {{ getClientName(client) || '未知客戶' }}
                </a-select-option>
              </a-select>
            </div>

            <!-- 日期 -->
            <div class="filter-item date-item inline-filter">
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

            <!-- 標籤 -->
            <div class="filter-item tags-item inline-filter">
              <label class="filter-label">標籤</label>
              <a-select
                v-model:value="filterTags"
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
                  v-for="(tag, index) in safeTags"
                  :key="tag || `tag-${index}`"
                  :value="tag || ''"
                >
                  {{ tag || '未知標籤' }}
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
            標籤
          </a-button>
          <a-button
            :icon="h(PlusOutlined)"
            @click="handleAddNew"
            class="action-btn"
          >
            新增
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
import { ref, computed, watch, onMounted, onUnmounted, h, provide } from 'vue'
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

const { services, clients, tags, filters: storeFilters } = storeToRefs(knowledgeStore)

// 輔助函數 - 必須在 computed 之前定義
const getServiceId = (service) => {
  if (!service) return ''
  if (typeof service === 'string') return service
  return service?.service_id || service?.id || service?.serviceId || service?.name || service?.service_name || ''
}

const getServiceName = (service) => {
  if (!service) return ''
  if (typeof service === 'string') return service
  return service?.service_name || service?.name || service?.serviceName || service?.service_id || service?.id || ''
}

const getClientId = (client) => {
  if (!client) return ''
  if (typeof client === 'string') return client
  return client?.clientId || client?.id || client?.client_id || client?.companyName || client?.name || ''
}

const getClientName = (client) => {
  if (!client) return ''
  if (typeof client === 'string') return client
  return client?.companyName || client?.name || client?.company_name || client?.clientId || client?.id || ''
}

// 確保 services, clients, tags 始終是數組，並過濾掉無效項
const safeServices = computed(() => {
  const list = Array.isArray(services.value) ? services.value : []
  return list.filter(service => {
    if (!service) return false
    const id = getServiceId(service)
    return id && id !== ''
  })
})
const safeClients = computed(() => {
  const list = Array.isArray(clients.value) ? clients.value : []
  return list.filter(client => {
    if (!client) return false
    const id = getClientId(client)
    return id && id !== ''
  })
})
const safeTags = computed(() => Array.isArray(tags.value) ? tags.value : [])

// 響應式數據
const activeTab = ref('sop')
const tagManagerVisible = ref(false)
const datePicker = ref(null)

// 使用本地 refs 來綁定表單，然後同步到 store
const filterQ = ref('')
const filterCategory = ref('')
const filterScope = ref('')
const filterClient = ref('')
const filterTags = ref([])

// 從 store 同步到本地
watch(
  () => storeFilters.value,
  (newFilters) => {
    if (newFilters) {
      filterQ.value = newFilters.q || ''
      filterCategory.value = newFilters.category || ''
      filterScope.value = newFilters.scope || ''
      filterClient.value = newFilters.client || ''
      filterTags.value = Array.isArray(newFilters.tags) ? newFilters.tags : []
    }
  },
  { immediate: true, deep: true }
)

// 同步本地變更到 store
const updateStoreFilters = () => {
  knowledgeStore.setFilters({
    q: filterQ.value || '',
    category: filterCategory.value || '',
    scope: filterScope.value || '',
    client: filterClient.value || '',
    tags: Array.isArray(filterTags.value) ? filterTags.value : []
  })
}

// 為了兼容性，創建一個 computed filters 對象
const filters = computed({
  get: () => ({
    q: filterQ.value,
    category: filterCategory.value,
    scope: filterScope.value,
    client: filterClient.value,
    tags: filterTags.value
  }),
  set: (value) => {
    if (value) {
      filterQ.value = value.q || ''
      filterCategory.value = value.category || ''
      filterScope.value = value.scope || ''
      filterClient.value = value.client || ''
      filterTags.value = Array.isArray(value.tags) ? value.tags : []
      updateStoreFilters()
    }
  }
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
  // 保留現有的查詢參數（如 taskId, returnTo）
  const query = { ...route.query }
  query.tab = key
  router.push({ path: `/knowledge/${key}`, query })
}

const handleSearchInput = () => {
  updateStoreFilters()
  debouncedSearch()
}

const handleSearch = async () => {
  updateStoreFilters()
  const currentFilters = filters.value
  console.log('搜索:', currentFilters.q)
  console.log('當前標籤頁:', activeTab.value)
  console.log('篩選條件:', currentFilters)
  console.log('已更新 store 篩選條件')
  
  // 根據當前標籤頁重新載入數據
  try {
    console.log('開始載入數據...')
    switch (activeTab.value) {
      case 'sop':
        console.log('調用 fetchSOPs...')
        await knowledgeStore.fetchSOPs()
        console.log('fetchSOPs 完成')
        break
      case 'faq':
        console.log('調用 fetchFAQs...')
        await knowledgeStore.fetchFAQs()
        console.log('fetchFAQs 完成')
        break
      case 'resources':
        console.log('調用 fetchDocuments...')
        await knowledgeStore.fetchDocuments()
        console.log('fetchDocuments 完成')
        break
      case 'attachments':
        // 附件系統專為任務服務，只使用關鍵字篩選
        // 任務篩選通過 URL 參數 taskId 自動設置，不需要用戶手動選擇
        const currentFilters = filters.value || { q: '', category: '', scope: '', client: '', tags: [] }
        const attachmentFilters = knowledgeStore.attachmentFilters || {}
        // 只在沒有任務篩選時才響應全局關鍵字篩選
        if (!attachmentFilters.taskId) {
          knowledgeStore.setAttachmentFilters({
            q: currentFilters.q || ''
          })
          await knowledgeStore.fetchAttachments()
        }
        break
    }
    console.log('數據載入完成')
  } catch (error) {
    console.error('搜索失敗:', error)
    console.error('錯誤詳情:', error.message, error.stack)
  }
}

const handleFilterChange = async () => {
  updateStoreFilters()
  const currentFilters = filters.value
  console.log('篩選變更:', currentFilters)
  
  // 根據當前標籤頁重新載入數據
  try {
    switch (activeTab.value) {
      case 'sop':
        await knowledgeStore.fetchSOPs()
        break
      case 'faq':
        await knowledgeStore.fetchFAQs()
        break
      case 'resources':
        await knowledgeStore.fetchDocuments()
        break
      case 'attachments':
        // 附件系統專為任務服務，只使用關鍵字篩選
        // 任務篩選通過 URL 參數 taskId 自動設置，不需要用戶手動選擇
        const currentFiltersForAttachments = filters.value || { q: '', category: '', scope: '', client: '', tags: [] }
        // 只在沒有任務篩選時才響應全局關鍵字篩選
        const attachmentFilters = knowledgeStore.attachmentFilters || {}
        if (!attachmentFilters.taskId) {
          knowledgeStore.setAttachmentFilters({
            q: currentFiltersForAttachments.q || ''
          })
          await knowledgeStore.fetchAttachments()
        }
        break
    }
  } catch (error) {
    console.error('篩選失敗:', error)
  }
}

const handleDateChange = async (date) => {
  console.log('日期變更:', date)
  
  // 處理日期格式並更新 store
  const currentFilters = { ...filters.value }
  if (date) {
    currentFilters.year = date.format('YYYY')
    currentFilters.month = date.format('MM')
  } else {
    currentFilters.year = ''
    currentFilters.month = ''
  }
  
  // 更新 store
  knowledgeStore.setFilters(currentFilters)
  
  // 觸發篩選變更
  await handleFilterChange()
}

const handleOpenTagManager = () => {
  tagManagerVisible.value = true
}

// 附件和資源中心的上傳觸發器
const addDocumentTrigger = ref(0)
const addAttachmentTrigger = ref(0)

// 提供觸發器給子組件
provide('addDocumentTrigger', addDocumentTrigger)
provide('addAttachmentTrigger', addAttachmentTrigger)

const handleAddNew = () => {
  const actions = {
    sop: () => router.push('/knowledge/sop/new'),
    faq: () => router.push('/knowledge/faq/new'),
    resources: () => {
      // 觸發資源中心上傳抽屜
      addDocumentTrigger.value++
    },
    attachments: () => {
      // 附件系統專為任務服務，不提供獨立上傳功能
      // 用戶必須從任務詳情頁上傳附件
      // 這裡可以顯示提示或不做任何操作
    }
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
  // 如果沒有輸入或選項，顯示所有選項
  if (!input || !option) return true
  
  try {
    let text = ''
    
    // 方法1: 從 option.value 對應的服務/客戶名稱獲取
    if (option.value !== undefined && option.value !== null) {
      // 確保 safeServices 和 safeClients 已經初始化
      const servicesList = safeServices?.value || []
      const clientsList = safeClients?.value || []
      
      // 對於服務類型
      if (servicesList.length > 0) {
        const service = servicesList.find(s => {
          if (!s) return false
          const id = getServiceId(s)
          return id && String(id) === String(option.value)
        })
        if (service) {
          text = getServiceName(service) || ''
        }
      }
      
      // 如果還沒找到，嘗試客戶
      if (!text && clientsList.length > 0) {
        const client = clientsList.find(c => {
          if (!c) return false
          const id = getClientId(c)
          return id && String(id) === String(option.value)
        })
        if (client) {
          text = getClientName(client) || ''
        }
      }
    }
    
    // 方法2: 從 option.children 獲取（VNode）- 使用安全的訪問方式
    if (!text && option.children !== undefined && option.children !== null) {
      try {
        if (typeof option.children === 'string') {
          text = option.children
        } else if (option.children && typeof option.children === 'object') {
          if (option.children.props && option.children.props.children !== undefined) {
            text = String(option.children.props.children)
          } else if (option.children.children !== undefined) {
            text = String(option.children.children)
          }
        }
      } catch (e) {
        // 忽略 children 訪問錯誤
      }
    }
    
    // 方法3: 從 option.label 獲取
    if (!text && option.label !== undefined && option.label !== null) {
      text = String(option.label)
    }
    
    // 如果還是沒有文本，返回 true（顯示該選項，避免過濾掉）
    if (!text) return true
    
    return text.toLowerCase().indexOf(input.toLowerCase()) >= 0
  } catch (e) {
    console.error('filterOption error:', e, option)
    return true // 出錯時顯示所有選項
  }
}

// 生命週期
onMounted(async () => {
  // 根據路由設置活動標籤
  const pathSegments = route.path.split('/')
  const tabFromPath = pathSegments[2]
  // 如果有 tab 查詢參數，優先使用查詢參數
  const tabFromQuery = route.query.tab
  if (tabFromQuery && ['sop', 'faq', 'resources', 'attachments'].includes(tabFromQuery)) {
    activeTab.value = tabFromQuery
  } else if (tabFromPath && ['sop', 'faq', 'resources', 'attachments'].includes(tabFromPath)) {
    activeTab.value = tabFromPath
  }

  // 載入數據
  try {
    console.log('開始載入數據...')
    await Promise.all([
      knowledgeStore.fetchServices().then(() => console.log('服務類型載入完成:', services.value)),
      knowledgeStore.fetchClients().then(() => console.log('客戶列表載入完成:', clients.value))
    ])
    // 載入標籤（同步操作）
    knowledgeStore.fetchTags()
    console.log('標籤載入完成:', tags.value)
    console.log('所有數據載入完成')
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
  padding: 4px;
  background: #f5f5f5;
  min-height: calc(100vh - 64px) !important;
  display: flex !important;
  flex-direction: column !important;
  position: relative !important;
  box-sizing: border-box !important;
  /* 允許頁面內容超過視口高度，以便預覽區域可以達到 1000px 以上 */
}

.tabs-container {
  margin-bottom: 2px;
  flex-shrink: 0;
}

.knowledge-tabs :deep(.ant-tabs-nav) {
  background: #fff;
  border-radius: 4px 4px 0 0;
  padding: 0 8px;
  margin: 0;
  min-height: 32px;
}

.knowledge-tabs :deep(.ant-tabs-tab) {
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 500;
  min-height: 32px;
  line-height: 20px;
}

.toolbar-container {
  margin-bottom: 2px;
  flex-shrink: 0;
}

.toolbar-card {
  background: #fff;
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
  min-height: 32px;
  width: 100%;
}

.filter-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: visible;
  box-sizing: border-box;
}

.inline-filter {
  flex-direction: row !important;
  align-items: center;
  gap: 8px;
  height: 32px;
  flex-shrink: 1;
  min-width: 0;
  overflow: visible;
  box-sizing: border-box;
}

.inline-filter .filter-label {
  margin-bottom: 0;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 11px;
  min-width: fit-content;
  width: auto;
  text-align: right;
  line-height: 32px;
  padding-right: 4px;
  overflow: visible;
}

.filter-label {
  font-size: 10px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 2px;
  white-space: nowrap;
}

.filter-input {
  height: 32px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  transition: all 0.2s ease;
  font-size: 12px;
  min-width: 80px;
  flex: 1 1 auto;
  flex-shrink: 1;
  max-width: 100%;
}

.filter-input:hover {
  border-color: #40a9ff;
}

.filter-input:focus,
.filter-input.ant-input-focused {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 欄位寬度 - 調整避免重疊，允許響應式縮放 */
/* 考慮標籤文字寬度 + 輸入框寬度 + gap */
.search-item {
  flex: 1 1 140px;
  min-width: 140px;
  max-width: 200px;
}

.service-item {
  flex: 1 1 180px;
  min-width: 180px;
  max-width: 240px;
}

.level-item {
  flex: 0 1 125px;
  min-width: 125px;
  max-width: 160px;
}

.client-item {
  flex: 1 1 160px;
  min-width: 160px;
  max-width: 240px;
}

.date-item {
  flex: 0 1 130px;
  min-width: 130px;
  max-width: 170px;
}

.tags-item {
  flex: 1 1 180px;
  min-width: 180px;
  max-width: 280px;
}

/* 輸入框寬度限制 */
.search-input {
  min-width: 0 !important;
  max-width: 100% !important;
}

.search-input :deep(.ant-input) {
  min-width: 0 !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  font-size: 12px !important;
}

/* 選擇器樣式重置 */
.select-input {
  min-width: 0 !important;
  max-width: 100% !important;
}

.select-input :deep(.ant-select-selector) {
  height: 32px !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 8px !important;
  display: flex !important;
  align-items: center !important;
  background: transparent !important;
  font-size: 12px !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

.select-input :deep(.ant-select-selection-item),
.select-input :deep(.ant-select-selection-placeholder) {
  line-height: 32px !important;
  height: 32px !important;
  display: flex !important;
  align-items: center !important;
  padding: 0 !important;
  margin: 0 !important;
  font-size: 12px !important;
}

/* 下拉選單項目樣式 - 確保文字完整顯示 */
.select-input :deep(.ant-select-dropdown) {
  min-width: fit-content !important;
}

.select-input :deep(.ant-select-item) {
  font-size: 12px !important;
  padding: 4px 12px !important;
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  min-width: 100% !important;
}

.select-input :deep(.ant-select-item-option-content) {
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  display: block !important;
}

/* 確保層級和日期下拉選單有足夠寬度 */
.level-item .select-input :deep(.ant-select-dropdown),
.date-item .select-input :deep(.ant-select-dropdown) {
  min-width: 120px !important;
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
  min-height: 28px !important;
  padding: 1px 6px !important;
  flex-wrap: wrap !important;
}

/* 日期選擇器樣式 */
.date-input {
  min-width: 0 !important;
  max-width: 100% !important;
}

.date-input :deep(.ant-picker) {
  height: 28px !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 6px !important;
  display: flex !important;
  align-items: center !important;
  background: transparent !important;
  font-size: 11px !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

.date-input :deep(.ant-picker-input) {
  height: 26px !important;
  line-height: 26px !important;
  font-size: 11px !important;
}

.date-input :deep(.ant-picker-input input) {
  font-size: 11px !important;
}

/* 日期選擇器下拉選單 */
.date-input :deep(.ant-picker-dropdown) {
  min-width: fit-content !important;
}

.date-input :deep(.ant-picker-cell) {
  font-size: 11px !important;
}

/* 操作按鈕 */
.action-buttons {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
  height: 32px;
  margin-left: auto;
  min-width: fit-content;
}

.action-btn {
  height: 32px !important;
  padding: 0 12px !important;
  border-radius: 4px !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  white-space: nowrap !important;
}

.primary-btn {
  background: #1890ff !important;
  border-color: #1890ff !important;
  color: white !important;
}

.primary-btn:hover {
  background: #40a9ff !important;
  border-color: #40a9ff !important;
  color: white !important;
}

.icon-only {
  min-width: 28px !important;
  width: 28px !important;
  padding: 0 !important;
}

/* 內容區域 */
.content-container {
  background: #fff;
  border-radius: 4px;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  min-height: 0 !important;
  /* 移除 overflow: hidden，允許內容超過視口高度 */
  /* 移除 height: 100%，使用 min-height 讓內容自然延伸 */
  min-height: calc(100vh - 220px) !important; /* 確保至少有足夠的高度用於預覽 */
}

/* 針對資源中心和附件頁面，與 SOP 頁面保持一致，使用 flex: 1 填充可用空間 */
.content-container:has(.knowledge-resources-content),
.content-container:has(.knowledge-attachments-content) {
  /* 移除固定高度限制，使用 flex: 1 填充可用空間 */
  /* height: calc(100vh - var(--knowledge-viewport-offset, 220px)) !important; */
  /* flex: none !important; */
}

:root {
  --knowledge-viewport-offset: 220px;
  --knowledge-iframe-offset: 260px;
}

/* 確保 CSS 變數在整個應用中可用 */
.knowledge-layout {
  --knowledge-viewport-offset: 220px;
  --knowledge-iframe-offset: 260px;
}

/* 針對資源中心和附件頁面，與 SOP 頁面保持一致，使用 height: 100% 填充容器 */
.content-container :deep(.knowledge-resources-content),
.content-container :deep(.knowledge-attachments-content) {
  height: 100% !important; /* 與 SOP 頁面一致，使用 100% 填充容器 */
  display: flex !important;
  flex-direction: column !important;
  /* padding: 12px !important; 移除，由組件內部設置 */
  overflow: hidden !important; /* 防止整體滾動 */
}

/* 確保 a-row 填滿可用空間 */
.content-container :deep(.knowledge-resources-content .ant-row),
.content-container :deep(.knowledge-attachments-content .ant-row) {
  display: flex;
  gap: 12px;
  margin: 0 !important;
  flex-wrap: nowrap;
  align-items: stretch !important;
}

/* 確保 a-col 正確處理高度和溢出 */
.content-container :deep(.knowledge-resources-content .ant-col),
.content-container :deep(.knowledge-attachments-content .ant-col) {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
  padding-left: 4px !important;
  padding-right: 4px !important;
  height: 100% !important;
  align-self: stretch !important;
}

/* 確保 row 使用 flex: 1 填滿可用空間 */
.content-container :deep(.knowledge-resources-content .resources-row),
.content-container :deep(.knowledge-attachments-content .attachments-row) {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: 100% !important;
}

/* 確保 Card 填滿 Col 的高度 */
.content-container :deep(.knowledge-resources-content .ant-card),
.content-container :deep(.knowledge-attachments-content .ant-card) {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  height: 100% !important;
  flex: 1 1 auto !important;
}

/* Card Body 基礎設置 */
.content-container :deep(.knowledge-resources-content .ant-card-body),
.content-container :deep(.knowledge-attachments-content .ant-card-body) {
  display: flex;
  flex-direction: column;
  padding: 12px;
}

/* 列表列 - 內容可滾動 */
.content-container :deep(.document-list-col .ant-card-body),
.content-container :deep(.attachment-list-col .ant-card-body) {
  overflow-y: auto;
  overflow-x: hidden;
}

/* 預覽列 - 內容可滾動，查看完整 PDF */
.content-container :deep(.document-preview-col .ant-card-body),
.content-container :deep(.attachment-preview-col .ant-card-body) {
  overflow: hidden !important; /* 預覽組件內部處理滾動 */
  overflow-x: hidden !important;
  padding: 0 !important; /* 移除 padding，讓預覽組件完全填充 */
  flex: 1 1 auto !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 1000px !important; /* 確保預覽列至少有 1000px 高度 */
  height: 100% !important; /* 確保填滿 Card 的高度 */
}

/* 直接強制預覽組件高度 - 使用全局選擇器避免 scoped CSS 問題 */
.content-container :deep(.attachment-preview-wrapper .document-preview),
.content-container :deep(.attachment-preview-wrapper .attachment-preview) {
  min-height: 1000px !important;
  height: 100% !important;
  padding: 0 !important;
  flex: 1 !important;
}

.content-container :deep(.attachment-preview-wrapper .document-preview .ant-spin-container),
.content-container :deep(.attachment-preview-wrapper .document-preview .ant-spin-nested-loading),
.content-container :deep(.attachment-preview-wrapper .attachment-preview .ant-spin-container),
.content-container :deep(.attachment-preview-wrapper .attachment-preview .ant-spin-nested-loading) {
  min-height: 1000px !important;
  height: 100% !important;
  flex: 1 !important;
}

.content-container :deep(.attachment-preview-wrapper .document-preview .preview-container),
.content-container :deep(.attachment-preview-wrapper .attachment-preview .preview-container) {
  min-height: 1000px !important;
  height: 100% !important;
  flex: 1 !important;
}

/* 桌面專用設計 - 移除響應式 */
</style>

<!-- 非 scoped 全局樣式，直接覆蓋預覽組件的 scoped CSS -->
<style>
/* 強制預覽組件高度為 1000px - 使用全局選擇器，不依賴 scoped CSS hash */
.knowledge-layout .attachment-preview-wrapper .document-preview,
.knowledge-layout .attachment-preview-wrapper .attachment-preview {
  min-height: 1000px !important;
  height: 100% !important;
  padding: 0 !important;
  flex: 1 !important;
}

.knowledge-layout .attachment-preview-wrapper .document-preview .ant-spin-container,
.knowledge-layout .attachment-preview-wrapper .document-preview .ant-spin-nested-loading,
.knowledge-layout .attachment-preview-wrapper .attachment-preview .ant-spin-container,
.knowledge-layout .attachment-preview-wrapper .attachment-preview .ant-spin-nested-loading {
  min-height: 1000px !important;
  height: 100% !important;
  flex: 1 !important;
}

.knowledge-layout .attachment-preview-wrapper .document-preview .preview-container,
.knowledge-layout .attachment-preview-wrapper .attachment-preview .preview-container {
  min-height: 1000px !important;
  height: 100% !important;
  flex: 1 !important;
}

.knowledge-layout .attachment-preview-wrapper .document-preview .preview-iframe {
  min-height: 1000px !important;
  height: 100% !important;
}
</style>

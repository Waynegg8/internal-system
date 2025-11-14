<template>
  <div class="knowledge-toolbar">
    <!-- 搜尋和篩選區域 -->
    <div class="toolbar-section">
      <div class="toolbar-row">
        <!-- 搜尋 -->
        <div class="toolbar-field search-field">
          <label class="field-label">搜尋</label>
          <div class="field-input">
            <a-input
              v-model:value="localFilters.q"
              placeholder="關鍵字"
              allow-clear
              @input="handleSearchInput"
              @pressEnter="handleSearch"
              class="search-input"
            >
              <template #suffix>
                <SearchOutlined />
              </template>
            </a-input>
          </div>
        </div>

        <!-- 服務類型 -->
        <div class="toolbar-field service-field">
          <label class="field-label">服務類型</label>
          <div class="field-input">
            <a-select
              v-model:value="localFilters.category"
              placeholder="請選擇"
              allow-clear
              show-search
              :filter-option="filterOption"
              class="select-input"
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
        </div>

        <!-- 層級 -->
        <div class="toolbar-field level-field">
          <label class="field-label">層級</label>
          <div class="field-input">
            <a-select
              v-model:value="localFilters.scope"
              placeholder="請選擇"
              allow-clear
              class="select-input"
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
        </div>

        <!-- 客戶 -->
        <div class="toolbar-field client-field">
          <label class="field-label">客戶</label>
          <div class="field-input">
            <a-select
              v-model:value="localFilters.client"
              placeholder="請選擇"
              allow-clear
              show-search
              :filter-option="filterOption"
              class="select-input"
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
        </div>

        <!-- 日期 -->
        <div class="toolbar-field date-field">
          <label class="field-label">日期</label>
          <div class="field-input">
            <a-date-picker
              v-model:value="datePicker"
              picker="month"
              format="YYYY-MM"
              placeholder="選擇年月"
              class="date-input"
              @change="handleDateChange"
              allow-clear
            />
          </div>
        </div>
      </div>

      <!-- 標籤和操作按鈕 -->
      <div class="toolbar-row">
        <!-- 標籤 -->
        <div class="toolbar-field tags-field">
          <label class="field-label">標籤</label>
          <div class="field-input">
            <a-select
              v-model:value="localFilters.tags"
              mode="multiple"
              placeholder="請選擇"
              allow-clear
              class="select-input tags-select"
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
        </div>

        <!-- 操作按鈕 -->
        <div class="toolbar-actions">
          <a-button 
            :icon="h(SettingOutlined)" 
            @click="handleOpenTagManager"
            class="action-button"
          >
            管理標籤
          </a-button>
          <a-button 
            type="primary" 
            :icon="h(PlusOutlined)" 
            @click="handleAddNew"
            class="action-button primary-button"
          >
            新增 {{ tabName }}
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, h } from 'vue'
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

const props = defineProps({
  filters: Object,
  services: Array,
  clients: Array,
  tags: Array,
  tabName: String,
  datePicker: [String, Object]
})

const emit = defineEmits([
  'update:filters',
  'update:datePicker',
  'search',
  'filterChange',
  'dateChange',
  'openTagManager',
  'addNew'
])

const localFilters = ref({ ...props.filters })

// 監聽 props 變化
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
}, { deep: true })

// 防抖搜索
const debouncedSearch = debounce(() => {
  emit('search', localFilters.value.q)
}, 300)

const handleSearchInput = () => {
  emit('update:filters', localFilters.value)
  debouncedSearch()
}

const handleSearch = () => {
  debouncedSearch.cancel()
  emit('search', localFilters.value.q)
}

const handleFilterChange = () => {
  emit('update:filters', localFilters.value)
  emit('filterChange')
}

const handleDateChange = (date) => {
  emit('update:datePicker', date)
  emit('dateChange', date)
}

const handleOpenTagManager = () => {
  emit('openTagManager')
}

const handleAddNew = () => {
  emit('addNew')
}

// 輔助函數
const filterOption = (input, option) => {
  return option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

const getServiceId = (service) => {
  if (typeof service === 'string') return service
  return service?.service_id || service?.id || service?.serviceId || service?.name || service?.service_name
}

const getServiceName = (service) => {
  if (typeof service === 'string') return service
  return service?.service_name || service?.name || service?.serviceName || service?.service_id || service?.id
}

const getClientId = (client) => {
  if (typeof client === 'string') return client
  return client?.clientId || client?.id || client?.client_id || client?.companyName || client?.name
}

const getClientName = (client) => {
  if (typeof client === 'string') return client
  return client?.companyName || client?.name || client?.company_name || client?.clientId || client?.id
}
</script>

<style scoped>
.knowledge-toolbar {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.toolbar-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 8px;
  white-space: nowrap;
}

.field-input {
  position: relative;
}

/* 欄位寬度 */
.search-field {
  flex: 0 0 200px;
}

.service-field {
  flex: 0 0 240px;
}

.level-field {
  flex: 0 0 140px;
}

.client-field {
  flex: 0 0 280px;
}

.date-field {
  flex: 0 0 160px;
}

.tags-field {
  flex: 0 0 300px;
}

/* 輸入框樣式 */
.search-input,
.select-input,
.date-input {
  height: 40px !important;
  border-radius: 6px !important;
  border: 1px solid #d9d9d9 !important;
  transition: all 0.2s ease !important;
}

.search-input:hover,
.select-input:hover,
.date-input:hover {
  border-color: #40a9ff !important;
}

.search-input:focus,
.search-input.ant-input-focused {
  border-color: #1890ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
}

/* 選擇器樣式 */
.select-input :deep(.ant-select-selector) {
  height: 40px !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 11px !important;
  display: flex !important;
  align-items: center !important;
}

.select-input :deep(.ant-select-selection-item),
.select-input :deep(.ant-select-selection-placeholder) {
  line-height: 38px !important;
  height: 38px !important;
  display: flex !important;
  align-items: center !important;
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
}

.date-input :deep(.ant-picker-input) {
  height: 38px !important;
  line-height: 38px !important;
}

/* 操作按鈕區域 */
.toolbar-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
  align-items: flex-end;
}

.action-button {
  height: 40px !important;
  padding: 0 16px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.primary-button {
  background: #1890ff !important;
  border-color: #1890ff !important;
}

.primary-button:hover {
  background: #40a9ff !important;
  border-color: #40a9ff !important;
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .toolbar-row {
    flex-wrap: wrap;
  }
  
  .search-field,
  .service-field,
  .level-field,
  .client-field,
  .date-field,
  .tags-field {
    flex: 1 1 200px;
    min-width: 200px;
  }
  
  .toolbar-actions {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .toolbar-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-field {
    width: 100%;
  }
  
  .toolbar-actions {
    justify-content: stretch;
  }
  
  .action-button {
    flex: 1;
  }
}
</style>

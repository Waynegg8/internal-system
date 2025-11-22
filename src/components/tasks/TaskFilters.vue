<template>
  <FilterCard>
    <!-- 第一行：分為兩個子行，無視覺分隔 -->
    <div class="filter-section">
      <div class="filter-row-main">
        <!-- 第一子行：基本篩選項目 -->
        <div class="filter-row-main-first">
          <!-- 搜尋 -->
          <div class="filter-item search-item">
            <a-input-search
              v-model:value="localFilters.q"
              placeholder="搜尋任務/客戶/統編…"
              allow-clear
              @search="handleSearch"
              @press-enter="handleSearch"
              size="small"
              class="filter-input"
            />
          </div>
          
          <!-- 開始月份 -->
          <div class="filter-item date-item">
            <a-date-picker
              v-model:value="localFilters.service_month_start"
              picker="month"
              placeholder="開始月份"
              allow-clear
              size="small"
              class="filter-input"
              format="YYYY-MM"
              @change="handleMonthRangeChange"
            />
          </div>
          
          <!-- 結束月份 -->
          <div class="filter-item date-item">
            <a-date-picker
              v-model:value="localFilters.service_month_end"
              picker="month"
              placeholder="結束月份"
              allow-clear
              size="small"
              class="filter-input"
              format="YYYY-MM"
              :disabled-date="disableEndMonth"
              @change="handleMonthRangeChange"
            />
          </div>
          
          <!-- 負責人 -->
          <div class="filter-item select-item">
            <a-select
              v-model:value="localFilters.assignee"
              placeholder="全部負責人"
              allow-clear
              size="small"
              show-search
              :filter-option="filterUserOption"
              @change="handleFilterChange"
              class="filter-input"
            >
              <template #suffixIcon>
                <UserOutlined />
              </template>
              <a-select-option :value="null">全部負責人</a-select-option>
              <a-select-option
                v-for="user in users"
                :key="getUserId(user)"
                :value="getUserId(user)"
              >
                {{ getUserName(user) }}
              </a-select-option>
            </a-select>
          </div>
          
          <!-- 標籤 -->
          <div class="filter-item select-item">
            <a-select
              v-model:value="localFilters.tags"
              placeholder="全部標籤"
              allow-clear
              size="small"
              show-search
              :filter-option="filterTagOption"
              @change="handleFilterChange"
              class="filter-input"
            >
              <template #suffixIcon>
                <TagOutlined />
              </template>
              <a-select-option :value="null">全部標籤</a-select-option>
              <a-select-option
                v-for="tag in validTags"
                :key="getTagId(tag)"
                :value="getTagId(tag)"
              >
                {{ getTagName(tag) }}
              </a-select-option>
            </a-select>
          </div>
          
          <!-- 狀態 -->
          <div class="filter-item select-item">
            <a-select
              v-model:value="localFilters.status"
              placeholder="全部狀態"
              allow-clear
              size="small"
              @change="handleFilterChange"
              class="filter-input"
            >
              <template #suffixIcon>
                <CheckCircleOutlined />
              </template>
              <a-select-option :value="null">全部狀態</a-select-option>
              <a-select-option value="pending">待處理</a-select-option>
              <a-select-option value="in_progress">進行中</a-select-option>
              <a-select-option value="completed">已完成</a-select-option>
              <a-select-option value="cancelled">已取消</a-select-option>
            </a-select>
          </div>
          
          <!-- 到期狀態 -->
          <div class="filter-item select-item select-item-due">
            <a-select
              v-model:value="localFilters.due"
              placeholder="全部到期狀態"
              allow-clear
              size="small"
              @change="handleFilterChange"
              class="filter-input"
            >
              <template #suffixIcon>
                <ClockCircleOutlined />
              </template>
              <a-select-option :value="null">全部到期狀態</a-select-option>
              <a-select-option value="overdue">已逾期</a-select-option>
              <a-select-option value="soon">即將到期（≤3天）</a-select-option>
            </a-select>
          </div>
          
          <!-- 隱藏已完成 -->
          <div class="filter-item checkbox-item">
            <a-checkbox
              v-model:checked="localFilters.hide_completed"
              @change="handleFilterChange"
            >
              隱藏已完成
            </a-checkbox>
          </div>
        </div>
        
        <!-- 第二子行：高級篩選 + 操作按鈕 -->
        <div class="filter-row-main-second">
          <!-- 服務類型多選 -->
          <div class="filter-item filter-item-inline">
            <a-select
              v-model:value="localFilters.service_types"
              mode="multiple"
              placeholder="選擇服務類型"
              allow-clear
              class="filter-input"
              size="small"
              show-search
              :filter-option="filterServiceTypeOption"
              @change="handleFilterChange"
              :max-tag-count="2"
            >
              <template #suffixIcon>
                <AppstoreOutlined />
              </template>
              <a-select-option
                v-for="service in validServices"
                :key="getServiceId(service)"
                :value="getServiceId(service)"
              >
                {{ getServiceName(service) }}
              </a-select-option>
            </a-select>
          </div>
          
          <!-- 標籤多選 -->
          <div class="filter-item filter-item-inline">
            <a-select
              v-model:value="localFilters.tags_multiple"
              mode="multiple"
              placeholder="選擇標籤"
              allow-clear
              class="filter-input"
              size="small"
              show-search
              :filter-option="filterTagOption"
              @change="handleFilterChange"
              :max-tag-count="2"
            >
              <template #suffixIcon>
                <TagOutlined />
              </template>
              <a-select-option
                v-for="tag in validTags"
                :key="getTagId(tag)"
                :value="getTagId(tag)"
              >
                {{ getTagName(tag) }}
              </a-select-option>
            </a-select>
          </div>
          
          <!-- 是否可開始篩選 -->
          <div class="filter-item filter-item-inline filter-item-can-start">
            <a-select
              v-model:value="localFilters.can_start"
              placeholder="是否可開始"
              allow-clear
              class="filter-input"
              size="small"
              @change="handleFilterChange"
            >
              <template #suffixIcon>
                <PlayCircleOutlined />
              </template>
              <a-select-option :value="null">全部</a-select-option>
              <a-select-option :value="true">可開始</a-select-option>
              <a-select-option :value="false">不可開始</a-select-option>
            </a-select>
          </div>
          
          <!-- 我的任務篩選 -->
          <div class="filter-item checkbox-item">
            <a-checkbox
              v-model:checked="localFilters.my_tasks"
              @change="handleFilterChange"
            >
              我的任務
            </a-checkbox>
          </div>
          
          <!-- 操作按鈕 -->
          <div class="action-buttons-inline">
            <a-button
              size="small"
              :icon="h(ReloadOutlined)"
              @click="handleRefresh"
              :loading="loading"
              class="action-btn-inline"
            >
              刷新
            </a-button>
            <a-button
              v-if="selectedTaskIds.length > 0"
              size="small"
              :icon="h(UserAddOutlined)"
              @click="handleBatchAssign"
              class="action-btn-inline"
            >
              批量分配 ({{ selectedTaskIds.length }})
            </a-button>
          </div>
        </div>
      </div>
      
      <!-- 第二行：客戶選擇控制 + 統計摘要 (連續排列，無分隔線) -->
      <div class="filter-row-toolbar">
        <!-- 客戶選擇控制 -->
        <div class="toolbar-controls">
          <a-checkbox
            :indeterminate="listToolbarIndeterminate"
            :checked="listToolbarAllSelected"
            @change="handleListToolbarSelectAll"
          >
            全選客戶
          </a-checkbox>
          <a-button
            type="default"
            size="small"
            @click="handleListToolbarExpandAll"
            class="toolbar-btn-collapse"
          >
            {{ listToolbarAllExpanded ? '一鍵收合' : '一鍵展開' }}
          </a-button>
        </div>
        
        <!-- 統計摘要 - 連續排列在第二行，無分隔線 -->
        <div class="stats-wrapper-inline">
          <TaskOverviewStats
            :stats="stats"
            :loading="statsLoading"
            @stat-click="handleStatClick"
          />
        </div>
      </div>
    </div>
  </FilterCard>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, h } from 'vue'
import dayjs from 'dayjs'
import { 
  SearchOutlined, 
  CalendarOutlined, 
  UserOutlined, 
  TagOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  UserAddOutlined, 
  AppstoreOutlined, 
  PlayCircleOutlined, 
  ReloadOutlined 
} from '@ant-design/icons-vue'
import FilterCard from '@/components/shared/FilterCard.vue'
import TaskOverviewStats from '@/components/tasks/TaskOverviewStats.vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  users: {
    type: Array,
    default: () => []
  },
  tags: {
    type: Array,
    default: () => []
  },
  services: {
    type: Array,
    default: () => []
  },
  selectedTaskIds: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  stats: {
    type: Object,
    default: () => ({
      total: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
      can_start: 0
    })
  },
  statsLoading: {
    type: Boolean,
    default: false
  },
  listToolbarAllSelected: {
    type: Boolean,
    default: false
  },
  listToolbarIndeterminate: {
    type: Boolean,
    default: false
  },
  listToolbarAllExpanded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['filters-change', 'batch-assign', 'refresh', 'stat-click', 'select-all-clients', 'expand-all-clients'])

// 過濾無效的 ID 值
const filterValidIds = (ids) => {
  // 如果不是數組，直接返回 undefined（Ant Design Vue multiple mode 需要 undefined 或 [] 來顯示 placeholder）
  if (!Array.isArray(ids)) return undefined
  
  // 過濾掉所有無效值
  const validIds = ids.filter(id => {
    // 排除 null, undefined, 空字符串, 0, 字符串 'null', 'undefined'
    if (id == null || id === '' || id === 0) return false
    if (typeof id === 'string' && (id === 'null' || id === 'undefined' || id.trim() === '')) return false
    // 確保 ID 是有效的數字或非空字符串
    if (typeof id === 'number' && (isNaN(id) || id <= 0)) return false
    return true
  })
  
  // 如果過濾後沒有有效值，返回 undefined 以顯示 placeholder（Ant Design Vue multiple mode 需要 undefined）
  return validIds.length > 0 ? validIds : undefined
}

// 初始化 localFilters，強制設置為 undefined 以避免空字串問題
// Ant Design Vue 的 multiple mode 需要 undefined 或 [] 來顯示 placeholder，使用 undefined 更明確
const initialFilters = { ...props.filters }
// 強制清理並設置 service_types 和 tags_multiple 為 undefined
const cleanArrayValue = (value) => {
  if (!Array.isArray(value)) return undefined
  const validIds = value.filter(id => {
    if (id == null || id === '' || id === 0 || id === undefined) return false
    if (typeof id === 'string' && (id === 'null' || id === 'undefined' || id.trim() === '')) return false
    if (typeof id === 'number' && (isNaN(id) || id <= 0)) return false
    return true
  })
  return validIds.length > 0 ? validIds : undefined
}

initialFilters.service_types = cleanArrayValue(initialFilters.service_types)
initialFilters.tags_multiple = cleanArrayValue(initialFilters.tags_multiple)

const localFilters = ref(initialFilters)

// 在組件掛載後強制清理一次，確保沒有空字串項目
onMounted(() => {
  // 使用 nextTick 確保 DOM 已渲染
  nextTick(() => {
    // 強制清理 service_types 和 tags_multiple，確保沒有空字串或無效值
    // 使用 undefined 而不是 null，因為 Ant Design Vue multiple mode 需要 undefined 來顯示 placeholder
    const cleanArrayValue = (value) => {
      if (!Array.isArray(value)) return undefined
      const validIds = value.filter(id => {
        if (id == null || id === '' || id === 0 || id === undefined) return false
        if (typeof id === 'string' && (id === 'null' || id === 'undefined' || id.trim() === '')) return false
        if (typeof id === 'number' && (isNaN(id) || id <= 0)) return false
        return true
      })
      return validIds.length > 0 ? validIds : undefined
    }
    
    let needsUpdate = false
    
    // 檢查並清理 service_types
    const cleanedServiceTypes = cleanArrayValue(localFilters.value.service_types)
    // 使用更嚴格的比較，確保 undefined 和 null 都被正確處理
    const currentServiceTypes = localFilters.value.service_types
    const serviceTypesChanged = 
      (currentServiceTypes === undefined && cleanedServiceTypes !== undefined) ||
      (currentServiceTypes !== undefined && cleanedServiceTypes === undefined) ||
      (Array.isArray(currentServiceTypes) && Array.isArray(cleanedServiceTypes) && 
       JSON.stringify(currentServiceTypes) !== JSON.stringify(cleanedServiceTypes))
    
    if (serviceTypesChanged) {
      localFilters.value.service_types = cleanedServiceTypes
      needsUpdate = true
    }
    
    // 檢查並清理 tags_multiple
    const cleanedTagsMultiple = cleanArrayValue(localFilters.value.tags_multiple)
    const currentTagsMultiple = localFilters.value.tags_multiple
    const tagsMultipleChanged = 
      (currentTagsMultiple === undefined && cleanedTagsMultiple !== undefined) ||
      (currentTagsMultiple !== undefined && cleanedTagsMultiple === undefined) ||
      (Array.isArray(currentTagsMultiple) && Array.isArray(cleanedTagsMultiple) && 
       JSON.stringify(currentTagsMultiple) !== JSON.stringify(cleanedTagsMultiple))
    
    if (tagsMultipleChanged) {
      localFilters.value.tags_multiple = cleanedTagsMultiple
      needsUpdate = true
    }
    
    // 如果有更新，觸發 handleFilterChange 以同步到父組件
    if (needsUpdate) {
      handleFilterChange()
    }
  })
})

// 監聽 props 變化
watch(() => props.filters, (newFilters) => {
  // 確保 service_types 和 tags_multiple 是數組或 undefined，不是空數組，並過濾無效值
  // 使用 undefined 而不是 null，因為 Ant Design Vue multiple mode 需要 undefined 來顯示 placeholder
  const cleanedFilters = { ...newFilters }
  cleanedFilters.service_types = filterValidIds(cleanedFilters.service_types)
  cleanedFilters.tags_multiple = filterValidIds(cleanedFilters.tags_multiple)
  
  // 確保過濾後的值正確設置為 undefined（如果為空）
  if (cleanedFilters.service_types === null || cleanedFilters.service_types === undefined || 
      (Array.isArray(cleanedFilters.service_types) && cleanedFilters.service_types.length === 0)) {
    cleanedFilters.service_types = undefined
  }
  if (cleanedFilters.tags_multiple === null || cleanedFilters.tags_multiple === undefined || 
      (Array.isArray(cleanedFilters.tags_multiple) && cleanedFilters.tags_multiple.length === 0)) {
    cleanedFilters.tags_multiple = undefined
  }
  
  // 更新 localFilters，但只在值真正改變時更新
  const currentServiceTypes = localFilters.value.service_types
  const currentTagsMultiple = localFilters.value.tags_multiple
  
  // 使用更嚴格的比較，確保 undefined 和 null 都被正確處理
  const serviceTypesChanged = 
    (currentServiceTypes === undefined && cleanedFilters.service_types !== undefined) ||
    (currentServiceTypes !== undefined && cleanedFilters.service_types === undefined) ||
    (Array.isArray(currentServiceTypes) && Array.isArray(cleanedFilters.service_types) && 
     JSON.stringify(currentServiceTypes) !== JSON.stringify(cleanedFilters.service_types))
  
  const tagsMultipleChanged = 
    (currentTagsMultiple === undefined && cleanedFilters.tags_multiple !== undefined) ||
    (currentTagsMultiple !== undefined && cleanedFilters.tags_multiple === undefined) ||
    (Array.isArray(currentTagsMultiple) && Array.isArray(cleanedFilters.tags_multiple) && 
     JSON.stringify(currentTagsMultiple) !== JSON.stringify(cleanedFilters.tags_multiple))
  
  if (serviceTypesChanged || tagsMultipleChanged) {
    localFilters.value = { ...localFilters.value, ...cleanedFilters }
  }
}, { deep: true, immediate: true })

// 處理篩選變化
const handleFilterChange = () => {
  // 清理空數組和無效值，轉為 undefined，避免顯示灰色無內容方塊
  // 使用 undefined 而不是 null，因為 Ant Design Vue multiple mode 需要 undefined 來顯示 placeholder
  const cleanedFilters = { ...localFilters.value }
  
  // 過濾無效值 - 特別處理空字串、null、undefined、0
  if (Array.isArray(cleanedFilters.service_types)) {
    const validIds = cleanedFilters.service_types.filter(id => {
      // 排除所有無效值
      if (id == null || id === '' || id === 0 || id === undefined) return false
      if (typeof id === 'string' && (id === 'null' || id === 'undefined' || id.trim() === '')) return false
      // 確保 ID 是有效的數字或非空字符串
      if (typeof id === 'number' && (isNaN(id) || id <= 0)) return false
      return true
    })
    // 如果過濾後為空，設為 undefined 以顯示 placeholder
    cleanedFilters.service_types = validIds.length > 0 ? validIds : undefined
  } else {
    cleanedFilters.service_types = undefined
  }
  
  if (Array.isArray(cleanedFilters.tags_multiple)) {
    const validIds = cleanedFilters.tags_multiple.filter(id => {
      // 排除所有無效值
      if (id == null || id === '' || id === 0 || id === undefined) return false
      if (typeof id === 'string' && (id === 'null' || id === 'undefined' || id.trim() === '')) return false
      // 確保 ID 是有效的數字或非空字符串
      if (typeof id === 'number' && (isNaN(id) || id <= 0)) return false
      return true
    })
    // 如果過濾後為空，設為 undefined 以顯示 placeholder
    cleanedFilters.tags_multiple = validIds.length > 0 ? validIds : undefined
  } else {
    cleanedFilters.tags_multiple = undefined
  }
  
  // 同步更新 localFilters 以確保 UI 正確顯示
  localFilters.value = { ...localFilters.value, ...cleanedFilters }
  
  emit('filters-change', cleanedFilters)
}

// 處理批量分配
const handleBatchAssign = () => {
  emit('batch-assign')
}

// 處理刷新
const handleRefresh = () => {
  emit('refresh')
}

// 處理統計項點擊
const handleStatClick = (statType) => {
  emit('stat-click', statType)
}

// 處理全選客戶
const handleListToolbarSelectAll = (e) => {
  emit('select-all-clients', e.target.checked)
}

// 處理一鍵展開/收合
const handleListToolbarExpandAll = () => {
  emit('expand-all-clients')
}

// 處理搜索
const handleSearch = () => {
  handleFilterChange()
}

// 月份範圍驗證：禁用結束月份小於開始月份的日期
const disableEndMonth = (date) => {
  if (!localFilters.value.service_month_start) {
    return false
  }
  const startMonth = dayjs(localFilters.value.service_month_start)
  const currentMonth = dayjs(date)
  return currentMonth.isBefore(startMonth, 'month')
}

// 處理月份範圍變化
const handleMonthRangeChange = () => {
  // 驗證月份範圍
  if (localFilters.value.service_month_start && localFilters.value.service_month_end) {
    const startMonth = dayjs(localFilters.value.service_month_start)
    const endMonth = dayjs(localFilters.value.service_month_end)
    
    if (endMonth.isBefore(startMonth, 'month')) {
      // 如果結束月份小於開始月份，自動調整為開始月份
      localFilters.value.service_month_end = localFilters.value.service_month_start
    }
  }
  
  handleFilterChange()
}

// 用戶過濾函數
const filterUserOption = (input, option) => {
  const userName = option.children?.[0]?.children || option.children || ''
  return userName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 標籤過濾函數
const filterTagOption = (input, option) => {
  const tagName = option.children?.[0]?.children || option.children || ''
  return tagName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 服務類型過濾函數
const filterServiceTypeOption = (input, option) => {
  const serviceName = option.children?.[0]?.children || option.children || ''
  return serviceName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 獲取用戶ID（處理不同字段名）
const getUserId = (user) => {
  return user.userId || user.user_id || user.id
}

// 獲取用戶名稱（處理不同字段名）
const getUserName = (user) => {
  return user.name || user.userName || user.user_name || '未命名'
}

// 獲取標籤ID（處理不同字段名）
// 獲取標籤ID（處理不同字段名，確保不返回無效值）
const getTagId = (tag) => {
  if (!tag) return null
  const id = tag.tagId || tag.tag_id || tag.id
  // 過濾無效值
  if (id == null || id === '' || id === 0 || id === undefined) {
    return null
  }
  return id
}

// 獲取標籤名稱（處理不同字段名）
const getTagName = (tag) => {
  if (!tag) return '未命名'
  return tag.tagName || tag.tag_name || tag.name || '未命名'
}

// 獲取服務ID（處理不同字段名，確保不返回無效值）
const getServiceId = (service) => {
  if (!service) return null
  const id = service.serviceId || service.service_id || service.id
  // 過濾無效值
  if (id == null || id === '' || id === 0 || id === undefined) {
    return null
  }
  return id
}

// 獲取服務名稱（處理不同字段名）
const getServiceName = (service) => {
  if (!service) return '未命名'
  return service.serviceName || service.service_name || service.name || '未命名'
}

// 計算有效的服務列表（過濾掉 ID 無效的服務）
const validServices = computed(() => {
  if (!Array.isArray(props.services)) return []
  return props.services.filter(service => {
    const id = getServiceId(service)
    return id != null && id !== '' && id !== 0 && id !== undefined
  })
})

// 計算有效的標籤列表（過濾掉 ID 無效的標籤）
const validTags = computed(() => {
  if (!Array.isArray(props.tags)) return []
  return props.tags.filter(tag => {
    const id = getTagId(tag)
    return id != null && id !== '' && id !== 0 && id !== undefined
  })
})
</script>

<style scoped>
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 第一行容器 - 包含兩個子行，無視覺分隔 */
.filter-row-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 第一子行：基本篩選項目 */
.filter-row-main-first {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  width: 100%;
}

/* 第二子行：高級篩選 + 操作按鈕 */
.filter-row-main-second {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  width: 100%;
  margin-top: 6px; /* 與第一子行的間距，無其他視覺分隔 */
}

/* 篩選項目基礎樣式 */
.filter-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 重點：確保搜索欄及篩選框內文字完整顯示 */
.filter-item input,
.filter-item .ant-select,
.filter-item .ant-picker {
  width: 100%;
}

.filter-item .ant-select-selector {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 確保選擇框內容完整顯示 */
.filter-item .ant-select-selection-item,
.filter-item .ant-select-selection-placeholder {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 第一子行項目尺寸 - 確保文字完整顯示 */
.search-item {
  flex: 1 1 auto;
  min-width: 280px !important; /* 增加寬度以完整顯示「搜尋任務/客戶/統編…」 */
  max-width: 350px !important;
}

.date-item {
  flex: 0 0 110px !important;
  min-width: 110px !important;
  max-width: 110px !important;
}

.select-item {
  flex: 0 0 120px !important;
  min-width: 120px !important;
  max-width: 120px !important;
}

/* 到期狀態需要更寬以顯示完整文字 */
.select-item-due {
  flex: 0 0 145px !important; /* 增加寬度以完整顯示「全部到期狀態」 */
  min-width: 145px !important;
  max-width: 145px !important;
}

.checkbox-item {
  flex: 0 0 auto;
  align-items: center;
  padding-top: 4px;
}

.filter-input {
  width: 100%;
}

/* 第二子行項目 - 高級篩選 */
.filter-item-inline {
  flex-shrink: 1;
  min-width: 180px !important; /* 增加寬度以完整顯示 placeholder 和選中項目 */
  max-width: 250px !important;
}

.filter-item-can-start {
  min-width: 120px !important;
}

/* 操作按鈕組 */
.action-buttons-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: nowrap;
  margin-left: auto; /* 推到右側 */
}

.action-btn-inline {
  padding: 0 6px;
  font-size: 12px;
}

/* 第二行：客戶選擇控制 + 統計摘要 (連續排列，無分隔線) */
.filter-row-toolbar {
  display: flex;
  align-items: center;
  gap: 8px; /* 連續排列，統一間距 */
  padding-top: 6px;
  margin-top: 6px;
  border-top: 1px solid #f0f0f0; /* 僅與第一行分隔 */
  flex-wrap: nowrap;
  justify-content: flex-start; /* 從左開始連續排列 */
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-btn-collapse {
  padding: 0 12px;
  height: 28px;
  font-size: 13px;
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #595959;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.toolbar-btn-collapse:hover {
  border-color: #1890ff;
  color: #1890ff;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.12);
}

/* 統計摘要 - 連續排列在第二行，無額外左邊距 */
.stats-wrapper-inline {
  flex: 0 0 auto;
  height: 28px;
  margin-left: 0; /* 無額外左邊距，與客戶選擇控制連續排列 */
  display: flex;
  align-items: center;
  overflow: hidden;
}

/* 響應式設計 - 重點：優先保證文字完整顯示 */
@media (max-width: 1600px) {
  /* 仍嘗試單行，但確保最小寬度足夠顯示文字 */
  .search-item {
    min-width: 260px !important; /* 確保完整顯示「搜尋任務/客戶/統編…」 */
    max-width: 320px !important;
  }
  
  .date-item {
    flex: 0 0 105px !important;
    min-width: 105px !important;
    max-width: 105px !important;
  }
  
  .select-item {
    flex: 0 0 115px !important;
    min-width: 115px !important;
    max-width: 115px !important;
  }
  
  .select-item-due {
    flex: 0 0 140px !important; /* 確保完整顯示「全部到期狀態」 */
    min-width: 140px !important;
    max-width: 140px !important;
  }
  
  .filter-item-inline {
    min-width: 170px !important; /* 確保完整顯示 placeholder */
    max-width: 240px !important;
  }
}

@media (max-width: 1400px) {
  /* 仍嘗試單行，但優先保證文字完整 */
  .search-item {
    min-width: 240px !important; /* 確保完整顯示「搜尋任務/客戶/統編…」 */
    max-width: 300px !important;
  }
  
  .date-item {
    flex: 0 0 100px !important;
    min-width: 100px !important;
    max-width: 100px !important;
  }
  
  .select-item {
    flex: 0 0 110px !important;
    min-width: 110px !important;
    max-width: 110px !important;
  }
  
  .select-item-due {
    flex: 0 0 135px !important; /* 確保完整顯示「全部到期狀態」 */
    min-width: 135px !important;
    max-width: 135px !important;
  }
  
  .filter-item-inline {
    min-width: 160px !important; /* 確保完整顯示 placeholder */
    max-width: 220px !important;
    flex-shrink: 1;
  }
  
  .filter-item-can-start {
    min-width: 115px !important;
  }
}

@media (max-width: 1200px) {
  /* 允許換行以保證文字完整顯示 */
  .filter-row-main-first,
  .filter-row-main-second {
    flex-wrap: wrap; /* 允許換行以確保文字完整 */
  }
  
  .filter-row-toolbar {
    flex-wrap: wrap; /* 第二行也可換行 */
  }
}

@media (max-width: 768px) {
  /* 多行布局，優先保證文字完整和可讀性 */
  .filter-row-main-first,
  .filter-row-main-second {
    flex-wrap: wrap;
  }
  
  .filter-row-toolbar {
    flex-wrap: wrap;
  }
  
  .action-buttons-inline {
    margin-left: 0;
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

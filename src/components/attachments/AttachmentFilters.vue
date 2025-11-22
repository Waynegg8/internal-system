<template>
  <FilterCard>
    <div class="filter-section">
      <div class="filter-row-main">
        <div class="filter-row-main-first">
          <!-- 關鍵詞搜尋 -->
          <div class="filter-item search-item">
            <a-input-search
              v-model:value="localFilters.q"
              placeholder="搜尋附件名稱…"
              allow-clear
              @search="handleFilterChange"
              @press-enter="handleFilterChange"
              size="small"
              class="filter-input"
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </a-input-search>
          </div>
          
          <!-- 實體類型篩選 -->
          <div class="filter-item select-item">
            <a-select
              v-model:value="localFilters.entity_type"
              placeholder="全部類型"
              allow-clear
              size="small"
              @change="handleEntityTypeChange"
              class="filter-input"
            >
              <template #suffixIcon>
                <FolderOutlined />
              </template>
              <a-select-option :value="undefined">全部類型</a-select-option>
              <a-select-option value="task">任務</a-select-option>
              <a-select-option value="client">客戶</a-select-option>
              <a-select-option value="sop">SOP</a-select-option>
              <a-select-option value="receipt">收據</a-select-option>
            </a-select>
          </div>
          
          <!-- 實體 ID 篩選（動態顯示） -->
          <div 
            v-if="localFilters.entity_type" 
            class="filter-item select-item"
          >
            <a-select
              v-model:value="localFilters.entity_id"
              :placeholder="getEntityIdPlaceholder()"
              allow-clear
              size="small"
              show-search
              :filter-option="filterEntityOption"
              @change="handleFilterChange"
              :loading="entityListLoading"
              class="filter-input"
            >
              <template #suffixIcon>
                <FileTextOutlined />
              </template>
              <a-select-option :value="undefined">全部{{ getEntityTypeLabel() }}</a-select-option>
              <template v-if="entityOptions.length > 0">
                <a-select-option
                  v-for="entity in entityOptions"
                  :key="getEntityId(entity)"
                  :value="getEntityId(entity)"
                >
                  {{ getEntityName(entity) }}
                </a-select-option>
              </template>
            </a-select>
          </div>
        </div>
      </div>
    </div>
  </FilterCard>
</template>

<script setup>
import { ref, watch, computed, onMounted, h } from 'vue'
import { 
  SearchOutlined, 
  FolderOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'
import FilterCard from '@/components/shared/FilterCard.vue'
import { getClients, fetchAllClients } from '@/api/clients'
import { useTaskApi } from '@/api/tasks'
import { fetchSOPs } from '@/api/knowledge'
import { useReceiptApi } from '@/api/receipts'
import { extractApiArray, extractApiData } from '@/utils/apiHelpers'

const props = defineProps({
  filters: {
    type: Object,
    required: true,
    default: () => ({
      entity_type: undefined,
      entity_id: undefined,
      q: ''
    })
  }
})

const emit = defineEmits(['filters-change'])

// 本地篩選狀態
const localFilters = ref({ ...props.filters })

// 實體列表選項
const entityOptions = ref([])
const entityListLoading = ref(false)

// 任務 API
const taskApi = useTaskApi()
const receiptApi = useReceiptApi()

// 監聽 props 變化
watch(() => props.filters, (newFilters) => {
  const oldEntityType = localFilters.value.entity_type
  localFilters.value = { ...newFilters }
  
  // 如果 entity_type 改變，需要重新載入實體列表並清空 entity_id
  if (newFilters.entity_type !== oldEntityType) {
    localFilters.value.entity_id = undefined
    loadEntityList(newFilters.entity_type)
  }
}, { deep: true, immediate: true })

// 載入實體列表
const loadEntityList = async (entityType) => {
  if (!entityType) {
    entityOptions.value = []
    return
  }

  entityListLoading.value = true
  entityOptions.value = []

  try {
    let response
    let entities = []

    switch (entityType) {
      case 'task':
        // 載入任務列表
        response = await taskApi.fetchTasks({ perPage: 1000, status: 'all' })
        const taskData = extractApiData(response, [])
        entities = Array.isArray(taskData) ? taskData : (taskData?.tasks || [])
        entityOptions.value = entities.map(task => ({
          id: task.task_id,
          name: task.task_type || `任務 #${task.task_id}`,
          ...task
        }))
        break

      case 'client':
        // 載入客戶列表
        response = await fetchAllClients({ perPage: 1000 })
        const clientData = extractApiData(response, [])
        entities = Array.isArray(clientData) ? clientData : (clientData?.clients || [])
        entityOptions.value = entities.map(client => ({
          id: client.client_id,
          name: client.company_name || client.client_id,
          ...client
        }))
        break

      case 'sop':
        // 載入 SOP 列表
        response = await fetchSOPs({ perPage: 1000 })
        const sopData = extractApiData(response, [])
        entities = Array.isArray(sopData) ? sopData : (sopData?.sops || [])
        entityOptions.value = entities.map(sop => ({
          id: sop.sop_id,
          name: sop.title || `SOP #${sop.sop_id}`,
          ...sop
        }))
        break

      case 'receipt':
        // 載入收據列表
        response = await receiptApi.fetchAllReceipts({ perPage: 1000 })
        const receiptData = extractApiData(response, [])
        entities = Array.isArray(receiptData) ? receiptData : (receiptData?.receipts || [])
        entityOptions.value = entities.map(receipt => ({
          id: receipt.receipt_id,
          name: receipt.receipt_id || `收據 #${receipt.receipt_id}`,
          ...receipt
        }))
        break

      default:
        entityOptions.value = []
    }
  } catch (error) {
    console.error('載入實體列表失敗:', error)
    entityOptions.value = []
  } finally {
    entityListLoading.value = false
  }
}

// 處理實體類型變更
const handleEntityTypeChange = () => {
  // 清空 entity_id 當 entity_type 改變
  localFilters.value.entity_id = undefined
  // 載入對應的實體列表（如果 entity_type 為 undefined，會清空列表）
  loadEntityList(localFilters.value.entity_type)
  // 觸發篩選變更
  handleFilterChange()
}

// 處理篩選條件變更
const handleFilterChange = () => {
  // 清理空值
  const cleanedFilters = { ...localFilters.value }
  
  // 移除空字符串、null、undefined
  Object.keys(cleanedFilters).forEach(key => {
    if (cleanedFilters[key] === '' || cleanedFilters[key] === null || cleanedFilters[key] === undefined) {
      delete cleanedFilters[key]
    }
  })
  
  // 確保 entity_id 為字符串（後端期望 TEXT 類型）
  if (cleanedFilters.entity_id !== undefined) {
    cleanedFilters.entity_id = String(cleanedFilters.entity_id)
  }
  
  emit('filters-change', cleanedFilters)
}

// 獲取實體 ID（轉為字符串以符合後端 TEXT 類型）
const getEntityId = (entity) => {
  if (!entity) return undefined
  const id = entity.id || entity.task_id || entity.client_id || entity.sop_id || entity.receipt_id
  return id !== undefined && id !== null ? String(id) : undefined
}

// 獲取實體名稱
const getEntityName = (entity) => {
  if (!entity) return ''
  return entity.name || entity.task_type || entity.company_name || entity.title || entity.receipt_id || ''
}

// 獲取實體類型標籤
const getEntityTypeLabel = () => {
  const labels = {
    task: '任務',
    client: '客戶',
    sop: 'SOP',
    receipt: '收據'
  }
  return labels[localFilters.value.entity_type] || '實體'
}

// 獲取實體 ID 下拉框 placeholder
const getEntityIdPlaceholder = () => {
  return `選擇${getEntityTypeLabel()}`
}

// 實體選項過濾
const filterEntityOption = (input, option) => {
  const text = option.children?.[0]?.children || option.children || ''
  return String(text).toLowerCase().includes(input.toLowerCase())
}

// 組件掛載時載入實體列表
onMounted(() => {
  if (localFilters.value.entity_type) {
    loadEntityList(localFilters.value.entity_type)
  }
})
</script>

<style scoped>
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-row-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-row-main-first {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-item {
  flex-shrink: 0;
}

.filter-item.search-item {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.filter-item.select-item {
  min-width: 150px;
  max-width: 250px;
}

.filter-input {
  width: 100%;
}
</style>

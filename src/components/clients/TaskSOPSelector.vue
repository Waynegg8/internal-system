<template>
  <div class="task-sop-selector">
    <!-- 服務層級 SOP（自動讀取，只顯示） -->
    <a-form-item label="服務層級 SOP（自動配置）">
      <div v-if="serviceLevelSOPs.length > 0" style="padding: 12px; background: #f0f9ff; border-radius: 4px; border-left: 3px solid #3b82f6;">
        <div style="font-size: 12px; color: #1e40af; margin-bottom: 8px; font-weight: 500;">
          系統已自動配置以下 SOP（{{ serviceLevelSOPs.length }}個）
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <a-tag
            v-for="sop in sortedServiceLevelSOPs"
            :key="getSOPId(sop)"
            color="blue"
          >
            {{ getSOPTitle(sop) }}
            <span v-if="isClientSpecificSOP(sop)" style="margin-left: 4px; font-size: 11px;">
              [客戶專屬]
            </span>
          </a-tag>
        </div>
      </div>
      <div v-else style="color: #9ca3af; font-size: 13px; padding: 12px; background: #f9fafb; border-radius: 4px;">
        此服務暫無專屬的服務層級 SOP
      </div>
      <template #help>
        <span style="color: #6b7280; font-size: 12px;">
          系統自動配置：優先使用客戶專屬 SOP，否則使用服務通用 SOP
        </span>
      </template>
    </a-form-item>

    <!-- 任務層級 SOP（內聯選擇） -->
    <a-form-item label="任務層級 SOP（可選）">
      <div v-if="taskLevelSOPs.length === 0" style="color: #9ca3af; font-size: 13px; padding: 8px; background: #f9fafb; border-radius: 4px;">
        此服務暫無專屬的任務層級 SOP
      </div>
      <div v-else>
        <!-- 搜索框 -->
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="搜尋 SOP..."
          style="margin-bottom: 12px;"
          allow-clear
        />

        <!-- 已選擇的 SOP 標籤 -->
        <div v-if="selectedTaskSOPIds.length > 0" style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; font-weight: 500;">
            已選擇（{{ selectedTaskSOPIds.length }}個）：
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <a-tag
              v-for="sopId in selectedTaskSOPIds"
              :key="sopId"
              closable
              @close="removeTaskSOP(sopId)"
              color="green"
              size="small"
            >
              {{ getSOPTitleById(sopId) }}
              <span v-if="isClientSpecificSOPById(sopId)" style="margin-left: 4px; font-size: 11px;">
                [客戶專屬]
              </span>
            </a-tag>
          </div>
        </div>

        <!-- SOP 選擇列表（內聯） -->
        <div class="sop-selection-list">
          <div
            v-for="sop in filteredTaskLevelSOPs"
            :key="getSOPId(sop)"
            class="sop-item"
            :class="{ 'selected': isTaskSOPSelected(sop) }"
          >
            <a-checkbox
              :checked="isTaskSOPSelected(sop)"
              @change="(e) => toggleTaskSOP(sop, e.target.checked)"
            >
              <span class="sop-title">{{ getSOPTitle(sop) }}</span>
              <a-tag
                v-if="isClientSpecificSOP(sop)"
                color="orange"
                size="small"
                style="margin-left: 8px;"
              >
                客戶專屬
              </a-tag>
            </a-checkbox>
          </div>
        </div>

        <!-- 空狀態 -->
        <div v-if="filteredTaskLevelSOPs.length === 0" style="color: #9ca3af; font-size: 13px; padding: 12px; background: #f9fafb; border-radius: 4px; text-align: center;">
          {{ searchKeyword ? '沒有找到匹配的 SOP' : '暫無可用的任務層級 SOP' }}
        </div>
      </div>
      <template #help>
        <span style="color: #6b7280; font-size: 12px;">
          可選擇多個任務層級 SOP，客戶專屬 SOP 會優先顯示
        </span>
      </template>
    </a-form-item>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { fetchAllSOPs } from '@/api/sop'
import { fetchAllServices } from '@/api/services'
import { extractApiArray } from '@/utils/apiHelpers'
import { getId } from '@/utils/fieldHelper'

const props = defineProps({
  // 服務 ID
  serviceId: {
    type: [Number, String],
    required: true
  },
  // 客戶 ID（用於過濾客戶專屬 SOP）
  clientId: {
    type: [Number, String],
    required: false
  },
  // 已選擇的任務層級 SOP IDs
  selectedTaskSOPIds: {
    type: Array,
    default: () => []
  },
  // 是否只讀（僅顯示，不可選擇）
  readOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:selectedTaskSOPIds'])

// 狀態
const allSOPs = ref([])
const allServices = ref([])
const currentServiceCode = ref('')
const searchKeyword = ref('')
const loading = ref(false)

// 獲取 SOP ID
const getSOPId = (sop) => {
  return getId(sop, 'sop_id', 'id')
}

// 獲取 SOP 標題
const getSOPTitle = (sop) => {
  return sop.title || sop.name || ''
}

// 根據 ID 獲取 SOP 標題
const getSOPTitleById = (sopId) => {
  const sop = allSOPs.value.find(s => getSOPId(s) === sopId)
  return sop ? getSOPTitle(sop) : `SOP #${sopId}`
}

// 判斷是否為客戶專屬 SOP
const isClientSpecificSOP = (sop) => {
  return sop.client_id !== null && sop.client_id !== undefined
}

// 根據 ID 判斷是否為客戶專屬 SOP
const isClientSpecificSOPById = (sopId) => {
  const sop = allSOPs.value.find(s => getSOPId(s) === sopId)
  return sop ? isClientSpecificSOP(sop) : false
}

// 服務層級 SOP（根據 service_code 自動過濾，包含客戶專屬 SOP）
const serviceLevelSOPs = computed(() => {
  const serviceCode = currentServiceCode.value || ''
  const sops = allSOPs.value || []
  
  if (!serviceCode || !sops.length) return []
  
  return sops.filter(sop =>
    sop &&
    sop.scope === 'service' &&
    sop.category &&
    (sop.category === serviceCode ||
     sop.category === serviceCode.toLowerCase() ||
     sop.category === serviceCode.toUpperCase()) &&
    // 如果指定了客戶 ID，只顯示通用 SOP 或該客戶的專屬 SOP
    (!props.clientId || !sop.client_id || String(sop.client_id) === String(props.clientId))
  )
})

// 排序後的服務層級 SOP（客戶專屬優先）
const sortedServiceLevelSOPs = computed(() => {
  const sops = [...serviceLevelSOPs.value]
  return sops.sort((a, b) => {
    const aIsClientSpecific = isClientSpecificSOP(a)
    const bIsClientSpecific = isClientSpecificSOP(b)
    
    // 客戶專屬優先
    if (aIsClientSpecific && !bIsClientSpecific) return -1
    if (!aIsClientSpecific && bIsClientSpecific) return 1
    
    // 否則按標題排序
    return getSOPTitle(a).localeCompare(getSOPTitle(b), 'zh-TW')
  })
})

// 任務層級 SOP（根據 service_code 自動過濾，包含客戶專屬 SOP）
const taskLevelSOPs = computed(() => {
  const serviceCode = currentServiceCode.value || ''
  const sops = allSOPs.value || []
  
  if (!serviceCode || !sops.length) return []
  
  return sops.filter(sop =>
    sop &&
    sop.scope === 'task' &&
    sop.category &&
    (sop.category === serviceCode ||
     sop.category === serviceCode.toLowerCase() ||
     sop.category === serviceCode.toUpperCase()) &&
    // 如果指定了客戶 ID，只顯示通用 SOP 或該客戶的專屬 SOP
    (!props.clientId || !sop.client_id || String(sop.client_id) === String(props.clientId))
  )
})

// 排序後的任務層級 SOP（客戶專屬優先）
const sortedTaskLevelSOPs = computed(() => {
  const sops = [...taskLevelSOPs.value]
  return sops.sort((a, b) => {
    const aIsClientSpecific = isClientSpecificSOP(a)
    const bIsClientSpecific = isClientSpecificSOP(b)
    
    // 客戶專屬優先
    if (aIsClientSpecific && !bIsClientSpecific) return -1
    if (!aIsClientSpecific && bIsClientSpecific) return 1
    
    // 否則按標題排序
    return getSOPTitle(a).localeCompare(getSOPTitle(b), 'zh-TW')
  })
})

// 過濾後的任務層級 SOP（根據搜索關鍵字）
const filteredTaskLevelSOPs = computed(() => {
  let sops = sortedTaskLevelSOPs.value
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    sops = sops.filter(sop => {
      const title = getSOPTitle(sop).toLowerCase()
      return title.includes(keyword)
    })
  }
  
  return sops
})

// 判斷任務 SOP 是否已選擇
const isTaskSOPSelected = (sop) => {
  const sopId = getSOPId(sop)
  return props.selectedTaskSOPIds.includes(sopId)
}

// 切換任務 SOP 選擇
const toggleTaskSOP = (sop, checked) => {
  if (props.readOnly) return
  
  const sopId = getSOPId(sop)
  let newSelectedIds = [...props.selectedTaskSOPIds]
  
  if (checked) {
    if (!newSelectedIds.includes(sopId)) {
      newSelectedIds.push(sopId)
    }
  } else {
    newSelectedIds = newSelectedIds.filter(id => id !== sopId)
  }
  
  emit('update:selectedTaskSOPIds', newSelectedIds)
}

// 移除任務 SOP
const removeTaskSOP = (sopId) => {
  if (props.readOnly) return
  
  const newSelectedIds = props.selectedTaskSOPIds.filter(id => id !== sopId)
  emit('update:selectedTaskSOPIds', newSelectedIds)
}

// 載入數據
const loadData = async () => {
  try {
    loading.value = true
    
    // 載入所有 SOP
    const sopsResponse = await fetchAllSOPs({ perPage: 500 })
    allSOPs.value = extractApiArray(sopsResponse, [])
    
    // 載入所有服務
    const servicesResponse = await fetchAllServices()
    const services = extractApiArray(servicesResponse, [])
    allServices.value = services
    
    // 獲取當前服務的 service_code
    const service = services.find(s => getId(s, 'service_id', 'id') == props.serviceId)
    currentServiceCode.value = service?.service_code || ''
  } catch (error) {
    console.error('載入數據失敗:', error)
  } finally {
    loading.value = false
  }
}

// 監聽 serviceId 變化
watch(() => props.serviceId, () => {
  loadData()
}, { immediate: false })

// 初始化
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.task-sop-selector {
  width: 100%;
}

.sop-selection-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 8px;
  background: white;
}

.sop-item {
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
  cursor: pointer;
}

.sop-item:hover {
  background-color: #f3f4f6;
}

.sop-item.selected {
  background-color: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.sop-title {
  font-size: 14px;
  color: #1f2937;
}

.sop-item.selected .sop-title {
  font-weight: 500;
  color: #1e40af;
}
</style>




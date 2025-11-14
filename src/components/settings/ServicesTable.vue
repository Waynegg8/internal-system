<template>
  <a-table
    :columns="columns"
    :data-source="servicesWithChildren"
    :loading="loading"
    :pagination="false"
    row-key="service_id"
    size="middle"
    class="responsive-table"
    :expandable="expandableConfig"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'service_sop'">
        <span v-if="getSOPName(record.service_sop_id)">
          {{ getSOPName(record.service_sop_id) }}
        </span>
        <span v-else style="color: #999">—</span>
      </template>

      <template v-else-if="column.key === 'actions'">
        <a-space>
          <a-button size="small" @click="handleEdit(record)">編輯</a-button>
          <a-button size="small" danger @click="handleDelete(record.service_id)">刪除</a-button>
        </a-space>
      </template>
    </template>

    <template #emptyText>
      <a-empty description="暫無服務項目" />
    </template>

    <!-- 子表格（任務類型） -->
    <template #expandedRowRender="{ record: serviceRecord }">
      <ServiceItemsExpanded
        :key="`service-${serviceRecord.service_id}-${refreshKey}`"
        :service-id="serviceRecord.service_id"
        @add-item="handleAddItem"
        @edit-item="handleEditItem"
        @delete-item="handleDeleteItem"
        @refresh="handleRefreshItems"
      />
    </template>
  </a-table>

  <!-- 任務類型表單 Modal -->
  <a-modal
    v-model:visible="formVisible"
    :title="editingItem ? '編輯任務類型' : '新增任務類型'"
    :width="600"
    :confirm-loading="submitting"
    @ok="handleSubmitItem"
    @cancel="handleCancelItem"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
    >
      <a-form-item label="任務類型名稱" name="item_name">
        <a-input
          v-model:value="form.item_name"
          placeholder="請輸入任務類型名稱"
          :maxlength="100"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { QuestionCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useSettingsApi } from '@/api/settings'
import { extractApiData, extractApiArray } from '@/utils/apiHelpers'
import ServiceItemsExpanded from './ServiceItemsExpanded.vue'

const props = defineProps({
  services: {
    type: Array,
    default: () => []
  },
  serviceSops: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'refresh-items'])

const { showSuccess, showError } = usePageAlert()
const api = useSettingsApi()

// 任務類型數據緩存
const serviceItemsMap = ref(new Map())
const expandedServiceIds = ref(new Set())
const loadingItemsMap = ref(new Map())
const refreshKey = ref(0)

// 表單相關狀態
const formVisible = ref(false)
const submitting = ref(false)
const editingItem = ref(null)
const currentServiceId = ref(null)
const formRef = ref(null)

// 表單數據
const form = ref({
  item_name: ''
})

// 表單驗證規則
const rules = {
  item_name: [
    { required: true, message: '請輸入任務類型名稱', trigger: 'blur' }
  ]
}

// 將服務項目轉換為帶有 children 的結構（去重處理）
const servicesWithChildren = computed(() => {
  // 使用 Map 去重，確保每個 service_id 只出現一次
  const serviceMap = new Map()
  const seenIds = new Set()
  
  // 觸發 serviceItemsMap 的讀取，確保響應式追蹤
  const mapSize = serviceItemsMap.value.size
  
  props.services.forEach(service => {
    const serviceId = service.service_id
    // 如果已經存在，跳過（避免重複）
    if (seenIds.has(serviceId)) {
      console.warn(`[ServicesTable] 發現重複的服務 ID: ${serviceId}，已跳過`, service)
      return
    }
    seenIds.add(serviceId)
    
    // 讀取 serviceItemsMap 以觸發響應式追蹤
    const items = serviceItemsMap.value.get(serviceId) || []
    console.log(`[ServicesTable] servicesWithChildren computed: serviceId=${serviceId}, itemsCount=${items.length}`)
    
    // 再次去重，確保 children 中沒有重複的 item_id
    const itemMap = new Map()
    const uniqueChildren = []
    items.forEach(item => {
      const itemId = item.item_id
      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, true)
        uniqueChildren.push({
          ...item,
          isChild: true,
          parentServiceId: serviceId
        })
      }
    })
    
    const result = {
      ...service,
      children: uniqueChildren
    }
    serviceMap.set(serviceId, result)
  })
  
  const result = Array.from(serviceMap.values())
  console.log(`[ServicesTable] servicesWithChildren computed: 總共 ${result.length} 個服務項目，mapSize=${mapSize}`)
  return result
})

// 展開配置
const expandableConfig = {
  expandedRowKeys: computed(() => Array.from(expandedServiceIds.value)),
  onExpand: (expanded, record) => {
    if (expanded) {
      expandedServiceIds.value.add(record.service_id)
    } else {
      expandedServiceIds.value.delete(record.service_id)
    }
  }
}

// 服務項目表格列定義
const columns = [
  {
    title: 'ID',
    dataIndex: 'service_id',
    key: 'service_id',
    width: 80,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '服務名稱',
    dataIndex: 'service_name',
    key: 'service_name',
    width: '30%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '服務層級 SOP',
    key: 'service_sop',
    width: '30%',
    minWidth: 150,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    align: 'center'
  }
]

// 任務類型表格列定義（只顯示名稱）
const itemColumns = [
  {
    title: '任務類型名稱',
    dataIndex: 'item_name',
    key: 'item_name'
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    align: 'right'
  }
]

// 根據 SOP ID 獲取 SOP 名稱
const getSOPName = (sopId) => {
  if (!sopId) return null
  const sop = props.serviceSops.find(s => s.id === sopId)
  return sop ? sop.title : null
}

// 處理編輯
const handleEdit = (service) => {
  emit('edit', service)
}

// 處理刪除
const handleDelete = (serviceId) => {
  emit('delete', serviceId)
}

// 獲取服務項目的任務類型（用於模板中直接讀取，確保響應式）
const getServiceItems = (serviceId) => {
  const items = serviceItemsMap.value.get(serviceId) || []
  console.log(`[ServicesTable] getServiceItems(${serviceId}): ${items.length} 筆`)
  return items.map(item => ({
    ...item,
    isChild: true,
    parentServiceId: serviceId
  }))
}

// 處理刷新任務類型
const handleRefreshItems = (serviceId) => {
  console.log(`[ServicesTable] 收到刷新任務類型請求: serviceId=${serviceId}`)
  // 觸發子組件重新載入（通過 key 變化）
  refreshKey.value++
}

// 載入服務項目的任務類型
const loadServiceItems = async (serviceId, forceReload = false) => {
  // 如果強制重新載入，或者還沒有載入過，才進行載入
  if (!forceReload && serviceItemsMap.value.has(serviceId)) {
    console.log(`[ServicesTable] 服務項目 ${serviceId} 的任務類型已緩存，跳過載入`)
    return // 已載入，不需要重複載入
  }
  
  console.log(`[ServicesTable] 開始載入服務項目 ${serviceId} 的任務類型，forceReload: ${forceReload}`)

  loadingItemsMap.value.set(serviceId, true)
  try {
    const response = await api.getServiceItems(serviceId)
    console.log(`[ServicesTable] 獲取服務項目 ${serviceId} 的任務類型響應:`, response)
    const data = extractApiData(response, {})
    console.log(`[ServicesTable] 提取後的數據:`, data)
    let items = []
    if (data.items && Array.isArray(data.items)) {
      items = data.items
    } else if (Array.isArray(data)) {
      items = data
    } else {
      items = extractApiArray(response, [])
    }
    // 去重處理：確保每個 item_id 只出現一次
    const itemMap = new Map()
    const uniqueItems = []
    items.forEach(item => {
      const itemId = item.item_id
      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, item)
        uniqueItems.push(item)
      } else {
        console.warn(`[ServicesTable] 發現重複的任務類型 ID: ${itemId} (serviceId=${serviceId})`, item)
      }
    })
    
    console.log(`[ServicesTable] 最終解析的任務類型列表: ${uniqueItems.length} 筆（原始: ${items.length} 筆）`, uniqueItems)
    // 使用 Vue 的響應式更新方式
    const newMap = new Map(serviceItemsMap.value)
    newMap.set(serviceId, uniqueItems)
    serviceItemsMap.value = newMap
    console.log(`[ServicesTable] 已更新 serviceItemsMap[${serviceId}]:`, serviceItemsMap.value.get(serviceId))
    console.log(`[ServicesTable] 當前 serviceItemsMap 大小:`, serviceItemsMap.value.size)
  } catch (error) {
    console.error(`載入服務項目 ${serviceId} 的任務類型失敗:`, error)
    showError('載入任務類型失敗')
    serviceItemsMap.value.set(serviceId, [])
  } finally {
    loadingItemsMap.value.set(serviceId, false)
  }
}

// 處理新增任務類型
const handleAddItem = (serviceId) => {
  currentServiceId.value = serviceId
  editingItem.value = null
  form.value = {
    item_name: ''
  }
  formVisible.value = true
  setTimeout(() => {
    formRef.value?.resetFields()
  }, 0)
}

// 處理編輯任務類型
const handleEditItem = (item, serviceId) => {
  currentServiceId.value = serviceId
  editingItem.value = item
  form.value = {
    item_name: item.item_name || ''
  }
  formVisible.value = true
}

// 處理刪除任務類型
const handleDeleteItem = async (itemId, serviceId) => {
  try {
    const response = await api.deleteServiceItem(serviceId, itemId)
    if (response.ok) {
      showSuccess('刪除成功')
      // 觸發子組件重新載入
      handleRefreshItems(serviceId)
    } else {
      showError(response.message || '刪除失敗')
    }
  } catch (error) {
    console.error('刪除任務類型失敗:', error)
    showError(error.message || '刪除失敗')
  }
}

// 處理提交任務類型表單
const handleSubmitItem = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    const data = {
      item_name: form.value.item_name.trim()
    }

    let response
    if (editingItem.value) {
      // 編輯
      response = await api.updateServiceItem(currentServiceId.value, editingItem.value.item_id, data)
      if (response.ok) {
        showSuccess('更新成功')
        formVisible.value = false
        editingItem.value = null
        // 觸發子組件重新載入
        handleRefreshItems(currentServiceId.value)
      } else {
        showError(response.message || '更新失敗')
      }
    } else {
      // 新增
      response = await api.createServiceItem(currentServiceId.value, data)
      console.log('[ServicesTable] 新增任務類型響應:', response)
      if (response.ok || response.data) {
        showSuccess('新增成功')
        formVisible.value = false
        // 確保該服務項目保持展開狀態
        if (currentServiceId.value) {
          expandedServiceIds.value.add(currentServiceId.value)
        }
        // 等待一小段時間確保後端數據已寫入
        await new Promise(resolve => setTimeout(resolve, 300))
        // 觸發子組件重新載入
        handleRefreshItems(currentServiceId.value)
      } else {
        showError(response.message || '新增失敗')
      }
    }
  } catch (error) {
    if (error.errorFields) {
      // 表單驗證錯誤
      return
    }
    console.error('提交失敗:', error)
    showError(error.message || '操作失敗')
  } finally {
    submitting.value = false
  }
}

// 處理取消表單
const handleCancelItem = () => {
  formVisible.value = false
  editingItem.value = null
  currentServiceId.value = null
  formRef.value?.resetFields()
}

// 監聽服務列表變化，只在服務 ID 列表真正改變時清除緩存
watch(() => props.services.map(s => s.service_id).join(','), (newIds, oldIds) => {
  // 只在服務 ID 列表真正改變時才清除緩存（避免因數組引用變化而誤清除）
  if (newIds !== oldIds && oldIds !== undefined) {
    console.log('[ServicesTable] 服務列表 ID 改變，清除緩存')
    serviceItemsMap.value.clear()
    expandedServiceIds.value.clear()
  }
})
</script>

<style scoped>
/* 表格樣式已由 Ant Design Vue 提供 */
</style>


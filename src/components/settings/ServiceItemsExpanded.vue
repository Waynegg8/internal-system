<template>
  <div style="padding: 12px 0 12px 48px; background: #fafafa;">
    <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 13px; color: #666;">任務類型</span>
      <a-button type="primary" size="small" @click="$emit('add-item', serviceId)">
        <template #icon>
          <plus-outlined />
        </template>
        新增任務類型
      </a-button>
    </div>
    <a-table
      :columns="itemColumns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      row-key="item_id"
      size="small"
      :show-header="false"
    >
      <template #bodyCell="{ column, record: item }">
        <template v-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" type="link" @click="$emit('edit-item', item, serviceId)">編輯</a-button>
            <a-button size="small" type="link" danger @click="$emit('delete-item', item.item_id, serviceId)">刪除</a-button>
          </a-space>
        </template>
      </template>
      <template #emptyText>
        <span style="color: #999; font-size: 12px;">暫無任務類型</span>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useSettingsApi } from '@/api/settings'
import { extractApiData, extractApiArray } from '@/utils/apiHelpers'

const props = defineProps({
  serviceId: {
    type: Number,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add-item', 'edit-item', 'delete-item'])

const api = useSettingsApi()
const items = ref([])

// 任務類型表格列定義
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

// 載入任務類型
const loadItems = async () => {
  console.log(`[ServiceItemsExpanded] 開始載入服務項目 ${props.serviceId} 的任務類型`)
  try {
    const response = await api.getServiceItems(props.serviceId)
    console.log(`[ServiceItemsExpanded] 獲取服務項目 ${props.serviceId} 的任務類型響應:`, response)
    const data = extractApiData(response, {})
    console.log(`[ServiceItemsExpanded] 提取後的數據:`, data)
    let rawItems = []
    if (data.items && Array.isArray(data.items)) {
      rawItems = data.items
    } else if (Array.isArray(data)) {
      rawItems = data
    } else {
      rawItems = extractApiArray(response, [])
    }
    
    // 去重處理
    const itemMap = new Map()
    const uniqueItems = []
    rawItems.forEach(item => {
      const itemId = item.item_id
      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, item)
        uniqueItems.push({
          ...item,
          isChild: true,
          parentServiceId: props.serviceId
        })
      } else {
        console.warn(`[ServiceItemsExpanded] 發現重複的任務類型 ID: ${itemId}`, item)
      }
    })
    
    items.value = uniqueItems
    console.log(`[ServiceItemsExpanded] 載入完成: ${items.value.length} 筆任務類型`, items.value)
  } catch (error) {
    console.error(`[ServiceItemsExpanded] 載入任務類型失敗:`, error)
    items.value = []
  }
}

// 監聽 serviceId 變化，重新載入
watch(() => props.serviceId, () => {
  if (props.serviceId) {
    loadItems()
  }
}, { immediate: true })

// 組件掛載時載入
onMounted(() => {
  if (props.serviceId) {
    loadItems()
  }
})
</script>




<template>
  <a-modal
    v-model:open="modalVisible"
    :title="title"
    :width="600"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-input-search
      v-model:value="searchKeyword"
      placeholder="搜索 SOP"
      style="margin-bottom: 16px"
      allow-clear
    />
    
    <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px">
      <a-checkbox-group v-model:value="selectedIds" style="width: 100%">
        <template v-for="category in groupedSOPs" :key="category.name">
          <a-divider v-if="category.sops.length > 0" orientation="left" style="margin: 16px 0 8px">
            {{ category.name }}
          </a-divider>
          <div v-for="sop in category.sops" :key="sop.sop_id || sop.id" style="margin-bottom: 8px">
            <a-checkbox :value="sop.sop_id || sop.id">
              <span style="font-weight: 500">{{ sop.title || '未命名' }}</span>
              <a-typography-text type="secondary" style="margin-left: 8px; font-size: 12px">
                v{{ sop.version || '1' }}
              </a-typography-text>
            </a-checkbox>
          </div>
        </template>
      </a-checkbox-group>
      
      <a-empty
        v-if="filteredSOPs.length === 0"
        description="沒有找到符合條件的 SOP"
        style="margin: 24px 0"
      />
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getCategoryText } from '@/utils/formatters'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '選擇 SOP'
  },
  selectedSopIds: {
    type: Array,
    default: () => []
  },
  allSops: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:open', 'ok', 'cancel'])

// 彈窗顯示狀態
const modalVisible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// 搜索關鍵字
const searchKeyword = ref('')

// 選中的 SOP ID 列表
const selectedIds = ref([])

// 過濾後的 SOP 列表
const filteredSOPs = computed(() => {
  if (!searchKeyword.value) {
    return props.allSops
  }
  const keyword = searchKeyword.value.toLowerCase()
  return props.allSops.filter(sop => {
    const title = (sop.title || '').toLowerCase()
    return title.includes(keyword)
  })
})

// 按分類分組的 SOP
const groupedSOPs = computed(() => {
  const groups = {}
  
  filteredSOPs.value.forEach(sop => {
    const category = sop.category || 'other'
    const categoryName = getCategoryText(category)
    
    if (!groups[category]) {
      groups[category] = {
        name: categoryName,
        sops: []
      }
    }
    
    groups[category].sops.push(sop)
  })
  
  // 轉換為數組並排序
  return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))
})

// 監聽 visible 變化，初始化選中項
watch(
  () => props.open,
  (open) => {
    if (open) {
      selectedIds.value = [...props.selectedSopIds]
      searchKeyword.value = ''
    }
  }
)

// 處理確定
const handleOk = () => {
  emit('ok', selectedIds.value)
  modalVisible.value = false
}

// 處理取消
const handleCancel = () => {
  emit('cancel')
  modalVisible.value = false
}
</script>


<template>
  <a-modal
    v-model:visible="modalVisible"
    title="管理 SOP"
    :width="600"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <div>
      <a-typography-text type="secondary" style="display: block; margin-bottom: 12px">
        選擇要關聯到此任務的 SOP（可多選）
      </a-typography-text>

      <!-- 搜索框 -->
      <a-input-search
        v-model:value="searchKeyword"
        placeholder="搜索 SOP"
        style="margin-bottom: 16px"
        allow-clear
      />

      <!-- SOP 列表（按分類分組） -->
      <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px">
        <a-checkbox-group v-model:value="selectedIds" style="width: 100%">
          <template v-for="category in groupedSOPs" :key="category.name">
            <a-divider v-if="category.sops.length > 0" orientation="left" style="margin: 16px 0 8px">
              {{ category.name }}
            </a-divider>
            <div v-for="sop in category.sops" :key="sop.id || sop.sopId" style="margin-bottom: 8px">
              <a-checkbox :value="sop.id || sop.sopId || sop.sop_id">
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
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useTaskStore } from '@/stores/tasks'
import { getCategoryText } from '@/utils/formatters'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  taskId: {
    type: [String, Number],
    required: true
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

const emit = defineEmits(['update:visible', 'success'])

const store = useTaskStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 彈窗顯示狀態
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
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
  () => props.visible,
  (visible) => {
    if (visible) {
      selectedIds.value = [...props.selectedSopIds]
      searchKeyword.value = ''
    }
  }
)

// 處理提交
const handleSubmit = async () => {
  try {
    await store.updateTaskSOPs(props.taskId, selectedIds.value)
    showSuccess('更新 SOP 成功')
    emit('success')
    modalVisible.value = false
  } catch (err) {
    showError(err.message || '更新 SOP 失敗')
  }
}

// 處理取消
const handleCancel = () => {
  modalVisible.value = false
}
</script>


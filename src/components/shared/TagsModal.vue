<template>
  <a-modal
    v-model:open="modalVisible"
    title="管理標籤"
    :width="600"
    @cancel="handleCancel"
  >
    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
      v-model:warning="warningMessage"
    />
    
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleConfirm">確定</a-button>
      </a-space>
    </template>

    <!-- 已選標籤顯示區域 -->
    <div style="margin-bottom: 20px">
      <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280">已選標籤</h4>
      <div
        style="
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 40px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        "
      >
        <template v-if="selectedTags.length === 0">
          <span style="color: #9ca3af">尚未選擇標籤</span>
        </template>
        <template v-else>
          <a-tag
            v-for="tag in selectedTags"
            :key="tag.tag_id"
            :style="{
              background: getTagColor(tag.tag_color),
              borderColor: getTagColor(tag.tag_color),
              color: 'white'
            }"
          >
            {{ tag.tag_name }}
          </a-tag>
        </template>
      </div>
    </div>

    <!-- 所有標籤列表 -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <h4 style="margin: 0; font-size: 14px; color: #6b7280">所有標籤（點擊選擇/取消）</h4>
        <a-button v-if="allowCreate" size="small" @click="toggleNewTagForm">
          {{ showNewTagForm ? '− 取消新增' : '+ 新增標籤' }}
        </a-button>
      </div>

      <!-- 新增標籤表單 -->
      <a-form
        v-if="allowCreate && showNewTagForm"
        :model="newTagForm"
        layout="vertical"
        style="
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        "
      >
        <a-form-item label="標籤名稱" name="name" :rules="[{ required: true, message: '請輸入標籤名稱' }]">
          <a-input
            v-model:value="newTagForm.name"
            placeholder="請輸入標籤名稱"
            :maxlength="50"
            @pressEnter="handleCreateTag"
          />
        </a-form-item>
        <a-form-item label="顏色" name="color">
          <a-select v-model:value="newTagForm.color">
            <a-select-option value="blue">
              <span style="color: #3b82f6">🔵 藍色</span>
            </a-select-option>
            <a-select-option value="green">
              <span style="color: #10b981">🟢 綠色</span>
            </a-select-option>
            <a-select-option value="red">
              <span style="color: #ef4444">🔴 紅色</span>
            </a-select-option>
            <a-select-option value="orange">
              <span style="color: #f59e0b">🟠 橙色</span>
            </a-select-option>
            <a-select-option value="purple">
              <span style="color: #8b5cf6">🟣 紫色</span>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button @click="cancelNewTagForm">取消</a-button>
            <a-button type="primary" :loading="isSubmitting" @click="handleCreateTag">建立</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <!-- 標籤列表 -->
      <a-spin :spinning="isLoading">
        <a-space wrap style="min-height: 60px">
          <template v-if="allTags.length === 0 && !isLoading">
            <span style="color: #9ca3af">暫無標籤</span>
          </template>
          <template v-else>
            <a-button
              v-for="tag in allTags"
              :key="tag.tag_id"
              :type="isTagSelected(tag.tag_id) ? 'primary' : 'default'"
              :style="
                isTagSelected(tag.tag_id)
                  ? {
                      background: getTagColor(tag.tag_color),
                      borderColor: getTagColor(tag.tag_color),
                      color: 'white'
                    }
                  : {}
              "
              @click="toggleTag(tag.tag_id)"
            >
              <template v-if="isTagSelected(tag.tag_id)">✓ </template>{{ tag.tag_name }}
            </a-button>
          </template>
        </a-space>
      </a-spin>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { fetchAllTags, createTag } from '@/api/tags'
import { extractApiArray, extractApiData } from '@/utils/apiHelpers'
import PageAlerts from '@/components/shared/PageAlerts.vue'

// Props
const props = defineProps({
  selectedTagIds: {
    type: Array,
    default: () => []
  },
  visible: {
    type: Boolean,
    default: false
  },
  allowCreate: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['update:selectedTagIds', 'update:visible'])
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 內部狀態
const allTags = ref([])
const internalSelectedIds = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const showNewTagForm = ref(false)

const newTagForm = reactive({
  name: '',
  color: 'blue'
})

// Modal 顯示狀態（computed，用於 v-model:open）
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
  }
})

// 已選標籤（computed）
const selectedTags = computed(() => {
  return allTags.value.filter((tag) => internalSelectedIds.value.includes(tag.tag_id))
})

// 顏色映射（將顏色名稱轉換為 hex 值）
const colorMap = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6'
}

// 獲取標籤顏色（如果是顏色名稱則轉換，否則直接返回）
const getTagColor = (color) => {
  if (!color) return colorMap.blue
  return colorMap[color] || color
}

// 檢查標籤是否已選中
const isTagSelected = (tagId) => {
  return internalSelectedIds.value.includes(tagId)
}

// 切換標籤選擇狀態
const toggleTag = (tagId) => {
  const index = internalSelectedIds.value.indexOf(tagId)
  if (index > -1) {
    internalSelectedIds.value.splice(index, 1)
  } else {
    internalSelectedIds.value.push(tagId)
  }
}

// 加載所有標籤
const loadAllTags = async (force = false) => {
  // 如果已經加載且不是強制重新加載，則跳過
  if (!force && allTags.value.length > 0) {
    return
  }

  isLoading.value = true
  try {
    const response = await fetchAllTags()
    // 處理響應格式：可能是 { ok: true, data: [...] } 或直接是數組
    allTags.value = extractApiArray(response, [])
  } catch (error) {
    console.error('載入標籤失敗:', error)
    showError('載入標籤失敗，請稍後再試')
    allTags.value = []
  } finally {
    isLoading.value = false
  }
}

// 創建新標籤
const handleCreateTag = async () => {
  if (!newTagForm.name || !newTagForm.name.trim()) {
    showWarning('請輸入標籤名稱')
    return
  }

  if (newTagForm.name.length > 50) {
    showWarning('標籤名稱不能超過50字')
    return
  }

  isSubmitting.value = true
  try {
    const colorHex = colorMap[newTagForm.color] || newTagForm.color
    const response = await createTag({
      tag_name: newTagForm.name.trim(),
      tag_color: colorHex
    })

    // 處理響應格式
    let newTag = extractApiData(response, null)
    // 如果提取的数据没有 tag_id，可能是直接返回的对象
    if (!newTag || !newTag.tag_id) {
      if (response && response.tag_id) {
        newTag = response
      }
    }

    if (newTag) {
      showSuccess('標籤已建立')
      // 強制重新加載所有標籤
      await loadAllTags(true)
      // 自動選中新創建的標籤
      if (newTag.tag_id && !internalSelectedIds.value.includes(newTag.tag_id)) {
        internalSelectedIds.value.push(newTag.tag_id)
      }
      // 重置表單
      cancelNewTagForm()
    } else {
      showError('建立失敗，請稍後再試')
    }
  } catch (error) {
    console.error('建立標籤失敗:', error)
    showError('建立失敗，請稍後再試')
  } finally {
    isSubmitting.value = false
  }
}

// 切換新增標籤表單顯示
const toggleNewTagForm = () => {
  showNewTagForm.value = !showNewTagForm.value
  if (!showNewTagForm.value) {
    cancelNewTagForm()
  }
}

// 取消新增標籤表單
const cancelNewTagForm = () => {
  showNewTagForm.value = false
  newTagForm.name = ''
  newTagForm.color = 'blue'
}

// 取消操作
const handleCancel = () => {
  // 重置內部狀態為初始值
  internalSelectedIds.value = [...props.selectedTagIds]
  cancelNewTagForm()
  emit('update:visible', false)
}

// 確認操作
const handleConfirm = () => {
  emit('update:selectedTagIds', [...internalSelectedIds.value])
  emit('update:visible', false)
}

// 監聽 visible 變化，當 Modal 打開時加載數據
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // Modal 打開時，初始化選中的標籤 ID
      internalSelectedIds.value = [...props.selectedTagIds]
      // 如果標籤列表為空，則加載
      if (allTags.value.length === 0) {
        loadAllTags()
      }
    } else {
      // Modal 關閉時，重置新增表單
      cancelNewTagForm()
    }
  },
  { immediate: true }
)

// 監聽 selectedTagIds 變化，同步到內部狀態
watch(
  () => props.selectedTagIds,
  (newVal) => {
    if (!props.visible) {
      // 只在 Modal 關閉時同步，避免在 Modal 打開時覆蓋用戶的操作
      internalSelectedIds.value = [...newVal]
    }
  }
)
</script>

<style scoped>
/* 可以添加自定義樣式 */
</style>


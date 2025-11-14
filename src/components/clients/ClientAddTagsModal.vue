<template>
  <a-modal
    v-model:open="modalVisible"
    title="管理標籤"
    :width="800"
    @cancel="handleCancel"
  >
    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 警告提示 -->
    <a-alert
      v-if="warningMessage"
      type="warning"
      :message="warningMessage"
      show-icon
      closable
      @close="warningMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleSave">確定</a-button>
      </a-space>
    </template>

    <a-row :gutter="16">
      <!-- 左側：新增標籤表單 -->
      <a-col :span="10">
        <h4 style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280">新增標籤</h4>
        <a-form layout="vertical">
          <a-form-item label="標籤名稱">
            <a-input
              v-model:value="newTagName"
              placeholder="新標籤名稱"
              :maxlength="50"
            />
          </a-form-item>
          <a-form-item label="顏色">
            <a-select v-model:value="newTagColor">
              <a-select-option value="#3b82f6">
                <span style="color: #3b82f6">🔵 藍色</span>
              </a-select-option>
              <a-select-option value="#10b981">
                <span style="color: #10b981">🟢 綠色</span>
              </a-select-option>
              <a-select-option value="#f59e0b">
                <span style="color: #f59e0b">🟠 橙色</span>
              </a-select-option>
              <a-select-option value="#ef4444">
                <span style="color: #ef4444">🔴 紅色</span>
              </a-select-option>
              <a-select-option value="#8b5cf6">
                <span style="color: #8b5cf6">🟣 紫色</span>
              </a-select-option>
              <a-select-option value="#ec4899">
                <span style="color: #ec4899">🩷 粉色</span>
              </a-select-option>
              <a-select-option value="#06b6d4">
                <span style="color: #06b6d4">🔷 青色</span>
              </a-select-option>
              <a-select-option value="#84cc16">
                <span style="color: #84cc16">🟢 黃綠色</span>
              </a-select-option>
              <a-select-option value="#6b7280">
                <span style="color: #6b7280">⚫ 灰色</span>
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" block @click="handleCreateTag" :loading="store.loading">
              建立標籤
            </a-button>
          </a-form-item>
        </a-form>
      </a-col>

      <!-- 右側：標籤列表 -->
      <a-col :span="14">
        <!-- 已選標籤 -->
        <div style="margin-bottom: 24px">
          <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280">已選標籤</h4>
          <div
            style="
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              min-height: 60px;
              padding: 12px;
              background: #f9fafb;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            "
          >
            <template v-if="selectedTagObjects.length === 0">
              <span style="color: #9ca3af">尚未選擇標籤</span>
            </template>
            <template v-else>
              <a-tag
                v-for="tag in selectedTagObjects"
                :key="tag.tag_id"
                :color="getTagColor(tag.tag_color)"
                closable
                @close="deselectTag(tag.tag_id)"
                style="margin: 0"
              >
                {{ tag.tag_name }}
              </a-tag>
            </template>
          </div>
        </div>

        <!-- 所有標籤 -->
        <div>
          <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280">所有標籤（點擊選擇）</h4>
          <a-spin :spinning="store.loading">
            <div style="display: flex; flex-wrap: wrap; gap: 8px; min-height: 60px">
              <template v-if="store.supportData.tags.length === 0">
                <span style="color: #9ca3af">暫無標籤</span>
              </template>
              <template v-else>
                <a-tag
                  v-for="tag in store.supportData.tags"
                  :key="tag.tag_id"
                  :color="getTagColor(tag.tag_color)"
                  :style="{
                    cursor: 'pointer',
                    opacity: isTagSelected(tag.tag_id) ? 1 : 0.6
                  }"
                  @click="selectTag(tag.tag_id)"
                >
                  <template v-if="isTagSelected(tag.tag_id)">✓ </template>
                  {{ tag.tag_name }}
                </a-tag>
              </template>
            </div>
          </a-spin>
        </div>
      </a-col>
    </a-row>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useClientAddStore } from '@/stores/clientAdd'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible'])

// Store
const store = useClientAddStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// Local state for selections inside modal
const localSelectedIds = ref([])

// New tag form state
const newTagName = ref('')
const newTagColor = ref('#3b82f6')

// Modal visibility (computed for v-model:open)
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
  }
})

// Selected tag objects (computed from localSelectedIds)
const selectedTagObjects = computed(() => {
  return store.supportData.tags.filter(tag => 
    localSelectedIds.value.includes(tag.tag_id)
  )
})

// Color mapping (convert color names to hex if needed)
const colorMap = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  lime: '#84cc16',
  gray: '#6b7280'
}

// Get tag color (convert color name to hex if needed)
const getTagColor = (color) => {
  if (!color) return colorMap.blue
  return colorMap[color] || color
}

// Check if tag is selected
const isTagSelected = (tagId) => {
  return localSelectedIds.value.includes(tagId)
}

// Select a tag
const selectTag = (tagId) => {
  if (!localSelectedIds.value.includes(tagId)) {
    localSelectedIds.value.push(tagId)
  }
}

// Deselect a tag
const deselectTag = (tagId) => {
  const index = localSelectedIds.value.indexOf(tagId)
  if (index > -1) {
    localSelectedIds.value.splice(index, 1)
  }
}

// Create new tag
const handleCreateTag = async () => {
  if (!newTagName.value || !newTagName.value.trim()) {
    showWarning('請輸入標籤名稱')
    return
  }

  try {
    await store.createNewTag({
      name: newTagName.value.trim(),
      color: newTagColor.value
    })
    
    // Clear form
    newTagName.value = ''
    newTagColor.value = '#3b82f6'
    
    showSuccess('標籤已建立')
  } catch (error) {
    showError(error.message || '建立標籤失敗')
  }
}

// Handle cancel
const handleCancel = () => {
  // Reset local state to store state
  localSelectedIds.value = [...store.formData.selected_tags]
  emit('update:visible', false)
}

// Handle save
const handleSave = () => {
  store.updateSelectedTags([...localSelectedIds.value])
  emit('update:visible', false)
}

// Initialize localSelectedIds from store when modal opens
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // When modal opens, initialize from store
      localSelectedIds.value = [...store.formData.selected_tags]
    }
  }
)
</script>

<style scoped>
</style>


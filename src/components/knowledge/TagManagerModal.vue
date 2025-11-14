<template>
  <a-modal
    v-model:open="modalVisible"
    title="管理標籤"
    :width="600"
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
      </a-space>
    </template>

    <!-- 標籤列表 -->
    <a-list
      :data-source="tags"
      :loading="loading"
      style="margin-bottom: 24px"
    >
      <template #renderItem="{ item, index }">
        <a-list-item>
          <a-list-item-meta>
            <template #title>
              <span>{{ item }}</span>
            </template>
          </a-list-item-meta>
          <template #actions>
            <a-button
              type="text"
              danger
              @click="handleDelete(index)"
            >
              刪除
            </a-button>
          </template>
        </a-list-item>
      </template>
    </a-list>

    <!-- 新增標籤 -->
    <a-form layout="inline" @submit.prevent="handleAdd">
      <a-form-item
        label="標籤名稱"
        :validate-status="newTagError ? 'error' : ''"
        :help="newTagError"
      >
        <a-input
          v-model:value="newTagName"
          placeholder="輸入標籤名稱"
          :maxlength="50"
          style="width: 200px"
          @pressEnter="handleAdd"
        />
      </a-form-item>
      <a-form-item>
        <a-button
          type="primary"
          @click="handleAdd"
          :loading="loading"
        >
          新增
        </a-button>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  tags: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update', 'cancel', 'update:visible'])

// Page Alert
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// Local state
const loading = ref(false)
const newTagName = ref('')
const newTagError = ref('')

// Modal visibility (computed for v-model:open)
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
  }
})

// 驗證標籤名稱
const validateTagName = (name) => {
  if (!name || !name.trim()) {
    return '標籤名稱不能為空'
  }
  if (props.tags.includes(name.trim())) {
    return '標籤名稱不能重複'
  }
  return ''
}

// 新增標籤
const handleAdd = async () => {
  newTagError.value = ''
  const trimmedName = newTagName.value.trim()
  
  // 驗證
  const error = validateTagName(trimmedName)
  if (error) {
    newTagError.value = error
    return
  }

  loading.value = true
  try {
  // 新增標籤
  const newTags = [...props.tags, trimmedName]
  emit('update', newTags)
  newTagName.value = ''
  showSuccess('標籤已新增')
  } catch (error) {
    showError('新增標籤失敗')
  } finally {
    loading.value = false
  }
}

// 刪除標籤
const handleDelete = async (index) => {
  loading.value = true
  try {
  const newTags = props.tags.filter((_, i) => i !== index)
  emit('update', newTags)
  showSuccess('標籤已刪除')
  } catch (error) {
    showError('刪除標籤失敗')
  } finally {
    loading.value = false
  }
}

// 取消
const handleCancel = () => {
  newTagName.value = ''
  newTagError.value = ''
  emit('update:visible', false)
  emit('cancel')
}

// 監聽 visible 變化，重置表單
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      newTagName.value = ''
      newTagError.value = ''
    }
  }
)
</script>

<style scoped>
</style>


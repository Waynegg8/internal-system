<template>
  <a-modal
    v-model:visible="visible"
    title="批量變更狀態"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <div style="margin-bottom: 16px">
      <a-typography-text type="secondary">
        已選擇 {{ selectedCount }} 個任務
      </a-typography-text>
    </div>

    <a-form :model="form" layout="vertical">
      <a-form-item label="選擇新狀態" required>
        <a-select
          v-model:value="form.status"
          placeholder="請選擇狀態"
          style="width: 100%"
        >
          <a-select-option value="pending">待處理</a-select-option>
          <a-select-option value="in_progress">進行中</a-select-option>
          <a-select-option value="completed">已完成</a-select-option>
          <a-select-option value="cancelled">已取消</a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  selectedCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['submit', 'cancel', 'update:visible'])

const loading = ref(false)
const form = ref({
  status: null
})

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    form.value.status = null
  }
})

const handleSubmit = () => {
  if (!form.value.status) {
    return
  }
  loading.value = true
  emit('submit', form.value.status)
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>


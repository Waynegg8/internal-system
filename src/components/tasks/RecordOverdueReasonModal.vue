<template>
  <a-modal
    v-model:visible="visible"
    title="記錄逾期原因"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form :model="form" layout="vertical">
      <a-form-item label="逾期原因" required>
        <a-textarea
          v-model:value="form.reason"
          placeholder="請說明此任務逾期的原因"
          :rows="4"
        />
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
  task: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['submit', 'cancel', 'update:visible'])

const loading = ref(false)
const form = ref({
  reason: ''
})

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    form.value.reason = ''
  }
})

const handleSubmit = () => {
  if (!form.value.reason || !form.value.reason.trim()) {
    return
  }
  
  loading.value = true
  const taskId = props.task?.task_id || props.task?.taskId || props.task?.id
  emit('submit', taskId, form.value.reason.trim())
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>







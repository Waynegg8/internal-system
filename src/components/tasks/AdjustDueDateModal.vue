<template>
  <a-modal
    v-model:visible="visible"
    title="調整到期日"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form :model="form" layout="vertical">
      <a-form-item label="新的到期日" required>
        <a-date-picker
          v-model:value="form.dueDate"
          placeholder="請選擇到期日"
          style="width: 100%"
          format="YYYY-MM-DD"
        />
      </a-form-item>
      <a-form-item label="調整原因">
        <a-textarea
          v-model:value="form.reason"
          placeholder="請說明調整原因（可選）"
          :rows="3"
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
  dueDate: null,
  reason: ''
})

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

watch(() => props.visible, (newVal) => {
  if (newVal && props.task) {
    const dueDate = props.task.due_date || props.task.dueDate
    form.value.dueDate = dueDate || null
    form.value.reason = ''
  }
})

const handleSubmit = () => {
  if (!form.value.dueDate) {
    return
  }
  
  // 格式化日期
  let dueDateStr
  if (form.value.dueDate && form.value.dueDate.format) {
    // dayjs 對象
    dueDateStr = form.value.dueDate.format('YYYY-MM-DD')
  } else if (form.value.dueDate instanceof Date) {
    // Date 對象
    const year = form.value.dueDate.getFullYear()
    const month = String(form.value.dueDate.getMonth() + 1).padStart(2, '0')
    const day = String(form.value.dueDate.getDate()).padStart(2, '0')
    dueDateStr = `${year}-${month}-${day}`
  } else if (typeof form.value.dueDate === 'string') {
    dueDateStr = form.value.dueDate
  } else {
    return
  }
  
  loading.value = true
  const taskId = props.task?.task_id || props.task?.taskId || props.task?.id
  emit('submit', taskId, dueDateStr, form.value.reason || '')
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>






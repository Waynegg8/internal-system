<template>
  <a-modal
    v-model:visible="visible"
    title="批量調整到期日"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form :model="form" layout="vertical" ref="formRef">
      <a-form-item label="操作確認">
        <a-alert
          type="info"
          :message="`將為 ${selectedCount} 個任務調整到期日`"
          show-icon
          style="margin-bottom: 16px"
        />
      </a-form-item>
      <a-form-item label="新的到期日" name="dueDate" :rules="[{ required: true, message: '請選擇到期日' }]">
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
  selectedCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['submit', 'cancel', 'update:visible'])

const formRef = ref(null)
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
  if (newVal) {
    form.value.dueDate = null
    form.value.reason = ''
    formRef.value?.resetFields()
  }
})

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
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
    emit('submit', dueDateStr, form.value.reason || '')
  } catch (error) {
    console.error('表單驗證失敗:', error)
  } finally {
    // 注意：loading 狀態由父組件控制，這裡不重置
  }
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>











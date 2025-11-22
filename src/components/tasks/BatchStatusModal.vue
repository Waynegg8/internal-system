<template>
  <a-modal
    v-model:visible="visible"
    title="批量變更狀態"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form :model="form" layout="vertical" ref="formRef">
      <a-form-item label="操作確認">
        <a-alert
          type="info"
          :message="`將為 ${selectedCount} 個任務更新狀態`"
          show-icon
          style="margin-bottom: 16px"
        />
      </a-form-item>
      <a-form-item label="選擇新狀態" name="status" :rules="[{ required: true, message: '請選擇狀態' }]">
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

const formRef = ref(null)
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
    formRef.value?.resetFields()
  }
})

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    if (!form.value.status) {
      return
    }
    
    loading.value = true
    emit('submit', form.value.status)
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


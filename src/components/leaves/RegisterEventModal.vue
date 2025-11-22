<template>
  <a-modal
    v-model:open="modalVisible"
    title="登記生活事件"
    width="600px"
    :confirm-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
    >
      <!-- 事件類型 -->
      <a-form-item label="事件類型" name="event_type">
        <a-select
          v-model:value="form.event_type"
          placeholder="請選擇事件類型"
          :options="eventTypeOptions"
        />
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px">
          選項會依您的性別自動過濾
        </div>
      </a-form-item>

      <!-- 事件日期 -->
      <a-form-item label="事件日期" name="event_date">
        <a-date-picker
          v-model:value="form.event_date"
          placeholder="請選擇日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </a-form-item>

      <!-- 備註 -->
      <a-form-item label="備註（選填）" name="notes">
        <a-textarea
          v-model:value="form.notes"
          placeholder="例如：關係、證明文件等"
          :rows="3"
          :maxlength="200"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import dayjs from 'dayjs'
import { getLifeEventTypeOptions } from '@/utils/leaveTypeFilter'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  gender: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const formRef = ref(null)
const submitting = ref(false)
const form = ref({
  event_type: null,
  event_date: null,
  notes: ''
})

// 事件類型選項（根據性別動態生成）
const eventTypeOptions = computed(() => {
  return getLifeEventTypeOptions(props.gender)
})

// 表單驗證規則
const rules = {
  event_type: [
    { required: true, message: '請選擇事件類型', trigger: 'change' }
  ],
  event_date: [
    { required: true, message: '請選擇事件日期', trigger: 'change' }
  ]
}

// 模態框顯示狀態
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 監聽模態框打開
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

// 處理提交
const handleSubmit = async () => {
  try {
    // 驗證表單
    await formRef.value.validate()

    submitting.value = true

    // 準備提交數據
    const payload = {
      event_type: form.value.event_type,
      event_date: form.value.event_date ? dayjs(form.value.event_date).format('YYYY-MM-DD') : null,
      notes: form.value.notes || undefined
    }

    emit('submit', payload)
  } catch (error) {
    console.error('表單驗證失敗:', error)
  } finally {
    submitting.value = false
  }
}

// 處理取消
const handleCancel = () => {
  resetForm()
  emit('cancel')
}

// 重置表單
const resetForm = () => {
  form.value = {
    event_type: null,
    event_date: null,
    notes: ''
  }
  formRef.value?.resetFields()
}
</script>













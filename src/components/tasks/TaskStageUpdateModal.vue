<template>
  <a-modal
    v-model:open="visibleProxy"
    :title="`更新階段：${stage?.stageName || ''}`"
    :confirm-loading="submitting"
    :destroy-on-close="true"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form :model="formState" :rules="rules" ref="formRef" layout="vertical">
      <a-form-item label="階段狀態" name="status">
        <a-select v-model:value="formState.status">
          <a-select-option value="in_progress">進行中</a-select-option>
          <a-select-option value="completed">已完成</a-select-option>
          <a-select-option value="blocked">已阻塞</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item
        v-if="formState.status === 'completed'"
        label="延遲天數"
        name="delayDays"
      >
        <a-input-number
          v-model:value="formState.delayDays"
          :min="0"
          :max="365"
          :precision="0"
          style="width: 100%"
        />
        <template #help>
          <span style="font-size: 12px; color: #6b7280;">
            若前一階段延遲完成，請填入延遲天數以自動順延後續階段
          </span>
        </template>
      </a-form-item>

      <a-form-item label="備註" name="notes">
        <a-textarea
          v-model:value="formState.notes"
          :rows="3"
          placeholder="補充說明此次階段更新的細節（選填）"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch, ref } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  stage: {
    type: Object,
    default: null
  },
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open', 'submit'])

const formRef = ref(null)
const formState = reactive({
  status: 'in_progress',
  delayDays: 0,
  notes: ''
})

const visibleProxy = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const rules = computed(() => ({
  status: [{ required: true, message: '請選擇階段狀態', trigger: 'change' }],
  delayDays:
    formState.status === 'completed'
      ? [{ required: true, type: 'number', message: '請填寫延遲天數', trigger: 'change' }]
      : []
}))

watch(
  () => props.stage,
  (value) => {
    if (!value) return
    formState.status = value.status || 'in_progress'
    formState.delayDays = value.delayDays || 0
    formState.notes = ''
  },
  { immediate: true }
)

watch(
  () => props.open,
  (opened) => {
    if (opened && formRef.value) {
      formRef.value.clearValidate()
    }
  }
)

const handleSubmit = () => {
  formRef.value
    .validate()
    .then(() => {
      emit('submit', {
        stageId: props.stage?.stageId,
        status: formState.status,
        delay_days: formState.status === 'completed' ? formState.delayDays || 0 : null,
        notes: formState.notes
      })
    })
    .catch(() => {})
}

const handleCancel = () => {
  emit('update:open', false)
}
</script>





<template>
  <a-modal
    v-model:open="modalVisible"
    title="作廢收據"
    width="500px"
    :confirm-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="作廢原因" name="cancellationReason">
          <a-textarea
            v-model:value="form.cancellationReason"
            placeholder="請輸入作廢收據的原因"
            :rows="4"
          />
        </a-form-item>

        <a-alert
          message="注意事項"
          description="作廢收據後將無法再進行編輯或列印，所有相關付款記錄將被標記為「已作廢收據的付款」。"
          type="warning"
          show-icon
          style="margin-top: 16px"
        />
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  receipt: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formRef = ref(null)
const submitting = ref(false)
const loading = ref(false)

const form = ref({
  cancellationReason: ''
})

const rules = {
  cancellationReason: [
    { required: true, message: '請輸入作廢原因', trigger: 'blur' },
    { min: 5, message: '作廢原因至少需要5個字符', trigger: 'blur' }
  ]
}

watch(modalVisible, (val) => {
  if (val) {
    // 打開彈窗時重置表單
    form.value.cancellationReason = ''
    formRef.value?.clearValidate()
  }
})

async function handleSubmit() {
  try {
    await formRef.value.validate()

    submitting.value = true

    emit('success', {
      cancellationReason: form.value.cancellationReason
    })

    modalVisible.value = false
  } catch (err) {
    if (err?.errorFields) return
    console.error('[ReceiptCancelModal] submit failed:', err)
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  modalVisible.value = false
}
</script>

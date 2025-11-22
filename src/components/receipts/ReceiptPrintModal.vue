<template>
  <a-modal
    v-model:open="modalVisible"
    title="選擇列印類型"
    width="400px"
    :confirm-loading="submitting"
    @cancel="handleCancel"
    :footer="null"
  >
    <div style="text-align: center">
      <p style="margin-bottom: 24px; color: #666">請選擇要列印的文件類型</p>

      <a-space direction="vertical" size="large" style="width: 100%">
        <a-button
          type="primary"
          size="large"
          block
          :loading="submitting"
          @click="handlePrintInvoice"
          style="height: 60px; font-size: 16px"
        >
          <template #icon>
            <PrinterOutlined />
          </template>
          列印請款單
        </a-button>

        <a-button
          type="default"
          size="large"
          block
          :loading="submitting"
          @click="handlePrintReceipt"
          :disabled="isCancelled"
          style="height: 60px; font-size: 16px"
        >
          <template #icon>
            <PrinterOutlined />
          </template>
          列印收據
        </a-button>
      </a-space>

      <a-alert
        v-if="isCancelled"
        message="已作廢收據無法列印"
        type="warning"
        show-icon
        style="margin-top: 16px"
      />

      <a-button
        type="text"
        style="margin-top: 16px"
        @click="handleCancel"
      >
        取消
      </a-button>
    </div>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'
import { PrinterOutlined } from '@ant-design/icons-vue'
import { printInvoice, printReceipt } from '@/utils/receiptPrint'

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

const submitting = computed(() => false) // 簡化處理，不使用 submitting 狀態

const isCancelled = computed(() => {
  return props.receipt?.status === 'cancelled'
})

async function handlePrintInvoice() {
  if (!props.receipt) return

  try {
    await printInvoice(props.receipt)
    emit('success', { type: 'invoice' })
  } catch (error) {
    console.error('列印請款單失敗:', error)
  }
}

async function handlePrintReceipt() {
  if (!props.receipt || isCancelled.value) return

  try {
    await printReceipt(props.receipt)
    emit('success', { type: 'receipt' })
  } catch (error) {
    console.error('列印收據失敗:', error)
  }
}

function handleCancel() {
  modalVisible.value = false
}
</script>



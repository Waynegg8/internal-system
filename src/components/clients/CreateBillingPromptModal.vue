<template>
  <a-modal
    v-model:open="modalVisible"
    title="建立收費計劃"
    :width="500"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div style="padding: 16px 0">
      <p>您已保存定期服務，是否立即建立收費計劃？</p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 8px">
        建立收費計劃後，您可以設定每個月的收費金額和付款期限
      </p>
    </div>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel'])

const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const handleOk = () => {
  emit('confirm')
  modalVisible.value = false
}

const handleCancel = () => {
  emit('cancel')
  modalVisible.value = false
}
</script>


<template>
  <a-modal
    v-model:open="visibleProxy"
    title="確認階段同步"
    :confirm-loading="confirming"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <a-alert
      type="info"
      :message="syncMessage"
      show-icon
      style="margin-bottom: 16px"
    />
    <p>完成當前階段後，下一階段「<strong>{{ nextStageName }}</strong>」將自動啟動為「進行中」狀態。</p>
    <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">
      您可以選擇確認同步或取消操作。
    </p>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  nextStage: {
    type: Object,
    default: null
  },
  confirming: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

const visibleProxy = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const nextStageName = computed(() => {
  return props.nextStage?.stage_name || props.nextStage?.stageName || '下一階段'
})

const syncMessage = computed(() => {
  return props.nextStage?.message || `完成當前階段後，下一階段「${nextStageName.value}」將自動啟動。請確認是否繼續。`
})

const handleConfirm = () => {
  emit('confirm', props.nextStage)
}

const handleCancel = () => {
  emit('cancel')
  visibleProxy.value = false
}
</script>




<template>
  <a-alert
    v-for="alert in alerts"
    :key="alert.type"
    :type="alert.type"
    :message="alert.message"
    show-icon
    closable
    @close="handleClose(alert.type)"
    style="margin-bottom: 8px"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  success: { type: String, default: '' },
  error: { type: String, default: '' },
  warning: { type: String, default: '' },
  info: { type: String, default: '' }
})

const emit = defineEmits(['update:success', 'update:error', 'update:warning', 'update:info', 'close'])

const alerts = computed(() => [
  { type: 'success', message: props.success },
  { type: 'error', message: props.error },
  { type: 'warning', message: props.warning },
  { type: 'info', message: props.info }
].filter(a => a.message))

const handleClose = (type) => {
  emit('close', type)
  // 支持 v-model 模式，自動清除對應的提示
  emit(`update:${type}`, '')
}
</script>


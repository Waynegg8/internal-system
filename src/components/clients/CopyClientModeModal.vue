<template>
  <a-modal
    v-model:open="modalVisible"
    title="選擇新增模式"
    :width="500"
    :footer="null"
    :closable="false"
    :mask-closable="false"
    :keyboard="false"
  >
    <div style="text-align: center; padding: 24px 0">
      <a-space direction="vertical" :size="24" style="width: 100%">
        <a-button
          type="primary"
          size="large"
          block
          @click="handleSelectMode('new')"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          新增空白客戶
        </a-button>
        
        <a-button
          size="large"
          block
          @click="handleSelectMode('copy')"
        >
          <template #icon>
            <CopyOutlined />
          </template>
          從現有客戶複製
        </a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'
import { PlusOutlined, CopyOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'select-mode'])

const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const handleSelectMode = (mode) => {
  emit('select-mode', mode)
  modalVisible.value = false
}
</script>


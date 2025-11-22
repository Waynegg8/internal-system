<template>
  <a-empty :description="description" :image="image">
    <template v-if="image === 'simple'" #image>
      <div class="empty-state-simple-icon">
        <slot name="icon">
          <component :is="iconComponent" />
        </slot>
      </div>
    </template>
    <template v-if="$slots.description" #description>
      <slot name="description"></slot>
    </template>
    <template v-if="$slots.default || showAction">
      <div class="empty-state-actions">
        <slot>
          <a-button v-if="actionText" type="primary" @click="handleAction">
            {{ actionText }}
          </a-button>
        </slot>
      </div>
    </template>
  </a-empty>
</template>

<script setup>
import { computed, h } from 'vue'
import { InboxOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  description: {
    type: String,
    default: '暂无数据'
  },
  image: {
    type: [String, Object],
    default: 'simple' // 'simple' | Empty.PRESENTED_IMAGE_SIMPLE | Empty.PRESENTED_IMAGE_DEFAULT
  },
  icon: {
    type: Object,
    default: null
  },
  actionText: {
    type: String,
    default: ''
  },
  showAction: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['action'])

const iconComponent = computed(() => {
  return props.icon || InboxOutlined
})

const handleAction = () => {
  emit('action')
}
</script>

<style scoped>
.empty-state-simple-icon {
  font-size: 64px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.empty-state-actions {
  margin-top: 16px;
}

.empty-state-actions :deep(.ant-btn) {
  transition: var(--transition-base);
}
</style>













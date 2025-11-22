<template>
  <a-card :bordered="false" class="filter-card" :class="{ 'filter-card-collapsed': collapsed }">
    <template v-if="title" #title>
      <span>{{ title }}</span>
    </template>
    <template v-if="collapsible" #extra>
      <a-button
        type="text"
        :icon="collapsed ? h(UpOutlined) : h(DownOutlined)"
        @click="collapsed = !collapsed"
        size="small"
      >
        {{ collapsed ? '展开' : '收起' }}
      </a-button>
    </template>
    <a-collapse v-if="collapsible" v-model:activeKey="collapseActiveKey" :bordered="false" ghost>
      <a-collapse-panel key="1" :showArrow="false">
        <template #header>
          <span></span>
        </template>
        <slot></slot>
      </a-collapse-panel>
    </a-collapse>
    <div v-else>
      <slot></slot>
    </div>
  </a-card>
</template>

<script setup>
import { ref, watch, h } from 'vue'
import { UpOutlined, DownOutlined } from '@ant-design/icons-vue'

defineProps({
  title: {
    type: String,
    default: ''
  },
  collapsible: {
    type: Boolean,
    default: false
  }
})

const collapsed = ref(false)
const collapseActiveKey = ref(['1'])

// 监听 collapsed 变化，同步 collapseActiveKey
watch(collapsed, (val) => {
  collapseActiveKey.value = val ? [] : ['1']
})
</script>

<style scoped>
.filter-card {
  background-color: var(--color-bg-card);
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-base);
  transition: var(--transition-base);
  margin-bottom: 0; /* 完全移除下邊距 */
}

.filter-card :deep(.ant-card-body) {
  padding: 8px 16px; /* 根據設計：上下 8px，左右 16px */
}

.filter-card :deep(.ant-card-head) {
  padding: 0 16px;
  min-height: 48px;
  border-bottom: 1px solid var(--color-border-divider);
}

.filter-card :deep(.ant-card-head-title) {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.filter-card :deep(.ant-collapse) {
  background: transparent;
  border: none;
}

.filter-card :deep(.ant-collapse-item) {
  border: none;
}

.filter-card :deep(.ant-collapse-content) {
  border: none;
  background: transparent;
}

.filter-card :deep(.ant-collapse-content-box) {
  padding: 0;
}
</style>


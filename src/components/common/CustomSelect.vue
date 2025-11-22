<template>
  <a-select
    v-model:value="selectValue"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :mode="mode"
    :show-search="showSearch"
    :filter-option="filterOption"
    class="custom-select"
    @change="handleChange"
  >
    <template v-if="suffixIcon" #suffixIcon>
      <component :is="suffixIcon" />
    </template>
    <slot />
  </a-select>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: [String, Array, Number],
  placeholder: {
    type: String,
    default: '請選擇'
  },
  allowClear: {
    type: Boolean,
    default: true
  },
  mode: String,
  showSearch: {
    type: Boolean,
    default: false
  },
  filterOption: Function,
  suffixIcon: Object
})

const emit = defineEmits(['update:modelValue', 'change'])

const selectValue = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newValue) => {
    selectValue.value = newValue
  }
)

const handleChange = (value) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.custom-select {
  width: 100% !important;
  height: 32px !important;
}

.custom-select :deep(.ant-select-selector) {
  height: 32px !important;
  padding: 4px 11px !important;
  border: 1px solid #d9d9d9 !important;
  border-radius: 6px !important;
  background: #fff !important;
  box-shadow: none !important;
  display: flex !important;
  align-items: center !important;
}

.custom-select :deep(.ant-select-selector:hover) {
  border-color: #40a9ff !important;
}

.custom-select :deep(.ant-select-focused .ant-select-selector) {
  border-color: #40a9ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  outline: none !important;
}

.custom-select :deep(.ant-select-selection-item),
.custom-select :deep(.ant-select-selection-placeholder) {
  line-height: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
}

.custom-select :deep(.ant-select-selection-search) {
  height: 24px !important;
  line-height: 24px !important;
}

.custom-select :deep(.ant-select-selection-search-input) {
  height: 24px !important;
  line-height: 24px !important;
}

/* 多選模式樣式 */
.custom-select :deep(.ant-select-selection-item) {
  background: #f0f2f5 !important;
  border: 1px solid #d9d9d9 !important;
  border-radius: 4px !important;
  padding: 2px 8px !important;
  margin: 2px 4px 2px 0 !important;
  font-size: 12px !important;
  color: #333 !important;
  display: inline-flex !important;
  align-items: center !important;
  max-width: 120px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.custom-select :deep(.ant-select-selection-item-content) {
  flex: 1 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.custom-select :deep(.ant-select-selection-item-remove) {
  margin-left: 4px !important;
  color: #999 !important;
  font-size: 10px !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
}

.custom-select :deep(.ant-select-selection-item-remove:hover) {
  color: #ff4d4f !important;
}

/* 多選模式下的選擇器容器 */
.custom-select[data-mode="multiple"] :deep(.ant-select-selector) {
  min-height: 32px !important;
  padding: 2px 11px !important;
  flex-wrap: wrap !important;
}

/* 移除所有可能的額外邊框和陰影 */
.custom-select :deep(.ant-select-selector),
.custom-select :deep(.ant-select-selector:focus),
.custom-select :deep(.ant-select-selector:focus-within),
.custom-select :deep(.ant-select-focused .ant-select-selector),
.custom-select :deep(.ant-select-selector:active) {
  border: 1px solid #d9d9d9 !important;
  box-shadow: none !important;
  outline: none !important;
}

.custom-select :deep(.ant-select-selector:hover) {
  border-color: #40a9ff !important;
  box-shadow: none !important;
}

.custom-select :deep(.ant-select-focused .ant-select-selector) {
  border-color: #40a9ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
}
</style>










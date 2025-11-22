<template>
  <a-date-picker
    v-model:value="dateValue"
    :picker="picker"
    :format="format"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    class="custom-date-picker"
    @change="handleChange"
  />
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: [String, Object],
  picker: {
    type: String,
    default: 'date'
  },
  format: {
    type: String,
    default: 'YYYY-MM-DD'
  },
  placeholder: {
    type: String,
    default: '選擇日期'
  },
  allowClear: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const dateValue = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newValue) => {
    dateValue.value = newValue
  }
)

const handleChange = (value) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.custom-date-picker {
  width: 100% !important;
}

.custom-date-picker :deep(.ant-picker) {
  height: 32px !important;
  padding: 4px 11px !important;
  border: 1px solid #d9d9d9 !important;
  border-radius: 6px !important;
  background: #fff !important;
  box-shadow: none !important;
  display: flex !important;
  align-items: center !important;
}

.custom-date-picker :deep(.ant-picker:hover) {
  border-color: #40a9ff !important;
  box-shadow: none !important;
}

.custom-date-picker :deep(.ant-picker-focused) {
  border-color: #40a9ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  outline: none !important;
}

.custom-date-picker :deep(.ant-picker-input) {
  height: 24px !important;
  line-height: 24px !important;
}

.custom-date-picker :deep(.ant-picker-input > input) {
  height: 24px !important;
  line-height: 24px !important;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

.custom-date-picker :deep(.ant-picker-input > input::placeholder) {
  line-height: 24px !important;
}

/* 移除所有可能的額外邊框和陰影 */
.custom-date-picker :deep(.ant-picker),
.custom-date-picker :deep(.ant-picker:focus),
.custom-date-picker :deep(.ant-picker:focus-within),
.custom-date-picker :deep(.ant-picker-focused),
.custom-date-picker :deep(.ant-picker:active) {
  border: 1px solid #d9d9d9 !important;
  box-shadow: none !important;
  outline: none !important;
}

.custom-date-picker :deep(.ant-picker:hover) {
  border-color: #40a9ff !important;
  box-shadow: none !important;
}

.custom-date-picker :deep(.ant-picker-focused) {
  border-color: #40a9ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
}
</style>










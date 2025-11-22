<template>
  <div class="search-input-wrapper">
    <input
      v-model="searchValue"
      type="text"
      class="search-input"
      :placeholder="placeholder"
      @input="handleInput"
      @keyup.enter="handleSearch"
    />
    <search-outlined class="search-icon" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  placeholder: {
    type: String,
    default: '請輸入關鍵字'
  },
  modelValue: {
    type: String,
    default: ''
  },
  debounceTime: {
    type: Number,
    default: 300
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const searchValue = ref(props.modelValue)
let debounceTimer = null

// 監聽外部值變化
watch(() => props.modelValue, (newValue) => {
  searchValue.value = newValue
})

// 處理輸入
const handleInput = () => {
  emit('update:modelValue', searchValue.value)
  
  // 清除之前的定時器
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  // 設置新的定時器進行防抖搜索
  debounceTimer = setTimeout(() => {
    handleSearch()
  }, props.debounceTime)
}

// 處理搜索
const handleSearch = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  emit('search', searchValue.value)
}
</script>

<style scoped>
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background-color: #ffffff;
  transition: all 0.2s;
}

.search-input-wrapper:hover {
  border-color: #40a9ff;
}

.search-input-wrapper:focus-within {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  outline: none;
}

.search-input {
  flex: 1;
  height: 100%;
  padding: 4px 32px 4px 11px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.5715;
  color: rgba(0, 0, 0, 0.85);
}

.search-input::placeholder {
  color: rgba(0, 0, 0, 0.25);
  font-size: 14px;
  line-height: 1.5715;
}

.search-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  pointer-events: none;
}
</style>










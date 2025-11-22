<template>
  <a-space>
    <a-select
      v-model:value="selectedYear"
      :loading="isLoading"
      style="width: 150px"
      @change="handleYearChange"
    >
      <a-select-option
        v-for="year in yearOptions"
        :key="year"
        :value="year"
      >
        {{ year }} 年
      </a-select-option>
    </a-select>
    <a-tag v-if="status?.canAutoCreate" color="blue">
      可自動建立
    </a-tag>
  </a-space>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { fetchBillingPlans } from '@/api/billing'
import { extractApiData } from '@/utils/apiHelpers'

const props = defineProps({
  clientId: {
    type: String,
    required: true
  },
  modelValue: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'status-change'])

const selectedYear = ref(props.modelValue || new Date().getFullYear())
const isLoading = ref(false)
const status = ref(null)

// 生成年度選項（過去 5 年到未來 2 年）
const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years = []
  for (let i = -5; i <= 2; i++) {
    years.push(currentYear + i)
  }
  return years
})

// 監聽外部值變化
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue !== selectedYear.value) {
    selectedYear.value = newValue
    loadStatus()
  }
})

// 年度變化處理
const handleYearChange = async (year) => {
  selectedYear.value = year
  emit('update:modelValue', year)
  emit('change', year)
  
  // 載入年度狀態
  await loadStatus()
}

// 載入年度狀態
const loadStatus = async () => {
  if (!props.clientId || !selectedYear.value) return

  isLoading.value = true
  try {
    const response = await fetchBillingPlans(props.clientId, selectedYear.value)
    const data = extractApiData(response, {})
    
    if (data.status) {
      status.value = data.status
      emit('status-change', data.status)
    }
  } catch (error) {
    console.error('載入年度狀態失敗:', error)
    // 檢查是否為表不存在的錯誤，靜默處理（不影響用戶體驗）
    const errorMessage = error?.message || error?.response?.data?.message || String(error)
    const errorCode = error?.response?.data?.code
    
    if (errorCode === 'SERVICE_UNAVAILABLE' || errorMessage.includes('尚未初始化') || errorMessage.includes('資料庫遷移')) {
      // 表不存在時，不顯示狀態標籤
      console.warn('收費計劃功能尚未初始化')
    }
    
    status.value = null
  } finally {
    isLoading.value = false
  }
}

// 初始化
onMounted(() => {
  if (selectedYear.value) {
    loadStatus()
  }
})

// 暴露方法
defineExpose({
  refresh: loadStatus
})
</script>

<style scoped>
/* 可以添加自定義樣式 */
</style>



<template>
  <div class="cost-allocation-page">
    <a-row :gutter="24">
      <!-- 計算參數區域 -->
      <a-col :span="24" :lg="8">
        <allocation-calculator
          :loading="loading"
          @calculate="handleCalculate"
        />
      </a-col>

      <!-- 計算結果區域 -->
      <a-col :span="24" :lg="16">
        <allocation-result
          :result="calculationResult"
          :loading="loading"
        />
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useCostStore } from '@/stores/costs'
import AllocationCalculator from '@/components/costs/AllocationCalculator.vue'
import AllocationResult from '@/components/costs/AllocationResult.vue'

const store = useCostStore()

// 響應式數據
const loading = ref(false)
const calculationResult = ref(null)

// 處理計算請求
const handleCalculate = async (params) => {
  loading.value = true
  calculationResult.value = null

  try {
    // 調用成本分攤計算 API
    const result = await store.calculateAllocation(params.year, params.month, params.allocationMethod)

    if (result && result.ok) {
      calculationResult.value = result.data
      message.success('成本分攤計算完成')
    } else {
      throw new Error(result?.message || '計算失敗')
    }
  } catch (error) {
    console.error('成本分攤計算失敗:', error)
    message.error(error.message || '計算失敗，請稍後重試')
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  // 頁面初始化邏輯
})
</script>

<style scoped>
.cost-allocation-page {
  padding: 24px;
  min-height: 100vh;
  background-color: #f5f5f5;
}

@media (max-width: 991px) {
  .cost-allocation-page {
    padding: 16px;
  }
}
</style>

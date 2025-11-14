<template>
  <div class="cost-employee-content">
    <a-space direction="vertical" size="large" class="cost-employee-stack">
      <a-alert
        v-if="errorMessage || store.error"
        type="error"
        :message="errorMessage || store.error"
        show-icon
        closable
        @close="store.clearError()"
      />

      <a-card
        size="small"
        title="員工成本分析"
        :head-style="compactHeadStyle"
        :body-style="compactBodyStyle"
      >
        <template #extra>
          <a-space :size="8" align="center" class="cost-employee-controls">
            <a-date-picker
              v-model:value="selectedMonthValue"
              picker="month"
              format="YYYY-MM"
              placeholder="選擇月份"
              size="small"
              @change="handleMonthChange"
            />
            <a-button size="small" @click="handleRefresh" :loading="store.loading">
              刷新
            </a-button>
          </a-space>
        </template>

        <a-space direction="vertical" size="small" style="width: 100%">
          <EmployeeCostsInfo />
          <EmployeeCostsTable
            :employees="store.employeeCosts"
            :loading="store.loading"
          />
          <EmployeeCostsSummary :total-cost="totalCost" />
        </a-space>
      </a-card>
    </a-space>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import dayjs from 'dayjs'
import { useCostStore } from '@/stores/costs'
import { getCurrentYm } from '@/utils/formatters'
import EmployeeCostsTable from '@/components/costs/EmployeeCostsTable.vue'
import EmployeeCostsSummary from '@/components/costs/EmployeeCostsSummary.vue'
import EmployeeCostsInfo from '@/components/costs/EmployeeCostsInfo.vue'

const store = useCostStore()
const { showError } = usePageAlert()

const compactHeadStyle = {
  padding: '8px 16px',
  minHeight: '44px',
  fontSize: '14px'
}

const compactBodyStyle = {
  padding: '12px 16px'
}

// 選中的月份（格式：YYYY-MM）
const selectedMonth = ref(getCurrentYm())
const selectedMonthValue = ref(dayjs(selectedMonth.value))

// 從 selectedMonth 解析年份和月份
const year = computed(() => {
  const [y] = selectedMonth.value.split('-')
  return parseInt(y, 10)
})

const month = computed(() => {
  const [, m] = selectedMonth.value.split('-')
  return parseInt(m, 10)
})

// 獲取總成本
const totalCost = computed(() => {
  if (store.employeeCostsSummary && store.employeeCostsSummary.totalCost !== undefined) {
    return store.employeeCostsSummary.totalCost
  }
  return null
})

// 錯誤消息
const errorMessage = computed(() => {
  if (store.error) {
    // 檢查是否為 501 狀態碼
    if (store.error.includes('501') || store.error.includes('Not Implemented')) {
      return '功能尚未實作'
    }
    return '載入失敗'
  }
  return ''
})

// 錯誤描述
const errorDescription = computed(() => {
  if (store.error) {
    // 檢查是否為 501 狀態碼
    if (store.error.includes('501') || store.error.includes('Not Implemented')) {
      return '此功能尚未實作，敬請期待。'
    }
    return store.error
  }
  return ''
})

// 載入數據
const loadData = async () => {
  try {
    await store.fetchEmployeeCosts(year.value, month.value)
  } catch (error) {
    console.error('載入數據失敗:', error)
    // 檢查是否為 501 狀態碼
    if (error.response && error.response.status === 501) {
      // 不顯示 message，因為已經在 error alert 中顯示了
    } else if (store.error && (store.error.includes('501') || store.error.includes('Not Implemented'))) {
      // 不顯示 message，因為已經在 error alert 中顯示了
    } else {
      showError('載入數據失敗：' + (error.message || '未知錯誤'))
    }
  }
}

// 處理月份變化
const handleMonthChange = (date) => {
  if (date) {
    const monthStr = dayjs(date).format('YYYY-MM')
    selectedMonth.value = monthStr
    selectedMonthValue.value = dayjs(date)
    // 重新載入員工成本數據
    loadData()
  }
}

// 處理刷新
const handleRefresh = () => {
  loadData()
}

// 初始化
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.cost-employee-content {
  padding: 16px;
}

.cost-employee-stack {
  width: 100%;
}

.cost-employee-controls {
  justify-content: flex-end;
}

@media (max-width: 991px) {
  .cost-employee-content {
    padding: 12px;
  }

  .cost-employee-controls {
    width: 100%;
  }
}
</style>

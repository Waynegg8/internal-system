<template>
  <div class="payroll-calc-content">
    <!-- 錯誤提示 -->
    <a-alert
      v-if="error"
      type="error"
      :message="error"
      show-icon
      closable
      @close="handleClearError"
      style="margin-bottom: 16px"
    />

    <!-- 總覽資訊 -->
    <div v-if="!isForbidden" class="payroll-summary">
      <div class="summary-info">
        <span class="summary-label">當月應發人數：</span>
        <span class="summary-value">{{ totalEmployees }} 人</span>
      </div>
    </div>

    <!-- 無權限提示 -->
    <a-result
      v-if="isForbidden"
      status="403"
      title="沒有權限訪問"
      sub-title="請聯絡系統管理員啟用薪資預覽權限"
      style="margin: 32px 0"
    />

    <!-- 薪資計算表格 -->
    <PayrollCalcTable v-else />
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { getCurrentYm } from '@/utils/formatters'
import PayrollCalcTable from '@/components/payroll/PayrollCalcTable.vue'

const payrollStore = usePayrollStore()

// 從 store 獲取狀態
const loading = computed(() => payrollStore.loading)
const error = computed(() => payrollStore.error)
const isForbidden = computed(() => payrollStore.isForbidden)
const totalEmployees = computed(() => payrollStore.payrollPreviewTotal)

// 刷新數據
const handleRefresh = async () => {
  const month = payrollStore.selectedMonth || getCurrentYm()
  try {
    await payrollStore.loadPayrollPreview(month, true) // 強制刷新，清除快取
  } catch (err) {
    // 錯誤已在 store 中處理
    console.error('刷新數據失敗:', err)
  }
}

// 清除錯誤
const handleClearError = () => {
  payrollStore.clearError()
}

// 載入數據
onMounted(async () => {
  // 從 store 獲取 selectedMonth，如果為空則設置為當前月份
  let month = payrollStore.selectedMonth
  if (!month) {
    month = getCurrentYm()
    payrollStore.setSelectedMonth(month)
  }

  // 載入薪資預覽數據
  try {
    await payrollStore.loadPayrollPreview(month)
  } catch (err) {
    // 錯誤已在 store 中處理
    console.error('載入薪資預覽失敗:', err)
  }
})
</script>

<style scoped>
.payroll-calc-content {
  padding: 0;
}

.payroll-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.summary-info {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.95em;
  color: #4b5563;
}

.summary-label {
  font-weight: 600;
}

.summary-value {
  font-size: 1.1em;
  font-weight: 700;
  color: #047857;
}
</style>



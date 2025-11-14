<template>
  <div class="monthly-reports-content">
    <a-alert
      v-if="reportsStore.error"
      type="error"
      :message="reportsStore.error"
      show-icon
      closable
      @close="reportsStore.clearError()"
      class="reports-alert"
    />

    <!-- 篩選器區域 -->
    <div class="filter-section">
      <a-space size="large" wrap>
        <div class="filter-field">
          <label class="filter-label">年份：</label>
          <a-select
            v-model:value="selectedYear"
            class="filter-select"
            placeholder="選擇年份"
            @change="handleYearChange"
          >
            <a-select-option
              v-for="year in yearOptions"
              :key="year"
              :value="year"
            >
              {{ year }}年
            </a-select-option>
          </a-select>
        </div>
        <div class="filter-field">
          <label class="filter-label">月份：</label>
          <a-select
            v-model:value="selectedMonth"
            class="filter-select"
            placeholder="選擇月份"
            @change="handleMonthChange"
          >
            <a-select-option
              v-for="month in monthOptions"
              :key="month"
              :value="month"
            >
              {{ month }}月
            </a-select-option>
          </a-select>
        </div>
        <a-button
          type="primary"
          :loading="reportsStore.loading"
          :disabled="!selectedYear || !selectedMonth"
          @click="handleLoadReport"
        >
          載入報表
        </a-button>
        <span v-if="reportsStore.loading" class="filter-loading">
          正在載入所有報表...
        </span>
      </a-space>
    </div>

    <!-- 報表組件區域 -->
    <div class="reports-section">
      <!-- 月度收款報表 -->
      <MonthlyRevenueReport />

      <!-- 月度薪資報表 -->
      <MonthlyPayrollReport />

      <!-- 月度員工產值分析 -->
      <MonthlyEmployeePerformance
        :on-view-client-distribution="handleViewClientDistribution"
      />

      <!-- 月度客戶毛利分析 -->
      <MonthlyClientProfitability />
    </div>

    <!-- 客戶分布彈窗 -->
    <ClientDistributionModal
      :visible="clientDistributionModalVisible"
      :employee-name="selectedEmployeeName"
      :distribution="selectedDistribution"
      @cancel="handleCloseClientDistribution"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useReportsStore } from '@/stores/reports'
import MonthlyRevenueReport from '@/components/reports/MonthlyRevenueReport.vue'
import MonthlyPayrollReport from '@/components/reports/MonthlyPayrollReport.vue'
import MonthlyEmployeePerformance from '@/components/reports/MonthlyEmployeePerformance.vue'
import MonthlyClientProfitability from '@/components/reports/MonthlyClientProfitability.vue'
import ClientDistributionModal from '@/components/reports/ClientDistributionModal.vue'

const reportsStore = useReportsStore()

// 年份選項（當前年份及前後各 5 年，共 11 年）
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

// 月份選項（1-12 月）
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

// 選中的年份和月份
const selectedYear = ref(null)
const selectedMonth = ref(null)

// 客戶分布彈窗狀態
const clientDistributionModalVisible = ref(false)
const selectedEmployeeName = ref('')
const selectedDistribution = ref([])

// 處理年份變化
const handleYearChange = (year) => {
  reportsStore.setSelectedYear(Number(year))
}

// 處理月份變化
const handleMonthChange = (month) => {
  reportsStore.setSelectedMonth(Number(month))
}

// 載入所有報表
const handleLoadReport = async () => {
  if (!selectedYear.value || !selectedMonth.value) {
    return
  }

  try {
    await reportsStore.loadMonthlyReports(selectedYear.value, selectedMonth.value)
  } catch (error) {
    console.error('載入報表失敗:', error)
  }
}

// 處理查看客戶分布
const handleViewClientDistribution = (employeeName, distribution) => {
  selectedEmployeeName.value = employeeName
  selectedDistribution.value = distribution || []
  clientDistributionModalVisible.value = true
}

// 處理關閉客戶分布彈窗
const handleCloseClientDistribution = () => {
  clientDistributionModalVisible.value = false
  selectedEmployeeName.value = ''
  selectedDistribution.value = []
}

// 初始化：設置當前年月
onMounted(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  selectedYear.value = year
  selectedMonth.value = month
  
  reportsStore.setSelectedYear(year)
  reportsStore.setSelectedMonth(month)

  handleLoadReport()
})
</script>

<style scoped>
.monthly-reports-content {
  padding: 16px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #f4f6f9;
  min-height: 100%;
}

.reports-alert {
  margin-bottom: 0;
}

.filter-section {
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.03);
}

.filter-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-weight: 600;
  color: #1f2937;
}

.filter-select {
  width: 140px;
}

.filter-loading {
  color: #6b7280;
}

.reports-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
</style>


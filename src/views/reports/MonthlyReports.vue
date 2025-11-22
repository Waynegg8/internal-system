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
    >
      <template #action>
        <a-button
          v-if="reportsStore.errorDetails"
          type="link"
          size="small"
          @click="showErrorDetails = !showErrorDetails"
        >
          {{ showErrorDetails ? '隱藏詳情' : '查看詳情' }}
        </a-button>
      </template>
    </a-alert>
    
    <!-- 錯誤詳情區域 -->
    <a-collapse
      v-if="reportsStore.errorDetails && showErrorDetails"
      :active-key="['details']"
      :bordered="false"
      ghost
      class="error-details-collapse"
    >
      <a-collapse-panel key="details" :header="null">
        <div class="error-details">
          <div v-if="reportsStore.errorDetails.message" class="error-detail-item">
            <strong>錯誤訊息：</strong>
            <pre>{{ reportsStore.errorDetails.message }}</pre>
          </div>
          <div v-if="reportsStore.errorDetails.stack" class="error-detail-item">
            <strong>錯誤堆疊：</strong>
            <pre class="error-stack">{{ reportsStore.errorDetails.stack }}</pre>
          </div>
          <div v-if="reportsStore.errorDetails.response" class="error-detail-item">
            <strong>API 響應：</strong>
            <pre>{{ formatErrorResponse(reportsStore.errorDetails.response) }}</pre>
          </div>
          <div v-if="reportsStore.errorDetails.config" class="error-detail-item">
            <strong>請求配置：</strong>
            <pre>{{ formatErrorConfig(reportsStore.errorDetails.config) }}</pre>
          </div>
        </div>
      </a-collapse-panel>
    </a-collapse>

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
        <a-button
          :icon="h(ReloadOutlined)"
          :loading="isRefreshing"
          :disabled="!selectedYear || !selectedMonth || reportsStore.loading"
          @click="handleRefreshAllReports"
        >
          刷新所有報表
        </a-button>
        <span v-if="reportsStore.loading || isRefreshing" class="filter-loading">
          {{ isRefreshing ? '正在刷新所有報表...' : '正在載入所有報表...' }}
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
import { onMounted, ref, watch, nextTick, h } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
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

// 防抖計時器
let debounceTimer = null
const DEBOUNCE_DELAY = 500 // 500ms 防抖延遲

// 是否為初始化階段（避免初始化時重複載入）
const isInitializing = ref(true)

// 刷新狀態
const isRefreshing = ref(false)

// 錯誤詳情顯示狀態
const showErrorDetails = ref(false)

// 載入所有報表（帶防抖）
const loadReportsWithDebounce = async () => {
  if (!selectedYear.value || !selectedMonth.value) {
    return
  }

  // 清除之前的計時器
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  // 設置新的防抖計時器
  debounceTimer = setTimeout(async () => {
    try {
      await reportsStore.loadMonthlyReports(selectedYear.value, selectedMonth.value)
    } catch (error) {
      console.error('載入報表失敗:', error)
      // 存儲完整錯誤資訊
      const errorMessage = error?.response?.data?.message || error?.message || '載入報表失敗'
      const errorDetails = {
        message: error?.message || errorMessage,
        stack: error?.stack || null,
        response: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        config: error?.config ? {
          url: error.config.url,
          method: error.config.method,
          params: error.config.params,
          headers: error.config.headers
        } : null
      }
      reportsStore.setError(errorMessage, errorDetails)
    } finally {
      debounceTimer = null
    }
  }, DEBOUNCE_DELAY)
}

// 處理年份變化
const handleYearChange = (year) => {
  const numericYear = Number(year)
  selectedYear.value = numericYear
  reportsStore.setSelectedYear(numericYear)
  // 自動載入由 watch 處理
}

// 處理月份變化
const handleMonthChange = (month) => {
  const numericMonth = Number(month)
  selectedMonth.value = numericMonth
  reportsStore.setSelectedMonth(numericMonth)
  // 自動載入由 watch 處理
}

// 手動載入報表（用於載入按鈕）
const handleLoadReport = async () => {
  if (!selectedYear.value || !selectedMonth.value) {
    return
  }

  // 清除防抖計時器，立即載入
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  reportsStore.clearError()
  showErrorDetails.value = false

  try {
    await reportsStore.loadMonthlyReports(selectedYear.value, selectedMonth.value)
  } catch (error) {
    console.error('載入報表失敗:', error)
    // 存儲完整錯誤資訊
    const errorMessage = error?.response?.data?.message || error?.message || '載入報表失敗'
    const errorDetails = {
      message: error?.message || errorMessage,
      stack: error?.stack || null,
      response: error?.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      config: error?.config ? {
        url: error.config.url,
        method: error.config.method,
        params: error.config.params,
        headers: error.config.headers
      } : null
    }
    reportsStore.setError(errorMessage, errorDetails)
  }
}

// 刷新所有報表（強制重新計算，忽略快取）
const handleRefreshAllReports = async () => {
  if (!selectedYear.value || !selectedMonth.value) {
    message.warning('請先選擇年份和月份')
    return
  }

  isRefreshing.value = true
  reportsStore.clearError()
  showErrorDetails.value = false

  try {
    // 並行調用所有報表 API，傳遞 refresh=1 參數，並更新 store 數據
    await Promise.all([
      reportsStore.fetchMonthlyRevenue(selectedYear.value, selectedMonth.value, { refresh: true }),
      reportsStore.fetchMonthlyPayroll(selectedYear.value, selectedMonth.value, { refresh: true }),
      reportsStore.fetchMonthlyEmployeePerformance(selectedYear.value, selectedMonth.value, { refresh: true }),
      reportsStore.fetchMonthlyClientProfitability(selectedYear.value, selectedMonth.value, { refresh: true })
    ])

    message.success('所有報表已成功刷新')
  } catch (error) {
    console.error('刷新報表失敗:', error)
    const errorMessage = error?.response?.data?.message || error?.message || '刷新報表失敗，請稍後重試'
    message.error(errorMessage)
    
    // 存儲完整錯誤資訊
    const errorDetails = {
      message: error?.message || errorMessage,
      stack: error?.stack || null,
      response: error?.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      config: error?.config ? {
        url: error.config.url,
        method: error.config.method,
        params: error.config.params,
        headers: error.config.headers
      } : null
    }
    reportsStore.setError(errorMessage, errorDetails)
  } finally {
    isRefreshing.value = false
  }
}

// 格式化錯誤響應資訊
const formatErrorResponse = (response) => {
  if (!response) return ''
  try {
    return JSON.stringify(response, null, 2)
  } catch {
    return String(response)
  }
}

// 格式化錯誤配置資訊
const formatErrorConfig = (config) => {
  if (!config) return ''
  try {
    return JSON.stringify(config, null, 2)
  } catch {
    return String(config)
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

// 監聽年份和月份的變化（用於自動載入）
watch([selectedYear, selectedMonth], ([newYear, newMonth], [oldYear, oldMonth]) => {
  // 跳過初始化階段和空值變化
  if (isInitializing.value) {
    return
  }
  
  // 只有當年份或月份從有效值變為另一個有效值時才自動載入
  if (newYear && newMonth && (newYear !== oldYear || newMonth !== oldMonth)) {
    loadReportsWithDebounce()
  }
})

// 初始化：設置當前年月並載入報表
onMounted(async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  selectedYear.value = year
  selectedMonth.value = month
  
  reportsStore.setSelectedYear(year)
  reportsStore.setSelectedMonth(month)

  // 初始化時直接載入，不使用防抖
  try {
    await reportsStore.loadMonthlyReports(year, month)
  } catch (error) {
    console.error('載入報表失敗:', error)
    // 存儲完整錯誤資訊
    const errorMessage = error?.response?.data?.message || error?.message || '載入報表失敗'
    const errorDetails = {
      message: error?.message || errorMessage,
      stack: error?.stack || null,
      response: error?.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      config: error?.config ? {
        url: error.config.url,
        method: error.config.method,
        params: error.config.params,
        headers: error.config.headers
      } : null
    }
    reportsStore.setError(errorMessage, errorDetails)
  }

  // 等待下一個 tick 後標記初始化完成
  await nextTick()
  isInitializing.value = false
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

.error-details-collapse {
  margin-top: 8px;
}

.error-details {
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.error-detail-item {
  margin-bottom: 16px;
}

.error-detail-item:last-child {
  margin-bottom: 0;
}

.error-detail-item strong {
  display: block;
  margin-bottom: 8px;
  color: #595959;
  font-size: 13px;
}

.error-detail-item pre {
  margin: 0;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #262626;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.error-stack {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #8c8c8c;
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


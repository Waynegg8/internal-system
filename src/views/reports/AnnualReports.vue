<template>
  <div class="annual-reports-content">
    <!-- 錯誤提示 -->
    <a-alert
      v-if="reportsStore.error"
      type="error"
      :message="reportsStore.error"
      show-icon
      closable
      @close="reportsStore.clearError()"
      class="reports-alert"
      style="margin-bottom: 24px;"
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
      style="margin-bottom: 24px;"
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
    <div class="filter-section" style="margin-bottom: 24px;">
      <a-space size="large" wrap>
        <div>
          <label style="margin-right: 8px; font-weight: 500;">年份：</label>
          <a-select
            v-model:value="selectedYear"
            style="width: 120px;"
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
        <a-space wrap>
          <a-button
            type="primary"
            :loading="reportsStore.reportStatuses.revenue === 'loading'"
            :disabled="!selectedYear"
            @click="handleLoadRevenue"
          >
            收款報表
          </a-button>
          <a-button
            type="primary"
            :loading="reportsStore.reportStatuses.payroll === 'loading'"
            :disabled="!selectedYear"
            @click="handleLoadPayroll"
          >
            薪資報表
            <a-tooltip title="可能需要 20-30 秒">
              <QuestionCircleOutlined style="margin-left: 4px;" />
            </a-tooltip>
          </a-button>
          <a-button
            type="primary"
            :loading="reportsStore.reportStatuses.performance === 'loading'"
            :disabled="!selectedYear"
            @click="handleLoadPerformance"
          >
            員工產值
            <a-tooltip title="可能需要 30-60 秒">
              <QuestionCircleOutlined style="margin-left: 4px;" />
            </a-tooltip>
          </a-button>
          <a-button
            type="primary"
            :loading="reportsStore.reportStatuses.profit === 'loading'"
            :disabled="!selectedYear"
            @click="handleLoadProfit"
          >
            客戶毛利
          </a-button>
          <a-button
            :loading="isLoadingAll"
            :disabled="!selectedYear || isLoadingAll"
            @click="handleLoadAll"
          >
            全部載入
            <a-tooltip title="預計需要 1-2 分鐘">
              <QuestionCircleOutlined style="margin-left: 4px;" />
            </a-tooltip>
          </a-button>
          <a-button
            :icon="h(ReloadOutlined)"
            :loading="isRefreshing"
            :disabled="!selectedYear || isLoadingAll || isRefreshing"
            @click="handleRefreshAllReports"
          >
            刷新所有報表
          </a-button>
        </a-space>
      </a-space>

      <!-- 載入進度提示 -->
      <div v-if="isLoadingAll" style="margin-top: 16px;">
        <a-alert
          type="info"
          :message="`正在載入 ${loadingProgress}/4`"
          :description="loadingMessage"
          show-icon
        />
      </div>
    </div>

    <!-- 報表組件區域 -->
    <div class="reports-section">
      <!-- 年度收款報表 -->
      <AnnualRevenueReport
        :data="reportsStore.annualRevenue"
        :status="reportsStore.reportStatuses.revenue"
      />

      <!-- 年度薪資報表 -->
      <AnnualPayrollReport
        :data="reportsStore.annualPayroll"
        :status="reportsStore.reportStatuses.payroll"
        @view-details="handleViewPayrollDetails"
      />

      <!-- 年度員工產值分析 -->
      <AnnualEmployeePerformance
        :data="reportsStore.annualEmployeePerformance"
        :status="reportsStore.reportStatuses.performance"
        @view-trend="handleViewPerformanceTrend"
        @view-distribution="handleViewClientDistribution"
      />

      <!-- 年度客戶毛利分析 -->
      <AnnualClientProfitability
        :data="reportsStore.annualClientProfitability"
        :status="reportsStore.reportStatuses.profit"
      />
    </div>

    <!-- 彈窗組件 -->
    <!-- 薪資月度明細彈窗 -->
    <PayrollDetailsModal
      :visible="payrollDetailsModalVisible"
      :employee-name="selectedEmployeeName"
      :monthly-details="selectedMonthlyDetails"
      @cancel="handleClosePayrollDetails"
    />

    <!-- 員工產值趨勢彈窗 -->
    <EmployeePerformanceTrendModal
      :visible="performanceTrendModalVisible"
      :employee-name="selectedEmployeeName"
      :monthly-trend="selectedMonthlyTrend"
      @cancel="handleClosePerformanceTrend"
    />

    <!-- 客戶分布彈窗 -->
    <ClientDistributionModal
      :visible="clientDistributionModalVisible"
      :employee-name="selectedEmployeeName"
      :distribution="selectedDistribution"
      :is-annual="true"
      @cancel="handleCloseClientDistribution"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, h } from 'vue'
import { message } from 'ant-design-vue'
import { QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { useReportsStore } from '@/stores/reports'
import AnnualRevenueReport from '@/components/reports/AnnualRevenueReport.vue'
import AnnualPayrollReport from '@/components/reports/AnnualPayrollReport.vue'
import AnnualEmployeePerformance from '@/components/reports/AnnualEmployeePerformance.vue'
import AnnualClientProfitability from '@/components/reports/AnnualClientProfitability.vue'
import PayrollDetailsModal from '@/components/reports/PayrollDetailsModal.vue'
import EmployeePerformanceTrendModal from '@/components/reports/EmployeePerformanceTrendModal.vue'
import ClientDistributionModal from '@/components/reports/ClientDistributionModal.vue'

const reportsStore = useReportsStore()

// 年份選項（當前年份及前後各 5 年，共 11 年）
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

// 選中的年份
const selectedYear = ref(null)

// 全部載入狀態
const isLoadingAll = ref(false)
const loadingProgress = ref(0)
const loadingMessage = ref('')

// 刷新狀態
const isRefreshing = ref(false)

// 錯誤詳情顯示狀態
const showErrorDetails = ref(false)

// 彈窗狀態
const payrollDetailsModalVisible = ref(false)
const performanceTrendModalVisible = ref(false)
const clientDistributionModalVisible = ref(false)

// 選中的員工數據
const selectedEmployeeName = ref('')
const selectedMonthlyDetails = ref([])
const selectedMonthlyTrend = ref([])
const selectedDistribution = ref([])

// 處理年份變化
const handleYearChange = (year) => {
  reportsStore.setSelectedYear(year)
  // 清除所有報表狀態
  reportsStore.clearReportStatuses()
}

// 單獨載入收款報表
const handleLoadRevenue = async () => {
  if (!selectedYear.value) return
  reportsStore.clearError()
  showErrorDetails.value = false
  try {
    await reportsStore.fetchAnnualRevenue(selectedYear.value)
  } catch (error) {
    console.error('載入收款報表失敗:', error)
    // 錯誤已在 store 中處理
  }
}

// 單獨載入薪資報表
const handleLoadPayroll = async () => {
  if (!selectedYear.value) return
  reportsStore.clearError()
  showErrorDetails.value = false
  try {
    await reportsStore.fetchAnnualPayroll(selectedYear.value)
  } catch (error) {
    console.error('載入薪資報表失敗:', error)
    // 錯誤已在 store 中處理
  }
}

// 單獨載入員工產值報表
const handleLoadPerformance = async () => {
  if (!selectedYear.value) return
  reportsStore.clearError()
  showErrorDetails.value = false
  try {
    await reportsStore.fetchAnnualEmployeePerformance(selectedYear.value)
  } catch (error) {
    console.error('載入員工產值報表失敗:', error)
    // 錯誤已在 store 中處理
  }
}

// 單獨載入客戶毛利報表
const handleLoadProfit = async () => {
  if (!selectedYear.value) return
  reportsStore.clearError()
  showErrorDetails.value = false
  try {
    await reportsStore.fetchAnnualClientProfitability(selectedYear.value)
  } catch (error) {
    console.error('載入客戶毛利報表失敗:', error)
    // 錯誤已在 store 中處理
  }
}

// 順序載入所有報表
const handleLoadAll = async () => {
  if (!selectedYear.value) return

  isLoadingAll.value = true
  loadingProgress.value = 0
  loadingMessage.value = '開始載入所有報表...'

  const reports = [
    { name: '收款報表', fetch: () => reportsStore.fetchAnnualRevenue(selectedYear.value) },
    { name: '薪資報表', fetch: () => reportsStore.fetchAnnualPayroll(selectedYear.value) },
    { name: '員工產值報表', fetch: () => reportsStore.fetchAnnualEmployeePerformance(selectedYear.value) },
    { name: '客戶毛利報表', fetch: () => reportsStore.fetchAnnualClientProfitability(selectedYear.value) }
  ]

  try {
    for (let i = 0; i < reports.length; i++) {
      loadingProgress.value = i + 1
      loadingMessage.value = `正在載入 ${reports[i].name}...`
      await reports[i].fetch()
    }
    loadingMessage.value = '所有報表載入完成！'
  } catch (error) {
    console.error('載入報表失敗:', error)
    loadingMessage.value = '載入過程中發生錯誤，請查看具體報表的狀態標籤'
  } finally {
    setTimeout(() => {
      isLoadingAll.value = false
      loadingProgress.value = 0
      loadingMessage.value = ''
    }, 1000)
  }
}

// 處理查看薪資月度明細
const handleViewPayrollDetails = (employeeName, monthlyDetails) => {
  selectedEmployeeName.value = employeeName
  selectedMonthlyDetails.value = monthlyDetails || []
  payrollDetailsModalVisible.value = true
}

// 處理關閉薪資月度明細彈窗
const handleClosePayrollDetails = () => {
  payrollDetailsModalVisible.value = false
  selectedEmployeeName.value = ''
  selectedMonthlyDetails.value = []
}

// 處理查看員工產值趨勢
const handleViewPerformanceTrend = (employeeName, monthlyTrend) => {
  selectedEmployeeName.value = employeeName
  selectedMonthlyTrend.value = monthlyTrend || []
  performanceTrendModalVisible.value = true
}

// 處理關閉員工產值趨勢彈窗
const handleClosePerformanceTrend = () => {
  performanceTrendModalVisible.value = false
  selectedEmployeeName.value = ''
  selectedMonthlyTrend.value = []
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

// 刷新所有報表（強制重新計算，忽略快取）
const handleRefreshAllReports = async () => {
  if (!selectedYear.value) {
    message.warning('請先選擇年份')
    return
  }

  isRefreshing.value = true
  reportsStore.clearError()
  showErrorDetails.value = false

  try {
    // 並行調用所有年度報表 API，傳遞 refresh=1 參數
    await Promise.all([
      reportsStore.fetchAnnualRevenue(selectedYear.value, { refresh: true }),
      reportsStore.fetchAnnualPayroll(selectedYear.value, { refresh: true }),
      reportsStore.fetchAnnualEmployeePerformance(selectedYear.value, { refresh: true }),
      reportsStore.fetchAnnualClientProfitability(selectedYear.value, { refresh: true })
    ])

    message.success('所有報表已刷新完成')
  } catch (error) {
    console.error('刷新報表失敗:', error)
    const errorMessage = error?.response?.data?.message || error?.message || '刷新報表失敗'
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

// 初始化：設置當前年份
onMounted(() => {
  const now = new Date()
  const year = now.getFullYear()
  
  selectedYear.value = year
  reportsStore.setSelectedYear(year)
})
</script>

<style scoped>
.annual-reports-content {
  padding: 24px;
}

.filter-section {
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}

.reports-section {
  padding: 0;
}

.reports-alert {
  margin-bottom: 24px;
}

.error-details-collapse {
  margin-bottom: 24px;
}

.error-details {
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
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
  font-weight: 600;
}

.error-detail-item pre {
  margin: 0;
  padding: 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error-stack {
  color: #ff4d4f;
  max-height: 300px;
  overflow-y: auto;
}
</style>

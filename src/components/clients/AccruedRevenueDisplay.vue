<template>
  <div class="accrued-revenue-display">
    <a-spin :spinning="loading || isLoading">
      <!-- 驗證結果提示 -->
      <a-alert
        v-if="revenueData?.validation"
        :type="revenueData.validation.isValid ? 'success' : 'warning'"
        :message="revenueData.validation.isValid ? '計算驗證通過' : '計算驗證警告'"
        :description="revenueData.validation.errors?.join('; ') || '驗證完成'"
        show-icon
        closable
        style="margin-bottom: 16px"
      />

      <!-- 摘要統計 -->
      <a-descriptions :column="2" bordered v-if="revenueData" style="margin-bottom: 24px">
        <a-descriptions-item label="年度總計（定期服務）">
          <span class="revenue-amount recurring">
            {{ formatCurrency(revenueData.summary?.totalRecurringRevenue || 0) }}
          </span>
        </a-descriptions-item>
        <a-descriptions-item label="年度總計（一次性服務）">
          <span class="revenue-amount one-time">
            {{ formatCurrency(revenueData.summary?.totalOneTimeRevenue || 0) }}
          </span>
        </a-descriptions-item>
        <a-descriptions-item label="年度總計（全部）" :span="2">
          <strong class="revenue-amount total">
            {{ formatCurrency(revenueData.summary?.totalAnnualRevenue || 0) }}
          </strong>
        </a-descriptions-item>
      </a-descriptions>

      <!-- 定期服務收入分攤明細 -->
      <a-card
        v-if="revenueData?.recurring"
        title="定期服務收入分攤"
        :bordered="false"
        style="margin-bottom: 24px"
      >
        <template #extra>
          <a-tag color="blue">總收費：{{ formatCurrency(revenueData.recurring.totalRecurringRevenue || 0) }}</a-tag>
        </template>
        
        <div v-if="revenueData.recurring.services?.length === 0" style="text-align: center; padding: 24px">
          <a-empty description="尚無定期服務收入資料" :image="false" />
        </div>
        
        <a-table
          v-else
          :dataSource="revenueData.recurring.services"
          :columns="recurringColumns"
          :pagination="recurringPagination"
          :scroll="{ x: 'max-content' }"
          size="small"
          :expandable="recurringExpandable"
          row-key="clientServiceId"
        >
          <template #expandedRowRender="{ record }">
            <div style="padding: 16px; background: #fafafa">
              <div v-if="!record.executionMonths || record.executionMonths.length === 0" style="text-align: center; color: #8c8c8c">
                該服務未執行
              </div>
              <a-table
                v-else
                :dataSource="getRecurringMonthData(record)"
                :columns="recurringMonthColumns"
                :pagination="false"
                size="small"
                row-key="month"
              />
            </div>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'serviceName'">
              <a-tag color="blue">{{ record.serviceName || '未命名服務' }}</a-tag>
            </template>
            <template v-else-if="column.key === 'executionCount'">
              <a-tag>{{ record.executionCount || 0 }} 次</a-tag>
            </template>
            <template v-else-if="column.key === 'allocationRatio'">
              <span v-if="totalExecutionCount > 0">
                {{ formatPercentage((record.executionCount || 0) / totalExecutionCount) }}
              </span>
              <span v-else class="text-muted">—</span>
            </template>
            <template v-else-if="column.key === 'annualAllocatedRevenue'">
              <strong class="revenue-amount recurring">
                {{ formatCurrency(record.annualAllocatedRevenue || 0) }}
              </strong>
            </template>
            <template v-else-if="column.key === 'monthlyAverage'">
              <span v-if="record.executionCount > 0">
                {{ formatCurrency((record.annualAllocatedRevenue || 0) / record.executionCount) }}
              </span>
              <span v-else class="text-muted">—</span>
            </template>
          </template>
        </a-table>

        <!-- 計算邏輯說明 -->
        <a-collapse :bordered="false" style="margin-top: 16px">
          <a-collapse-panel key="calculation-logic" header="計算邏輯說明">
            <div class="calculation-explanation">
              <p><strong>定期服務收入分攤規則：</strong></p>
              <ol>
                <li>定期服務總收費 = Σ(定期服務收費計劃中所有月份的金額) = <strong>{{ formatCurrency(revenueData.recurring.totalRecurringRevenue || 0) }}</strong></li>
                <li>每個服務的執行次數 = execution_months 陣列的長度</li>
                <li>總執行次數 = Σ(所有關聯定期服務的執行次數) = <strong>{{ totalExecutionCount }}</strong></li>
                <li v-if="totalExecutionCount > 0">
                  每個服務全年的分攤收入 = 總收費 × (該服務的執行次數 / 總執行次數)
                </li>
                <li v-if="totalExecutionCount > 0">
                  每個服務每個月的應計收入 = 該服務全年的分攤收入 ÷ 該服務的執行次數（僅在執行月份有收入）
                </li>
                <li v-else>
                  <strong>注意：</strong>所有服務都沒有執行，因此所有服務的分攤收入為 0
                </li>
              </ol>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </a-card>

      <!-- 一次性服務收入明細 -->
      <a-card
        v-if="revenueData?.oneTime?.services?.length > 0"
        title="一次性服務收入"
        :bordered="false"
      >
        <template #extra>
          <a-tag color="green">總收入：{{ formatCurrency(revenueData.summary?.totalOneTimeRevenue || 0) }}</a-tag>
        </template>
        
        <a-table
          :dataSource="revenueData.oneTime.services"
          :columns="oneTimeColumns"
          :pagination="oneTimePagination"
          :scroll="{ x: 'max-content' }"
          size="small"
          :expandable="oneTimeExpandable"
          row-key="clientServiceId"
        >
          <template #expandedRowRender="{ record }">
            <div style="padding: 16px; background: #fafafa">
              <div v-if="!getOneTimeMonthData(record) || getOneTimeMonthData(record).length === 0" style="text-align: center; color: #8c8c8c">
                無月份明細
              </div>
              <a-table
                v-else
                :dataSource="getOneTimeMonthData(record)"
                :columns="oneTimeMonthColumns"
                :pagination="false"
                size="small"
                row-key="month"
              />
            </div>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'serviceName'">
              <a-tag color="green">{{ record.serviceName || '未命名服務' }}</a-tag>
            </template>
            <template v-else-if="column.key === 'annualRevenue'">
              <strong class="revenue-amount one-time">
                {{ formatCurrency(record.annualRevenue || 0) }}
              </strong>
            </template>
            <template v-else-if="column.key === 'billingDate'">
              {{ formatDate(record.billingDate) }}
            </template>
            <template v-else-if="column.key === 'description'">
              {{ record.description || '—' }}
            </template>
          </template>
        </a-table>

        <!-- 計算邏輯說明 -->
        <a-collapse :bordered="false" style="margin-top: 16px">
          <a-collapse-panel key="calculation-logic" header="計算邏輯說明">
            <div class="calculation-explanation">
              <p><strong>一次性服務收入規則：</strong></p>
              <ol>
                <li>每個一次性服務的收費獨立，直接使用實際金額，不分攤</li>
                <li>每個一次性服務的應計收入 = 該服務的收費計劃中所有月份的金額總和</li>
                <li>每個一次性服務每個月的應計收入 = 該月份的金額（如果該月在收費計劃中，否則為 0）</li>
              </ol>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </a-card>

      <a-empty v-if="!revenueData && !loading && !isLoading" description="尚無應計收入資料" />
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { fetchAccruedRevenue } from '@/api/billing'
import { extractApiData } from '@/utils/apiHelpers'
import { formatCurrency, formatLocalDate } from '@/utils/formatters'

const props = defineProps({
  clientId: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  month: {
    type: Number,
    default: null
  },
  validate: {
    type: Boolean,
    default: false
  }
})

const revenueData = ref(null)
const isLoading = ref(false)

// 計算總執行次數
const totalExecutionCount = computed(() => {
  if (!revenueData.value?.recurring?.services) return 0
  return revenueData.value.recurring.services.reduce(
    (sum, s) => sum + (s.executionCount || 0),
    0
  )
})

// 定期服務表格列
const recurringColumns = [
  {
    title: '服務名稱',
    key: 'serviceName',
    width: 200,
    fixed: 'left'
  },
  {
    title: '執行次數',
    key: 'executionCount',
    width: 120,
    align: 'center'
  },
  {
    title: '分攤比例',
    key: 'allocationRatio',
    width: 120,
    align: 'center'
  },
  {
    title: '全年分攤收入',
    key: 'annualAllocatedRevenue',
    width: 150,
    align: 'right'
  },
  {
    title: '每月平均收入',
    key: 'monthlyAverage',
    width: 150,
    align: 'right'
  }
]

// 定期服務展開配置（顯示每月明細）
const recurringExpandable = {
  rowExpandable: () => true
}

// 定期服務分頁配置
const recurringPagination = computed(() => ({
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 項服務`,
  pageSizeOptions: ['10', '20', '50', '100']
}))

// 一次性服務表格列
const oneTimeColumns = [
  {
    title: '服務名稱',
    key: 'serviceName',
    width: 200,
    fixed: 'left'
  },
  {
    title: '項目名稱',
    key: 'description',
    width: 200
  },
  {
    title: '收費日期',
    key: 'billingDate',
    width: 120,
    align: 'center'
  },
  {
    title: '年度收入',
    key: 'annualRevenue',
    width: 150,
    align: 'right'
  }
]

// 一次性服務展開配置（顯示每月明細）
const oneTimeExpandable = {
  rowExpandable: () => true
}

// 一次性服務分頁配置
const oneTimePagination = computed(() => ({
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 項服務`,
  pageSizeOptions: ['10', '20', '50', '100']
}))

// 定期服務月份明細表格列
const recurringMonthColumns = [
  {
    title: '月份',
    dataIndex: 'month',
    key: 'month',
    width: 100,
    customRender: ({ text }) => `${text}月`
  },
  {
    title: '應計收入',
    key: 'revenue',
    width: 150,
    align: 'right',
    customRender: ({ record }) => formatCurrency(record.revenue)
  }
]

// 一次性服務月份明細表格列
const oneTimeMonthColumns = [
  {
    title: '月份',
    dataIndex: 'month',
    key: 'month',
    width: 100,
    customRender: ({ text }) => `${text}月`
  },
  {
    title: '應計收入',
    key: 'revenue',
    width: 150,
    align: 'right',
    customRender: ({ record }) => formatCurrency(record.revenue)
  }
]

// 獲取定期服務月份資料
const getRecurringMonthData = (record) => {
  const months = record.executionMonths || []
  const monthlyRevenue = record.monthlyRevenue || {}
  
  return months.map(month => ({
    month,
    revenue: monthlyRevenue[month] || 0
  }))
}

// 獲取一次性服務月份資料
const getOneTimeMonthData = (record) => {
  const monthlyRevenue = record.monthlyRevenue || {}
  const months = Object.keys(monthlyRevenue)
    .map(m => parseInt(m, 10))
    .filter(m => m >= 1 && m <= 12)
    .sort((a, b) => a - b)
  
  return months.map(month => ({
    month,
    revenue: monthlyRevenue[month] || 0
  }))
}

// 格式化百分比
const formatPercentage = (value) => {
  if (isNaN(value) || !isFinite(value)) return '—'
  return `${(value * 100).toFixed(2)}%`
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '—'
  return formatLocalDate(date)
}

const loadRevenue = async () => {
  if (!props.clientId || !props.year) {
    revenueData.value = null
    return
  }

  isLoading.value = true
  try {
    const response = await fetchAccruedRevenue(
      props.clientId,
      props.year,
      props.month,
      props.validate
    )
    const data = extractApiData(response, {})
    revenueData.value = data
  } catch (error) {
    console.error('載入應計收入失敗:', error)
    
    // 檢查是否為表不存在的錯誤
    const errorMessage = error?.message || error?.response?.data?.message || String(error)
    const errorCode = error?.response?.data?.code
    
    if (errorCode === 'SERVICE_UNAVAILABLE' || errorMessage.includes('尚未初始化') || errorMessage.includes('資料庫遷移')) {
      console.warn('收費計劃功能尚未初始化')
    } else if (errorMessage.includes('no such table') && errorMessage.includes('BillingPlans')) {
      console.warn('BillingPlans 表不存在，需要執行 migration')
    }
    
    revenueData.value = null
  } finally {
    isLoading.value = false
  }
}

// 監聽客戶 ID、年度、月份變化
watch([() => props.clientId, () => props.year, () => props.month], () => {
  loadRevenue()
}, { immediate: true })

onMounted(() => {
  loadRevenue()
})

defineExpose({
  refresh: loadRevenue
})
</script>

<style scoped>
.accrued-revenue-display {
  width: 100%;
}

.revenue-amount {
  font-weight: 500;
  font-size: 14px;
}

.revenue-amount.recurring {
  color: #1890ff;
}

.revenue-amount.one-time {
  color: #52c41a;
}

.revenue-amount.total {
  color: #722ed1;
  font-size: 16px;
}

.calculation-explanation {
  padding: 8px 0;
}

.calculation-explanation ol {
  margin: 8px 0;
  padding-left: 24px;
}

.calculation-explanation li {
  margin: 4px 0;
  line-height: 1.6;
}

.text-muted {
  color: #8c8c8c;
  font-style: italic;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .accrued-revenue-display :deep(.ant-descriptions) {
    font-size: 12px;
  }
  
  .accrued-revenue-display :deep(.ant-table) {
    font-size: 12px;
  }
}
</style>

